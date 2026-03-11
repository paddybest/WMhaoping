const cloud = require("wx-server-sdk");

cloud.init({
  env: "cloud1-9gbrkqwy4f67587b",
});

// Generate random 6-character code (A-Z, 0-9)
const generateRandomCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Main entry point
exports.main = async (event, context) => {
  console.log('云函数被调用，event:', event);

  let openid = '';

  // 尝试获取 openid
  try {
    // 1. 从事件参数获取
    openid = event.openid || '';
    console.log('从参数获取 openid:', openid);

    // 2. 从上下文获取
    if (!openid) {
      const wxContext = cloud.getWXContext();
      openid = wxContext.OPENID;
      console.log('从上下文获取 openid:', openid);
    }
  } catch (e) {
    console.error('获取 openid 出错:', e);
  }

  console.log('最终使用的 openid:', openid || '(空)');

  try {
    // 直接生成一个随机码，不检查重复
    const code = generateRandomCode();

    return {
      success: true,
      data: {
        code: code,
        message: '生成成功',
        openid: openid || 'anonymous'
      }
    };

  } catch (error) {
    console.error('createLotteryCode error:', error);
    return { success: false, errMsg: error.message || 'Internal server error' };
  }
};