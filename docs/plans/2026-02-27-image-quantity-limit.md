# 图片数量限制功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 设置数量关系限制：1.商家端每个商品必须上传2个商品图片 2.用户至少选择一个商品类目 3.评价页面展示用户选择的商品对应的2张商品图片

**Architecture:** 修改后端验证逻辑和前端展示逻辑，确保图片数量始终为2张

**Tech Stack:** TypeScript (Backend), JavaScript/WeChat Miniprogram (Frontend)

---

## Task 1: 商家端上传图片验证 - 最少2张

**Files:**
- Modify: `backend/src/controllers/productImage.ts:30-35`
- Modify: `backend/src/database/models/ProductItem.ts` (添加验证方法)

**Step 1: 修改上传验证逻辑**

```typescript
// backend/src/controllers/productImage.ts:30-35
// 原代码
const imageCount = await ProductImageModel.countByProduct(productId);
if (imageCount >= 9) {
  res.status(400).json({ error: 'Maximum 9 images allowed per product' });
  return;
}

// 新代码：要求至少2张图片
const imageCount = await ProductImageModel.countByProduct(productId);
if (imageCount >= 9) {
  res.status(400).json({ error: 'Maximum 9 images allowed per product' });
  return;
}
if (imageCount < 2) {
  res.status(400).json({ error: 'Please upload at least 2 images for this product' });
  return;
}
```

**Step 2: 修改商品创建/激活验证**

在 ProductItem 创建或激活时检查是否有至少2张图片

```typescript
// backend/src/controllers/productItem.ts
// 在 create 或 update 方法中添加验证
static async create(req, res) {
  // ... 现有代码 ...

  // 验证商品至少上传了2张图片
  const imageCount = await ProductImageModel.countByProduct(productId);
  if (imageCount < 2) {
    res.status(400).json({ error: 'Each product must have at least 2 images' });
    return;
  }
}
```

**Step 3: 测试验证**

启动后端，尝试上传1张图片，应该返回错误

---

## Task 2: AI服务返回2张图片

**Files:**
- Modify: `backend/src/services/ai.ts:140-180`

**Step 1: 修改返回图片数量从4张改为2张**

```typescript
// backend/src/services/ai.ts:140-180

// 原代码：4张
let productUrls = shuffled.slice(0, 4).map(img => img.imageUrl);

// 新代码：2张
let productUrls = shuffled.slice(0, 2).map(img => img.imageUrl);

// 原代码
if (productUrls.length >= 4) {
  return { urls: productUrls, source: 'product' };
}
const aiUrls = await this.getRandomImageUrls(`product_${productId}`);
const combinedUrls = [...productUrls, ...aiUrls.slice(0, 4 - productUrls.length)];

// 新代码
if (productUrls.length >= 2) {
  return { urls: productUrls, source: 'product' };
}
const aiUrls = await this.getRandomImageUrls(`product_${productId}`);
const combinedUrls = [...productUrls, ...aiUrls.slice(0, 2 - productUrls.length)];
```

**Step 2: 修改 getRandomImageUrls 也返回2张**

```typescript
// backend/src/services/ai.ts:112-123

// 原代码
for (let i = 0; i < 4; i++)

// 新代码
for (let i = 0; i < 2; i++)
```

**Step 3: 修改 getFallbackReview 也返回2张**

```typescript
// backend/src/services/ai.ts:199-209

// 原代码：4张
const fallbackImages = [
  'https://picsum.photos/seed/fb1/400/600',
  'https://picsum.photos/seed/fb2/400/600',
  'https://picsum.photos/seed/fb3/400/600',
  'https://picsum.photos/seed/fb4/400/600'
];

// 新代码：2张
const fallbackImages = [
  'https://picsum.photos/seed/fb1/400/600',
  'https://picsum.photos/seed/fb2/400/600'
];
```

---

## Task 3: 用户端验证 - 至少选择1个商品

**Files:**
- Modify: `yonghuduan/miniprogram/pages/index/index.js`

**Step 1: 检查生成评价时的商品选择验证**

在用户点击生成评价时，检查是否选择了商品

```javascript
// yonghuduan/miniprogram/pages/index/index.js

// 在 generateReview 函数中添加验证
generateReview: function() {
  // 检查是否选择了商品
  if (!this.data.selectedProduct) {
    wx.showToast({
      title: '请先选择商品',
      icon: 'none'
    });
    return;
  }

  // ... 现有代码 ...
}
```

---

## Task 4: 编译测试

**Step 1: 编译后端**

```bash
cd backend && npx tsc
```

**Step 2: 验证修改**

检查生成的 dist/services/ai.js 中图片数量为2

---

## 数量关系总结

| 场景 | 数量 |
|------|------|
| 商家上传 | 至少2张（上限9张） |
| AI处理/补充 | 始终2张 |
| 评价展示 | 2张 |

---

## 验证流程

```
商家端:
  创建商品 → 上传图片(≥2) → 验证通过

用户端:
  扫描二维码 → 选择类目 → 选择商品(必需) → 生成评价

评价展示:
  读取商品图片 → AI重绘(2张) → 展示2张图片
```
