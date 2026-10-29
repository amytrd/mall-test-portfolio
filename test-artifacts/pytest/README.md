# mall 接口自动化测试框架（Python + pytest）

> 被测系统：mall-admin 后台管理系统（http://localhost:8080）
> 技术栈：Python 3.11 + pytest + requests + PyYAML
> 用例规模：**71 条**（62 通过 + 9 条已知缺陷回归）
> 执行耗时：约 3 秒

---

## 一、快速开始

```powershell
cd test-artifacts/pytest

# 1) 安装依赖（建议使用虚拟环境）
pip install -r requirements.txt

# 2) 跑全量用例（服务必须已启动）
pytest

# 3) 生成 HTML 报告
pytest --html=reports/report.html --self-contained-html
```

**预期输出**：`62 passed, 9 xfailed` —— 那 9 条 xfailed 是**已知缺陷回归用例**，是有意为之，详见第五节。

---

## 二、目录结构

```
api-test/
├── README.md                 ← 本文件（设计思路）
├── requirements.txt          ← 依赖清单（版本已固定）
├── pytest.ini                ← pytest 配置（用例发现、marker 注册）
├── config.py                 ← 【配置层】环境、账号、业务码常量
├── conftest.py               ← 【fixture 层】token 管理、客户端注入
├── data/
│   └── login_cases.yaml      ← 【数据层】登录接口测试数据
├── utils/
│   ├── logger.py             ← 日志（同时输出控制台与文件）
│   ├── http_client.py        ← 【工具层】HTTP 封装 + 断言助手
│   └── data_loader.py        ← 数据加载器
├── testcases/
│   ├── test_01_login.py      ← 登录模块（正向 + 数据驱动负向 + 边界 + 鉴权）
│   ├── test_02_product.py    ← 商品模块（分页边界 + 过滤生效性 + 详情）
│   ├── test_03_order.py      ← 订单模块（状态过滤 + 聚合详情 + 分页一致性）
│   └── test_04_known_defects.py  ← 已知缺陷回归（xfail）
├── reports/                  ← HTML 报告输出
└── logs/                     ← 执行日志
```

---

## 三、分层设计思路（核心）

```
      testcases/          用例层  —— 只写"要测什么"
          ↓ 使用
      utils/              工具层  —— 只写"怎么发、怎么判"
          ↓ 依赖
      config.py           配置层  —— 只写"环境是什么"
          ↑ 读取
      data/               数据层  —— 只写"用什么数据测"
```

**分层的价值在于「变更隔离」**：

| 变更类型 | 需要改哪一层 | 用例要不要改 |
|---|---|---|
| 换个测试环境 | `config.py` 一行 | ❌ 不用 |
| 加一个异常场景 | `data/*.yaml` 加一条 | ❌ 不用 |
| 登录接口改路径 | 用例里改一处 | ✅ 要改（但只改一处） |
| 服务端改了响应结构 | `http_client.py` 的断言助手 | ❌ 不用 |

如果不分层、所有东西写在一起，上面每一种变更都要翻遍所有用例 —— 这是接口自动化项目最后"维护不动、被废弃"的根本原因。

---

## 四、六个关键设计决策

### 4.1 断言业务码，而不是 HTTP 状态码 ⭐ 最重要

**这是针对本项目特性的核心决策。**

mall 使用统一响应体 `CommonResult`，**所有业务响应的 HTTP 状态码一律是 200**：

```json
{"code": 200, "message": "操作成功", "data": {...}}      // 成功
{"code": 500, "message": "密码不正确", "data": null}      // 密码错误
```

如果按常规写 `assert resp.status_code == 200`，那么「密码错误」「参数非法」这些**本该失败的场景全部会被判为通过** —— 接口测试彻底失效。

所以框架把断言集中封装成 `ApiResponse.assert_code()`，并在注释里写明这个坑：

```python
resp.assert_code(500, note="密码错误")     # ✅ 正确
resp.assert_success()                      # ✅ 等价于 assert_code(200)

assert resp.status_code == 200             # ❌ 会漏掉所有业务失败
```

**面试价值**：这一点能区分"会调接口"和"理解接口测试有效性"。很多人写接口测试就是断言 HTTP 200，测试报告全绿但一点问题都发现不了。

### 4.2 用 fixture 管理 token，session 级别复用

**问题**：几乎每个接口都要鉴权。若每个用例自己登录一次：
- 慢 —— 登录要走 BCrypt 校验（实测约 70ms），几百个用例纯浪费几十秒
- 脏 —— 每个用例都要重复写登录代码，真正要测的东西被淹没

**方案**：`conftest.py` 里把登录做成 `scope="session"` 的 fixture，整个测试会话只登录一次，所有用例共享。

```python
@pytest.fixture(scope="session")
def token(raw_api) -> str:
    resp = raw_api.post("/admin/login", json_body={...})
    resp.assert_success("登录失败，后续用例无法执行")   # 登录失败就早失败，别让 60 个用例全红
    return resp.data["token"]
```

**scope 怎么选**：token 有效期 7 天，一次会话内绝不会过期，所以 session 是安全且最优的。如果 token 短命（比如 5 分钟），就要用 `scope="function"` 加自动刷新 —— 这是 scope 选择的一般方法：**看这个资源在多大范围内稳定有效**。

### 4.3 数据驱动：把测试数据从代码里拿出来

反例（数据写死在用例里）：

```python
def test_login_wrong_password():
    resp = api.post("/admin/login", json_body={"username": "admin", "password": "wrong"})
    resp.assert_code(500)

def test_login_empty_username():
    resp = api.post("/admin/login", json_body={"username": "", "password": "macro123"})
    resp.assert_code(404)
```

这两个用例**逻辑完全一样**，只是数据不同。写成两个函数意味着：登录接口路径一变要改两处；加第 10 个场景就要复制第 10 个函数。这就是"复制粘贴式用例"，维护成本随用例数线性增长。

正确做法 —— 逻辑写一份，数据放 YAML：

```python
@pytest.mark.parametrize("case", LOGIN_CASES, ids=[c["id"] for c in LOGIN_CASES])
def test_login_negative(raw_api, case):
    resp = raw_api.post("/admin/login", json_body=case["body"])
    resp.assert_code(case["expect_code"])
```

**新增场景 = 在 YAML 里加一条数据，不用碰 Python 代码。**

**为什么选 YAML 而不是 Excel**：结构灵活（支持嵌套）、可写注释、git diff 友好（Excel 是二进制，改一个字整个文件都变，没法做代码评审）。如果团队更熟 Excel 也可以换 `openpyxl`，思路是一样的。

### 4.4 已知缺陷用 xfail 固化成回归用例 ⭐

**这是本框架最值得讲的设计。**

发现缺陷后只写一份报告交上去，缺陷修了没人验证，下次重构又可能引回来 —— 这是很多团队的现状。

更专业的做法是**把每个缺陷固化成一条自动化用例**，用 `xfail` 标记成"预期失败"：

```python
@pytest.mark.xfail(
    strict=True,
    reason="DEFECT-01：参数类型错误被 /error 二次分发覆盖为 401，应返回明确的参数错误提示",
)
def test_defect01_param_type_error_should_report_real_cause(api):
    resp = api.get("/product/list", params={"pageNum": 1, "pageSize": "abc"})
    assert "暂未登录" not in (resp.message or "")   # 断言的是"正确的行为"
```

**三个好处**：

1. **缺陷修复后自动提醒** —— `strict=True` 让用例从 `XFAIL` 变成 `XPASS`，进而变成 **FAILED**，强制你去更新用例。意思是"缺陷修好了，该把这条改成正常断言了"，而不是让它永远挂着"预期失败"
2. **防止缺陷被重新引入** —— 一旦回归，用例立刻变红
3. **新人看这个文件就能了解项目有哪些历史问题** —— 比翻缺陷管理平台快得多

**为什么 `strict=True` 而不是默认的 `False`**：`strict=False` 时缺陷修好了只显示 XPASS（不算失败），没人会注意到，这条用例就变成永久技术债。让它变红是**提醒**，不是惩罚。

### 4.5 断言分层：不只验证"接口通了"，还要验证"数据对了"

很多接口测试到这里就结束了：

```python
resp.assert_success()   # ← 就这样，没别的了
```

这漏掉了最关键的验证 —— **过滤条件到底有没有生效**。如果服务端把 `keyword` 参数忽略了、直接返回全部商品，`code` 依然是 200，上面的断言照样通过。

所以本框架的过滤类用例都会**逐条校验返回数据**：

```python
def test_product_list_filter_by_brand(api):
    resp = api.get("/product/list", params={"brandId": 1})
    resp.assert_success()

    # 【核心】不只断言请求成功，还要验证过滤条件真的生效
    for item in resp.data["list"]:
        assert item.get("brandId") == 1, f"过滤未生效，返回了 brandId={item.get('brandId')} 的商品"
```

这是"接口通了"和"功能对了"的区别，也是接口测试最容易走过场的地方。

### 4.6 测试数据自举，不硬编码 ID

**踩过的坑**：`test_order_detail_existing` 最初写的是 `GET /order/1`，结果失败 —— 排查后发现**订单表 ID 不是从 1 开始的**，最小 ID 是 12。

硬编码 ID 是最常见的"脆弱测试"来源：换环境、数据被清过、重新导入过，ID 就变了。别人跑的时候数据状态不同，就会出现"你这儿过我这不过"。

**正确做法**：先从列表接口动态取一个真实存在的 ID，再用它测详情。

```python
list_resp = api.get("/order/list", params={"pageNum": 1, "pageSize": 1}).assert_success()
order_id = list_resp.data["list"][0]["id"]      # 动态获取，不依赖数据库状态
resp = api.get(f"/order/{order_id}")
```

---

## 五、测试结果

```
62 passed, 9 xfailed in 2.72s
```

### 9 条 xfailed = 5 个已知缺陷的回归用例

| 缺陷 | 用例数 | 说明 |
|---|---|---|
| DEFECT-01 | 3 | 未处理异常被 `/error` 二次分发，真实错误被 401 覆盖 |
| DEFECT-02 | 2 | 原始 SQL 错误信息泄露给客户端 |
| DEFECT-03 | 1 | 删除不存在记录返回笼统「操作失败」 |
| DEFECT-04 | 1 | API 文档根路径白名单失效，带 token 反而 403 |
| DEFECT-05 | 1 | **日志记录明文密码**（WebLogAspect 未脱敏） |
| DEFECT-06 | 1 | **utf8mb3 列遇 emoji 触发 SQL 错误 1267** |

> 后两个是本次用 Python 框架跑的时候**新发现**的，之前的 Postman/功能测试没覆盖到。

### DEFECT-06 的发现过程（值得一提）

写 `test_login_username_with_unicode` 时，我传了用户名 `管理员🔒`，用例失败了。第一反应是"我的测试写错了"，但看到响应是 **HTTP 500** 而不是预期的 404，就去查了服务端日志：

```
java.sql.SQLException: Illegal mix of collations
(utf8mb3_general_ci,IMPLICIT) and (utf8mb4_0900_ai_ci,COERCIBLE) for operation '='
```

对照实验确认了边界：

| 用户名 | 结果 |
|---|---|
| `管理员`（3 字节中文） | HTTP 200，code=404 ✅ 正常 |
| `管理员🔒`（4 字节 emoji） | **HTTP 500 + SQLException** ❌ |

**根因**：`mall.sql` 是从 MySQL 5.7 导出的，列声明为 `CHARACTER SET utf8`（在 MySQL 里 `utf8` 就是 **utf8mb3**，最多 3 字节）。而库默认是 utf8mb4、连接也是 utf8mb4，传 4 字节字符时两种排序规则无法比较 → 报错 1267。

**验证**：查 information_schema 确认 `ums_admin.username` 是 `utf8mb3_general_ci`，且**全库仍有 211 个 varchar/text 列是 utf8mb3**。MySQL 端直接执行 `WHERE username='管理员🔒'` 复现了同样的 1267 错误。

**修复方案**：
```sql
ALTER TABLE mall.ums_admin CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
-- 建议对全库 211 个 utf8mb3 列统一处理
```

---

## 六、本次开发中踩的 5 个坑（都是真实发生的）

> 这几条比"框架怎么写"更值得记 —— 它们说明了**测试代码本身也会出错，而且更隐蔽**。

### 坑 1：fixture 污染共享状态，让测试说谎 ⭐ 最严重

`conftest.py` 最初是这么写的：

```python
@pytest.fixture(scope="session")
def api(raw_api, token):
    raw_api.set_token(token)   # ← 修改了共享的 Session 对象
    return raw_api
```

看起来"复用了连接池很优雅"，实际上 **`raw_api` 和 `api` 是同一个对象**。`api` 设上 token 后，`raw_api` 也带上了 token。

**后果**：所有"无 token 应被拦截"的鉴权负向用例，实际上都是**带着 token** 发出去的 —— 当然不会被拦截。用例本该 FAIL 却 PASS，**测试报告在骗人**。

**怎么发现的**：写 `test_product_list_requires_auth` 时期望 401，实际返回 200 且带了完整商品数据。第一反应是"商品接口漏配鉴权了"，**差点当成安全缺陷报出去**。排查后发现是自己的 fixture 污染了状态。

**修复**：两个 fixture 各自持有独立的 Session 对象。

> **教训**：测试代码也是代码，共享可变状态同样会带来隐蔽 bug。而且**测试代码的 bug 比业务代码的 bug 更危险 —— 它不会报错，只会让测试悄悄失去防护能力。**

### 坑 2：凭想象假设响应结构

我按"聚合根"的常见写法假设订单详情是嵌套的：

```python
assert "order" in data                 # ← 假设结构是 {order: {...}, orderItemList: [...]}
assert data["order"]["id"] == order_id
```

实际结构是**扁平的**（`OmsOrderDetail` 继承自 `OmsOrder`）：

```python
data = {"id": 12, "orderSn": "...", ..., "orderItemList": [...], "historyList": [...]}
```

**教训**：响应结构必须**实际请求一次看清楚**再写断言，不能靠读代码推测或靠经验假设。这是本项目反复出现的主题 —— **配置里写的 ≠ 实际运行的，代码里读到的 ≠ 实际返回的**。

### 坑 3：错误的边界假设，报出"假缺陷"

`test_product_list_page_num_out_of_range` 最初把 `pageNum != 1` 一律当成越界页，断言返回空列表。结果 `pageNum=2` 时报错 —— 但 2 明明是有效页（总数 20、每页 5 条 → 共 4 页）。

**教训**：写边界测试必须先**确认边界在哪**，而不是凭直觉假设。错误的边界假设会报出"假缺陷"，反过来浪费排查时间。正确做法是先查 `totalPage`，再据此判断哪些页码有效。

### 坑 4："测试意外通过"同样需要警惕

DEFECT-05 的用例最初用一个**错误密码**去探测（想避免用真密码），结果测试**意外通过**了，我一度以为缺陷已修复。

排查后发现原因是 `WebLogAspect` 的实现：

```java
Object result = joinPoint.proceed();   // 如果这里抛异常……
webLog.setParameter(...);              // ……下面这些根本不会执行
webLog.setResult(result);
LOGGER.info(...);
```

登录失败会抛 `ApiException`，异常穿透整个切面，**记录日志的代码没机会执行**。所以**只有成功的请求才会被记录**。

**教训**：「测试意外通过」和「测试失败」一样需要警惕 —— 它可能意味着测试没有真正覆盖到目标路径。如果当时采信"通过了 = 缺陷已修复"，就会漏掉一个高危安全问题。

### 坑 5：断言了不确定的东西，制造出 flaky test

L-06「请求体为空对象」这条用例，最初在 YAML 里写了 `expect_msg: password`。它跑第一遍是过的，第二遍就挂了 —— 因为空对象时 `username` 和 `password` **都缺失**，而 Hibernate Validator 对多个约束的**校验顺序是不确定的**：

```
第一次跑：{"message": "password不能为空"}
第二次跑：{"message": "username不能为空"}
```

**讽刺的是，我在 YAML 的 note 里已经写明了"校验顺序不确定，不要绑死具体字段"，但数据里还是写了 `expect_msg: password`** —— 想清楚了却没落实到代码，这种情况很常见。

**修复**：删掉 `expect_msg`，只断言确定的部分（`code=404` 参数校验失败）。

**教训**：**flaky test 比没有测试更糟糕** —— 它会消耗团队对测试结果的信任。一旦出现"这个用例时好时坏"，大家就会开始习惯性忽略失败，那整套测试的价值就崩了。

**怎么避免**：写断言时问自己一句「这个值在任何情况下都必然是这个吗？」。对于**顺序、并发、随机、时间**相关的东西，要么找出确定的部分来断言，要么就不断言。

> 修完后连跑了 3 遍，结果完全一致（`62 passed, 9 xfailed`），确认已稳定。

---

## 七、怎么扩展这个框架

### 加一个测试场景（不用写代码）

在 `data/login_cases.yaml` 里加一条：

```yaml
  - id: L-12
    title: 用户名超长（数据库列长度 64）
    body:
      username: "aaaaaaaa...(65个a)"
      password: macro123
    expect_code: 404
    note: 验证是否会被截断导致匹配到已有用户
```

### 加一个测试模块

1. 在 `testcases/` 下新建 `test_05_xxx.py`
2. 直接依赖 `api` fixture 就能拿到已鉴权的客户端
3. 用 `resp.assert_success()` / `resp.assert_code()` 做断言

### 接进 CI

```bash
pytest --html=reports/report.html --self-contained-html
```

pytest 的**退出码**可以直接用于 CI 判断：
- `0` = 全部通过（xfailed 不影响退出码）
- `1` = 有失败用例
- `2` = 执行中断

> **注意**：因为有 9 条 xfail 用例，如果将来缺陷修复了会变成 XPASS → FAILED（`strict=True` 的设计意图），届时需要把那几条改成正常断言。

---

## 八、这个框架体现了哪些测试能力

供面试参考：

| 能力 | 体现 |
|---|---|
| 框架设计 | 分层架构、配置与代码分离、数据驱动 |
| 对被测系统的理解 | 识别"HTTP 全 200"特性并据此确定断言策略 |
| 测试有效性意识 | 断言过滤条件真的生效、断言失败场景不下发 token |
| 缺陷管理 | 缺陷固化为 xfail 回归用例、strict 模式自动提醒修复 |
| 边界与探索性测试 | pageSize 的 1/0/-1/超大、"行为待观察"用例的设计 |
| 安全测试 | SQL 注入、伪造 token、信息泄露、明文密码日志检测 |
| **排查能力** | 4 个坑的定位过程，特别是从 500 错误反查 SQL 排序规则问题 |
| 自动化取证 | 用 xfail + 日志取证用例把安全缺陷变成可重复执行的检测 |
