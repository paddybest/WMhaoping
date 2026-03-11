# AI 评价助手 - 数据库与云存储配置指南

## 概述
本文档指导您完成 AI 评价助手小程序的数据库和云存储配置，包括创建集合、索引配置、权限设置以及示例数据导入。

## 前提条件
- 已安装微信开发者工具
- 项目已配置云开发环境 (env: cloud1-9gbrkqwy4f67587b)
- 项目已上传云开发

## 第一阶段：创建数据库集合

### 2. 创建 products 集合

**集合用途**: 存储商品类目配置信息

**字段定义**:
- `_id` (String): 自动生成ID
- `name` (String): 类目名称，如"女装"、"数码"
- `tags` (Array): 该类目可选标签数组
- `updateTime` (Date): 最后修改时间

**示例数据**:
```javascript
{
  "_id": "auto_generated",
  "name": "女装",
  "tags": [
    "面料舒适",
    "版型显瘦",
    "物流快",
    "包装精美",
    "性价比高",
    "款式时尚"
  ],
  "updateTime": new Date("2024-01-01")
}
```

**权限配置**:
- 所有用户: 只读
- 管理员: 可读写

### 3. 创建 images 集合

**集合用途**: 存储商品配图素材

**字段定义**:
- `_id` (String): 自动生成ID
- `fileID` (String): 云存储图片ID (cloud://...)
- `categoryId` (String): 关联 products 表的 _id

**示例数据**:
```javascript
{
  "_id": "auto_generated",
  "fileID": "cloud://cloud1-9gbrkqwy4f67587b-9gbrkqwy4f67587b.6765-cloud1-9gbrkqwy4f67587b/womens_clothing_1.png",
  "categoryId": "product_id_of_womens_clothing"
}
```

**索引配置**:
- 在 `categoryId` 字段上创建索引，用于快速查询

**权限配置**:
- 所有用户: 只读

### 4. 创建 lottery_codes 集合

**集合用途**: 存储用户奖励验证码

**字段定义**:
- `_id` (String): 自动生成ID
- `code` (String): 唯一6位随机码 (大写字母+数字)
- `status` (Number): 状态，0-未使用，1-已核销
- `openid` (String): 生成该码的用户微信标识
- `createTime` (Date): 生成时间

**示例数据**:
```javascript
{
  "_id": "auto_generated",
  "code": "ABC123",
  "status": 0,
  "openid": "user_openid",
  "createTime": new Date()
}
```

**索引配置**:
- 在 `code` 字段上创建唯一索引
- 在 `openid` 字段上创建索引
- 在 `status` 字段上创建索引

**权限配置**:
- 所有用户: 无权限
- 管理员: 可读写

### 5. 创建初始数据

#### products 初始数据:
```javascript
// 女装
db.collection('products').add({
  data: {
    name: "女装",
    tags: ["面料舒适", "版型显瘦", "物流快", "包装精美", "性价比高", "款式时尚"],
    updateTime: new Date()
  }
})

// 数码
db.collection('products').add({
  data: {
    name: "数码",
    tags: ["性能强劲", "拍照清晰", "续航持久", "外观时尚", "操作流畅", "性价比高"],
    updateTime: new Date()
  }
})

// 美妆
db.collection('products').add({
  data: {
    name: "美妆",
    tags: ["质地细腻", "不卡粉", "持久不脱妆", "包装精美", "成分温和", "效果明显"],
    updateTime: new Date()
  }
})

// 食品
db.collection('products').add({
  data: {
    name: "食品",
    tags: ["味道鲜美", "新鲜度高", "包装完好", "发货快", "保质期长", "安全放心"],
    updateTime: new Date()
  }
})
```

### 6. 云存储配置

#### 创建目录:
1. 在云开发控制台选择"存储"
2. 创建 `review-images` 目录
3. 上传各分类对应的商品图片
4. 记录每个图片的 cloud:// fileID

#### 上传示例:
-女装类目: womens_clothing_1.png, womens_clothing_2.png, womens_clothing_3.png
-数码类目: digital_1.png, digital_2.png, digital_3.png
-美妆类目: beauty_1.png, beauty_2.png, beauty_3.png
-食品类目: food_1.png, food_2.png, food_3.png

#### 权限配置:
- 所有用户: 可读
- 管理员: 可读写

### 7. 数据库权限配置

#### products 集合权限:
```javascript
{
  "read": true,
  "write": false
}
```

#### images 集合权限:
```javascript
{
  "read": true,
  "write": false
}
```

#### lottery_codes 集合权限:
```javascript
{
  "read": false,
  "write": false
}
```

完成以上配置后，即可进行第二阶段的云函数开发。