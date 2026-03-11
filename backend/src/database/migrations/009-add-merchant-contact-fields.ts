import { pool } from '../connection';

/**
 * Add contact_phone and address fields to merchants table
 */
export async function up() {
  console.log('Adding contact_phone and address to merchants table...');

  try {
    // Add contact_phone column if it doesn't exist
    await pool.query(`
      ALTER TABLE merchants
      ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20)
    `);
    console.log('✓ contact_phone column added');

    // Add address column if it doesn't exist
    await pool.query(`
      ALTER TABLE merchants
      ADD COLUMN IF NOT EXISTS address VARCHAR(255)
    `);
    console.log('✓ address column added');

    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Error adding columns to merchants table:', error);
    throw error;
  }
}

/**
 * Rollback this migration
 */
export async function down() {
  console.log('Removing contact_phone and address from merchants table...');

  try {
    await pool.query(`ALTER TABLE merchants DROP COLUMN IF EXISTS contact_phone`);
    console.log('✓ contact_phone column dropped');

    await pool.query(`ALTER TABLE merchants DROP COLUMN IF EXISTS address`);
    console.log('✓ address column dropped');

    console.log('Rollback completed successfully');

  } catch (error) {
    console.error('Error removing columns from merchants table:', error);
    throw error;
  }
}
