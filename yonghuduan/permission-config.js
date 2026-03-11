// AI 评价助手 - 权限配置脚本
// 在微信开发者工具的云开发控制台中，点击"数据库" -> "权限设置"，手动配置以下权限

// products 集合权限配置
{
  "read": true,
  "write": false
}

// images 集合权限配置
{
  "read": true,
  "write": false
}

// lottery_codes 集合权限配置
{
  "read": false,
  "write": false
}

// 存储权限配置（review-images 目录）
// 在存储管理页面，选择 review-images 目录，设置：
// - 读取权限：所有人
// - 写入权限：仅管理员

// 验证权限配置是否生效的方法：
// 1. 在小程序中尝试直接读取 products 集合，应该可以成功
// 2. 在小程序中尝试直接读取 images 集合，应该可以成功
// 3. 在小程序中尝试直接读取 lottery_codes 集合，应该被拒绝
// 4. 在小程序中尝试直接写入任何集合，应该被拒绝

// 注意：所有数据操作都应该通过云函数进行，这样可以确保安全性