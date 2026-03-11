// pages/merchant/merchant.js
const app = getApp()

Page({
  data: {
    merchants: [],
    selectedMerchantId: null,
    loading: false
  },

  onLoad: function (options) {
    // 从全局数据获取商家列表
    this.setData({
      merchants: app.globalData.merchants || [],
      selectedMerchantId: app.globalData.selectedMerchantId
    })

    // 如果没有商家列表，则加载
    if (this.data.merchants.length === 0) {
      this.loadMerchants()
    }
  },

  onShow: function () {
    // 页面显示时刷新选中状态
    this.setData({
      selectedMerchantId: app.globalData.selectedMerchantId
    })
  },

  // 加载商家列表
  loadMerchants: async function () {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      await app.refreshData()

      this.setData({
        merchants: app.globalData.merchants,
        loading: false
      })
    } catch (error) {
      console.error('Load merchants failed:', error)
      this.setData({ loading: false })

      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 选择商家
  selectMerchant: function (e) {
    const merchantId = e.currentTarget.dataset.id
    const merchant = this.data.merchants.find(m => m.id === merchantId)

    if (!merchant) {
      wx.showToast({
        title: '商家不存在',
        icon: 'none'
      })
      return
    }

    if (!merchant.is_active) {
      wx.showToast({
        title: '该商家已打烊',
        icon: 'none'
      })
      return
    }

    // 更新全局数据
    app.globalData.selectedMerchantId = merchantId
    wx.setStorageSync('selectedMerchantId', merchantId)

    // 更新页面选中状态
    this.setData({
      selectedMerchantId: merchantId
    })

    wx.showToast({
      title: `已选择 ${merchant.name}`,
      icon: 'success',
      duration: 1500
    })

    // 延迟返回上一页
    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  },

  // 刷新商家列表
  refreshMerchants: function () {
    this.loadMerchants()
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.loadMerchants().then(() => {
      wx.stopPullDownRefresh()
    })
  }
})
