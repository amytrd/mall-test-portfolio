# -*- coding: utf-8 -*-
"""
测试数据加载器

【为什么要做数据驱动，而不是把数据写在用例里】
反例写法（数据硬编码在用例中）：
    def test_login_wrong_password():
        resp = api.post("/admin/login", json_body={"username": "admin", "password": "wrong"})
        resp.assert_code(500)

    def test_login_empty_username():
        resp = api.post("/admin/login", json_body={"username": "", "password": "macro123"})
        resp.assert_code(404)

问题在于：这两个用例的**逻辑完全一样**（发登录请求 → 断言业务码），
只是**数据不同**。把它们写成两个函数，一旦登录接口路径变了，
要改两处；加第 10 个场景，就要再复制一个函数。
这就是典型的"复制粘贴式用例"，维护成本随用例数线性增长。

正确做法（数据驱动）：
    用例逻辑写一份（参数化），数据放在 YAML 里作为一个列表。
    新增场景 = 在 YAML 里加一条，**不用碰代码**。
    测试和数据的职责分离了 —— 测试人员改数据不需要懂 Python。

【为什么选 YAML 而不是 Excel/CSV】
- YAML 天然支持嵌套结构（一个用例可以带字典、列表类型的参数）
- 有注释语法，可以写清每个字段的用途
- 纯文本，git diff 友好（Excel 是二进制，改一个字整个文件都变了，没法做代码评审）
- Python 原生支持好（PyYAML）

实际项目中，如果测试同学更熟悉 Excel，也可以换 openpyxl 读 xlsx，
思路是一样的：**数据与逻辑分离**。
"""

from pathlib import Path
from typing import Any, List

import yaml

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_yaml(filename: str) -> Any:
    """
    读取 data 目录下的 YAML 文件。

    【编码为什么显式指定 utf-8】
    Windows 上 Python 的默认编码不是 utf-8（取决于系统区域设置），
    不显式指定的话，YAML 里的中文会乱码或直接抛 UnicodeDecodeError。
    这是 Windows 上跑 Python 最常见的坑之一。
    """
    path = DATA_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"测试数据文件不存在: {path}")

    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_cases(filename: str, key: str) -> List[dict]:
    """
    读取 YAML 里的用例列表，并转成 pytest.mark.parametrize 能吃的格式。

    【为什么加 ids】
    parametrize 不加 ids 时，pytest 会用整个参数字典生成用例 ID，
    结果是报告里显示一长串看不懂的东西。
    加上 ids 后，报告里显示的是 "L-02-密码错误" 这种人类可读的编号，
    失败时一眼就知道是哪个场景挂了。
    """
    data = load_yaml(filename)
    cases = data.get(key, [])
    if not cases:
        raise ValueError(f"{filename} 里没有找到用例集合 '{key}'")
    return cases
