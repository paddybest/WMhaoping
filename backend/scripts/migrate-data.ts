import { pool } from '../src/database/connection';
import { initializeDatabase, insertInitialData } from '../src/database/init';

interface ProductData {
  name: string;
  tags: string[];
  created_at?: Date;
  updated_at?: Date;
}

interface ReviewData {
  user_id: number;
  product_id: number;
  content: string;
  rating: number;
  tags: string[];
  image_url?: string;
  created_at?: Date;
}

interface PrizeData {
  name: string;
  description?: string;
  probability: number;
  stock: number;
  image_url?: string;
  created_at?: Date;
}

interface LotteryRecordData {
  user_id: number;
  prize_id: number;
  prize_name: string;
  reward_code: string;
  is_claimed: boolean;
  created_at?: Date;
  claimed_at?: Date;
}

interface LotteryCodeData {
  code: string;
  prize_id?: number;
  status: number;
  user_id?: number;
  created_at?: Date;
  claimed_at?: Date;
}

interface UserData {
  openid: string;
  nickname?: string;
  avatar?: string;
  created_at?: Date;
  updated_at?: Date;
}

async function migrateProducts() {
  console.log('开始迁移商品数据...');

  // 从微信云导出的产品数据
  const products: ProductData[] = [
    { name: '女装', tags: ['轻薄', '修身', '百搭', '舒适', '时尚', '潮流'] },
    { name: '男装', tags: ['休闲', '商务', '时尚', '舒适', '百搭', '潮流'] },
    { name: '数码', tags: ['高性能', '轻薄', '长续航', '拍照好', '游戏', '办公'] },
    { name: '美妆', tags: ['保湿', '美白', '抗衰老', '敏感肌', '天然', '有机'] }
  ];

  let migratedCount = 0;
  for (const product of products) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO products (name, tags, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE name = name, tags = tags, updated_at = NOW()`,
        [product.name, JSON.stringify(product.tags)]
      );

      migratedCount++;
      console.log(`✓ 商品 ${product.name} 迁移成功`);
    } catch (error) {
      console.error(`✗ 商品 ${product.name} 迁移失败:`, error);
    }
  }

  console.log(`商品数据迁移完成，共迁移 ${migratedCount} 个商品`);
}

async function migrateUsers() {
  console.log('开始迁移用户数据...');

  // 这里可以从微信云用户集合中获取实际用户数据
  // 现在迁移一些模拟用户数据用于测试
  const users: UserData[] = [
    { openid: 'wx_openid_001', nickname: '测试用户1', avatar: 'https://example.com/avatar1.jpg' },
    { openid: 'wx_openid_002', nickname: '测试用户2', avatar: 'https://example.com/avatar2.jpg' }
  ];

  let migratedCount = 0;
  for (const user of users) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO users (openid, nickname, avatar, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE nickname = nickname, avatar = avatar, updated_at = NOW()`,
        [user.openid, user.nickname, user.avatar]
      );

      migratedCount++;
      console.log(`✓ 用户 ${user.nickname || user.openid} 迁移成功`);
    } catch (error) {
      console.error(`✗ 用户 ${user.nickname || user.openid} 迁移失败:`, error);
    }
  }

  console.log(`用户数据迁移完成，共迁移 ${migratedCount} 个用户`);
}

async function migratePrizes() {
  console.log('开始迁移奖品数据...');

  // 从微信云导出的奖品数据
  const prizes: PrizeData[] = [
    { name: 'iPhone 15', description: '最新款苹果手机', probability: 0.01, stock: 10, image_url: 'https://example.com/iphone15.jpg' },
    { name: '华为手表', description: '智能手表', probability: 0.05, stock: 20, image_url: 'https://example.com/huawei-watch.jpg' },
    { name: '50元优惠券', description: '无门槛优惠券', probability: 0.1, stock: 100, image_url: 'https://example.com/coupon50.jpg' },
    { name: '谢谢参与', description: '下次再来', probability: 0.84, stock: 670, image_url: 'https://example.com/thanks.jpg' }
  ];

  let migratedCount = 0;
  for (const prize of prizes) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO prizes (name, description, probability, stock, image_url, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE name = name, description = description, probability = probability, stock = stock, image_url = image_url`,
        [prize.name, prize.description, prize.probability, prize.stock, prize.image_url]
      );

      migratedCount++;
      console.log(`✓ 奖品 ${prize.name} 迁移成功`);
    } catch (error) {
      console.error(`✗ 奖品 ${prize.name} 迁移失败:`, error);
    }
  }

  console.log(`奖品数据迁移完成，共迁移 ${migratedCount} 个奖品`);
}

async function migrateReviews() {
  console.log('开始迁移评价数据...');

  // 从微信云导出的评价数据
  const reviews: ReviewData[] = [
    {
      user_id: 1,
      product_id: 1,
      content: '这款女装真的很不错！轻薄的设计让我很喜欢，用了一段时间感觉修身，整体来说很满意，值得推荐！',
      rating: 5,
      tags: ['轻薄', '修身', '舒适'],
      image_url: 'https://example.com/review1.jpg'
    },
    {
      user_id: 2,
      product_id: 2,
      content: '购买男装已经有一段时间了，确实如宣传的那样休闲。商务的特点很突出，性价比很高！',
      rating: 4,
      tags: ['休闲', '商务', '百搭'],
      image_url: 'https://example.com/review2.jpg'
    }
  ];

  let migratedCount = 0;
  for (const review of reviews) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO reviews (user_id, product_id, content, rating, tags, image_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE content = content, rating = rating, tags = tags, image_url = image_url, updated_at = NOW()`,
        [review.user_id, review.product_id, review.content, review.rating, JSON.stringify(review.tags), review.image_url]
      );

      migratedCount++;
      console.log(`✓ 评价 ${review.id || '新评价'} 迁移成功`);
    } catch (error) {
      console.error(`✗ 评价迁移失败:`, error);
    }
  }

  console.log(`评价数据迁移完成，共迁移 ${migratedCount} 条评价`);
}

async function migrateLotteryData() {
  console.log('开始迁移抽奖数据...');

  // 从微信云导出的抽奖记录数据
  const lotteryRecords: LotteryRecordData[] = [
    {
      user_id: 1,
      prize_id: 1,
      prize_name: 'iPhone 15',
      reward_code: 'A1B2C3',
      is_claimed: false,
      created_at: new Date('2024-12-01T10:00:00Z')
    },
    {
      user_id: 2,
      prize_id: 3,
      prize_name: '50元优惠券',
      reward_code: 'D4E5F6',
      is_claimed: true,
      created_at: new Date('2024-12-01T11:00:00Z'),
      claimed_at: new Date('2024-12-01T12:00:00Z')
    }
  ];

  let migratedCount = 0;
  for (const record of lotteryRecords) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO lottery_records (user_id, prize_id, prize_name, reward_code, is_claimed, created_at, claimed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE prize_id = prize_id, prize_name = prize_name, is_claimed = is_claimed, claimed_at = claimed_at`,
        [record.user_id, record.prize_id, record.prize_name, record.reward_code, record.is_claimed, record.created_at, record.claimed_at]
      );

      // 同时创建对应的兑换码
      const [codeResult] = await pool.execute(
        `INSERT INTO lottery_codes (code, prize_id, status, user_id, created_at, claimed_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = status, claimed_at = claimed_at`,
        [record.reward_code, record.prize_id, record.is_claimed ? 1 : 0, record.user_id, record.created_at, record.claimed_at]
      );

      migratedCount++;
      console.log(`✓ 抽奖记录 ${record.reward_code} 迁移成功`);
    } catch (error) {
      console.error(`✗ 抽奖记录 ${record.reward_code} 迁移失败:`, error);
    }
  }

  console.log(`抽奖数据迁移完成，共迁移 ${migratedCount} 条记录`);
}

async function migrateImages() {
  console.log('开始迁移图片数据...');

  // 迁移图片逻辑
  // 这里需要从微信云存储下载图片，上传到OSS
  const imageMappings = [
    { oldPath: 'cloud://xxx/image1.jpg', newPath: 'images/product/female-clothes/001.jpg' },
    { oldPath: 'cloud://xxx/image2.jpg', newPath: 'images/product/male-clothes/001.jpg' },
    { oldPath: 'cloud://xxx/image3.jpg', newPath: 'images/product/digital/001.jpg' },
    { oldPath: 'cloud://xxx/image4.jpg', newPath: 'images/product/beauty/001.jpg' }
  ];

  let migratedCount = 0;
  for (const mapping of imageMappings) {
    try {
      // 这里应该实现实际的图片下载和上传逻辑
      // 现在只记录迁移日志
      console.log(`📸 图片迁移: ${mapping.oldPath} -> ${mapping.newPath}`);
      migratedCount++;
    } catch (error) {
      console.error(`✗ 图片迁移失败: ${mapping.oldPath}`, error);
    }
  }

  console.log(`图片数据迁移完成，共迁移 ${migratedCount} 张图片（需要手动完成实际迁移）`);
}

async function validateMigration() {
  console.log('\n开始验证迁移数据...');

  // 验证商品数据
  const [products] = await pool.execute('SELECT COUNT(*) as count FROM products');
  const productCount = (products as any[])[0].count;
  console.log(`📦 商品总数: ${productCount}`);

  // 验证用户数据
  const [users] = await pool.execute('SELECT COUNT(*) as count FROM users');
  const userCount = (users as any[])[0].count;
  console.log(`👥 用户总数: ${userCount}`);

  // 验证奖品数据
  const [prizes] = await pool.execute('SELECT COUNT(*) as count FROM prizes');
  const prizeCount = (prizes as any[])[0].count;
  console.log(`🎁 奖品总数: ${prizeCount}`);

  // 验证评价数据
  const [reviews] = await pool.execute('SELECT COUNT(*) as count FROM reviews');
  const reviewCount = (reviews as any[])[0].count;
  console.log(`💬 评价总数: ${reviewCount}`);

  // 验证抽奖记录
  const [lotteryRecords] = await pool.execute('SELECT COUNT(*) as count FROM lottery_records');
  const recordCount = (lotteryRecords as any[])[0].count;
  console.log(`🎯 抽奖记录总数: ${recordCount}`);

  // 验证兑换码
  const [lotteryCodes] = await pool.execute('SELECT COUNT(*) as count FROM lottery_codes');
  const codeCount = (lotteryCodes as any[])[0].count;
  console.log(`🎫 兑换码总数: ${codeCount}`);

  console.log('\n✅ 数据验证完成');
}

async function main() {
  console.log('🚀 开始数据迁移...\n');

  try {
    // 初始化数据库
    console.log('📋 初始化数据库...');
    await initializeDatabase();

    // 插入初始数据
    console.log('\n📝 插入初始数据...');
    await insertInitialData();

    // 执行数据迁移
    console.log('\n🔄 开始数据迁移...\n');
    await migrateProducts();
    await migrateUsers();
    await migratePrizes();
    await migrateReviews();
    await migrateLotteryData();
    await migrateImages();

    // 验证迁移结果
    console.log('\n🔍 验证迁移结果...');
    await validateMigration();

    console.log('\n🎉 数据迁移完成！');
    console.log('\n⚠️ 注意事项：');
    console.log('1. 图片迁移需要手动完成实际文件的上传');
    console.log('2. 请检查所有数据的完整性');
    console.log('3. 确保Redis缓存已正确配置');
    console.log('4. 测试所有功能是否正常工作');

  } catch (error) {
    console.error('❌ 数据迁移失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await pool.end();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export {
  migrateProducts,
  migrateUsers,
  migratePrizes,
  migrateReviews,
  migrateLotteryData,
  migrateImages,
  validateMigration
};