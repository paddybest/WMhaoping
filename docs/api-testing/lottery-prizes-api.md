# 小程序奖品列表API测试文档

**创建日期**: 2026-02-16
**任务**: 任务7 - 小程序API奖品列表接口多租户改造
**状态**: 代码实现完成，待测试

---

## 📋 API端点概览

### 1. 获取奖品列表
```http
GET /api/lottery/prizes?merchantId=123
```

### 2. 执行抽奖
```http
POST /api/lottery/draw
Content-Type: application/json

{
  "userId": 1,
  "merchantId": 123
}
```

---

## 🔧 前置条件

在测试之前，请确保：

1. ✅ **数据库迁移已完成**
   ```bash
   cd backend
   npm run migrate
   ```
   验证 `prizes` 表和 `lottery_codes` 表都有 `merchant_id` 字段

2. ✅ **测试数据已准备**
   ```sql
   -- 创建测试商家
   INSERT INTO merchants (id, username, password, shop_name, name, description, is_active)
   VALUES (1, 'test_merchant', 'hash', 'Test Shop', '测试店铺', '这是一个测试店铺', 1);

   -- 为商家1创建奖品
   INSERT INTO prizes (merchant_id, name, description, probability, stock, image_url)
   VALUES
   (1, '一等奖', 'iPhone 15', 0.01, 1, 'https://example.com/iphone.jpg'),
   (1, '二等奖', 'iPad Air', 0.05, 5, 'https://example.com/ipad.jpg'),
   (1, '三等奖', '20元优惠券', 0.2, 50, 'https://example.com/coupon20.jpg'),
   (1, '谢谢参与', '再接再厉', 0.74, 1000, NULL);

   -- 创建第二个商家的奖品（用于测试数据隔离）
   INSERT INTO prizes (merchant_id, name, description, probability, stock, image_url)
   VALUES (2, '商家2特等奖', 'MacBook Pro', 0.01, 1, 'https://example.com/macbook.jpg');
   ```

3. ✅ **服务器正在运行**
   ```bash
   cd backend
   npm start
   ```
   验证服务器在 `http://localhost:7777` 运行

---

## 🧪 测试用例

### 测试用例1: 获取商家1的奖品列表

**请求**:
```bash
curl -X GET "http://localhost:7777/api/lottery/prizes?merchantId=1"
```

**期望响应** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "一等奖",
      "description": "iPhone 15",
      "probability": 0.01,
      "stock": 1,
      "image_url": "https://example.com/iphone.jpg"
    },
    {
      "id": 2,
      "name": "二等奖",
      "description": "iPad Air",
      "probability": 0.05,
      "stock": 5,
      "image_url": "https://example.com/ipad.jpg"
    },
    {
      "id": 3,
      "name": "三等奖",
      "description": "20元优惠券",
      "probability": 0.2,
      "stock": 50,
      "image_url": "https://example.com/coupon20.jpg"
    },
    {
      "id": 4,
      "name": "谢谢参与",
      "description": "再接再厉",
      "probability": 0.74,
      "stock": 1000,
      "image_url": null
    }
  ],
  "count": 4
}
```

**验证点**:
- ✅ 返回4个奖品（都是商家1的）
- ✅ 不包含商家2的奖品
- ✅ `count` 字段正确

---

### 测试用例2: 获取商家2的奖品列表

**请求**:
```bash
curl -X GET "http://localhost:7777/api/lottery/prizes?merchantId=2"
```

**期望响应** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "商家2特等奖",
      "description": "MacBook Pro",
      "probability": 0.01,
      "stock": 1,
      "image_url": "https://example.com/macbook.jpg"
    }
  ],
  "count": 1
}
```

**验证点**:
- ✅ 只返回商家2的1个奖品
- ✅ 不包含商家1的任何奖品
- ✅ 数据隔离生效

---

### 测试用例3: 缺少merchantId参数

**请求**:
```bash
curl -X GET "http://localhost:7777/api/lottery/prizes"
```

**期望响应** (400 Bad Request):
```json
{
  "success": false,
  "error": "merchantId参数必填"
}
```

**验证点**:
- ✅ 返回400状态码
- ✅ 错误信息清晰

---

### 测试用例4: 无效的merchantId

**请求**:
```bash
curl -X GET "http://localhost:7777/api/lottery/prizes?merchantId=99999"
```

**期望响应** (200 OK):
```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

**验证点**:
- ✅ 返回空数组（不报错）
- ✅ `count` 为0

---

### 测试用例5: 执行抽奖（商家1）

**请求**:
```bash
curl -X POST "http://localhost:7777/api/lottery/draw" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "merchantId": 1
  }'
```

**期望响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "prize": {
      "id": 4,
      "name": "谢谢参与",
      "description": "再接再厉",
      "probability": 0.74,
      "stock": 999,
      "image_url": null
    },
    "code": "ABC123",
    "message": "恭喜中奖！"
  }
}
```

**验证点**:
- ✅ 只能抽到商家1的奖品池
- ✅ 库存正确减少
- ✅ 生成兑换码
- ✅ 概率计算正确

---

### 测试用例6: 执行抽奖缺少参数

**请求**:
```bash
curl -X POST "http://localhost:7777/api/lottery/draw" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1
  }'
```

**期望响应** (400 Bad Request):
```json
{
  "success": false,
  "error": "userId和merchantId参数必填"
}
```

**验证点**:
- ✅ 返回400状态码
- ✅ 错误信息清晰说明缺失的参数

---

### 测试用例7: 数据隔离验证

**目的**: 验证抽奖逻辑正确隔离商家数据

**步骤1**: 用户A通过商家1抽奖
```bash
curl -X POST "http://localhost:7777/api/lottery/draw" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "merchantId": 1
  }'
```

**步骤2**: 查询数据库验证
```sql
-- 检查生成的lottery_code记录是否关联正确的merchant
SELECT lc.id, lc.code, lc.merchant_id, p.name as prize_name, p.merchant_id as prize_merchant_id
FROM lottery_codes lc
JOIN prizes p ON lc.prize_id = p.id
WHERE lc.user_id = 1
ORDER BY lc.created_at DESC
LIMIT 1;
```

**验证点**:
- ✅ `lottery_codes.merchant_id` = 1
- ✅ `prizes.merchant_id` = 1
- ✅ 商家ID一致性

---

## 🔍 数据库验证查询

### 验证prizes表merchant_id字段
```sql
DESCRIBE prizes;
-- 期望: merchant_id | int | NO
```

### 验证所有奖品都有merchant_id
```sql
SELECT COUNT(*) as null_merchant_ids FROM prizes WHERE merchant_id IS NULL;
-- 期望: 0
```

### 验证外键约束存在
```sql
SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'prizes'
  AND CONSTRAINT_NAME = 'fk_prizes_merchant';
-- 期望: fk_prizes_merchant | merchants
```

### 验证按商家过滤奖品
```sql
-- 商家1的奖品
SELECT id, name, merchant_id FROM prizes WHERE merchant_id = 1;

-- 商家2的奖品
SELECT id, name, merchant_id FROM prizes WHERE merchant_id = 2;
```

---

## 📊 性能测试

### 测试查询性能（使用索引）
```sql
EXPLAIN SELECT * FROM prizes WHERE merchant_id = 1;
```

**期望结果**:
- `type`: `ref`（使用索引）
- `key`: `idx_prizes_merchant_id`
- `rows`: 预期扫描行数

**如果不使用索引**:
- `type`: `ALL`（全表扫描）
- 需要检查索引是否正确创建

---

## 🐛 故障排查

### 问题1: API返回"merchantId参数必填"
**原因**: 缺少查询参数
**解决**: 确保URL包含 `?merchantId=123`

### 问题2: 返回空数组但预期有数据
**检查**:
1. 数据库中是否存在该merchant_id的奖品？
   ```sql
   SELECT * FROM prizes WHERE merchant_id = ?;
   ```
2. merchant_id是否正确？
3. 数据库迁移是否成功？

### 问题3: 抽奖时库存未减少
**检查**:
1. PrizeModel.decrementStock是否调用
2. 数据库连接是否正常
3. 是否有事务回滚

### 问题4: TypeError - Cannot read property 'merchant_id'
**原因**: Prize接口未更新或数据库中merchant_id为NULL
**检查**:
1. 运行数据库迁移
2. 验证所有记录都有merchant_id
3. 重启服务器

---

## ✅ 测试检查清单

- [ ] 测试用例1: 获取商家1奖品列表 - 通过
- [ ] 测试用例2: 获取商家2奖品列表 - 通过
- [ ] 测试用例3: 缺少merchantId参数 - 通过
- [ ] 测试用例4: 无效merchantId - 通过
- [ ] 测试用例5: 执行抽奖 - 通过
- [ ] 测试用例6: 抽奖缺少参数 - 通过
- [ ] 测试用例7: 数据隔离验证 - 通过
- [ ] 数据库验证: merchant_id字段存在
- [ ] 数据库验证: 外键约束存在
- [ ] 数据库验证: 索引创建成功
- [ ] 性能测试: 查询使用索引

---

## 📝 测试结果记录

**测试日期**: ___________
**测试人员**: ___________
**数据库版本**: ___________
**Node.js版本**: ___________

| 测试用例 | 状态 | 备注 |
|---------|------|------|
| 用例1 | ⏳ | |
| 用例2 | ⏳ | |
| 用例3 | ⏳ | |
| 用例4 | ⏳ | |
| 用例5 | ⏳ | |
| 用例6 | ⏳ | |
| 用例7 | ⏳ | |

**总体状态**: ⏳ 待测试

**问题记录**:
-

**建议**:
-

---

## 🎯 下一步

测试通过后：
1. ✅ 标记任务7为完成
2. ⏳ 继续任务8: 小程序其他API改造
3. ⏳ 更新小程序前端代码调用新API
4. ⏳ 端到端测试

---

## 🔗 相关文档

- [多租户架构设计文档](../plans/2026-02-16-multi-tenant-architecture-design.md)
- [Migration 006使用指南](../migrations/006-usage-guide.md)
- [Prize模型](../../backend/src/database/models/Prize.ts)
- [Lottery服务](../../backend/src/services/lottery.ts)
- [Lottery路由](../../backend/src/routes/lottery.ts)
