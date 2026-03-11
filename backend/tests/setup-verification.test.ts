/**
 * Setup Verification Test
 *
 * This test verifies that all test setup files are properly loaded and configured.
 */

import {
  generateTestMerchantToken,
  generateTestUserToken,
  generateTestQRCodeSignature,
  hashTestPassword
} from './helpers';

describe('Test Setup Verification', () => {
  it('should have mocked MerchantModel available', () => {
    const { MerchantModel } = require('../src/database/models/Merchant');
    expect(MerchantModel).toBeDefined();
    expect(MerchantModel.findById).toBeDefined();
  });

  it('should have mocked PrizeModel available', () => {
    const { PrizeModel } = require('../src/database/models/Prize');
    expect(PrizeModel).toBeDefined();
    expect(PrizeModel.findById).toBeDefined();
  });

  it('should have mocked LotteryCodeModel available', () => {
    const { LotteryCodeModel } = require('../src/database/models/LotteryCode');
    expect(LotteryCodeModel).toBeDefined();
    expect(LotteryCodeModel.findByCode).toBeDefined();
  });

  it('should have mocked QR code signature functions available', () => {
    const { verifyQRCodeSignature, generateQRCodeSignature } = require('../src/services/qrcode');
    expect(verifyQRCodeSignature).toBeDefined();
    expect(generateQRCodeSignature).toBeDefined();
  });

  it('should generate test merchant token successfully', () => {
    const token = generateTestMerchantToken(1, 'test_merchant');
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should generate test user token successfully', () => {
    const token = generateTestUserToken(1, 'test_openid');
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should generate test QR code signature successfully', () => {
    const signature = generateTestQRCodeSignature(1);
    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);
  });

  it('should hash test password successfully', async () => {
    const hashedPassword = await hashTestPassword('test_password');
    expect(hashedPassword).toBeDefined();
    expect(typeof hashedPassword).toBe('string');
    expect(hashedPassword.length).toBeGreaterThan(0);
    expect(hashedPassword).not.toBe('test_password');
  });

  it('should have mocked database connection available', () => {
    const { pool } = require('../src/database/connection');
    expect(pool).toBeDefined();
  });
});
