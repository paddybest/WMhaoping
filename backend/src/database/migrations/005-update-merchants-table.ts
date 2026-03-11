import { pool } from '../connection';

export async function up() {
  console.log('Updating merchants table...');

  const columns = [
    { name: 'name', sql: "VARCHAR(255) NOT NULL DEFAULT ''" },
    { name: 'description', sql: 'TEXT' },
    { name: 'is_active', sql: 'BOOLEAN DEFAULT TRUE' }
  ];

  for (const col of columns) {
    try {
      await pool.query(`ALTER TABLE merchants ADD COLUMN IF NOT EXISTS ${col.name} ${col.sql}`);
      console.log(`  ✓ Added column ${col.name}`);
    } catch (error: any) {
      if (error.code === '42701') { // duplicate_column
        console.log(`  ⊘ Column ${col.name} already exists, skipping`);
      } else {
        throw error;
      }
    }
  }

  await pool.query(`
    UPDATE merchants SET name = shop_name WHERE name = ''
  `);

  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_merchants_active ON merchants(is_active)`);
    console.log('  ✓ Added index idx_merchants_active');
  } catch (error: any) {
    if (error.code === '42P07') { // duplicate_table
      console.log('  ⊘ Index idx_merchants_active already exists, skipping');
    } else {
      throw error;
    }
  }

  console.log('Merchants table updated successfully');
}

export async function down() {
  console.log('Reverting merchants table changes...');

  try {
    await pool.query('DROP INDEX IF EXISTS idx_merchants_active');
  } catch (error: any) {
    console.log('  ⊘ Index already removed');
  }

  const columns = ['name', 'description', 'is_active'];
  for (const col of columns) {
    try {
      await pool.query(`ALTER TABLE merchants DROP COLUMN IF EXISTS ${col}`);
    } catch (error: any) {
      console.log(`  ⊘ Column ${col} already removed`);
    }
  }

  console.log('Merchants table reverted successfully');
}
