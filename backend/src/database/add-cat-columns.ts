import mysql from 'mysql2/promise';

async function addMissingColumns() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'rootpassword',
    database: 'haopingbao_dev'
  });

  try {
    const columns = [
      { table: 'product_categories', name: 'parent_id', type: 'INT DEFAULT 0', after: 'id' },
      { table: 'product_categories', name: 'order_index', type: 'INT DEFAULT 0', after: 'level' },
      { table: 'product_items', name: 'order_index', type: 'INT DEFAULT 0', after: 'category_id' }
    ];

    for (const col of columns) {
      try {
        // 使用ALTER TABLE ADD COLUMN ... AFTER语法
        const colName = col.name;
        const colType = col.type;
        // MySQL不支持AFTER子句在ALTER TABLE ADD COLUMN中，我们需要用MODIFY
        await connection.execute(`ALTER TABLE ${col.table} ADD COLUMN ${colName} ${colType}`);
        console.log(`✅ Added column: ${col.table}.${colName}`);
      } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`⊘ Column already exists: ${col.table}.${col.name}`);
        } else {
          console.log(`❌ Error adding ${col.table}.${col.name}: ${e.message}`);
        }
      }
    }

    console.log('\n🎉 All columns added!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

addMissingColumns();
