// AI 评价助手 - 初始数据导入脚本
// 在微信开发者工具的云开发控制台中，点击"数据库" -> "命令行"，复制此代码执行

// 导入商品类目数据
db.collection('products').add({
  data: {
    name: "女装",
    tags: ["面料舒适", "版型显瘦", "物流快", "包装精美", "性价比高", "款式时尚"],
    updateTime: new Date()
  }
}).then(res => {
  console.log('女装类目创建成功:', res._id)
})

db.collection('products').add({
  data: {
    name: "男装",
    tags: ["材质优良", "做工精细", "尺码标准", "发货迅速", "价格实惠", "款式多样"],
    updateTime: new Date()
  }
}).then(res => {
  console.log('男装类目创建成功:', res._id)
})

db.collection('products').add({
  data: {
    name: "数码产品",
    tags: ["性能强劲", "外观精美", "功能齐全", "性价比高", "客服专业", "物流给力"],
    updateTime: new Date()
  }
}).then(res => {
  console.log('数码产品类目创建成功:', res._id)
})

db.collection('products').add({
  data: {
    name: "美妆护肤",
    tags: ["质地轻薄", "吸收快", "效果明显", "包装精美", "价格实惠", "成分安全"],
    updateTime: new Date()
  }
}).then(res => {
  console.log('美妆护肤类目创建成功:', res._id)
})

// 示例图片数据（请替换为实际的 fileID）
const sampleImages = {
 女装: [
   {
     fileID: "cloud://cloud1-9gbrkqwy4f67587b.636c-cloud1-9gbrkqwy4f67587b/review-images/female-clothes/dress1.png",
     categoryId: "女装类目的 _id"
   },
   {
     fileID: "cloud://cloud1-9gbrkqwy4f67587b.636c-cloud1-9gbrkqwy4f67587b/review-images/female-clothes/dress2.png",
     categoryId: "女装类目的 _id"
   },
   {
     fileID: "cloud://cloud1-9gbrkqwy4f67587b.636c-cloud1-9gbrkqwy4f67587b/review-images/female-clothes/dress3.png",
     categoryId: "女装类目的 _id"
   }
 ],
 男装: [
   {
     fileID: "cloud://cloud1-9gbrkqwy4f67587b.636c-cloud1-9gbrkqwy4f67587b/review-images/male-clothes/shirt1.jpg",
     categoryId: "男装类目的 _id"
   },
   {
     fileID: "cloud://cloud1-9gbrkqwy4f67587b.636c-cloud1-9gbrkqwy4f67587b/review-images/male-clothes/shirt2.jpg",
     categoryId: "男装类目的 _id"
   },
   {
     fileID: "cloud://cloud1-9gbrkqwy4f67587b.636c-cloud1-9gbrkqwy4f67587b/review-images/male-clothes/shirt3.jpg",
     categoryId: "男装类目的 _id"
   }
 ],
 数码产品: [
   {
     fileID: "cloud://cloud1-9gbrkqwy4f67587b.636c-cloud1-9gbrkqwy4f67587b/review-images/digital/phone1.jpg",
     categoryId: "数码产品类目的 _id"
   },
   {
     fileID: "cloud://cloud1-9gbrkqwy4f67587b.636c-cloud1-9gbrkqwy4f67587b/review-images/digital/laptop1.jpg",
     categoryId: "数码产品类目的 _id"
   },
   {
     fileID: "cloud://cloud1-9gbrkqwy4f67587b.636c-cloud1-9gbrkqwy4f67587b/review-images/digital/camera1.jpg",
     categoryId: "数码产品类目的 _id"
   }
 ],
 美妆护肤: [
   {
     fileID: "cloud://cloud1-9gbrkqwy4f67587b.636c-cloud1-9gbrkqwy4f67587b/review-images/beauty/skincare1.jpg",
     categoryId: "美妆护肤类目的 _id"
   },
   {
     fileID: "cloud://cloud1-9gbrkqwy4f67587b.636c-cloud1-9gbrkqwy4f67587b/review-images/beauty/makeup1.jpg",
     categoryId: "美妆护肤类目的 _id"
   },
   {
     fileID: "cloud://cloud1-9gbrkqwy4f67587b.636c-cloud1-9gbrkqwy4f67587b/review-images/beauty/beauty1.jpg",
     categoryId: "美妆护肤类目的 _id"
   }
 ]
}

// 批量插入图片数据（需要先获取 products 集合的 _id）
// 注意：请在执行以下代码前，将 sampleImages 中的 categoryId 替换为实际的 _id