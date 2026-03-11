// 这是一个示例功能，需要测试驱动开发
function calculateTotal(items) {
  // TODO: 实现计算总价功能
  return items.reduce((sum, item) => sum + item.price, 0);
}

module.exports = { calculateTotal };