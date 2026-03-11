const cloud = require("wx-server-sdk");
const https = require("https");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// Call DeepSeek API
const callDeepSeekAPI = async (prompt) => {
  return new Promise((resolve, reject) => {
    // 检查多个可能的环境变量名称
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.K9pvL2mZx;

    if (!apiKey) {
      console.error('DeepSeek API key not configured in environment variables')
      console.error('Available env vars:', Object.keys(process.env))
      return reject(new Error('DeepSeek API key not configured'));
    }

    const data = JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 150  // 减少token数量以加速响应
    });

    const options = {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.error) return reject(new Error(parsed.error.message));
          if (parsed.choices?.[0]) {
            resolve(parsed.choices[0].message.content.trim());
          } else {
            reject(new Error('Invalid API response format'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {  // 缩短超时时间到5秒
      req.destroy();
      reject(new Error('API timeout'));
    });
    req.write(data);
    req.end();
  });
};

// Check content safety via WeChat API
const checkContentSafety = async (content) => {
  try {
    const result = await cloud.openapi.security.msgSecCheck({ content });
    return result.errCode === 0;
  } catch (error) {
    console.error('Content safety check failed:', error);
    return false;
  }
};

// Get random images from database
const getRandomImages = async (categoryId, count = 3) => {
  try {
    // 简化查询，直接随机取count个
    const result = await db.collection('images')
      .where({ categoryId })
      .limit(count * 2)  // 获取更多以避免空结果
      .get();

    if (result.data.length === 0) return [];

    // 随机选择count个
    const shuffled = [...result.data].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(item => item.fileID);
  } catch (error) {
    console.error('Failed to get random images:', error);
    return [];
  }
};

// Get default safe text
const getDefaultText = () => {
  return "宝贝收到啦！质量非常好，与卖家描述的完全一致，真的很喜欢，完全超出期望值！👍";
};

// Main entry point - Fixed Version
exports.main = async (event, context) => {
  console.log('=== generateReview Function Started === 🚀🚀🚀');
  console.log('Received request:', { categoryId: event.categoryId, tags: event.tags, rating: event.rating });

  // Input validation
  if (!event.categoryId) {
    console.error('Validation failed: categoryId is required');
    return { success: false, errMsg: 'categoryId is required' };
  }
  if (!event.tags || !Array.isArray(event.tags) || event.tags.length === 0) {
    console.error('Validation failed: tags must be a non-empty array');
    return { success: false, errMsg: 'tags must be a non-empty array' };
  }

  const { categoryId, tags, rating } = event;
  let reviewText;
  let imageList;
  let result;

  try {
    console.log('Starting review generation...');
    // Step 1: Generate AI review text
    const ratingText = rating === 5 ? '非常满意' :
                       rating === 4 ? '比较满意' :
                       rating === 3 ? '一般' :
                       rating === 2 ? '不太满意' : '非常不满意';

    const prompt = `你是一个电商买家，根据以下标签：${tags.join('、')}，商品评分：${rating}分（${ratingText}），写一段60字左右的中文评价，语气自然，多使用Emoji，体现真实购物体验。`;

    try {
      console.log('Calling DeepSeek API...');
      reviewText = await callDeepSeekAPI(prompt);
      console.log('DeepSeek API response:', reviewText);
    } catch (apiError) {
      console.error('DeepSeek API call failed:', apiError);
      reviewText = getDefaultText();
      console.log('Using default text:', reviewText);
    }

    // Step 2: Check content safety
    console.log('Checking content safety...');
    const isSafe = await checkContentSafety(reviewText);
    if (!isSafe) {
      console.warn('Generated text failed safety check, using default');
      reviewText = getDefaultText();
    }
    console.log('Final review text:', reviewText);

    // Step 3: Get random images
    console.log('Getting random images...');
    imageList = await getRandomImages(categoryId, 3);
    console.log('Images found:', imageList);

    // Step 4: Build result object
    result = {
      success: true,
      data: {
        text: reviewText,
        imgList: imageList
      }
    };

    console.log('Built result object:', result);

  } catch (error) {
    console.error('generateReview error:', error);
    result = {
      success: false,
      errMsg: error.message || 'Internal server error'
    };
    console.log('Error result:', result);
  }

  // Final logging before return
  console.log('=== Final About to Return ===');
  console.log('Returning result:', JSON.stringify(result, null, 2));
  return result;
};