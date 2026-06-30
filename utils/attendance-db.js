
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { DB_PATH, dbOptions, tables } = require('../config/attendance-db');

// التأكد من وجود مجلد البيانات
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// إنشاء اتصال بقاعدة البيانات
const db = new Database(DB_PATH, dbOptions);

// تفعيل المفاتيح الأجنبية
db.pragma('foreign_keys = ON');

// دالة لتنفيذ استعلامات بدون نتائج (INSERT, UPDATE, DELETE)
function runQuery(query, params = []) {
  try {
    const stmt = db.prepare(query);
    const info = stmt.run(params);
    return {
      success: true,
      data: info
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
function getOne(query, params = []) {
  try {
    const stmt = db.prepare(query);
    const row = stmt.get(params);
    return {
      success: true,
      data: row
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
function getAll(query, params = []) {
  try {
    const stmt = db.prepare(query);
    const rows = stmt.all(params);
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

// دالة لإنشاء جداول قاعدة البيانات
function initializeDatabase() {
  // جدول الموظفين
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.employees} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      department TEXT,
      position TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول أنواع الحضور
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.attendance_types} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // إضافة أنواع الحضور الافتراضية
  runQuery(`
    INSERT OR IGNORE INTO ${tables.attendance_types} (type_name, description) 
    VALUES ('حضور', 'تسجيل حضور الموظف'), ('انصراف', 'تسجيل انصراف الموظف')
  `);

  // جدول إعدادات الحضور
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.attendance_settings} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // إضافة إعدادات افتراضية
  runQuery(`
    INSERT OR IGNORE INTO ${tables.attendance_settings} (setting_key, setting_value, description) 
    VALUES 
    ('work_start_time', '08:00', 'وقت بدء العمل الافتراضي'),
    ('work_end_time', '17:00', 'وقت انتهاء العمل الافتراضي'),
    ('allow_duplicate_checkin', 'false', 'السماح بتسجيل الحضور أكثر من مرة في اليوم'),
    ('allow_duplicate_checkout', 'false', 'السماح بتسجيل الانصراف أكثر من مرة في اليوم')
  `);

  // جدول الحضور والانصراف (من أجهزة البصمة)
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.attendance} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date DATE NOT NULL,
      check_in TIME,
      check_out TIME,
      device_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
      UNIQUE(employee_id, date)
    )
  `);

  // جدول الحضور والانصراف اليدوي
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.manual_attendance} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date DATE NOT NULL,
      check_in TIME,
      check_out TIME,
      type_id INTEGER NOT NULL,
      notes TEXT,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
      FOREIGN KEY (type_id) REFERENCES ${tables.attendance_types}(id) ON DELETE RESTRICT,
      UNIQUE(employee_id, date, type_id)
    )
  `);

  console.log('Attendance database initialized successfully');
}

// دالة للتحقق من وجود سجل حضور لموظف في يوم معين
function hasAttendanceRecord(employeeId, date) {
  return getOne(`
    SELECT COUNT(*) as count FROM ${tables.attendance} 
    WHERE employee_id = ? AND date = ?
  `, [employeeId, date]);
}

// دالة للتحقق من وجود سجل حضور يدوي لموظف في يوم معين
function hasManualAttendanceRecord(employeeId, date, typeId) {
  return getOne(`
    SELECT COUNT(*) as count FROM ${tables.manual_attendance} 
    WHERE employee_id = ? AND date = ? AND type_id = ?
  `, [employeeId, date, typeId]);
}

// دالة للتحقق من وجود أي سجل حضور (عادي أو يدوي) لموظف في يوم معين
function hasAnyAttendanceRecord(employeeId, date) {
  const attendanceResult = hasAttendanceRecord(employeeId, date);
  const manualResult = getOne(`
    SELECT COUNT(*) as count FROM ${tables.manual_attendance} 
    WHERE employee_id = ? AND date = ?
  `, [employeeId, date]);

  if (attendanceResult.success && manualResult.success) {
    return {
      success: true,
      data: {
        attendance: attendanceResult.data.count > 0,
        manual: manualResult.data.count > 0,
        total: attendanceResult.data.count + manualResult.data.count
      }
    };
  } else {
    return {
      success: false,
      error: attendanceResult.error || manualResult.error
    };
  }
}

// دالة لإضافة سجل حضور
function addAttendance(employeeId, date, checkIn, checkOut, deviceId = null) {
  // التحقق من وجود سجل سابق
  const existingRecord = hasAttendanceRecord(employeeId, date);

  if (existingRecord.success && existingRecord.data.count > 0) {
    // تحديث السجل الموجود
    return runQuery(`
      UPDATE ${tables.attendance} 
      SET check_in = ?, check_out = ?, device_id = ?
      WHERE employee_id = ? AND date = ?
    `, [checkIn, checkOut, deviceId, employeeId, date]);
  } else {
    // إضافة سجل جديد
    return runQuery(`
      INSERT INTO ${tables.attendance} (employee_id, date, check_in, check_out, device_id)
      VALUES (?, ?, ?, ?, ?)
    `, [employeeId, date, checkIn, checkOut, deviceId]);
  }
}

// دالة لإضافة سجل حضور يدوي
function addManualAttendance(employeeId, date, checkIn, checkOut, typeId, notes = null, createdBy = null) {
  // التحقق من وجود سجل سابق من نفس النوع
  const existingRecord = hasManualAttendanceRecord(employeeId, date, typeId);

  if (existingRecord.success && existingRecord.data.count > 0) {
    // تحديث السجل الموجود
    return runQuery(`
      UPDATE ${tables.manual_attendance} 
      SET check_in = ?, check_out = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = ? AND date = ? AND type_id = ?
    `, [checkIn, checkOut, notes, employeeId, date, typeId]);
  } else {
    // إضافة سجل جديد
    return runQuery(`
      INSERT INTO ${tables.manual_attendance} (employee_id, date, check_in, check_out, type_id, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [employeeId, date, checkIn, checkOut, typeId, notes, createdBy]);
  }
}

// دالة للحصول على جميع سجلات الحضور لموظف في شهر معين
function getEmployeeAttendance(employeeId, year, month) {
  return getAll(`
    SELECT a.*, 
           e.employee_id, e.first_name, e.last_name, e.department, e.position
    FROM ${tables.attendance} a
    JOIN ${tables.employees} e ON a.employee_id = e.id
    WHERE a.employee_id = ? AND strftime('%Y', a.date) = ? AND strftime('%m', a.date) = ?
    ORDER BY a.date
  `, [employeeId, year, month.toString().padStart(2, '0')]);
}

// دالة للحصول على جميع سجلات الحضور اليدوي لموظف في شهر معين
function getEmployeeManualAttendance(employeeId, year, month) {
  return getAll(`
    SELECT ma.*, 
           e.employee_id, e.first_name, e.last_name, e.department, e.position,
           at.type_name, at.description
    FROM ${tables.manual_attendance} ma
    JOIN ${tables.employees} e ON ma.employee_id = e.id
    JOIN ${tables.attendance_types} at ON ma.type_id = at.id
    WHERE ma.employee_id = ? AND strftime('%Y', ma.date) = ? AND strftime('%m', ma.date) = ?
    ORDER BY ma.date, ma.type_id
  `, [employeeId, year, month.toString().padStart(2, '0')]);
}

// دالة للحصول على جميع سجلات الحضور (العادي واليدوي) لموظف في شهر معين
function getEmployeeAllAttendance(employeeId, year, month) {
  const attendance = getEmployeeAttendance(employeeId, year, month);
  const manualAttendance = getEmployeeManualAttendance(employeeId, year, month);

  if (attendance.success && manualAttendance.success) {
    // دمج السجلات وترتيبها حسب التاريخ والوقت
    const allRecords = [...attendance.data, ...manualAttendance.data];
    allRecords.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.check_in || '00:00'}`);
      const dateB = new Date(`${b.date} ${b.check_in || '00:00'}`);
      return dateA - dateB;
    });

    return {
      success: true,
      data: allRecords
    };
  } else {
    return {
      success: false,
      error: attendance.error || manualAttendance.error
    };
  }
}

// دالة للحصول على جميع الموظفين
function getAllEmployees() {
  return getAll(`
    SELECT * FROM ${tables.employees}
    ORDER BY first_name, last_name
  `);
}

// دالة لإضافة موظف جديد
function addEmployee(employee) {
  return runQuery(`
    INSERT INTO ${tables.employees} (employee_id, first_name, last_name, department, position)
    VALUES (?, ?, ?, ?, ?)
  `, [employee.employee_id, employee.first_name, employee.last_name, employee.department, employee.position]);
}

// دالة لتحديث بيانات موظف
function updateEmployee(employeeId, employeeData) {
  return runQuery(`
    UPDATE ${tables.employees} 
    SET employee_id = ?, first_name = ?, last_name = ?, department = ?, position = ?
    WHERE id = ?
  `, [employeeData.employee_id, employeeData.first_name, employeeData.last_name, 
      employeeData.department, employeeData.position, employeeId]);
}

// دالة للحصول على إعدادات الحضور
function getAttendanceSettings() {
  const settings = getAll(`
    SELECT setting_key, setting_value FROM ${tables.attendance_settings}
  `);

  if (settings.success) {
    const settingsObj = {};
    settings.data.forEach(setting => {
      settingsObj[setting.setting_key] = setting.setting_value;
    });
    return {
      success: true,
      data: settingsObj
    };
  } else {
    return settings;
  }
}

module.exports = {
  db,
  runQuery,
  getOne,
  getAll,
  initializeDatabase,
  hasAttendanceRecord,
  hasManualAttendanceRecord,
  hasAnyAttendanceRecord,
  addAttendance,
  addManualAttendance,
  getEmployeeAttendance,
  getEmployeeManualAttendance,
  getEmployeeAllAttendance,
  getAllEmployees,
  addEmployee,
  updateEmployee,
  getAttendanceSettings,
  tables
};
