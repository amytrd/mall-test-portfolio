# -*- coding: utf-8 -*-
"""
已知缺陷回归测试

======================================================================
【为什么要把缺陷写成测试用例】
======================================================================
发现缺陷后只写一份报告交上去，缺陷修了没人验证，
下次重构又可能引回来 —— 这是很多团队的现状。

更专业的做法是：**把每个缺陷固化成一条自动化用例**，
然后用 xfail 标记成"预期失败"。

这样带来三个好处：
  1. 缺陷修复后，这条用例会从 xfail 变成 **XPASS**，
     配合 strict=True 会让整个测试套件报错 —— 主动提醒你
     "这个缺陷已经修好了，该把用例改成正常断言了"
  2. 缺陷如果被重新引入，用例立刻变红，防止回归
  3. 新同事看这个文件就能了解项目有哪些历史问题

======================================================================
【关于 xfail 的两种模式】
======================================================================
    xfail(strict=False)  缺陷修好了 -> XPASS（但不算失败，只是提示）
    xfail(strict=True)   缺陷修好了 -> FAILED（强制你更新用例）

本项目用 **strict=True**：缺陷修好是好事，但必须有人去更新用例，
否则这条"永远预期失败"的用例就变成了技术债。让它变红是提醒，不是惩罚。

======================================================================
【本项目的 6 个已知缺陷】
======================================================================
    DEFECT-01  未处理异常被 /error 二次分发与安全拦截，真实错误被 401 覆盖
    DEFECT-02  原始 SQL 错误信息直接返回客户端（信息泄露）
    DEFECT-03  删除不存在的记录返回笼统"操作失败"，语义不明
    DEFECT-04  API 文档根路径白名单失效，带 token 访问反而 403
    DEFECT-05  日志切面记录明文密码与完整 Token
    DEFECT-06  数据库列字符集为 utf8mb3，4 字节字符触发 SQL 错误 1267
"""

import re
from pathlib import Path

import pytest

from config import CODE_FAILED, CODE_SUCCESS, CODE_VALIDATE_FAILED

pytestmark = pytest.mark.known_defect


# ============================================================
# DEFECT-01：未处理异常被 /error 分发掩盖为 401
# ============================================================
"""
【缺陷现象】
请求触发框架级异常（参数类型错误、缺少必填参数等）时：
    HTTP 状态码 = 400（正确，来自 DefaultHandlerExceptionResolver）
    响应体      = {"code":401,"message":"暂未登录或token已经过期",...}（错误！）

【根因链路】
  1. GlobalExceptionHandler 只处理 ApiException / MethodArgumentNotValidException /
     BindException / SQLSyntaxErrorException 四类异常
  2. MethodArgumentTypeMismatchException 等框架异常漏网，
     由 Spring 的 DefaultHandlerExceptionResolver 兜底 -> HTTP 400
  3. Spring Boot 把请求 ERROR 二次分发到 /error
  4. /error **不在** secure.ignored.urls 白名单里
  5. SecurityConfig 的 anyRequest() 重新鉴权，此时无认证上下文
  6. RestAuthenticationEntryPoint 写出 401 响应体，**覆盖了原始错误**

【危害】
  - 前端收到 401 会跳登录页，用户明明已登录却被踢出
  - 监控按 code 统计，会把"参数错误"误计为"鉴权失败告警"
  - 真实异常只存在于服务端日志，客户端排障无据可依
"""


@pytest.mark.xfail(
    strict=True,
    reason="DEFECT-01：参数类型错误被 /error 二次分发覆盖为 401，应返回明确的参数错误提示",
)
def test_defect01_param_type_error_should_report_real_cause(api):
    """
    pageSize 传非数字 —— 应提示"参数类型错误"，而不是"未登录"

    【期望的正确行为】HTTP 400 + 响应体说明是 pageSize 类型不对
    【实际行为】HTTP 400 + 响应体说"暂未登录或token已经过期"
    """
    resp = api.get("/product/list", params={"pageNum": 1, "pageSize": "abc"})

    # 断言"正确的行为" —— 因为缺陷存在，这条必然失败，xfail 会捕获它
    assert resp.http_status == 400, "类型错误应返回 HTTP 400"

    assert "暂未登录" not in (resp.message or ""), (
        f"参数类型错误被错误地报告为鉴权失败。\n"
        f"  实际 message = {resp.message}\n"
        f"  期望 message = 应说明 pageSize 参数类型不正确"
    )


@pytest.mark.xfail(
    strict=True,
    reason="DEFECT-01：缺少必填参数时错误信息被覆盖为 401",
)
@pytest.mark.parametrize(
    "method, path, missing",
    [
        ("POST", "/order/delete", "ids"),
        ("POST", "/order/update/close", "note"),
    ],
    ids=["缺ids", "缺note"],
)
def test_defect01_missing_param_should_report_real_cause(api, method, path, missing):
    """缺少必填参数 —— 应提示缺了哪个参数，而不是"未登录" """
    resp = api.request(method, path)

    assert resp.http_status == 400, "缺少必填参数应返回 HTTP 400"
    assert "暂未登录" not in (resp.message or ""), (
        f"缺少参数 {missing!r} 被错误报告为鉴权失败，实际 message={resp.message}"
    )


# ============================================================
# DEFECT-02：原始 SQL 错误信息泄露
# ============================================================
"""
【缺陷现象】
数据库异常时，原始 MySQL 错误被原样返回给客户端：
    {"code":500,"message":"You have an error in your SQL syntax; check the manual
     that corresponds to your MySQL server version for the right syntax to use
     near ')' at line 1","data":null}

【泄露了什么】数据库类型(MySQL)、SQL 语法片段、出错位置(line 1)

【根因】
  1. GlobalExceptionHandler 中 @ExceptionHandler(SQLSyntaxErrorException.class)
     直接 `CommonResult.failed(e.getMessage())` —— 把原始异常消息透传
  2. 商品 DTO 无参数校验，空入参能穿透到 SQL 层
  3. MyBatis 对空集合生成 `where id in ()` 非法 SQL

【危害】为攻击者提供数据库指纹与 SQL 结构线索，降低注入攻击成本；
        违反"不向客户端暴露内部实现细节"的安全原则
"""


@pytest.mark.xfail(
    strict=True,
    reason="DEFECT-02：创建商品传空对象时泄露原始 SQL 错误信息",
)
def test_defect02_create_product_should_not_leak_sql(api):
    """
    创建商品传空 JSON —— 不应泄露 SQL 错误

    【期望行为】返回 404 参数校验失败（像品牌模块那样，检查 name 等必填字段）
    【实际行为】返回 500 + 原始 SQL 错误信息
    """
    resp = api.post("/product/create", json_body={})

    # 断言 1：不应泄露 SQL 细节
    body_lower = (resp.raw or "").lower()
    assert "sql syntax" not in body_lower, (
        f"响应体泄露了原始 SQL 错误信息：\n  {resp.message}"
    )
    assert "mysql" not in body_lower, f"响应体泄露了数据库类型：{resp.message}"

    # 断言 2：应由参数校验拦截，返回 404
    assert resp.code == CODE_VALIDATE_FAILED, (
        f"空入参应由 @Validated 拦截返回 404，实际 code={resp.code}。"
        f"说明商品 DTO 缺少校验注解，空数据穿透到了 SQL 层"
    )


@pytest.mark.xfail(
    strict=True,
    reason="DEFECT-02：批量发货传空数组时 MyBatis 生成 'in ()' 非法 SQL 并泄露给客户端",
)
def test_defect02_empty_array_should_not_leak_sql(api):
    """
    批量发货传空数组 —— 不应泄露 SQL 错误

    【根因】MyBatis 的 foreach 对空集合生成 `where id in ()`，
    MySQL 语法错误。正确做法是在 SQL 层加 <if test="list != null and list.size() > 0">
    判断，或对空集合直接返回。

    【这条用例不修改数据】空数组本身不会匹配到任何订单。
    """
    resp = api.post("/order/update/delivery", json_body=[])

    body_lower = (resp.raw or "").lower()
    assert "sql syntax" not in body_lower, (
        f"空数组触发了 SQL 错误并泄露给客户端：\n  {resp.message}"
    )
    assert resp.code == CODE_SUCCESS, (
        f"空数组应被当作无操作优雅处理（返回 200），实际 code={resp.code}"
    )


# ============================================================
# DEFECT-03：删除不存在的记录返回笼统"操作失败"
# ============================================================
"""
【缺陷现象】删除一个不存在的 ID，返回 {"code":500,"message":"操作失败"}

【为什么这是缺陷】
从业务语义看，"删除不存在的记录"应当是**幂等成功**
（目标状态"记录不存在"已经达成），或至少提示"订单不存在"。
返回 500 会让前端无法区分：
    - 删除失败（权限不足 / 外键约束）
    - 记录本来就不存在
而且 500 会污染错误率监控指标。

【这条用例不修改数据】用的 ID 是 99999999，数据库中不存在。
"""


@pytest.mark.xfail(
    strict=True,
    reason="DEFECT-03：删除不存在的记录返回笼统'操作失败'，缺少明确语义",
)
def test_defect03_delete_nonexistent_should_have_clear_semantics(api):
    """删除不存在的订单 —— 应有明确语义，而不是笼统的"操作失败" """
    resp = api.post("/order/delete", params={"ids": 99999999})

    assert resp.message != "操作失败", (
        "删除不存在的记录返回了笼统的'操作失败'，"
        "无法区分'记录不存在'与'删除被拒绝'，且会污染错误率监控"
    )
    assert resp.code != CODE_FAILED, (
        f"删除不存在的记录不应返回 500，实际 code={resp.code}"
    )


# ============================================================
# DEFECT-04：API 文档根路径白名单失效
# ============================================================
"""
【缺陷现象】
secure.ignored.urls 里配了 `/v3/api-docs/*`，但这是 Ant 单星号通配符，
**匹配不到 /v3/api-docs 本身**（只匹配下一级路径）。

实测：
    GET /v3/api-docs  （匿名）      -> code=401
    GET /v3/api-docs  （带合法token）-> code=403「没有相关权限」
    GET /v3/api-docs/default         -> 200 ✅（Swagger UI 实际用的是这个）

【带 token 反而 403 的原因】
mall-admin 启用了动态权限校验（MallSecurityConfig.dynamicSecurityService），
DynamicAuthorizationManager 会把请求路径与 ums_resource 表的 31 条资源比对，
/v3/api-docs 不在其中 -> 拒绝。

【修复建议】白名单改成 /v3/api-docs/**（双星号匹配任意层级，含根路径）
"""


@pytest.mark.xfail(
    strict=True,
    reason="DEFECT-04：白名单 /v3/api-docs/* 覆盖不到根路径，合法 token 访问反而 403",
)
def test_defect04_api_docs_root_should_be_accessible(api):
    """持有合法 token 访问 API 文档根路径，不应被拒绝"""
    resp = api.get("/v3/api-docs")

    assert resp.code != 403, (
        f"持有合法 token 却被拒绝访问 /v3/api-docs。\n"
        f"  白名单配置为 /v3/api-docs/*（单星号），匹配不到根路径本身；\n"
        f"  且该路径不在 ums_resource 表中，被动态权限校验拒绝。\n"
        f"  实际 message = {resp.message}"
    )


# ============================================================
# DEFECT-05：日志记录明文密码（可通过读取日志文件自动检测）
# ============================================================
"""
【缺陷现象】WebLogAspect 切面把所有 Controller 的完整请求参数和
完整响应体序列化为 JSON，以 **INFO 级别** 打印，**无任何字段脱敏**。

实测日志内容：
    {"uri":"/admin/login","method":"POST",
     "parameter":{"username":"admin","password":"macro123"},   <-- 明文密码
     "result":{...,"data":{"token":"eyJ0eXAiOiJKV1QiLCJhbGci..."}}}  <-- 完整token

【根因】mall-common/.../log/WebLogAspect.java
    第76行  webLog.setParameter(getParameter(method, joinPoint.getArgs()))
            getParameter() 对 @RequestBody 参数直接 argList.add(args[i])，不做字段过滤
    第77行  webLog.setResult(result)        记录整个响应体
    第89行  LOGGER.info(...)                INFO 级别，生产环境同样输出

【影响范围】切入点覆盖 com.macro.mall.controller.* 和 com.macro.mall.*.controller.*
          => mall-admin 与 mall-portal 的全部接口

【危害】日志明文落盘，任何能读到日志的人（运维、日志采集系统、ELK 账号）
        都能拿到全站用户凭据；Token 有效期 7 天，可直接冒用身份。

【这条用例怎么做自动化】
这是一个"安全回归测试"：发一次带特定标记密码的登录请求，
然后去日志文件里搜这个密码 —— 搜到就说明还在记录明文。
用尾部读取而不是全文扫描，避免日志几 GB 时把测试拖死。
"""


@pytest.mark.xfail(
    strict=True,
    reason="DEFECT-05：WebLogAspect 未脱敏，日志中记录了明文密码",
)
def test_defect05_password_should_not_appear_in_log(raw_api):
    """
    登录密码不应出现在应用日志中

    ============================================================
    【关键发现：只有"成功的请求"才会被记录】
    ============================================================
    这条用例最初写错了 —— 我用一个错误密码去探测（避免用真密码），
    结果测试**意外通过**了，我一度以为缺陷已修复。

    排查后发现原因是 WebLogAspect 的实现：
        Object result = joinPoint.proceed();   // 如果这里抛异常……
        webLog.setParameter(...);              // ……下面这些根本不会执行
        webLog.setResult(result);
        LOGGER.info(...);

    登录失败会抛 ApiException，异常从 proceed() 抛出后直接穿透整个切面，
    **记录日志的代码根本没机会执行**。

    所以：只有**成功的请求**才会被记录到日志。
    要验证"密码是否泄露"，必须用**正确的密码**发一次成功登录。

    【教训】"测试意外通过"和"测试失败"一样需要警惕 ——
    它可能意味着测试本身没有真正覆盖到目标路径。
    如果当时直接采信"通过了 = 缺陷已修复"，就会漏掉一个高危安全问题。
    """
    # 用正确密码发一次【成功】的登录 —— 只有成功请求才会进 WebLogAspect 的日志
    resp = raw_api.post(
        "/admin/login",
        json_body={"username": "admin", "password": "macro123"},
    )
    assert resp.code == CODE_SUCCESS, (
        f"探测用的登录未成功（code={resp.code}），无法验证日志泄露问题。"
        f"请先确认账号口令可用"
    )

    # 【等待日志刷盘】Java 侧日志有缓冲，刚发的请求可能还没落到磁盘
    import time
    time.sleep(1.5)

    # 日志文件路径：启动脚本把 stdout 重定向到这里
    log_file = Path(__file__).resolve().parent.parent.parent / "_admin.out.log"
    if not log_file.exists():
        pytest.skip(f"未找到日志文件 {log_file}，跳过（需服务由 启动环境.ps1 启动）")

    # 【只读尾部】日志可能达到 GB 级，全文扫描会非常慢
    tail_bytes = 300_000
    size = log_file.stat().st_size
    with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
        if size > tail_bytes:
            f.seek(size - tail_bytes)
        recent = f.read()

    # 【更通用的检测】不只看某个特定密码，而是看有没有任何
    # "password":"xxx" 形式的明文密码被记录 —— 这样不管用哪个账号测都能命中
    leaked = re.findall(r'"password"\s*:\s*"([^"]{1,60})"', recent)

    assert not leaked, (
        f"【安全缺陷】登录密码以明文形式写入了应用日志！\n"
        f"  命中 {len(leaked)} 处，示例：{list(dict.fromkeys(leaked))[:3]}\n"
        f"  根因：WebLogAspect 第76行 getParameter() 对 @RequestBody 参数\n"
        f"        直接 argList.add(args[i])，不做任何字段过滤；\n"
        f"        第77行 setResult() 还记录了完整响应体（含 JWT Token）。\n"
        f"  危害：日志明文落盘，任何能读日志的人都能拿到全站用户凭据。\n"
        f"  修复：对 password/token 等字段做黑名单脱敏；敏感接口排除切面；\n"
        f"        生产环境日志级别调至 WARN。"
    )


def test_defect05_demo_log_file_contains_password():
    """
    【取证型用例】把日志中的明文密码证据打印出来

    【为什么单独写这一条】
    上面那条 xfail 用例运行时是"预期失败"的，看报告的人只能看到一个红色标记，
    不清楚日志里到底有什么。这条用例主动去日志里找出真实的密码记录并**打印出来**，
    作为缺陷的直接证据 —— 类似手工测试里"截图存证"的作用。

    【设计说明：为什么不在这里断言失败】
    它的目的是**取证**而不是**判定**。判定已由上面那条 xfail 用例负责。
    如果这里也用 fail，套件里就会有两条永久红色，
    让"真失败"淹没在"预期失败"里 —— 这违背了测试报告应有的信噪比。
    所以这条用例始终通过，只是把证据输出到日志。
    """
    log_file = Path(__file__).resolve().parent.parent.parent / "_admin.out.log"
    if not log_file.exists():
        pytest.skip(f"未找到日志文件 {log_file}")

    tail_bytes = 500_000
    size = log_file.stat().st_size
    with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
        if size > tail_bytes:
            f.seek(size - tail_bytes)
        recent = f.read()

    # 在日志里找形如 "password":"xxx" 的内容
    found = re.findall(r'"password"\s*:\s*"([^"]{4,40})"', recent)
    unique = list(dict.fromkeys(found))[:5]      # 去重后取前 5 个

    # 故意用 print 而不是 log，确保在 pytest -s 模式下能直接看到
    print("\n" + "=" * 70)
    print("DEFECT-05 取证：日志文件中的明文密码")
    print("=" * 70)
    print(f"  日志文件 : {log_file}")
    print(f"  文件大小 : {size / 1024 / 1024:.1f} MB")
    print(f"  本次扫描 : 末尾 {min(tail_bytes, size) / 1000:.0f} KB")
    print(f"  命中次数 : {len(found)} 处")
    if unique:
        print("  证据示例 :")
        for p in unique:
            print(f"      \"password\":\"{p}\"")
    else:
        print("  未发现明文密码 —— 若这样，说明 DEFECT-05 已修复")
    print("=" * 70 + "\n")

    # 取证型用例始终通过；判定交给上面的 xfail 用例
    assert True


# ============================================================
# DEFECT-06：utf8mb3 列导致 4 字节字符触发 SQL 错误
# ============================================================
"""
【缺陷现象】
用户名中包含 emoji（4 字节 UTF-8 字符）时，服务端返回 HTTP 500：
    java.sql.SQLException: Illegal mix of collations
    (utf8mb3_general_ci,IMPLICIT) and (utf8mb4_0900_ai_ci,COERCIBLE) for operation '='

【根因分析】
  1. mall.sql 是从 MySQL 5.7 导出的，当时建的列显式声明为 `CHARACTER SET utf8`
     （在 MySQL 里 `utf8` 就是 utf8mb3，最多 3 字节）
  2. 而 mall 库的默认字符集是 utf8mb4，MySQL 8 的连接也是 utf8mb4
  3. 传 4 字节字符时，utf8mb3 的列与 utf8mb4 的字面量无法比较
     -> MySQL 报错 1267 "Illegal mix of collations"

【实测证据】
  ums_admin.username 列  = utf8mb3 / utf8mb3_general_ci
  mall 库默认            = utf8mb4 / utf8mb4_general_ci
  全库仍有 211 个 varchar/text 列是 utf8mb3
  MySQL 端直接复现：SELECT 1 FROM ums_admin WHERE username='管理员🔒' -> ERROR 1267

【边界界定】
  3 字节字符（常用汉字「管理员」）-> 正常返回 404
  4 字节字符（emoji「🔒」）      -> HTTP 500

【危害】
  - 用户昵称、备注等字段无法使用 emoji（现代产品的常见需求）
  - 攻击者可构造含 emoji 的请求稳定触发服务端 500，制造错误日志噪声
  - 更严重的是：这个 500 的真实错误被 DEFECT-01 掩盖成 401，
    运维看到的告警是"鉴权失败"，完全找不到真正原因

【修复方案】
  ALTER TABLE mall.ums_admin CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
  需对全库 211 个 utf8mb3 列做同样处理（建议整库转换）。
"""


@pytest.mark.xfail(
    strict=True,
    reason="DEFECT-06：utf8mb3 列遇 4 字节字符（emoji）触发 SQL 错误 1267，返回 500",
)
def test_defect06_emoji_in_username_should_not_crash(raw_api):
    """
    用户名含 emoji —— 不应导致服务端 500

    【测试数据选择】用 emoji「🔒」(U+1F512)，它超出 BMP（基本多文种平面），
    UTF-8 编码为 4 字节，正好触发 utf8mb3 列的存储/比较限制。

    【期望的正确行为】服务端应正常处理，返回 404「用户名或密码错误」
    【实际行为】HTTP 500 + SQLException 1267（且被掩盖成 401）
    """
    resp = raw_api.post(
        "/admin/login",
        json_body={"username": "管理员🔒", "password": "x"},
    )

    assert resp.http_status != 500, (
        f"含 emoji 的用户名导致服务端 500 错误！\n"
        f"  根因：ums_admin.username 列是 utf8mb3，无法处理 4 字节字符\n"
        f"  MySQL 错误：1267 Illegal mix of collations\n"
        f"  实际响应：HTTP {resp.http_status} body={resp.raw[:200]}"
    )

    # 期望是正常的业务失败
    assert resp.code in (CODE_FAILED, CODE_VALIDATE_FAILED), (
        f"应返回业务失败（404/500 业务码），实际 code={resp.code}"
    )


def test_defect06_boundary_chinese_works(raw_api):
    """
    【边界对照】3 字节中文字符是正常的 —— 用来界定缺陷范围

    【为什么要有这条对照用例】
    单看"emoji 导致 500"不够精确。加上这条对照，缺陷边界就清晰了：
        3 字节字符 -> 正常
        4 字节字符 -> 500
    这对开发定位问题帮助极大 —— 直接指向"字符集是 utf8mb3"这个根因，
    而不是让人去猜是不是"特殊字符"或者"SQL 注入防护"的问题。

    这条用例是**预期通过**的，它和上面那条 xfail 配合，
    共同刻画了缺陷的精确边界。
    """
    resp = raw_api.post(
        "/admin/login",
        json_body={"username": "管理员", "password": "x"},
    )

    assert resp.http_status != 500, "3 字节中文字符不应导致服务端错误"
    assert resp.code in (CODE_FAILED, CODE_VALIDATE_FAILED), (
        f"应返回业务失败，实际 code={resp.code}"
    )
