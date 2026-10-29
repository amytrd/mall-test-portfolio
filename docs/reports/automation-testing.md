---
layout: report
title: 自动化测试框架
description: pytest 四层架构、token fixture、数据驱动、xfail 缺陷回归与 CI 集成
---

> 技术栈：Python 3.11 + pytest + requests + PyYAML
> 用例规模：**71 条**（62 passed + 9 xfailed）
> 执行耗时：约 **3.4 秒**
> 源码位置：`test-artifacts/pytest/`
> 在线报告：`docs/evidence/pytest-report.html`

## 一、为什么自建框架

Postman 适合探索式调试和单接口验证，但面对"回归 + 数据驱动 + 缺陷闭环 + CI"时不够用：

| 需求 | Postman | pytest |
|---|---|---|
| 数据驱动（一份用例多组数据） | 需要重复建请求 | `@pytest.mark.parametrize` 一行 |
| 失败重跑 / 分组 / 筛选 | 弱 | `-k`、`-m`、插件生态 |
| 缺陷回归（预期失败） | 无原生概念 | `xfail(strict=True)` |
| CI 退出码 | Newman 可用但笨重 | 原生退出码 |
| 代码复用 / 分层 | 集合内脚本 | 模块、fixture、工具类 |

因此本项目采用 **Postman 做接口探索 + pytest 做自动化回归** 的组合。

## 二、四层架构

```
testcases/          用例层  —— 只写"要测什么"
    ↓ 使用
utils/              工具层  —— 只写"怎么发、怎么判"
    ↓ 依赖
config.py           配置层  —— 只写"环境是什么"
    ↑ 读取
data/               数据层  —— 只写"用什么数据测"
```

| 变更类型 | 需要改哪层 | 用例是否要改 |
|---|---|---|
| 换测试环境（端口/域名） | `config.py` 一行 / 环境变量 | 否 |
| 加一个异常场景 | `data/login_cases.yaml` 加一条 | 否 |
| 服务端改响应结构 | `utils/http_client.py` 断言助手 | 否 |
| 登录接口改路径 | 用例里一处 | 是（但只一处） |

**分层的价值是变更隔离**。所有环境相关值收敛到 `config.py`，并支持环境变量覆盖：

```python
ADMIN_BASE_URL = os.getenv("MALL_ADMIN_BASE", "http://localhost:8080")
ADMIN_USERNAME = os.getenv("MALL_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.getenv("MALL_ADMIN_PASS", "macro123")
```

CI 上只需设置 `MALL_ADMIN_BASE` 就能切换被测环境，不改一行业务用例。

## 三、五个核心设计

### 3.1 断言业务码，而不是 HTTP 状态码 ⭐

mall 所有业务响应的 HTTP 状态码都是 200，真实结果在 `body.code`：

```json
{"code": 200, "message": "操作成功", "data": {...}}   // 成功
{"code": 500, "message": "密码不正确", "data": null}   // 密码错误 —— HTTP 仍是 200
```

如果只断言 `status_code == 200`，"密码错误""参数非法"都会被判为通过，测试彻底失效。框架把断言集中封装：

```python
resp.assert_code(500, note="密码错误")
resp.assert_success()                 # 等价于 assert_code(200)
resp.assert_message_contains("密码不正确")
resp.assert_no_field("token")         # 失败时不能下发 token
resp.assert_elapsed_under(3000)       # 响应时间兜底
```

### 3.2 session 级 token 复用

登录要走 BCrypt 校验（约 70ms），每个用例登录一次会浪费几十秒。框架用 `scope="session"` 的 fixture 登录一次，全会话复用：

```python
@pytest.fixture(scope="session")
def token(raw_api):
    resp = raw_api.post("/admin/login",
                        json_body={"username": ADMIN_USERNAME,
                                   "password": ADMIN_PASSWORD})
    resp.assert_success("登录失败，后续用例无法执行")
    return resp.data["token"]

@pytest.fixture(scope="session")
def api(token):
    client = HttpClient(ADMIN_BASE_URL)   # 独立 Session
    client.set_token(token)
    yield client
    client.close()
```

### 3.3 一个"测试说谎"的真实 bug：fixture 污染 ⭐

最初 `api` fixture 为了"复用连接池"写成：

```python
def api(raw_api, token):
    raw_api.set_token(token)   # ❌ 修改了共享对象
    return raw_api
```

`raw_api` 和 `api` 其实是**同一个 requests.Session**。设置 token 后，`raw_api` 也带上了 token。结果所有"无 token 应被拦截"的鉴权负向用例，实际上是**带着 token** 发出去的 —— 本该 FAIL 的用例全部 PASS，**测试报告在骗人**。

暴露点：`test_product_list_requires_auth` 期望 401，实际返回 200 和完整商品数据。最初差点误报成"商品接口漏配鉴权"的安全缺陷，排查后发现是自己的 fixture 污染了共享状态。

**修正**：两个 fixture 各自持有独立的 `HttpClient` 实例。

> 教训：测试代码也是代码，共享可变状态同样会带来隐蔽 bug。测试代码的 bug 更危险 —— 它不报错，只会让测试悄悄失去防护能力。

### 3.4 数据驱动

登录异常场景放在 `data/login_cases.yaml`，用例层只负责读数据和断言：

```yaml
- id: L-02
  title: 正确用户名 + 错误密码
  username: admin
  password: wrongpass
  expected_code: 500
  expected_message: 密码不正确
- id: L-03
  title: 不存在的用户名
  username: nosuchuser_zzz
  password: macro123
  expected_code: 404
  expected_message: 用户名或密码错误
```

```python
@pytest.mark.parametrize("case", load_login_cases(), ids=lambda c: c["id"])
def test_login_negative(raw_api, case):
    resp = raw_api.post("/admin/login",
                        json_body={"username": case["username"],
                                   "password": case["password"]})
    resp.assert_code(case["expected_code"])
    resp.assert_message_contains(case["expected_message"])
```

新增异常场景只加 YAML，不改代码。

### 3.5 xfail 缺陷回归闭环

6 个缺陷全部写成 `xfail(strict=True)` 用例：

```python
@pytest.mark.xfail(
    strict=True,
    reason="DEFECT-06：utf8mb3 列遇 4 字节 emoji 触发 SQL 1267，待修复",
)
def test_defect06_emoji_in_username_should_not_crash(raw_api):
    resp = raw_api.post("/admin/login",
                        json_body={"username": "管理员🔒", "password": "x"})
    assert resp.http_status == 200, "emoji 用户名不应导致 HTTP 500"
    assert resp.body["code"] == 404, "应返回用户不存在，而不是服务端异常"
```

**为什么用 xfail 而不是注释掉/跳过**：

| 做法 | 结果 |
|---|---|
| 删除用例 | 缺陷被遗忘，修复后无感知 |
| `skip` | 永久跳过，永远不会提醒 |
| `xfail(strict=True)` | 当前预期失败；**修复后变成 XPASS → 直接判 FAILED**，强制测试人员更新用例、关闭 Bug |

这就是缺陷生命周期的"闭环"：缺陷不因报告归档而消失。

## 四、执行方式

```powershell
cd test-artifacts/pytest
pip install -r requirements.txt

# 全量 71 条
pytest

# 生成 HTML 报告
pytest --html=reports/report.html --self-contained-html

# 只跑登录模块
pytest testcases/test_01_login.py -v

# 只跑缺陷回归
pytest -k "defect" -v

# 只跑功能用例（排除已知缺陷）
pytest -k "not defect" -v
```

**结果解读**

| 状态 | 含义 | 处理 |
|---|---|---|
| `passed` | 功能正常 | — |
| `xfailed` | 预期失败，已知缺陷仍在 | 正常，不是问题 |
| `failed` | 真实回归 | 要查 |
| `XPASS` | 缺陷被修好了（strict 下判 FAILED） | 更新断言，关闭 Bug |

退出码：`0` 全部通过（xfailed 不影响）、`1` 有失败、`2` 执行中断 —— 可直接用于 CI 判断。

## 五、CI 集成

仓库包含 `.github/workflows/ci.yml`：

| 触发 | 任务 | 说明 |
|---|---|---|
| `push` / `pull_request` | 静态校验 | JSON 资产合法性、pytest `--collect-only` 用例可发现性、敏感信息扫描 |
| `workflow_dispatch` | 全量接口回归 | 对 `MALL_ADMIN_BASE` 指定的环境执行 71 条用例，上传 HTML 报告 |

{% raw %}
```yaml
- name: Collect tests
  working-directory: test-artifacts/pytest
  run: pytest --collect-only -q

- name: Run API regression
  if: github.event_name == 'workflow_dispatch'
  working-directory: test-artifacts/pytest
  env:
    MALL_ADMIN_BASE: ${{ secrets.MALL_ADMIN_BASE }}
    MALL_ADMIN_USER: ${{ secrets.MALL_ADMIN_USER }}
    MALL_ADMIN_PASS: ${{ secrets.MALL_ADMIN_PASS }}
  run: pytest --html=reports/report.html --self-contained-html
```
{% endraw %}

> 说明：PR 阶段不跑全量接口用例，因为 GitHub 托管 Runner 无法访问本地 mall 服务。手动触发任务用于有可用测试环境时执行真实回归。

## 六、能力边界（诚实说明）

- 本框架是 **API 自动化**，不是 UI 自动化；未使用 Selenium / Playwright，不以未做过的工具充数。
- 用例依赖真实后端与 MySQL/Redis，属于**集成测试**，不适合作为无依赖的单元测试在任意 CI 环境跑。
- 未做并发执行（pytest-xdist）与失败重试，当前 71 条 3.4 秒，暂无必要。
- 断言以接口契约和业务码为主，未覆盖数据库落库校验（可作为下一步扩展：用例后置 SQL 断言）。
