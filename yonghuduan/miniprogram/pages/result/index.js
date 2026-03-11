const api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    currentTags: [],
    selectedTags: [],
    canGenerate: false,
    loadingTags: false,
    generating: false,
    reviewText: '',
    imageUrl: '',
    merchantId: null,
    productName: ''
  },

  onLoad(options) {
    console.log('Result page loaded with options:', options);
    
    if (options.merchantId) {
      this.setData({ merchantId: parseInt(options.merchantId) });
      app.globalData.selectedMerchantId = parseInt(options.merchantId);
    } else if (options.merchant_id) {
      this.setData({ merchantId: parseInt(options.merchant_id) });
      app.globalData.selectedMerchantId = parseInt(options.merchant_id);
    } else {
      const storedMerchantId = app.globalData.selectedMerchantId || wx.getStorageSync('selectedMerchantId');
      if (storedMerchantId) {
        this.setData({ merchantId: storedMerchantId });
      }
    }

    if (options.product_name) {
      this.setData({ productName: decodeURIComponent(options.product_name) });
    }
    
    if (options.data) {
      try {
        const data = JSON.parse(decodeURIComponent(options.data));
        console.log('Parsed data:', data);

        let finalImageUrl = '';
        if (data.imageUrls && data.imageUrls.length > 0) {
          finalImageUrl = data.imageUrls[0];
        } else if (data.imageUrl) {
          finalImageUrl = data.imageUrl;
        }

        this.setData({
          reviewText: data.content || '',
          imageUrl: finalImageUrl
        });
      } catch (error) {
        console.error('Parse data error:', error);
      }
    }
    
    this.loadTags();
  },

  async loadTags() {
    this.setData({ loadingTags: true });

    try {
      const merchantId = this.data.merchantId || app.globalData.selectedMerchantId || wx.getStorageSync('selectedMerchantId');
      
      if (!merchantId) {
        console.log('No merchantId found');
        this.setData({ loadingTags: false });
        return;
      }

      const res = await api.get(`/miniprogram/tags?merchantId=${merchantId}`);
      console.log('Tags response:', res);

      if (res.success && res.data) {
        const tags = res.data.map(tag => tag.name);
        this.setData({
          currentTags: tags
        });
      }
    } catch (error) {
      console.error('Load tags failed:', error);
    } finally {
      this.setData({ loadingTags: false });
    }
  },

  onTagToggle(e) {
    const tag = e.currentTarget.dataset.tag;
    console.log('Tag clicked:', tag);

    let selectedTags = [...this.data.selectedTags];
    const idx = selectedTags.indexOf(tag);

    if (idx > -1) {
      selectedTags.splice(idx, 1);
    } else {
      // 限制最多选择2个标签
      if (selectedTags.length >= 2) {
        wx.showToast({ title: '最多选择2个标签', icon: 'none' });
        return;
      }
      selectedTags.push(tag);
    }

    this.setData({
      selectedTags,
      canGenerate: selectedTags.length > 0
    });
  },

  async onGenerate() {
    if (!this.data.canGenerate || this.data.generating) return;

    this.setData({ generating: true });
    wx.showLoading({ title: '生成中...', mask: true });

    try {
      const merchantId = this.data.merchantId || app.globalData.selectedMerchantId || wx.getStorageSync('selectedMerchantId');

      const res = await api.post('/reviews/generate', {
        merchantId: merchantId,
        productName: this.data.productName || '商品',
        tags: this.data.selectedTags.slice(0, 2),
        rating: 5,
        requestId: Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      });

      console.log('Generate response:', res);

      if (res.success) {
        const reviewContent = res.data.review?.content || res.data.content || '';
        let reviewImageUrl = '';

        if (res.data.imageUrls && res.data.imageUrls.length > 0) {
          reviewImageUrl = res.data.imageUrls[0];
        } else if (res.data.imageUrl) {
          reviewImageUrl = res.data.imageUrl;
        } else if (res.data.review?.image_url) {
          reviewImageUrl = res.data.review.image_url;
        }

        // 强制刷新图片：添加时间戳参数打破缓存
        if (reviewImageUrl) {
          const timestamp = Date.now();
          reviewImageUrl = reviewImageUrl.includes('?')
            ? `${reviewImageUrl}&t=${timestamp}`
            : `${reviewImageUrl}?t=${timestamp}`;
        }

        this.setData({
          reviewText: reviewContent,
          imageUrl: reviewImageUrl
        });

        wx.hideLoading();
        wx.showToast({ title: '生成成功', icon: 'success' });
      } else {
        throw new Error(res.error?.message || res.message || '生成失败');
      }
    } catch (error) {
      console.error('Generate error:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || '生成失败',
        icon: 'none'
      });
    } finally {
      this.setData({ generating: false });
    }
  },

  onCopyText() {
    if (!this.data.reviewText) return;
    
    wx.setClipboardData({
      data: this.data.reviewText,
      success: () => {
        wx.showToast({ title: '文案已复制' });
      }
    });
  },

  onPreviewImage(e) {
    if (this.data.imageUrl) {
      wx.previewImage({
        current: this.data.imageUrl,
        urls: [this.data.imageUrl]
      });
    }
  },

  async onSaveSingle(e) {
    if (!this.data.imageUrl) {
      wx.showToast({ title: '暂无图片', icon: 'none' });
      return;
    }

    try {
      await this.saveImageToAlbum(this.data.imageUrl);
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (error) {
      this.handlePermissionError();
    }
  },

  async onSaveAll() {
    this.doSaveAndVerify('meituan');
  },

  saveImageToAlbum(url) {
    return new Promise((resolve, reject) => {
      if (url.startsWith('cloud://')) {
        wx.cloud.downloadFile({
          fileID: url,
          success: (res) => {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: resolve,
              fail: reject
            });
          },
          fail: reject
        });
      } else {
        wx.downloadFile({
          url: url,
          success: (downloadRes) => {
            wx.saveImageToPhotosAlbum({
              filePath: downloadRes.tempFilePath,
              success: resolve,
              fail: reject
            });
          },
          fail: reject
        });
      }
    });
  },

  handlePermissionError() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.writePhotosAlbum'] === false) {
          wx.showModal({
            title: '需要相册权限',
            content: '保存图片需要授权访问相册',
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      }
    });
  },

  onSubmitVerify() {
    if (!this.data.reviewText) {
      wx.showToast({ title: '请先生成评价', icon: 'none' });
      return;
    }
    
    const data = {
      reviewText: this.data.reviewText,
      imageUrl: this.data.imageUrl
    };
    
    wx.navigateTo({
      url: `/pages/verify/index?data=${encodeURIComponent(JSON.stringify(data))}`
    });
  },

  onJumpToMeituan() {
    this.doSaveAndVerify('meituan');
  },

  onJumpToEleme() {
    this.doSaveAndVerify('eleme');
  },

  async doSaveAndVerify(platform) {
    wx.showLoading({ title: '保存中...' });

    try {
      if (this.data.reviewText.trim()) {
        await new Promise((resolve, reject) => {
          wx.setClipboardData({
            data: this.data.reviewText,
            success: () => {
              wx.showToast({ title: '文案已复制', icon: 'success', duration: 1000 });
              resolve(true);
            },
            fail: reject
          });
        });
      }

      if (this.data.imageUrl) {
        await this.saveImageToAlbum(this.data.imageUrl);
      }

      wx.hideLoading();

      wx.navigateTo({
        url: '/pages/lottery/index'
      });
    } catch (error) {
      wx.hideLoading();
      this.handlePermissionError();
    }
  },

  onImageError(e) {
    console.error('图片加载失败:', e.detail.errMsg);
    const src = e.currentTarget.dataset.src;

    if (src && src.startsWith('cloud://')) {
      wx.cloud.downloadFile({
        fileID: src,
        success: (res) => {
          this.setData({ imageUrl: res.tempFilePath });
        }
      });
    }
  },

  // 重新生成评价
  async onRegenerate() {
    if (this.data.generating) return;

    // 如果没有标签，使用默认标签；限制最多2个标签
    const tags = this.data.selectedTags.length > 0
      ? this.data.selectedTags.slice(0, 2)
      : ['服务好', '口味不错'];

    this.setData({ generating: true });
    wx.showLoading({ title: '重新生成中...', mask: true });

    try {
      const merchantId = this.data.merchantId || app.globalData.selectedMerchantId || wx.getStorageSync('selectedMerchantId');

      const res = await api.post('/reviews/generate', {
        merchantId: merchantId,
        productName: this.data.productName || '商品',
        tags: tags,
        rating: 5,
        requestId: Date.now() + '_' + Math.random().toString(36).substring(2, 11)
      });

      console.log('Regenerate response:', res);

      if (res.success) {
        const reviewContent = res.data.review?.content || res.data.content || '';
        let reviewImageUrl = '';

        if (res.data.imageUrls && res.data.imageUrls.length > 0) {
          reviewImageUrl = res.data.imageUrls[0];
        } else if (res.data.imageUrl) {
          reviewImageUrl = res.data.imageUrl;
        } else if (res.data.review?.image_url) {
          reviewImageUrl = res.data.review.image_url;
        }

        // 强制刷新图片：添加时间戳参数打破缓存
        if (reviewImageUrl) {
          const timestamp = Date.now();
          reviewImageUrl = reviewImageUrl.includes('?')
            ? `${reviewImageUrl}&t=${timestamp}`
            : `${reviewImageUrl}?t=${timestamp}`;
        }

        this.setData({
          reviewText: reviewContent,
          imageUrl: reviewImageUrl
        });

        wx.hideLoading();
        wx.showToast({ title: '重新生成成功', icon: 'success' });
      } else {
        throw new Error(res.error?.message || res.message || '重新生成失败');
      }
    } catch (error) {
      console.error('Regenerate error:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || '重新生成失败',
        icon: 'none'
      });
    } finally {
      this.setData({ generating: false });
    }
  }
});
