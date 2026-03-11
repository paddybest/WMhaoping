const cloud = require("wx-server-sdk");

cloud.init({
  env: "cloud1-9gbrkqwy4f67587b",
});

// Main entry point
exports.main = async (event, context) => {
  try {
    // 获取当前用户的 openid
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    console.log('获取 openid 成功:', openid)

    return {
      success: true,
      openid: openid
    }
  } catch (error) {
    console.error('获取 openid 失败:', error)
    return {
      success: false,
      errMsg: error.message || '获取 openid 失败'
    }
  }
};