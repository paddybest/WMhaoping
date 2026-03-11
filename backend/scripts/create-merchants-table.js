const mysql = require('mysql2/promise');

async function createMerchantsTable() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'rootpassword',
    database: 'haopingbao'
  });

  try {
    const createMerchants = `
      CREATE TABLE IF NOT EXISTS merchants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        shop_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await pool.execute(createMerchants);
    console.log('merchants table created successfully');

    const [tables] = await pool.execute('SHOW TABLES');
    console.log('Tables:', tables.map(t => Object.values(t)[0]).join(', '));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

createMerchantsTable();
