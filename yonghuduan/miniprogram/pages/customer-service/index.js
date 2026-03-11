// pages/customer-service/index.js
Page({
  data: {
    rewardCode: '',
    customerServiceQR: 'https://via.placeholder.com/300x300/4A90E2/FFFFFF?text=Customer+Service+QR',  // 占位图片
    loading: false,
    error: ''
  },

  onLoad(options) {
    console.log('客服页面加载，参数:', options)

    if (options.rewardCode) {
      this.setData({
        rewardCode: decodeURIComponent(options.rewardCode)
      })
    }

    // 获取客服二维码
    this.getCustomerServiceQR()
  },

  // 获取客服二维码
  async getCustomerServiceQR() {
    const { get } = require('../../utils/api')

    try {
      // 调用后端API获取客服二维码
      const res = await get('/customer-service/qr')

      console.log('获取客服二维码响应:', res)

      if (res.success && res.data && res.data.qrCode) {
        const qrUrl = res.data.qrCode

        if (qrUrl) {
          this.setData({
            customerServiceQR: qrUrl,
            loading: false
          })
        } else {
          throw new Error('二维码URL为空')
        }
      } else {
        throw new Error(res.message || '获取失败')
      }

    } catch (error) {
      console.error('获取客服二维码失败:', error)
      this.setData({
        error: error.message || '加载失败，请稍后再试',
        loading: false
      })
    }
  },

  // 长按保存二维码
  onSaveQR() {
    if (!this.data.customerServiceQR) return

    wx.showModal({
      title: '保存二维码',
      content: '请长按二维码图片保存到相册',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 返回抽奖页面
  onBack() {
    wx.navigateBack()
  },

  // 返回抽奖页面（从集成按钮点击进入）
  onBackToLottery() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        // 如果无法返回，则重新跳转到抽奖页面
        wx.reLaunch({
          url: '/pages/lottery/index'
        })
      }
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
          icon: 'success'
        })
      }
    })
  }
})