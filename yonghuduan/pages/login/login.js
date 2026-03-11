// pages/login/login.js
const { post } = require('../../utils/api');

Page({
  data: {
    loading: false
  },

  onLoad(options) {
    // 检查是否已经登录
    const token = wx.getStorageSync('token');
    if (token) {
      // 已登录，跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      });
    }

    // 如果是从邀请链接进入
    if (options.scene) {
      console.log('Scene:', options.scene);
    }
  },

  /**
   * 获取用户信息回调
   */
  onGetUserInfo(e) {
    console.log('getUserInfo:', e);

    if (e.detail.errMsg === 'getUserInfo:ok') {
      this.doLogin();
    } else {
      wx.showToast({
        title: '需要授权才能登录',
        icon: 'none'
      });
    }
  },

  /**
   * 执行登录
   */
  async doLogin() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      // 1. 获取微信登录code
      const loginRes = await this.getWxLoginCode();
      if (!loginRes.code) {
        throw new Error('获取微信登录凭证失败');
      }

      // 2. 调用后端登录接口
      const apiRes = await post('/auth/wechat-login', {
        code: loginRes.code
      });

      if (apiRes.success && apiRes.data) {
        const { token, user } = apiRes.data;

        // 3. 保存token和用户信息
        wx.setStorageSync('token', token);
        wx.setStorageSync('user', user);

        // 4. 提示登录成功
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });

        // 5. 延迟跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
      } else {
        throw new Error(apiRes.message || '登录失败');
      }

    } catch (error) {
      console.error('Login error:', error);
      wx.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 获取微信登录code
   */
  getWxLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve(res);
          } else {
            reject(new Error('获取code失败'));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }
});
