const { getApiBaseUrl } = require('../../utils/api.js');

Page({
  data: {
    screenshotUrl: '',
    reviewText: '',
    imageUrl: '',
    submitting: false,
    reviewId: ''
  },

  onLoad(options) {
    console.log('Verify page loaded with options:', options);
    
    if (options.data) {
      try {
        const data = JSON.parse(decodeURIComponent(options.data));
        this.setData({
          reviewText: data.reviewText || '',
          imageUrl: data.imageUrl || '',
          reviewId: data.reviewId || ''
        });
      } catch (error) {
        console.error('Parse data error:', error);
      }
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
    
    if (options.reviewId) {
      this.setData({
        reviewId: options.reviewId
      });
    }
  },

  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          screenshotUrl: tempFilePath
        });
      }
    });
  },

  onPreviewImage() {
    if (this.data.screenshotUrl) {
      wx.previewImage({
        urls: [this.data.screenshotUrl],
        current: this.data.screenshotUrl
      });
    }
  },

  async onSubmit() {
    if (!this.data.screenshotUrl || this.data.submitting) {
      return;
    }

    this.setData({ submitting: true });

    wx.showLoading({ title: '上传中...', mask: true });

    try {
      const uploadResult = await this.uploadImage(this.data.screenshotUrl);
      console.log('Upload result:', uploadResult);

      wx.showLoading({ title: '审核中...', mask: true });

      const verifyResult = await this.verifyScreenshot(uploadResult.url);
      console.log('Verify result:', verifyResult);

      wx.hideLoading();

      if (verifyResult.success) {
        wx.redirectTo({
          url: `/pages/success/index?amount=${verifyResult.rewardAmount || 0.5}`
        });
      } else {
        wx.redirectTo({
          url: `/pages/guide/index?reason=${encodeURIComponent(verifyResult.reason || '审核未通过')}&reviewText=${encodeURIComponent(this.data.reviewText)}&imageUrl=${encodeURIComponent(this.data.imageUrl)}`
        });
      }

    } catch (error) {
      console.error('Submit error:', error);
      wx.hideLoading();
      wx.showModal({
        title: '提交失败',
        content: error.message || '网络错误，请重试',
        showCancel: false
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: getApiBaseUrl() + '/reviews/upload-screenshot',
        filePath: filePath,
        name: 'screenshot',
        formData: {
          reviewId: this.data.reviewId
        },
        header: {
          'Authorization': 'Bearer ' + wx.getStorageSync('token')
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.code === 0) {
              resolve(data.data);
            } else {
              reject(new Error(data.message || '上传失败'));
            }
          } catch (e) {
            reject(new Error('解析响应失败'));
          }
        },
        fail: (err) => {
          reject(new Error('网络请求失败'));
        }
      });
    });
  },

  verifyScreenshot(screenshotUrl) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: getApiBaseUrl() + '/reviews/verify-screenshot',
        method: 'POST',
        data: {
          screenshotUrl: screenshotUrl,
          reviewId: this.data.reviewId,
          expectedText: this.data.reviewText
        },
        header: {
          'Authorization': 'Bearer ' + wx.getStorageSync('token'),
          'content-type': 'application/json'
        },
        success: (res) => {
          if (res.data.code === 0) {
            resolve(res.data.data);
          } else {
            reject(new Error(res.data.message || '审核失败'));
          }
        },
        fail: (err) => {
          reject(new Error('网络请求失败'));
        }
      });
    });
  },

  onViewGuide() {
    wx.navigateTo({
      url: `/pages/guide/index?reviewText=${encodeURIComponent(this.data.reviewText)}&imageUrl=${encodeURIComponent(this.data.imageUrl)}`
    });
  }
});
