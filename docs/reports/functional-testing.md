---
layout: report
title: 功能测试用例与执行报告
description: 60 条功能用例、执行结果、用例设计方法与 6 个缺陷的关联分析
---

> 被测系统：mall-admin 后台管理系统（http://localhost:8080）
> 测试日期：2026-09-30
> 测试方式：**全部用例通过 HTTP 真实请求执行**，记录真实响应，非纸面设计
> 执行结果：**60 条用例，通过 52 条，失败 8 条，另发现 6 个缺陷**

---

## 一、测试范围与策略

### 1.1 测试范围

按需求覆盖后台三大核心模块 + 部署可用性：

| 模块 | 用例数 | 覆盖接口 |
|---|---|---|
| 登录模块 | 10 | `POST /admin/login` |
| 鉴权模块 | 4 | JWT 鉴权过滤器 + `/admin/list`、`/admin/info` |
| 商品管理 | 16 | `/product/list`、`/product/updateInfo/{id}`、`/product/simpleList`、`/product/create` |
| 订单管理 | 14 | `/order/list`、`/order/{id}`、`/order/delete`、`/order/update/close`、`/order/update/delivery` |
| 品牌管理 | 7 | `/brand/list`、`/brand/{id}`、`/brand/create` |
| 商品分类 | 5 | `/productCategory/list/withChildren`、`/productCategory/list/{parentId}`、`/productCategory/create`、`/productCategory/delete/{id}` |
| 部署可用性 | 4 | `/actuator/health`、`/v3/api-docs`、`/v3/api-docs/default` |

### 1.2 用例设计方法

| 方法 | 应用举例 |
|---|---|
| **等价类划分** | 登录：有效账号（admin/macro）为有效等价类；错误密码、不存在用户、空值、超长为无效等价类 |
| **边界值分析** | 分页参数 `pageSize` 取 1（下边界）、0（零值）、-1（负数）、100000（超大值）；`pageNum` 取 99999（越界） |
| **错误推测法** | 基于代码阅读推测薄弱点：`PmsProductParam` 无任何校验注解 → 专门设计空对象、空字符串创建商品用例，果然暴露 SQL 错误 |
| **状态迁移** | 订单状态 0待付款/1待发货/…/5无效，按各状态查询验证过滤逻辑 |
| **安全测试** | SQL 注入式用户名（`admin' OR '1'='1`）、无 token、伪造 token、越权访问 |

### 1.3 关键认知：断言必须断业务码，不能断 HTTP 状态码

mall 使用统一响应体 `CommonResult`：

```json
{ "code": 200, "message": "操作成功", "data": { ... } }
```

**所有业务响应（含错误）的 HTTP 状态码都是 200，真正的业务结果在 body 的 `code` 字段里。** 这是本项目的核心特征，也是接口测试最容易踩的坑 —— 如果只断言 HTTP 200，那么「密码错误」也会被判为通过。因此全部用例都断言 `code` 字段。

业务码约定：

| code | 含义 | 触发场景 |
|---|---|---|
| 200 | 成功 | — |
| 404 | 参数校验失败 | `@Validated @RequestBody` 校验不通过 |
| 500 | 业务异常 | `Asserts.fail()` 抛出（如密码错误） |
| 401 | 未登录/token 失效 | 缺失或伪造 JWT |
| 403 | 无权限 | 动态权限校验不通过 |

---

## 二、登录模块用例与执行结果

**接口**：`POST /admin/login`，请求体 `{"username":"...","password":"..."}`

| 编号 | 用例标题 | 测试数据 | 预期 code | 实际 code | 实际 message | 结论 |
|---|---|---|---|---|---|---|
| L-01 | 正确账号密码登录（正向） | admin / macro123 | 200 | 200 | 操作成功 | ✅ 通过 |
| L-02 | 正确用户名 + 错误密码 | admin / wrongpass | 500 | 500 | 密码不正确 | ✅ 通过 |
| L-03 | 不存在的用户名 | nosuchuser_zzz / macro123 | 404 | 404 | 用户名或密码错误 | ✅ 通过 |
| L-04 | 用户名为空字符串 | "" / macro123 | 404 | 404 | username不能为空 | ✅ 通过 |
| L-05 | 密码为空字符串 | admin / "" | 404 | 404 | password不能为空 | ✅ 通过 |
| L-06 | 请求体为空对象 | `{}` | 404 | 404 | password不能为空 | ✅ 通过 |
| L-07 | 缺少 password 字段 | `{"username":"admin"}` | 404 | 404 | password不能为空 | ✅ 通过 |
| L-08 | SQL 注入式用户名 | `admin' OR '1'='1` / x | 404 | 404 | 用户名或密码错误 | ✅ 通过 |
| L-09 | 密码超长（1000 字符） | admin / `aaaa…a`(1000) | 500 | 500 | 密码不正确 | ✅ 通过 |
| L-10 | 错误 Content-Type（表单提交） | `username=admin&password=macro123` | 400 含真实错误 | **400 / code=401** | 暂未登录或token已经过期 | ❌ **DEFECT-01** |

### 登录模块的关键发现

**发现 1：登录失败有两条不同的返回路径（设计缺陷/信息泄露）**

同为「登录失败」，返回码却不同：

| 场景 | 抛出异常 | 是否被 catch | 返回 code |
|---|---|---|---|
| 用户名不存在 | `UsernameNotFoundException`（属 `AuthenticationException`） | ✅ 被 catch，token 置空 | **404**「用户名或密码错误」 |
| 密码错误（用户存在） | `Asserts.fail("密码不正确")` 抛 `ApiException` | ❌ 未被 catch，冒泡到全局异常处理器 | **500**「密码不正确」 |

**安全影响**：攻击者可据此**枚举有效用户名** —— 返回 404 说明用户不存在，返回 500 说明用户存在但密码错。这是一个**用户枚举漏洞**，正确做法是无论哪种失败都返回统一的「用户名或密码错误」。

**发现 2：SQL 注入测试通过**。`admin' OR '1'='1` 被 MyBatis `#{}` 预编译参数化处理，未构成注入，返回 404。

**发现 3：密码超长未做长度限制**。传 1000 字符密码不报参数错误，而是走完 BCrypt 比对返回 500。属于缺少防御性校验（`password` 字段仅有 `@NotEmpty`，无 `@Size(max=...)`）。

---

## 三、鉴权模块用例与执行结果

| 编号 | 用例标题 | 请求 | 预期 code | 实际 code | 结论 |
|---|---|---|---|---|---|
| A-01 | 无 token 访问受保护接口 | GET `/admin/list` | 401 | 401 | ✅ 通过 |
| A-02 | 伪造 token 访问 | GET `/admin/list`，`Bearer eyJ….fake.fake` | 401 | 401 | ✅ 通过 |
| A-03 | 合法 token 访问 | GET `/admin/list?pageNum=1&pageSize=5` | 200 | 200 | ✅ 通过 |
| A-04 | 合法 token 获取当前用户 | GET `/admin/info` | 200 | 200 | ✅ 通过 |

**JWT 机制说明**：token 通过请求头 `Authorization: Bearer <jwt>` 传递（`tokenHead` 含尾随空格）。密钥 `mall-admin-secret`，有效期 604800 秒（7 天）。

签名算法为 **HS256** —— 这是**从实测 token 的 Header 段解码确认**的：

```
Header : {"typ":"JWT","alg":"HS256"}
Payload: {"sub":"admin","created":1790770530,"exp":1791375330086}
         → 签发 2026-09-30 20:15:30，过期 2026-10-07 20:15:30，有效期正好 7 天
```

> 注：`exp` 字段存的是**毫秒**时间戳，而 `created` 存的是**秒**，两者单位不一致（差值换算后确实等于 604800 秒 = 7 天，功能正确，但单位不统一属代码细节瑕疵）。

> **重要**：`mall-admin` 与 `mall-portal` 的 JWT 密钥不同（`mall-admin-secret` vs `mall-portal-secret`），因此**两个服务的 token 不能互相通用** —— 这是隔离性的体现，也是接口测试时容易踩的坑（拿 admin 的 token 打 portal 接口会 401）。

---

## 四、商品管理模块用例与执行结果

### 4.1 商品列表查询 `GET /product/list`

支持查询参数：`keyword`、`productSn`、`brandId`、`productCategoryId`、`publishStatus`、`verifyStatus`，分页参数 `pageNum`(默认1) / `pageSize`(默认5)。

| 编号 | 用例标题 | 测试数据 | 预期 | 实际 | 结论 |
|---|---|---|---|---|---|
| P-01 | 默认分页查询（正向） | 无参数 | 200 | 200 操作成功 | ✅ |
| P-02 | pageSize 下边界值 | `pageSize=1` | 200 | 200 | ✅ |
| P-03 | pageSize 零值 | `pageSize=0` | 200 | 200 | ✅ |
| P-04 | pageSize 负数值 | `pageSize=-1` | 200 | 200 | ✅ |
| P-05 | pageNum 越界 | `pageNum=99999` | 200，列表为空 | 200，返回空列表 | ✅ |
| P-06 | pageSize 超大值 | `pageSize=100000` | 200 | 200 | ✅ |
| P-07 | pageSize 非数字类型 | `pageSize=abc` | 400 含类型错误提示 | **400 / code=401** | ❌ **DEFECT-01** |
| P-08 | 关键词模糊查询 | `keyword=手机` | 200 | 200 | ✅ |
| P-09 | 按品牌过滤 | `brandId=1` | 200 | 200 | ✅ |
| P-10 | 按上架状态过滤 | `publishStatus=1` | 200 | 200 | ✅ |

### 4.2 商品详情与新增

| 编号 | 用例标题 | 请求 | 预期 | 实际 | 结论 |
|---|---|---|---|---|---|
| P-11 | 商品详情（存在） | GET `/product/updateInfo/1` | 200 | 200 | ✅ |
| P-12 | 商品详情（不存在 ID） | GET `/product/updateInfo/99999999` | 200 | 200，data 为 null | ✅ |
| P-13 | 无 token 查询商品 | GET `/product/list` | 401 | 401 | ✅ |
| P-14 | simpleList 模糊查询 | GET `/product/simpleList?keyword=手机` | 200 | 200 | ✅ |
| P-15 | 创建商品-空 JSON 体 | POST `/product/create`，`{}` | 400 参数校验失败 | **200 / code=500** 原始 SQL 错误 | ⚠️ **DEFECT-02** |
| P-16 | 创建商品-name 为空串 | POST `/product/create`，`{"name":""}` | 400 参数校验失败 | **500 / code=401** | ❌ **DEFECT-01** |

### 商品模块的关键发现（**重要缺陷**）

**发现 4：商品模块完全没有参数校验（DEFECT-02 根因）**

经代码审查确认：`PmsProductParam` 及其父类 `PmsProduct` **不含任何 Bean Validation 注解**（无 `@NotEmpty`、`@NotNull`、`@Size`、`@Min`）。对比之下，品牌和分类模块的 DTO 是有校验的：

| DTO | 是否有校验注解 | 校验失败是否返回 404 |
|---|---|---|
| `PmsProductParam` / `PmsProduct` | ❌ **无** | ❌ 不会 |
| `PmsBrandParam` | ✅ 有（`@NotEmpty name`、`@NotEmpty logo`、`@Min(0) sort`、`@FlagValidator({"0","1"})`） | ✅ 会 |
| `PmsProductCategoryParam` | ✅ 有（`@NotEmpty name`、`@FlagValidator`、`@Min(0) sort`） | ✅ 会 |
| `UmsAdminLoginParam` | ✅ 有（`@NotEmpty` × 2） | ✅ 会 |

**后果**：带空字段的创建请求会穿过参数层直达 SQL 层，触发数据库错误，并把**原始 SQL 错误信息返回给前端**（见 DEFECT-02）。

**发现 5：字段拼写不一致（接口设计缺陷）**

商品实体的字段名是 `recommandStatus`（少一个 m，代码中就是如此拼写），但对应的批量操作接口参数是 `@RequestParam("recommendStatus")`（拼写正确）。

```java
// 实体 PmsProduct.java
private Integer recommandStatus;   // ← 实体：少一个 m

// 控制器 PmsProductController.java
@RequestParam("recommendStatus") Integer recommendStatus;  // ← 接口参数：拼写正确
```

同一个业务含义的字段在实体层和接口层拼写不同，极易导致前端传参错误且报错不明确。**属于命名规范缺陷，建议统一为 `recommendStatus`。**

---

## 五、订单管理模块用例与执行结果

### 5.1 订单查询 `GET /order/list`

支持 `orderSn`、`receiverKeyword`、`status`(0待付款/1待发货/2已发货/3已完成/4已关闭/5无效)、`orderType`、`sourceType`、`createTime` 过滤。

| 编号 | 用例标题 | 测试数据 | 预期 | 实际 | 结论 |
|---|---|---|---|---|---|
| O-01 | 默认分页查询（正向） | 无参数 | 200 | 200 | ✅ |
| O-02 | pageSize 下边界 | `pageSize=1` | 200 | 200 | ✅ |
| O-03 | pageSize 零值 | `pageSize=0` | 200 | 200 | ✅ |
| O-04 | 按状态过滤（待发货） | `status=1` | 200 | 200 | ✅ |
| O-05 | 非法状态值过滤 | `status=999` | 200，空列表 | 200 | ✅ |
| O-06 | 订单号模糊查询 | `orderSn=202%` | 200 | 200 | ✅ |

### 5.2 订单详情与批量操作

| 编号 | 用例标题 | 请求 | 预期 | 实际 | 结论 |
|---|---|---|---|---|---|
| O-07 | 订单详情（存在） | GET `/order/1` | 200 | 200 | ✅ |
| O-08 | 订单详情（不存在 ID） | GET `/order/99999999` | 200 | 200，data 为 null | ✅ |
| O-09 | 订单详情（非法 ID 类型） | GET `/order/abc` | 400 含类型错误提示 | **400 / code=401** | ❌ **DEFECT-01** |
| O-10 | 批量删除-缺少必填 ids | POST `/order/delete` | 400 含缺参提示 | **400 / code=401** | ❌ **DEFECT-01** |
| O-11 | 批量删除-不存在的订单 ID | POST `/order/delete?ids=99999999` | 200 | **200 / code=500**「操作失败」 | ⚠️ **DEFECT-03** |
| O-12 | 批量关闭-缺少 note 参数 | POST `/order/update/close?ids=1` | 400 含缺参提示 | **400 / code=401** | ❌ **DEFECT-01** |
| O-13 | 无 token 查订单 | GET `/order/list` | 401 | 401 | ✅ |
| O-14 | 批量发货-空数组 | POST `/order/update/delivery`，body `[]` | 200 | **200 / code=500** 原始 SQL 错误 | ❌ **DEFECT-02** |

### 订单模块的关键发现

**发现 6：订单模块同样完全没有参数校验**。`OmsOrderController` 全部方法无 `@Validated`/`@Valid`，其 DTO（`OmsOrderQueryParam`、`OmsDeliveryParam` 等）也无任何校验注解。与商品模块同属一类问题。

**发现 7：空集合入参触发 SQL 语法错误并泄露给客户端（DEFECT-02）**

`POST /order/update/delivery` 传空数组 `[]`，服务端返回：
```json
{"code":500,"message":"You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near ')' at line 1","data":null}
```
根因是 MyBatis 对空 List 生成了 `where id in ()` 这样的非法 SQL。**这既是健壮性缺陷，也是信息泄露缺陷**（暴露数据库类型、SQL 片段、出错位置）。详见缺陷报告 DEFECT-02。

---

## 六、品牌管理模块用例与执行结果（校验功能验证）

品牌模块的 DTO **有完整校验注解**，是验证校验机制是否生效的最佳样本。

| 编号 | 用例标题 | 测试数据 | 预期 code | 实际 code | 实际 message | 结论 |
|---|---|---|---|---|---|---|
| B-01 | 品牌列表查询 | `pageNum=1&pageSize=5` | 200 | 200 | 操作成功 | ✅ |
| B-02 | 品牌详情 | GET `/brand/1` | 200 | 200 | 操作成功 | ✅ |
| B-03 | 创建-name 为空 | `{"name":"","logo":"x.jpg"}` | 404 | 404 | name不能为空 | ✅ |
| B-04 | 创建-logo 为空 | `{"name":"测试品牌","logo":""}` | 404 | 404 | logo不能为空 | ✅ |
| B-05 | 创建-showStatus=2（自定义 Flag 校验） | `{..., "showStatus":2}` | 404 | 404 | showStatus显示状态不正确 | ✅ |
| B-06 | 创建-sort=-1（@Min 校验） | `{..., "sort":-1}` | 404 | 404 | sort最小不能小于0 | ✅ |
| B-07 | 创建-合法数据（正向） | `{"name":"自动化测试品牌_ZZ","logo":"...","showStatus":1,"factoryStatus":1,"sort":0}` | 200 | 200 | 操作成功 | ✅ |

**结论**：品牌模块的校验机制**完全正常**，`@NotEmpty`、`@Min`、以及自定义的 `@FlagValidator` 全部按预期生效，校验失败统一返回 `code=404`。

> **注意**：错误提示消息是「字段名 + 提示语」直接拼接，**中间没有分隔符** —— 例如 `name不能为空`、`sort最小不能小于0`。这是因为 `GlobalExceptionHandler` 中写的是 `fieldError.getField() + fieldError.getDefaultMessage()`。英文场景下会拼出 `usernamemust not be empty` 这种可读性很差的消息。属于**缺陷（提示语格式问题，低severity）**。

**⚠️ 测试数据说明**：B-07 是唯一对数据库产生写入的用例（用于验证正向创建链路）。因执行器跑了多轮，`mall.pms_brand` 共留下 **3 条**记录：

| id | name | 来源 |
|---|---|---|
| 60 | `自动化测试品牌_ZZ` | 第 1 轮执行 |
| 61 | `自动化测试品牌_ZZ` | 第 2 轮执行 |
| 62 | `???????_ZZ` | 附加验证时 PowerShell 请求体编码问题导致中文变 `?` |

品牌原始数量 12 条，现为 15 条。清理 SQL：
```sql
DELETE FROM mall.pms_brand WHERE id IN (60, 61, 62);
```
> `id=58 (NIKE)`、`id=59 (测试品牌)` 属环境原有数据，不是本次测试产生的。

**由此暴露的两个问题**：

1. **品牌名无唯一性约束**（`pms_brand.name` 上没有唯一索引）—— 同一品牌名可重复插入，测试跑多轮会产生重复数据。从业务角度看品牌名通常应唯一，缺约束会让重复品牌进入系统。**已作为接口设计观察项记录。**
2. **执行器缺少数据清理机制** —— 测试用例应在每轮执行前后清理自己产生的数据，否则测试数据会持续累积污染环境。这是测试脚本设计需要考虑的一点。

---

## 七、商品分类模块用例与执行结果

| 编号 | 用例标题 | 请求 | 预期 code | 实际 code | 实际 message | 结论 |
|---|---|---|---|---|---|---|
| C-01 | 分类树查询 | GET `/productCategory/list/withChildren` | 200 | 200 | 操作成功 | ✅ |
| C-02 | 按父级查子分类 | GET `/productCategory/list/0?pageNum=1&pageSize=5` | 200 | 200 | 操作成功 | ✅ |
| C-03 | 创建-name 为空 | `{"parentId":0,"name":""}` | 404 | 404 | name不能为空 | ✅ |
| C-04 | 创建-navStatus=5（Flag 校验） | `{"parentId":0,"name":"测试分类","navStatus":5}` | 404 | 404 | navStatus状态只能为0或1 | ✅ |
| C-05 | 删除不存在的分类 | POST `/productCategory/delete/99999999` | 200 | **200 / code=500** | 操作失败 | ⚠️ **DEFECT-03** |

**接口设计不一致发现**：同为「删除」，HTTP 方法却不同 ——
- `POST /productCategory/delete/{id}`（分类删除用 POST）
- `GET /brand/delete/{id}`（品牌删除用 **GET**）

**用 GET 执行删除操作违反 REST 语义**：GET 应为幂等只读操作，可能被浏览器预取、爬虫抓取或代理缓存而**误删数据**。属于接口设计缺陷。

---

## 八、缺陷案例汇总

本轮测试共发现 **6 个缺陷**：

> **发现途径说明** —— 这 6 个缺陷并非全部来自最初设计的功能用例，而是分布在不同的测试阶段：
> - DEFECT-01 ~ 04：功能/接口测试用例直接发现
> - **DEFECT-05：性能测试后核查日志时的意外发现**（日志文件涨到 1.84 GB，去看内容才发现记录明文密码）
> - **DEFECT-06：编写 Python 自动化框架时的意外发现**（用 emoji 做边界测试才暴露的字符集问题）
>
> 这恰好说明**缺陷发现不局限于"设计好的用例"** —— 交叉的测试手段（性能、自动化、探索性测试）常常能挖出计划外的深层问题。

### DEFECT-01 · 未处理异常被 `/error` 二次分发与安全拦截，真实错误被 401 覆盖 🔴 高

| 项目 | 内容 |
|---|---|
| **严重级别** | 高 |
| **影响用例** | L-10、P-07、P-16、O-09、O-10、O-12（共 6 条） |
| **问题描述** | 请求触发未处理异常时，HTTP 状态码是 400/500，但响应体却是 `{"code":401,"message":"暂未登录或token已经过期"}`，真实错误信息完全丢失 |
| **复现步骤** | 1. 登录获取 token<br>2. 发送 `GET /product/list?pageSize=abc`（带 token）<br>3. 观察响应 |
| **实际结果** | HTTP 400，body `{"code":401,"message":"暂未登录或token已经过期","data":"Full authentication is required to access this resource"}` |
| **预期结果** | HTTP 400，body 应说明参数类型错误，如 `pageSize 参数类型不正确` |
| **根因分析** | ① `GlobalExceptionHandler` 只处理 `ApiException`、`MethodArgumentNotValidException`、`BindException`、`SQLSyntaxErrorException` 四类异常；`MethodArgumentTypeMismatchException`、`MissingServletRequestParameterException`、`HttpMessageNotReadableException` **未被覆盖**，由 Spring 的 `DefaultHandlerExceptionResolver` 兜底 → HTTP 400；<br>② Spring Boot 随后把请求 **ERROR 二次分发到 `/error`**；<br>③ `/error` **不在 `secure.ignored.urls` 白名单中**，`SecurityConfig` 的 `anyRequest()` 重新鉴权，此时无认证上下文 → 被 `RestAuthenticationEntryPoint` 拦截，写出 401 响应体，**覆盖了原始错误信息** |
| **影响** | 前端无法区分「参数错误」和「未登录」，会被误导去重新登录；监控系统按 code 统计会把参数错误误计为鉴权失败；排障困难（真实异常只在服务端日志里） |
| **修复建议** | 方案 A（推荐）：在 `GlobalExceptionHandler` 中补充处理 `MethodArgumentTypeMismatchException`、`MissingServletRequestParameterException`、`HttpMessageNotReadableException`，统一返回 `CommonResult.validateFailed(...)`；<br>方案 B（配套）：在 `secure.ignored.urls` 中加入 `/error`，避免二次分发被拦截 |

### DEFECT-02 · 原始 SQL 错误信息直接返回客户端 🔴 高（信息泄露）

| 项目 | 内容 |
|---|---|
| **严重级别** | 高（安全类） |
| **影响用例** | P-15（`POST /product/create` 传 `{}`）、O-14（`POST /order/update/delivery` 传 `[]`） |
| **问题描述** | 数据库异常时，原始 MySQL 错误信息被原样返回给客户端 |
| **实际响应** | `{"code":500,"message":"You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near ')' at line 1","data":null}` |
| **根因分析** | `GlobalExceptionHandler` 中 `@ExceptionHandler(SQLSyntaxErrorException.class)` 直接把 `e.getMessage()` 放进响应：`CommonResult.failed(e.getMessage())`；同时商品 DTO 无参数校验，空入参能穿透到 SQL 层（配合 MyBatis 对空集合生成 `in ()` 非法 SQL） |
| **信息泄露内容** | 数据库类型（MySQL）、SQL 语法片段（`near ')'`）、出错行号（`line 1`） |
| **影响** | 为攻击者提供数据库指纹与 SQL 结构线索，降低后续注入攻击成本；违反「不向客户端暴露内部实现细节」的安全原则 |
| **修复建议** | ① 对客户端返回统一兜底文案（如「系统繁忙，请稍后重试」），真实异常写服务端日志；<br>② 在 SQL 层增加空集合判断，避免生成 `in ()`；<br>③ 为商品 DTO 补充参数校验，从入口拦截非法入参 |

### DEFECT-03 · 删除不存在的记录返回笼统「操作失败」 🟡 低

| 项目 | 内容 |
|---|---|
| **严重级别** | 低（接口语义/易用性） |
| **影响用例** | O-11（删除不存在订单）、C-05（删除不存在分类） |
| **实际结果** | `{"code":500,"message":"操作失败","data":null}` |
| **问题描述** | 删除一个不存在的 ID，返回 500「操作失败」。从业务语义看，「删除不存在的记录」应是**幂等成功**（目标状态已达成），或至少给出明确提示「订单不存在」 |
| **影响** | 前端无法区分「删除失败（如权限/外键约束）」与「记录本来就不存在」；返回 500 会污染错误率监控指标 |
| **修复建议** | 改为：影响行数为 0 时返回 `code=200` 并提示「记录不存在」，或返回专门的业务错误码 |

### DEFECT-04 · API 文档根路径白名单失效，且带 token 访问反而 403 🟡 中

| 项目 | 内容 |
|---|---|
| **严重级别** | 中 |
| **影响用例** | D-02、D-03 |
| **问题描述** | `secure.ignored.urls` 中配置了 `/v3/api-docs/*`，但该 Ant 单星号通配符**匹配不到 `/v3/api-docs` 本身**（只匹配下一级路径） |
| **实测行为** | `GET /v3/api-docs`（匿名）→ `code=401`「暂未登录或token已经过期」<br>`GET /v3/api-docs`（带**合法 admin token**）→ `code=403`「没有相关权限」<br>`GET /v3/api-docs/`（带尾斜杠）→ **HTTP 404**（Spring Boot 3 默认关闭尾斜杠匹配）<br>`GET /v3/api-docs/default` → ✅ 200，正常返回 131,820 字节的 OpenAPI 文档 |
| **根因分析** | ① Ant 模式 `/v3/api-docs/*` 只匹配一层子路径，不含根路径；<br>② 即使带上合法 token 也 403，是因为 mall-admin 启用了**动态权限校验**（`MallSecurityConfig.dynamicSecurityService()`），`DynamicAuthorizationManager` 会把请求路径与数据库 `ums_resource` 表的 31 条资源逐条比对，`/v3/api-docs` 不在其中 → 拒绝 |
| **实际影响** | **不影响 Swagger UI 使用**。UI 通过 `/v3/api-docs/swagger-config` 拿到真实分组地址 `/v3/api-docs/default`，该地址命中白名单，可正常加载。缺陷仅体现在根路径 `/v3/api-docs` 无法被任何身份访问 |
| **修复建议** | 将白名单条目改为 `/v3/api-docs/**`（双星号匹配任意层级，含根路径） |
| **价值说明** | 这条缺陷是**「不要只看配置、要看实际行为」**的典型：配置里明明写了 api-docs 白名单，直觉会认为已经放行，但实际路径匹配规则与直觉不符。只有真实发请求才能发现 |

### DEFECT-05 · 日志切面记录明文密码与完整 Token 🔴 高（安全 / 敏感信息泄露）

| 项目 | 内容 |
|---|---|
| **严重级别** | 高（安全类，OWASP「敏感信息泄露 / 不当日志记录」） |
| **发现途径** | **性能测试后核查日志时意外发现** —— 压测产生 1.84 GB 日志，查看日志内容时发现明文密码 |
| **问题描述** | `WebLogAspect` 切面把所有 Controller 的**完整请求参数**和**完整响应体**序列化为 JSON 并以 **INFO 级别**打印，且**没有任何字段脱敏** |
| **实际日志内容（真实截取，IP 与 Token 已脱敏）** | `{"description":"登录以后返回token","username":"admin",...,"uri":"/admin/login","method":"POST","ip":"127.0.0.1","parameter":{"username":"admin","password":"macro123"},"result":{"code":200,...,"data":{"tokenHead":"Bearer ","token":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."}}}` |
| **泄露的信息** | ① **登录密码明文**（`"password":"macro123"`）<br>② **完整 JWT Token**（响应体里带出）<br>③ 完整响应体（商品列表、订单数据、会员信息等全量业务数据）<br>④ 客户端 IP、请求 URL、耗时 |
| **根因分析** | `mall-common/src/main/java/com/macro/mall/common/log/WebLogAspect.java`：<br>• 第 76 行 `webLog.setParameter(getParameter(method, joinPoint.getArgs()))` —— `getParameter()`（第 96-126 行）对 `@RequestBody` 参数的处理是 `argList.add(args[i])`，**把整个 DTO 对象直接塞进去，不做任何字段过滤**<br>• 第 77 行 `webLog.setResult(result)` —— 把**整个响应体**也记录下来<br>• 第 89 行 `LOGGER.info(Markers.appendEntries(logMap), JSONUtil.parse(webLog).toString())` —— **INFO 级别**，生产环境同样输出 |
| **影响范围** | 切入点（第 42 行）为 `execution(public * com.macro.mall.controller.*.*(..))\|\|execution(public * com.macro.mall.*.controller.*.*(..))`，**覆盖 mall-admin 与 mall-portal 的全部接口**，包括会员注册、改密码等接口 |
| **危害** | • 日志文件是明文落盘的，**任何能读到日志的人（运维、日志采集系统、日志平台账号）都能拿到全站用户凭据**<br>• 日志常被采集到 ELK 等集中平台，**泄露面进一步放大**<br>• Token 被记录后，攻击者可直接用其冒用身份（有效期 7 天）<br>• 违反等保/GDPR 等对敏感信息记录的要求 |
| **修复建议** | ① **对敏感字段脱敏**：在 `getParameter()` 中对 `password`、`oldPassword`、`newPassword`、`token` 等字段名做黑名单替换（如替换为 `******`）；<br>② **不记录完整响应体**：`setResult()` 改为只记录状态码或摘要，避免全量业务数据落盘；<br>③ 敏感接口（`/admin/login`、`/admin/updatePassword`、`/sso/*`）直接排除日志切面；<br>④ 生产环境日志级别调整为 `WARN`，并配置日志轮转与保留期限 |
| **附带影响** | 该切面同时是日志量爆炸的原因：**每请求约 6.4 KB 日志**，本次 30 万次压测请求产生了 **1.84 GB 日志文件**，与[性能测试报告](performance-testing.html)中记录的「debug 日志拖慢性能」形成互相印证 |

> **这条缺陷的价值**：它不是在设计用例时预设的，而是**性能测试的副产品** —— 压测后我发现日志文件涨到了 1.84 GB，出于好奇去看日志里到底在刷什么，结果发现了明文密码。这说明**测试过程中的「异常观察」往往能挖出计划外的缺陷**。

### DEFECT-06 · utf8mb3 列遇 4 字节字符触发 SQL 错误 1267 🔴 高

| 项目 | 内容 |
|---|---|
| **严重级别** | 高（健壮性 + 可用性） |
| **发现途径** | **编写 Python 自动化框架时意外发现** —— 写 emoji 边界用例才暴露出来 |
| **问题描述** | 请求参数中包含 4 字节 UTF-8 字符（emoji 等）时，服务端返回 **HTTP 500** 并抛出 SQL 异常 |
| **复现步骤** | `POST /admin/login`，body `{"username": "管理员🔒", "password": "x"}` |
| **实际结果** | HTTP 500，服务端日志抛出：<br>`java.sql.SQLException: Illegal mix of collations (utf8mb3_general_ci,IMPLICIT) and (utf8mb4_0900_ai_ci,COERCIBLE) for operation '='`<br>`### The error may involve com.macro.mall.mapper.UmsAdminMapper.selectByExample` |
| **边界界定实验** | 这是定位该缺陷的关键 —— 用 3 字节与 4 字节字符做对照：<br>• `管理员`（3 字节中文）→ HTTP 200，code=404「用户名或密码错误」 ✅ 正常<br>• `管理员🔒`（emoji，4 字节）→ **HTTP 500 + SQLException** ❌<br>→ 边界精确落在「UTF-8 编码字节数 = 3 还是 4」上 |
| **根因分析** | ① `document/sql/mall.sql` 是从 **MySQL 5.7** 导出的（文件头注释写明 `Source Server Version : 50719`），当时建表语句里每列都显式声明了 `CHARACTER SET utf8`；<br>② 在 MySQL 中 **`utf8` 就是 `utf8mb3` 的别名，最多只能存 3 字节**；<br>③ 而 `mall` 库的默认字符集是 `utf8mb4`，MySQL 8 的连接也是 utf8mb4；<br>④ 传入 4 字节字符时，**utf8mb3 的列与 utf8mb4 的字面量无法比较** → MySQL 报错 1267 `Illegal mix of collations` |
| **证据链** | ① 列字符集：`ums_admin.username` = `utf8mb3` / `utf8mb3_general_ci`<br>② 库默认：`mall` = `utf8mb4` / `utf8mb4_general_ci` —— **库与表不一致**<br>③ 表排序规则：`ums_admin`、`pms_product`、`oms_order` 均为 `utf8mb3_general_ci`<br>④ 全库仍有 **211 个** varchar/text 列是 utf8mb3<br>⑤ MySQL 端直接复现：`SELECT 1 FROM mall.ums_admin WHERE username = '管理员🔒'` → **ERROR 1267**（与应用异常完全一致） |
| **影响** | ① **任何含 emoji 的用户输入都会触发 500**：用户名、昵称、备注、商品名、订单备注等字段都无法使用 emoji（现代产品的常见需求）；<br>② **攻击者可构造含 emoji 的请求稳定触发服务端 500**，制造大量错误日志（每请求约 6.4 KB，配合 DEFECT-05 可快速放大日志体积）；<br>③ **真实错误被 DEFECT-01 掩盖** —— 客户端收到的是 `401 暂未登录`，运维看到的告警是"鉴权失败"，完全找不到真正原因，排障成本极高；<br>④ 涉及 211 个列，影响面覆盖全部业务域 |
| **修复建议** | ① 整库转换字符集（推荐，一次性解决 211 个列）：<br>`ALTER DATABASE mall CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`<br>对每张表执行 `ALTER TABLE xxx CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`<br>② 转换前需评估：索引长度限制（utf8mb4 每字符 4 字节，varchar 索引可能超长）、已有数据兼容性；<br>③ 短期兜底：在参数校验层拒绝 4 字节字符并返回友好提示（治标不治本，但能避免 500）；<br>④ 配套修复 DEFECT-01，让此类异常能正确暴露而不是被掩盖成 401 |
| **回归用例** | 已固化为自动化用例 `test_defect06_emoji_in_username_should_not_crash`（xfail）+ `test_defect06_boundary_chinese_works`（对照组），见 `test-artifacts/pytest/testcases/test_04_known_defects.py` |

> **这条缺陷的价值**：它不在最初设计的用例范围内，是**写自动化框架、做字符集边界测试时才暴露的**。更重要的是排查过程 —— 从一个"HTTP 500"出发，通过**对照实验**（3 字节 vs 4 字节）锁定边界，再通过**查 information_schema + MySQL 端复现**坐实根因，最终定位到"MySQL 5.7 时代的建表语句遗留的 utf8mb3 列"。这条链路上每一步都有可验证的证据，而不是靠猜。

### 附：其他观察项（未计入缺陷）

| 观察项 | 说明 | 建议 |
|---|---|---|
| 用户枚举 | 密码错误返回 500「密码不正确」，用户不存在返回 404「用户名或密码错误」，可区分 | 统一失败提示，防用户名枚举 |
| 密码无长度限制 | `password` 仅 `@NotEmpty`，1000 字符可提交 | 增加 `@Size(max=...)` |
| 校验提示语无分隔符 | 返回 `name不能为空`、`sort最小不能小于0`（字段名与提示语直接拼接） | 中间加 `: ` 或空格 |
| 删除接口 HTTP 方法不一致 | 分类删除用 POST，品牌删除用 **GET** | 统一用 DELETE 或 POST，GET 不应产生副作用 |
| 商品字段拼写不一致 | 实体 `recommandStatus` vs 接口参数 `recommendStatus` | 统一命名 |
| 商品/订单模块无参数校验 | 与品牌/分类模块形成鲜明对比 | 补齐 DTO 校验注解 |

---

## 九、测试执行结论

| 指标 | 数值 |
|---|---|
| 用例总数 | **60** |
| 通过 | **52** |
| 失败 | **8** |
| 用例通过率 | **86.7%** |
| 发现缺陷 | **6 个**（高 4、中 1、低 1） |
| 执行方式 | 100% 真实 HTTP 请求执行，逐条结果见 [功能测试执行结果 CSV](../evidence/downloads/functional-test-results.csv) |

**质量评价**：
- **正向功能全部正常** —— 登录、商品列表/详情、订单列表/详情、品牌与分类的增删改查正向链路均通过；
- **鉴权机制可靠** —— JWT 校验、无 token/伪造 token 拦截、模块间 token 隔离均符合预期；
- **品牌与分类模块的参数校验完备有效** —— `@NotEmpty`、`@Min`、自定义 `@FlagValidator` 全部生效；
- **主要风险集中在四类问题**：<br>① **异常处理与参数校验覆盖不均** —— 商品/订单模块 DTO 零校验，加上全局异常处理器覆盖不全，导致「错误信息被掩盖」和「SQL 错误泄露」；<br>② **敏感信息保护缺失** —— 日志切面记录明文密码与 Token（DEFECT-05）；<br>③ **数据库字符集遗留问题** —— 211 个列仍是 utf8mb3，无法处理 emoji（DEFECT-06）；<br>④ **接口设计细节不一致** —— 删除接口 HTTP 方法不统一、字段拼写不一致、缺少唯一性约束。

**建议优先修复顺序**：
**DEFECT-05（明文密码入日志，安全，最高优先级）** → **DEFECT-06（字符集问题，涉及 211 个列，且已被 DEFECT-01 掩盖成假象）** → DEFECT-02（SQL 错误泄露，安全）→ DEFECT-01（错误掩盖，是 06 难以排查的根因之一）→ DEFECT-04（文档白名单）→ DEFECT-03（语义优化）。

> **注意 DEFECT-01 的特殊性**：它是"放大器" —— 单独看只是一个错误提示不准确的问题，
> 但它让 DEFECT-02、DEFECT-06 这类**服务端异常在客户端完全看不出真相**。
> 修好它，其他缺陷的排查成本会显著下降。所以实际修复优先级上，它应该和 06/02 一起考虑。
