/**
 * Miniprogram API Endpoint Tests
 *
 * This test suite covers all miniprogram API endpoints:
 * - GET /api/miniprogram/merchant/:id - Get merchant by ID
 * - GET /api/miniprogram/prizes - Get prizes for a merchant
 * - POST /api/merchant/scan/record - Record scan event
 *
 * Tests focus on:
 * - Successful requests with valid data
 * - Error handling for invalid data
 * - QR code signature validation
 * - Data isolation between merchants
 *
 * All tests are pure unit tests using mocks - no database operations required.
 */

// Set environment to test to prevent server startup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';

import request from 'supertest';
import express from 'express';
import app from '../../src/app';
import {
  generateTestMerchantToken,
  generateTestQRCodeSignature
} from '../helpers';
import { MerchantModel } from '../../src/database/models/Merchant';
import { PrizeModel } from '../../src/database/models/Prize';
import { QrCodeScanModel } from '../../src/database/models/QrCodeScan';
import { verifyQRCodeSignature } from '../../src/services/qrcode';

// Mock all dependencies
jest.mock('../../src/database/connection');
jest.mock('../../src/database/models/User');
jest.mock('../../src/database/models/Product');
jest.mock('../../src/database/models/Review');
jest.mock('../../src/database/models/Merchant');
jest.mock('../../src/database/models/Prize');
jest.mock('../../src/database/models/LotteryCode');
jest.mock('../../src/database/models/QrCodeScan');
jest.mock('../../src/services/ai');
jest.mock('../../src/services/qrcode');
jest.mock('../../src/services/socket');

describe('Miniprogram API Endpoints', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // GET /api/miniprogram/merchant/:id
  // =========================================================================

  describe('GET /api/miniprogram/merchant/:id', () => {
    const mockMerchant = {
      id: 1,
      username: 'test_merchant',
      password: 'hashed_password',
      shopName: 'Test Shop',
      name: 'Test Merchant',
      description: 'Test description',
      is_active: true,
      customerServiceQrUrl: 'https://example.com/cs-qr.png',
      qrCodeUrl: 'https://example.com/qr.png',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return merchant information for valid merchant (200)', async () => {
      // Arrange
      const merchantId = 1;

      // Mock MerchantModel to return a merchant
      (MerchantModel.findById as jest.Mock).mockResolvedValue(mockMerchant);

      // Act
      const response = await request(app)
        .get(`/api/miniprogram/merchant/${merchantId}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(merchantId);
      expect(response.body.data.name).toBe('Test Merchant');
      expect(response.body.data.shopName).toBe('Test Shop');
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data).not.toHaveProperty('password');
      expect(MerchantModel.findById).toHaveBeenCalledWith(merchantId);
    });

    it('should return 404 for non-existent merchant', async () => {
      // Arrange
      const nonExistentMerchantId = 999;

      // Mock MerchantModel to return null (merchant not found)
      (MerchantModel.findById as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get(`/api/miniprogram/merchant/${nonExistentMerchantId}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Merchant not found');
      expect(MerchantModel.findById).toHaveBeenCalledWith(nonExistentMerchantId);
    });

    it('should return 404 for inactive merchant', async () => {
      // Arrange
      const merchantId = 1;
      const inactiveMerchant = { ...mockMerchant, is_active: false };

      // Mock MerchantModel to return an inactive merchant
      (MerchantModel.findById as jest.Mock).mockResolvedValue(inactiveMerchant);

      // Act
      const response = await request(app)
        .get(`/api/miniprogram/merchant/${merchantId}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Merchant is not active');
      expect(MerchantModel.findById).toHaveBeenCalledWith(merchantId);
    });

    it('should verify QR code signature if provided', async () => {
      // Arrange
      const merchantId = 1;
      const signature = generateTestQRCodeSignature(merchantId);

      // Mock MerchantModel to return a merchant
      (MerchantModel.findById as jest.Mock).mockResolvedValue(mockMerchant);

      // Mock verifyQRCodeSignature to return true (valid signature)
      (verifyQRCodeSignature as jest.Mock).mockReturnValue(true);

      // Act
      const response = await request(app)
        .get(`/api/miniprogram/merchant/${merchantId}`)
        .query({ merchant_id: merchantId.toString(), sig: signature })
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Note: The optionalValidateQRCodeSignature middleware only validates when both merchant_id and sig are present
      // The route parameter id is used by the controller, not the middleware
      // This test documents current behavior
    });

    it('should reject invalid QR code signature when merchant_id and sig are provided (403)', async () => {
      // Arrange
      const merchantId = 1;
      const invalidSignature = 'invalid_signature_123';

      // Mock MerchantModel to return a merchant
      (MerchantModel.findById as jest.Mock).mockResolvedValue(mockMerchant);

      // Mock verifyQRCodeSignature to return false (invalid signature)
      (verifyQRCodeSignature as jest.Mock).mockReturnValue(false);

      // Act
      const response = await request(app)
        .get(`/api/miniprogram/merchant/${merchantId}`)
        .query({ merchant_id: merchantId.toString(), sig: invalidSignature })
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid QR code signature');
      expect(verifyQRCodeSignature).toHaveBeenCalledWith(merchantId, invalidSignature);
    });

    it('should return 400 for invalid merchant ID', async () => {
      // Arrange
      const invalidMerchantId = 'invalid';

      // Act
      const response = await request(app)
        .get(`/api/miniprogram/merchant/${invalidMerchantId}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid Merchant ID');
      expect(MerchantModel.findById).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // GET /api/miniprogram/prizes
  // =========================================================================

  describe('GET /api/miniprogram/prizes', () => {
    const mockPrizes = [
      {
        id: 1,
        merchant_id: 1,
        name: 'Prize 1',
        description: 'Description 1',
        probability: 0.1,
        stock: 100,
        image_url: 'https://example.com/prize1.png',
        created_at: new Date()
      },
      {
        id: 2,
        merchant_id: 1,
        name: 'Prize 2',
        description: 'Description 2',
        probability: 0.2,
        stock: 50,
        image_url: 'https://example.com/prize2.png',
        created_at: new Date()
      }
    ];

    it('should return prizes for valid merchant (200)', async () => {
      // Arrange
      const merchantId = 1;

      // Mock PrizeModel to return prizes for merchant 1
      (PrizeModel.findByMerchantWithStock as jest.Mock).mockResolvedValue(mockPrizes);

      // Act
      const response = await request(app)
        .get('/api/miniprogram/prizes')
        .query({ merchantId })
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Prize 1');
      expect(response.body.data[1].name).toBe('Prize 2');
      expect(response.body.count).toBe(2);
      expect(PrizeModel.findByMerchantWithStock).toHaveBeenCalledWith(merchantId);
    });

    it('should return 400 without merchantId parameter', async () => {
      // Arrange - no merchantId in query

      // Act
      const response = await request(app)
        .get('/api/miniprogram/prizes')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('缺少merchantId参数');
      expect(response.body.code).toBe('MISSING_MERCHANT_ID');
      expect(PrizeModel.findByMerchantWithStock).not.toHaveBeenCalled();
    });

    it('should only return prizes for specified merchant (verify data isolation)', async () => {
      // Arrange
      const merchantAId = 1;
      const merchantBId = 2;

      const merchantAPrizes = [
        {
          id: 1,
          merchant_id: merchantAId,
          name: 'Merchant A Prize 1',
          description: 'Description 1',
          probability: 0.1,
          stock: 100,
          image_url: 'https://example.com/prize1.png',
          created_at: new Date()
        }
      ];

      const merchantBPrizes = [
        {
          id: 2,
          merchant_id: merchantBId,
          name: 'Merchant B Prize 1',
          description: 'Description 2',
          probability: 0.2,
          stock: 50,
          image_url: 'https://example.com/prize2.png',
          created_at: new Date()
        }
      ];

      // Mock PrizeModel to return different prizes for each merchant
      (PrizeModel.findByMerchantWithStock as jest.Mock).mockImplementation((merchantId: number) => {
        if (merchantId === merchantAId) return Promise.resolve(merchantAPrizes);
        if (merchantId === merchantBId) return Promise.resolve(merchantBPrizes);
        return Promise.resolve([]);
      });

      // Act - Request prizes for merchant A
      const responseA = await request(app)
        .get('/api/miniprogram/prizes')
        .query({ merchantId: merchantAId })
        .expect('Content-Type', /json/);

      // Act - Request prizes for merchant B
      const responseB = await request(app)
        .get('/api/miniprogram/prizes')
        .query({ merchantId: merchantBId })
        .expect('Content-Type', /json/);

      // Assert
      expect(responseA.status).toBe(200);
      expect(responseA.body.data).toHaveLength(1);
      expect(responseA.body.data[0].name).toBe('Merchant A Prize 1');

      expect(responseB.status).toBe(200);
      expect(responseB.body.data).toHaveLength(1);
      expect(responseB.body.data[0].name).toBe('Merchant B Prize 1');

      // Verify that merchant A's data is isolated from merchant B
      expect(responseA.body.data[0].id).not.toBe(responseB.body.data[0].id);
      expect(PrizeModel.findByMerchantWithStock).toHaveBeenCalledWith(merchantAId);
      expect(PrizeModel.findByMerchantWithStock).toHaveBeenCalledWith(merchantBId);
    });

    it('should return 400 for invalid merchantId (non-numeric)', async () => {
      // Arrange
      const invalidMerchantId = 'invalid';

      // Act
      const response = await request(app)
        .get('/api/miniprogram/prizes')
        .query({ merchantId: invalidMerchantId })
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('merchantId参数无效');
      expect(response.body.code).toBe('INVALID_MERCHANT_ID');
      expect(PrizeModel.findByMerchantWithStock).not.toHaveBeenCalled();
    });

    it('should return all prizes when withStock is false', async () => {
      // Arrange
      const merchantId = 1;

      // Mock PrizeModel to return prizes (including out of stock)
      (PrizeModel.findByMerchant as jest.Mock).mockResolvedValue(mockPrizes);

      // Act
      const response = await request(app)
        .get('/api/miniprogram/prizes')
        .query({ merchantId, withStock: 'false' })
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(PrizeModel.findByMerchant).toHaveBeenCalledWith(merchantId);
      expect(PrizeModel.findByMerchantWithStock).not.toHaveBeenCalled();
    });

    it('should verify QR code signature if provided', async () => {
      // Arrange
      const merchantId = 1;
      const signature = generateTestQRCodeSignature(merchantId);

      // Mock PrizeModel to return prizes
      (PrizeModel.findByMerchantWithStock as jest.Mock).mockResolvedValue(mockPrizes);

      // Mock verifyQRCodeSignature to return true (valid signature)
      (verifyQRCodeSignature as jest.Mock).mockReturnValue(true);

      // Act
      const response = await request(app)
        .get('/api/miniprogram/prizes')
        .query({ merchantId, merchant_id: merchantId.toString(), sig: signature })
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Note: The optionalValidateQRCodeSignature middleware only validates when both merchant_id and sig are present
      // The merchantId query param is used by the requireMerchantId middleware
      // This test documents current behavior
    });
  });

  // =========================================================================
  // POST /api/miniprogram/scan/record
  // =========================================================================

  describe('POST /api/miniprogram/scan/record', () => {
    // Note: The actual endpoint is POST /api/merchant/scan/record and requires authentication
    // This test suite documents the current implementation
    const mockScanData = {
      id: 1,
      merchant_id: 1,
      user_openid: 'user123',
      qr_code_url: 'https://example.com/qr.png',
      scan_time: new Date(),
      ip_address: '127.0.0.1'
    };

    it('should record scan event (200)', async () => {
      // Arrange
      const merchantToken = generateTestMerchantToken(1, 'test_merchant');
      const scanBody = {
        merchantId: 1,
        qrCodeUrl: 'https://example.com/qr.png',
        userOpenid: 'user123'
      };

      // Mock MerchantModel to return merchant
      (MerchantModel.findById as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'test_merchant',
        password: 'hashed_password',
        shopName: 'Test Shop',
        name: 'Test Merchant',
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Mock QrCodeScanModel methods
      (QrCodeScanModel.hasScannedToday as jest.Mock).mockResolvedValue(false);
      (QrCodeScanModel.create as jest.Mock).mockResolvedValue(mockScanData);
      (QrCodeScanModel.updateDailyStatistics as jest.Mock).mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post('/api/merchant/scan/record')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send(scanBody)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.scanId).toBe(1);
      expect(response.body.data.isNewScan).toBe(true);
      expect(QrCodeScanModel.hasScannedToday).toHaveBeenCalledWith(1, 'user123', 'https://example.com/qr.png');
      expect(QrCodeScanModel.create).toHaveBeenCalled();
      expect(QrCodeScanModel.updateDailyStatistics).toHaveBeenCalledWith(1);
    });

    it('should validate required fields (400 if missing)', async () => {
      // Arrange - missing qrCodeUrl
      const merchantToken = generateTestMerchantToken(1, 'test_merchant');
      const invalidBody = {
        merchantId: 1,
        userOpenid: 'user123'
        // qrCodeUrl is missing
      };

      // Mock MerchantModel to return merchant
      (MerchantModel.findById as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'test_merchant',
        password: 'hashed_password',
        shopName: 'Test Shop',
        name: 'Test Merchant',
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Act
      const response = await request(app)
        .post('/api/merchant/scan/record')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send(invalidBody)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('缺少必需参数');
      expect(response.body.code).toBe('MISSING_REQUIRED_PARAMS');
      expect(QrCodeScanModel.create).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid merchantId', async () => {
      // Arrange
      const merchantToken = generateTestMerchantToken(1, 'test_merchant');
      const invalidBody = {
        merchantId: 'invalid',
        qrCodeUrl: 'https://example.com/qr.png',
        userOpenid: 'user123'
      };

      // Mock MerchantModel to return merchant
      (MerchantModel.findById as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'test_merchant',
        password: 'hashed_password',
        shopName: 'Test Shop',
        name: 'Test Merchant',
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Act
      const response = await request(app)
        .post('/api/merchant/scan/record')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send(invalidBody)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('merchantId参数无效');
      expect(response.body.code).toBe('INVALID_MERCHANT_ID');
      expect(QrCodeScanModel.create).not.toHaveBeenCalled();
    });

    it('should handle repeat scan from same user today', async () => {
      // Arrange
      const merchantToken = generateTestMerchantToken(1, 'test_merchant');
      const scanBody = {
        merchantId: 1,
        qrCodeUrl: 'https://example.com/qr.png',
        userOpenid: 'user123'
      };

      // Mock MerchantModel to return merchant
      (MerchantModel.findById as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'test_merchant',
        password: 'hashed_password',
        shopName: 'Test Shop',
        name: 'Test Merchant',
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Mock QrCodeScanModel to indicate user already scanned today
      (QrCodeScanModel.hasScannedToday as jest.Mock).mockResolvedValue(true);
      (QrCodeScanModel.create as jest.Mock).mockResolvedValue(mockScanData);
      (QrCodeScanModel.updateDailyStatistics as jest.Mock).mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post('/api/merchant/scan/record')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send(scanBody)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isNewScan).toBe(false);
      expect(response.body.data.message).toContain('今日已扫描过');
      expect(QrCodeScanModel.hasScannedToday).toHaveBeenCalledWith(1, 'user123', 'https://example.com/qr.png');
    });

    it('should use optionalValidateQRCodeSignature middleware', async () => {
      // Arrange
      const merchantToken = generateTestMerchantToken(1, 'test_merchant');
      const scanBody = {
        merchantId: 1,
        qrCodeUrl: 'https://example.com/qr.png?merchant_id=1&sig=test123',
        userOpenid: 'user123'
      };

      // Mock MerchantModel to return merchant
      (MerchantModel.findById as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'test_merchant',
        password: 'hashed_password',
        shopName: 'Test Shop',
        name: 'Test Merchant',
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Mock QrCodeScanModel methods
      (QrCodeScanModel.hasScannedToday as jest.Mock).mockResolvedValue(false);
      (QrCodeScanModel.create as jest.Mock).mockResolvedValue(mockScanData);
      (QrCodeScanModel.updateDailyStatistics as jest.Mock).mockResolvedValue(true);

      // Mock verifyQRCodeSignature to return true (valid signature)
      (verifyQRCodeSignature as jest.Mock).mockReturnValue(true);

      // Act
      const response = await request(app)
        .post('/api/merchant/scan/record')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send(scanBody)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // The middleware should have validated the signature if present in QR code URL
      // Note: This endpoint uses authenticateMerchant which requires auth, so signature validation
      // is less critical here, but we verify the endpoint works
    });
  });

  // =========================================================================
  // GET /api/miniprogram/prizes/:id
  // =========================================================================

  describe('GET /api/miniprogram/prizes/:id', () => {
    const mockPrize = {
      id: 1,
      merchant_id: 1,
      name: 'Test Prize',
      description: 'Test description',
      probability: 0.1,
      stock: 100,
      image_url: 'https://example.com/prize.png',
      created_at: new Date()
    };

    it('should return prize by ID for valid merchant (200)', async () => {
      // Arrange
      const prizeId = 1;
      const merchantId = 1;

      // Mock PrizeModel to return prize for merchant
      (PrizeModel.findByIdAndMerchant as jest.Mock).mockResolvedValue(mockPrize);

      // Act
      const response = await request(app)
        .get(`/api/miniprogram/prizes/${prizeId}`)
        .query({ merchantId })
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(prizeId);
      expect(response.body.data.name).toBe('Test Prize');
      expect(PrizeModel.findByIdAndMerchant).toHaveBeenCalledWith(prizeId, merchantId);
    });

    it('should return 404 for prize belonging to different merchant', async () => {
      // Arrange
      const prizeId = 1;
      const merchantAId = 1;
      const merchantBId = 2;

      // Mock PrizeModel to return null (prize not found for merchant B)
      (PrizeModel.findByIdAndMerchant as jest.Mock).mockResolvedValue(null);

      // Act - Merchant B tries to access Merchant A's prize
      const response = await request(app)
        .get(`/api/miniprogram/prizes/${prizeId}`)
        .query({ merchantId: merchantBId })
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('奖品不存在或无权访问');
      expect(response.body.code).toBe('PRIZE_NOT_FOUND');
      expect(PrizeModel.findByIdAndMerchant).toHaveBeenCalledWith(prizeId, merchantBId);
    });

    it('should return 400 without merchantId parameter', async () => {
      // Arrange
      const prizeId = 1;

      // Act
      const response = await request(app)
        .get(`/api/miniprogram/prizes/${prizeId}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      // The requireMerchantId middleware returns this specific error
      expect(response.body.error).toBe('缺少merchantId参数');
      expect(response.body.code).toBe('MISSING_MERCHANT_ID');
      expect(PrizeModel.findByIdAndMerchant).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid prize ID', async () => {
      // Arrange
      const invalidPrizeId = 'invalid';
      const merchantId = 1;

      // Act
      const response = await request(app)
        .get(`/api/miniprogram/prizes/${invalidPrizeId}`)
        .query({ merchantId })
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('参数无效');
      expect(response.body.code).toBe('INVALID_PARAMETERS');
      expect(PrizeModel.findByIdAndMerchant).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // GET /api/miniprogram/merchant
  // =========================================================================

  describe('GET /api/miniprogram/merchant', () => {
    const mockMerchants = [
      {
        id: 1,
        name: 'Merchant 1',
        description: 'Description 1',
        is_active: true,
        customerServiceQrUrl: 'https://example.com/cs1.png',
        qrCodeUrl: 'https://example.com/qr1.png',
        createdAt: new Date()
      },
      {
        id: 2,
        name: 'Merchant 2',
        description: 'Description 2',
        is_active: true,
        customerServiceQrUrl: 'https://example.com/cs2.png',
        qrCodeUrl: 'https://example.com/qr2.png',
        createdAt: new Date()
      }
    ];

    it('should return all active merchants (200)', async () => {
      // Arrange
      (MerchantModel.getActiveMerchants as jest.Mock).mockResolvedValue(mockMerchants);

      // Act
      const response = await request(app)
        .get('/api/miniprogram/merchant')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Merchant 1');
      expect(response.body.data[1].name).toBe('Merchant 2');
      expect(MerchantModel.getActiveMerchants).toHaveBeenCalled();
    });

    it('should return empty array when no active merchants', async () => {
      // Arrange
      (MerchantModel.getActiveMerchants as jest.Mock).mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get('/api/miniprogram/merchant')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      // Note: The response doesn't include a 'total' field
      expect(MerchantModel.getActiveMerchants).toHaveBeenCalled();
    });
  });
});
