// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 生成6位随机兑换码
function generateRewardCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 概率累积算法
function drawPrize(prizes) {
  const random = Math.random()
  let cumulative = 0

  // 过滤掉概率为0的奖品
  const validPrizes = prizes.filter(p => p.probability > 0)

  for (const prize of validPrizes) {
    cumulative += prize.probability
    if (random <= cumulative) {
      return prize
    }
  }

  // 如果都没有选中，返回最后一个有效奖品
  return validPrizes[validPrizes.length - 1] || validPrizes[0]
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const rewardCode = event.rewardCode || ''
  const prizes = event.prizes || []

  try {
    // 检查用户今天是否已经抽过奖
    const db = cloud.database()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existingRecord = await db.collection('lottery_records')
      .where({
        openid: openid,
        createdAt: db.command.gt(today).and(db.command.lt(tomorrow))
      })
      .get()

    if (existingRecord.data.length > 0) {
      return {
        success: false,
        error: '今日已参与过抽奖',
        prize: null
      }
    }

    // 执行抽奖
    const prize = drawPrize(prizes)

    // 如果是奖品类型，生成兑换码
    let finalRewardCode = ''
    if (prize.type === 'prize') {
      // 生成唯一兑换码
      let isUnique = false
      let attempts = 0
      const maxAttempts = 10

      while (!isUnique && attempts < maxAttempts) {
        finalRewardCode = generateRewardCode()

        // 检查兑换码是否已存在
        const existingCode = await db.collection('lottery_records')
          .where({
            rewardCode: finalRewardCode
          })
          .get()

        if (existingCode.data.length === 0) {
          isUnique = true
        }
        attempts++
      }

      if (!isUnique) {
        throw new Error('生成唯一兑换码失败')
      }
    }

    // 记录抽奖结果
    const recordData = {
      openid: openid,
      prizeId: prize.id,
      prizeName: prize.name,
      prizeLevel: prize.level,
      rewardCode: finalRewardCode,
      isClaimed: false,
      createdAt: new Date()
    }

    await db.collection('lottery_records').add({
      data: recordData
    })

    return {
      success: true,
      prize: {
        ...prize,
        rewardCode: finalRewardCode
      }
    }

  } catch (err) {
    console.error('抽奖失败:', err)
    return {
      success: false,
      error: err.message || '抽奖失败',
      prize: null
    }
  }
}