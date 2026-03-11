// pages/lottery/index.js
import { get, post } from '../../utils/api'

Page({
  data: {
    lotteryStatus: 'ready',           // ready | spinning | result | claimed
    rewardCode: '',                   // 从云函数获取的验证码
    showConfetti: false,              // 庆祝动画
    customerServiceQR: '/images/customer-service-qrcode.png',
    errorMessage: '',
    wonPrize: null,                   // 中奖奖品信息
    dailyDrawsRemaining: 0,           // 今日剩余抽奖次数
    canDraw: false,                   // 是否可以抽奖
    userPrizes: []                    // 用户奖品列表
  },

  onLoad(options) {
    // 不再强制要求登录，让用户可以选择登录或跳过
    // 检查每日抽奖次数
    this.checkDrawLimit()

    // 加载用户奖品列表
    this.loadUserPrizes()

    // 从URL参数获取奖励码
    if (options.code) {
      this.setData({
        rewardCode: decodeURIComponent(options.code),
        lotteryStatus: 'ready'
      })
    }
  },

  // 检查抽奖次数（从后端获取）
  async checkDrawLimit() {
    try {
      const userId = wx.getStorageSync('userId') || 1;
      const merchantId = wx.getStorageSync('selectedMerchantId') || 1;

      const res = await get(`/lottery/status?userId=${userId}&merchantId=${merchantId}`)
      console.log('Check draw limit response:', res)

      if (res.success && res.data) {
        this.setData({
          dailyDrawsRemaining: res.data.remaining || 0,
          canDraw: res.data.canDraw !== false
        })
      } else {
        // 默认给3次机会
        this.setData({
          dailyDrawsRemaining: 3,
          canDraw: true
        })
      }
    } catch (error) {
      console.error('Check draw limit failed:', error)
      // 出错时默认给3次机会
      this.setData({
        dailyDrawsRemaining: 3,
        canDraw: true
      })
    }
  },

  // 加载用户奖品列表
  async loadUserPrizes() {
    try {
      const userId = wx.getStorageSync('userId') || 1;
      const merchantId = wx.getStorageSync('selectedMerchantId') || 1;
      const res = await get(`/lottery/my-prizes?userId=${userId}&merchantId=${merchantId}`)
      console.log('Load user prizes response:', res)

      if (res.success) {
        this.setData({
          userPrizes: res.data
        })
      }
    } catch (error) {
      console.error('Load user prizes failed:', error)
    }
  },


  // 抽奖
  async onDraw() {
    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showModal({
        title: '提示',
        content: '登录后可参与抽奖，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.setStorageSync('loginTargetPage', '/pages/lottery/index');
            wx.navigateTo({ url: '/pages/login/login' });
          }
        }
      });
      return;
    }

    if (!this.data.canDraw) {
      wx.showToast({
        title: '今日抽奖次数已用完',
        icon: 'none'
      })
      return
    }

    this.setData({
      lotteryStatus: 'spinning',
      showConfetti: false
    })

    try {
      const userId = wx.getStorageSync('userId') || 1;
      const merchantId = wx.getStorageSync('selectedMerchantId') || 1;
      const res = await post('/lottery/draw', { userId, merchantId })
      console.log('Draw response:', res)

      if (res.success) {
        this.setData({
          loading: false,
          dailyDrawsRemaining: res.data.remaining
        })

        if (res.data.prize) {
          // 中奖了
          this.setData({
            wonPrize: res.data.prize,
            rewardCode: res.data.code,
            lotteryStatus: 'result',
            showConfetti: true
          })

          // 3秒后清除彩带
          setTimeout(() => {
            this.setData({ showConfetti: false })
          }, 3000)
        } else {
          // 未中奖
          this.setData({
            lotteryStatus: 'ready',
            errorMessage: '很遗憾，未中奖'
          })

          wx.showToast({
            title: '很遗憾，未中奖',
            icon: 'none',
            duration: 2000
          })
        }
      } else {
        throw new Error(res.error?.message || '抽奖失败')
      }
    } catch (error) {
      console.error('Draw error:', error)
      this.setData({
        lotteryStatus: 'ready',
        loading: false
      })

      wx.showToast({
        title: error.message || '抽奖失败',
        icon: 'none'
      })
    }
  },

  // 关闭抽奖组件
  onCloseLottery() {
    this.setData({
      lotteryStatus: 'claimed',
      showConfetti: false
    })
  },

  // 复制奖励码
  onCopyCode() {
    if (!this.data.rewardCode) return

    wx.setClipboardData({
      data: this.data.rewardCode,
      success: () => {
        wx.showToast({
          title: '奖励码已复制',
          icon: 'success',
          duration: 1500
        })
        this.setData({ lotteryStatus: 'claimed' })
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        })
      }
    })
  },

  // 复制兑换码并联系客服
  onCopyCodeAndContactService() {
    if (!this.data.rewardCode) return

    // 先复制兑换码
    wx.setClipboardData({
      data: this.data.rewardCode,
      success: () => {
        wx.showToast({
          title: '兑换码已复制',
          icon: 'success',
          duration: 1500
        })

        // 然后跳转到客服页面
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/customer-service/index?rewardCode=' + this.data.rewardCode,
            fail: (err) => {
              console.error('跳转到客服页面失败:', err)
              // 降级方案：显示提示
              wx.showModal({
                title: '联系客服',
                content: '兑换码已复制，请联系客服微信号：customer_service_id',
                showCancel: false,
                confirmText: '我知道了'
              })
            }
          })
        }, 500)
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        })
      }
    })
  },

  // 处理组件内的复制并联系客服事件
  onCopyAndContact(e) {
    const { prize } = e.detail

    // 先复制兑换码
    wx.setClipboardData({
      data: prize.rewardCode,
      success: () => {
        wx.showToast({
          title: '兑换码已复制',
          icon: 'success',
          duration: 1500
        })

        // 然后跳转到客服页面
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/customer-service/index?rewardCode=' + prize.rewardCode,
            fail: (err) => {
              console.error('跳转到客服页面失败:', err)
              // 降级方案：显示提示
              wx.showModal({
                title: '联系客服',
                content: '兑换码已复制，请联系客服微信号：customer_service_id',
                showCancel: false,
                confirmText: '我知道了'
              })
            }
          })
        }, 500)
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
  onRedeemCash(e) {
    const { prize } = e.detail

    // 跳转到审核页面，带上奖品信息和返现信息
    wx.navigateTo({
      url: '/pages/verify/index?reviewText=' + encodeURIComponent('') +
        '&rewardCode=' + prize.rewardCode +
        '&prizeName=' + encodeURIComponent(prize.name || '') +
        '&cashAmount=' + (prize.cash_amount || 0) +
        '&isCash=' + (prize.is_cash_reward || 0),
      fail: (err) => {
        console.error('跳转到审核页面失败:', err)
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        })
      }
    })
  },

  // 添加客服
  onAddCustomerService() {
    // 跳转到客服二维码页面
    wx.navigateTo({
      url: '/pages/customer-service/index?rewardCode=' + this.data.rewardCode,
      fail: (err) => {
        console.error('跳转到客服页面失败:', err)
        // 降级方案：显示提示
        wx.showModal({
          title: '领取奖励',
          content: '请联系客服微信号：customer_service_id',
          showCancel: false,
          confirmText: '我知道了'
        })
      }
    })
  },

  // 返回结果页
  navigateToResult() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        // 如果无法返回，则跳转到首页
        wx.reLaunch({
          url: '/pages/index/index'
        })
      }
    })
  },

  // 重试加载
  onRetry() {
    wx.navigateTo({
      url: '/pages/result/index'
    })
  },

  // 获取彩带颜色
  getConfettiColor(index) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FECA57', '#FF9FF3', '#54A0FF', '#48DBFB',
      '#A29BFE', '#FD79A8', '#FDCB6E', '#6C5CE7',
      '#00D2D3', '#FFA502', '#FF6348', '#FF4757'
    ]
    return colors[index % colors.length]
  }
})