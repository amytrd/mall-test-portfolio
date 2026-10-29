---
layout: report
title: SQL 与日志分析
description: 多表查询、字符集排查、事务安全验证与 Linux 日志定位命令
---

> 对应岗位要求：SQL 增删改查 + 多表查询；Linux 常用命令 + 查看日志定位问题
> 说明：本项目在 Windows 本机执行，服务端日志定位使用 PowerShell；文末给出**等价的 Linux 命令对照**，排查思路完全一致。

## 一、SQL：从"会写"到"用于测试"

测试中的 SQL 不只是"查一条数据看看"，而是承担四类工作：

| 用途 | 示例 | 产出 |
|---|---|---|
| 测试数据准备与核对 | 查账号、商品、订单 | 确认可用账号仅 `admin` / `macro` |
| 多表数据一致性校验 | 订单 ↔ 订单明细对账 | 发现金额/数量不一致的订单 |
| 缺陷根因定位 | `information_schema` 查列字符集 | 定位 DEFECT-06 |
| 安全验证 | 事务内 UPDATE + ROLLBACK | 验证写操作不影响环境 |

### 1.1 基础增删改查

```sql
-- 查：确认后台账号与状态
SELECT id, username, nick_name, status
FROM ums_admin
WHERE status = 1
ORDER BY id;

-- 查：按品牌过滤商品（接口测试的数据层断言依据）
SELECT id, name, brand_id, price, stock
FROM pms_product
WHERE brand_id = 3 AND delete_status = 0
ORDER BY id
LIMIT 10;

-- 增：测试数据准备（执行后必须清理）
INSERT INTO pms_brand (name, first_letter, sort, factory_status, show_status)
VALUES ('自动化测试品牌_ZZ', 'Z', 0, 0, 1);

-- 改：事务内验证库存扣减，随后回滚
START TRANSACTION;
UPDATE pms_product SET stock = stock - 1 WHERE id = 26 AND stock > 0;
SELECT ROW_COUNT() AS affected_rows;
ROLLBACK;

-- 删：只删除自己创建的数据
DELETE FROM pms_brand WHERE name = '自动化测试品牌_ZZ';
```

> **测试原则**：写操作优先放在事务里验证并 `ROLLBACK`；必须落库的测试数据使用可识别的命名前缀（如 `_ZZ`），并附清理 SQL。

### 1.2 多表查询一：商品 + 品牌 + 分类

用于核对接口返回的 `brandName`、`categoryName` 是否与数据库一致：

```sql
SELECT
    p.id            AS product_id,
    p.name          AS product_name,
    b.name          AS brand_name,
    c.name          AS category_name,
    p.price,
    p.stock,
    p.publish_status
FROM pms_product p
LEFT JOIN pms_brand b
       ON b.id = p.brand_id
LEFT JOIN pms_product_category c
       ON c.id = p.product_category_id
WHERE p.delete_status = 0
ORDER BY p.id
LIMIT 20;
```

**测试用途**：接口按 `brandId` 过滤时，除了断言 `code=200`，还遍历返回列表逐个断言 `brandId` 等于查询条件 —— 防止服务端忽略过滤条件、返回全量数据。

### 1.3 多表查询二：订单 + 订单明细对账

验证订单主表金额与明细汇总是否一致：

```sql
SELECT
    o.id,
    o.order_sn,
    o.member_username,
    o.total_amount,
    o.status,
    COUNT(oi.id)                    AS item_count,
    COALESCE(SUM(oi.product_quantity), 0) AS total_qty,
    COALESCE(SUM(oi.real_amount), 0)      AS item_amount
FROM oms_order o
LEFT JOIN oms_order_item oi
       ON oi.order_id = o.id
GROUP BY o.id, o.order_sn, o.member_username, o.total_amount, o.status
HAVING ABS(COALESCE(SUM(oi.real_amount), 0) - o.total_amount) > 0.01
ORDER BY o.id DESC
LIMIT 20;
```

**测试用途**：这是一条"找异常数据"的查询。正常订单的明细金额之和应等于订单总额；`HAVING` 只返回不一致的记录。测试数据一致性时，这类查询比逐条人工核对高效得多。

### 1.4 多表查询三：用户与角色/资源（权限模型）

mall 的动态权限基于 `ums_admin`、`ums_role`、`ums_admin_role_relation`、`ums_resource` 等表。排查 DEFECT-04 的 403 时，需要确认请求路径是否在资源表中：

```sql
SELECT r.id, r.name, r.url, r.category_id
FROM ums_resource r
WHERE r.url LIKE '/v3/api-docs%';
```

结果为空 —— 这解释了为什么带合法 admin token 访问 `/v3/api-docs` 仍然返回 403：动态权限管理器把请求路径与资源表逐条比对，路径不在表中即拒绝。

### 1.5 缺陷定位：查全库 utf8mb3 列（DEFECT-06）

```sql
-- 1) 确认具体列的字符集与排序规则
SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'mall'
  AND TABLE_NAME = 'ums_admin'
  AND COLUMN_NAME = 'username';

-- 2) 统计全库仍是 utf8mb3 的 varchar/text 列
SELECT COUNT(*) AS utf8mb3_columns
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'mall'
  AND CHARACTER_SET_NAME = 'utf8mb3'
  AND DATA_TYPE IN ('varchar', 'text', 'mediumtext', 'longtext');

-- 3) 按表汇总，评估改造范围
SELECT TABLE_NAME, COUNT(*) AS column_count
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'mall'
  AND CHARACTER_SET_NAME = 'utf8mb3'
GROUP BY TABLE_NAME
ORDER BY column_count DESC;
```

**结果**：`ums_admin.username` 为 `utf8mb3_general_ci`，`mall` 库默认 `utf8mb4`，全库共 **211 个** varchar/text 列仍是 utf8mb3。

**数据库端复现**：

```sql
SELECT 1 FROM mall.ums_admin WHERE username = '管理员🔒';
-- ERROR 1267 (HY000): Illegal mix of collations
-- (utf8mb3_general_ci,IMPLICIT) and (utf8mb4_0900_ai_ci,COERCIBLE) for operation '='
```

这一步把问题从"应用层报错"坐实为"数据库字符集不一致"，排除了框架因素。

### 1.6 索引与执行计划

接口性能测试发现商品/订单查询约 800–900 TPS 触顶，除连接池因素外，也检查了查询是否走索引：

```sql
EXPLAIN
SELECT id, name, price, stock
FROM pms_product
WHERE brand_id = 3 AND delete_status = 0
ORDER BY id
LIMIT 10;
```

关注 `type`（避免 `ALL` 全表扫描）、`key`（实际使用的索引）、`rows`（预估扫描行数）。本次数据量仅 38 个商品，执行计划参考价值有限；生产数据量下应重点检查分页深翻页与排序字段索引。

## 二、日志定位：从现象到根因

### 2.1 案例一：定位 emoji 500 的真实异常

客户端只看到 `401 暂未登录`（被 DEFECT-01 掩盖），真实异常在服务端日志：

```powershell
# Windows：在日志中定位异常关键字及上下文
Select-String -Path "logs\mall-admin.log" -Pattern "Illegal mix of collations" -Context 3,8
```

```bash
# Linux 等价命令
grep -n -A 8 -B 3 "Illegal mix of collations" logs/mall-admin.log
```

拿到：

```
java.sql.SQLException: Illegal mix of collations
(utf8mb3_general_ci,IMPLICIT) and (utf8mb4_0900_ai_ci,COERCIBLE) for operation '='
### The error may involve com.macro.mall.mapper.UmsAdminMapper.selectByExample
```

**排查链**：客户端 500 → 日志找真实异常 → 对照实验（3 字节 vs 4 字节）→ 查 `information_schema` → MySQL 端复现 → 定位到 MySQL 5.7 遗留的 utf8mb3 列。

### 2.2 案例二：从日志体积异常发现明文密码

压测后日志文件涨到 **1.84 GB**。先看体积和增长：

```powershell
Get-ChildItem logs\ | Sort-Object Length -Descending | Select-Object Name, Length
```

```bash
# Linux
du -sh logs/
ls -lhS logs/ | head
```

再看日志内容里在刷什么：

```powershell
Select-String -Path "logs\mall-admin.log" -Pattern '"password"' | Select-Object -First 3
```

```bash
grep -m 3 '"password"' logs/mall-admin.log
```

结果发现每行都包含完整请求体和响应体：

```json
{
  "uri": "/admin/login",
  "parameter": {"username": "admin", "password": "macro123"},
  "result": {"data": {"tokenHead": "Bearer ", "token": "eyJ..."}}
}
```

**排查链**：日志体积异常 → 查看内容 → 发现明文密码/Token → 读 `WebLogAspect` 源码 → 确认为 INFO 级别、无脱敏、覆盖全部 Controller → DEFECT-05。

### 2.3 Linux 常用命令对照

| 目的 | Linux | Windows PowerShell（本项目实际使用） |
|---|---|---|
| 实时看日志 | `tail -f logs/app.log` | `Get-Content logs\app.log -Wait -Tail 50` |
| 关键字 + 行号 | `grep -n "ERROR" logs/app.log` | `Select-String -Path logs\app.log -Pattern "ERROR"` |
| 带上下文 | `grep -A 10 -B 3 "Exception" logs/app.log` | `Select-String ... -Context 3,10` |
| 统计出现次数 | `grep -c "password" logs/app.log` | `(Select-String ...).Count` |
| 按时间过滤 | `sed -n '/2026-09-30 20:/p' logs/app.log` | `Select-String -Pattern "2026-09-30 20:"` |
| 取某列统计 TopN | `awk '{print $1}' access.log \| sort \| uniq -c \| sort -rn \| head` | `Group-Object` + `Sort-Object` |
| 查端口占用 | `ss -lntp \| grep 8080` | `Get-NetTCPConnection -LocalPort 8080` |
| 查进程 | `ps -ef \| grep mall-admin` | `Get-Process java` |
| 磁盘占用 | `du -sh logs/` | `(Get-ChildItem logs -Recurse \| Measure-Object Length -Sum).Sum` |
| 系统服务日志 | `journalctl -u mall-admin --since "10 min ago"` | 事件查看器 / 服务日志文件 |
| 日志轮转 | `logrotate` | 定时任务 + 按日期归档 |

> 结论：工具不同，方法一致 —— **先定位异常关键字，再看上下文，最后回到代码**。日志是客户端现象与服务端根因之间唯一的桥。

## 三、从 SQL/日志到测试用例

这两类技能不是孤立存在的，它们直接反哺了用例设计：

| 发现 | 反哺的用例 |
|---|---|
| `ums_admin` 只有 2 个可用账号 | 登录正向用例参数化，JMeter `users.csv` 只放 `admin` / `macro` |
| 商品 DTO 零校验注解 | 设计「空对象创建商品」用例，穿透到 SQL 层，发现 DEFECT-02 |
| `information_schema` 显示 211 个 utf8mb3 列 | 设计 emoji 边界用例，发现 DEFECT-06 |
| 日志中记录完整请求体 | 设计「日志脱敏」检查项，形成 DEFECT-05 的证据链 |
| `ums_resource` 无 api-docs 路径 | 解释 DEFECT-04 的 403，避免误报为 token 问题 |
