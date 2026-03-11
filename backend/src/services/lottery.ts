import { PrizeModel, Prize } from '../database/models/Prize';
import { UserModel, User } from '../database/models/User';
import { LotteryCodeModel } from '../database/models/LotteryCode';
import { LotteryRecordModel } from '../database/models/LotteryRecord';
import { CacheService } from './cache';

export interface LotteryResult {
  prize: Prize | null;
  code?: string;
  message?: string;
}

export interface LotteryPrize {
  id: number;
  name: string;
  description?: string;
  probability: number;
  stock: number;
  image_url?: string;
}

export class LotteryService {
  // 每日抽奖限制
  private static readonly DAILY_LIMIT = 3;

  /**
   * 检查用户是否可以抽奖
   */
  static async canDraw(userId: number): Promise<{ canDraw: boolean; remaining: number; message?: string }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 检查今日抽奖次数
    const count = await LotteryRecordModel.countByUserIdAndDate(userId, today, tomorrow);
    const remaining = Math.max(0, this.DAILY_LIMIT - count);

    if (remaining <= 0) {
      return {
        canDraw: false,
        remaining,
        message: `今日抽奖次数已用完，明日请重试`
      };
    }

    return { canDraw: true, remaining };
  }

  /**
   * 执行抽奖（支持多租户）
   * @param userId 用户ID
   * @param merchantId 商家ID（必需，用于多租户隔离）
   */
  static async draw(userId: number, merchantId: number): Promise<LotteryResult> {
    try {
      // 检查是否可以抽奖
      const checkResult = await this.canDraw(userId);
      if (!checkResult.canDraw) {
        return {
          prize: null,
          message: checkResult.message || '今日抽奖次数已用完'
        };
      }

      // 获取指定商家的有库存的奖品
      const prizes = await PrizeModel.findByMerchantWithStock(merchantId);

      if (prizes.length === 0) {
        return {
          prize: null,
          message: '奖品已全部发放完毕，请稍后重试'
        };
      }

      // 计算中奖概率
      const totalProbability = prizes.reduce((sum, prize) => sum + prize.probability, 0);

      if (totalProbability <= 0) {
        return {
          prize: null,
          message: '抽奖系统配置错误，请联系管理员'
        };
      }

      // 随机选择奖品
      const random = Math.random() * totalProbability;
      let accumulated = 0;

      for (const prize of prizes) {
        accumulated += prize.probability;

        if (random <= accumulated && prize.stock > 0) {
          // 中奖了，减少库存
          await PrizeModel.decrementStock(prize.id!);

          // 生成兑换码
          const code = await this.generateCode();

          // 创建兑换码记录
          await LotteryCodeModel.create({
            code,
            prize_id: prize.id!,
            status: 0,
            user_id: userId
          });

          // 创建抽奖记录
          await LotteryRecordModel.create({
            user_id: userId,
            prize_id: prize.id!,
            prize_name: prize.name,
            reward_code: code,
            is_claimed: false
          });

          return {
            prize,
            code,
            message: '恭喜中奖！'
          };
        }
      }

      // 未中奖
      return {
        prize: null,
        message: '很遗憾，未中奖，请再接再厉'
      };

    } catch (error) {
      console.error('抽奖失败:', error);
      return {
        prize: null,
        message: '抽奖系统异常，请稍后重试'
      };
    }
  }

  /**
   * 生成唯一兑换码
   */
  static async generateCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;

    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (await LotteryCodeModel.findByCode(code));

    return code;
  }

  /**
   * 获取用户奖品列表
   */
  static async getUserPrizes(userId: number, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [records, total] = await Promise.all([
      LotteryRecordModel.findByUserId(userId, offset, limit),
      LotteryRecordModel.countByUserId(userId)
    ]);

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 核销奖品
   */
  static async claimPrize(userId: number, code: string): Promise<{ success: boolean; message?: string }> {
    try {
      const lotteryCode = await LotteryCodeModel.findByCode(code);

      if (!lotteryCode) {
        return { success: false, message: '无效的兑换码' };
      }

      if (lotteryCode.status === 1) {
        return { success: false, message: '该兑换码已被使用' };
      }

      if (lotteryCode.user_id !== userId) {
        return { success: false, message: '兑换码不属于当前用户' };
      }

      await Promise.all([
        LotteryCodeModel.updateStatus(code, 1),
        LotteryRecordModel.updateClaimed(code)
      ]);

      return { success: true };
    } catch (error) {
      console.error('核销奖品失败:', error);
      return { success: false, message: '核销失败，请重试' };
    }
  }

  /**
   * 获取奖品列表（支持多租户）
   * @param merchantId 商家ID（可选，如果提供则按商家过滤）
   */
  static async getPrizes(merchantId?: number): Promise<LotteryPrize[]> {
    const prizes = merchantId
      ? await PrizeModel.findByMerchant(merchantId)
      : await PrizeModel.findAll();

    return prizes.map(prize => ({
      id: prize.id!,
      name: prize.name,
      description: prize.description,
      probability: prize.probability,
      stock: prize.stock,
      image_url: prize.image_url
    }));
  }

  /**
   * 更新奖品配置
   */
  static async updatePrize(prizeId: number, updates: Partial<Prize>): Promise<boolean> {
    try {
      await PrizeModel.update(prizeId, updates);
      return true;
    } catch (error) {
      console.error('更新奖品失败:', error);
      return false;
    }
  }
}