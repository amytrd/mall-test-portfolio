---
layout: report
title: Postman 使用说明
description: 40 请求集合的导入、环境切换、执行顺序与排错清单
---

{% raw %}

> 配套文件：`mall-admin.postman_collection.json` + `mall-local.postman_environment.json`
> 集合规模：**40 个请求、约 130 条断言、5 个文件夹**
> 前置条件：mall-admin 已启动并监听 `http://localhost:8080`

---

## 一、导入（3 步）

1. 打开 Postman → 左上角 **Import**
2. 把这两个文件一起拖进去（或分别选择）：
   - `mall-admin.postman_collection.json`
   - `mall-local.postman_environment.json`
3. 导入完成后，**右上角环境下拉框切换到 `mall-local`**

> ⚠️ **第 3 步不能漏**。如果不选环境，`{{baseUrl}}` 会取集合内置的默认值（也是 `http://localhost:8080`，通常没问题），但 **`token` 写不进去**，后续所有鉴权请求都会返回 401 —— 这是最常见的"跑不起来"原因。
>
> 切换方法：Postman 右上角有个环境下拉菜单（默认显示 `No Environment`），点开选 `mall-local`。

---

## 二、执行顺序（关键）

### ⚠️ 必须先跑 `L-01 登录成功`

`L-01` 是**接口关联的起点**。它的 Tests 脚本里有这两行：

```javascript
pm.environment.set("token", json.data.token);
pm.environment.set("tokenHead", json.data.tokenHead);
```

它会把自己拿到的 token **写进环境变量**，后续所有需要鉴权的请求通过请求头 `{{tokenHead}}{{token}}` 自动引用 —— 不需要你手工复制粘贴 token。

**所以：先单独把 `L-01` 跑一次，再去跑别的请求。**

**怎么确认 token 写进去了**：
- 点开右上角的**环境变量快速查看**（眼睛图标），`token` 应该从「空」变成一个 `eyJ...` 开头的长字符串；
- 或者看 **Postman Console**（`Ctrl + Alt + C`），会打印：`已保存 token 到环境变量，前缀: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUz...`

### 顺序速查

```
第 1 步：00 登录与鉴权 → L-01 登录成功           ← 只跑这一个，先把 token 拿到
第 2 步：跑其余任意请求（或整个文件夹）
```

> token 有效期 7 天，正常情况下一次登录够用很久。如果中途开始大量报 `code=401`，重新跑一次 `L-01` 即可。

---

## 三、一键跑全部（Collection Runner）

1. 左侧集合上右键 → **Run collection**（或点集合名旁的 `▶`）
2. 确认：
   - **Environment** 选 `mall-local`
   - **Run order** 保持默认（集合已经按依赖顺序排好文件夹）
   - Iterations = 1
   - 勾选 **Save responses**（可选，便于事后排查）
3. 点 **Run mall-admin 后台接口测试**

> ⚠️ Runner 会按文件夹顺序执行，`00 登录与鉴权` 在最前面，所以 `L-01` 会先跑并写入 token —— 顺序是对的，不用手工干预。

---

## 四、预期结果解读 ⭐ 最重要的一节

### 一键跑完的结果：**通过约 30 条，失败约 10 条**

**看到 10 条红色不要慌，这是设计好的，不是集合坏了。**

这 10 条用例的断言写的是**「接口本来应该有的正确行为」**，而不是「接口现在的行为」。它们失败，**恰恰就是在证明缺陷存在** —— 这 10 条红色就是缺陷证据本身。

### 会「失败」的 10 条，以及为什么

| 请求 | 断言的是「正确行为」 | 实际返回 | 对应缺陷 |
|---|---|---|---|
| `P-07` pageSize 非数字 | 应提示参数类型错误 | HTTP 400 但 body 说「暂未登录」 | DEFECT-01 |
| `P-16` 创建商品 name 为空 | 应返回 404 参数校验失败 | 500 / 401（穿透到 SQL 层） | DEFECT-01 |
| `O-09` 订单详情非法 ID | 应提示 ID 类型非法 | HTTP 400 但 body 说「暂未登录」 | DEFECT-01 |
| `O-10` 批量删除缺 ids | 应提示 `ids` 参数缺失 | HTTP 400 但 body 说「暂未登录」 | DEFECT-01 |
| `O-12` 批量关闭缺 note | 应提示 `note` 参数缺失 | HTTP 400 但 body 说「暂未登录」 | DEFECT-01 |
| `P-15` 创建商品空 JSON | 不应泄露原始 SQL 错误 | 返回 `You have an error in your SQL syntax...` | DEFECT-02 |
| `O-14` 批量发货空数组 | 空数组应优雅处理（200） | 返回原始 SQL 语法错误 | DEFECT-02 |
| `O-11` 删除不存在订单 | 应给出明确语义，非笼统「操作失败」 | 500「操作失败」 | DEFECT-03 |
| `C-05` 删除不存在分类 | 同上 | 500「操作失败」 | DEFECT-03 |
| `D-03` api-docs 带 token | 持有合法 token 不应被拒 | 403「没有相关权限」 | DEFECT-04 |

### 怎么确认这些失败是「预期失败」

每条缺陷用例的 **description（描述）** 和 **Console 输出（`console.log`）** 里都写明了：

- 描述开头有 `【缺陷】` 或 `---------- 已知缺陷 DEFECT-0X ----------` 标记；
- 断言消息里直接写了原因，例如 `pm.expect(json.message, "参数类型错误应被明确提示")`；
- `console.log` 会打印实际响应，方便对照。

**在 Runner 结果页点开失败的请求 → `Test Results` 标签，就能看到是哪条断言失败、失败消息是什么。**

### 应当全部通过的文件夹

`00 登录与鉴权`（9 条）、`03 品牌与商品分类` 中的 B/C 组（除 C-05）、`04` 中的 D-01/D-04 —— 这些**应该一条不红**。如果它们红了，说明是环境问题，见第五节排查。

---

## 五、跑不通时的排查清单

| 现象 | 原因 | 解决 |
|---|---|---|
| 大量 `code=401 暂未登录或token已经过期` | 没跑 `L-01`，或没选环境 | 先跑 `L-01`；确认右上角环境是 `mall-local` |
| 所有请求都连接失败 / `Error: connect ECONNREFUSED` | 服务没起 | 确认 `http://localhost:8080/actuator/health` 返回 `{"status":"UP"}` |
| `L-01` 返回 `code=500 密码不正确` | 口令不对 | `ums_admin` 中只有 `admin`、`macro` 可用口令 `macro123`，确认用的是这两个之一 |
| `L-01` 返回 `code=404 用户名或密码错误` | 账号不存在 | 同上，换 `admin` 或 `macro` |
| 中文请求体（如 `keyword=手机`）查不到结果 | 编码问题 | 集合里已用 URL 编码处理；若自己改参数，注意中文需编码 |
| Runner 里 `token` 变量始终为空 | `L-01` 的 Tests 没执行 | 检查 `L-01` 是否有 Tests 脚本（应能看到 7 条断言） |
| 某些请求 `code=403 没有相关权限` | 动态权限校验（`ums_resource` 表） | 用 `admin` 账号（拥有全量权限），不要用权限受限的账号 |

---

## 六、集合里值得看的几个设计点

方便你面试时讲，或自己学习：

### 1. 登录接口的 Tests 脚本（`L-01`）—— 接口关联的实现

```javascript
const json = pm.response.json();

pm.test("业务码 code = 200（登录成功）", function () {
    pm.expect(json.code).to.eql(200);
});

pm.test("data.tokenHead = 'Bearer '（注意尾随空格）", function () {
    pm.expect(json.data.tokenHead).to.eql("Bearer ");
});

pm.test("data.token 为合法 JWT 格式（三段式）", function () {
    pm.expect(json.data.token.split(".")).to.have.lengthOf(3);
});

// ---------- 接口关联 ----------
if (json.code === 200 && json.data && json.data.token) {
    pm.environment.set("token", json.data.token);
    pm.environment.set("tokenHead", json.data.tokenHead);
}
```

**为什么必须动态取 token**：token 有效期 7 天，硬编码在集合里一定会过期失效。自动化脚本必须每次登录动态获取 —— 这是接口测试「关联（Correlation）」的标准做法，和 JMeter 里用 JSON 提取器是同一个思路。

### 2. 为什么断言的是 `json.code` 而不是 HTTP 状态码

本项目**所有业务响应的 HTTP 状态码都是 200**（包括密码错误、参数校验失败）。真实结果在响应体的 `code` 字段。

```javascript
// ❌ 只断这个 → 密码错误也会被判"通过"，测试形同虚设
pm.response.to.have.status(200);

// ✅ 必须断业务码
pm.expect(json.code).to.eql(500);
```

### 3. 数据层断言 —— 不止验证"请求成功"，还要验证"数据正确"

`P-09 按品牌过滤` 里：

```javascript
pm.test("过滤结果均属于指定品牌 brandId=1", function () {
    if (json.data.list.length > 0) {
        json.data.list.forEach(function (p) {
            pm.expect(p.brandId, "商品品牌应等于 1").to.eql(1);
        });
    }
});
```

**为什么要这样断言**：如果服务端把过滤条件忽略了、返回了全量数据，`code` 依然是 200。只有逐个校验数据，才能确认过滤**真的生效**。

### 4. 安全类断言 —— 验证"不该出现什么"

`L-08 SQL 注入` 和 `P-15` 里：

```javascript
pm.test("响应体不含数据库错误信息（无SQL泄露）", function () {
    const body = pm.response.text().toLowerCase();
    pm.expect(body).to.not.include("sql");
    pm.expect(body).to.not.include("mysql");
});
```

这类断言断的是「**不应该出现什么**」，用于验证信息泄露。

---

## 七、集合资产一览

| 文件夹 | 请求数 | 覆盖接口 |
|---|---|---|
| `00 登录与鉴权` | 9 | `/admin/login`、`/admin/list`、`/admin/info` |
| `01 商品管理` | 12 | `/product/list`、`/product/updateInfo/{id}`、`/product/create` |
| `02 订单管理` | 9 | `/order/list`、`/order/{id}`、`/order/delete`、`/order/update/*` |
| `03 品牌与商品分类` | 7 | `/brand/*`、`/productCategory/*` |
| `04 接口文档与健康检查` | 3 | `/actuator/health`、`/v3/api-docs`、`/v3/api-docs/default` |

### 环境变量（`mall-local`）

| 变量 | 值 | 说明 |
|---|---|---|
| `baseUrl` | `http://localhost:8080` | mall-admin 地址 |
| `portalBaseUrl` | `http://localhost:8085` | mall-portal 地址 |
| `token` | *(空，L-01 自动写入)* | JWT token |
| `tokenHead` | `Bearer `（**末尾有空格**） | token 前缀 |
| `adminUsername` | `admin` | 测试账号 |
| `adminPassword` | `macro123` | 测试口令 |

---

## 八、想做成命令行自动化（可选，本次未执行）

如果你想把这个集合接进 CI、或在简历里写「Newman 命令行集成」，可以在装了 Node 的机器上：

```bash
# 安装 Postman 官方命令行工具
npm install -g newman

# 跑集合（在 postman 目录下执行）
newman run "mall-admin.postman_collection.json" \
  -e "mall-local.postman_environment.json" \
  --reporters cli

# 生成 HTML 报告（需额外装报告器）
npm install -g newman-reporter-htmlextra
newman run "mall-admin.postman_collection.json" \
  -e "mall-local.postman_environment.json" \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export newman-report.html
```

**注意**：`newman run` 的**退出码**可以判断测试结果，适合接入 CI：

| 退出码 | 含义 |
|---|---|
| `0` | 全部断言通过 |
| `1` | 存在断言失败 |
| 更大的码 | 运行出错 |

> ⚠️ 由于本集合里有 10 条**故意断言失败**的缺陷用例，**Newman 会返回退出码 1**。若要接入 CI 并不希望因缺陷用例失败，需要把这 10 条拆分到单独的集合（如 `mall-admin-defects.collection.json`），或给它们打上 `skip` 标记。

---

## 九、一句话总结

> 导入两个 JSON → 选 `mall-local` 环境 → **先跑 `L-01` 拿 token** → 再跑其余请求。
> 结果是 **30 通过 / 10 失败**，那 10 条失败是**故意断言的缺陷证据**，不是集合有问题。

{% endraw %}
