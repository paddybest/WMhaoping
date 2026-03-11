// error.js - 优化后的错误页面
Page({
  data: {
    code: '',          // 错误码
    message: '',       // 错误消息
    canRetry: false,  // 是否显示重试按钮
    canGoBack: false,  // 是否显示返回按钮
    showFooter: false, // 是否显示底部提示
    iconError: false, // 图标加载失败状态
    loading: false,     // 操作加载状态
    retryCount: 0     // 重试次数
  },

  onLoad(options) {
    console.log('错误页面加载，参数:', options);

    const code = options.code || 'UNKNOWN';
    const message = options.message || '未知错误';

    // 根据错误码判断显示哪些按钮
    let canRetry = false;
    let canGoBack = false;
    let showFooter = false;

    switch (code) {
      case 'INVALID_QR':
      case 'MERCHANT_NOT_FOUND':
      case 'MERCHANT_CLOSED':
      case 'NO_DATA':
        // 这些错误可以重试（加载商家数据）
        canRetry = true;
        canGoBack = true;
        showFooter = true; // 显示客服按钮
        break;

      case 'NETWORK_ERROR':
        // 网络错误可以重试
        canRetry = true;
        canGoBack = false;
        showFooter = true;
        break;

      default:
        // 通用错误只显示返回
        canGoBack = true;
        break;
    }

    this.setData({
      code,
      message,
      canRetry,
      canGoBack,
      showFooter,
      retryCount: 0
    });

    // 触发震动反馈
    this.triggerHapticFeedback(code);
  },

  /**
   * 图标加载错误处理
   */
  handleIconError() {
    console.warn('错误图标加载失败');
    this.setData({ iconError: true });
  },

  /**
   * 触发震动反馈
   * 不同错误类型使用不同的震动效果
   */
  triggerHapticFeedback(code) {
    try {
      switch (code) {
        case 'INVALID_QR':
          // 轻微震动
          wx.vibrateShort();
          break;
        case 'MERCHANT_NOT_FOUND':
        case 'MERCHANT_CLOSED':
          // 中等震动
          wx.vibrateMedium();
          break;
        case 'NETWORK_ERROR':
          // 轻微震动
          wx.vibrateShort();
          break;
        default:
          // 震动
          wx.vibrateShort();
          break;
      }
    } catch (error) {
      console.warn('震动反馈不可用:', error);
    }
  },

  /**
   * 重试操作
   * 支持重试计数，防止无限重试
   */
  onRetry() {
    const { code, retryCount, loading } = this.data;

    if (loading) {
      console.warn('操作进行中，请稍后...');
      return;
    }

    // 限制重试次数（最多5次）
    if (retryCount >= 5) {
      wx.showToast({
        title: '重试次数过多',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    this.setData({
      loading: true,
      retryCount: retryCount + 1
    });

    // 根据错误类型执行不同的重试逻辑
    setTimeout(() => {
      switch (code) {
        case 'NETWORK_ERROR':
          // 网络错误：重新加载商家信息
          this.retryLoadMerchant();
          break;

        case 'INVALID_QR':
        case 'MERCHANT_NOT_FOUND':
        case 'MERCHANT_CLOSED':
        case 'NO_DATA':
          // 二维码或数据错误：返回首页重新扫码
          wx.redirectTo({
            url: '/pages/index/index'
          });
          break;

        default:
          // 通用错误：返回上一页
          this.goBack();
          break;
      }

      this.setData({ loading: false });
    }, 300);
  },

  /**
   * 重新加载商家信息
   */
  retryLoadMerchant() {
    const app = getApp();
    const merchantId = wx.getStorageSync('selectedMerchantId');

    if (!merchantId) {
      wx.showToast({
        title: '商家信息已丢失，请重新扫码',
        icon: 'none',
        duration: 2000
      });

      // 清除缓存并返回首页
      wx.removeStorageSync('selectedMerchantId');
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/index/index'
        });
      }, 1500);
      return;
    }

    console.log('重新加载商家信息，merchantId:', merchantId);

    // 重新调用app.js的handleMerchantId
    if (typeof app.handleMerchantId === 'function') {
      app.handleMerchantId({
        merchantId,
        from: 'error-retry'
      });
    }
  },

  /**
   * 返回操作
   */
  onGoBack() {
    if (this.data.loading) {
      return;
    }

    console.log('用户点击返回');

    try {
      // 尝试返回上一页
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack({
          delta: 1
        });
      } else {
        // 没有历史页面，返回首页
        wx.redirectTo({
          url: '/pages/index/index'
        });
      }
    } catch (error) {
      console.error('返回失败:', error);
      wx.showToast({
        title: '返回失败',
        icon: 'none'
      });
    }
  },

  /**
   * 联系客服
   */
  onContactSupport() {
    const app = getApp();
    const merchantId = app.globalData.selectedMerchantId;

    if (!merchantId) {
      wx.showToast({
        title: '商家信息已丢失，请重新扫码',
        icon: 'none'
      });
      return;
    }

    // 获取商家信息
    const merchantInfo = app.globalData.merchantInfo;

    if (merchantInfo && merchantInfo.customerServiceQrUrl) {
      // 显示客服二维码
      wx.showModal({
        title: '联系客服',
        content: '是否要查看客服联系方式？',
        showCancel: false,
        confirmText: '查看',
        success: () => {
          // 显示客服二维码
          wx.previewImage({
            urls: [merchantInfo.customerServiceQrUrl],
            current: 0
          });

          // 复制链接到剪贴板
          wx.setClipboardData({
            data: merchantInfo.customerServiceQrUrl
          });

          wx.showToast({
            title: '客服链接已复制到剪贴板',
            icon: 'success'
          });
        }
      });
    } else {
      wx.showToast({
        title: '暂无客服信息',
        icon: 'none'
      });
    }
  },

  /**
   * 页面显示时触发
   */
  onShow() {
    console.log('错误页面显示');
    // 可以在这里添加埋点统计
  },

  /**
   * 页面隐藏时
   */
  onHide() {
    console.log('错误页面隐藏');
  },

  /**
   * 分享错误页面
   */
  onShareAppMessage() {
    return {
      title: '好评宝 - 系统错误',
      path: '/pages/error/error',
      imageUrl: '/images/error-share.png',
      success: (res) => {
        console.log('分享成功:', res);
      }
    };
  }
});

/**
 * 辅助函数：获取当前页面栈
 */
function getCurrentPages() {
  const pages = [];
  const currentPages = getCurrentPages() || [];

  for (let i = 0; i < currentPages.length; i++) {
    pages.push(currentPages[i].route);
  }

  return pages;
}
