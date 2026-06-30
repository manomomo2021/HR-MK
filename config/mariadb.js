
// إعدادات قاعدة بيانات MariaDB
const mysql = require('mysql2/promise');

// إعدادات الاتصال بقاعدة بيانات MariaDB
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hr_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // إعدادات إضافية لـ MariaDB
  charset: 'utf8mb4',
  timezone: '+00:00',
  multipleStatements: false,
  namedPlaceholders: true
};

// إنشاء تجمع الاتصالات
const pool = mysql.createPool(dbConfig);

// دالة لتنفيذ استعلامات بدون نتائج (INSERT, UPDATE, DELETE)
async function executeQuery(query, params = []) {
  try {
    const [results] = await pool.execute(query, params);
    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error('Error executing query:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// دالة لتنفيذ استعلامات تسترجع صف واحد
async function getOne(query, params = []) {
  try {
    const [rows] = await pool.execute(query, params);
    return {
      success: true,
      data: rows[0] || null
    };
  } catch (error) {
    console.error('Error executing query:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// دالة لتنفيذ استعلامات تسترجع عدة صفوف
async function getAll(query, params = []) {
  try {
    const [rows] = await pool.execute(query, params);
    return {
      success: true,
      data: rows
    };
  } catch (error) {
    console.error('Error executing query:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// دالة لتنفيذ استعلام مع معاملات (transactions)
async function executeTransaction(queries) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const results = [];
    for (const { query, params } of queries) {
      const [result] = await connection.execute(query, params);
      results.push(result);
    }

    await connection.commit();
    return {
      success: true,
      data: results
    };
  } catch (error) {
    await connection.rollback();
    console.error('Transaction error:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  executeQuery,
  getOne,
  getAll,
  executeTransaction,
  dbConfig
};
