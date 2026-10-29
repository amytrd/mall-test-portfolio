# -*- coding: utf-8 -*-
"""
日志工具

【为什么要自己配日志，而不是直接 print】
1. 接口测试出问题时，第一件事是看"请求发了什么、响应回了什么"。
   print 既没有时间戳也没有级别，出问题后无法定位。
2. 日志要能同时输出到「控制台」和「文件」：
   控制台方便实时看，文件方便跑完之后回溯（尤其是 CI 上）。
3. 日志里必须包含**请求耗时**，这是性能基线的来源。

【格式设计】
    时间 | 级别 | 消息
把请求/响应的关键字段结构化输出，出问题时一眼能看出是哪个接口、什么参数、返回了什么。
"""

import logging
import sys
from pathlib import Path

# 日志目录：api-test/logs/
LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

_LOG_FORMAT = "%(asctime)s | %(levelname)-7s | %(message)s"
_DATE_FORMAT = "%H:%M:%S"


def get_logger(name: str = "api-test") -> logging.Logger:
    """
    获取一个配置好的 logger。

    【防重复添加 handler】logging.getLogger 返回的是单例，
    如果每次都 addHandler，多模块导入时会出现重复打印（一条日志打好几遍）。
    所以这里判断 handler 是否已存在。
    """
    logger = logging.getLogger(name)

    if logger.handlers:          # 已经配置过，直接返回，避免重复
        return logger

    logger.setLevel(logging.DEBUG)

    formatter = logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT)

    # --- 控制台输出 ---
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(formatter)
    logger.addHandler(console)

    # --- 文件输出 ---
    file_handler = logging.FileHandler(LOG_DIR / "run.log", mode="w", encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


log = get_logger()
