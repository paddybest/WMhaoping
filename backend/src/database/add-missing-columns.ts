import { pool } from './connection';

async function addMissingColumns() {
  try {
    const columns = [
      { name: 'description', sql: "TEXT COMMENT '描述'" },
      { name: 'contact_phone', sql: "VARCHAR(50) COMMENT '联系电话'" },
      { name: 'address', sql: "VARCHAR(500) COMMENT '地址'" },
      { name: 'customer_service_qr_url', sql: "VARCHAR(500) COMMENT '客服二维码URL'" },
      { name: 'qr_code_url', sql: "VARCHAR(500) COMMENT '商家二维码URL'" }
    ];

    for (const col of columns) {
      try {
        // PostgreSQL: 使用 IF NOT EXISTS 和正确的语法
        await pool.query(`ALTER TABLE merchants ADD COLUMN IF NOT EXISTS ${col.name} ${col.sql.replace(" COMMENT '", " COMMENT ").replace("'", "")}`);
        console.log(`  ✓ Added merchants.${col.name}`);
      } catch (error: any) {
        // PostgreSQL 错误码是 42710 表示字段已存在
        if (error.code === '42710') {
          console.log(`  ⊘ merchants.${col.name} already exists`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Missing columns added');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addMissingColumns();
