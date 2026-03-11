const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event, context) => {
  try {
    // 检查环境变量是否存在
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        message: 'DEEPSEEK_API_KEY 环境变量未配置',
        details: '请在云函数控制台配置环境变量 DEEPSEEK_API_KEY'
      };
    }

    // 检查 API Key 格式
    if (apiKey.length < 10) {
      return {
        success: false,
        message: 'API Key 格式可能不正确',
        details: 'DEEPSEEK_API_KEY 长度应该大于10个字符'
      };
    }

    // 返回成功信息
    return {
      success: true,
      message: 'DeepSeek API Key 配置正确',
      details: `API Key 长度: ${apiKey.length} 字符`
    };

  } catch (error) {
    return {
      success: false,
      message: '测试过程中发生错误',
      error: error.message
    };
  }
};