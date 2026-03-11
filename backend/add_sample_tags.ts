import { pool } from './src/database/connection';

async function addSampleTags() {
  try {
    // 添加示例标签
    const tags = [
      { name: '味道好', category_id: null, order_index: 1 },
      { name: '分量足', category_id: null, order_index: 2 },
      { name: '包装精美', category_id: null, order_index: 3 },
      { name: '服务好', category_id: null, order_index: 4 },
      { name: '速度快', category_id: null, order_index: 5 },
      { name: '食材新鲜', category_id: null, order_index: 6 },
      { name: '性价比高', category_id: null, order_index: 7 },
      { name: '推荐', category_id: null, order_index: 8 },
    ];

    for (const tag of tags) {
      await pool.execute(
        'INSERT INTO product_tag_labels (name, category_id, merchant_id, order_index) VALUES (?, ?, ?, ?)',
        [tag.name, tag.category_id, 1, tag.order_index]
      );
    }

    console.log('Sample tags added successfully');
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

addSampleTags();
