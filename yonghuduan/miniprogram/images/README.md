# 小程序图片资源说明

## 错误图标 (error-icon.png)

**位置**: `yonghuduan/miniprogram/images/error-icon.png`
**尺寸**: 200x200 像素
**格式**: PNG (带透明背景)
**用途**: 错误页面显示

### 设计要求

1. **颜色方案**:
   - 主色: #FF6B6B (红色)
   - 辅色: #FFE3E3 (浅红色背景)

2. **图标元素**:
   - 叹号图标 (⚠️ 或 ❗)
   - 圆形背景
   - 简洁、现代的设计

3. **生成方式**:
   - 使用在线工具: https://www.flaticon.com/
   - 搜索关键词: "error", "warning", "alert"
   - 下载PNG格式，大小200x200
   - 确保背景透明

### 临时替代方案

在正式图标准备好之前，可以使用以下方式：

1. **使用文本符号**:
   修改 `error.wxml`:
   ```xml
   <view class="error-icon-wrapper">
     <text class="error-icon-text">⚠️</text>
   </view>
   ```

   修改 `error.wxss`:
   ```css
   .error-icon-text {
     font-size: 120rpx;
   }
   ```

2. **使用纯CSS绘制**:
   ```xml
   <view class="error-icon-wrapper">
     <view class="error-icon-css">
       <view class="error-circle"></view>
       <view class="error-line"></view>
     </view>
   </view>
   ```

### 图标资源推荐网站

- Flaticon: https://www.flaticon.com/
- Iconfont: https://www.iconfont.cn/
- Font Awesome: https://fontawesome.com/

## 其他需要的图标

1. **客服图标** - customer-service-icon.png
2. **奖品图标** - prize-icon.png
3. **成功图标** - success-icon.png
4. **加载动画** - loading.gif

---

**注意**: 请确保所有图片资源都经过压缩优化，以减小小程序包体积。
