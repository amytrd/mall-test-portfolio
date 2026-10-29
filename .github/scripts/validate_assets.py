# -*- coding: utf-8 -*-
"""Portfolio asset validation.

Runs on every push / pull request. It does not need the mall backend:
- JSON assets (Postman collections / environments) must parse
- YAML test data must parse
- JMeter JMX files must be well-formed XML
- Published text files must not contain local absolute paths or live JWTs
- Every report linked from docs/index.html must exist
"""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

JSON_FILES = [
    "test-artifacts/postman/mall-admin.postman_collection.json",
    "test-artifacts/postman/mall-local.postman_environment.json",
    "docs/evidence/downloads/mall-admin.postman_collection.json",
    "docs/evidence/downloads/mall-local.postman_environment.json",
]

YAML_FILES = [
    "test-artifacts/pytest/data/login_cases.yaml",
]

JMX_FILES = [
    "test-artifacts/jmeter/登录接口压测.jmx",
    "test-artifacts/jmeter/商品列表查询压测.jmx",
    "test-artifacts/jmeter/订单查询压测.jmx",
]

TEXT_SUFFIXES = {".md", ".html", ".yml", ".yaml", ".py", ".json", ".jmx", ".csv", ".txt", ".ini"}

# Local absolute paths that should never be published.
LOCAL_PATH_PATTERNS = [
    re.compile(r"[A-Za-z]:\\test\\", re.IGNORECASE),
    re.compile(r"[A-Za-z]:\\Users\\", re.IGNORECASE),
    re.compile(r"/Users/[^/\s]+/"),
    re.compile(r"/home/[^/\s]+/"),
]

# A JWT prefix followed by a long base64url payload is a real-looking token.
# The repository only keeps truncated examples ("eyJ...") on purpose.
JWT_PATTERN = re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")

errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def check_exists(path: str) -> Path:
    target = ROOT / path
    if not target.exists():
        fail(f"missing file: {path}")
    return target


def main() -> int:
    for path in JSON_FILES:
        target = check_exists(path)
        if not target.exists():
            continue
        try:
            json.loads(target.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001 - report the parse error verbatim
            fail(f"invalid JSON: {path}: {exc}")

    try:
        import yaml  # type: ignore
    except ImportError:
        yaml = None

    for path in YAML_FILES:
        target = check_exists(path)
        if not target.exists():
            continue
        if yaml is None:
            fail("PyYAML is required to validate YAML assets")
            break
        try:
            yaml.safe_load(target.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            fail(f"invalid YAML: {path}: {exc}")

    for path in JMX_FILES:
        target = check_exists(path)
        if not target.exists():
            continue
        try:
            ET.parse(target)
        except Exception as exc:  # noqa: BLE001
            fail(f"invalid XML: {path}: {exc}")

    # Published text files: no local absolute paths, no live-looking JWTs.
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        if any(part in {".git", ".venv", "__pycache__", ".pytest_cache"} for part in path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        relative = path.relative_to(ROOT).as_posix()
        if relative == ".github/scripts/validate_assets.py":
            continue
        for pattern in LOCAL_PATH_PATTERNS:
            if pattern.search(text):
                fail(f"local absolute path found in {relative}: {pattern.pattern}")
        if JWT_PATTERN.search(text):
            fail(f"live-looking JWT found in {relative}")

    # Every report linked from the landing page must exist.
    index = check_exists("docs/index.html")
    if index.exists():
        html = index.read_text(encoding="utf-8")
        for href in sorted(set(re.findall(r'href="(reports/[^"#]+\.html)"', html))):
            target = ROOT / "docs" / href
            if target.exists():
                continue
            # GitHub Pages renders the Markdown source into .html at deploy time.
            markdown_source = target.with_suffix(".md")
            if not markdown_source.exists():
                fail(f"index.html links to a missing report: docs/{href}")

    if errors:
        print("Asset validation failed:\n")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("Asset validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
