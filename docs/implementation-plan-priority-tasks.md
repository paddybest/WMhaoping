# 多租户架构完善计划

**创建日期**: 2026-02-16
**版本**: 1.0
**基于**: `docs/review/multi-tenant-completion-review.md`
**目标**: 完成多租户架构的优先级任务，确保系统可正常运行

---

## 📋 执行概览

### 完成状态概览

| 优先级 | 任务类别 | 预估时间 | 风险级别 | 状态 |
|--------|----------|----------|----------|------|
| **P1** | 数据库迁移执行 | 2-3h | 🔴 高 | 待执行 |
| **P1** | 端到端测试 | 3-4h | 🟠 中高 | 待执行 |
| **P2** | 文档完善 | 2-3h | 🟡 中 | 待完成 |
| **P2** | 环境配置优化 | 1h | 🟡 中 | 待完成 |
| **P2** | 单元测试 | 2-3h | 🟡 中 | 待完成 |

**总预估时间**: 10-14小时
**推荐执行顺序**: P1 → P2

---

## 🎯 优先级1（必须完成 - 阻塞系统运行）

### 任务1: 执行数据库迁移

**任务描述**
执行数据库迁移脚本，将单租户系统升级为多租户架构，包括添加merchant_id字段、外键约束和索引。

**优先级**: P1 - 必须完成
**预估时间**: 2-3小时
**依赖关系**: 无
**风险级别**: 🔴 高

#### 具体步骤

##### 1.1 准备阶段 (30分钟)

**步骤1.1.1: 备份数据库**
```bash
# 方法1: 使用mysqldump备份
mysqldump -u root -p haopingbao > backup_$(date +%Y%m%d_%H%M%S).sql

# 方法2: 导出为带时间戳的文件
mysqldump -h localhost -u root -p haopingbao > backup_before_migration.sql
```

**验证标准**:
- [ ] 备份文件成功生成
- [ ] 备份文件大小合理（> 100KB）
- [ ] 备份文件可查看内容（head/less命令）

**步骤1.1.2: 验证迁移前数据库状态**
```sql
-- 检查当前表结构
DESC merchants;
DESC prizes;
DESC lottery_codes;

-- 检查现有数据量
SELECT COUNT(*) FROM merchants;
SELECT COUNT(*) FROM prizes;
SELECT COUNT(*) FROM lottery_codes;

-- 检查是否已有merchant_id字段
SHOW COLUMNS FROM prizes LIKE 'merchant_id';
SHOW COLUMNS FROM lottery_codes LIKE 'merchant_id';
```

**验证标准**:
- [ ] 记录现有数据量
- [ ] 确认merchant_id字段不存在（或需要更新）
- [ ] 至少有一个merchant记录（id=1）

**步骤1.1.3: 检查环境配置**
```bash
# 确认数据库连接配置
cat backend/.env | grep -E "DB_HOST|DB_PORT|DB_USER|DB_PASSWORD|DB_NAME"

# 测试数据库连接
cd backend
node -e "require('./src/database/connection').pool.query('SELECT 1').then(() => console.log('Connection OK')).catch(e => console.error(e))"
```

**验证标准**:
- [ ] 环境变量已正确配置
- [ ] 数据库连接成功

##### 1.2 执行迁移 (1小时)

**步骤1.2.1: 执行迁移006 - 多租户支持**
```bash
cd backend

# 方法1: 使用npm脚本（推荐）
npm run migrate

# 方法2: 直接运行迁移文件
npx ts-node src/database/migrations/run-migration.ts

# 方法3: 编译后运行
npm run build
node dist/database/migrations/run-migration.js
```

**预期输出**:
```
🚀 Starting migration: Add multi-tenant support...

📋 Step 1: Verifying default merchant exists...
✅ Default merchant (id=1) verified

📋 Step 2: Extending merchants table with QR code URLs...
  ✓ Added customer_service_qr_url column
  ✓ Added qr_code_url column

📋 Step 3: Adding merchant_id to prizes table...
  ✓ Added merchant_id column to prizes
  ✓ Migrated X existing prize records to merchant_id=1
  ✓ Set merchant_id to NOT NULL
  ✓ Added foreign key constraint
  ✓ Created index on merchant_id

📋 Step 4: Adding merchant_id to lottery_codes table...
  ✓ Added merchant_id column to lottery_codes
  ✓ Migrated X existing lottery code records to merchant_id=1
  ✓ Set merchant_id to NOT NULL
  ✓ Added foreign key constraint
  ✓ Created index on merchant_id

✅ Multi-tenant support migration completed successfully!
```

**验证标准**:
- [ ] 迁移成功完成，无错误
- [ ] 显示迁移的数据量统计
- [ ] 外键约束创建成功
- [ ] 索引创建成功

**步骤1.2.2: 执行迁移007 - 扫码统计表**
```bash
# 如果使用单独的迁移运行器
npx ts-node src/database/migrations/run-migration.ts

# 或者直接执行
npx ts-node -e "require('./src/database/migrations/007-add-scan-statistics-table').up()"
```

**预期输出**:
```
🚀 Starting migration: Add scan statistics table...

📋 Step 1: Creating qr_code_scans table...
  ✓ qr_code_scans table created

📋 Step 2: Creating qr_scan_statistics table...
  ✓ qr_scan_statistics table created

📋 Step 3: Creating daily_scan_stats view...
  ✓ daily_scan_stats view created

✅ Scan statistics migration completed successfully!
```

**验证标准**:
- [ ] qr_code_scans表创建成功
- [ ] qr_scan_statistics表创建成功
- [ ] daily_scan_stats视图创建成功

##### 1.3 验证迁移结果 (30分钟)

**步骤1.3.1: 验证表结构**
```sql
-- 检查merchants表新字段
DESC merchants;
-- 预期结果: 应该包含 customer_service_qr_url, qr_code_url 字段

-- 检查prizes表
DESC prizes;
-- 预期结果: 应该包含 merchant_id 字段, NOT NULL约束

-- 检查lottery_codes表
DESC lottery_codes;
-- 预期结果: 应该包含 merchant_id 字段, NOT NULL约束

-- 检查扫码统计表
DESC qr_code_scans;
DESC qr_scan_statistics;
```

**验证标准**:
- [ ] merchants表包含customer_service_qr_url和qr_code_url字段
- [ ] prizes表包含merchant_id字段且NOT NULL
- [ ] lottery_codes表包含merchant_id字段且NOT NULL
- [ ] qr_code_scans和qr_scan_statistics表存在

**步骤1.3.2: 验证外键约束**
```sql
-- 检查prizes表外键
SELECT
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'prizes' AND REFERENCED_TABLE_NAME = 'merchants';

-- 检查lottery_codes表外键
SELECT
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'lottery_codes' AND REFERENCED_TABLE_NAME = 'merchants';
```

**验证标准**:
- [ ] prizes表有fk_prizes_merchant外键约束
- [ ] lottery_codes表有fk_lottery_codes_merchant外键约束
- [ ] 外键都指向merchants(id)且ON DELETE CASCADE

**步骤1.3.3: 验证索引**
```sql
-- 检查prizes表索引
SHOW INDEX FROM prizes WHERE Key_name LIKE '%merchant%';

-- 检查lottery_codes表索引
SHOW INDEX FROM lottery_codes WHERE Key_name LIKE '%merchant%';

-- 检查merchants表索引
SHOW INDEX FROM merchants;
```

**验证标准**:
- [ ] prizes表有idx_prizes_merchant_id索引
- [ ] lottery_codes表有idx_lottery_codes_merchant_id索引
- [ ] merchants表有idx_name和idx_is_active索引

**步骤1.3.4: 验证数据完整性**
```sql
-- 检查数据迁移情况
SELECT
    COUNT(*) as total_prizes,
    COUNT(DISTINCT merchant_id) as merchant_count,
    merchant_id
FROM prizes
GROUP BY merchant_id;

SELECT
    COUNT(*) as total_codes,
    COUNT(DISTINCT merchant_id) as merchant_count,
    merchant_id
FROM lottery_codes
GROUP BY merchant_id;

-- 检查是否有数据缺失merchant_id
SELECT COUNT(*) FROM prizes WHERE merchant_id IS NULL;
SELECT COUNT(*) FROM lottery_codes WHERE merchant_id IS NULL;
```

**验证标准**:
- [ ] 所有prizes记录都有merchant_id
- [ ] 所有lottery_codes记录都有merchant_id
- [ ] merchant_id = 1 的数据量与迁移前一致

**步骤1.3.5: 测试外级联删除**
```sql
-- 注意: 此步骤仅在测试环境执行，不要在生产环境执行
-- 创建测试merchant
INSERT INTO merchants (username, password, shop_name, is_active)
VALUES ('test_delete', 'hashed_password', 'Test Delete', 1);

-- 获取测试merchant ID
SET @test_merchant_id = LAST_INSERT_ID();

-- 创建测试数据
INSERT INTO prizes (merchant_id, name, description, probability, stock)
VALUES (@test_merchant_id, 'Test Prize', 'Test', 0.5, 10);

INSERT INTO lottery_codes (merchant_id, code, prize_id, status)
VALUES (@test_merchant_id, 'TEST001', LAST_INSERT_ID(), 0);

-- 删除测试merchant（应该级联删除相关数据）
DELETE FROM merchants WHERE id = @test_merchant_id;

-- 验证数据已删除
SELECT COUNT(*) FROM prizes WHERE merchant_id = @test_merchant_id; -- 应为0
SELECT COUNT(*) FROM lottery_codes WHERE merchant_id = @test_merchant_id; -- 应为0
```

**验证标准**:
- [ ] 删除merchant后，相关prizes和lottery_codes被级联删除
- [ ] 外级联约束工作正常

##### 1.4 异常处理 (30分钟)

**如果迁移失败，执行以下回滚步骤**:

```bash
# 回滚迁移006
npx ts-node -e "require('./src/database/migrations/006-add-multi-tenant-support').down()"

# 恢复数据库备份
mysql -u root -p haopingbao < backup_before_migration.sql

# 验证恢复
SELECT COUNT(*) FROM merchants;
SELECT COUNT(*) FROM prizes;
```

**常见问题处理**:

**问题1: "Default merchant (id=1) does not exist"**
```sql
-- 解决方案: 创建默认merchant
INSERT INTO merchants (id, username, password, shop_name, is_active)
VALUES (1, 'default', 'hashed_password', 'Default Merchant', 1);
```

**问题2: "Column already exists"**
```sql
-- 解决方案: 检查列是否存在，如果存在则先删除
ALTER TABLE prizes DROP COLUMN IF EXISTS merchant_id;
ALTER TABLE lottery_codes DROP COLUMN IF EXISTS merchant_id;
ALTER TABLE merchants DROP COLUMN IF EXISTS customer_service_qr_url;
ALTER TABLE merchants DROP COLUMN IF EXISTS qr_code_url;
```

**问题3: "Foreign key constraint fails"**
```sql
-- 解决方案: 检查并修复数据完整性
-- 1. 找出孤立的prizes记录
SELECT * FROM prizes WHERE merchant_id NOT IN (SELECT id FROM merchants);

-- 2. 找出孤立的lottery_codes记录
SELECT * FROM lottery_codes WHERE merchant_id NOT IN (SELECT id FROM merchants);

-- 3. 将孤立记录分配给merchant_id=1或删除
UPDATE prizes SET merchant_id = 1 WHERE merchant_id NOT IN (SELECT id FROM merchants);
UPDATE lottery_codes SET merchant_id = 1 WHERE merchant_id NOT IN (SELECT id FROM merchants);
```

#### 验收标准

**必须满足**:
- [ ] 所有迁移脚本成功执行
- [ ] 数据库表结构符合设计文档要求
- [ ] 外键约束正确创建并生效
- [ ] 所有索引正确创建
- [ ] 现有数据成功迁移到merchant_id=1
- [ ] 无数据丢失或损坏
- [ ] 数据完整性验证通过
- [ ] 外级联删除测试通过

**文档记录**:
- [ ] 备份文件路径已记录
- [ ] 迁移日志已保存
- [ ] 验证结果截图/日志已保存

---

### 任务2: 端到端测试

**任务描述**
创建测试商家，测试数据隔离、跨商家访问防护、错误场景和二维码防伪造功能。

**优先级**: P1 - 必须完成
**预估时间**: 3-4小时
**依赖关系**: 任务1（数据库迁移）
**风险级别**: 🟠 中高

#### 具体步骤

##### 2.1 测试环境准备 (30分钟)

**步骤2.1.1: 启动后端服务**
```bash
cd backend

# 确保环境变量配置正确
cat .env | grep -E "PORT|DB_HOST|DB_NAME|JWT_SECRET"

# 安装依赖（如果需要）
npm install

# 启动开发服务器
npm run dev
```

**验证标准**:
- [ ] 后端服务成功启动
- [ ] 服务运行在配置的端口（默认5000）
- [ ] 无启动错误或警告

**步骤2.1.2: 验证健康检查**
```bash
curl http://localhost:5000/health
```

**预期响应**:
```json
{
  "status": "OK",
  "timestamp": "2026-02-16T...",
  "version": "1.0.0",
  "environment": "development"
}
```

**验证标准**:
- [ ] 健康检查端点返回200状态码
- [ ] 响应格式正确

##### 2.2 创建测试商家 (45分钟)

**步骤2.2.1: 创建商家A（测试数据隔离）**
```bash
curl -X POST http://localhost:5000/api/merchant/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "merchant_a",
    "password": "password123",
    "shop_name": "商家A测试店"
  }'
```

**预期响应**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "merchant": {
    "id": 2,
    "username": "merchant_a",
    "shop_name": "商家A测试店"
  }
}
```

**记录**:
- 保存商家A的token: `MERCHANT_A_TOKEN`
- 保存商家A的ID: `MERCHANT_A_ID`

**步骤2.2.2: 创建商家B（测试跨商家防护）**
```bash
curl -X POST http://localhost:5000/api/merchant/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "merchant_b",
    "password": "password456",
    "shop_name": "商家B测试店"
  }'
```

**记录**:
- 保存商家B的token: `MERCHANT_B_TOKEN`
- 保存商家B的ID: `MERCHANT_B_ID`

**步骤2.2.3: 为商家A创建测试数据**
```bash
# 创建分类
curl -X POST http://localhost:5000/api/merchant/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_A_TOKEN" \
  -d '{
    "name": "商家A分类",
    "description": "测试分类"
  }'

# 创建商品
curl -X POST http://localhost:5000/api/merchant/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_A_TOKEN" \
  -d '{
    "category_id": 1,
    "name": "商家A商品1",
    "description": "测试商品",
    "tags": "测试,商品",
    "price": 100.00
  }'

# 创建奖品
curl -X POST http://localhost:5000/api/merchant/prizes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_A_TOKEN" \
  -d '{
    "name": "商家A奖品",
    "description": "测试奖品",
    "probability": 0.5,
    "stock": 10
  }'
```

**验证标准**:
- [ ] 商家A和商家B注册成功
- [ ] 商家A的测试数据创建成功
- [ ] 所有API返回成功响应

##### 2.3 测试数据隔离 (1小时)

**测试2.3.1: 商家A只能看到自己的数据**
```bash
# 商家A获取自己的商品列表
curl http://localhost:5000/api/merchant/products \
  -H "Authorization: Bearer $MERCHANT_A_TOKEN"

# 预期: 只返回merchant_id = MERCHANT_A_ID的商品
```

**验证标准**:
- [ ] 返回的商品都是商家A的
- [ ] 商品数量与创建的一致
- [ ] 每个商品的merchant_id等于MERCHANT_A_ID

**测试2.3.2: 商家B只能看到自己的数据**
```bash
# 商家B获取商品列表（应该为空）
curl http://localhost:5000/api/merchant/products \
  -H "Authorization: Bearer $MERCHANT_B_TOKEN"

# 预期: 返回空数组 []
```

**验证标准**:
- [ ] 商家B看不到商家A的商品
- [ ] 返回空数组

**测试2.3.3: 验证SQL查询隔离**
```sql
-- 直接查询数据库验证
SELECT id, name, merchant_id FROM product_items WHERE merchant_id = $MERCHANT_A_ID;
SELECT id, name, merchant_id FROM product_items WHERE merchant_id = $MERCHANT_B_ID;
```

**验证标准**:
- [ ] 商家A的商品merchant_id正确
- [ ] 商家B没有商品
- [ ] 数据在数据库层面正确隔离

##### 2.4 测试跨商家访问防护 (1小时)

**测试2.4.1: 商家B尝试访问商家A的商品**
```bash
# 商家B尝试获取商家A的商品ID
PRODUCT_ID=$(curl -s http://localhost:5000/api/merchant/products \
  -H "Authorization: Bearer $MERCHANT_A_TOKEN" \
  | jq -r '.data[0].id')

# 商家B尝试更新商家A的商品
curl -X PUT http://localhost:5000/api/merchant/products/$PRODUCT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_B_TOKEN" \
  -d '{
    "name": "尝试篡改",
    "description": "恶意修改"
  }'

# 预期: 返回403 Forbidden
```

**预期响应**:
```json
{
  "success": false,
  "error": "Access denied",
  "message": "You do not have permission to access this resource"
}
```

**验证标准**:
- [ ] 返回403状态码
- [ ] 错误消息清晰
- [ ] 商家A的数据未被修改

**测试2.4.2: 商家B尝试删除商家A的商品**
```bash
curl -X DELETE http://localhost:5000/api/merchant/products/$PRODUCT_ID \
  -H "Authorization: Bearer $MERCHANT_B_TOKEN"

# 预期: 返回403 Forbidden
```

**验证标准**:
- [ ] 返回403状态码
- [ ] 商家A的商品未被删除

**测试2.4.3: 商家B尝试访问商家A的奖品**
```bash
# 获取商家A的奖品ID
PRIZE_ID=$(curl -s http://localhost:5000/api/merchant/prizes \
  -H "Authorization: Bearer $MERCHANT_A_TOKEN" \
  | jq -r '.data[0].id')

# 商家B尝试访问
curl http://localhost:5000/api/merchant/prizes/$PRIZE_ID \
  -H "Authorization: Bearer $MERCHANT_B_TOKEN"

# 预期: 返回403 Forbidden
```

**验证标准**:
- [ ] 返回403状态码
- [ ] 奖品数据未被访问

**测试2.4.4: 验证中间件日志**
```bash
# 查看后端日志，确认中间件正确拦截
tail -f logs/combined.log

# 应该看到类似日志:
# [INFO] validateMerchantAccess: Merchant $MERCHANT_B_ID tried to access resource of merchant $MERCHANT_A_ID - Access denied
```

**验证标准**:
- [ ] 日志记录了跨商家访问尝试
- [ ] 访问被中间件正确拦截

##### 2.5 测试错误场景 (30分钟)

**测试2.5.1: 无效的merchant_id**
```bash
# 小程序端访问不存在的merchant
curl "http://localhost:5000/api/miniprogram/merchant/999999"

# 预期: 返回404 Not Found
```

**预期响应**:
```json
{
  "success": false,
  "error": "Merchant not found",
  "code": "MERCHANT_NOT_FOUND"
}
```

**验证标准**:
- [ ] 返回404状态码
- [ ] 错误码清晰

**测试2.5.2: 未营业的商家**
```sql
-- 在数据库中将商家A设置为未营业
UPDATE merchants SET is_active = 0 WHERE id = $MERCHANT_A_ID;
```

```bash
# 尝试访问商家A
curl "http://localhost:5000/api/miniprogram/merchant/$MERCHANT_A_ID"

# 预期: 返回400 Bad Request或自定义错误码
```

**验证标准**:
- [ ] 返回适当的错误状态码
- [ ] 错误消息说明商家未营业

**测试2.5.3: 缺少merchant_id参数**
```bash
# 小程序端API不带merchant_id
curl "http://localhost:5000/api/miniprogram/products"

# 预期: 返回400 Bad Request
```

**验证标准**:
- [ ] 返回400状态码
- [ ] 错误消息说明缺少必需参数

**测试2.5.4: 无效的JWT token**
```bash
# 使用无效token
curl http://localhost:5000/api/merchant/products \
  -H "Authorization: Bearer invalid_token_here"

# 预期: 返回401 Unauthorized
```

**验证标准**:
- [ ] 返回401状态码
- [ ] 错误消息说明token无效

##### 2.6 测试二维码防伪造 (30分钟)

**测试2.6.1: 验证签名生成**
```bash
# 获取商家A的二维码URL
QR_URL=$(curl -s http://localhost:5000/api/merchant/qrcode \
  -H "Authorization: Bearer $MERCHANT_A_TOKEN" \
  | jq -r '.data.qr_code_url')

# 解析URL参数
echo $QR_URL
# 预期格式: https://domain.com/pages/index/index?merchant_id=2&signature=xxx
```

**验证标准**:
- [ ] 二维码URL包含merchant_id参数
- [ ] 二维码URL包含signature参数
- [ ] signature不是明文merchant_id

**测试2.6.2: 测试签名验证（有效签名）**
```bash
# 使用有效签名访问小程序API
curl "http://localhost:5000/api/miniprogram/merchant/$MERCHANT_A_ID?signature=valid_signature"

# 预期: 返回商家信息
```

**验证标准**:
- [ ] 有效签名可以通过验证
- [ ] 返回正确的商家数据

**测试2.6.3: 测试签名验证（无效签名）**
```bash
# 使用无效签名
curl "http://localhost:5000/api/miniprogram/merchant/$MERCHANT_A_ID?signature=invalid_signature"

# 预期: 返回403 Forbidden
```

**预期响应**:
```json
{
  "success": false,
  "error": "Invalid QR code signature",
  "code": "INVALID_QR"
}
```

**验证标准**:
- [ ] 返回403状态码
- [ ] 错误码为INVALID_QR

**测试2.6.4: 测试签名篡改**
```bash
# 篡改merchant_id
curl "http://localhost:5000/api/miniprogram/merchant/$MERCHANT_B_ID?signature=merchant_a_signature"

# 预期: 返回403 Forbidden
```

**验证标准**:
- [ ] 篡改merchant_id导致签名验证失败
- [ ] 返回403状态码

**测试2.6.5: 验证小程序端错误处理**
```bash
# 模拟小程序收到错误响应
# 检查小程序错误页面是否能正确显示
```

**验证标准**:
- [ ] 小程序能正确处理INVALID_QR错误
- [ ] 错误页面显示正确的错误信息
- [ ] 提供重试按钮

##### 2.7 测试扫码统计 (30分钟)

**测试2.7.1: 记录扫码事件**
```bash
# 模拟用户扫码
curl -X POST http://localhost:5000/api/miniprogram/scan \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_id": '$MERCHANT_A_ID',
    "user_openid": "test_user_001",
    "qr_code_url": "https://domain.com/pages/index/index?merchant_id='$MERCHANT_A_ID'",
    "ip_address": "127.0.0.1"
  }'

# 预期: 返回200 OK
```

**验证标准**:
- [ ] 扫码记录成功创建
- [ ] 返回成功响应

**测试2.7.2: 查询扫码统计**
```bash
# 商家A查询扫码统计
curl http://localhost:5000/api/merchant/scan \
  -H "Authorization: Bearer $MERCHANT_A_TOKEN"

# 预期: 返回扫码统计数据
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "total_scans": 1,
    "unique_users": 1,
    "today_scans": 1,
    "scans_by_date": [
      {
        "date": "2026-02-16",
        "total": 1,
        "unique_users": 1
      }
    ]
  }
}
```

**验证标准**:
- [ ] 统计数据正确
- [ ] 只显示商家A的扫码数据
- [ ] 商家B无法看到商家A的扫码数据

**测试2.7.3: 验证数据库统计表**
```sql
-- 检查qr_code_scans表
SELECT * FROM qr_code_scans WHERE merchant_id = $MERCHANT_A_ID;

-- 检查qr_scan_statistics表
SELECT * FROM qr_scan_statistics WHERE merchant_id = $MERCHANT_A_ID;

-- 检查daily_scan_stats视图
SELECT * FROM daily_scan_stats WHERE merchant_id = $MERCHANT_A_ID;
```

**验证标准**:
- [ ] qr_code_scans表有记录
- [ ] qr_scan_statistics表有汇总数据
- [ ] daily_scan_stats视图有统计结果

##### 2.8 性能和压力测试（可选）(15分钟)

**测试2.8.1: 并发请求测试**
```bash
# 使用ab（Apache Bench）进行并发测试
ab -n 100 -c 10 http://localhost:5000/api/miniprogram/merchant/$MERCHANT_A_ID

# 预期: 所有请求成功，无错误
```

**验证标准**:
- [ ] 所有请求成功
- [ ] 响应时间合理（< 200ms）
- [ ] 无数据库连接错误

**测试2.8.2: 大数据量测试**
```sql
-- 为商家A创建大量商品（100条）
INSERT INTO product_items (merchant_id, name, description, tags, price)
SELECT
  $MERCHANT_A_ID,
  CONCAT('商品', n),
  '测试商品',
  '测试',
  100.00
FROM (
  SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION ... UNION SELECT 100
) numbers;
```

```bash
# 查询商品列表，验证性能
time curl "http://localhost:5000/api/miniprogram/products?merchant_id=$MERCHANT_A_ID"

# 预期: 查询时间 < 500ms
```

**验证标准**:
- [ ] 查询响应时间合理
- [ ] 分页工作正常
- [ ] 无内存溢出

#### 验收标准

**必须满足**:
- [ ] 商家A和商家B注册成功
- [ ] 数据隔离测试通过（A看不到B的数据，B看不到A的数据）
- [ ] 跨商家访问被正确阻止（返回403）
- [ ] 所有错误场景返回正确的错误码和消息
- [ ] 二维码防伪造测试通过（签名验证有效）
- [ ] 扫码统计功能正常工作
- [ ] 数据在数据库层面正确隔离
- [ ] 所有测试都有明确的通过/失败记录

**测试报告**:
- [ ] 所有测试用例记录在文档中
- [ ] 失败的测试有详细说明
- [ ] 测试截图或日志已保存
- [ ] 性能测试结果已记录

---

## 📚 优先级2（应该完成 - 提升可维护性）

### 任务3: 完善文档

**任务描述**
更新和创建系统文档，包括多租户架构说明、API端点文档和部署指南。

**优先级**: P2 - 应该完成
**预估时间**: 2-3小时
**依赖关系**: 任务1和任务2
**风险级别**: 🟡 中

#### 具体步骤

##### 3.1 更新backend/README.md (1小时)

**步骤3.1.1: 添加多租户架构章节**

在backend/README.md中添加以下内容：

```markdown
## 🏢 多租户架构

### 架构概述

好评宝采用**数据隔离型多租户架构**，一个小程序实例可以服务多个商家，每个商家的数据完全隔离。

### 核心特性

- 🔒 **数据完全隔离** - 每个商家的数据（商品、奖品、评价等）存储在独立的merchant_id下
- 🛡️ **跨商家访问防护** - 商家端API自动验证权限，防止跨商家访问
- 🔐 **二维码防伪造** - 二维码URL使用签名机制，防止篡改和伪造
- 📊 **扫码统计** - 支持按商家统计扫码次数、独立用户数等数据

### 数据库设计

所有业务表都包含`merchant_id`字段：

| 表名 | merchant_id | 外键约束 | 级联删除 |
|------|-------------|----------|----------|
| merchants | N/A | - | - |
| product_categories | ✅ | → merchants(id) | CASCADE |
| product_items | ✅ | → merchants(id) | CASCADE |
| product_images | ✅ | (通过product_items) | CASCADE |
| prizes | ✅ | → merchants(id) | CASCADE |
| lottery_codes | ✅ | → merchants(id) | CASCADE |
| qr_code_scans | ✅ | → merchants(id) | CASCADE |

### 权限验证中间件

| 中间件 | 用途 | 应用范围 |
|--------|------|----------|
| `authenticateMerchant` | JWT认证 | 所有商家端API |
| `validateMerchantAccess` | 验证商家对资源的访问权限 | 商品、奖品、二维码管理 |
| `injectMerchantId` | 自动注入merchant_id | 商家端创建/更新操作 |
| `requireMerchantId` | 验证小程序API的merchant_id参数 | 所有小程序公开API |
| `optionalValidateQRCodeSignature` | 可选的二维码签名验证 | 小程序公开API |

### 二维码机制

**生成流程**:
1. 商家注册时自动生成专属二维码
2. 二维码URL格式: `pages/index/index?merchant_id={id}&signature={sig}`
3. 签名基于merchant_id和时间戳，防止篡改

**验证流程**:
1. 用户扫描二维码进入小程序
2. 小程序读取URL参数
3. 调用API时携带merchant_id和signature
4. 后端验证签名有效性
5. 签名验证失败则拒绝访问

### 数据迁移

多租户迁移已包含在migration 006和007中：

```bash
# 执行多租户迁移
npm run migrate

# 回滚（仅开发环境）
npx ts-node -e "require('./src/database/migrations/006-add-multi-tenant-support').down()"
```

### 注意事项

⚠️ **重要**: 数据库迁移会将现有数据分配给`merchant_id = 1`，确保在迁移前已创建默认商家。

⚠️ **外键约束**: 删除merchant会级联删除所有相关数据，请谨慎操作。

⚠️ **签名验证**: 生产环境必须启用二维码签名验证，防止伪造二维码。
```

**步骤3.1.2: 更新迁移文件列表**

修改"迁移文件"章节：

```markdown
### 迁移文件

迁移文件位于 `src/database/migrations/` 目录：

**基础迁移**:
- `000-create-merchants.ts` - 商家表
- `001-create-product-categories.ts` - 产品分类表
- `002-create-product-items.ts` - 产品表
- `003-create-product-images.ts` - 产品图片表
- `004-add-performance-indexes.ts` - 性能索引
- `005-update-merchants-table.ts` - 商家表更新

**多租户迁移**:
- `006-add-multi-tenant-support.ts` - 添加多租户支持（merchant_id、外键、索引）
- `007-add-scan-statistics-table.ts` - 添加扫码统计表
```

**步骤3.1.3: 更新API文档**

在"主要API端点"章节添加：

```markdown
#### 商家二维码管理（需商家认证）
- `GET /api/merchant/qrcode` - 获取商家二维码信息
- `POST /api/merchant/qrcode/generate` - 重新生成二维码
- `GET /api/merchant/scan` - 获取扫码统计数据

#### 小程序商家API（公开，需merchant_id）
- `GET /api/miniprogram/merchant/:id` - 获取商家信息
- `GET /api/miniprogram/prizes?merchantId=` - 获取商家奖品列表
- `GET /api/miniprogram/customer-service/:merchantId` - 获取客服二维码
- `POST /api/miniprogram/scan` - 记录扫码事件

#### 错误码说明

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `INVALID_QR` | 403 | 二维码签名无效或已过期 |
| `MERCHANT_NOT_FOUND` | 404 | 商家不存在 |
| `MERCHANT_CLOSED` | 400 | 商家未营业 |
| `ACCESS_DENIED` | 403 | 跨商家访问被拒绝 |
| `NO_DATA` | 404 | 商家无相关数据 |
```

##### 3.2 创建多租户架构详细文档 (1小时)

创建文件 `backend/docs/multi-tenant-architecture.md`：

```markdown
# 多租户架构详细文档

## 目录

1. [架构设计](#架构设计)
2. [数据库设计](#数据库设计)
3. [API设计](#api设计)
4. [权限控制](#权限控制)
5. [二维码机制](#二维码机制)
6. [扫码统计](#扫码统计)
7. [部署指南](#部署指南)
8. [故障排查](#故障排查)

---

## 架构设计

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     小程序端 (用户)                       │
│  - 统一UI框架                                            │
│  - 动态加载商家数据                                      │
│  - merchant_id上下文管理                                 │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTP API (merchant_id + signature)
┌─────────────────────────────────────────────────────────┐
│                   后端服务 (Node.js)                     │
│  - merchant_id自动过滤                                   │
│  - 权限验证 (JWT + merchant_id + 签名验证)                │
│  - 二维码生成服务                                        │
│  - 扫码统计服务                                          │
└─────────────────────────────────────────────────────────┘
                          ↓ SQL Query (WHERE merchant_id = ?)
┌─────────────────────────────────────────────────────────┐
│                   数据库 (MySQL)                         │
│  - 所有业务表添加 merchant_id 字段                       │
│  - 外键约束确保数据完整性                                │
│  - 索引优化查询性能                                      │
└─────────────────────────────────────────────────────────┘
```

### 数据流

#### 正常扫码流程

```
1. 用户扫描商家二维码
   ↓
2. 小程序获取URL参数 (merchant_id, signature)
   ↓
3. 小程序调用API验证二维码
   GET /api/miniprogram/merchant/:id?signature=xxx
   ↓
4. 后端验证签名有效性
   ↓
5. 返回商家信息
   ↓
6. 小程序加载商家专属内容 (商品、奖品等)
```

#### 商家管理流程

```
1. 商家注册/登录
   POST /api/merchant/auth/register
   ↓
2. 后端自动生成二维码
   ↓
3. 商家下载二维码并分发
   ↓
4. 用户扫码，自动关联到该商家
```

---

## 数据库设计

### merchants表

```sql
CREATE TABLE merchants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  shop_name VARCHAR(255) NOT NULL,
  name VARCHAR(255) COMMENT '商家显示名称',
  description TEXT COMMENT '商家描述',
  customer_service_qr_url VARCHAR(500) COMMENT '客服二维码URL',
  qr_code_url VARCHAR(500) COMMENT '商家专属二维码URL',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_name (name),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### prizes表（含merchant_id）

```sql
CREATE TABLE prizes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  probability DECIMAL(5,4) NOT NULL,
  stock INT DEFAULT 0,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  INDEX idx_merchant_id (merchant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### qr_code_scans表

```sql
CREATE TABLE qr_code_scans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant_id INT NOT NULL,
  user_openid VARCHAR(100) NOT NULL,
  qr_code_url VARCHAR(500) NOT NULL,
  scan_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),

  INDEX idx_merchant_scan_time (merchant_id, scan_time),
  INDEX idx_user_openid (user_openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 数据完整性规则

1. **外键约束**: 所有业务表的merchant_id必须引用merchants(id)
2. **级联删除**: 删除merchant时，所有相关数据自动删除
3. **NOT NULL约束**: merchant_id不能为NULL
4. **索引优化**: 所有merchant_id字段都建立索引

---

## API设计

### 商家端API（需要JWT认证）

#### 获取商家二维码

**请求**:
```http
GET /api/merchant/qrcode
Authorization: Bearer {jwt_token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "merchant_id": 2,
    "qr_code_url": "https://cdn.example.com/qr/merchant_2.png",
    "qr_url": "https://example.com/pages/index/index?merchant_id=2&signature=abc123",
    "generated_at": "2026-02-16T10:00:00Z"
  }
}
```

#### 重新生成二维码

**请求**:
```http
POST /api/merchant/qrcode/generate
Authorization: Bearer {jwt_token}
```

**响应**:
```json
{
  "success": true,
  "message": "QR code regenerated successfully",
  "data": {
    "qr_code_url": "https://cdn.example.com/qr/merchant_2_new.png",
    "qr_url": "https://example.com/pages/index/index?merchant_id=2&signature=xyz789"
  }
}
```

#### 获取扫码统计

**请求**:
```http
GET /api/merchant/scan?startDate=2026-02-01&endDate=2026-02-28
Authorization: Bearer {jwt_token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "total_scans": 1523,
    "unique_users": 845,
    "today_scans": 67,
    "scans_by_date": [
      {
        "date": "2026-02-16",
        "total_scans": 67,
        "unique_users": 45
      },
      {
        "date": "2026-02-15",
        "total_scans": 89,
        "unique_users": 52
      }
    ]
  }
}
```

### 小程序端API（公开，需merchant_id）

#### 获取商家信息

**请求**:
```http
GET /api/miniprogram/merchant/:id?signature={signature}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "好品优选",
    "description": "优质商品，优惠多多",
    "qr_code_url": "https://cdn.example.com/qr/merchant_2.png",
    "is_active": true
  }
}
```

#### 获取商家奖品列表

**请求**:
```http
GET /api/miniprogram/prizes?merchantId=2
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "merchant_id": 2,
      "name": "一等奖",
      "description": "iPhone 15 Pro",
      "probability": 0.01,
      "stock": 1,
      "image_url": "https://cdn.example.com/prize1.jpg"
    }
  ]
}
```

#### 记录扫码事件

**请求**:
```http
POST /api/miniprogram/scan
Content-Type: application/json

{
  "merchant_id": 2,
  "user_openid": "oxxxxxxxx",
  "qr_code_url": "https://example.com/pages/index/index?merchant_id=2&signature=abc123",
  "ip_address": "192.168.1.1"
}
```

**响应**:
```json
{
  "success": true,
  "message": "Scan recorded successfully"
}
```

---

## 权限控制

### 权限验证流程

```
请求 → JWT认证 → merchant_id验证 → 资源所有权验证 → 业务逻辑
            ↓              ↓                  ↓
         无效token    缺少merchant_id   跨商家访问
            ↓              ↓                  ↓
          401 Unauthorized 400 Bad Request 403 Forbidden
```

### 中间件说明

#### authenticateMerchant

**用途**: JWT认证中间件

**应用**: 所有商家端API

**逻辑**:
```typescript
export function authenticateMerchant(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.merchant = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
```

#### validateMerchantAccess

**用途**: 验证商家对资源的访问权限

**应用**: 商品、奖品、二维码管理API

**逻辑**:
```typescript
export function validateMerchantAccess(req: AuthRequest, res: Response, next: NextFunction) {
  const resourceMerchantId = parseInt(req.params.id || req.body.merchant_id);
  const currentMerchantId = req.merchant.id;

  if (resourceMerchantId !== currentMerchantId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You do not have permission to access this resource'
    });
  }

  next();
}
```

#### injectMerchantId

**用途**: 自动注入merchant_id

**应用**: 创建/更新操作

**逻辑**:
```typescript
export function injectMerchantId(req: AuthRequest, res: Response, next: NextFunction) {
  req.body.merchant_id = req.merchant.id;
  next();
}
```

#### requireMerchantId

**用途**: 验证小程序API的merchant_id参数

**应用**: 所有小程序公开API

**逻辑**:
```typescript
export function requireMerchantId(req: Request, res: Response, next: NextFunction) {
  const merchantId = req.query.merchantId || req.body.merchant_id;

  if (!merchantId) {
    return res.status(400).json({
      success: false,
      error: 'merchantId is required'
    });
  }

  req.merchantId = parseInt(merchantId);
  next();
}
```

#### optionalValidateQRCodeSignature

**用途**: 可选的二维码签名验证

**应用**: 小程序公开API

**逻辑**:
```typescript
export function optionalValidateQRCodeSignature(req: Request, res: Response, next: NextFunction) {
  const signature = req.query.signature;

  if (signature) {
    const merchantId = req.params.id || req.query.merchantId;
    const isValid = verifyQRCodeSignature(merchantId, signature);

    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: 'Invalid QR code signature',
        code: 'INVALID_QR'
      });
    }
  }

  next();
}
```

---

## 二维码机制

### 签名生成算法

```typescript
function generateQRCodeSignature(merchantId: string): string {
  const secret = process.env.QR_CODE_SECRET;
  const timestamp = Date.now();
  const data = `${merchantId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  return `${signature}:${timestamp}`;
}
```

### 签名验证算法

```typescript
function verifyQRCodeSignature(merchantId: string, signature: string): boolean {
  const secret = process.env.QR_CODE_SECRET;
  const [sig, timestamp] = signature.split(':');

  // 检查签名是否过期（24小时）
  if (Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) {
    return false;
  }

  // 重新生成签名并比较
  const data = `${merchantId}:${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  return sig === expectedSignature;
}
```

### 二维码URL格式

```
https://yourdomain.com/pages/index/index?merchant_id=2&signature=abc123def456:1676543210
```

参数说明:
- `merchant_id`: 商家ID
- `signature`: 签名（格式: `HMAC_SHA256:时间戳`）

---

## 扫码统计

### 数据模型

#### qr_code_scans表（原始扫码记录）

```typescript
interface QRCodeScan {
  id: number;
  merchant_id: number;
  user_openid: string;
  qr_code_url: string;
  scan_time: Date;
  ip_address: string;
}
```

#### qr_scan_statistics表（每日汇总统计）

```typescript
interface QRScanStatistics {
  id: number;
  merchant_id: number;
  date: Date;
  total_scans: number;
  unique_users: number;
}
```

### 统计API

#### 获取总统计

```http
GET /api/merchant/scan
Authorization: Bearer {jwt_token}
```

响应:
```json
{
  "success": true,
  "data": {
    "total_scans": 1523,
    "unique_users": 845,
    "today_scans": 67
  }
}
```

#### 获取时间范围统计

```http
GET /api/merchant/scan?startDate=2026-02-01&endDate=2026-02-28
```

#### 获取每日统计

```http
GET /api/merchant/scan/daily?limit=30
```

---

## 部署指南

### 环境要求

- Node.js 18+
- MySQL 8.0+
- Redis 7.0+（可选）
- 阿里云OSS账号

### 环境变量配置

```bash
# 多租户相关配置
QR_CODE_SECRET=your-secret-key-for-signing
QR_CODE_BASE_URL=https://yourdomain.com
QR_CODE_SIZE=300
QR_CODE_ERROR_CORRECTION_LEVEL=M

# OSS配置（用于存储二维码图片）
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_BUCKET=haopingbao-qrcodes
OSS_REGION=oss-cn-hangzhou
```

### 部署步骤

1. **执行数据库迁移**
   ```bash
   npm run migrate
   ```

2. **验证迁移**
   ```sql
   DESC prizes;
   SHOW INDEX FROM prizes;
   ```

3. **创建默认商家**
   ```bash
   curl -X POST http://localhost:5000/api/merchant/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "default",
       "password": "strong_password",
       "shop_name": "默认商家"
     }'
   ```

4. **启动服务**
   ```bash
   npm run start
   ```

5. **验证部署**
   ```bash
   curl http://localhost:5000/health
   ```

### 微信小程序配置

1. 登录微信公众平台
2. 找到"扫普通链接二维码打开小程序"
3. 配置规则:
   - 二维码规则: `https://yourdomain.com/*`
   - 小程序功能页面: `pages/index/index`
4. 测试链接: `https://yourdomain.com/pages/index/index?merchant_id=2&signature=xxx`

---

## 故障排查

### 常见问题

#### 问题1: 迁移失败 - "Default merchant (id=1) does not exist"

**原因**: 迁移脚本要求存在id=1的merchant

**解决方案**:
```sql
INSERT INTO merchants (id, username, password, shop_name, is_active)
VALUES (1, 'default', 'hashed_password', 'Default Merchant', 1);
```

#### 问题2: 外键约束失败

**原因**: 数据完整性问题

**解决方案**:
```sql
-- 查找孤立记录
SELECT * FROM prizes WHERE merchant_id NOT IN (SELECT id FROM merchants);

-- 修复孤立记录
UPDATE prizes SET merchant_id = 1 WHERE merchant_id NOT IN (SELECT id FROM merchants);
```

#### 问题3: 签名验证失败

**原因**: 签名配置错误或签名过期

**解决方案**:
1. 检查`QR_CODE_SECRET`环境变量是否配置
2. 检查签名是否过期（24小时有效期）
3. 查看后端日志获取详细错误信息

#### 问题4: 跨商家访问未被阻止

**原因**: 中间件未正确应用

**解决方案**:
1. 检查路由配置，确认`validateMerchantAccess`中间件已应用
2. 检查中间件顺序，确保`authenticateMerchant`在`validateMerchantAccess`之前
3. 查看日志确认中间件执行

### 日志查询

```bash
# 查看认证错误
tail -f logs/combined.log | grep "Authentication failed"

# 查看跨商家访问尝试
tail -f logs/combined.log | grep "Cross-merchant access attempt"

# 查看签名验证失败
tail -f logs/combined.log | grep "Invalid QR code signature"
```

---

**文档版本**: 1.0
**最后更新**: 2026-02-16
**维护者**: Haopingbao Team
```

##### 3.3 创建API端点文档 (30分钟)

创建文件 `backend/docs/api-reference.md`：

```markdown
# API 参考文档

## 基础信息

- **Base URL**: `http://localhost:5000/api`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`
- **字符编码**: UTF-8

## 认证相关

### POST /auth/register
注册新用户（已弃用，使用merchant注册）

### POST /auth/login
用户登录（已弃用，使用merchant登录）

### POST /merchant/auth/register
注册商家

**请求体**:
```json
{
  "username": "string",
  "password": "string",
  "shop_name": "string"
}
```

**响应**:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "merchant": {
    "id": 1,
    "username": "merchant1",
    "shop_name": "商家名称"
  }
}
```

### POST /merchant/auth/login
商家登录

**请求体**:
```json
{
  "username": "string",
  "password": "string"
}
```

**响应**: 同注册

## 商家二维码管理

### GET /merchant/qrcode
获取商家二维码信息

**认证**: 需要JWT token

**响应**:
```json
{
  "success": true,
  "data": {
    "merchant_id": 1,
    "qr_code_url": "https://cdn.example.com/qr/merchant_1.png",
    "qr_url": "https://example.com/pages/index/index?merchant_id=1&signature=abc123",
    "generated_at": "2026-02-16T10:00:00Z"
  }
}
```

### POST /merchant/qrcode/generate
重新生成二维码

**认证**: 需要JWT token

**响应**:
```json
{
  "success": true,
  "message": "QR code regenerated successfully",
  "data": {
    "qr_code_url": "https://cdn.example.com/qr/merchant_1_new.png",
    "qr_url": "https://example.com/pages/index/index?merchant_id=1&signature=xyz789"
  }
}
```

### GET /merchant/scan
获取扫码统计数据

**认证**: 需要JWT token

**查询参数**:
- `startDate` (可选): 开始日期 (YYYY-MM-DD)
- `endDate` (可选): 结束日期 (YYYY-MM-DD)
- `limit` (可选): 返回记录数，默认30

**响应**:
```json
{
  "success": true,
  "data": {
    "total_scans": 1523,
    "unique_users": 845,
    "today_scans": 67,
    "scans_by_date": [
      {
        "date": "2026-02-16",
        "total_scans": 67,
        "unique_users": 45
      }
    ]
  }
}
```

## 小程序商家API

### GET /miniprogram/merchant/:id
获取商家信息

**认证**: 公开API（需要merchant_id参数）

**查询参数**:
- `signature` (可选): 二维码签名

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "商家名称",
    "description": "商家描述",
    "qr_code_url": "https://cdn.example.com/qr/merchant_1.png",
    "is_active": true
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "Merchant not found",
  "code": "MERCHANT_NOT_FOUND"
}
```

### GET /miniprogram/prizes
获取商家奖品列表

**认证**: 公开API

**查询参数**:
- `merchantId` (必需): 商家ID

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "merchant_id": 1,
      "name": "一等奖",
      "description": "iPhone 15 Pro",
      "probability": 0.01,
      "stock": 1,
      "image_url": "https://cdn.example.com/prize1.jpg"
    }
  ]
}
```

### GET /miniprogram/customer-service/:merchantId
获取客服二维码

**认证**: 公开API

**响应**:
```json
{
  "success": true,
  "data": {
    "customer_service_qr_url": "https://cdn.example.com/cs_qr/merchant_1.png"
  }
}
```

### POST /miniprogram/scan
记录扫码事件

**认证**: 公开API

**请求体**:
```json
{
  "merchant_id": 1,
  "user_openid": "oxxxxxxxx",
  "qr_code_url": "https://example.com/pages/index/index?merchant_id=1&signature=abc123",
  "ip_address": "192.168.1.1"
}
```

**响应**:
```json
{
  "success": true,
  "message": "Scan recorded successfully"
}
```

## 商品管理

### GET /merchant/categories
获取分类树

**认证**: 需要JWT token

### POST /merchant/categories
创建分类

**认证**: 需要JWT token

**请求体**:
```json
{
  "name": "string",
  "description": "string",
  "parent_id": 0
}
```

### GET /merchant/products
获取产品列表

**认证**: 需要JWT token

**查询参数**:
- `category_id` (可选): 分类ID
- `page` (可选): 页码，默认1
- `limit` (可选): 每页数量，默认20

**响应**:
```json
{
  "success": true,
  "data": {
    "products": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### POST /merchant/products
创建产品

**认证**: 需要JWT token

**请求体**:
```json
{
  "category_id": 1,
  "name": "string",
  "description": "string",
  "tags": "string",
  "price": 100.00
}
```

### PUT /merchant/products/:id
更新产品

**认证**: 需要JWT token

### DELETE /merchant/products/:id
删除产品

**认证**: 需要JWT token

## 奖品管理

### GET /merchant/prizes
获取奖品列表

**认证**: 需要JWT token

### POST /merchant/prizes
创建奖品

**认证**: 需要JWT token

**请求体**:
```json
{
  "name": "string",
  "description": "string",
  "probability": 0.5,
  "stock": 10,
  "image_url": "string"
}
```

### PUT /merchant/prizes/:id
更新奖品

**认证**: 需要JWT token

### DELETE /merchant/prizes/:id
删除奖品

**认证**: 需要JWT token

## 错误码说明

| HTTP状态码 | 错误码 | 说明 |
|-----------|--------|------|
| 400 | VALIDATION_ERROR | 请求参数验证失败 |
| 400 | MERCHANT_CLOSED | 商家未营业 |
| 401 | UNAUTHORIZED | 未授权（缺少或无效token） |
| 403 | ACCESS_DENIED | 跨商家访问被拒绝 |
| 403 | INVALID_QR | 二维码签名无效或已过期 |
| 404 | NOT_FOUND | 资源不存在 |
| 404 | MERCHANT_NOT_FOUND | 商家不存在 |
| 404 | NO_DATA | 商家无相关数据 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

## 请求示例

### 使用curl

```bash
# 登录获取token
TOKEN=$(curl -s -X POST http://localhost:5000/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"merchant1","password":"password"}' \
  | jq -r '.token')

# 使用token访问API
curl http://localhost:5000/api/merchant/products \
  -H "Authorization: Bearer $TOKEN"
```

### 使用JavaScript (fetch)

```javascript
// 登录
const loginResponse = await fetch('http://localhost:5000/api/merchant/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'merchant1',
    password: 'password'
  })
});

const { token } = await loginResponse.json();

// 访问API
const productsResponse = await fetch('http://localhost:5000/api/merchant/products', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const products = await productsResponse.json();
```

---

**文档版本**: 1.0
**最后更新**: 2026-02-16
```

#### 验收标准

**必须满足**:
- [ ] backend/README.md已更新，包含多租户架构章节
- [ ] 创建了多租户架构详细文档
- [ ] 创建了API参考文档
- [ ] 所有文档格式统一
- [ ] 代码示例清晰可运行
- [ ] 错误码说明完整

---

### 任务4: 环境配置优化

**任务描述**
完善环境变量配置，创建.env.example模板，添加配置说明文档。

**优先级**: P2 - 应该完成
**预估时间**: 1小时
**依赖关系**: 无
**风险级别**: 🟡 中

#### 具体步骤

##### 4.1 更新.env.example文件 (30分钟)

更新 `backend/.env.example` 文件，添加多租户相关配置：

```bash
# ============================================
# Server Configuration
# ============================================
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# ============================================
# Database Configuration
# ============================================
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=haopingbao

# ============================================
# Redis Configuration (Optional)
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ============================================
# JWT Configuration
# ============================================
JWT_SECRET=your-jwt-secret-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# ============================================
# QR Code Configuration (Multi-Tenant)
# ============================================
# 二维码签名密钥（必需，用于防伪造）
QR_CODE_SECRET=your-qr-code-signing-secret-key-minimum-32-chars
QR_CODE_BASE_URL=https://yourdomain.com
QR_CODE_SIZE=300
QR_CODE_ERROR_CORRECTION_LEVEL=M

# ============================================
# AI Service Configuration
# ============================================
DEEPSEEK_API_KEY=your-deepseek-api-key-here

# ============================================
# File Storage Configuration (Alibaba Cloud OSS)
# ============================================
OSS_ACCESS_KEY_ID=your-oss-access-key-id
OSS_ACCESS_KEY_SECRET=your-oss-secret-key
OSS_BUCKET=haopingbao-images
OSS_REGION=oss-cn-hangzhou

# ============================================
# WeChat Configuration
# ============================================
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret

# ============================================
# WebSocket Configuration
# ============================================
WS_PORT=5001

# ============================================
# Logging Configuration
# ============================================
LOG_LEVEL=info
LOG_FILE=logs/combined.log
ERROR_LOG_FILE=logs/error.log

# ============================================
# Security Configuration
# ============================================
# Rate limiting configuration
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100 # Max requests per window

# CORS configuration
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:3000
```

##### 4.2 创建环境配置说明文档 (30分钟)

创建文件 `backend/docs/environment-setup.md`：

```markdown
# 环境配置指南

## 概述

好评宝后端服务使用环境变量进行配置。本文档详细说明所有环境变量的用途和配置方法。

## 快速开始

1. 复制环境变量模板:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. 编辑 `.env` 文件，填入实际配置值

3. 确保不要将 `.env` 文件提交到版本控制（已在.gitignore中）

## 配置说明

### 必需配置

以下配置项必须在 `.env` 中配置，否则服务无法启动：

#### 数据库配置

```bash
DB_HOST=localhost        # 数据库主机地址
DB_PORT=3306            # 数据库端口
DB_USER=root            # 数据库用户名
DB_PASSWORD=password    # 数据库密码
DB_NAME=haopingbao      # 数据库名称
```

**生产环境建议**:
- 使用强密码
- 限制数据库用户权限
- 使用SSL连接（添加`DB_SSL=true`）

#### JWT配置

```bash
JWT_SECRET=your-secret-key-minimum-32-characters
JWT_EXPIRES_IN=7d
```

**说明**:
- `JWT_SECRET`: 用于签名JWT token的密钥，至少32个字符
- `JWT_EXPIRES_IN`: token有效期，格式如 `7d`, `24h`, `60m`

**安全建议**:
- 使用随机生成的强密钥: `openssl rand -base64 32`
- 定期轮换密钥
- 不要在代码中硬编码

#### QR Code配置（多租户）

```bash
QR_CODE_SECRET=your-qr-code-signing-secret-key-minimum-32-chars
QR_CODE_BASE_URL=https://yourdomain.com
QR_CODE_SIZE=300
QR_CODE_ERROR_CORRECTION_LEVEL=M
```

**说明**:
- `QR_CODE_SECRET`: 二维码签名密钥，用于防止二维码伪造
- `QR_CODE_BASE_URL`: 二维码URL的基础域名
- `QR_CODE_SIZE`: 二维码图片尺寸（像素）
- `QR_CODE_ERROR_CORRECTION_LEVEL`: 纠错级别（L/M/Q/H）

**安全建议**:
- `QR_CODE_SECRET`必须保密，否则二维码可被伪造
- 生产环境使用HTTPS域名

#### 阿里云OSS配置

```bash
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=haopingbao-images
OSS_REGION=oss-cn-hangzhou
```

**说明**:
- 用于存储二维码图片、客服二维码等文件
- 需要在阿里云控制台创建OSS bucket并获取AccessKey

**获取AccessKey步骤**:
1. 登录阿里云控制台
2. 进入"访问控制" > "用户"
3. 创建用户并授予OSS权限
4. 创建AccessKey并记录

### 可选配置

以下配置项有默认值，可根据需要调整：

#### 服务配置

```bash
PORT=5000                    # 服务端口
NODE_ENV=development        # 环境: development/production
FRONTEND_URL=http://localhost:3000  # 前端URL（用于CORS）
```

#### Redis配置

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

**说明**: Redis用于缓存和会话管理，可选配置。如果不使用Redis，系统会使用内存缓存。

#### 日志配置

```bash
LOG_LEVEL=info              # 日志级别: error/warn/info/debug
LOG_FILE=logs/combined.log  # 日志文件路径
ERROR_LOG_FILE=logs/error.log  # 错误日志文件路径
```

#### 安全配置

```bash
RATE_LIMIT_WINDOW_MS=900000  # 限流时间窗口（毫秒）
RATE_LIMIT_MAX_REQUESTS=100 # 时间窗口内最大请求数
CORS_ENABLED=true           # 是否启用CORS
CORS_ORIGIN=http://localhost:3000  # 允许的CORS来源
```

#### AI服务配置

```bash
DEEPSEEK_API_KEY=your-deepseek-api-key
```

**说明**: 用于AI评价生成功能。如不使用AI功能，可不配置。

#### 微信小程序配置

```bash
WECHAT_APP_ID=your-app-id
WECHAT_APP_SECRET=your-app-secret
```

**说明**: 在微信公众平台获取AppID和AppSecret。

## 环境配置验证

### 启动前验证

在启动服务前，运行以下命令验证配置：

```bash
# 1. 测试数据库连接
node -e "
  const mysql = require('mysql2/promise');
  mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }).then(conn => {
    console.log('Database connection successful');
    conn.end();
  }).catch(err => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });
"

# 2. 验证必需环境变量
node -e "
  const required = ['DB_HOST', 'DB_NAME', 'JWT_SECRET', 'QR_CODE_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('Missing environment variables:', missing.join(', '));
    process.exit(1);
  }
  console.log('All required environment variables are set');
"
```

### 启动服务

```bash
cd backend
npm run dev
```

服务启动时会自动验证所有必需配置，如果缺少必需的环境变量，服务将拒绝启动并显示详细错误信息。

## 不同环境配置

### 开发环境

```bash
NODE_ENV=development
PORT=5000
DB_HOST=localhost
JWT_SECRET=dev-secret-key-not-for-production
QR_CODE_SECRET=dev-qr-secret-not-for-production
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug
```

### 测试环境

```bash
NODE_ENV=test
PORT=5000
DB_HOST=test-db-server
JWT_SECRET=test-secret-key
QR_CODE_SECRET=test-qr-secret-key
FRONTEND_URL=http://test.example.com
LOG_LEVEL=info
```

### 生产环境

```bash
NODE_ENV=production
PORT=5000
DB_HOST=prod-db-server
JWT_SECRET=<random-strong-secret>
QR_CODE_SECRET=<random-strong-secret>
FRONTEND_URL=https://example.com
LOG_LEVEL=warn
DB_SSL=true
```

**生产环境安全检查清单**:
- [ ] 使用强随机密钥（JWT_SECRET, QR_CODE_SECRET）
- [ ] 数据库使用SSL连接
- [ ] 使用HTTPS域名
- [ ] CORS_ORIGIN设置为生产域名
- [ ] LOG_LEVEL设置为warn或error
- [ ] 配置rate limiting防止滥用
- [ ] 数据库用户权限最小化

## Docker环境配置

在使用Docker部署时，可以通过docker-compose.yml配置环境变量：

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_USER=root
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=haopingbao
      - JWT_SECRET=${JWT_SECRET}
      - QR_CODE_SECRET=${QR_CODE_SECRET}
      - OSS_ACCESS_KEY_ID=${OSS_ACCESS_KEY_ID}
      - OSS_ACCESS_KEY_SECRET=${OSS_ACCESS_KEY_SECRET}
    depends_on:
      - mysql
      - redis
```

## 密钥生成

### JWT密钥生成

```bash
# 使用openssl生成强密钥
openssl rand -base64 32

# 或使用node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### QR Code签名密钥生成

```bash
# 同上
openssl rand -base64 32
```

## 常见问题

### Q1: 服务启动时提示"Missing required environment variable"

**A**: 检查`.env`文件是否存在，并确认所有必需的环境变量都已配置。

### Q2: 如何检查当前生效的环境变量？

**A**: 运行以下命令查看：
```bash
node -e "console.log(process.env)"
```

### Q3: 修改.env文件后需要重启服务吗？

**A**: 是的，需要重启服务才能使新的环境变量生效。

### Q4: 可以在不同的环境使用不同的.env文件吗？

**A**: 可以，例如：
- `.env.development` - 开发环境
- `.env.test` - 测试环境
- `.env.production` - 生产环境

然后使用dotenv的选项加载对应的文件：
```bash
NODE_ENV=production node -r dotenv/config dist/server.js dotenv_config_path=.env.production
```

### Q5: 如何在代码中访问环境变量？

**A**: 使用`process.env`:
```typescript
const dbHost = process.env.DB_HOST;
const jwtSecret = process.env.JWT_SECRET;
```

## 安全建议

1. **永远不要将.env文件提交到版本控制**
2. **使用强随机密钥**
3. **定期轮换密钥**
4. **最小权限原则**（数据库用户、OSS权限等）
5. **生产环境使用HTTPS**
6. **限制CORS来源**
7. **启用rate limiting**
8. **定期审计访问日志**

---

**文档版本**: 1.0
**最后更新**: 2026-02-16
```

#### 验收标准

**必须满足**:
- [ ] .env.example文件已更新，包含所有必需的配置项
- [ ] 环境配置说明文档已创建
- [ ] 每个配置项都有清晰的说明
- [ ] 包含安全建议和最佳实践
- [ ] 提供了密钥生成方法
- [ ] 包含不同环境的配置示例

---

### 任务5: 单元测试

**任务描述**
编写关键路径的单元测试，覆盖中间件、API端点和数据模型。

**优先级**: P2 - 应该完成
**预估时间**: 2-3小时
**依赖关系**: 任务1和任务2
**风险级别**: 🟡 中

#### 具体步骤

##### 5.1 测试环境准备 (15分钟)

**步骤5.1.1: 检查测试框架配置**

检查 `backend/jest.config.js` 或 `backend/package.json` 中的测试配置：

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "roots": ["<rootDir>/src", "<rootDir>/tests"],
    "testMatch": ["**/*.test.ts"],
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/**/*.d.ts"
    ]
  }
}
```

**步骤5.1.2: 创建测试数据库配置**

创建 `backend/src/database/test-connection.ts`:

```typescript
import { createPool } from 'mysql2/promise';

// 测试数据库配置
export const testPool = createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME_TEST || 'haopingbao_test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 测试数据库设置和清理
export async function setupTestDatabase() {
  // 创建测试数据库（如果不存在）
  await testPool.execute(`CREATE DATABASE IF NOT EXISTS haopingbao_test`);
  // 运行迁移
  // TODO: 运行测试迁移脚本
}

export async function cleanupTestDatabase() {
  // 清空所有表
  const tables = ['qr_code_scans', 'qr_scan_statistics', 'lottery_codes', 'prizes', 'product_images', 'product_items', 'product_categories', 'merchants'];
  for (const table of tables) {
    await testPool.execute(`DELETE FROM ${table} WHERE 1=1`);
  }
}

export async function closeTestDatabase() {
  await testPool.end();
}
```

##### 5.2 编写中间件测试 (45分钟)

创建 `backend/tests/middleware/auth.test.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { authenticateMerchant, validateMerchantAccess, injectMerchantId, requireMerchantId } from '../../src/middleware/auth';
import { AuthRequest } from '../../src/types';

describe('Authentication Middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      params: {},
      body: {},
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('authenticateMerchant', () => {
    it('should pass with valid token', () => {
      // Mock valid token
      mockReq.headers!.authorization = 'Bearer valid_token';
      // Mock jwt.verify to return valid payload
      jest.mock('jsonwebtoken', () => ({
        verify: jest.fn(() => ({ id: 1, username: 'test' }))
      }));

      authenticateMerchant(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.merchant).toEqual({ id: 1, username: 'test' });
    });

    it('should return 401 without token', () => {
      authenticateMerchant(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'No token provided'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 with invalid token', () => {
      mockReq.headers!.authorization = 'Bearer invalid_token';
      // Mock jwt.verify to throw error
      jest.mock('jsonwebtoken', () => ({
        verify: jest.fn(() => { throw new Error('Invalid token'); })
      }));

      authenticateMerchant(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateMerchantAccess', () => {
    it('should allow access to own resources', () => {
      mockReq.merchant = { id: 1, username: 'test' };
      mockReq.params!.id = '1';

      validateMerchantAccess(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should deny cross-merchant access', () => {
      mockReq.merchant = { id: 1, username: 'test' };
      mockReq.params!.id = '2';

      validateMerchantAccess(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('injectMerchantId', () => {
    it('should inject merchant_id from authenticated merchant', () => {
      mockReq.merchant = { id: 1, username: 'test' };

      injectMerchantId(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.body.merchant_id).toBe(1);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireMerchantId', () => {
    it('should pass with merchantId in query', () => {
      mockReq.query!.merchantId = '1';

      requireMerchantId(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.merchantId).toBe(1);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass with merchantId in body', () => {
      mockReq.body!.merchantId = 1;

      requireMerchantId(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.merchantId).toBe(1);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 400 without merchantId', () => {
      requireMerchantId(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'merchantId is required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
```

##### 5.3 编写API端点测试 (1小时)

创建 `backend/tests/api/miniprogram.test.ts`:

```typescript
import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } from '../test-setup';

describe('Miniprogram API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/miniprogram/merchant/:id', () => {
    it('should return merchant information for valid merchant', async () => {
      // Setup: Create a test merchant
      // ... code to insert test merchant

      const response = await request(app)
        .get('/api/miniprogram/merchant/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('is_active');
    });

    it('should return 404 for non-existent merchant', async () => {
      const response = await request(app)
        .get('/api/miniprogram/merchant/999999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Merchant not found');
    });

    it('should verify QR code signature if provided', async () => {
      // Create test merchant and generate valid signature
      const merchantId = 1;
      const signature = generateTestSignature(merchantId);

      const response = await request(app)
        .get(`/api/miniprogram/merchant/${merchantId}?signature=${signature}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid QR code signature', async () => {
      const merchantId = 1;
      const invalidSignature = 'invalid_signature';

      const response = await request(app)
        .get(`/api/miniprogram/merchant/${merchantId}?signature=${invalidSignature}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_QR');
    });
  });

  describe('GET /api/miniprogram/prizes', () => {
    it('should return prizes for valid merchant', async () => {
      // Setup: Create test merchant and prizes
      // ... code to insert test data

      const response = await request(app)
        .get('/api/miniprogram/prizes?merchantId=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 400 without merchantId parameter', async () => {
      const response = await request(app)
        .get('/api/miniprogram/prizes')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('merchantId');
    });

    it('should only return prizes for the specified merchant', async () => {
      // Setup: Create two merchants with prizes
      // ... code to insert test data

      const merchantAResponse = await request(app)
        .get('/api/miniprogram/prizes?merchantId=1');

      const merchantBResponse = await request(app)
        .get('/api/miniprogram/prizes?merchantId=2');

      // Verify merchant isolation
      merchantAResponse.body.data.forEach((prize: any) => {
        expect(prize.merchant_id).toBe(1);
      });

      merchantBResponse.body.data.forEach((prize: any) => {
        expect(prize.merchant_id).toBe(2);
      });
    });
  });

  describe('POST /api/miniprogram/scan', () => {
    it('should record scan event', async () => {
      const scanData = {
        merchant_id: 1,
        user_openid: 'test_user_001',
        qr_code_url: 'https://example.com/pages/index/index?merchant_id=1',
        ip_address: '127.0.0.1'
      };

      const response = await request(app)
        .post('/api/miniprogram/scan')
        .send(scanData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Scan recorded');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        merchant_id: 1,
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/miniprogram/scan')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

// Helper function
function generateTestSignature(merchantId: string): string {
  // Simplified signature generation for testing
  return `test_signature_${merchantId}`;
}
```

创建 `backend/tests/api/merchant.test.ts`:

```typescript
import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase, testPool } from '../test-setup';

describe('Merchant API', () => {
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();

    // Register test merchant and get token
    const registerResponse = await request(app)
      .post('/api/merchant/auth/register')
      .send({
        username: 'test_merchant',
        password: 'test_password',
        shop_name: 'Test Shop'
      });

    authToken = registerResponse.body.token;
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  describe('Authentication', () => {
    it('should register new merchant', async () => {
      const response = await request(app)
        .post('/api/merchant/auth/register')
        .send({
          username: 'new_merchant',
          password: 'new_password',
          shop_name: 'New Shop'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.merchant).toBeDefined();
    });

    it('should login existing merchant', async () => {
      const response = await request(app)
        .post('/api/merchant/auth/login')
        .send({
          username: 'test_merchant',
          password: 'test_password'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/merchant/auth/login')
        .send({
          username: 'test_merchant',
          password: 'wrong_password'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('QR Code Management', () => {
    it('should get merchant QR code', async () => {
      const response = await request(app)
        .get('/api/merchant/qrcode')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('merchant_id');
      expect(response.body.data).toHaveProperty('qr_code_url');
      expect(response.body.data).toHaveProperty('qr_url');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/merchant/qrcode')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should regenerate QR code', async () => {
      const response = await request(app)
        .post('/api/merchant/qrcode/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('qr_code_url');
    });
  });

  describe('Cross-Merchant Access Prevention', () => {
    let merchantBToken: string;
    let productAId: number;

    beforeAll(async () => {
      // Register second merchant
      const registerResponse = await request(app)
        .post('/api/merchant/auth/register')
        .send({
          username: 'merchant_b',
          password: 'password_b',
          shop_name: 'Merchant B Shop'
        });

      merchantBToken = registerResponse.body.token;

      // Create product for merchant A
      const createResponse = await request(app)
        .post('/api/merchant/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category_id: 1,
          name: 'Merchant A Product',
          description: 'Test product',
          tags: 'test',
          price: 100
        });

      productAId = createResponse.body.data.id;
    });

    it('should prevent merchant B from accessing merchant A products', async () => {
      const response = await request(app)
        .get(`/api/merchant/products/${productAId}`)
        .set('Authorization', `Bearer ${merchantBToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });

    it('should prevent merchant B from updating merchant A products', async () => {
      const response = await request(app)
        .put(`/api/merchant/products/${productAId}`)
        .set('Authorization', `Bearer ${merchantBToken}`)
        .send({
          name: 'Hacked Product'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should prevent merchant B from deleting merchant A products', async () => {
      const response = await request(app)
        .delete(`/api/merchant/products/${productAId}`)
        .set('Authorization', `Bearer ${merchantBToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);

      // Verify product still exists
      const getResponse = await request(app)
        .get(`/api/merchant/products/${productAId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.success).toBe(true);
    });
  });

  describe('Scan Statistics', () => {
    it('should get scan statistics', async () => {
      const response = await request(app)
        .get('/api/merchant/scan')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_scans');
      expect(response.body.data).toHaveProperty('unique_users');
      expect(response.body.data).toHaveProperty('today_scans');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/merchant/scan')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/merchant/scan?startDate=2026-02-01&endDate=2026-02-28')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('scans_by_date');
    });
  });
});
```

##### 5.4 编写数据模型测试 (30分钟)

创建 `backend/tests/models/merchant.test.ts`:

```typescript
import { testPool } from '../test-setup';

describe('Merchant Model', () => {
  beforeEach(async () => {
    await testPool.execute('DELETE FROM merchants WHERE 1=1');
  });

  describe('Create Merchant', () => {
    it('should create merchant with valid data', async () => {
      const [result] = await testPool.execute(
        'INSERT INTO merchants (username, password, shop_name, is_active) VALUES (?, ?, ?, ?)',
        ['test_user', 'hashed_password', 'Test Shop', 1]
      );

      expect(result.affectedRows).toBe(1);
    });

    it('should enforce unique username', async () => {
      await testPool.execute(
        'INSERT INTO merchants (username, password, shop_name, is_active) VALUES (?, ?, ?, ?)',
        ['test_user', 'hashed_password', 'Test Shop', 1]
      );

      await expect(
        testPool.execute(
          'INSERT INTO merchants (username, password, shop_name, is_active) VALUES (?, ?, ?, ?)',
          ['test_user', 'hashed_password', 'Another Shop', 1]
        )
      ).rejects.toThrow();
    });
  });

  describe('Merchant Relations', () => {
    it('should cascade delete related products', async () => {
      // Create merchant
      const [merchantResult] = await testPool.execute(
        'INSERT INTO merchants (username, password, shop_name, is_active) VALUES (?, ?, ?, ?)',
        ['test_user', 'hashed_password', 'Test Shop', 1]
      );
      const merchantId = (merchantResult as any).insertId;

      // Create product for merchant
      await testPool.execute(
        'INSERT INTO product_categories (merchant_id, name, description) VALUES (?, ?, ?)',
        [merchantId, 'Test Category', 'Test Description']
      );

      const [categoryResult] = await testPool.execute('SELECT LAST_INSERT_ID() as id');
      const categoryId = (categoryResult as any)[0].id;

      await testPool.execute(
        'INSERT INTO product_items (merchant_id, category_id, name, description, tags, price) VALUES (?, ?, ?, ?, ?, ?)',
        [merchantId, categoryId, 'Test Product', 'Test', 'test', 100]
      );

      // Delete merchant
      await testPool.execute('DELETE FROM merchants WHERE id = ?', [merchantId]);

      // Verify products are deleted
      const [products] = await testPool.execute(
        'SELECT COUNT(*) as count FROM product_items WHERE merchant_id = ?',
        [merchantId]
      );

      expect((products as any)[0].count).toBe(0);
    });

    it('should cascade delete related prizes', async () => {
      // Create merchant
      const [merchantResult] = await testPool.execute(
        'INSERT INTO merchants (username, password, shop_name, is_active) VALUES (?, ?, ?, ?)',
        ['test_user', 'hashed_password', 'Test Shop', 1]
      );
      const merchantId = (merchantResult as any).insertId;

      // Create prize for merchant
      await testPool.execute(
        'INSERT INTO prizes (merchant_id, name, description, probability, stock) VALUES (?, ?, ?, ?, ?)',
        [merchantId, 'Test Prize', 'Test', 0.5, 10]
      );

      // Delete merchant
      await testPool.execute('DELETE FROM merchants WHERE id = ?', [merchantId]);

      // Verify prizes are deleted
      const [prizes] = await testPool.execute(
        'SELECT COUNT(*) as count FROM prizes WHERE merchant_id = ?',
        [merchantId]
      );

      expect((prizes as any)[0].count).toBe(0);
    });
  });
});
```

##### 5.5 运行测试并生成覆盖率报告 (15分钟)

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式（开发时使用）
npm run test:watch
```

**覆盖率目标**:
- 中间件: > 80%
- API端点: > 70%
- 数据模型: > 80%
- 总体覆盖率: > 75%

#### 验收标准

**必须满足**:
- [ ] 测试环境配置完成
- [ ] 中间件测试覆盖所有主要功能
- [ ] API测试覆盖关键端点
- [ ] 数据模型测试包含外键级联删除
- [ ] 跨商家访问防护测试通过
- [ ] 所有测试用例都能成功运行
- [ ] 测试覆盖率达到目标
- [ ] 测试报告已保存

---

## 📊 任务总结

### 优先级1任务（必须完成）

| 任务 | 预估时间 | 风险 | 状态 |
|------|----------|------|------|
| 任务1: 数据库迁移执行 | 2-3h | 🔴 高 | 待执行 |
| 任务2: 端到端测试 | 3-4h | 🟠 中高 | 待执行 |
| **小计** | **5-7h** | - | - |

### 优先级2任务（应该完成）

| 任务 | 预估时间 | 风险 | 状态 |
|------|----------|------|------|
| 任务3: 文档完善 | 2-3h | 🟡 中 | 待完成 |
| 任务4: 环境配置优化 | 1h | 🟡 中 | 待完成 |
| 任务5: 单元测试 | 2-3h | 🟡 中 | 待完成 |
| **小计** | **5-7h** | - | - |

### 总计

- **总预估时间**: 10-14小时
- **推荐执行顺序**: 任务1 → 任务2 → 任务3/4/5（可并行）
- **建议分阶段执行**:
  - 第一阶段（当天）: 任务1 + 任务2（确保系统可运行）
  - 第二阶段（1-2天内）: 任务3 + 任务4（提升可维护性）
  - 第三阶段（2-3天内）: 任务5（提升代码质量）

---

## ✅ 执行检查清单

### 任务1: 数据库迁移执行

- [ ] 备份数据库
- [ ] 验证迁移前状态
- [ ] 执行迁移006
- [ ] 执行迁移007
- [ ] 验证表结构
- [ ] 验证外键约束
- [ ] 验证索引
- [ ] 验证数据完整性
- [ ] 测试级联删除
- [ ] 记录迁移日志

### 任务2: 端到端测试

- [ ] 启动后端服务
- [ ] 创建测试商家A和B
- [ ] 为商家A创建测试数据
- [ ] 测试数据隔离
- [ ] 测试跨商家访问防护
- [ ] 测试错误场景
- [ ] 测试二维码防伪造
- [ ] 测试扫码统计
- [ ] 生成测试报告

### 任务3: 文档完善

- [ ] 更新backend/README.md
- [ ] 创建多租户架构文档
- [ ] 创建API参考文档
- [ ] 创建部署指南
- [ ] 验证所有文档完整

### 任务4: 环境配置优化

- [ ] 更新.env.example
- [ ] 创建环境配置说明文档
- [ ] 添加密钥生成方法
- [ ] 添加安全建议
- [ ] 添加不同环境配置示例

### 任务5: 单元测试

- [ ] 配置测试环境
- [ ] 编写中间件测试
- [ ] 编写API测试
- [ ] 编写数据模型测试
- [ ] 运行所有测试
- [ ] 生成覆盖率报告

---

## 📝 附录

### A. 迁移回滚步骤

如果迁移失败或需要回滚：

```bash
# 1. 回滚迁移007
npx ts-node -e "require('./src/database/migrations/007-add-scan-statistics-table').down()"

# 2. 回滚迁移006
npx ts-node -e "require('./src/database/migrations/006-add-multi-tenant-support').down()"

# 3. 恢复数据库备份
mysql -u root -p haopingbao < backup_before_migration.sql
```

### B. 测试数据清理脚本

```sql
-- 清理测试数据
DELETE FROM qr_code_scans WHERE merchant_id > 1;
DELETE FROM qr_scan_statistics WHERE merchant_id > 1;
DELETE FROM lottery_codes WHERE merchant_id > 1;
DELETE FROM prizes WHERE merchant_id > 1;
DELETE FROM product_images WHERE product_item_id IN (
  SELECT id FROM product_items WHERE merchant_id > 1
);
DELETE FROM product_items WHERE merchant_id > 1;
DELETE FROM product_categories WHERE merchant_id > 1;
DELETE FROM merchants WHERE id > 1;
```

### C. 有用的SQL查询

```sql
-- 查看所有表及其merchant_id字段
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  IS_NULLABLE,
  COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'haopingbao'
  AND COLUMN_NAME = 'merchant_id'
ORDER BY TABLE_NAME;

-- 查看所有外键约束
SELECT
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'haopingbao'
  AND REFERENCED_TABLE_NAME = 'merchants';

-- 查看数据分布
SELECT
  'merchants' as table_name,
  COUNT(*) as total_count
FROM merchants
UNION ALL
SELECT
  'product_categories',
  COUNT(*)
FROM product_categories
UNION ALL
SELECT
  'product_items',
  COUNT(*)
FROM product_items
UNION ALL
SELECT
  'prizes',
  COUNT(*)
FROM prizes;
```

---

**计划版本**: 1.0
**创建日期**: 2026-02-16
**基于**: `docs/review/multi-tenant-completion-review.md`
**维护者**: Haopingbao Team
