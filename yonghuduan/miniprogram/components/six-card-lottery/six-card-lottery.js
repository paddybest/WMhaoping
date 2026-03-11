Component({
  properties: {
    rewardCode: {
      type: String,
      value: ''
    },
    canDraw: {
      type: Boolean,
      value: true
    }
  },

  data: {
    prizes: [],           // 奖品列表
    isAnimating: false,   // 是否正在抽奖
    currentIndex: -1,     // 当前高亮索引
    selectedPrizeId: '',  // 中奖奖品ID
    animationRounds: 0,   // 动画轮数
    maxRounds: 3,         // 最大轮数
    showResult: false,    // 是否显示结果弹窗
    selectedPrize: null    // 选中的奖品
  },

  lifetimes: {
    attached() {
      this.loadPrizes()
    }
  },

  methods: {
    // 加载奖品列表
    loadPrizes() {
      // 开发环境使用本地测试数据
      const testPrizes = [
        {
          id: '1',
          name: '一等奖',
          image: 'https://picsum.photos/seed/prize1/200/200',
          probability: 0.15,
          type: 'prize',
          level: 'first',
          description: '豪华大奖等你拿'
        },
        {
          id: '2',
          name: '二等奖',
          image: 'https://picsum.photos/seed/prize2/200/200',
          probability: 0.85,
          type: 'prize',
          level: 'second',
          description: '精美礼品等你来'
        },
        {
          id: '3',
          name: '二等奖',
          image: 'https://picsum.photos/seed/prize3/200/200',
          probability: 0.85,
          type: 'prize',
          level: 'second',
          description: '优惠券大礼包'
        },
        {
          id: '4',
          name: '特等奖',
          image: 'https://picsum.photos/seed/prize4/200/200',
          probability: 0,
          type: 'thanks',
          level: 'special',
          description: '特别惊喜等你'
        },
        {
          id: '5',
          name: '三等奖',
          image: 'https://picsum.photos/seed/prize5/200/200',
          probability: 0,
          type: 'thanks',
          level: 'third',
          description: '参与就有奖'
        },
        {
          id: '6',
          name: '三等奖',
          image: 'https://picsum.photos/seed/prize6/200/200',
          probability: 0,
          type: 'thanks',
          level: 'third',
          description: '幸运奖等你'
        }
      ]

      this.setData({ prizes: testPrizes })
    },

    // 开始抽奖
    async onStartDraw() {
      if (this.data.isAnimating) return

      // 检查是否可以抽奖
      if (!this.properties.canDraw) {
        wx.showToast({
          title: '今日抽奖次数已用完',
          icon: 'none',
          duration: 2000
        })
        return
      }

      this.setData({
        isAnimating: true,
        showResult: false,
        selectedPrize: null
      })

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
    performDraw() {
      // 开发环境使用模拟抽奖逻辑
      const { prizes } = this.data

      // 过滤掉概率为0的奖品
      const validPrizes = prizes.filter(p => p.probability > 0)

      // 模拟概率抽奖
      const random = Math.random()
      let cumulative = 0
      let selectedPrize = validPrizes[0] // 默认第一个

      for (const prize of validPrizes) {
        cumulative += prize.probability
        if (random <= cumulative) {
          selectedPrize = prize
          break
        }
      }

      // 生成模拟兑换码
      let rewardCode = ''
      if (selectedPrize.type === 'prize') {
        rewardCode = Math.floor(100000 + Math.random() * 900000).toString()
      }

      const prize = {
        ...selectedPrize,
        rewardCode: rewardCode
      }

      // 显示中奖结果
      this.setData({
        selectedPrizeId: prize.id,
        currentIndex: -1,
        isAnimating: false,
        showResult: true,
        selectedPrize: prize
      })

      // 震动反馈
      wx.vibrateShort({ type: 'heavy' })

      // 触发中奖事件
      this.triggerEvent('win', { prize })
    },

    // 复制兑换码
    onCopyCode() {
      if (!this.data.selectedPrize?.rewardCode) return

      wx.setClipboardData({
        data: this.data.selectedPrize.rewardCode,
        success: () => {
          wx.showToast({
            title: '兑换码已复制',
            icon: 'success',
            duration: 1500
          })
        },
        fail: () => {
          wx.showToast({
            title: '复制失败',
            icon: 'none'
          })
        }
      })
    },

    // 关闭结果弹窗
    onCloseResult() {
      this.setData({ showResult: false })

      // 如果是奖品类型，触发关闭事件
      if (this.data.selectedPrize?.type === 'prize') {
        this.triggerEvent('close')
      }
    },

    // 复制兑换码并联系客服
    onCopyCodeAndContactService() {
      if (!this.data.selectedPrize?.rewardCode) return

      // 先复制兑换码
      wx.setClipboardData({
        data: this.data.selectedPrize.rewardCode,
        success: () => {
          wx.showToast({
            title: '兑换码已复制',
            icon: 'success',
            duration: 1500
          })

          // 然后触发事件，让父页面处理跳转
          this.triggerEvent('copyAndContact', {
            prize: this.data.selectedPrize
          })
        },
        fail: () => {
          wx.showToast({
            title: '复制失败',
            icon: 'none'
          })
        }
      })
    },

    // 兑换现金红包 - 跳转到审核页面
    onRedeemCash() {
      if (!this.data.selectedPrize?.rewardCode) return

      // 复制兑换码到剪贴板
      wx.setClipboardData({
        data: this.data.selectedPrize.rewardCode,
        success: () => {
          wx.showToast({
            title: '兑换码已复制',
            icon: 'success',
            duration: 1500
          })
        }
      })

      // 触发事件，让父页面跳转到审核页面
      this.triggerEvent('redeemCash', {
        prize: this.data.selectedPrize
      })
    }
  }
})