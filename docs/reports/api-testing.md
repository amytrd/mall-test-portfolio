---
layout: report
title: 接口测试报告（Postman）
description: 160 个接口梳理、40 个请求、五层断言设计与 token 接口关联
---

> 被测系统：mall-admin 后台管理系统（http://localhost:8080）
> 测试工具：Postman（集合格式 v2.1，可导入 Postman / Newman / Apifox）
> 执行日期：2026-09-30
> 接口规模：**160 个接口**（从 OpenAPI 文档解析确认）
> 交付资产：`mall-admin.postman_collection.json`（40 个请求）+ `mall-local.postman_environment.json`

---

## 一、测试目标

| 目标 | 说明 |
|---|---|
| 验证接口功能正确性 | 核心业务接口的请求响应是否符合预期 |
| 验证参数校验 | 必填、类型、范围、枚举值校验是否生效 |
| 验证鉴权机制 | 无 token / 伪造 token / 越权访问是否被正确拦截 |
| 验证接口关联 | 登录获取的 token 能否在后续接口中正确传递 |
| 验证异常处理 | 异常入参下服务端的返回是否符合设计规范 |
| 沉淀可复用资产 | 输出可导入、可一键执行的 Postman 集合 |

---

## 二、被测接口清单

mall-admin 共 **160 个接口**，按一级路径分布：

| 路径前缀 | 接口数 | 路径前缀 | 接口数 |
|---|---|---|---|
| `/home` | 26 | `/flash` `/resource` | 各 6 |
| `/admin` | 13 | `/coupon` `/flashProductRelation` | 各 5 |
| `/productAttribute` | 12 | `/resourceCategory` `/returnApply` | 各 4 |
| `/product` `/role` | 各 10 | `/subject` `/aliyun` `/orderSetting` `/minio` `/sku` | 各 2 |
| `/brand` | 9 | `/couponHistory` `/companyAddress` `/prefrenceArea` `/memberLevel` | 各 1 |
| `/productCategory` `/order` | 各 8 | | |
| `/flashSession` `/menu` | 各 7 | | |

> 清单来源：`GET /v3/api-docs/default` 返回的 OpenAPI 3.1.0 文档（131,820 字节）。
> 本次接口测试**选取三大核心模块共 40 个请求**做深度覆盖，而非平铺所有 160 个接口。

---

## 三、Postman 资产结构

### 3.1 集合目录结构

```
mall-admin 后台接口测试 (40 requests)
├── 00 登录与鉴权   (9)
│   ├── L-01 登录成功（正向，自动保存token）  ★ 接口关联起点
│   ├── L-02 登录-密码错误
│   ├── L-03 登录-用户名不存在（用户枚举探测）
│   ├── L-04 登录-用户名为空
│   ├── L-06 登录-请求体为空对象
│   ├── L-08 登录-SQL注入式用户名（安全）
│   ├── A-01 鉴权-无 token 访问受保护接口
│   ├── A-02 鉴权-伪造 token
│   └── A-04 鉴权-合法token获取当前用户信息
├── 01 商品管理     (12)
├── 02 订单管理     (9)
├── 03 品牌与商品分类 (7)
└── 04 接口文档与健康检查 (3)
```

### 3.2 环境变量（`mall-local.postman_environment.json`）

| 变量 | 值 | 说明 |
|---|---|---|
| `baseUrl` | `http://localhost:8080` | mall-admin 地址 |
| `portalBaseUrl` | `http://localhost:8085` | mall-portal 地址 |
| `token` | *(空，脚本自动写入)* | JWT token，接口关联用 |
| `tokenHead` | `Bearer `（**末尾有空格**） | token 前缀 |
| `adminUsername` | `admin` | 测试账号 |
| `adminPassword` | `macro123` | 测试口令 |

---

## 四、关键技术点

### 4.1 断言必须针对业务码，而不是 HTTP 状态码 ⭐

这是本项目接口测试**最核心的一点**。

mall 使用统一响应体 `CommonResult`，**所有业务响应（包括业务失败）的 HTTP 状态码都是 200**，真实结果在响应体的 `code` 字段：

```json
{ "code": 200, "message": "操作成功", "data": { ... } }
```

**反例**：如果按常规只断言 `pm.response.to.have.status(200)`，那么「登录密码错误」的响应（HTTP 200 + code 500）也会被判为**通过**，接口测试完全失效。

**正确做法**（本项目 40 个请求全部采用）：

```javascript
pm.test("HTTP 状态码为 200", function () {
    pm.response.to.have.status(200);
});

const json = pm.response.json();

// 关键断言：业务码
pm.test("业务码 code = 200（登录成功）", function () {
    pm.expect(json.code).to.eql(200);
});
```

### 4.2 接口关联：token 自动传递 ⭐

登录接口的 Tests 脚本在断言之后，把 token 写入环境变量：

{% raw %}
```javascript
// ---------- 接口关联：token 写入环境变量 ----------
// 后续所有需要鉴权的请求通过 {{token}} 引用，实现自动传递
if (json.code === 200 && json.data && json.data.token) {
    pm.environment.set("token", json.data.token);
    pm.environment.set("tokenHead", json.data.tokenHead);
}
```

后续请求的请求头直接引用变量，**无需手工粘贴 token**：

```
Authorization: {{tokenHead}}{{token}}
```
{% endraw %}

**执行顺序要求**：必须先跑 `00 登录与鉴权` 中的 `L-01`，再跑其余文件夹。用 Collection Runner 时可勾选按顺序执行，或使用 `postman.setNextRequest()` 控制流程。

**这样做的价值**：
- token 有效期 7 天，硬编码在集合里会过期失效，自动化脚本必须动态获取；
- 避免手工复制粘贴 token 带来的操作成本和人为错误；
- 这是接口测试「关联（Correlation）」的标准实践 —— 与 JMeter 的 JSON 提取器是同一思路。

### 4.3 断言层次设计

本项目每个请求的断言按五层递进：

| 层次 | 断言内容 | 示例 |
|---|---|---|
| ① 传输层 | HTTP 状态码 | `pm.response.to.have.status(200)` |
| ② 业务层 | 业务码 `code` | `pm.expect(json.code).to.eql(200)` |
| ③ 消息层 | 提示语 `message` | `pm.expect(json.message).to.eql("操作成功")` |
| ④ 数据层 | 字段存在性、类型、取值 | `pm.expect(json.data.token).to.be.a("string")` |
| ⑤ 性能层 | 响应时间 | `pm.expect(pm.response.responseTime).to.be.below(500)` |

**数据层断言示例**（不止断言字段存在，还验证**数据正确性**）：

```javascript
// 按品牌过滤：验证过滤条件真的生效，而不只是"请求成功"
pm.test("过滤结果均属于指定品牌 brandId=1", function () {
    if (json.data.list.length > 0) {
        json.data.list.forEach(function (p) {
            pm.expect(p.brandId, "商品品牌应等于 1").to.eql(1);
        });
    }
});
```

```javascript
// 密码错误：不止断言返回失败，还验证"绝不下发 token"
pm.test("响应体中不应包含 token", function () {
    pm.expect(pm.response.text()).to.not.include("tokenHead");
});
```

### 4.4 安全类断言

```javascript
// SQL 注入：验证 payload 未生效，且无数据库错误信息泄露
pm.test("注入payload未绕过认证", function () {
    pm.expect(json.code).to.not.eql(200);
});
pm.test("响应体不含数据库错误信息", function () {
    const body = pm.response.text().toLowerCase();
    pm.expect(body).to.not.include("sql");
    pm.expect(body).to.not.include("mysql");
});
```

---

## 五、接口测试的重要发现：两类错误响应体的差异 ⭐

这是本次接口测试最有价值的产出之一。**同样是「请求出错」，服务端却返回两种完全不同的响应体**：

### 类型一：`CommonResult` 包裹的业务错误（设计内）

由 `GlobalExceptionHandler` 处理，HTTP 200 + 规范的 `{code, message, data}` 结构。

| 触发场景 | 异常类型 | HTTP | code | 响应体 |
|---|---|---|---|---|
| `@Validated` 参数校验失败 | `MethodArgumentNotValidException` | 200 | 404 | `{"code":404,"message":"name不能为空"}` |
| 业务逻辑失败 | `ApiException` | 200 | 500 | `{"code":500,"message":"密码不正确"}` |
| 数据库语法错误 | `SQLSyntaxErrorException` | 200 | 500 | `{"code":500,"message":"You have an error in your SQL syntax..."}` ⚠️ |

### 类型二：未被处理的框架异常（设计外 + 被掩盖）

`GlobalExceptionHandler` **未覆盖**以下异常，它们由 Spring 的 `DefaultHandlerExceptionResolver` 兜底 → HTTP 400 → 请求被 **ERROR 二次分发到 `/error`** → 而 `/error` 不在安全白名单中 → 被 `RestAuthenticationEntryPoint` 拦截并写出 401 响应体，**覆盖了原始错误**：

| 触发场景 | 未处理的异常 | HTTP | 实际响应体 |
|---|---|---|---|
| 参数类型错误（`pageSize=abc`） | `MethodArgumentTypeMismatchException` | 400 | `{"code":401,"message":"暂未登录或token已经过期",...}` ❌ |
| 缺少必填参数（`?ids` 缺失） | `MissingServletRequestParameterException` | 400 | 同上 ❌ |
| 请求体格式错误 | `HttpMessageNotReadableException` | 400 | 同上 ❌ |

**验证方法**（两条命令即可复现）：

```bash
# 1) 先拿一个合法的 admin token
TOKEN=$(curl -s -X POST http://localhost:8080/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"macro123"}' | jq -r .data.token)

# 2) 带合法 token 发一个类型错误的请求
curl -s "http://localhost:8080/product/list?pageSize=abc" -H "Authorization: Bearer $TOKEN"
```

**实际返回**：HTTP 400，但 body 是 `{"code":401,"message":"暂未登录或token已经过期"}`。

**矛盾点**：请求**带了合法 token**，却被回复「未登录」；HTTP 状态码是 400（参数错误），body 却说 401（鉴权失败）—— **状态码与响应体自相矛盾**。

**影响**：
1. 前端收到 401 会跳转登录页，用户明明已登录却被踢出；
2. 监控系统按 `code` 统计，会把「参数错误」错误地计入「鉴权失败告警」；
3. 真实异常（参数类型不匹配）只存在于服务端日志，客户端排障无据可依。

**修复建议**：
- 在 `GlobalExceptionHandler` 补充处理 `MethodArgumentTypeMismatchException`、`MissingServletRequestParameterException`、`HttpMessageNotReadableException`，统一返回 `CommonResult.validateFailed(...)`；
- 在 `secure.ignored.urls` 中加入 `/error`，避免 ERROR 二次分发被安全链拦截。

---

## 六、执行结果

| 指标 | 数值 |
|---|---|
| Postman 请求数 | **40** |
| 覆盖接口 | 18 个不同接口 |
| 关联用例 | 1 组（token 自动传递，串联 20+ 个鉴权请求） |
| 断言总数 | 约 130 条 |
| 独立发现的缺陷 | **4 个** |

**与功能测试的对应关系**：功能测试的 60 条用例与 Postman 的 40 个请求是同一批测试的两种载体 —— 功能测试文档侧重**用例设计思路与缺陷分析**，Postman 集合侧重**可执行、可复用的自动化资产**。

### 核心接口测试结论

| 模块 | 结论 |
|---|---|
| 登录接口 | ✅ 正向正常；❌ 存在用户名枚举风险（404 vs 500 可区分） |
| 鉴权机制 | ✅ JWT 验签有效，无 token/伪造 token 均被拦截；✅ 模块间密钥隔离 |
| 商品接口 | ✅ 查询功能正常；❌ 创建接口零参数校验，空入参穿透到 SQL 层 |
| 订单接口 | ✅ 查询功能正常；❌ 空数组触发 SQL 语法错误并泄露给客户端 |
| 品牌/分类接口 | ✅ 参数校验完备，`@NotEmpty`/`@Min`/`@FlagValidator` 全部生效 |
| 异常处理 | ❌ 框架级异常被 `/error` 分发掩盖为 401，状态码与响应体矛盾 |

---

## 七、Postman 使用说明

> **完整的图文操作步骤、结果解读与排错清单见 [Postman 使用说明](postman-guide.html)**。以下是精简版。

### 导入

1. Postman → `Import` → 选择 `postman/mall-admin.postman_collection.json`
2. 再导入 `postman/mall-local.postman_environment.json`
3. 右上角环境切换到 **mall-local**

### 执行

**方式一：手工按序执行**
先执行 `00 登录与鉴权 → L-01 登录成功`（此时 token 自动写入环境变量），再执行其他任意请求。

**方式二：Collection Runner 一键执行**
1. 选中集合 → `Run`
2. 按默认顺序执行（集合已按依赖顺序排列文件夹）
3. 查看通过率与断言明细

**方式三：Newman 命令行（可集成 CI）**
```bash
npm install -g newman
newman run "mall-admin.postman_collection.json" \
  -e "mall-local.postman_environment.json" \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export report.html
```

### 预期执行结果

**一键跑完的结果：通过约 30 条，失败约 10 条（共 40 条）。**

| 类别 | 用例 | 预期 |
|---|---|---|
| 正向用例 | L-01、A-04、P-01/P-02、O-01/O-04/O-07、B-01、C-01、D-01/D-04 | ✅ 全部通过 |
| 负向用例（服务端返回规范的 `CommonResult`） | L-02、L-03、L-04、L-06、L-08、A-01、A-02、B-03、B-05、B-06、C-03、P-03、P-05、P-12、O-05、O-08 | ✅ 全部通过 |
| **缺陷标记用例** | **P-07、P-15、P-16、O-09、O-10、O-11、O-12、O-14、C-05、D-03** | ❌ **预期失败** |

**那 10 条失败是设计好的，不是集合有 bug。** 这些用例的断言写的是**「接口本该有的正确行为」**，而不是「接口现在的行为」—— 它们失败，恰恰就是在证明缺陷存在。**这 10 条红色就是缺陷证据本身。**

每条缺陷用例的 `description` 和 `console.log` 中都标注了对应的缺陷编号与根因，在 Runner 结果页点开失败请求 → `Test Results` 标签即可看到是哪条断言失败、失败消息是什么。

**已实测验证过的内容断言**（确保不会误报）：

| 断言 | 实测值 | 结果 |
|---|---|---|
| P-08 `keyword=手机` 结果是否都含"手机" | 4 条商品，名称均含"手机" | ✅ |
| P-05 `pageNum=99999` 是否空列表且 total>0 | 列表 0 条，total=20 | ✅ |
| P-01 默认分页 pageNum/pageSize | 1 / 5，total=20，totalPage=4 | ✅ |
| A-04 `/admin/info` 是否返回 menus | username=admin，menus 24 项 | ✅ |
| O-04 `status=1` 订单状态是否一致 | 返回 5 条，status 均为 1 | ✅ |
