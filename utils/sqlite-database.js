
const Database = require('better-sqlite3');
const path = require('path');

// مسار قاعدة البيانات
const dbPath = path.resolve(__dirname, '../data/data.db');

// إنشاء اتصال بقاعدة البيانات
const db = new Database(dbPath);
console.log('Connected to SQLite database successfully');

// دالة لتنفيذ استعلامات قاعدة البيانات
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const rows = db.prepare(sql).all(...params);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

// دالة لتنفيذ استعلامات الإدراج والتحديث والحذف
function runCommand(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const result = db.prepare(sql).run(...params);
      resolve({ id: result.lastInsertRowid, changes: result.changes });
    } catch (err) {
      reject(err);
    }
  });
}

// تهيئة قاعدة البيانات
const initDatabase = async () => {
  try {
    // التحقق من وجود الجداول الأساسية
    const tables = await runQuery("SELECT name FROM sqlite_master WHERE type='table'");

    if (tables.length === 0) {
      console.log('لا توجد جداول في قاعدة البيانات');
      return Promise.reject(new Error('قاعدة البيانات فارغة'));
    }

    console.log('تم تهيئة قاعدة البيانات بنجاح');
    return Promise.resolve();
  } catch (error) {
    console.error('خطأ في تهيئة قاعدة البيانات:', error);
    return Promise.reject(error);
  }
};

// دوال التعامل مع الموظفين
const getEmployees = async () => {
  try {
    const employees = await runQuery('SELECT * FROM employees WHERE status = "active"');
    return employees.map(emp => ({
      id: emp.id,
      code: emp.employee_id,
      name: `${emp.first_name} ${emp.last_name}`,
      salary: emp.salary,
      departmentId: emp.department_id,
      positionId: emp.position_id,
      email: emp.email,
      phone: emp.phone,
      status: emp.status
    }));
  } catch (err) {
    console.error('خطأ في جلب الموظفين:', err);
    return [];
  }
};

const getEmployeeById = async (id) => {
  try {
    const employees = await runQuery('SELECT * FROM employees WHERE id = ?', [id]);
    if (employees.length === 0) return null;

    const emp = employees[0];
    return {
      id: emp.id,
      code: emp.employee_id,
      name: `${emp.first_name} ${emp.last_name}`,
      salary: emp.salary,
      departmentId: emp.department_id,
      positionId: emp.position_id,
      email: emp.email,
      phone: emp.phone,
      status: emp.status
    };
  } catch (err) {
    console.error('خطأ في جلب بيانات الموظف:', err);
    return null;
  }
};

// دوال التعامل مع الحضور اليدوي
const getManualAttendance = async () => {
  try {
    const query = `
      SELECT ma.*, e.first_name, e.last_name, e.employee_id as emp_code
      FROM manual_attendance ma
      JOIN employees e ON ma.employee_id = e.id
      ORDER BY ma.created_at DESC
    `;
    const records = await runQuery(query);

    return records.map(record => ({
      id: record.id,
      employeeId: record.employee_id,
      employeeName: `${record.first_name} ${record.last_name}`,
      employeeCode: record.emp_code,
      date: record.date,
      time: record.check_in || record.check_out,
      type: record.type_id === 1 ? 'check-in' : 'check-out',
      notes: record.notes,
      createdAt: record.created_at
    }));
  } catch (err) {
    console.error('خطأ في جلب سجلات الحضور اليدوي:', err);
    return [];
  }
};

const saveManualAttendance = async (data) => {
  try {
    const { employeeId, type, date, time, notes } = data;

    // تحديد نوع الحضور (1 للحضور، 2 للانصراف)
    const typeId = type === 'check-in' ? 1 : 2;

    // تحديد الحقل المناسب (check_in أو check_out) حسب النوع
    const timeField = type === 'check-in' ? 'check_in' : 'check_out';

    // إدخال السجل في قاعدة البيانات
    const result = await runCommand(
      `INSERT INTO manual_attendance (employee_id, date, ${timeField}, type_id, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [employeeId, date, time, typeId, notes]
    );

    // الحصول على السجل المضاف
    const newRecord = await runQuery(
      `SELECT ma.*, e.first_name, e.last_name, e.employee_id as emp_code
       FROM manual_attendance ma
       JOIN employees e ON ma.employee_id = e.id
       WHERE ma.id = ?`,
      [result.id]
    );

    if (newRecord.length > 0) {
      const record = newRecord[0];
      return {
        id: record.id,
        employeeId: record.employee_id,
        employeeName: `${record.first_name} ${record.last_name}`,
        employeeCode: record.emp_code,
        date: record.date,
        time: record.check_in || record.check_out,
        type: record.type_id === 1 ? 'check-in' : 'check-out',
        notes: record.notes,
        createdAt: record.created_at
      };
    }

    return null;
  } catch (err) {
    console.error('خطأ في إضافة سجل الحضور اليدوي:', err);
    throw err;
  }
};

// دالة للحصول على إحصائيات الموظف
const getEmployeeStats = async (employeeId) => {
  try {
    // الحصول على عدد أيام الحضور
    const attendanceDays = await runQuery(
      `SELECT COUNT(DISTINCT date) as days FROM manual_attendance 
       WHERE employee_id = ? AND type_id = 1`,
      [employeeId]
    );

    // الحصول على عدد أيام الانصراف
    const checkoutDays = await runQuery(
      `SELECT COUNT(DISTINCT date) as days FROM manual_attendance 
       WHERE employee_id = ? AND type_id = 2`,
      [employeeId]
    );

    // الحصول على سجلات الحضور للموظف
    const records = await runQuery(
      `SELECT * FROM manual_attendance 
       WHERE employee_id = ? 
       ORDER BY date DESC, created_at DESC`,
      [employeeId]
    );

    return {
      attendanceDays: attendanceDays[0].days,
      checkoutDays: checkoutDays[0].days,
      records
    };
  } catch (err) {
    console.error('خطأ في جلب إحصائيات الموظف:', err);
    return {
      attendanceDays: 0,
      checkoutDays: 0,
      records: []
    };
  }
};

module.exports = {
  initDatabase,
  getEmployees,
  getEmployeeById,
  getManualAttendance,
  saveManualAttendance,
  getEmployeeStats
};

