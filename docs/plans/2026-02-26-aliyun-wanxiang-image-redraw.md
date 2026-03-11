# 阿里云万相图像重绘功能实现计划

## 背景
当前 Phase 1 已实现：商家上传的商品图片直接用于评价页面。

当前实现 (`backend/src/services/ai.ts`):
- `getProductImages()` 方法从数据库获取商家商品图片
- 图片直接返回给前端显示

## 目标
使用阿里云万相 (Wanxiang) AI 服务对商家商品图片进行智能重绘，使图片更符合评价场景需要。

## 方案概述

### 图像传递方式
- **Base64 编码**：将商品图片转换为 Base64 字符串传递给 AI 服务
- 流程：商家图片 → Base64 编码 → 发送给万相 API → 接收重绘结果 → 返回给前端

### 万相 API 选择
推荐使用阿里云百炼平台的 **通义万相** (Wanxiang) API：
- API 名称：`wanxiang-v1` (图像生成与编辑)
- 核心能力：图像风格迁移、图像增强、背景替换等

## 实现步骤

### 阶段一：基础配置 (Task 1-2)

#### Task 1: 添加环境变量配置
**文件**: `backend/.env.example`, `backend/.env`

需要配置：
```env
# 阿里云万相 API 配置
DASHSCOPE_API_KEY=your-dashscope-api-key
WANXIANG_ENABLED=true
WANXIANG_BASE_URL=https://dashscope.aliyuncs.com/api/v1
```

#### Task 2: 创建万相服务模块
**文件**: `backend/src/services/wanxiang.ts`

新建服务模块，包含：
- `processImage()` - 主处理方法
- `imageToBase64()` - 图片转 Base64
- `fetchImageAsBase64()` - 从 URL 获取图片并转为 Base64
- `uploadResultImage()` - 上传处理结果到 OSS

### 阶段二：图像重绘核心逻辑 (Task 3-4)

#### Task 3: 实现图像重绘功能
**文件**: `backend/src/services/wanxiang.ts`

核心功能：
1. **图片获取**：从商品图片 URL 下载并转为 Base64
2. **API 调用**：调用万相图像编辑 API
3. **Prompt 构建**：根据评价场景构建重绘指令
   - 示例指令："将图片处理为电商评价场景，保持商品主体，可优化光照和背景"
4. **结果处理**：接收 Base64 返回，转换为可访问 URL

#### Task 4: 集成到 AI 服务
**文件**: `backend/src/services/ai.ts`

修改 `getProductImages()` 方法：
- 优先使用商家商品图片
- 对商品图片进行 AI 重绘处理
- 返回重绘后的图片 URL

### 阶段三：前端展示与配置 (Task 5-6)

#### Task 5: 添加前端控制选项
**文件**: `shangjiaduan/pages/ProductManagement.tsx` 或新建设置页面

添加商家配置项：
- 是否启用 AI 图像重绘
- 重绘风格选择（可选）

#### Task 6: 结果展示
**文件**: `yonghuduan/miniprogram/pages/result/index.js`

在评价结果页面展示重绘后的图片

## 技术细节

### 1. Base64 编码处理
```typescript
// 从 URL 获取图片并转为 Base64
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const base64 = Buffer.from(response.data).toString('base64');
  const mimeType = response.headers['content-type'] || 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}
```

### 2. 万相 API 调用
```typescript
// 调用通义万相图像编辑 API
async function processImageWithWanxiang(base64Image: string, prompt: string): Promise<string> {
  const response = await axios.post(
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation',
    {
      model: 'wanxiang-v1',
      input: {
        image_base64: base64Image,
        prompt: prompt
      },
      parameters: {
        size: '1024x1024',
        style: 'realistic'
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.output.results[0].image_base64;
}
```

### 3. 处理流程图
```
商家商品图片
    ↓
下载图片 → Base64 编码
    ↓
调用万相 API (传递 Base64 + 场景指令)
    ↓
接收重绘结果 (Base64)
    ↓
上传到 OSS 获取可访问 URL
    ↓
返回图片 URL 给前端
```

## 配置管理

### 商家级别配置
在数据库添加配置表或在现有设置中扩展：
- `enable_ai_image`: 是否启用 AI 重绘 (boolean)
- `image_style`: 重绘风格 (string): 'auto' | 'bright' | 'warm' | 'professional'

## 错误处理与降级

### 降级策略
1. **API 调用失败**：回退到原始商家图片
2. **图片转换失败**：使用原始图片
3. **超时处理**：5秒超时后返回原图
4. **配额限制**：记录日志，使用原图

### 日志记录
- 记录每次 AI 重绘请求
- 记录重绘耗时
- 记录成功/失败状态

## 测试计划

### 单元测试
- Base64 编码/解码
- API 调用模拟

### 集成测试
- 端到端图像重绘流程
- 降级策略验证

## 预计工作量
- Task 1-2: 0.5 天
- Task 3-4: 1.5 天
- Task 5-6: 0.5 天
- 测试与调试: 0.5 天

**总计**: 约 3 天

## 风险与注意事项

1. **API 成本**：万相 API 按调用次数收费，需要设置每日/每月限额
2. **处理时间**：图像重绘需要 2-5 秒，需要显示加载状态
3. **图片大小**：Base64 编码会增加数据量，需控制输入图片大小 (< 5MB)
4. **并发限制**：需要控制同时处理的请求数量
