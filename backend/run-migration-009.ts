import { up } from './src/database/migrations/009-add-merchant-contact-fields';
import { pool } from './src/database/connection';

async function runMigration() {
  try {
    console.log('Starting migration 009: Add contact_phone and address to merchants...\n');
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
