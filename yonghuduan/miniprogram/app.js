// app.js
var api = require('./utils/api.js');

App({
  onLaunch: function (options) {
    console.log('小程序启动，参数:', options);

    // 清除旧缓存（修复之前乱码数据的问题）
    wx.removeStorageSync('categories');
    wx.removeStorageSync('merchants');

    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (!token) {
      console.log('No token found, user needs to login via WeChat');
    }

    // 初始化全局配置
    this.globalData = {
      // API配置 - 使用127.0.0.1解决localhost解析问题
      apiBaseUrl: 'http://127.0.0.1:8080/api',
      wsUrl: 'ws://127.0.0.1:8080',
      // 产品数据相关
      categories: null,
      productsCache: {},
      merchants: [],
      selectedMerchantId: null
    };

    // 加载缓存数据
    this.loadCachedData();

    // 处理merchant_id参数
    this.handleMerchantId(options);

    console.log('App launched, token exists:', !!token);
  },

  onShow: function (options) {
    console.log('小程序显示，参数:', options);

    // 当小程序从后台进入前台时，也需要处理参数
    if (options && options.query) {
      this.handleMerchantId(options);
    }
  },

  /**
   * 处理merchant_id参数
   */
  handleMerchantId: function (options) {
    let merchantId = null;

    // 方式1: 从URL参数获取
    if (options && options.query && options.query.merchant_id) {
      merchantId = parseInt(options.query.merchant_id);
      console.log('从URL参数获取merchant_id:', merchantId);
    }
    // 方式2: 从扫码场景获取
    else if (options && options.scene && options.scene.merchant_id) {
      merchantId = parseInt(options.scene.merchant_id);
      console.log('从扫码场景获取merchant_id:', merchantId);
    }
    // 方式3: 从缓存恢复
    else {
      merchantId = wx.getStorageSync('selectedMerchantId');
      console.log('从缓存恢复merchant_id:', merchantId);
    }

    // 方式4: 开发环境使用默认merchant_id
    if (!merchantId) {
      const accountInfo = wx.getAccountInfoSync ? wx.getAccountInfoSync() : null;
      const envVersion = accountInfo ? accountInfo.miniProgram.envVersion : 'develop';
      
      if (envVersion === 'develop' || envVersion === 'trial') {
        merchantId = 1;
        console.log('开发/测试环境，使用默认merchant_id:', merchantId);
      }
    }

    // 验证merchant_id
    if (merchantId) {
      this.globalData.selectedMerchantId = merchantId;
      wx.setStorageSync('selectedMerchantId', merchantId);

      // 加载商家信息并验证
      this.loadAndVerifyMerchant(merchantId);
    } else {
      // 无merchant_id，跳转到错误页面
      console.error('未找到merchant_id，跳转到错误页面');
      wx.redirectTo({
        url: '/pages/error/error?code=INVALID_QR'
      });
    }
  },

  /**
   * 加载并验证商家信息
   */
  async loadAndVerifyMerchant(merchantId) {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${this.globalData.apiBaseUrl}/miniprogram/merchant/${merchantId}`,
          method: 'GET',
          timeout: 10000,
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        });
      });

      if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
        this.globalData.merchantInfo = res.data.data;

        // 验证商家是否营业
        if (!res.data.data.isActive) {
          console.error('商家已打烊');
          wx.redirectTo({
            url: '/pages/error/error?code=MERCHANT_CLOSED'
          });
          return;
        }

        console.log('商家信息验证成功:', res.data.data.name);

        // 记录扫码统计（任务17）
        this.recordScan(merchantId);
      } else {
        throw new Error('商家不存在');
      }
    } catch (error) {
      console.error('加载商家信息失败:', error);

      // 判断是网络错误还是商家不存在
      if (error.errMsg && error.errMsg.includes('timeout')) {
        wx.redirectTo({
          url: '/pages/error/error?code=NETWORK_ERROR'
        });
      } else {
        wx.redirectTo({
          url: '/pages/error/error?code=MERCHANT_NOT_FOUND'
        });
      }
    }
  },

  /**
   * 记录扫码统计（任务17：扫码统计数据）
   */
  async recordScan(merchantId) {
    try {
      // 获取用户信息
      const userInfo = this.getUserInfo();

      if (!userInfo || !userInfo.openid) {
        console.log('用户未登录，暂不记录扫码统计');
        return;
      }

      // 构造二维码URL
      const qrCodeUrl = `pages/index/index?merchant_id=${merchantId}`;

      // 调用api.js中的recordScan方法
      const result = await api.recordScan(merchantId, qrCodeUrl);

      if (result) {
        console.log('扫码统计记录成功:', result);
      } else {
        console.log('扫码统计记录失败（非阻塞）');
      }
    } catch (error) {
      // 扫码统计失败不影响主流程，只记录日志
      console.log('扫码统计记录异常（非阻塞）:', error);
    }
  },

  // 全局数据
  globalData: {
    userInfo: null,
    apiBaseUrl: '',
    wsUrl: '',
    categories: null,
    productsCache: {},
    merchants: [],
    selectedMerchantId: null
  },

  // 检查登录状态
  checkLogin: function() {
    const token = wx.getStorageSync('token')
    return !!token
  },

  // 测试环境模拟登录（仅开发版本可用）
  testLogin: function(callback) {
    const accountInfo = wx.getAccountInfoSync ? wx.getAccountInfoSync() : null;
    const envVersion = accountInfo ? accountInfo.miniProgram.envVersion : 'develop';

    if (envVersion !== 'develop' && envVersion !== 'trial') {
      wx.showToast({ title: '仅测试环境可用', icon: 'none' });
      return;
    }

    // 设置测试用的token和用户信息
    const testToken = 'test_token_' + Date.now();
    const testUserId = 1;  // 测试用户ID
    const testUserInfo = {
      id: testUserId,
      openid: 'test_openid_123456',
      nickname: '测试用户',
      avatarUrl: ''
    };

    wx.setStorageSync('token', testToken);
    wx.setStorageSync('userInfo', testUserInfo);
    wx.setStorageSync('userId', testUserId);  // 存储userId供抽奖使用

    this.globalData.userInfo = testUserInfo;
    this.globalData.userId = testUserId;

    wx.showToast({ title: '测试登录成功', icon: 'success' });

    console.log('测试登录设置完成:', testUserInfo);

    if (callback) callback();
  },

  // 测试环境模拟商家登录
  testMerchantLogin: function(merchantId, callback) {
    const accountInfo = wx.getAccountInfoSync ? wx.getAccountInfoSync() : null;
    const envVersion = accountInfo ? accountInfo.miniProgram.envVersion : 'develop';

    if (envVersion !== 'develop' && envVersion !== 'trial') {
      wx.showToast({ title: '仅测试环境可用', icon: 'none' });
      return;
    }

    // 设置商家ID
    this.globalData.selectedMerchantId = merchantId;
    wx.setStorageSync('selectedMerchantId', merchantId);

    wx.showToast({ title: '测试商家: ' + merchantId, icon: 'success' });

    console.log('测试商家ID设置完成:', merchantId);

    if (callback) callback();
  },

  // 清除测试登录状态
  clearTestLogin: function() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('selectedMerchantId');
    this.globalData.userInfo = null;
    this.globalData.selectedMerchantId = null;
    wx.showToast({ title: '已清除登录状态', icon: 'success' });
  },

  // 设置用户信息
  setUserInfo: function(userInfo) {
    this.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
  },

  // 获取用户信息
  getUserInfo: function() {
    return this.globalData.userInfo || wx.getStorageSync('userInfo')
  },

  // 加载缓存数据
  loadCachedData() {
    try {
      const categories = wx.getStorageSync('categories');
      const merchants = wx.getStorageSync('merchants');
      const selectedMerchantId = wx.getStorageSync('selectedMerchantId');

      // 统一缓存策略：分类和产品都使用1小时缓存
      const CACHE_DURATION = 3600000; // 1小时

      if (categories) {
        const now = Date.now();
        if (now - categories.timestamp < CACHE_DURATION) {
          this.globalData.categories = categories.data;
          console.log('Loaded categories from cache');
        }
      }

      if (merchants) {
        const now = Date.now();
        if (now - merchants.timestamp < 86400000) { // 商家列表24小时缓存
          this.globalData.merchants = merchants.data;
          console.log('Loaded merchants from cache');
        }
      }

      if (selectedMerchantId) {
        this.globalData.selectedMerchantId = selectedMerchantId;
      }
    } catch (error) {
      console.error('Load cache failed:', error);
    }
  },

  // 刷新数据
  async refreshData() {
    try {
      // 拉取商家列表
      const merchantsRes = await new Promise((resolve, reject) => {
        wx.request({
          url: `${this.globalData.apiBaseUrl}/miniprogram/merchant`,
          method: 'GET',
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        });
      });

      if (merchantsRes.statusCode === 200 && merchantsRes.data && merchantsRes.data.success) {
        this.globalData.merchants = merchantsRes.data.data;
        wx.setStorageSync('merchants', {
          data: merchantsRes.data.data,
          timestamp: Date.now()
        });
        console.log('Merchants refreshed:', this.globalData.merchants.length);
      } else {
        console.error('Failed to load merchants:', merchantsRes.data);
      }

      // 拉取分类树
      if (this.globalData.selectedMerchantId) {
        await this.loadCategories();
      }
    } catch (error) {
      console.error('Refresh data failed:', error);
      wx.showToast({
        title: '数据刷新失败',
        icon: 'none'
      });
    }
  },

  // 加载分类
  async loadCategories() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${this.globalData.apiBaseUrl}/miniprogram/categories`,
          data: {
            merchantId: this.globalData.selectedMerchantId
          },
          method: 'GET',
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        });
      });

      if (res.statusCode === 200 && res.data && res.data.success) {
        this.globalData.categories = res.data.data;
        wx.setStorageSync('categories', {
          data: res.data.data,
          timestamp: Date.now()
        });
        console.log('Categories loaded:', this.globalData.categories);
      } else {
        console.error('Failed to load categories:', res.data);
      }
    } catch (error) {
      console.error('Load categories failed:', error);
      throw error;
    }
  }
});
