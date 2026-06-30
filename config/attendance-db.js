
// إعدادات قاعدة بيانات SQLite للحضور والانصراف
const path = require('path');

// مسار قاعدة بيانات الحضور والانصراف
const DB_PATH = path.join(process.cwd(), 'data', 'attendance.db');

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
    employees: 'employees',
    attendance: 'attendance',
    manual_attendance: 'manual_attendance',
    attendance_types: 'attendance_types',
    attendance_settings: 'attendance_settings'
  }
};
