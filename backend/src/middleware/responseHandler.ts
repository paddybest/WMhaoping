import { Request, Response, NextFunction } from 'express';

// 统一的 API 响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 错误处理中间件
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  // 生产环境：不暴露内部错误信息
  const isDevelopment = process.env.NODE_ENV === 'development';

  const errorResponse: ApiResponse = {
    success: false,
    error: isDevelopment ? err.message : 'Internal server error'
  };

  res.status(500).json(errorResponse);
};

// 404 处理中间件
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path
  });
};

// 成功响应辅助函数
export const successResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  ...(message && { message })
});

// 错误响应辅助函数
export const errorResponse = (error: string): ApiResponse => ({
  success: false,
  error
});
