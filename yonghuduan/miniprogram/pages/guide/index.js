Page({
  data: {
    reason: '',
    reviewText: '',
    imageUrl: ''
  },

  onLoad(options) {
    console.log('Guide page loaded with options:', options);
    
    if (options.reason) {
      this.setData({
        reason: decodeURIComponent(options.reason)
      });
    }
    
    if (options.reviewText) {
      this.setData({
        reviewText: decodeURIComponent(options.reviewText)
      });
    }
    
    if (options.imageUrl) {
      this.setData({
        imageUrl: decodeURIComponent(options.imageUrl)
      });
    }
  },

  onGoBack() {
    const data = {
      reviewText: this.data.reviewText,
      imageUrl: this.data.imageUrl
    };
    
    wx.redirectTo({
      url: `/pages/verify/index?data=${encodeURIComponent(JSON.stringify(data))}`
    });
  },

  onViewReview() {
    const data = {
      reviewText: this.data.reviewText,
      imageUrl: this.data.imageUrl
    };
    
    wx.redirectTo({
      url: `/pages/result/index?data=${encodeURIComponent(JSON.stringify(data))}`
    });
  }
});
