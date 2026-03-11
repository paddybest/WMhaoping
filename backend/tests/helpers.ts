import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Merchant } from '../src/database/models/Merchant';
import { Prize } from '../src/database/models/Prize';
import { LotteryCode } from '../src/database/models/LotteryCode';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
  insertTestData,
  selectTestData,
  countTestData
} from '../src/database/test-connection';

/**
 * Test Helpers Module
 *
 * This module provides utility functions for creating test data, generating
 * tokens, and common test operations. These helpers make writing tests easier
 * and more maintainable.
 */

// ============================================================================
// Configuration
// ============================================================================

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters-long';
const TEST_QR_CODE_SECRET = process.env.QR_CODE_SECRET || 'test-qr-code-secret-minimum-32-chars-long';

// ============================================================================
// JWT Token Helpers
// ============================================================================

/**
 * Generate a test JWT token for a user
 *
 * @param userId - User ID
 * @param openid - User's WeChat openid
 * @param expiresIn - Token expiration time (default: '7d')
 * @returns JWT token string
 */
export function generateTestUserToken(
  userId: number = 1,
  openid: string = 'test_openid_123',
  expiresIn: string = '7d'
): string {
  return jwt.sign(
    { id: userId, openid },
    TEST_JWT_SECRET,
    { expiresIn } as jwt.SignOptions
  );
}

/**
 * Generate a test JWT token for a merchant
 *
 * @param merchantId - Merchant ID
 * @param username - Merchant username
 * @param expiresIn - Token expiration time (default: '7d')
 * @returns JWT token string
 */
export function generateTestMerchantToken(
  merchantId: number = 1,
  username: string = 'test_merchant',
  expiresIn: string = '7d'
): string {
  return jwt.sign(
    { id: merchantId, username },
    TEST_JWT_SECRET,
    { expiresIn } as jwt.SignOptions
  );
}

/**
 * Verify a test JWT token
 *
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function verifyTestToken(token: string): { id: number; openid?: string; username?: string } | null {
  try {
    const decoded = jwt.verify(token, TEST_JWT_SECRET) as { id: number; openid?: string; username?: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// QR Code Signature Helpers
// ============================================================================

/**
 * Generate a test QR code signature
 *
 * Uses HMAC-SHA256 to generate a signature for merchant_id.
 *
 * @param merchantId - Merchant ID
 * @returns Base64 encoded signature
 */
export function generateTestQRCodeSignature(merchantId: number): string {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', TEST_QR_CODE_SECRET);
  hmac.update(merchantId.toString());
  return hmac.digest('base64').replace(/[+/=]/g, '').substring(0, 16);
}

/**
 * Verify a test QR code signature
 *
 * @param merchantId - Merchant ID
 * @param signature - Signature to verify
 * @returns True if signature is valid, false otherwise
 */
export function verifyTestQRCodeSignature(merchantId: number, signature: string): boolean {
  try {
    const expectedSignature = generateTestQRCodeSignature(merchantId);
    return expectedSignature === signature;
  } catch {
    return false;
  }
}

// ============================================================================
// Password Hashing Helpers
// ============================================================================

/**
 * Hash a password for testing
 *
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashTestPassword(password: string = 'test_password_123'): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 *
 * @param password - Plain text password
 * @param hashedPassword - Hashed password
 * @returns True if password matches, false otherwise
 */
export async function verifyTestPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ============================================================================
// Merchant Test Data Helpers
// ============================================================================

/**
 * Create a test merchant in the database
 *
 * @param overrides - Optional overrides for default merchant data
 * @returns Created merchant object with ID
 */
export async function createTestMerchant(
  overrides: Partial<Merchant> = {}
): Promise<Merchant> {
  const hashedPassword = await hashTestPassword();
  const defaultMerchant: Omit<Merchant, 'id' | 'createdAt' | 'updatedAt'> = {
    username: 'test_merchant',
    password: hashedPassword,
    shopName: 'Test Shop',
    name: 'Test Merchant',
    description: 'Test merchant description',
    is_active: true,
    customerServiceQrUrl: undefined,
    qrCodeUrl: undefined,
    ...overrides
  };

  const merchantId = await insertTestData('merchants', {
    username: defaultMerchant.username,
    password: defaultMerchant.password,
    shop_name: defaultMerchant.shopName,
    name: defaultMerchant.name,
    description: defaultMerchant.description,
    is_active: defaultMerchant.is_active ? 1 : 0,
    customer_service_qr_url: defaultMerchant.customerServiceQrUrl ?? null,
    qr_code_url: defaultMerchant.qrCodeUrl ?? null
  });

  return {
    ...defaultMerchant,
    id: merchantId,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Create multiple test merchants
 *
 * @param count - Number of merchants to create
 * @param baseOverrides - Optional base overrides to apply to all merchants
 * @returns Array of created merchants
 */
export async function createTestMerchants(
  count: number,
  baseOverrides: Partial<Merchant> = {}
): Promise<Merchant[]> {
  const merchants: Merchant[] = [];

  for (let i = 0; i < count; i++) {
    const merchant = await createTestMerchant({
      ...baseOverrides,
      username: `test_merchant_${i}`,
      shopName: `Test Shop ${i}`,
      name: `Test Merchant ${i}`
    });
    merchants.push(merchant);
  }

  return merchants;
}

// ============================================================================
// Prize Test Data Helpers
// ============================================================================

/**
 * Create a test prize in the database
 *
 * @param merchantId - Merchant ID that owns the prize
 * @param overrides - Optional overrides for default prize data
 * @returns Created prize object with ID
 */
export async function createTestPrize(
  merchantId: number,
  overrides: Partial<Prize> = {}
): Promise<Prize> {
  const defaultPrize: Omit<Prize, 'id' | 'created_at'> = {
    merchant_id: merchantId,
    name: 'Test Prize',
    description: 'Test prize description',
    probability: 10,
    stock: 100,
    image_url: 'https://example.com/prize.png',
    ...overrides
  };

  const prizeId = await insertTestData('prizes', {
    merchant_id: defaultPrize.merchant_id,
    name: defaultPrize.name,
    description: defaultPrize.description,
    probability: defaultPrize.probability,
    stock: defaultPrize.stock,
    image_url: defaultPrize.image_url
  });

  return {
    ...defaultPrize,
    id: prizeId,
    created_at: new Date()
  };
}

/**
 * Create multiple test prizes for a merchant
 *
 * @param merchantId - Merchant ID that owns the prizes
 * @param count - Number of prizes to create
 * @param baseOverrides - Optional base overrides to apply to all prizes
 * @returns Array of created prizes
 */
export async function createTestPrizes(
  merchantId: number,
  count: number,
  baseOverrides: Partial<Prize> = {}
): Promise<Prize[]> {
  const prizes: Prize[] = [];

  for (let i = 0; i < count; i++) {
    const prize = await createTestPrize(merchantId, {
      ...baseOverrides,
      name: `Test Prize ${i}`,
      description: `Test prize description ${i}`
    });
    prizes.push(prize);
  }

  return prizes;
}

// ============================================================================
// Lottery Code Test Data Helpers
// ============================================================================

/**
 * Create a test lottery code in the database
 *
 * @param overrides - Optional overrides for default lottery code data
 * @returns Created lottery code object with ID
 */
export async function createTestLotteryCode(
  overrides: Partial<LotteryCode> = {}
): Promise<LotteryCode> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const defaultCode: Omit<LotteryCode, 'id' | 'created_at' | 'claimed_at'> = {
    code,
    prize_id: 1,
    merchant_id: 1,
    status: 0,
    user_id: undefined,
    ...overrides
  };

  const codeId = await insertTestData('lottery_codes', {
    code: defaultCode.code,
    prize_id: defaultCode.prize_id,
    merchant_id: defaultCode.merchant_id,
    status: defaultCode.status,
    user_id: defaultCode.user_id
  });

  return {
    ...defaultCode,
    id: codeId,
    created_at: new Date(),
    claimed_at: undefined
  };
}

/**
 * Create multiple test lottery codes for a prize
 *
 * @param prizeId - Prize ID to associate codes with
 * @param count - Number of codes to create
 * @param overrides - Optional overrides to apply to all codes
 * @returns Array of created lottery codes
 */
export async function createTestLotteryCodes(
  prizeId: number,
  count: number,
  overrides: Partial<LotteryCode> = {}
): Promise<LotteryCode[]> {
  const codes: LotteryCode[] = [];

  for (let i = 0; i < count; i++) {
    const code = await createTestLotteryCode({
      ...overrides,
      prize_id: prizeId
    });
    codes.push(code);
  }

  return codes;
}

// ============================================================================
// QR Code Test Data Helpers
// ============================================================================

/**
 * Generate a test QR code URL for a merchant
 *
 * @param merchantId - Merchant ID
 * @returns QR code URL
 */
export function generateTestQRCodeUrl(merchantId: number): string {
  const signature = generateTestQRCodeSignature(merchantId);
  return `pages/index/index?merchant_id=${merchantId}&sig=${signature}`;
}

// ============================================================================
// HTTP Request Helpers
// ============================================================================

/**
 * Generate authorization headers for a merchant request
 *
 * @param merchantId - Merchant ID
 * @param username - Merchant username
 * @returns Headers object with Authorization token
 */
export function getMerchantAuthHeaders(
  merchantId: number = 1,
  username: string = 'test_merchant'
): { Authorization: string } {
  const token = generateTestMerchantToken(merchantId, username);
  return {
    Authorization: `Bearer ${token}`
  };
}

/**
 * Generate authorization headers for a user request
 *
 * @param userId - User ID
 * @param openid - User's WeChat openid
 * @returns Headers object with Authorization token
 */
export function getUserAuthHeaders(
  userId: number = 1,
  openid: string = 'test_openid_123'
): { Authorization: string } {
  const token = generateTestUserToken(userId, openid);
  return {
    Authorization: `Bearer ${token}`
  };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that an object has specific properties
 *
 * @param obj - Object to check
 * @param properties - Properties to check for
 * @throws Error if any property is missing
 */
export function assertHasProperties(obj: Record<string, unknown>, properties: string[]): void {
  properties.forEach(prop => {
    if (!(prop in obj)) {
      throw new Error(`Object is missing property: ${prop}`);
    }
  });
}

/**
 * Assert that two objects have the same properties
 *
 * @param obj1 - First object
 * @param obj2 - Second object
 * @param properties - Properties to compare
 * @throws Error if any property differs
 */
export function assertObjectsMatch(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>,
  properties: string[]
): void {
  properties.forEach(prop => {
    if (obj1[prop] !== obj2[prop]) {
      throw new Error(
        `Objects differ on property '${prop}': ${obj1[prop]} !== ${obj2[prop]}`
      );
    }
  });
}

// ============================================================================
// Database Setup/Teardown Wrappers
// ============================================================================

/**
 * Setup test database before tests
 * This is a convenience wrapper for setupTestDatabase
 */
export async function setupTestEnv(): Promise<void> {
  await setupTestDatabase();
}

/**
 * Clean up test database after each test
 * This is a convenience wrapper for cleanupTestDatabase
 */
export async function cleanupTestEnv(): Promise<void> {
  await cleanupTestDatabase();
}

/**
 * Close test database connection after all tests
 * This is a convenience wrapper for closeTestDatabase
 */
export async function teardownTestEnv(): Promise<void> {
  await closeTestDatabase();
}
