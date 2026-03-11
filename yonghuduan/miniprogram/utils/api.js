// API utility for mini-program
const API_BASE_URL = 'http://127.0.0.1:8080/api';

const getApiBaseUrl = () => {
  return API_BASE_URL;
};

const getMerchantId = () => {
  const app = getApp();
  return app?.globalData?.selectedMerchantId || wx.getStorageSync('selectedMerchantId');
};

const appendMerchantId = (url, options = {}) => {
  const merchantId = getMerchantId();
  if (merchantId && !url.includes('merchantId=')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}merchantId=${merchantId}`;
  }
  return url;
};

const request = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const urlWithMerchantId = appendMerchantId(url, options);
    wx.request({
      url: `${getApiBaseUrl()}${urlWithMerchantId}`,
      ...options,
      success: (res) => {
        console.log('API Response:', res);
        if (res.statusCode === 200) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          wx.navigateTo({ url: '/pages/login/login' });
          reject(new Error('登录已过期，请重新登录'));
        } else if (res.statusCode === 404) {
          reject(new Error('请求的资源不存在'));
        } else {
          const errorMsg = res.data?.message || '请求失败';
          reject(new Error(errorMsg));
        }
      },
      fail: (error) => {
        console.error('Request failed:', error);
        reject(new Error('网络连接失败，请检查网络'));
      }
    });
  });
};

const get = (url) => {
  return request(url, { method: 'GET' });
};

const post = (url, data) => {
  return request(url, {
    method: 'POST',
    data: JSON.stringify(data),
    header: { 'Content-Type': 'application/json' }
  });
};

const put = (url, data) => {
  return request(url, {
    method: 'PUT',
    data: JSON.stringify(data),
    header: { 'Content-Type': 'application/json' }
  });
};

const del = (url) => {
  return request(url, { method: 'DELETE' });
};

const uploadFile = (url, filePath, formData = {}) => {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${getApiBaseUrl()}${url}`,
      filePath,
      name: 'file',
      formData,
      success: (res) => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(res.data));
          } catch (e) {
            resolve(res.data);
          }
        } else {
          reject(new Error('上传失败'));
        }
      },
      fail: reject
    });
  });
};

const setToken = (token) => {
  wx.setStorageSync('token', token);
};

const getToken = () => {
  return wx.getStorageSync('token');
};

const removeToken = () => {
  wx.removeStorageSync('token');
};

const isLoggedIn = () => {
  return !!getToken();
};

const setMerchantId = (merchantId) => {
  const app = getApp();
  if (app) {
    app.globalData.selectedMerchantId = merchantId;
  }
  wx.setStorageSync('selectedMerchantId', merchantId);
};

const clearMerchantId = () => {
  const app = getApp();
  if (app) {
    app.globalData.selectedMerchantId = null;
  }
  wx.removeStorageSync('selectedMerchantId');
};

const hasMerchantId = () => {
  return !!getMerchantId();
};

const getProductsByCategory = async (categoryId) => {
  try {
    const res = await get(`/miniprogram/products?categoryId=${categoryId}`);
    if (res && res.success) {
      return res.data || [];
    }
    return [];
  } catch (error) {
    console.error('获取商品列表失败:', error);
    return [];
  }
};

const generateRewardCode = async (openid) => {
  try {
    const res = await post('/lottery/generate-code', { openid });
    if (res && res.success) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.error('生成奖励码失败:', error);
    return null;
  }
};

const recordScan = async (merchantId, qrCodeUrl) => {
  try {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const userOpenid = userInfo.openid;
    if (!userOpenid) {
      console.log('用户未登录，暂不记录扫码统计');
      return null;
    }
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await wx.request({
      url: `${getApiBaseUrl()}/merchant/scan/record`,
      method: 'POST',
      header: headers,
      data: {
        merchantId,
        qrCodeUrl: qrCodeUrl || `pages/index/index?merchant_id=${merchantId}`,
        userOpenid
      },
      timeout: 5000
    });
    if (res.statusCode === 200 && res.data && res.data.success) {
      console.log('扫码统计记录成功:', res.data.data);
      return res.data.data;
    } else {
      console.log('扫码统计记录失败:', res.data);
      return null;
    }
  } catch (error) {
    console.log('扫码统计记录异常:', error);
    return null;
  }
};

module.exports = {
  getApiBaseUrl,
  getMerchantId,
  get,
  post,
  put,
  del,
  uploadFile,
  setToken,
  getToken,
  removeToken,
  isLoggedIn,
  setMerchantId,
  clearMerchantId,
  hasMerchantId,
  getProductsByCategory,
  generateRewardCode,
  recordScan
};
