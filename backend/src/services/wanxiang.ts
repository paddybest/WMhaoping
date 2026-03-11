import axios from 'axios';
import { randomUUID } from 'crypto';

// OSS 客户端（延迟初始化）
let ossClient: any = null;

const getOssClient = () => {
  if (!ossClient) {
    try {
      const OSS = require('ali-oss');
      ossClient = new OSS({
        region: process.env.OSS_REGION || 'oss-cn-hangzhou',
        accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
        bucket: process.env.OSS_BUCKET || 'haopingbao-images'
      });
    } catch (error) {
      console.error('[Wanxiang] OSS 客户端初始化失败:', error);
      return null;
    }
  }
  return ossClient;
};

export interface WanxiangConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
}

export interface ImageProcessOptions {
  style?: 'auto' | 'bright' | 'warm' | 'professional' | 'natural';
  prompt?: string;
}

export class WanxiangService {
  private static config: WanxiangConfig = {
    enabled: process.env.WANXIANG_ENABLED === 'true',
    apiKey: process.env.DASHSCOPE_API_KEY || '',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1'
  };

  /**
   * 初始化配置
   */
  static init(): void {
    this.config = {
      enabled: process.env.WANXIANG_ENABLED === 'true',
      apiKey: process.env.DASHSCOPE_API_KEY || '',
      baseUrl: 'https://dashscope.aliyuncs.com/api/v1'
    };
    console.log('[Wanxiang] Service initialized:', {
      enabled: this.config.enabled,
      baseUrl: this.config.baseUrl
    });
  }

  /**
   * 检查是否启用
   */
  static isEnabled(): boolean {
    return this.config.enabled && !!this.config.apiKey;
  }

  /**
   * 处理商品图片（AI图像编辑）
   * @param imageUrl 原始商品图片URL
   * @param productName 商品名称
   * @param options 处理选项
   * @returns 处理后的图片URL，失败返回原图
   */
  static async processProductImage(
    imageUrl: string,
    productName: string,
    options: ImageProcessOptions = {}
  ): Promise<string> {
    // 如果未启用万相，直接返回原图
    if (!this.isEnabled()) {
      console.log('[Wanxiang] 未启用，返回原图');
      return imageUrl;
    }

    try {
      console.log('[Wanxiang] 开始处理图片:', imageUrl);

      // 1. 获取图片并转为 Base64
      const base64Image = await this.fetchImageAsBase64(imageUrl);
      console.log('[Wanxiang] 图片 Base64 编码完成，长度:', base64Image.length);

      // 2. 构建编辑指令
      const prompt = this.buildEditPrompt(productName, options);

      // 3. 调用千问图像编辑 API
      const resultUrl = await this.callQwenImageEditAPI(base64Image, prompt);

      if (!resultUrl) {
        console.log('[Wanxiang] API 返回为空，使用原图');
        return imageUrl;
      }

      // 4. 直接返回万相的临时URL（不上传到自己OSS，省去bucket配置）
      // 注意：临时URL有有效期，但一般够用几天
      console.log('[Wanxiang] 图片处理完成，返回临时URL:', resultUrl);
      return resultUrl;
    } catch (error) {
      console.error('[Wanxiang] 图片处理失败:', error);
      // 降级：返回原始图片
      return imageUrl;
    }
  }

  /**
   * 批量处理商品图片
   */
  static async processProductImages(
    imageUrls: string[],
    productName: string,
    options: ImageProcessOptions = {}
  ): Promise<string[]> {
    // 如果未启用，直接返回原图数组
    if (!this.isEnabled()) {
      return imageUrls;
    }

    const results: string[] = [];

    for (const url of imageUrls) {
      const processedUrl = await this.processProductImage(url, productName, options);
      results.push(processedUrl);
    }

    return results;
  }

  /**
   * 从 URL 获取图片并转为 Base64
   */
  private static async fetchImageAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const buffer = Buffer.from(response.data);
      const base64 = buffer.toString('base64');

      // 检测 MIME 类型
      let mimeType = 'image/jpeg';
      if (response.headers['content-type']) {
        mimeType = response.headers['content-type'];
      } else {
        // 根据文件头检测
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
          mimeType = 'image/png';
        } else if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
          mimeType = 'image/jpeg';
        }
      }

      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('[Wanxiang] 获取图片失败:', error);
      throw new Error('Failed to fetch image');
    }
  }

  /**
   * 构建图像编辑指令
   */
  private static buildEditPrompt(productName: string, options: ImageProcessOptions): string {
    const styleInstructions: Record<string, string> = {
      auto: '优化图片使其更适合电商评价展示，保持商品主体不变',
      bright: '使图片更加明亮清晰，提升视觉效果',
      warm: '添加温暖色调，营造温馨氛围',
      professional: '处理为专业电商展示效果，干净整洁',
      natural: '保持自然真实，还原商品本来面貌'
    };

    const style = options.style || 'auto';
    const styleInstruction = styleInstructions[style] || styleInstructions.auto;
    const customPrompt = options.prompt || '';

    return `商品名称：${productName}。请根据以下要求处理这张图片：${styleInstruction}。${customPrompt}`;
  }

  /**
   * 调用万相 2.1 图像编辑 API
   * 使用 wanx2.1-imageedit 模型
   */
  private static async callQwenImageEditAPI(
    base64Image: string,
    prompt: string
  ): Promise<string | null> {
    // 使用万相 2.1 图像编辑 API
    const endpoint = '/services/aigc/image2image/image-synthesis';
    const url = `${this.config.baseUrl}${endpoint}`;

    console.log('[Wanxiang] 调用万相 2.1 图像编辑 API:', url);

    try {
      const response = await axios.post(
        url,
        {
          model: 'wanx2.1-imageedit',
          input: {
            function: 'stylization_all',
            prompt: prompt,
            base_image_url: base64Image
          },
          parameters: {
            n: 1
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable'  // 启用异步模式
          },
          timeout: 30000
        }
      );

      console.log('[Wanxiang] 提交响应:', JSON.stringify(response.data).substring(0, 500));

      // 检查是否是异步任务
      if (response.data?.output?.task_id) {
        const taskId = response.data.output.task_id;
        console.log('[Wanxiang] 异步任务ID:', taskId);

        // 轮询任务结果
        const resultUrl = await this.pollWanxiangTask(taskId);
        return resultUrl;
      }

      // 同步返回（如果支持）
      if (response.data?.output?.results?.[0]?.url) {
        return response.data.output.results[0].url;
      }

      return null;
    } catch (error: any) {
      console.error('[Wanxiang] API 调用失败:');
      if (error.response) {
        console.error('[Wanxiang] 响应状态:', error.response.status);
        console.error('[Wanxiang] 响应数据:', error.response.data);
      } else if (error.request) {
        console.error('[Wanxiang] 请求未收到响应');
      } else {
        console.error('[Wanxiang] 请求配置错误:', error.message);
      }
      return null;
    }
  }

  /**
   * 轮询万相异步任务结果
   */
  private static async pollWanxiangTask(taskId: string): Promise<string | null> {
    const maxAttempts = 20;
    const interval = 3000;

    console.log('[Wanxiang] 开始轮询任务结果...');

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(
          `${this.config.baseUrl}/tasks/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`
            }
          }
        );

        const output = response.data?.output;
        const taskStatus = output?.task_status;

        console.log(`[Wanxiang] 轮询 (${i + 1}/${maxAttempts}): 状态 = ${taskStatus}`);

        if (taskStatus === 'SUCCEEDED') {
          console.log('[Wanxiang] 任务成功!');
          if (output.results && output.results[0]?.url) {
            return output.results[0].url;
          }
          return null;
        } else if (taskStatus === 'FAILED') {
          console.error('[Wanxiang] 任务失败:', output.message);
          return null;
        }

        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.error('[Wanxiang] 轮询失败:', error);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    console.error('[Wanxiang] 轮询超时');
    return null;
  }

  /**
   * 下载图片并上传到我们的 OSS
   */
  private static async downloadAndUpload(imageUrl: string): Promise<string | null> {
    try {
      console.log('[Wanxiang] 下载图片:', imageUrl);

      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      const imageBuffer = Buffer.from(response.data);

      // 生成文件名
      const fileName = `ai-edited/${Date.now()}-${randomUUID().slice(0, 8)}.jpg`;

      const client = getOssClient();
      if (!client) {
        console.log('[Wanxiang] OSS未初始化，返回原始URL');
        return imageUrl;
      }

      // 上传到 OSS
      const result = await client.put(fileName, imageBuffer);

      console.log('[Wanxiang] 图片上传成功:', result.url);
      return result.url;
    } catch (error) {
      console.error('[Wanxiang] 下载/上传失败:', error);
      return null;
    }
  }
}

// 初始化服务
WanxiangService.init();
