import { pool } from '../connection';

export async function up() {
  console.log('Adding performance indexes...');

  const indexes = [
    { name: 'idx_product_items_merchant_active', table: 'product_items', columns: '(merchant_id, is_active)' },
    { name: 'idx_product_items_category_active', table: 'product_items', columns: '(category_id, is_active)' },
    { name: 'idx_product_images_product', table: 'product_images', columns: '(product_id)' },
    { name: 'idx_product_categories_merchant_level', table: 'product_categories', columns: '(merchant_id, level)' }
  ];

  for (const idx of indexes) {
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table} ${idx.columns}`);
      console.log(`  ✅ Index ${idx.name} created`);
    } catch (error: any) {
      if (error.code === '42P07') { // duplicate_table
        console.log(`  ⊘ Index ${idx.name} already exists, skipping`);
      } else {
        throw error;
      }
    }
  }

  console.log('Performance indexes added successfully');
}

export async function down() {
  console.log('Removing performance indexes...');

  const indexes = [
    { name: 'idx_product_items_merchant_active', table: 'product_items' },
    { name: 'idx_product_items_category_active', table: 'product_items' },
    { name: 'idx_product_images_product', table: 'product_images' },
    { name: 'idx_product_categories_merchant_level', table: 'product_categories' }
  ];

  for (const idx of indexes) {
    try {
      await pool.query(`DROP INDEX IF EXISTS ${idx.name}`);
    } catch (error: any) {
      console.log(`  ⊘ Index ${idx.name} already removed`);
    }
  }

  console.log('Performance indexes removed successfully');
}
