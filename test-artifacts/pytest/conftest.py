# -*- coding: utf-8 -*-
"""
pytest 共享 fixture —— 解决"登录一次，所有用例复用"的问题

【核心问题】
几乎每个业务接口都需要鉴权。如果每个用例都自己登录一次：
  1. 慢：登录要走 BCrypt 密码校验（实测约 70ms），几百个用例就是几十秒纯浪费
  2. 脏：每个用例都要写一遍登录代码，用例本身想测的东西被淹没
  3. 脆：登录逻辑一变，所有用例都要改

【解决方案：fixture + 合理的 scope】
pytest 的 fixture 可以理解为"带缓存的依赖注入"。
把登录做成 session 级别的 fixture，整个测试会话只登录一次，
所有用例共享同一个已鉴权的客户端。

【scope 怎么选】
    function（默认）: 每个用例都执行一次    ← 太慢
    class           : 每个测试类一次
    module          : 每个模块文件一次
    session         : 整个测试会话一次      ← 用在登录上正合适
token 有效期 7 天，一次会话内绝不会过期，所以 session 是安全且最优的选择。
"""

import pytest

from config import ADMIN_BASE_URL, ADMIN_PASSWORD, ADMIN_USERNAME, PORTAL_BASE_URL
from utils.http_client import HttpClient
from utils.logger import log


# ============================================================
# 一、未鉴权客户端（用于登录本身、以及鉴权负向用例）
# ============================================================
@pytest.fixture(scope="session")
def raw_api() -> HttpClient:
    """
    不带 token 的客户端。

    【用途】测"无 token 应被拦截"这类鉴权负向用例时，
    必须用一个干净的、不带 Authorization 头的客户端，
    否则会继承 session 的 token，就测不出拦截效果了。
    """
    client = HttpClient(ADMIN_BASE_URL)
    yield client
    client.close()


# ============================================================
# 二、登录并获取 token
# ============================================================
@pytest.fixture(scope="session")
def token(raw_api: HttpClient) -> str:
    """
    登录一次，返回 token，整个会话内复用。

    【设计说明】这里特意不直接返回"已鉴权的客户端"，
    而是先把 token 单独提供一个 fixture。
    好处是：需要 token 做别的事（比如手工构造请求头、或者传给别的客户端）时，
    可以直接依赖它，而不必被"客户端"这个抽象绑住。
    """
    log.info("=" * 60)
    log.info("开始测试会话：登录获取 token")
    log.info("=" * 60)

    resp = raw_api.post(
        "/admin/login",
        json_body={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
    )

    # 【这里为什么可以直接用断言】
    # 如果登录这一步就失败，后面所有用例都没有意义，
    # 不如在这里直接报错并给出清晰原因（账号不对？服务没起？）
    resp.assert_success("登录失败，后续用例无法执行")

    token_value = resp.data.get("token")
    assert token_value, f"登录响应里没有 token 字段：{resp.body}"

    log.info(f"登录成功，token 前缀 = {token_value[:30]}... (HTTP {resp.http_status}, "
             f"耗时 {resp.elapsed_ms}ms)")
    return token_value


# ============================================================
# 三、已鉴权客户端（绝大多数用例用这个）
# ============================================================
@pytest.fixture(scope="session")
def api(token: str) -> HttpClient:
    """
    已带上 token 的客户端 —— 业务用例的标准入口。

    ============================================================
    【踩坑记录：这里绝对不能复用 raw_api 对象】
    ============================================================
    最初的写法是 `def api(raw_api, token): raw_api.set_token(token); return raw_api`
    看起来"复用了连接池很优雅"，实际上是**一个会让测试说谎的严重 bug**：

        raw_api 和 api 是**同一个对象**（同一个 requests.Session）。
        api fixture 给它设上 token 之后，raw_api 也就带上 token 了。

    后果是：所有"无 token 应被拦截"的鉴权负向用例，
    实际上都是**带着 token** 发出去的 —— 当然不会被拦截。
    用例本来该 FAIL 却 PASS，**测试报告在骗人**。

    这次是写 test_product_list_requires_auth 时暴露的：
    期望 401，实际返回 200 且带了完整商品数据。一开始我以为是
    "商品接口漏配了鉴权"，差点当成安全缺陷报出去 ——
    排查后才发现是自己的 fixture 污染了共享状态。

    【教训】测试代码也是代码，共享可变状态同样会带来隐蔽 bug。
             而且测试代码的 bug 比业务代码的 bug 更危险 ——
             它不会报错，只会让测试悄悄失去防护能力。

    正确做法：两个 fixture 各自持有独立的 Session 对象。
    """
    client = HttpClient(ADMIN_BASE_URL)
    client.set_token(token)
    yield client
    client.close()


# ============================================================
# 四、前台会员端客户端（mall-portal，备用）
# ============================================================
@pytest.fixture(scope="session")
def portal_api() -> HttpClient:
    """
    mall-portal 的客户端。

    【注意两个服务的 token 不通用】
    mall-admin 的 jwt.secret 是 mall-admin-secret，
    mall-portal 的是 mall-portal-secret，签名密钥不同，
    拿 admin 的 token 去打 portal 接口会 401。
    这是设计上的隔离，不是 bug —— 但接口测试时容易踩。
    """
    client = HttpClient(PORTAL_BASE_URL)
    yield client
    client.close()
