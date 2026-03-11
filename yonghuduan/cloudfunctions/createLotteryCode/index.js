const cloud = require("wx-server-sdk");

cloud.init({
  env: "cloud1-9gbrkqwy4f67587b",
});

const db = cloud.database();

// Generate random 6-character code (A-Z, 0-9)
const generateRandomCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Check if code already exists
const checkCodeExists = async (code) => {
  try {
    const result = await db.collection('lottery_codes')
      .where({ code })
      .get();
    return result.data.length > 0;
  } catch (error) {
    console.error('Error checking code existence:', error);
    throw error;
  }
};

// Generate unique code with retry logic
const generateUniqueCode = async (maxAttempts = 10) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateRandomCode();
    const exists = await checkCodeExists(code);

    if (!exists) {
      return code;
    }
    console.log(`Code ${code} exists, retrying (${attempt + 1}/${maxAttempts})`);
  }
  throw new Error('Failed to generate unique code after maximum attempts');
};

// Main entry point
exports.main = async (event, context) => {
  const { openid } = event;

  if (!openid) {
    return { success: false, errMsg: 'openid is required' };
  }

  try {
    const code = await generateUniqueCode(10);

    const result = await db.collection('lottery_codes').add({
      data: {
        code: code,
        status: 0,
        openid: openid,
        createTime: new Date()
      }
    });

    return {
      success: true,
      data: { code: code, _id: result._id }
    };

  } catch (error) {
    console.error('createLotteryCode error:', error);
    return { success: false, errMsg: error.message || 'Internal server error' };
  }
};