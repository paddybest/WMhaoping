// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 奖品数据
const TEST_PRIZES = [
  {
    id: '1',
    name: '一等奖',
    image: 'https://via.placeholder.com/200x200/FF6B6B/FFFFFF?text=一等奖',
    probability: 0.15,
    type: 'prize',
    level: 'first',
    description: '豪华大奖'
  },
  {
    id: '2',
    name: '二等奖',
    image: 'https://via.placeholder.com/200x200/4ECDC4/FFFFFF?text=二等奖',
    probability: 0.85,
    type: 'prize',
    level: 'second',
    description: '精美礼品'
  },
  {
    id: '3',
    name: '二等奖',
    image: 'https://via.placeholder.com/200x200/45B7D1/FFFFFF?text=二等奖',
    probability: 0.85,
    type: 'prize',
    level: 'second',
    description: '优惠券包'
  },
  {
    id: '4',
    name: '特等奖',
    image: 'https://via.placeholder.com/200x200/FECA57/FFFFFF?text=特等奖',
    probability: 0,
    type: 'thanks',
    level: 'special',
    description: '特别惊喜'
  },
  {
    id: '5',
    name: '三等奖',
    image: 'https://via.placeholder.com/200x200/96CEB4/FFFFFF?text=三等奖',
    probability: 0,
    type: 'thanks',
    level: 'third',
    description: '参与奖'
  },
  {
    id: '6',
    name: '三等奖',
    image: 'https://via.placeholder.com/200x200/E0E0E0/666666?text=三等奖',
    probability: 0,
    type: 'thanks',
    level: 'third',
    description: '幸运奖'
  }
]

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 开发环境返回预设数据
    const env = event.env || 'test'

    if (env === 'test') {
      return {
        success: true,
        data: TEST_PRIZES
      }
    }

    // 生产环境从数据库读取
    const db = cloud.database()
    const result = await db.collection('lottery_prizes')
      .where({
        merchantId: event.merchantId,
        isActive: true
      })
      .get()

    return {
      success: true,
      data: result.data[0]?.prizes || TEST_PRIZES
    }

  } catch (err) {
    console.error('获取奖品失败:', err)
    return {
      success: false,
      error: '获取奖品失败',
      data: TEST_PRIZES // 出错时返回默认数据
    }
  }
}