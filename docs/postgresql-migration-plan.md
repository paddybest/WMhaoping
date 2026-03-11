# PostgreSQL 迁移计划 - 详细对比分析

## 概述

将外卖好评宝后端从 MySQL 迁移到 PostgreSQL。

---

## 一、现有代码分析

### 使用的 MySQL 特性统计

| 特性 | 使用次数 | 位置 |
|------|---------|------|
| `pool.execute()` | 47+ | 所有模型和控制器 |
| `AUTO_INCREMENT` | 30+ | 所有迁移脚本 |
| `ENGINE=InnoDB` | 12 | 迁移脚本 |
| `CHARSET=utf8mb4` | 12 | 迁移脚本 |
| `TINYINT` | 8 | 迁移脚本和模型 |
| `JSON_CONTAINS` | 4 | TagService, Tag, Review, Product |
| `NOW()` | 7 | 模型文件 |
| LIMIT/OFFSET | 7 | 模型和控制器 |

---

## 二、MySQL vs PostgreSQL 详细对比

### 1. 自增主键
```sql
-- MySQL
id INT AUTO_INCREMENT PRIMARY KEY

-- PostgreSQL
id SERIAL PRIMARY KEY
```

### 2. 数据类型映射表
| MySQL | PostgreSQL | 说明 |
|-------|------------|------|
| `TINYINT(1)` | `BOOLEAN` | 布尔值 |
| `INT` | `INTEGER` | 整数 |
| `BIGINT` | `BIGINT` | 大整数 |
| `DECIMAL(10,2)` | `NUMERIC(10,2)` | 精确小数 |
| `DATETIME` | `TIMESTAMP` | 日期时间 |
| `VARCHAR(255)` | `VARCHAR(255)` | 字符串 |
| `TEXT` | `TEXT` | 长文本 |
| `JSON` | `JSONB` | JSON数据(推荐) |

### 3. 分页语法（相同）
```sql
-- MySQL & PostgreSQL 相同
LIMIT ? OFFSET ?
```

### 4. 标识符引号
```sql
-- MySQL (反引号)
`table_name`

-- PostgreSQL (双引号)
"table_name"
```

### 5. 布尔值表示
```sql
-- MySQL
TINYINT(1) DEFAULT 1

-- PostgreSQL
BOOLEAN DEFAULT TRUE
```

### 6. 表引擎和字符集
```sql
-- MySQL
CREATE TABLE ... ENGINE=InnoDB DEFAULT CHARSET=utf8mb4

-- PostgreSQL (无需指定，默认 UTF8)
CREATE TABLE ...
```

### 7. JSON 函数（重要差异）
```sql
-- MySQL
JSON_CONTAINS(json_field, JSON_QUOTE('value'))
json_field->>'$.key'

-- PostgreSQL
jsonb_contains(jsonb_field, '"value"')
jsonb_field->>'key'
```

### 8. 时间函数（兼容）
```sql
-- MySQL & PostgreSQL 相同
NOW()
CURRENT_TIMESTAMP
```

### 9. 参数占位符
```sql
-- MySQL
WHERE id = ?

-- PostgreSQL
WHERE id = $1
```

### 10. INSERT 返回ID
```sql
-- MySQL
result.insertId

-- PostgreSQL
INSERT INTO ... RETURNING id
```

修改的具体文件

---

## 三、需要### 3.1 核心文件（P0）

| 文件 | 改动内容 |
|------|---------|
| `package.json` | mysql2 → pg |
| `src/database/connection.ts` | 完全重写 |
| `src/middleware/database.ts` | 健康检查SQL |

### 3.2 迁移脚本（12个）
- `migrations/000-create-merchants.ts`
- `migrations/001-create-product-categories.ts`
- `migrations/002-create-product-items.ts`
- `migrations/003-create-product-images.ts`
- `migrations/004-add-performance-indexes.ts`
- `migrations/005-update-merchants-table.ts`
- `migrations/006-add-multi-tenant-support.ts`
- `migrations/007-add-scan-statistics-table.ts`
- `migrations/008-create-product-tags-table.ts`
- `migrations/009-add-merchant-contact-fields.ts`
- `migrations/010-create-product-tags-association.ts`
- `migrations/011-add-cashback-tables.ts`

### 3.3 数据模型（14个）
- `models/Merchant.ts`
- `models/Product.ts`
- `models/ProductCategory.ts`
- `models/ProductImage.ts`
- `models/ProductItem.ts`
- `models/Tag.ts`
- `models/Prize.ts`
- `models/LotteryCode.ts`
- `models/User.ts`
- `models/Review.ts`
- `models/LotteryRecord.ts`
- `models/QrCodeScan.ts`
- `models/MerchantBalance.ts`
- `models/RedemptionRecord.ts`

### 3.4 控制器和路由
- `controllers/review.ts`
- `controllers/miniprogramProduct.ts`
- `routes/lottery.ts`
- `routes/auth.ts`
- `routes/stats.ts`

### 3.5 服务层
- `services/TagService.ts` (JSON函数)
- `services/qrcode.ts`

### 3.6 工具脚本
- `database/init.ts`
- `database/create-tables.ts`
- `database/setup-test-data.ts`
- `database/add-*.ts` (多个)

---

## 四、代码改动示例

### 4.1 数据库连接

```typescript
// MySQL (当前)
import mysql from 'mysql2/promise';
const pool = mysql.createPool({...});

// PostgreSQL (修改后)
import { Pool } from 'pg';
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
```

### 4.2 INSERT 返回ID

```typescript
// MySQL (当前)
const [result] = await pool.execute('INSERT INTO ... VALUES (...)');
const id = (result as any).insertId;

// PostgreSQL (修改后)
const result = await pool.query('INSERT INTO ... VALUES (...) RETURNING id', [...]);
const id = result.rows[0].id;
```

### 4.3 参数占位符

```typescript
// MySQL (当前)
pool.execute('SELECT * FROM users WHERE id = ?', [id])

// PostgreSQL (修改后)
pool.query('SELECT * FROM users WHERE id = $1', [id])
```

### 4.4 JSON 查询

```typescript
// MySQL (当前)
'SELECT * FROM products WHERE JSON_CONTAINS(tags, ?)'

// PostgreSQL (修改后)
'SELECT * FROM products WHERE tags::jsonb @> $1'
```

---

## 五、风险评估

| 风险等级 | 项目 | 说明 |
|---------|------|------|
| 🔴 高 | JSON 查询 | 需要用 JSONB 重写 |
| 🔴 高 | 参数占位符 | 全部 SQL 从 `?` 改为 `$1` |
| 🔴 高 | INSERT 返回值 | 需要 RETURNING 子句 |
| 🟡 中 | 布尔值 | `1/0` 改为 `true/false` |
| 🟢 低 | 分页 | 语法相同，参数处理不同 |

---

## 六、工作量评估

| 阶段 | 文件数 | 预计时间 |
|------|--------|---------|
| 核心改动 | 3 | 30分钟 |
| 迁移脚本 | 12 | 1.5小时 |
| 数据模型 | 14 | 2小时 |
| 控制器路由 | 5 | 1小时 |
| 服务层 | 2 | 30分钟 |
| 工具脚本 | 8 | 1小时 |
| 测试验证 | - | 1.5小时 |
| **总计** | **~45个** | **~8小时** |

---

## 七、替代方案对比

| 方案 | 工作量 | 优点 | 缺点 |
|------|--------|------|------|
| **迁移PostgreSQL** | 8小时 | 用已购买的 | 改动大 |
| **换MySQL RDS** | 1小时 | 代码不动 | 需退换数据库 |
| **ECS自建MySQL** | 2小时 | 灵活 | 需维护 |

---

## 八、确认

请选择：

1. **继续 PostgreSQL 迁移** - 开始实施
2. **换成 MySQL RDS** - 退换数据库
3. **ECS 自建 MySQL** - Docker 运行

你的选择？
