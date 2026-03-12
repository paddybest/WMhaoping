"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const axios_1 = __importDefault(require("axios"));
const cache_1 = require("./cache");
class AIService {
    static async generateReview(request) {
        const cacheKey = `review:${request.userId}:${request.productName}:${JSON.stringify(request.tags)}:${request.rating}`;
        const cached = await cache_1.CacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        try {
            const prompt = this.buildPrompt(request);
            const response = await axios_1.default.post(this.API_URL, {
                model: this.MODEL,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的商品评价助手，擅长生成真实、感人的商品评价。评价应该包含具体的个人体验，使用口语化的表达方式，让其他消费者信服。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer sk-b13ad9fdb7b04ef9ba3c5b5b19c416cb`
                }
            });
            const content = response.data.choices[0].message.content;
            const imageUrl = await this.getRandomImageUrl(request.productName);
            const result = {
                content,
                imageUrl
            };
            await cache_1.CacheService.set(cacheKey, result, 3600);
            return result;
        }
        catch (error) {
            console.error('AI generate review error:', error);
            return this.getFallbackReview(request);
        }
    }
    static buildPrompt(request) {
        return `请为"${request.productName}"生成一个真实感人的商品评价。

要求：
1. 评分：${request.rating}星
2. 标签：${request.tags.join('、')}
3. 内容要包含具体的使用感受和个人体验
4. 语言要口语化，真实自然
5. 避免使用过于夸张的词语
6. 字数控制在200-300字

请生成一个完整的评价：`;
    }
    static async getRandomImageUrl(category) {
        const categoryMap = {
            '女装': 'female-clothes',
            '男装': 'male-clothes',
            '数码': 'digital',
            '美妆': 'beauty'
        };
        const categoryFolder = categoryMap[category] || 'general';
        return `https://your-oss-bucket.oss-cn-hangzhou.aliyuncs.com/${categoryFolder}/random.jpg`;
    }
    static getFallbackReview(request) {
        const templates = [
            `这款${request.productName}真的很不错！${request.tags[0]}的设计让我很喜欢，用了一段时间感觉${request.tags[1]}，整体来说很满意，值得推荐！`,
            `购买${request.productName}已经有一段时间了，确实如宣传的那样${request.tags[0]}。${request.tags[1]}的特点很突出，性价比很高！`,
            `被${request.productName}的${request.tags.join('、')}所吸引，使用体验超出预期。${request.rating}星的推荐，大家放心购买！`
        ];
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        return {
            content: randomTemplate,
            imageUrl: 'https://your-oss-bucket.oss-cn-hangzhou.aliyuncs.com/fallback/default.jpg'
        };
    }
}
exports.AIService = AIService;
AIService.API_URL = 'https://api.deepseek.com/v1/chat/completions';
AIService.MODEL = 'deepseek-chat';
//# sourceMappingURL=ai.js.map