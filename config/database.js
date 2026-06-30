
// إعدادات قاعدة بيانات SQLite
const path = require('path');

// مسار قاعدة البيانات
const DB_PATH = path.join(process.cwd(), 'data', 'data.db');

module.exports = {
  DB_PATH,

  // إعدادات الاتصال
  dbOptions: {
    // تمكين المفتاح الأجنبي
    foreignKeys: true,
    // تفعيل وضع WAL (Write-Ahead Logging) لتحسين الأداء
    readonly: false,
    fileMustExist: false
  },

  // جداول قاعدة البيانات
  tables: {
    users: 'users',
    departments: 'departments',
    positions: 'positions',
    employees: 'employees',
    attendance: 'attendance',
    manual_attendance: 'manual_attendance',
    leaves: 'leaves',
    payroll: 'payroll',
    biometric_devices: 'biometric_devices',
    settings: 'settings',
    attendance_types: 'attendance_types',
    attendance_settings: 'attendance_settings',
    loans: 'loans'
  }
};
