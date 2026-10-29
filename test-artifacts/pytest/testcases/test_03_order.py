# -*- coding: utf-8 -*-
"""
订单管理模块接口测试

【模块特点】
订单是电商的核心业务数据，接口分两类：
  查询类（安全）：
    GET  /order/list          条件分页查询
    GET  /order/{id}          订单详情（含商品明细 + 操作记录）
  状态变更类（有副作用）：
    POST /order/update/delivery   批量发货
    POST /order/update/close      批量关闭
    POST /order/delete            批量删除

【测试数据的处理原则 —— 重要】
状态变更类接口会**真的修改数据库**。放在自动化套件里必须谨慎：
  1. 优先用「不存在的 ID」做测试数据 —— 不会影响真实数据
  2. 参数校验类场景（缺参数）在执行到业务逻辑前就返回了，天然安全
  3. 确实需要真实变更时，要在用例里做数据清理（fixture 的 yield 后置逻辑）

本模块只做**查询类**和**不会产生真实变更的异常类**测试。
真正的破坏性操作只验证到"参数校验层"，不深入到执行业务。

【订单状态枚举】（来自 OmsOrderQueryParam 注释）
  0 待付款  1 待发货  2 已发货  3 已完成  4 已关闭  5 无效订单
"""

import pytest

from config import CODE_SUCCESS, CODE_UNAUTHORIZED, CODE_VALIDATE_FAILED
from utils.logger import log

pytestmark = pytest.mark.regression

# 订单状态枚举，集中定义便于用例引用和后续维护
ORDER_STATUS = {
    0: "待付款",
    1: "待发货",
    2: "已发货",
    3: "已完成",
    4: "已关闭",
    5: "无效订单",
}


# ============================================================
# 一、订单列表查询
# ============================================================
def test_order_list_default(api):
    """
    订单列表默认分页（正向）

    【默认值约定】与商品列表一致：pageNum=1、pageSize=5。
    统一的分页约定能降低前端接入成本，值得作为契约固化下来。
    """
    resp = api.get("/order/list")
    resp.assert_success()

    for field in ("pageNum", "pageSize", "totalPage", "total", "list"):
        resp.assert_has_field(field)

    assert resp.data["total"] > 0, "订单总数应大于 0（本环境有 65 笔订单）"
    log.info(f"订单总数 = {resp.data['total']}")


@pytest.mark.parametrize("status", [0, 1, 2, 3, 4, 5], ids=[f"status={s}-{n}" for s, n in ORDER_STATUS.items()])
def test_order_list_filter_by_status(api, status):
    """
    按订单状态过滤 —— 逐个状态验证

    【为什么把所有状态都参数化测一遍】
    订单状态机是电商最核心的业务逻辑之一。按状态过滤如果出错，
    运营看到的就是"待发货"里混着"已完成"的订单，直接影响发货。
    所以 6 个状态全部覆盖，而不是只测一个"看起来能用"。

    【断言要点】逐条校验返回的订单状态真的等于查询条件。
    只断言 code=200 的话，服务端忽略 status 参数也发现不了。
    """
    resp = api.get("/order/list", params={"status": status, "pageNum": 1, "pageSize": 20})
    resp.assert_success(f"按状态 {status}({ORDER_STATUS[status]}) 过滤")

    items = resp.data["list"]
    for item in items:
        assert item.get("status") == status, (
            f"按 status={status}({ORDER_STATUS[status]}) 过滤，"
            f"却返回了 status={item.get('status')} 的订单 {item.get('orderSn')}，"
            f"过滤条件未生效"
        )
    log.info(f"status={status}({ORDER_STATUS[status]}) 命中 {len(items)} 条，total={resp.data['total']}")


def test_order_list_invalid_status(api):
    """
    非法状态值过滤（边界）

    【期望行为】返回空列表，而不是报错。
    因为 status 是 Integer 类型，999 在类型上合法、只是业务上无意义。
    这类"类型正确但值不在枚举内"的情况，应该返回空结果。

    【常见缺陷】如果服务端用 status 去查关联表或者做字符串拼接，
    非法值可能导致 500 或 SQL 错误。
    """
    resp = api.get("/order/list", params={"status": 999, "pageNum": 1, "pageSize": 5})
    resp.assert_success("非法状态值不应导致服务端报错")
    assert len(resp.data["list"]) == 0, (
        f"非法状态 999 应返回空列表，实际返回 {len(resp.data['list'])} 条"
    )


def test_order_list_filter_by_order_sn(api):
    """按订单号模糊查询"""
    resp = api.get("/order/list", params={"orderSn": "2018", "pageNum": 1, "pageSize": 5})
    resp.assert_success()

    for item in resp.data["list"]:
        assert "2018" in (item.get("orderSn") or ""), (
            f"订单号过滤未生效：{item.get('orderSn')}"
        )


def test_order_list_receiver_keyword(api):
    """
    按收货人关键词搜索

    【设计说明】receiverKeyword 通常要 JOIN 收货人信息表，
    是最容易出现性能问题和 SQL 错误的条件之一。
    """
    resp = api.get("/order/list", params={"receiverKeyword": "test", "pageNum": 1, "pageSize": 5})
    resp.assert_success("收货人关键词查询不应报错")
    assert isinstance(resp.data["list"], list)


# ============================================================
# 二、订单详情
# ============================================================
def test_order_detail_existing(api):
    """
    订单详情（正向）

    【断言设计】订单详情是"聚合根"式接口，返回三部分数据：
        order          订单主体
        orderItemList  商品明细（一个订单可能多个商品）
        historyList    操作记录（谁在什么时候做了什么）

    这三者缺一不可 —— 少了明细，运营不知道发了什么货；
    少了操作记录，出纠纷时无法追溯。所以都要断言存在。

    ============================================================
    【踩坑记录：不要硬编码测试数据的 ID】
    ============================================================
    这条用例最初写的是 GET /order/1，结果返回 data=null 直接失败。
    排查后发现：**订单表的 ID 不是从 1 开始的** ——
    oms_order 里最小的 ID 是 12，所以 ID=1 根本不存在。

    【教训】硬编码 ID 是接口测试里最常见的"脆弱测试"来源：
      - 换个环境（数据被清过、重新导入过）ID 就变了
      - 别人跑的时候数据状态可能不同，出现"你那儿过我这不过"

    正确做法：**先从列表接口动态取一个真实存在的 ID**，再用它测详情。
    这样用例不依赖具体的数据库状态，在任何环境都能跑。
    这类"数据自举"的写法是接口自动化的基本素养。
    """
    # 第一步：从列表接口动态获取一个真实存在的订单 ID
    list_resp = api.get("/order/list", params={"pageNum": 1, "pageSize": 1}).assert_success()
    assert len(list_resp.data["list"]) > 0, "订单列表为空，无法进行详情测试（请检查数据库）"

    order_id = list_resp.data["list"][0]["id"]
    log.info(f"从列表动态获取到订单 ID = {order_id}")

    # 第二步：用这个真实 ID 测详情
    resp = api.get(f"/order/{order_id}")
    resp.assert_success()
    resp.assert_data_not_none()

    data = resp.data

    # ============================================================
    # 【踩坑记录 2：不要凭想象假设响应结构】
    # ============================================================
    # 我最初按"聚合根"的常见写法，假设结构是嵌套的：
    #     data = { "order": {...}, "orderItemList": [...], "historyList": [...] }
    # 于是写了 `assert "order" in data` —— 结果失败。
    #
    # 实际结构是**扁平的**：OmsOrderDetail 继承自 OmsOrder，
    # 所以订单字段直接在 data 下，明细和操作记录是 data 的同级字段：
    #     data = { "id": 12, "orderSn": "...", ..., "orderItemList": [...], "historyList": [...] }
    #
    # 【教训】接口的响应结构必须**实际请求一次看清楚**再写断言，
    #         不能靠"阅读代码推测"或"经验假设"。
    #         这是本项目的反复出现的主题：
    #         配置里写的 ≠ 实际运行的，代码里读到的 ≠ 实际返回的。
    #         唯一可靠的办法是真发一次请求看响应。
    # ============================================================
    assert data.get("id") == order_id, (
        f"返回的订单 ID 与请求不一致：请求 {order_id}，返回 {data.get('id')}"
    )

    # 订单主体关键字段
    for field in ("orderSn", "status", "totalAmount", "receiverName"):
        assert field in data, f"订单详情应包含字段 {field}"

    # 关联数据（前端订单详情页依赖这两个）
    assert "orderItemList" in data, "详情应包含商品明细 orderItemList"
    assert isinstance(data["orderItemList"], list), "商品明细应为数组"
    assert len(data["orderItemList"]) > 0, "订单应有商品明细（否则订单是没有意义的）"

    assert "historyList" in data, "详情应包含操作记录 historyList"
    assert isinstance(data["historyList"], list), "操作记录应为数组"

    # 明细里的字段也要校验 —— 少了下单商品信息，订单详情页就没法渲染
    item = data["orderItemList"][0]
    for field in ("productName", "productQuantity", "productPrice"):
        assert field in item, f"商品明细应包含字段 {field}"

    log.info(f"订单 {order_id}：状态={data['status']}，"
             f"明细 {len(data['orderItemList'])} 行，"
             f"操作记录 {len(data['historyList'])} 条")


def test_order_detail_not_existing(api):
    """
    查询不存在的订单 —— 不能报错

    【这条用例的价值】订单详情要聚合三张表的数据。
    如果实现是"先查订单，再拿订单 ID 查明细"，而没判断订单是否存在，
    就会拿着 null 的订单 ID 去查明细，可能抛异常或返回脏数据。
    这类"空结果未处理"是代码评审里的高频问题。
    """
    resp = api.get("/order/99999999")
    resp.assert_success("查询不存在的订单不应报错")

    # 实测行为：data 为 null（而不是抛异常或返回空对象）
    # 这正是期望的行为 —— "查不到"是正常业务情况，不该报错
    assert resp.data is None, (
        f"不存在的订单应返回 data=null，实际返回：{resp.data}"
    )


# ============================================================
# 三、状态变更接口的参数校验（只到校验层，不真的改数据）
# ============================================================
@pytest.mark.parametrize(
    "method, path, note",
    [
        ("POST", "/order/delete", "批量删除缺 ids"),
        ("POST", "/order/update/close", "批量关闭缺 ids 和 note"),
    ],
    ids=["delete缺ids", "close缺参数"],
)
def test_order_batch_ops_missing_required_param(api, method, path, note):
    """
    批量操作的必填参数缺失 —— 应被参数校验拦截

    【为什么相对安全】Spring 在参数绑定阶段就会因为缺少必填参数而拒绝请求，
    根本不会进入 Service 层，所以不会修改任何数据。
    这也是为什么这类用例可以放心放在自动化套件里。

    【已知行为说明】本场景属于 DEFECT-01：
    服务端返回 HTTP 400，但响应体被 /error 二次分发覆盖。
    所以这里断言的是"被拦截了"（HTTP 400），而不是具体业务码。
    详见 test_04_known_defects.py。
    """
    resp = api.request(method, path)
    assert resp.http_status == 400, (
        f"{note} 应返回 HTTP 400 参数错误，实际 HTTP={resp.http_status}, body={resp.body}"
    )


def test_order_status_change_requires_auth(raw_api):
    """订单查询接口必须鉴权"""
    resp = raw_api.get("/order/list")
    resp.assert_code(CODE_UNAUTHORIZED, note="订单列表不应允许匿名访问")


# ============================================================
# 四、数据一致性检查
# ============================================================
def test_order_list_pagination_consistency(api):
    """
    分页数据一致性 —— 跨页数据不应重复

    【为什么要测这个】
    分页最常见的缺陷是**跨页重复/遗漏**，通常由两个原因造成：
      1. SQL 没有 ORDER BY 稳定排序 —— 数据库返回顺序不确定，
         同一行可能在第一页和第二页都出现
      2. 分页参数计算错误（offset 算错）

    这类缺陷在小数据量、单页场景下完全测不出来，
    必须翻多页对比才能发现。而它一旦上线，用户会看到
    "同一个订单出现两次"或"某个订单怎么翻都找不到"。

    【检测方法】取第一页和第二页的 ID 集合，验证无交集。
    """
    params_base = {"pageNum": 1, "pageSize": 5}

    page1 = api.get("/order/list", params=params_base).assert_success()
    ids_p1 = {item["id"] for item in page1.data["list"]}

    if page1.data["total"] <= 5:
        pytest.skip(f"订单总数 {page1.data['total']} 不足两页，无法验证跨页一致性")

    page2 = api.get("/order/list", params={"pageNum": 2, "pageSize": 5}).assert_success()
    ids_p2 = {item["id"] for item in page2.data["list"]}

    overlap = ids_p1 & ids_p2
    assert not overlap, (
        f"第一页和第二页出现重复订单 ID：{overlap}\n"
        f"  第一页 = {sorted(ids_p1)}\n"
        f"  第二页 = {sorted(ids_p2)}\n"
        f"  原因通常是 SQL 缺少稳定的 ORDER BY，导致分页顺序不确定"
    )

    log.info(f"分页一致性检查通过：第一页 {sorted(ids_p1)}，第二页 {sorted(ids_p2)}，无重复")
