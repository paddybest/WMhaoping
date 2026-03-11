// index.js
const app = getApp()
import { get, post } from '../../utils/api'

Page({
  data: {
    currentTags: [],
    selectedTags: [],
    canGenerate: false,
    loading: false,
    productId: null,
    productName: ''
  },

  onLoad(options) {
    console.log('Index page loaded with options:', options);

    if (options.merchant_id) {
      app.globalData.selectedMerchantId = parseInt(options.merchant_id);
      wx.setStorageSync('selectedMerchantId', parseInt(options.merchant_id));
    }

    if (options.product_id) {
      this.setData({ productId: parseInt(options.product_id) });
      this.loadProductAndNavigate(parseInt(options.product_id));
      return;
    }

    this.loadTags();
  },

  async loadProductAndNavigate(productId) {
    this.setData({ loading: true });

    try {
      const merchantId = app.globalData.selectedMerchantId || wx.getStorageSync('selectedMerchantId');
      
      if (!merchantId) {
        wx.showToast({
          title: '商家信息缺失',
          icon: 'none'
        });
        this.setData({ loading: false });
        return;
      }

      const res = await get(`/miniprogram/products/${productId}?merchantId=${merchantId}`);
      console.log('Product response:', res);

      if (res.success && res.data) {
        const product = res.data;
        this.setData({ 
          productName: product.name,
          loading: false 
        });

        wx.navigateTo({
          url: `/pages/result/index?product_id=${productId}&product_name=${encodeURIComponent(product.name)}&merchant_id=${merchantId}`
        });
      } else {
        wx.showToast({
          title: '商品不存在',
          icon: 'none'
        });
        this.loadTags();
      }
    } catch (error) {
      console.error('Load product failed:', error);
      wx.showToast({
        title: '加载商品失败',
        icon: 'none'
      });
      this.loadTags();
    }
  },

  onPullDownRefresh() {
    this.loadTags().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadTags() {
    this.setData({ loading: true });

    try {
      const merchantId = app.globalData.selectedMerchantId || wx.getStorageSync('selectedMerchantId');
      
      if (!merchantId) {
        wx.showToast({
          title: '请先选择商家',
          icon: 'none'
        });
        this.setData({ loading: false });
        return;
      }

      const res = await get(`/miniprogram/tags?merchantId=${merchantId}`);
      console.log('Tags response:', res);

      if (res.success && res.data) {
        const tags = res.data.map(tag => tag.name);
        this.setData({
          currentTags: tags
        });
      }
    } catch (error) {
      console.error('Load tags failed:', error);
      wx.showToast({
        title: '加载标签失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onTagToggle(e) {
    const tag = e.currentTarget.dataset.tag
    console.log('🏷️ Tag clicked:', tag)

    let selectedTags = [...this.data.selectedTags]

    const idx = selectedTags.indexOf(tag)
    if (idx > -1) {
      selectedTags.splice(idx, 1)
    } else {
      selectedTags.push(tag)
    }

    this.setData({
      selectedTags,
      canGenerate: selectedTags.length > 0
    })
  },

  async onGenerate() {
    if (!this.data.canGenerate) return

    this.setData({ loading: true })

    try {
      const merchantId = app.globalData.selectedMerchantId || wx.getStorageSync('selectedMerchantId');

      const res = await post('/reviews/generate', {
        merchantId: merchantId,
        tags: this.data.selectedTags,
        rating: 5
      })

      console.log('API response:', res)

      if (res.success) {
        if (!res.data) {
          throw new Error('返回数据为空')
        }

        const reviewContent = res.data.review?.content || res.data.content || ''
        let reviewImageUrl = ''
        
        if (res.data.imageUrls && res.data.imageUrls.length > 0) {
          reviewImageUrl = res.data.imageUrls[0]
        } else if (res.data.imageUrl) {
          reviewImageUrl = res.data.imageUrl
        } else if (res.data.review?.image_url) {
          reviewImageUrl = res.data.review.image_url
        }

        const reviewData = {
          content: reviewContent,
          imageUrl: reviewImageUrl
        }

        console.log('Review data to pass:', reviewData)

        wx.navigateTo({
          url: `/pages/result/index?data=${encodeURIComponent(JSON.stringify(reviewData))}`
        })
      } else {
        const errorMsg = res.error?.message || res.message || '生成失败'
        console.error('API error:', errorMsg)
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error('Generate error:', error)
      let errorMsg = '网络错误，请重试'

      if (error.errMsg) {
        errorMsg = error.errMsg
      }
      if (error.message) {
        errorMsg = error.message
      }

      wx.showToast({
        title: errorMsg,
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  }
})
