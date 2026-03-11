# 返现系统设计方案

## 概述

商家预充值模式 + 商家自定义奖品返现金额 + 微信零钱转账

## 核心逻辑

```
商家充值 → 余额池 → 抽奖扣费 → 用户兑换 → 微信转账
```

---

## 1. 数据库设计

### 1.1 新增表：merchant_balance（商家余额池）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| merchant_id | INT | 商家ID（唯一） |
| balance | DECIMAL(10,2) | 当前余额（元） |
| total_recharged | DECIMAL(10,2) | 累计充值 |
| total_redeemed | DECIMAL(10,2) | 累计返现 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 1.2 修改表：prizes（添加返现金额）

| 字段 | 类型 | 说明 |
|------|------|------|
| cash_amount | DECIMAL(10,2) | 返现金额（元），0表示谢谢参与不返现 |
| is_cash_reward | TINYINT | 是否为现金奖励（1=现金，0=优惠券/实物） |

### 1.3 新增表：redemption_records（返现记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| merchant_id | INT | 商家ID |
| user_id | INT | 用户ID |
| prize_id | INT | 奖品ID |
| lottery_record_id | INT | 抽奖记录ID |
| reward_code | VARCHAR(6) | 兑换码 |
| cash_amount | DECIMAL(10,2) | 返现金额 |
| status | VARCHAR(20) | 状态（pending/success/failed/verified） |
| screenshot_url | VARCHAR(500) | 好评截图URL |
| verified_by | INT | 审核人ID |
| verified_at | TIMESTAMP | 审核时间 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

---

## 2. 业务流程

### 2.1 抽奖阶段

```
用户点击抽奖 → 随机选中奖品
     ↓
如果奖品.is_cash_reward = 1 且 cash_amount > 0:
     ↓
生成返现记录（status=pending）
     ↓
记录到 lottery_codes（已有）
     ↓
记录到 redemption_records（新增，status=pending）
```

### 2.2 用户兑换阶段

```
用户点击"兑换现金红包"
     ↓
跳转审核页面（/pages/verify/index）
     ↓
用户上传好评截图
     ↓
提交审核（status: pending → screenshot_url已上传）
```

### 2.3 商家审核阶段

```
商家在后台看到待审核列表
     ↓
商家查看好评截图
     ↓
点击"通过" → status: success
     ↓
点击"拒绝" → status: failed
```

### 2.4 返现执行阶段（status=success时触发）

```
扣减商家余额：
  merchant_balance.balance -= cash_amount
  merchant_balance.total_redeemed += cash_amount
     ↓
调用微信支付转账API
     ↓
更新状态：status: success
     ↓
返回结果给前端
```

---

## 3. API设计

### 3.1 商家端API

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/merchant/balance | GET | 获取商家余额 |
| /api/merchant/balance/recharge | POST | 充值（生成支付订单） |
| /api/merchant/redemption/list | GET | 返现记录列表 |
| /api/merchant/redemption/verify | POST | 审核通过/拒绝 |
| /api/merchant/prizes | GET/POST/PUT | 奖品管理（含返现金额） |

### 3.2 用户端API

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/lottery/draw | POST | 抽奖（已实现） |
| /api/redemption/create | POST | 创建返现记录 |
| /api/redemption/upload-screenshot | POST | 上传好评截图 |
| /api/redemption/status | GET | 查询返现状态 |

---

## 4. 后台功能

### 4.1 商家端功能

- **余额管理**
  - 查看当前余额
  - 充值（微信支付扫码）
  - 充值记录

- **奖品管理**
  - 添加/编辑奖品
  - 设置每个奖品的返现金额（cash_amount）
  - 设置是否现金奖励（is_cash_reward）

- **返现审核**
  - 待审核列表
  - 查看截图
  - 通过/拒绝

- **数据统计**
  - 累计充值
  - 累计返现
  - 余额

### 4.2 用户端功能

- 抽奖
- 查看中奖结果
- 点击"兑换现金红包" → 上传截图
- 查看返现状态

---

## 5. 关键逻辑

### 5.1 抽奖时余额检查

```typescript
// 抽奖前检查商家余额是否足够
const balance = await MerchantBalanceModel.getByMerchantId(merchantId);
if (balance < prize.cash_amount) {
  return { success: false, message: '商家余额不足，无法参与抽奖' };
}
```

### 5.2 扣款时机

两种方案：
- **方案A**: 抽奖时立即扣款（推荐）
- **方案B**: 审核通过后扣款

推荐方案A，避免用户恶意抽奖后不兑换。

### 5.3 微信转账

使用微信支付的企业转账到用户零钱API：
- `wx.pay.transfers`
- 需要商家开通微信支付商户号
- 测试环境使用模拟接口

---

## 6. 待定事项

- [ ] 微信支付商户号配置
- [ ] 充值回调处理
- [ ] 转账回调处理
- [ ] 异常处理（转账失败退款）

---

## 版本

- v1.0 - 2026-03-10
