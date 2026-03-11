const cloud = require("wx-server-sdk");

cloud.init({
  env: "cloud1-9gbrkqwy4f67587b",
});

// Main entry point
exports.main = async (event, context) => {
  const { rewardCode } = event;

  console.log('获取客服二维码，rewardCode:', rewardCode);

  try {
    // TODO: 这里需要调用商家后端接口获取真实的客服二维码
    // 例如：
    // const response = await cloud.openapi.invoke({
    //   url: 'https://your-api.com/customer-service/qr',
    //   data: { rewardCode }
    // })

    // 暂时返回一个示例二维码URL
    // 实际使用时应该替换为真实的二维码URL
    const qrCodeUrl = `https://example.com/qr?code=${rewardCode || 'default'}`;

    console.log('返回二维码URL:', qrCodeUrl);

    return {
      success: true,
      data: {
        qrCode: qrCodeUrl,
        message: '获取成功',
        // 预留字段，可以从商家后端获取更多客服信息
        customerServiceInfo: {
          name: '客服中心',
          avatar: 'https://example.com/avatar.png',
          workingHours: '9:00-21:00'
        }
      }
    };

  } catch (error) {
    console.error('获取客服二维码失败:', error);
    return {
      success: false,
      errMsg: error.message || '获取客服二维码失败'
    };
  }
};