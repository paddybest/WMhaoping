import axios from 'axios';
import { CacheService } from './cache';
import { WanxiangService } from './wanxiang';

export interface ReviewRequest {
  productId?: number;
  productName: string;
  tags: string[];
  rating: number;
  userId: number;
  requestId?: string;  // 用于避免缓存和增加多样性
}

export interface ReviewResponse {
  content: string;
  imageUrls: string[];
  imageSource?: 'product' | 'ai';  // 图片来源标识
}

export class AIService {
  private static readonly API_URL = 'https://api.deepseek.com/v1/chat/completions';
  private static readonly MODEL = 'deepseek-chat';

  static async generateReview(request: ReviewRequest): Promise<ReviewResponse> {
    // 如果有 requestId，不使用缓存，确保每次生成不同的内容
    const cacheKey = request.requestId
      ? `review:${request.requestId}`
      : `review:${request.userId}:${request.productName}:${JSON.stringify(request.tags)}:${request.rating}`;

    // 只有在没有 requestId 时才使用缓存
    const cached = !request.requestId ? await CacheService.get(cacheKey) : null;
    if (cached) {
      return cached;
    }

    try {
      const prompt = this.buildPrompt(request);

      // 如果有 requestId，使用更高的 temperature 增加多样性
      const temperature = request.requestId ? 0.9 : 0.7;

      const response = await axios.post(
        this.API_URL,
        {
          model: this.MODEL,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的商品评价助手，擅长生成真实、感人的商品评价。评价应该包含具体的个人体验，使用口语化的表达方式，让其他消费者信服。每次生成的内容要有变化，不要雷同。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature,
          max_tokens: 500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer sk-b13ad9fdb7b04ef9ba3c5b5b19c416cb`
          }
        }
      );

      const content = response.data.choices[0].message.content;

      // 如果有productId，优先使用商家上传的商品图片
      let imageUrls: string[];
      let imageSource: 'product' | 'ai' = 'ai';

      if (request.productId) {
        const productImages = await this.getProductImages(request.productId, request.productName, request.requestId);
        if (productImages.urls.length > 0) {
          imageUrls = productImages.urls;
          imageSource = productImages.source;
        } else {
          // 没有商品图片，使用AI图片
          imageUrls = await this.getRandomImageUrls(request.productName, request.requestId);
        }
      } else {
        imageUrls = await this.getRandomImageUrls(request.productName, request.requestId);
      }

      const result: ReviewResponse = {
        content,
        imageUrls,
        imageSource
      };

      // 缓存结果
      await CacheService.set(cacheKey, result, 3600); // 1小时缓存

      return result;
    } catch (error) {
      console.error('AI generate review error:', error);
      // 返回默认评价作为降级方案
      return this.getFallbackReview(request);
    }
  }

  public static buildPrompt(request: ReviewRequest): string {
    const ratingText = request.rating === 5 ? '非常满意' : request.rating === 4 ? '满意' : request.rating === 3 ? '一般' : request.rating === 2 ? '不太满意' : '不满意';

    // 根据标签数量调整字数要求
    const tagCount = request.tags.length;
    let wordCountRequirement: string;
    if (tagCount === 1) {
      wordCountRequirement = '字数控制在40-60字之间，简短精炼';
    } else {
      wordCountRequirement = '字数控制在80-100字之间，适中即可';
    }

    return `请为"${request.productName}"生成一个真实自然的商品评价。

要求：
1. 评分：${request.rating}星（${ratingText}）
2. 标签：${request.tags.join('、')}
3. 内容要口语化，像真实买家写的评价
4. ${wordCountRequirement}
5. 可以提到商品的实际使用感受
6. 结尾可以加一句简短的推荐语

请直接生成评价内容，不要有其他说明文字：`;
  }

  private static async getRandomImageUrls(category: string, requestId?: string): Promise<string[]> {
    // 如果有 requestId，使用它生成不同的随机种子，确保每次生成不同的图片
    let seed: number;
    if (requestId) {
      seed = requestId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    } else {
      // 使用固定的随机种子确保每次生成相同商品的图片是一致的
      seed = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    }

    const imageUrls: string[] = [];

    for (let i = 0; i < 2; i++) {
      // 使用种子生成一致的随机图片
      const imageId = (seed + i * 100) % 1000 + 1;
      imageUrls.push(`https://picsum.photos/seed/${imageId}/400/600`);
    }

    return imageUrls;
  }

  /**
   * 根据商品ID获取商家上传的商品图片
   * 如果图片数量不足4张，则补充AI随机图片
   * 如果启用了万相AI，会对商品图片进行AI重绘处理
   */
  private static async getProductImages(productId: number, productName?: string, requestId?: string): Promise<{ urls: string[]; source: 'product' | 'ai' }> {
    try {
      // 动态导入避免循环依赖
      const { ProductImageModel } = await import('../database/models/ProductImage');
      const images = await ProductImageModel.findByProduct(productId);

      if (images && images.length > 0) {
        // 使用 requestId 作为随机种子，让每次打乱顺序不同
        const shuffleSeed = requestId
          ? requestId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
          : 0;
        const shuffled = [...images].sort(() => {
          // 简单的伪随机排序
          shuffleSeed ? (shuffleSeed * 9301 + 49297) % 233280 / 233280 - 0.5 : Math.random() - 0.5;
          return Math.random() - 0.5;
        });
        // 取2张图片（如果不足2张，用AI图片补充）
        let productUrls = shuffled.slice(0, 2).map(img => img.imageUrl);

        // 如果启用了万相AI，对商品图片进行重绘
        if (WanxiangService.isEnabled() && productUrls.length > 0) {
          console.log('[AI Service] 启用万相AI图像重绘...');
          const productNameForPrompt = productName || `商品${productId}`;

          // 并发处理（每批2张，避免API速率限制）
          const batchSize = 2;
          const startTime = Date.now();
          const processedUrls: string[] = [];

          for (let i = 0; i < productUrls.length; i += batchSize) {
            const batch = productUrls.slice(i, i + batchSize);
            const batchResults = await Promise.all(
              batch.map(url => WanxiangService.processProductImage(url, productNameForPrompt))
            );
            processedUrls.push(...batchResults);

            // 每批之间稍作延迟，避免速率限制
            if (i + batchSize < productUrls.length) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          productUrls = processedUrls;
          console.log(`[AI Service] 万相AI图像重绘完成 (${duration}秒)`);
        }

        if (productUrls.length >= 2) {
          return { urls: productUrls, source: 'product' };
        }

        // 不足2张，补充AI图片
        const aiUrls = await this.getRandomImageUrls(`product_${productId}`, requestId);
        const combinedUrls = [...productUrls, ...aiUrls.slice(0, 2 - productUrls.length)];

        return { urls: combinedUrls, source: 'product' };
      }

      // 没有商品图片，返回空数组，后续会用AI图片补充
      return { urls: [], source: 'product' };
    } catch (error) {
      console.error('获取商品图片失败:', error);
      return { urls: [], source: 'product' };
    }
  }

  public static getFallbackReview(request: ReviewRequest): ReviewResponse {
    const templates = [
      `这款${request.productName}真的很不错！${request.tags[0]}的设计让我很喜欢，用了一段时间感觉${request.tags[1]}，整体来说很满意，值得推荐！`,
      `购买${request.productName}已经有一段时间了，确实如宣传的那样${request.tags[0]}。${request.tags[1]}的特点很突出，性价比很高！`,
      `被${request.productName}的${request.tags.join('、')}所吸引，使用体验超出预期。${request.rating}星的推荐，大家放心购买！`
    ];

    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

    // 返回2张默认图片
    const fallbackImages = [
      'https://picsum.photos/seed/fb1/400/600',
      'https://picsum.photos/seed/fb2/400/600'
    ];

    return {
      content: randomTemplate,
      imageUrls: fallbackImages,
      imageSource: 'ai'
    };
  }

  /**
   * 为商品生成6个标签
   */
  static async generateTags(productName: string, categoryName: string = ''): Promise<string[]> {
    const cacheKey = `tags:${productName}:${categoryName}`;

    // 检查缓存
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = this.buildTagsPrompt(productName, categoryName);

      const response = await axios.post(
        this.API_URL,
        {
          model: this.MODEL,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的商品营销助手，擅长为商品生成精准的标签。标签应该简洁、有吸引力，能准确描述商品特点。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 200
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer sk-b13ad9fdb7b04ef9ba3c5b5b19c416cb`
          }
        }
      );

      const content = response.data.choices[0].message.content;

      // 解析AI返回的标签
      let tags = this.parseTags(content);

      // 确保返回6个标签
      tags = this.ensureSixTags(tags);

      // 缓存结果（24小时）
      await CacheService.set(cacheKey, tags, 86400);

      return tags;
    } catch (error) {
      console.error('AI generate tags error:', error);
      // 返回默认标签作为降级方案
      return this.getFallbackTags();
    }
  }

  private static buildTagsPrompt(productName: string, categoryName: string): string {
    const categoryContext = categoryName ? `商品分类：${categoryName}` : '';
    return `请为"${productName}"生成6个商品标签。

${categoryContext}

要求：
1. 每个标签2-4个汉字
2. 标签要能准确描述商品特点（品质、性价比、外观、功能等）
3. 标签之间不要重复
4. 语言简洁有力，有吸引力

请直接返回6个标签，用逗号分隔，不要有其他内容。例如：优质面料, 做工精细, 性价比高, 款式时尚, 穿着舒适, 值得推荐`;
  }

  private static parseTags(content: string): string[] {
    // 尝试解析JSON数组
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const tags = JSON.parse(jsonMatch[0]);
        if (Array.isArray(tags)) {
          return tags.map((t: string) => t.trim()).filter((t: string) => t.length > 0);
        }
      }
    } catch (e) {
      // JSON解析失败，继续用其他方式解析
    }

    // 尝试按逗号分隔
    const tags = content.split(/[,，、\n]/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0 && tag.length <= 6);

    return tags;
  }

  private static ensureSixTags(tags: string[]): string[] {
    const defaultTags = ['优质', '实惠', '耐用', '美观', '实用', '推荐'];

    // 如果解析不到标签，返回默认标签
    if (tags.length === 0) {
      return defaultTags;
    }

    // 填充不足6个的标签
    while (tags.length < 6) {
      const defaultTag = defaultTags[tags.length % defaultTags.length];
      if (!tags.includes(defaultTag)) {
        tags.push(defaultTag);
      } else {
        tags.push(`标签${tags.length + 1}`);
      }
    }

    // 截断多余的标签
    return tags.slice(0, 6);
  }

  private static getFallbackTags(): string[] {
    return ['优质', '实惠', '耐用', '美观', '实用', '推荐'];
  }
}