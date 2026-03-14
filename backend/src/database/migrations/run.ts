import { pool } from '../connection';

// 迁移接口定义
interface Migration {
  name: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

// 迁移锁接口
interface MigrationLock {
  acquired: boolean;
  lockId?: string;
}

// 尝试获取迁移锁（防止并发执行）
async function acquireLock(): Promise<MigrationLock> {
  const lockId = `${Date.now()}-${process.pid}`;

  try {
    // 创建迁移锁表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migration_locks (
        id SERIAL PRIMARY KEY,
        lock_key VARCHAR(255) NOT NULL UNIQUE,
        lock_id VARCHAR(255) NOT NULL,
        acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 尝试插入锁记录（PostgreSQL 使用 ON CONFLICT）
    await pool.query(
      'INSERT INTO migration_locks (lock_key, lock_id) VALUES ($1, $2) ON CONFLICT (lock_key) DO NOTHING',
      ['migration_lock', lockId]
    );

    // 检查是否成功获取锁
    const result = await pool.query(
      'SELECT lock_id FROM migration_locks WHERE lock_key = $1',
      ['migration_lock']
    );

    if (result.rows.length > 0 && result.rows[0].lock_id === lockId) {
      console.log(`✅ Migration lock acquired: ${lockId}`);
      return { acquired: true, lockId };
    } else {
      console.error(`❌ Migration is already in progress`);
      return { acquired: false };
    }
  } catch (error: any) {
    console.error('❌ Failed to acquire migration lock:', error.message);
    return { acquired: false };
  }
}

// 释放迁移锁
async function releaseLock(lockId: string): Promise<void> {
  try {
    await pool.query(
      'DELETE FROM migration_locks WHERE lock_key = $1 AND lock_id = $2',
      ['migration_lock', lockId]
    );
    console.log(`✅ Migration lock released: ${lockId}`);
  } catch (error: any) {
    console.warn(`⚠️  Failed to release lock: ${error.message}`);
  }
}

// 获取数据库连接（支持事务）
async function getConnection() {
  return await pool.connect();
}

// 执行迁移（带事务支持）
async function runMigration(migration: Migration, client: any): Promise<void> {
  console.log(`▶️  Running migration: ${migration.name}`);

  try {
    await migration.up();
    await client.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
    console.log(`✅ Migration ${migration.name} completed`);
  } catch (error) {
    console.error(`❌ Migration ${migration.name} failed:`, error);
    throw error;
  }
}

// 主迁移函数
async function runMigrations() {
  let lock: MigrationLock = { acquired: false };
  const client = null;

  try {
    // 1. 获取迁移锁
    lock = await acquireLock();
    if (!lock.acquired) {
      console.error('❌ Cannot proceed without migration lock');
      process.exit(1);
    }

    // 2. 创建迁移记录表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. 导入所有迁移（按顺序）
    const migrations: Migration[] = [
      { name: '000-create-merchants', up: () => require('./000-create-merchants').up() },
      { name: '001-create-product-categories', up: () => require('./001-create-product-categories').up() },
      { name: '002-create-product-items', up: () => require('./002-create-product-items').up() },
      { name: '003-create-product-images', up: () => require('./003-create-product-images').up() },
      { name: '004-add-performance-indexes', up: () => require('./004-add-performance-indexes').up() },
      { name: '005-update-merchants-table', up: () => require('./005-update-merchants-table').up() },
      { name: '006-add-multi-tenant-support', up: () => require('./006-add-multi-tenant-support').up() },
      { name: '007-add-scan-statistics-table', up: () => require('./007-add-scan-statistics-table').up() },
      { name: '008-create-product-tags-table', up: () => require('./008-create-product-tags-table').up() },
      { name: '009-add-merchant-contact-fields', up: () => require('./009-add-merchant-contact-fields').up() },
      { name: '010-create-product-tags-association', up: () => require('./010-create-product-tags-association').up() },
      { name: '011-add-category-tags-column', up: () => require('./011-add-category-tags-column').up() },
      { name: '012-add-payment-orders-table', up: () => require('./012-add-payment-orders-table').up() },
    ];

    console.log(`📋 Found ${migrations.length} migrations to check\n`);

    // 4. 执行未运行的迁移
    let executedCount = 0;
    let skippedCount = 0;

    // 使用事务执行迁移
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const migration of migrations) {
        // 检查是否已执行
        const result = await client.query('SELECT * FROM migrations WHERE name = $1', [migration.name]);

        if (result.rows.length === 0) {
          await runMigration(migration, client);
          executedCount++;
        } else {
          console.log(`⊘ Migration ${migration.name} already executed, skipping`);
          skippedCount++;
        }
      }

      await client.query('COMMIT');
      console.log('\n✅ Transaction committed');
    } catch (error) {
      await client.query('ROLLBACK');
      console.log('🔄 Transaction rolled back');
      throw error;
    } finally {
      client.release();
    }

    // 5. 显示汇总
    console.log('\n📊 Migration Summary:');
    console.log('=====================================');
    console.log(`✅ Executed: ${executedCount}`);
    console.log(`⊘ Skipped:  ${skippedCount}`);
    console.log(`📋 Total:   ${migrations.length}`);
    console.log('=====================================\n');

    console.log('✅ All migrations completed successfully');

    // 6. 释放锁
    if (lock.lockId) {
      await releaseLock(lock.lockId);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);

    // 释放锁
    if (lock.lockId) {
      await releaseLock(lock.lockId);
    }

    process.exit(1);
  }
}

// 运行迁移
runMigrations();
