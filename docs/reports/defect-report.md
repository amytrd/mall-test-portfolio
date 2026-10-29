---
layout: report
title: 缺陷报告
description: 6 个缺陷的标准 Bug 报告、根因定位、修复建议与 xfail 回归闭环
---

> 被测系统：mall-admin（http://localhost:8080） / mall-portal（http://localhost:8085）
> 测试环境：Windows 11 + JDK 17 + MySQL 8.0.46 + Redis + MongoDB + RabbitMQ
> 缺陷总数：**6 个（高 4 / 中 1 / 低 1）**
> 状态说明：本作品集基于开源项目测试，缺陷状态统一记为「已复现 · 待修复」，并已固化为 xfail 回归用例；修复后用例会自动转正。

## 一、缺陷概览

| 编号 | 标题 | 级别 | 优先级 | 发现阶段 | 状态 | 回归用例 |
|---|---|---|---|---|---|---|
| DEFECT-05 | 日志切面记录明文密码与完整 Token | 🔴 高 | P0 | 性能测试后核查日志 | 已复现 · 待修复 | `test_defect05_password_in_log` |
| DEFECT-06 | utf8mb3 列遇 emoji 触发 SQL 错误 1267 | 🔴 高 | P0 | 编写 pytest 框架 | 已复现 · 待修复 | `test_defect06_emoji_in_username_should_not_crash` |
| DEFECT-02 | 原始 SQL 错误信息直接返回客户端 | 🔴 高 | P1 | 功能测试 | 已复现 · 待修复 | `test_defect02_sql_error_leak` |
| DEFECT-01 | 未处理异常被 `/error` 二次分发，真实错误被 401 覆盖 | 🔴 高 | P1 | 功能测试 | 已复现 · 待修复 | `test_defect01_type_mismatch_should_not_return_401` |
| DEFECT-04 | API 文档根路径白名单失效，带 token 反而 403 | 🟡 中 | P2 | 接口测试 | 已复现 · 待修复 | `test_defect04_api_docs_root_401` |
| DEFECT-03 | 删除不存在的记录返回笼统「操作失败」 | 🟡 低 | P3 | 功能测试 | 已复现 · 待修复 | `test_defect03_delete_nonexistent` |

## 二、缺陷生命周期如何落地

本项目不是"提完 Bug 就结束"，而是按完整生命周期闭环：

```
发现 ──→ 复现 ──→ 定级 ──→ 根因定位 ──→ 修复建议 ──→ xfail 回归 ──→ 修复后转正 ──→ 关闭
 │         │         │          │            │             │
 │         │         │          │            │             └─ pytest.mark.xfail(strict=True)
 │         │         │          │            └─ 给出可执行的代码/SQL 级建议
 │         │         │          └─ 日志 + 代码 + 数据库三层证据
 │         │         └─ 高/中/低 + P0-P3，结合影响面与利用难度
 │         └─ 最小复现步骤 + 预期/实际对照
 └─ 功能用例 / 接口断言 / 性能副作用 / 自动化边界用例
```

**xfail 的作用**：把缺陷写成"预期会失败"的用例。当前运行结果是 `xfailed`，不算失败；一旦开发修复，用例会变成 `xpassed`，在 `strict=True` 下立即报错，提醒测试人员"缺陷已修复，请更新用例并关闭 Bug"。这样缺陷不会在报告归档后被遗忘。

## 三、DEFECT-05 · 日志切面记录明文密码与完整 Token

| 项目 | 内容 |
|---|---|
| **级别 / 优先级** | 🔴 高 / P0（安全） |
| **发现阶段** | 性能测试后核查日志时意外发现 |
| **影响范围** | mall-admin 与 mall-portal 全部 Controller 接口，包括登录、会员注册、修改密码 |
| **状态** | 已复现 · 待修复（已固化为 xfail） |

**问题描述**

`WebLogAspect` 切面把所有 Controller 的完整请求参数和完整响应体序列化为 JSON，以 **INFO 级别**打印，且没有任何字段脱敏。

**实际日志内容（真实截取，IP 与 Token 已脱敏）**

```json
{
  "description": "登录以后返回token",
  "username": "admin",
  "uri": "/admin/login",
  "method": "POST",
  "ip": "127.0.0.1",
  "parameter": { "username": "admin", "password": "macro123" },
  "result": {
    "code": 200,
    "data": {
      "tokenHead": "Bearer ",
      "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
    }
  }
}
```

**泄露的信息**

1. 登录密码明文（`"password":"macro123"`）；
2. 完整 JWT Token（有效期 7 天，可直接冒用身份）；
3. 完整响应体（商品、订单、会员等全量业务数据）；
4. 客户端 IP、请求 URL、耗时。

**根因**

`mall-common/.../log/WebLogAspect.java`：

- `getParameter()` 对 `@RequestBody` 参数直接 `argList.add(args[i])`，把整个 DTO 塞进日志，不做字段过滤；
- `setResult()` 记录整个响应体；
- 最终以 `LOGGER.info(...)` 输出，生产环境同样生效；
- 切入点 `com.macro.mall.controller.*` 与 `com.macro.mall.*.controller.*`，覆盖全部接口。

**为什么是性能测试发现的**

压测后日志文件涨到 **1.84 GB**。按 30 万请求计算，平均每请求约 **6.4 KB** 日志。顺着"日志为什么这么大"去查内容，才发现里面在打印明文密码和 Token。这条缺陷同时是安全问题和性能问题，和性能报告中的"debug 日志拖慢服务"互相印证。

**修复建议**

1. 对 `password`、`oldPassword`、`newPassword`、`token` 等字段名做黑名单脱敏；
2. 响应体只记录状态码或摘要，不记录全文；
3. 敏感接口（`/admin/login`、`/admin/updatePassword`、`/sso/*`）排除日志切面；
4. 生产环境日志级别调到 `WARN`，配置日志轮转与保留期限。

---

## 四、DEFECT-06 · utf8mb3 列遇 4 字节字符触发 SQL 错误 1267

| 项目 | 内容 |
|---|---|
| **级别 / 优先级** | 🔴 高 / P0（健壮性 + 可用性） |
| **发现阶段** | 编写 pytest 字符集边界用例时意外发现 |
| **影响范围** | 全库 **211 个** varchar/text 列 |
| **状态** | 已复现 · 待修复（已固化为 xfail） |

**复现步骤**

```http
POST /admin/login
Content-Type: application/json

{"username": "管理员🔒", "password": "x"}
```

**实际结果**

HTTP 500，服务端日志抛出：

```
java.sql.SQLException: Illegal mix of collations
(utf8mb3_general_ci,IMPLICIT) and (utf8mb4_0900_ai_ci,COERCIBLE) for operation '='
### The error may involve com.macro.mall.mapper.UmsAdminMapper.selectByExample
```

**边界界定实验（关键）**

| 输入 | UTF-8 字节数 | 实际结果 | 结论 |
|---|---|---|---|
| `管理员` | 3 字节/字符 | HTTP 200，`code=404`「用户名或密码错误」 | 正常 |
| `管理员🔒` | emoji 为 **4 字节** | **HTTP 500 + SQLException 1267** | 异常 |

边界精确落在 **3 字节 vs 4 字节 UTF-8**，直接把方向指向字符集，而不是"特殊字符过滤"。

**根因链条**

1. `mall.sql` 从 **MySQL 5.7** 导出（文件头 `Source Server Version: 50719`），建表时每列显式声明 `CHARACTER SET utf8`；
2. MySQL 中 **`utf8` 是 `utf8mb3` 的别名，最多 3 字节**；
3. `mall` 库默认字符集是 `utf8mb4`，MySQL 8 连接也是 utf8mb4；
4. 4 字节字符与 utf8mb3 列比较时，MySQL 报 1267 `Illegal mix of collations`。

**证据链**

| 证据 | 结果 |
|---|---|
| `ums_admin.username` 列字符集 | `utf8mb3` / `utf8mb3_general_ci` |
| `mall` 库默认字符集 | `utf8mb4` / `utf8mb4_general_ci` |
| `ums_admin`、`pms_product`、`oms_order` 表排序规则 | 均为 `utf8mb3_general_ci` |
| 全库 utf8mb3 列数量 | **211 个** |
| MySQL 端直接复现 | `SELECT 1 FROM mall.ums_admin WHERE username = '管理员🔒'` → **ERROR 1267** |

**影响**

- 用户名、昵称、备注、商品名、订单备注等字段都无法使用 emoji；
- 攻击者可构造含 emoji 的请求稳定触发 500，配合 DEFECT-05 可快速放大日志体积；
- 真实错误被 DEFECT-01 掩盖，客户端只看到 `401 暂未登录`，排障成本极高。

**修复建议**

```sql
-- 推荐：整库转换，一次性解决 211 个列
ALTER DATABASE mall CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- 对每张表执行
ALTER TABLE ums_admin CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
-- ...其余表同理
```

转换前需评估索引长度限制（utf8mb4 每字符 4 字节，varchar 索引可能超长）与已有数据兼容性。短期兜底可在参数校验层拒绝 4 字节字符并返回友好提示，但治标不治本。同时应修复 DEFECT-01，让此类异常正确暴露。

---

## 五、DEFECT-02 · 原始 SQL 错误信息直接返回客户端

| 项目 | 内容 |
|---|---|
| **级别 / 优先级** | 🔴 高 / P1（信息泄露） |
| **发现阶段** | 功能测试（读取 DTO 源码后定向设计用例） |
| **影响用例** | P-15 `POST /product/create` 传 `{}`；O-14 `POST /order/update/delivery` 传 `[]` |
| **状态** | 已复现 · 待修复（已固化为 xfail） |

**实际响应**

```json
{
  "code": 500,
  "message": "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near ')' at line 1",
  "data": null
}
```

**根因**

- `GlobalExceptionHandler` 中 `@ExceptionHandler(SQLSyntaxErrorException.class)` 直接把 `e.getMessage()` 放进响应；
- 商品 DTO 没有任何参数校验注解，空对象能穿透到 SQL 层；
- MyBatis 对空集合生成 `where id in ()` 非法 SQL。

**泄露内容**：数据库类型（MySQL）、SQL 语法片段（`near ')'`）、出错行号（`line 1`）。

**修复建议**

1. 对客户端返回统一兜底文案，真实异常写服务端日志；
2. SQL 层增加空集合判断，避免生成 `in ()`；
3. 为商品 DTO 补充参数校验，从入口拦截非法入参。

---

## 六、DEFECT-01 · 未处理异常被 `/error` 二次分发，真实错误被 401 覆盖

| 项目 | 内容 |
|---|---|
| **级别 / 优先级** | 🔴 高 / P1 |
| **发现阶段** | 功能测试 |
| **影响用例** | L-10、P-07、P-16、O-09、O-10、O-12（共 6 条） |
| **状态** | 已复现 · 待修复（已固化为 xfail） |

**复现步骤**

1. 登录获取合法 token；
2. 发送 `GET /product/list?pageSize=abc`，携带合法 `Authorization`；
3. 观察响应。

**实际结果**

```
HTTP 400
{"code":401,"message":"暂未登录或token已经过期",
 "data":"Full authentication is required to access this resource"}
```

**预期结果**：HTTP 400，响应体说明 `pageSize 参数类型不正确`。

**根因链路**

1. `GlobalExceptionHandler` 只处理 `ApiException`、`MethodArgumentNotValidException`、`BindException`、`SQLSyntaxErrorException` 四类；`MethodArgumentTypeMismatchException` 等未被覆盖，由 Spring 兜底返回 400；
2. Spring Boot 把请求 **ERROR 二次分发到 `/error`**；
3. `/error` 不在 `secure.ignored.urls` 白名单，`SecurityConfig` 的 `anyRequest()` 重新鉴权；
4. 无认证上下文 → `RestAuthenticationEntryPoint` 写出 401 响应体，覆盖原始错误。

**影响**

前端无法区分"参数错误"和"未登录"，会被误导去重新登录；监控按 code 统计会把参数错误误计为鉴权失败；真实异常只存在于服务端日志。

**放大效应**：DEFECT-01 是"放大器"——它让 DEFECT-02、DEFECT-06 这类服务端异常在客户端完全看不出真相。修复优先级应与 02/06 一起考虑。

**修复建议**

- 方案 A（推荐）：在 `GlobalExceptionHandler` 补充处理 `MethodArgumentTypeMismatchException`、`MissingServletRequestParameterException`、`HttpMessageNotReadableException`，统一返回 `CommonResult.validateFailed(...)`；
- 方案 B（配套）：在 `secure.ignored.urls` 中加入 `/error`，避免二次分发被拦截。

---

## 七、DEFECT-04 · API 文档根路径白名单失效，带 token 反而 403

| 项目 | 内容 |
|---|---|
| **级别 / 优先级** | 🟡 中 / P2 |
| **发现阶段** | 接口测试 |
| **影响用例** | D-02、D-03 |
| **状态** | 已复现 · 待修复（已固化为 xfail） |

**实测行为**

| 请求 | 结果 |
|---|---|
| `GET /v3/api-docs`（匿名） | `code=401`「暂未登录或token已经过期」 |
| `GET /v3/api-docs`（**合法 admin token**） | `code=403`「没有相关权限」 |
| `GET /v3/api-docs/`（尾斜杠） | HTTP 404（Spring Boot 3 默认关闭尾斜杠匹配） |
| `GET /v3/api-docs/default` | ✅ 200，返回 131,820 字节 OpenAPI 文档 |

**根因**

1. 白名单配置为 `/v3/api-docs/*`，Ant 单星号只匹配一层子路径，**匹配不到根路径本身**；
2. 即使带合法 token 也 403，是因为启用了动态权限校验：`DynamicAuthorizationManager` 把请求路径与 `ums_resource` 表的 31 条资源逐条比对，`/v3/api-docs` 不在其中。

**实际影响**：不影响 Swagger UI 使用（UI 通过 `/v3/api-docs/swagger-config` 拿到 `/v3/api-docs/default`，该路径命中白名单）。缺陷仅体现在根路径无法被任何身份访问。

**修复建议**：白名单改为 `/v3/api-docs/**`（双星号匹配任意层级，含根路径）。

**方法论价值**：这是"不要只看配置、要看实际行为"的典型。配置里明明写了 api-docs 白名单，直觉会认为已放行，只有真实发请求才能发现路径匹配规则与直觉不符。

---

## 八、DEFECT-03 · 删除不存在的记录返回笼统「操作失败」

| 项目 | 内容 |
|---|---|
| **级别 / 优先级** | 🟡 低 / P3（接口语义） |
| **发现阶段** | 功能测试 |
| **影响用例** | O-11 删除不存在订单；C-05 删除不存在分类 |
| **状态** | 已复现 · 待修复（已固化为 xfail） |

**实际结果**

```json
{"code":500,"message":"操作失败","data":null}
```

**问题**：「删除不存在的记录」从业务语义看应是幂等成功（目标状态已达成），或至少明确提示「订单不存在」。当前返回 500，前端无法区分"删除失败（权限/外键约束）"与"记录本来就不存在"，还会污染错误率监控指标。

**修复建议**：影响行数为 0 时返回 `code=200` 并提示「记录不存在」，或返回专门的业务错误码。

---

## 九、其他观察项（未计入缺陷）

| 观察项 | 说明 | 建议 |
|---|---|---|
| 用户枚举 | 密码错误返回 500「密码不正确」，用户不存在返回 404「用户名或密码错误」，可区分 | 统一失败提示，防用户名枚举 |
| 密码无长度限制 | `password` 仅 `@NotEmpty`，1000 字符可提交 | 增加 `@Size(max=...)` |
| 校验提示语无分隔符 | 返回 `name不能为空`、`sort最小不能小于0` | 字段名与提示语之间加 `: ` |
| 删除接口 HTTP 方法不一致 | 分类删除用 POST，品牌删除用 **GET** | 统一用 DELETE 或 POST，GET 不应产生副作用 |
| 商品字段拼写不一致 | 实体 `recommandStatus` vs 接口参数 `recommendStatus` | 统一命名 |
| 商品/订单模块无参数校验 | 与品牌/分类模块形成鲜明对比 | 补齐 DTO 校验注解 |

## 十、修复优先级建议

| 顺序 | 缺陷 | 理由 |
|---|---|---|
| 1 | DEFECT-05 | 明文密码与 Token 落盘，直接危及全站账号安全 |
| 2 | DEFECT-06 | 涉及 211 个列，且被 DEFECT-01 掩盖，真实影响被低估 |
| 3 | DEFECT-02 | SQL 错误泄露数据库指纹与结构线索 |
| 4 | DEFECT-01 | "放大器"，修复后 02/06 的排查成本显著下降 |
| 5 | DEFECT-04 | 影响开发体验，不影响生产业务 |
| 6 | DEFECT-03 | 语义优化，优先级最低 |

> **缺陷分布**：高危 4 个、中危 1 个、低危 1 个。高危集中在**安全**（日志泄露、SQL 信息泄露）与**健壮性**（字符集、异常处理）两类，均给出了代码或 SQL 级修复建议。
