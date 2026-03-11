import { pool } from '../connection';

export async function up() {
  console.log('Adding scan statistics table...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS qr_code_scans (
      id SERIAL PRIMARY KEY,
      merchant_id INTEGER NOT NULL,
      user_openid VARCHAR(100) NOT NULL,
      qr_code_url VARCHAR(500) NOT NULL,
      scan_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(45)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_qr_code_scans_merchant_scan_time ON qr_code_scans(merchant_id, scan_time)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_qr_code_scans_user_openid ON qr_code_scans(user_openid)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_qr_code_scans_scan_time ON qr_code_scans(scan_time)`);
  console.log('  ✓ qr_code_scans table created');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS qr_scan_statistics (
      id SERIAL PRIMARY KEY,
      merchant_id INTEGER NOT NULL,
      date DATE NOT NULL,
      total_scans INTEGER NOT NULL DEFAULT 0,
      unique_users INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (merchant_id, date)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_qr_scan_statistics_merchant_date ON qr_scan_statistics(merchant_id, date)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_qr_scan_statistics_date ON qr_scan_statistics(date)`);
  console.log('  ✓ qr_scan_statistics table created');

  try {
    await pool.query(`DROP VIEW IF EXISTS daily_scan_stats`);
    await pool.query(`
      CREATE VIEW daily_scan_stats AS
      SELECT
        merchant_id,
        DATE(scan_time) as scan_date,
        COUNT(*) as total_scans,
        COUNT(DISTINCT user_openid) as unique_users
      FROM qr_code_scans
      GROUP BY merchant_id, DATE(scan_time)
    `);
    console.log('  ✓ daily_scan_stats view created');
  } catch (error: any) {
    console.log('  ⊘ View creation skipped');
  }

  console.log('Scan statistics table added successfully');
}

export async function down() {
  console.log('Removing scan statistics...');

  try {
    await pool.query('DROP VIEW IF EXISTS daily_scan_stats');
  } catch (error: any) {}

  try {
    await pool.query('DROP TABLE IF EXISTS qr_scan_statistics CASCADE');
  } catch (error: any) {}

  try {
    await pool.query('DROP TABLE IF EXISTS qr_code_scans CASCADE');
  } catch (error: any) {}

  console.log('Scan statistics removed successfully');
}
