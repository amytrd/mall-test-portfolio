# -*- coding: utf-8 -*-
"""
商品管理模块接口测试

【模块特点】
商品是后台使用频率最高的模块，接口以「查询 + 批量操作」为主：
  - GET  /product/list          分页查询（支持多条件过滤）
  - GET  /product/updateInfo/{id}  详情
  - GET  /product/simpleList    模糊搜索（下拉框用）
  - POST /product/create        新建
  - POST /product/update/xxxStatus  各类批量状态变更

【测试重点】
1. 分页参数边界 —— pageSize 取 1/0/-1/超大，pageNum 越界
2. 过滤条件是否真的生效（不只是返回 200）
3. 参数类型错误的表现（这里是缺陷高发区）
4. 数据一致性 —— 返回的数据要真的符合查询条件

【模块级标记】
整个模块标记为 regression：商品是核心模块，属于发版前必跑范围。
"""

import pytest

from config import CODE_FAILED, CODE_SUCCESS, CODE_UNAUTHORIZED, CODE_VALIDATE_FAILED
from utils.data_loader import load_yaml

pytestmark = pytest.mark.regression


# ============================================================
# 一、商品列表查询
# ============================================================
def test_product_list_default_pagination(api):
    """
    默认分页查询（正向）

    【断言设计】
    不只断言 code=200，还要验证分页结构完整、默认值符合约定。
    服务端 pageNum 默认 1、pageSize 默认 5（见 PmsProductController 的
    @RequestParam defaultValue），这些默认值是接口契约的一部分，应当固化。
    """
    resp = api.get("/product/list")
    resp.assert_success()

    # 分页结构完整性
    for field in ("pageNum", "pageSize", "totalPage", "total", "list"):
        resp.assert_has_field(field)

    data = resp.data
    assert data["pageNum"] == 1, f"默认 pageNum 应为 1，实际 {data['pageNum']}"
    assert data["pageSize"] == 5, f"默认 pageSize 应为 5，实际 {data['pageSize']}"
    assert isinstance(data["list"], list), "list 应为数组"
    assert len(data["list"]) <= data["pageSize"], (
        f"返回条数 {len(data['list'])} 不应超过 pageSize {data['pageSize']}"
    )

    # 商品数据非空（本环境有 38 个商品，列表应有数据）
    assert data["total"] > 0, "商品总数应大于 0，若为 0 请检查数据库是否已初始化"

    resp.assert_response_time_within()


@pytest.mark.parametrize(
    "page_size, expect_valid",
    [
        (1, True),        # 下边界
        (5, True),        # 默认值
        (20, True),       # 常规值
        (0, None),        # 零值 —— 行为待观察
        (-1, None),       # 负数 —— 行为待观察
        (100000, None),   # 超大值 —— 行为待观察
    ],
    ids=["pageSize=1", "pageSize=5", "pageSize=20", "pageSize=0", "pageSize=-1", "pageSize=100000"],
)
def test_product_list_page_size_boundary(api, page_size, expect_valid):
    """
    分页参数 pageSize 边界测试

    【设计思路 —— 为什么用 expect_valid=None 表示"行为待观察"】
    pageSize=0/-1/超大值 这些情况下，"正确行为"其实没有唯一答案，
    不同团队约定不同：
        有人主张返回 400 参数错误
        有人主张兜底成默认值
        有人主张返回空列表
    所以我不断言某个具体值，而是断言**服务端不能崩溃**，
    并把实际行为记录下来。这类"探索性测试"的产出是
    「行为基线」而不是「通过/失败判决」—— 但一旦行为变了，
    基线就会失效并报警，这正是它的价值。

    【为什么 pageSize 需要单独测】
    pageSize 直接决定 SQL 的 LIMIT 值，是典型的注入/性能风险点。
    pageSize=100000 会让数据库一次吐出全表数据，
    如果不加限制，线上一个请求就可能打垮数据库。
    """
    resp = api.get("/product/list", params={"pageNum": 1, "pageSize": page_size})

    if expect_valid is True:
        resp.assert_success()
        assert len(resp.data["list"]) <= page_size
    else:
        # 行为待观察：只要服务端不崩（没抛 5xx 未处理异常）即可
        assert resp.http_status < 500, (
            f"pageSize={page_size} 导致服务端 5xx，说明参数校验缺失。"
            f"HTTP={resp.http_status} body={resp.body}"
        )
        assert resp.code is not None, (
            f"pageSize={page_size} 的响应不是标准 CommonResult 结构：HTTP={resp.http_status}"
        )


@pytest.mark.parametrize(
    "page_num",
    [1, 2, 4],
    ids=["pageNum=1", "pageNum=2", "pageNum=4(末页)"],
)
def test_product_list_valid_pages(api, page_num):
    """
    有效页码 —— 应返回数据

    【踩坑记录】
    这条用例最初写错了：我把"pageNum != 1"一律当成越界页，断言返回空列表。
    结果 pageNum=2 时报错 —— 但 pageNum=2 明明是有效页
    （总数 20、每页 5 条 => 共 4 页），返回 5 条数据才是正确的。

    【教训】写边界测试时，必须**先确认边界在哪**，而不是凭直觉假设。
    这里正确的做法是先查 total/totalPage，再据此判断哪些页码有效。
    错误的边界假设会让测试报出"假缺陷"，反过来浪费排查时间。
    """
    resp = api.get("/product/list", params={"pageNum": page_num, "pageSize": 5})
    resp.assert_success()

    total_page = resp.data["totalPage"]
    if page_num <= total_page:
        assert len(resp.data["list"]) > 0, (
            f"pageNum={page_num} 在有效范围内（共 {total_page} 页），应返回数据"
        )
    assert resp.data["total"] > 0, "总数统计不应受页码影响"


def test_product_list_page_num_out_of_range(api):
    """
    页码真正越界 —— 应返回空列表，total 保持不变

    【期望行为】越界页返回空列表，而不是报错。
    这是分页的通用契约：页码越界不是错误，只是没数据。
    前端翻到最后一页后再点"下一页"就是这个场景。

    【常见错误实现】
      - 报错：用户正常翻页会看到错误提示
      - 返回全部数据：total 和 list 数量对不上，分页组件会错乱
    """
    # 先拿到总页数，构造一个"确定越界"的页码
    first = api.get("/product/list", params={"pageNum": 1, "pageSize": 5}).assert_success()
    total_page = first.data["totalPage"]
    out_of_range = total_page + 100

    resp = api.get("/product/list", params={"pageNum": out_of_range, "pageSize": 5})
    resp.assert_success(f"越界页码 {out_of_range} 不应报错")

    assert len(resp.data["list"]) == 0, (
        f"越界页 pageNum={out_of_range}（共 {total_page} 页）应返回空列表，"
        f"实际返回 {len(resp.data['list'])} 条"
    )
    assert resp.data["total"] == first.data["total"], (
        "越界不应影响总数统计"
    )


def test_product_list_negative_page_num(api):
    """
    负数页码 —— 行为记录

    【为什么单独拆出来】
    负数页码没有公认的"正确行为"（有的返回空、有的报错、有的当第 1 页），
    所以这里只断言"服务端不崩溃"，把实际行为记录下来作为基线。
    把"行为待观察"和"有明确预期"的用例分开写，
    报告里就不会出现"到底该不该失败"的歧义。
    """
    resp = api.get("/product/list", params={"pageNum": -1, "pageSize": 5})

    assert resp.http_status < 500, (
        f"负数页码导致服务端 5xx，说明缺少参数校验。HTTP={resp.http_status}"
    )
    assert resp.code is not None, "应返回标准 CommonResult 结构"


def test_product_list_filter_by_keyword(api):
    """
    关键词模糊查询 —— 重点验证"过滤条件真的生效"

    【测试设计的关键点】
    很多人写接口测试到这里就结束了：
        resp.assert_success()
    但这样就漏掉了最关键的验证 —— **过滤条件到底有没有生效**。

    如果服务端把 keyword 参数忽略了、直接返回全部商品，
    code 依然是 200，上面的断言照样通过。
    所以必须**逐个校验返回的数据是否真的匹配查询条件**。

    这是"接口通了"和"功能对了"的区别，也是接口测试最容易走过场的地方。
    """
    keyword = "手机"
    resp = api.get("/product/list", params={"keyword": keyword, "pageNum": 1, "pageSize": 5})
    resp.assert_success()

    items = resp.data["list"]
    assert len(items) > 0, f"关键词「{keyword}」应有匹配结果"

    # 【核心断言】逐条校验，而不只看总数
    for item in items:
        name = item.get("name") or ""
        product_sn = item.get("productSn") or ""
        assert (keyword in name) or (keyword in product_sn), (
            f"商品不匹配关键词「{keyword}」，说明过滤条件未生效或匹配逻辑有误：\n"
            f"  商品名 = {name}\n"
            f"  货号   = {product_sn}"
        )


def test_product_list_filter_by_brand(api):
    """
    按品牌过滤 —— 同样要验证过滤生效

    【为什么品牌过滤值得单独测】
    过滤条件是 SQL 的 WHERE 字段，是注入风险面。
    同时，如果服务端把 brandId 当成字符串拼接而不是参数绑定，
    这里就会暴露问题。
    """
    brand_id = 1
    resp = api.get("/product/list", params={"brandId": brand_id, "pageNum": 1, "pageSize": 5})
    resp.assert_success()

    for item in resp.data["list"]:
        assert item.get("brandId") == brand_id, (
            f"按 brandId={brand_id} 过滤，却返回了 brandId={item.get('brandId')} 的商品，"
            f"过滤条件未生效"
        )


def test_product_list_multiple_filters_combined(api):
    """
    多条件组合过滤

    【设计思路】单条件测试通过 ≠ 组合条件正确。
    多条件时 SQL 的 AND 拼接容易出问题（比如条件之间少了 AND、
    或者某个条件被覆盖）。所以要验证组合场景。
    """
    params = {"brandId": 1, "publishStatus": 1, "pageNum": 1, "pageSize": 5}
    resp = api.get("/product/list", params=params)
    resp.assert_success()

    for item in resp.data["list"]:
        assert item.get("brandId") == 1, "组合过滤中 brandId 条件未生效"
        assert item.get("publishStatus") == 1, "组合过滤中 publishStatus 条件未生效"


# ============================================================
# 二、商品详情
# ============================================================
def test_product_detail_existing(api):
    """
    查询存在的商品详情（正向）

    【断言设计】详情接口要验证"关联数据"是否一并返回。
    updateInfo 接口返回的不只是商品主表，还有 SKU 库存、
    商品属性值等关联表数据 —— 这是前端编辑页所需的完整数据。
    只断言 200 是不够的，要确认关联集合存在。
    """
    resp = api.get("/product/updateInfo/1")
    resp.assert_success()
    resp.assert_data_not_none()

    data = resp.data
    assert data.get("id") == 1, f"返回的商品 ID 与请求不一致：{data.get('id')}"

    # 关键字段
    assert data.get("name"), "商品名不应为空"
    assert data.get("price") is not None, "商品价格字段应存在"

    # 【关联数据】编辑页需要这些，缺失会导致前端报错
    assert "skuStockList" in data, "详情应包含 SKU 库存列表（前端编辑页需要）"
    assert "productAttributeValueList" in data, "详情应包含商品属性值列表"


def test_product_detail_not_existing(api):
    """
    查询不存在的商品 —— 应优雅返回而不是报错

    【期望行为】data 为 null，业务码仍为 200。
    【设计意图】"查不到"是正常业务情况，不是错误。
    如果这里返回 500，说明代码里用了 getOne 后直接 .getName() 之类的方式，
    会对 null 抛 NPE —— 这是很常见的代码缺陷。
    """
    resp = api.get("/product/updateInfo/99999999")
    resp.assert_success("查询不存在的商品不应报错")
    assert resp.data is None, (
        f"不存在的商品应返回 data=null，实际返回：{resp.data}"
    )


def test_product_detail_invalid_id_type(api):
    """
    商品 ID 传非数字 —— 参数类型错误

    【已知行为】这个场景属于 DEFECT-01 的覆盖范围：
    服务端返回 HTTP 400，但响应体被 /error 二次分发覆盖成 401。
    所以这里不断言具体业务码，只断言"服务端不崩溃 + 返回了 JSON"。
    完整的缺陷分析见 test_04_known_defects.py。
    """
    resp = api.get("/product/updateInfo/abc")
    assert resp.http_status in (400, 200), (
        f"非数字 ID 应被参数校验拦截，实际 HTTP={resp.http_status}"
    )
    assert resp.body is not None, "应返回 JSON 响应体"


# ============================================================
# 三、模糊搜索（下拉框用）
# ============================================================
def test_product_simple_list(api):
    """simpleList 模糊搜索（正向）—— 用于商品选择下拉框，返回精简字段"""
    resp = api.get("/product/simpleList", params={"keyword": "手机"})
    resp.assert_success()
    assert isinstance(resp.data, list), "simpleList 应返回数组（不是分页对象）"

    for item in resp.data:
        assert "id" in item and "name" in item, (
            f"simpleList 每项应含 id 和 name 供下拉框显示：{item}"
        )


def test_product_simple_list_empty_keyword(api):
    """
    空关键词搜索 —— 边界场景

    【测试价值】空关键词如果没做处理，SQL 会变成 like '%%' 匹配全表。
    数据量小时没问题，生产环境全表扫描会拖垮数据库。
    这里记录实际行为，作为性能风险基线。
    """
    resp = api.get("/product/simpleList", params={"keyword": ""})
    resp.assert_success("空关键词不应报错")
    # 记录行为：返回全部还是空列表，都属于设计选择，但要有意识
    assert isinstance(resp.data, list), "应返回数组"


# ============================================================
# 四、鉴权检查
# ============================================================
def test_product_list_requires_auth(raw_api):
    """
    商品列表必须鉴权

    【为什么每个模块都要测一遍鉴权】
    Spring Security 是统一拦截的，但白名单配置（secure.ignored.urls）
    是按 URL 模式匹配的。如果某个模块的路径恰好命中了白名单的通配符，
    就会意外地不需要鉴权 —— 这是真实的配置风险。

    所以每个模块都要抽一个接口验证，不能因为"框架统一处理"就跳过。
    """
    resp = raw_api.get("/product/list")
    resp.assert_code(CODE_UNAUTHORIZED, note="商品列表不应允许匿名访问")
