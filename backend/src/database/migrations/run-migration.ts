import { up } from './007-add-scan-statistics-table';
import { pool } from '../connection';

/**
 * Run migration 007: Add scan statistics table
 */
async function runMigration() {
  try {
    console.log('Starting migration 007...\n');
    await up();
    console.log('\n✅ Migration completed!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
