Page({
  data: {
    amount: 0.5,
    time: ''
  },

  onLoad(options) {
    console.log('Success page loaded with options:', options);
    
    if (options.amount) {
      this.setData({
        amount: parseFloat(options.amount)
      });
    }
    
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.setData({
      time: timeStr
    });
  },

  onGoHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  onContinue() {
    wx.navigateBack({
      delta: 3
    });
  }
});
