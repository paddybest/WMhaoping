// 测试数据库设置
import { jest } from '@jest/globals';

// 启用自动mock
jest.mock('../src/database/connection');
jest.mock('../src/database/models/User');
jest.mock('../src/database/models/Product');
jest.mock('../src/database/models/Review');
jest.mock('../src/database/models/MerchantBalance');
jest.mock('../src/database/models/RedemptionRecord');
jest.mock('../src/services/ai');

// 设置mock值
const { pool } = require('../src/database/connection');
const { UserModel } = require('../src/database/models/User');
const { ProductModel } = require('../src/database/models/Product');
const { ReviewModel } = require('../src/database/models/Review');
const { MerchantBalanceModel } = require('../src/database/models/MerchantBalance');
const { RedemptionRecordModel } = require('../src/database/models/RedemptionRecord');
const { AIService } = require('../src/services/ai');

// 配置UserModel mock
UserModel.findByOpenid.mockResolvedValue({
  id: 1,
  openid: 'mock_openid_test123',
  nickname: 'Test User',
  created_at: new Date(),
  updated_at: new Date()
});

UserModel.create.mockResolvedValue({
  id: 1,
  openid: 'mock_openid_test123',
  nickname: 'Test User',
  created_at: new Date(),
  updated_at: new Date()
});

UserModel.findById.mockResolvedValue({
  id: 1,
  openid: 'mock_openid_test123',
  nickname: 'Test User',
  created_at: new Date(),
  updated_at: new Date()
});

// 配置ProductModel mock
ProductModel.findAll.mockResolvedValue([]);
ProductModel.findById.mockResolvedValue(null);
ProductModel.create.mockResolvedValue({
  id: 1,
  name: 'Test Product',
  tags: ['test'],
  created_at: new Date(),
  updated_at: new Date()
});
ProductModel.update.mockResolvedValue({
  id: 1,
  name: 'Updated Product',
  tags: ['updated'],
  created_at: new Date(),
  updated_at: new Date()
});
ProductModel.delete.mockResolvedValue(true);

// 配置ReviewModel mock
ReviewModel.findByUserId.mockResolvedValue([]);

// 配置AIService mock
AIService.generateReview.mockResolvedValue({
  content: '这是一条测试评价内容。',
  imageUrl: null
});

// 配置MerchantBalanceModel mock
MerchantBalanceModel.findByMerchantId.mockResolvedValue({
  id: 1,
  merchant_id: 1,
  balance: 1000.00,
  total_recharged: 1000.00,
  total_redeemed: 0,
  created_at: new Date(),
  updated_at: new Date()
});

MerchantBalanceModel.getOrCreate.mockResolvedValue({
  id: 1,
  merchant_id: 1,
  balance: 1000.00,
  total_recharged: 1000.00,
  total_redeemed: 0,
  created_at: new Date(),
  updated_at: new Date()
});

MerchantBalanceModel.recharge.mockResolvedValue({
  id: 1,
  merchant_id: 1,
  balance: 1100.00,
  total_recharged: 1100.00,
  total_redeemed: 0,
  created_at: new Date(),
  updated_at: new Date()
});

MerchantBalanceModel.deduct.mockResolvedValue(true);

// 配置RedemptionRecordModel mock
RedemptionRecordModel.create.mockResolvedValue({
  id: 1,
  merchant_id: 1,
  user_id: 1,
  prize_id: 2,
  reward_code: 'TEST123',
  cash_amount: 5.00,
  status: 'pending',
  created_at: new Date(),
  updated_at: new Date()
});

RedemptionRecordModel.findByRewardCode.mockResolvedValue(null);
RedemptionRecordModel.findById.mockResolvedValue(null);
RedemptionRecordModel.findByMerchant.mockResolvedValue([]);
RedemptionRecordModel.findByUser.mockResolvedValue([]);
RedemptionRecordModel.updateStatus.mockResolvedValue(true);
RedemptionRecordModel.uploadScreenshot.mockResolvedValue(true);