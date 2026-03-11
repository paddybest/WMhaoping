六选一抽奖动画方案实施计划
Context
当前抽奖页面使用转盘组件，只有2个固定选项（6位奖励码、谢谢参与），抽奖结果是固定的。为了提升用户体验和商业灵活性，需要改为六选一的抽奖动画方案，支持动态配置奖品，包括图片和文字说明。

目标
将当前转盘抽奖改为六选一卡片抽奖动画
每个奖品显示图片和文字说明
支持测试环境（预设数据）和生产环境（商家上传）两种模式
保持现有Modern风格配色
实施方案
Phase 1: 数据结构设计
1.1 奖品数据结构

// 单个奖品结构
{
  id: String,           // 奖品ID
  name: String,         // 奖品名称
  image: String,        // 奖品图片URL
  probability: Number,  // 中奖概率 (0-1)
  type: String,         // 奖品类型: 'prize' | 'code' | 'thanks'
  description: String   // 奖品描述（可选）
}
1.2 数据库设计
新建云数据库集合 lottery_prizes：


{
  _id: ObjectId,
  merchantId: String,      // 商家ID
  name: String,            // 奖品名称
  imageUrl: String,        // 图片URL（云存储ID）
  probability: Number,     // 中奖概率
  type: String,            // 奖品类型
  description: String,     // 描述
  isActive: Boolean,       // 是否启用
  createdAt: Date,
  updatedAt: Date
}
新建云数据库集合 lottery_records：


{
  _id: ObjectId,
  openid: String,          // 用户ID
  rewardCode: String,      // 奖励码
  prizeId: String,         // 中奖奖品ID
  prizeName: String,       // 中奖奖品名称
  prizeType: String,       // 奖品类型
  createdAt: Date
}
Phase 2: 云函数开发
2.1 新建云函数 getLotteryPrizes
文件路径： cloudfunctions/getLotteryPrizes/index.js

功能：

获取可用奖品列表
支持测试环境和生产环境切换
测试环境返回预设奖品数据
测试环境预设奖品：


const TEST_PRIZES = [
  {
    id: '1',
    name: '现金红包',
    image: 'https://via.placeholder.com/200x200/FF6B6B/FFFFFF?text=红包',
    probability: 0.1,
    type: 'prize',
    description: '88元现金红包'
  },
  {
    id: '2',
    name: '优惠券',
    image: 'https://via.placeholder.com/200x200/4ECDC4/FFFFFF?text=优惠券',
    probability: 0.2,
    type: 'prize',
    description: '100元满减券'
  },
  {
    id: '3',
    name: '积分奖励',
    image: 'https://via.placeholder.com/200x200/45B7D1/FFFFFF?text=积分',
    probability: 0.15,
    type: 'prize',
    description: '1000积分'
  },
  {
    id: '4',
    name: '体验礼品',
    image: 'https://via.placeholder.com/200x200/96CEB4/FFFFFF?text=礼品',
    probability: 0.1,
    type: 'prize',
    description: '精美小礼品'
  },
  {
    id: '5',
    name: '奖励码',
    image: 'https://via.placeholder.com/200x200/FECA57/FFFFFF?text=奖励码',
    probability: 0.3,
    type: 'code',
    description: '6位兑换码'
  },
  {
    id: '6',
    name: '谢谢参与',
    image: 'https://via.placeholder.com/200x200/E0E0E0/666666?text=谢谢',
    probability: 0.15,
    type: 'thanks',
    description: '下次好运'
  }
]
2.2 新建云函数 drawLottery
文件路径： cloudfunctions/drawLottery/index.js

功能：

根据概率计算中奖结果
记录抽奖结果到数据库
返回中奖奖品信息
算法逻辑：


// 概率累积算法
function drawPrize(prizes) {
  const random = Math.random()
  let cumulative = 0

  for (const prize of prizes) {
    cumulative += prize.probability
    if (random <= cumulative) {
      return prize
    }
  }
  return prizes[prizes.length - 1] // 保底返回最后一个
}
Phase 3: 前端组件开发
3.1 新建六选一抽奖组件
文件路径： miniprogram/components/six-card-lottery/

组件结构：


six-card-lottery/
├── six-card-lottery.js      // 组件逻辑
├── six-card-lottery.wxml    // 组件模板
├── six-card-lottery.wxss    // 组件样式
└── six-card-lottery.json    // 组件配置
3.1.1 组件模板 (six-card-lottery.wxml)


<view class="lottery-container">
  <!-- 六宫格布局 -->
  <view class="prizes-grid">
    <view
      wx:for="{{prizes}}"
      wx:key="id"
      class="prize-card {{isAnimating && currentIndex === index ? 'highlight' : ''}} {{selectedPrizeId === item.id ? 'selected' : ''}}"
      style="animation-delay: {{index * 0.1}}s"
    >
      <image class="prize-image" src="{{item.image}}" mode="aspectFit" />
      <text class="prize-name">{{item.name}}</text>
      <text class="prize-desc" wx:if="{{item.description}}">{{item.description}}</text>
    </view>
  </view>

  <!-- 开始抽奖按钮 -->
  <view class="action-area">
    <button
      class="start-btn {{isAnimating ? 'disabled' : ''}}"
      bindtap="onStartDraw"
      disabled="{{isAnimating}}"
    >
      {{isAnimating ? '抽奖中...' : '开始抽奖'}}
    </button>
  </view>
</view>
3.1.2 组件样式 (six-card-lottery.wxss)


/* 六宫格布局 */
.prizes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
  padding: 30rpx;
  margin-bottom: 40rpx;
}

.prize-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10rpx);
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s ease;
  border: 3rpx solid transparent;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.prize-card.highlight {
  border-color: #F687B3;
  transform: scale(1.05);
  box-shadow: 0 8rpx 24rpx rgba(246, 135, 179, 0.4);
  animation: pulse 0.5s ease-in-out;
}

.prize-card.selected {
  border-color: #10B981;
  background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
  animation: winnerGlow 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1.05); }
  50% { transform: scale(1.1); }
}

@keyframes winnerGlow {
  0%, 100% { box-shadow: 0 8rpx 24rpx rgba(16, 185, 129, 0.4); }
  50% { box-shadow: 0 8rpx 40rpx rgba(16, 185, 129, 0.8); }
}

.prize-image {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 16rpx;
}

.prize-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A202C;
  text-align: center;
  margin-bottom: 8rpx;
}

.prize-desc {
  font-size: 24rpx;
  color: #718096;
  text-align: center;
}
3.1.3 组件逻辑 (six-card-lottery.js)


Component({
  properties: {
    rewardCode: {
      type: String,
      value: ''
    }
  },

  data: {
    prizes: [],           // 奖品列表
    isAnimating: false,   // 是否正在抽奖
    currentIndex: -1,     // 当前高亮索引
    selectedPrizeId: '',  // 中奖奖品ID
    animationRounds: 0,   // 动画轮数
    maxRounds: 3          // 最大轮数
  },

  lifetimes: {
    attached() {
      this.loadPrizes()
    }
  },

  methods: {
    // 加载奖品列表
    async loadPrizes() {
      try {
        const res = await wx.cloud.callFunction({
          name: 'getLotteryPrizes',
          data: {
            env: 'test' // 测试环境
          }
        })
        this.setData({ prizes: res.result.data })
      } catch (err) {
        console.error('加载奖品失败:', err)
        wx.showToast({
          title: '加载奖品失败',
          icon: 'none'
        })
      }
    },

    // 开始抽奖
    async onStartDraw() {
      if (this.data.isAnimating) return

      this.setData({ isAnimating: true })
      this.startAnimation()
    },

    // 开始抽奖动画
    async startAnimation() {
      const { prizes, maxRounds } = this.data
      const totalCards = prizes.length
      let currentRound = 0
      let currentIndex = 0

      const animate = () => {
        if (currentRound >= maxRounds) {
          // 动画结束，调用抽奖接口
          this.performDraw()
          return
        }

        // 高亮当前卡片
        this.setData({ currentIndex })

        // 计算下一张卡片
        currentIndex = (currentIndex + 1) % totalCards

        // 一轮结束
        if (currentIndex === 0) {
          currentRound++
          // 每轮逐渐减慢速度
          const delay = 500 + currentRound * 200
          setTimeout(animate, delay)
        } else {
          setTimeout(animate, 150)
        }
      }

      animate()
    },

    // 执行抽奖
    async performDraw() {
      try {
        const res = await wx.cloud.callFunction({
          name: 'drawLottery',
          data: {
            rewardCode: this.properties.rewardCode,
            prizes: this.data.prizes
          }
        })

        const { prize } = res.result

        // 显示中奖结果
        this.setData({
          selectedPrizeId: prize.id,
          currentIndex: -1,
          isAnimating: false
        })

        // 触发中奖事件
        this.triggerEvent('win', { prize })

        // 震动反馈
        wx.vibrateShort({ type: 'heavy' })

      } catch (err) {
        console.error('抽奖失败:', err)
        this.setData({ isAnimating: false })
        wx.showToast({
          title: '抽奖失败，请重试',
          icon: 'none'
        })
      }
    }
  }
})
Phase 4: 页面集成
4.1 修改抽奖页面
文件路径： miniprogram/pages/lottery/index.wxml


<view class="lottery-container">
  <!-- 标题区 -->
  <view class="header-section">
    <text class="title">幸运大抽奖</text>
    <text class="subtitle">六选一，好运等你来！</text>
  </view>

  <!-- 错误提示 -->
  <view class="error-section" wx:if="{{lotteryStatus === 'error'}}">
    <text class="error-message">{{errorMessage}}</text>
    <button class="retry-btn" bindtap="onRetry">重新加载</button>
  </view>

  <!-- 六选一抽奖组件 -->
  <six-card-lottery
    wx:if="{{lotteryStatus !== 'error'}}"
    rewardCode="{{rewardCode}}"
    bind:win="onPrizeWin"
  />

  <!-- 结果展示 -->
  <view class="result-section" wx:if="{{lotteryStatus === 'result'}}">
    <view class="prize-card">
      <image class="prize-image-large" src="{{wonPrize.image}}" mode="aspectFit" />
      <text class="prize-title">{{wonPrize.name}}</text>
      <text class="prize-description" wx:if="{{wonPrize.description}}">{{wonPrize.description}}</text>

      <view class="code-display" wx:if="{{wonPrize.type === 'code'}}">
        <text>{{rewardCode}}</text>
        <button size="mini" bindtap="onCopyCode">复制</button>
      </view>

      <view class="action-buttons">
        <button class="action-btn primary" bindtap="onAddCustomerService">
          客服二维码
        </button>
        <button class="action-btn secondary" bindtap="navigateToResult">
          返回结果页
        </button>
      </view>
    </view>
  </view>

  <!-- 彩带动画 -->
  <view class="confetti-layer" wx:if="{{showConfetti}}">
    <!-- 保持现有彩带代码 -->
  </view>
</view>
4.2 修改页面逻辑
文件路径： miniprogram/pages/lottery/index.js


// 在 data 中添加
data: {
  // ... 现有数据
  wonPrize: null,  // 中奖奖品信息
},

// 添加中奖事件处理
onPrizeWin(e) {
  const { prize } = e.detail
  this.setData({
    wonPrize: prize,
    lotteryStatus: 'result',
    showConfetti: prize.type !== 'thanks' // 只有没有"谢谢参与"才显示庆祝
  })

  // 3秒后清除彩带
  if (this.data.showConfetti) {
    setTimeout(() => {
      this.setData({ showConfetti: false })
    }, 3000)
  }
},
Phase 5: 样式调整
文件路径： miniprogram/pages/lottery/index.wxss

添加新的样式类，保持Modern风格配色：


/* 副标题 */
.subtitle {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 16rpx;
  text-align: center;
}

/* 中奖奖品大图 */
.prize-image-large {
  width: 200rpx;
  height: 200rpx;
  margin: 0 auto 30rpx;
  display: block;
}

/* 奖品描述 */
.prize-description {
  display: block;
  font-size: 30rpx;
  color: #4A5568;
  text-align: center;
  margin-bottom: 30rpx;
  line-height: 1.5;
}
关键文件路径
需要修改的文件：
miniprogram/pages/lottery/index.wxml - 修改页面模板
miniprogram/pages/lottery/index.js - 修改页面逻辑
miniprogram/pages/lottery/index.wxss - 添加新样式
miniprogram/pages/lottery/index.json - 添加新组件引用
需要新建的文件：
miniprogram/components/six-card-lottery/six-card-lottery.js
miniprogram/components/six-card-lottery/six-card-lottery.wxml
miniprogram/components/six-card-lottery/six-card-lottery.wxss
miniprogram/components/six-card-lottery/six-card-lottery.json
cloudfunctions/getLotteryPrizes/index.js
cloudfunctions/drawLottery/index.js
可选保留的文件：
miniprogram/components/lottery-wheel/ - 可保留作为备选方案
环境配置
测试环境
使用预设的6个奖品数据
奖品图片使用占位图或本地资源
可通过云函数参数 env: 'test' 切换
生产环境
从云数据库 lottery_prizes 读取商家配置的奖品
商家通过后台管理界面上传图片和设置概率
通过云函数参数 env: 'production' 切换
验证测试
功能测试
测试环境加载预设奖品列表
点击"开始抽奖"按钮触发动画
验证抽奖动画流畅性（高亮切换、速度变化）
验证中奖结果与概率配置匹配
验证"谢谢参与"不显示庆祝动画
验证中奖后显示奖品图片和描述
验证奖励码类型奖品显示复制按钮
兼容性测试
不同屏幕尺寸下六宫格布局适配
图片加载失败时的降级显示
网络异常时的错误处理
云函数调用失败的降级方案
性能测试
动画帧率流畅性（60fps）
图片加载优化（使用CDN、懒加载）
云函数响应时间
实施顺序
第一阶段：创建云函数和数据结构

创建 getLotteryPrizes 云函数
创建 drawLottery 云函数
设置云数据库集合
配置测试数据
第二阶段：创建六选一组件

创建组件文件
实现六宫格布局
实现抽奖动画逻辑
添加样式
第三阶段：页面集成

修改抽奖页面
集成新组件
更新页面逻辑
添加结果展示
第四阶段：测试优化

功能测试
性能优化
UI细节调整
错误处理完善
注意事项
保持现有Modern风格配色不变
确保动画流畅且性能良好
图片需要适配不同屏幕尺寸
概率配置需要验证准确性
保留与现有奖励码系统的兼容性
考虑商家端后续开发的数据接口预留