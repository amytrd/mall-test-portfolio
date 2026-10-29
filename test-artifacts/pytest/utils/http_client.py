# -*- coding: utf-8 -*-
"""
HTTP 客户端封装 —— 整个框架的核心

【为什么要封装，而不用原生 requests】
如果每个用例都写 requests.get(...) 然后手动判断，会有三个问题：
  1. 重复代码：每个用例都要写 token 拼接、超时、日志、断言
  2. 断言不一致：A 用例断言 HTTP 状态码，B 用例断言 body 里的 code，
     口径不统一，测试结果就没有可信度
  3. 出问题难定位：失败了只看到 "assert False"，不知道请求发了什么、返回了什么

封装之后，用例层只需要：
    resp = api.get("/product/list", params={"pageNum": 1})
    resp.assert_success()
这样用例只表达"要测什么"，而不关心"怎么发、怎么判"。

【本框架最重要的一条设计决策】
mall 的**所有业务响应 HTTP 状态码都是 200**，真实结果在 body 的 code 字段。
所以断言的核心是 assert_code()，而不是断言 HTTP 状态码。
详见 ApiResponse.assert_code 的注释。
"""

from typing import Any, Dict, Optional

import requests

from config import CODE_SUCCESS, HTTP_TIMEOUT, JSON_HEADERS, RESPONSE_TIME_LIMIT_MS
from utils.logger import log


class ApiResponse:
    """
    对 requests.Response 的一层包装。

    【为什么要包装】
    原生 Response 的字段名不统一（status_code / text / json()），
    而且 json() 在响应不是 JSON 时会抛异常，用例里到处 try/except 很脏。
    包装之后统一成：http_status / code / message / data / elapsed_ms，
    用例只需要面对这几个概念。

    【关键属性】
        http_status : HTTP 状态码（传输层结果）
        code        : 业务码（业务层结果）—— 真正要断言的
        message     : 业务提示语
        data        : 业务数据
        elapsed_ms  : 请求耗时（毫秒），用于性能基线断言
    """

    def __init__(self, response: requests.Response, elapsed_ms: float, request_desc: str = ""):
        self.http_status: int = response.status_code
        self.elapsed_ms: float = round(elapsed_ms, 1)
        self.raw: str = response.text
        self.request_desc = request_desc

        # 【安全解析 JSON】响应可能不是 JSON（比如返回了 HTML 错误页、
        # 或者网关返回了纯文本）。直接调 response.json() 会抛异常，
        # 所以这里兜底成 None，后续断言会给出更友好的提示。
        try:
            self.body: Optional[Dict[str, Any]] = response.json()
        except ValueError:
            self.body = None

        if isinstance(self.body, dict):
            self.code = self.body.get("code")
            self.message = self.body.get("message")
            self.data = self.body.get("data")
        else:
            self.code = None
            self.message = None
            self.data = None

    # ---------- 断言方法 ----------

    def assert_code(self, expected: int, note: str = "") -> "ApiResponse":
        """
        断言业务码 —— **本框架最主要的断言方式**

        【为什么不断言 HTTP 状态码】
        这是这个项目最容易踩的坑。实测：登录密码错误时，服务端返回的是
            HTTP 200 + {"code": 500, "message": "密码不正确"}
        也就是说，**HTTP 状态码永远是 200，业务失败也返回 200**。

        如果写成 assert resp.status_code == 200，那么"密码错误"这种
        明明应该失败的场景，也会被判为通过 —— 整个接口测试就形同虚设。

        所以必须断言 body 里的 code 字段。

        参数:
            expected: 期望的业务码（用 config.py 里的 CODE_* 常量）
            note:     补充说明，会拼进失败消息里，方便定位
        """
        assert self.code == expected, (
            f"\n  业务码断言失败{(' (' + note + ')') if note else ''}"
            f"\n  期望 code = {expected}"
            f"\n  实际 code = {self.code}"
            f"\n  实际 message = {self.message}"
            f"\n  HTTP 状态码 = {self.http_status}"
            f"\n  响应体 = {self._brief()}"
            f"\n  请求 = {self.request_desc}"
        )
        return self

    def assert_success(self, note: str = "") -> "ApiResponse":
        """断言业务成功（code == 200）的快捷方式，等价于 assert_code(200)。"""
        return self.assert_code(CODE_SUCCESS, note)

    def assert_message(self, expected: str) -> "ApiResponse":
        """断言提示语完全相等。用于校验服务端的文案是否符合约定。"""
        assert self.message == expected, (
            f"\n  提示语断言失败"
            f"\n  期望 message = {expected!r}"
            f"\n  实际 message = {self.message!r}"
            f"\n  响应体 = {self._brief()}"
        )
        return self

    def assert_message_contains(self, part: str) -> "ApiResponse":
        """
        断言提示语包含某段文字。

        【为什么需要这个】参数校验失败的提示语形如 "name不能为空"
        （字段名和提示语直接拼接、没有分隔符），是英文+中文混排。
        用"包含"断言比"完全相等"更稳，不会因为空格差异而误报。
        """
        assert self.message and part in self.message, (
            f"\n  提示语应包含 {part!r}"
            f"\n  实际 message = {self.message!r}"
            f"\n  响应体 = {self._brief()}"
        )
        return self

    def assert_data_not_none(self) -> "ApiResponse":
        """断言 data 字段有值。用于正向用例 —— 成功就该有数据返回。"""
        assert self.data is not None, (
            f"\n  data 不应为空"
            f"\n  实际 data = {self.data}"
            f"\n  message = {self.message}"
            f"\n  提示：若 code=401，通常是 token 没带上或已过期"
        )
        return self

    def assert_data_is_none(self) -> "ApiResponse":
        """
        断言 data 为空。
        【典型场景】登录失败时，绝不能下发 token —— 用这个断言做安全兜底。
        """
        assert self.data is None, (
            f"\n  data 应为空（失败场景不应返回业务数据）"
            f"\n  实际 data = {self._brief(self.data)}"
        )
        return self

    def assert_has_field(self, field: str, path: str = "data") -> "ApiResponse":
        """
        断言响应体某个层级里存在指定字段。

        【设计说明】只支持单层（如 data 下的直接字段），
        需要深层校验时用例里自己取出来断 —— 保持工具简单，
        避免造一个"万能 JSONPath 断言器"却没人看得懂。
        """
        target = self.body if path == "body" else self.data
        assert isinstance(target, dict) and field in target, (
            f"\n  响应体 {path} 中应包含字段 {field!r}"
            f"\n  实际字段列表 = {list(target.keys()) if isinstance(target, dict) else target}"
            f"\n  响应体 = {self._brief()}"
        )
        return self

    def assert_response_time_within(self, limit_ms: int = RESPONSE_TIME_LIMIT_MS) -> "ApiResponse":
        """
        断言响应时间在阈值内。

        【为什么要做这个】功能测试也要守住性能底线。
        接口功能正确但慢到几秒，上线就是故障。
        阈值设得宽松（默认 3 秒），只用来抓"明显异常"的退化。
        """
        assert self.elapsed_ms <= limit_ms, (
            f"\n  响应时间超过阈值"
            f"\n  实际耗时 = {self.elapsed_ms} ms"
            f"\n  阈值     = {limit_ms} ms"
            f"\n  请求 = {self.request_desc}"
        )
        return self

    # ---------- 辅助 ----------

    def _brief(self, obj: Any = None, limit: int = 300) -> str:
        """把响应体截断成一行，避免断言失败消息刷屏。"""
        text = self.raw if obj is None else str(obj)
        return text if len(text) <= limit else text[:limit] + f"...(共{len(text)}字符)"

    def __repr__(self) -> str:
        return f"<ApiResponse http={self.http_status} code={self.code} time={self.elapsed_ms}ms>"


class HttpClient:
    """
    HTTP 客户端。

    【为什么用 Session 而不是每次 requests.get】
    1. 连接复用：Session 底层用连接池，省去每次 TCP 握手，
       压测/批量跑用例时差异很明显
    2. 统一默认头：避免每个请求都手动带 Content-Type
    3. 统一超时与日志：在这里配一次，全局生效

    【注意】Session 会保持 cookie。本项目用 JWT（放在 header 里），
    不依赖 cookie，所以不存在"登录态串味"的问题。
    """

    def __init__(self, base_url: str, timeout=HTTP_TIMEOUT):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(JSON_HEADERS)
        # token 由 conftest 在 fixture 里注入，这里先留空
        self.token: Optional[str] = None

    def set_token(self, token: str) -> None:
        """
        设置 token，后续所有请求自动带上。

        做成"客户端级别的状态"而不是每个请求手传，
        是为了让用例层干净：用例不该关心"这次请求要不要带 token"。

        【坑点提醒】tokenHead 是 "Bearer "（末尾有空格），不能漏。
        """
        self.token = token
        self.session.headers["Authorization"] = f"Bearer {token}"

    def request(
        self,
        method: str,
        path: str,
        params: Optional[dict] = None,
        json_body: Optional[dict] = None,
        headers: Optional[dict] = None,
        expect_json: bool = True,
    ) -> ApiResponse:
        """
        统一请求入口。

        【为什么把 json_body 和 params 分开】POST 用 json body、GET 用 query
        params，混在一起容易写错。分开之后调用方一眼就知道自己传的是哪种。
        """
        url = f"{self.base_url}{path}"

        # 构造请求描述，用于日志和断言失败消息 —— 出问题时能直接看到原始请求
        desc = f"{method} {url}"
        if params:
            desc += f" params={params}"
        if json_body is not None:
            desc += f" json={json_body}"

        import time
        start = time.perf_counter()          # perf_counter 比 time.time() 精度更高
        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=json_body,
                headers=headers,
                timeout=self.timeout,
            )
        except requests.exceptions.ConnectTimeout:
            # 连接超时 = 服务没起来 / 网络不通，是环境问题，不是接口缺陷
            raise AssertionError(
                f"\n  连接超时：{url}"
                f"\n  通常是服务未启动或网络不通"
                f"\n  请先确认 mall-admin 已启动（http://localhost:8080/actuator/health）"
            )
        except requests.exceptions.ReadTimeout:
            raise AssertionError(
                f"\n  读取超时：{url}"
                f"\n  服务已响应但处理超过 {self.timeout[1]} 秒"
            )
        finally:
            elapsed_ms = (time.perf_counter() - start) * 1000

        resp = ApiResponse(response, elapsed_ms, request_desc=desc)

        # 请求/响应日志 —— 排障的第一手材料
        log.debug(f"→ {desc}")
        log.debug(f"← HTTP {resp.http_status} | code={resp.code} | "
                  f"{resp.elapsed_ms}ms | {resp._brief(limit=200)}")

        return resp

    # ---------- 便捷方法 ----------
    def get(self, path: str, **kwargs) -> ApiResponse:
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs) -> ApiResponse:
        return self.request("POST", path, **kwargs)

    def close(self) -> None:
        self.session.close()
