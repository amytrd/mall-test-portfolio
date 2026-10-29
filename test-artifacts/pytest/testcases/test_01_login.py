# -*- coding: utf-8 -*-
"""
登录模块接口测试

【模块特点】
登录是系统入口，也是最值得重点测的接口：
  1. 它是唯一的"无鉴权"业务接口，暴露面最大
  2. 包含 BCrypt 密码校验，是性能瓶颈所在
  3. 错误分支多（用户不存在 / 密码错误 / 账号禁用），且返回码不一致

【用例设计方法】
  - 等价类划分：有效凭证 / 无效凭证 / 空值 / 格式异常
  - 边界值：超长密码、前后空格
  - 错误推测：SQL 注入、XSS 探测
  - 安全检查：无 token / 伪造 token

【组织方式】
  - 正向用例（L-01）单独写：它逻辑特殊（要校验 token 结构、要断言 data 不为空）
  - 负向用例走数据驱动：逻辑相同、只是数据不同，数据放 YAML
"""

import pytest

from config import CODE_SUCCESS, CODE_UNAUTHORIZED, CODE_VALIDATE_FAILED, CODE_FAILED
from utils.data_loader import load_cases

# 从 YAML 加载负向用例。加一条数据 = 多一个测试用例，不用改这里。
LOGIN_CASES = load_cases("login_cases.yaml", "login_cases")


# ============================================================
# 一、正向用例
# ============================================================
def test_login_success(raw_api):
    """
    L-01 正确账号密码登录（正向）

    【断言设计思路 —— 分层断言】
    一个接口"成功"不只是 code=200，还要验证返回的数据结构是否符合约定。
    所以这里分四层断言：
        1. 业务码   —— code 必须是 200
        2. 数据结构 —— data 不能为空
        3. 字段存在 —— 必须有 token 和 tokenHead
        4. 格式正确 —— token 是 JWT 三段式、tokenHead 是 "Bearer "（带空格）
    只断第一层的话，服务端返回 {"code":200,"data":{}} 也会被判通过。
    """
    resp = raw_api.post(
        "/admin/login",
        json_body={"username": "admin", "password": "macro123"},
    )

    # 第 1 层：业务码
    resp.assert_success("登录成功场景")

    # 第 2 层：数据结构
    resp.assert_data_not_none()

    # 第 3 层：字段存在性
    resp.assert_has_field("token")
    resp.assert_has_field("tokenHead")

    # 第 4 层：格式正确性
    token = resp.data["token"]
    assert isinstance(token, str) and token, "token 必须是非空字符串"

    # JWT 是 header.payload.signature 三段结构，用点数验证
    assert token.count(".") == 2, (
        f"token 不是合法的 JWT 三段式格式：{token[:50]}..."
    )

    token_head = resp.data["tokenHead"]
    assert token_head == "Bearer ", (
        f"tokenHead 应为 'Bearer '（注意末尾有一个空格），实际为 {token_head!r}"
    )

    # 第 5 层：性能基线（功能测试也要守性能底线）
    resp.assert_response_time_within()


def test_login_token_is_usable(raw_api):
    """
    验证登录拿到的 token 真的能用

    【为什么需要这条用例】
    上面的 test_login_success 只验证了"登录接口返回了格式正确的 token"，
    但没验证"这个 token 真的能通过鉴权"。两者是两回事 ——
    token 可能是格式正确但签名错误、或者用户状态有问题导致鉴权失败。

    这条用例做**端到端串联**：登录拿 token → 用 token 访问受保护接口 → 应当成功。
    这是接口测试里"关联"的思想：不能只测单个接口，要测接口之间的数据流转。
    """
    login_resp = raw_api.post(
        "/admin/login",
        json_body={"username": "admin", "password": "macro123"},
    )
    login_resp.assert_success()
    token = login_resp.data["token"]

    info_resp = raw_api.get("/admin/info", headers={"Authorization": f"Bearer {token}"})
    info_resp.assert_success("用登录得到的 token 访问 /admin/info")

    assert info_resp.data["username"] == "admin", (
        f"返回的用户名与登录账号不一致：{info_resp.data.get('username')}"
    )

    # 顺带验证权限数据也下发了（动态权限体系依赖它）
    assert isinstance(info_resp.data.get("menus"), list), "menus 应为列表"
    assert len(info_resp.data["menus"]) > 0, "登录用户应有菜单权限"


# ============================================================
# 二、负向用例（数据驱动）
# ============================================================
@pytest.mark.parametrize(
    "case",
    LOGIN_CASES,
    ids=[f"{c['id']}-{c['title']}" for c in LOGIN_CASES],   # 报告里显示人类可读的用例编号
)
def test_login_negative(raw_api, case):
    """
    登录失败场景（数据驱动）

    【这条函数覆盖了 YAML 里的所有负向用例】
    错误密码、用户不存在、空值、缺字段、SQL 注入……
    它们的**测试逻辑完全一样**：发请求 → 断言业务码 → 断言提示语。
    只有数据不同，所以用一个函数 + 参数化来覆盖。

    【断言为什么要针对 code 而不是 HTTP 状态码】
    见 utils/http_client.py 里 ApiResponse.assert_code 的详细说明 ——
    本项目所有业务响应的 HTTP 状态码都是 200，真实结果在 body 的 code 里。
    """
    resp = raw_api.post("/admin/login", json_body=case["body"])

    # 断言 1：业务码
    resp.assert_code(case["expect_code"], note=case["title"])

    # 断言 2：提示语（有配 expect_msg 才断言，做包含匹配，避免因文案微调而误报）
    if case.get("expect_msg"):
        resp.assert_message_contains(case["expect_msg"])

    # 断言 3：失败场景绝不能下发 token
    # 【为什么要专门断这个】登录失败却返回了 token，是严重的安全缺陷。
    # 这类"反向断言"（断言不该出现什么）在安全测试里很重要。
    if case["expect_code"] != CODE_SUCCESS:
        assert resp.data is None or "token" not in (resp.data or {}), (
            f"登录失败却下发了 token！响应体={resp.body}"
        )


# ============================================================
# 三、边界用例
# ============================================================
@pytest.mark.parametrize("length", [1, 8, 64, 1000, 5000], ids=lambda n: f"密码长度{n}")
def test_login_password_length_boundary(raw_api, length):
    """
    密码长度边界测试

    【设计思路】
    密码字段只有 @NotEmpty 校验，没有 @Size 限制长度。
    这里用几组边界值探测服务端行为：
      1    —— 极短（下边界）
      8    —— 常见密码最小长度
      64   —— 数据库 varchar(64) 的长度上限（BCrypt 哈希结果正好 60 字符）
      1000 —— 明显超长
      5000 —— 极端超长，看是否会导致服务端异常

    【期望行为】无论多长，都不应该：
      - 导致 500 崩溃（健壮性）
      - 因为截断而与真实密码匹配成功（安全性）
    """
    resp = raw_api.post(
        "/admin/login",
        json_body={"username": "admin", "password": "a" * length},
    )

    # 不崩溃：业务码应该是 500（密码不正确）或 404（校验失败），而不是服务端异常
    assert resp.code in (CODE_FAILED, CODE_VALIDATE_FAILED), (
        f"密码长度 {length} 时返回了非预期业务码 {resp.code}，message={resp.message}"
    )

    # 不能登录成功
    assert resp.code != CODE_SUCCESS, f"超长密码竟然登录成功，存在安全问题（长度 {length}）"


def test_login_username_with_chinese(raw_api):
    """
    用户名含中文（3 字节字符）时的健壮性

    【为什么这条能通过，而 emoji 那条会失败】
    这里用的是 BMP 内的常用汉字「管理员」，UTF-8 编码为 3 字节。
    数据库列是 utf8mb3（最多 3 字节），所以能正常处理，返回 404。

    而 emoji（🔒）属于 BMP 之外，UTF-8 是 **4 字节**，
    utf8mb3 列存不下也无法比较，会触发 MySQL 1267 错误。
    那一条已作为已知缺陷记录在 test_04_known_defects.py 里。

    这两条用例放在一起看，正好界定了缺陷的边界：
        ≤3 字节字符  → 正常
        =4 字节字符  → 服务端 500
    """
    resp = raw_api.post(
        "/admin/login",
        json_body={"username": "管理员", "password": "x"},
    )
    assert resp.code in (CODE_FAILED, CODE_VALIDATE_FAILED), (
        f"普通中文字符用户名应返回业务失败，实际 code={resp.code}"
    )


# ============================================================
# 四、鉴权检查（不用 raw_api 之外的东西，故意不带 token）
# ============================================================
@pytest.mark.parametrize(
    "path",
    ["/admin/list", "/admin/info", "/product/list", "/order/list"],
    ids=["admin/list", "admin/info", "product/list", "order/list"],
)
def test_access_without_token_is_rejected(raw_api, path):
    """
    无 token 访问受保护接口应返回 401

    【为什么要参数化多个接口】
    鉴权是由 Spring Security 的过滤器统一拦截的，
    但"统一"是设计意图，实际上可能因为白名单配置疏漏而导致某个接口漏网。
    所以要用多个接口验证，而不是测一个就认为全部 OK。
    这类"抽样验证统一机制"的思路在测试里很常用。
    """
    resp = raw_api.get(path)
    resp.assert_code(CODE_UNAUTHORIZED, note=f"无 token 访问 {path}")


def test_forged_token_is_rejected(raw_api):
    """
    伪造签名的 token 应被拒绝

    【测试价值】验证 JWT 的**签名校验**真的生效。
    如果服务端只解析 payload 而不验签，攻击者可以自己伪造
    任意用户身份的 token（比如把 sub 改成 admin）。
    这条用例就是在验证这个防护有没有生效。

    这里构造一个结构完整（三段式）、但签名是假的 token。
    """
    forged = (
        "eyJhbGciOiJIUzI1NiJ9"                                  # header
        ".eyJzdWIiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OTl9"          # payload: sub=admin
        ".this_signature_is_totally_fake"                        # 假签名
    )
    resp = raw_api.get("/admin/list", headers={"Authorization": f"Bearer {forged}"})
    resp.assert_code(CODE_UNAUTHORIZED, note="伪造签名的 token 必须被拒绝")


def test_malformed_token_is_rejected(raw_api):
    """格式非法的 token（不是三段式）也应被拒绝，且服务端不能因此崩溃"""
    resp = raw_api.get("/admin/list", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.code == CODE_UNAUTHORIZED, (
        f"非法格式 token 应返回 401，实际 code={resp.code}"
    )

    # 边界：Authorization 头格式错误（缺少 Bearer 前缀）
    resp2 = raw_api.get("/admin/list", headers={"Authorization": "not-a-jwt"})
    assert resp2.code == CODE_UNAUTHORIZED, (
        f"缺少 Bearer 前缀应返回 401，实际 code={resp2.code}"
    )
