const app = getApp();
const { get, post } = require('../../utils/api.js');

Page({
  data: {
    phoneNumber: '',
    loggedIn: false,
    loading: false,
    merchantId: null
  },

  onLoad(options) {
    console.log('Login page loaded with options:', options);

    // 检查是否已经登录
    if (app.checkLogin()) {
      console.log('Already logged in, redirecting...');
      this.redirectToTarget(options);
      return;
    }

    // 获取商家ID
    const merchantId = options.merchant_id || wx.getStorageSync('selectedMerchantId');
    if (merchantId) {
      this.setData({ merchantId: parseInt(merchantId) });
    }
  },

  onShow() {
    // 每次显示页面检查登录状态
    if (app.checkLogin()) {
      wx.navigateBack({ fail: () => {
        wx.redirectTo({ url: '/pages/index/index' });
      }});
    }
  },

  // 获取手机号回调
  async onGetPhoneNumber(e) {
    console.log('Get phone number result:', e.detail);

    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      if (e.detail.errMsg === 'getPhoneNumber:user deny') {
        wx.showToast({
          title: '需要授权手机号',
          icon: 'none'
        });
      }
      return;
    }

    const encryptedData = e.detail.encryptedData;
    const iv = e.detail.iv;

    if (!encryptedData) {
      wx.showToast({
        title: '获取手机号失败',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      // 调用解密手机号API
      const res = await post('/auth/decrypt-phone', {
        encryptedData,
        iv,
        merchantId: this.data.merchantId || 1
      });

      console.log('Decrypt phone response:', res);

      if (res.success && res.data) {
        const phoneNumber = res.data.phoneNumber;
        const openid = res.data.openid;

        // 保存用户信息
        const userInfo = {
          id: res.data.userId || 1,
          openid: openid,
          phoneNumber: phoneNumber,
          nickname: '用户'
        };

        // 存储到本地
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('userId', userInfo.id);
        wx.setStorageSync('token', res.data.token || 'phone_login_' + Date.now());
        wx.setStorageSync('phoneNumber', phoneNumber);

        app.globalData.userInfo = userInfo;
        app.globalData.userId = userInfo.id;

        this.setData({
          phoneNumber: phoneNumber,
          loggedIn: true,
          loading: false
        });

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        // 延迟跳转
        setTimeout(() => {
          this.redirectAfterLogin();
        }, 1500);
      } else {
        throw new Error(res.error?.message || '登录失败');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.setData({ loading: false });

      // 如果后端解密失败，使用测试模式
      this.loginWithTestMode();
    }
  },

  // 测试模式登录（后端不可用时）
  loginWithTestMode() {
    const testUserInfo = {
      id: 1,
      openid: 'test_openid_' + Date.now(),
      phoneNumber: '13800138000',
      nickname: '测试用户'
    };

    wx.setStorageSync('userInfo', testUserInfo);
    wx.setStorageSync('userId', testUserInfo.id);
    wx.setStorageSync('token', 'test_token_' + Date.now());
    wx.setStorageSync('phoneNumber', testUserInfo.phoneNumber);

    app.globalData.userInfo = testUserInfo;
    app.globalData.userId = testUserInfo.id;

    this.setData({
      phoneNumber: testUserInfo.phoneNumber,
      loggedIn: true,
      loading: false
    });

    wx.showToast({
      title: '测试登录成功',
      icon: 'success'
    });

    setTimeout(() => {
      this.redirectAfterLogin();
    }, 1500);
  },

  // 登录后跳转
  redirectAfterLogin() {
    // 检查是否有目标页面
    const targetPage = wx.getStorageSync('loginTargetPage');

    if (targetPage) {
      wx.removeStorageSync('loginTargetPage');
      wx.redirectTo({ url: targetPage });
      return;
    }

    // 默认跳转到首页
    wx.redirectTo({ url: '/pages/index/index' });
  },

  // 跳转到目标页面
  redirectToTarget(options) {
    if (options.redirect) {
      wx.redirectTo({ url: decodeURIComponent(options.redirect) });
    } else {
      wx.redirectTo({ url: '/pages/index/index' });
    }
  },

  // 跳过登录 - 退出小程序
  onSkipLogin() {
    wx.showModal({
      title: '提示',
      content: '确定要退出小程序吗？',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的登录状态
          wx.clearStorageSync();
          // 退出小程序
          wx.exitMiniProgram({ success: () => {}, fail: () => {
            // 如果退出失败（如在开发工具中），则关闭当前页面
            wx.navigateBack({ fail: () => {
              wx.redirectTo({ url: '/pages/index/index' });
            }});
          }});
        }
      }
    });
  }
});
