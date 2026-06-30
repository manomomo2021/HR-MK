const fs = require('fs');
const path = require('path');
const { DB_PATH, dbOptions, tables } = require('../config/database');

let db;
try {
  const Database = require('better-sqlite3');
  // التأكد من وجود مجلد البيانات
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  db = new Database(DB_PATH, dbOptions);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
} catch (e) {
  console.warn('SQLite initialization failed:', e.message);
}

// دالة لتنفيذ استعلامات بدون نتائج (INSERT, UPDATE, DELETE)
function runQuery(query, params = []) {
  if (!db) return { success: false, error: 'Database not initialized' };
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

// النسخ غير المتزامنة للتوافق مع MariaDB
const runQueryAsync = async (q, p) => runQuery(q, p);
const getOneAsync = async (q, p) => getOne(q, p);
const getAllAsync = async (q, p) => getAll(q, p);

// دالة لتنفيذ استعلامات تسترجع صف واحد
function getOne(query, params = []) {
  if (!db) return { success: false, error: 'Database not initialized' };
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
  if (!db) return { success: false, error: 'Database not initialized' };
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
  // جدول المستخدمين
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.users} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      department TEXT,
      employee_id INTEGER,
      phone TEXT,
      custom_permissions TEXT, -- JSON string
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ================================================
  // إضافة الأعمدة الموسعة إن لم تكن موجودة (آمن)
  // ================================================
  const usersExtendedColumns = [
    { col: 'department', def: 'TEXT' },
    { col: 'employee_id', def: 'INTEGER' },
    { col: 'phone', def: 'TEXT' },
    { col: 'custom_permissions', def: 'TEXT' },
    { col: 'status', def: "TEXT DEFAULT 'active'" },
  ]
  for (const { col, def } of usersExtendedColumns) {
    try {
      db.prepare(`ALTER TABLE ${tables.users} ADD COLUMN ${col} ${def}`).run()
    } catch (_) { }
  }

  // جدول الأقسام
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.departments} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول المناصب
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.positions} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      department_id INTEGER,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES ${tables.departments}(id) ON DELETE SET NULL
    )
  `);

  // جدول الموظفين
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.employees} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      birth_date DATE,
      hire_date DATE NOT NULL,
      department_id INTEGER,
      position_id INTEGER,
      salary REAL,
      image TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES ${tables.departments}(id) ON DELETE SET NULL,
      FOREIGN KEY (position_id) REFERENCES ${tables.positions}(id) ON DELETE SET NULL
    )
  `);

  // ================================================
  // جداول محرك الحضور المؤسسي (Enterprise Attendance Engine)
  // ================================================
  
  // 1. سجل الأحداث (الأساس - لا يمسح ولا يعدل إلا بصلاحيات ويحفظ كأحداث منفصلة)
  runQuery(`
    CREATE TABLE IF NOT EXISTS attendance_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT UNIQUE,
      employee_id INTEGER NOT NULL,
      event_type TEXT NOT NULL, -- CHECK_IN, CHECK_OUT, BREAK_START, ABSENT_AUTO, etc.
      source TEXT NOT NULL, -- BIOMETRIC, MANUAL, SYSTEM, GPS
      date DATE NOT NULL,
      time TIME NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      device_name TEXT,
      ip_address TEXT,
      mac_address TEXT,
      latitude REAL,
      longitude REAL,
      notes TEXT,
      reason TEXT,
      status TEXT DEFAULT 'active',
      created_by INTEGER,
      FOREIGN KEY (employee_id) REFERENCES ${tables.employees}(id) ON DELETE CASCADE
    )
  `);

  // 2. الملخص اليومي (يحسب تلقائياً من سجل الأحداث)
  runQuery(`
    CREATE TABLE IF NOT EXISTS daily_attendance_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date DATE NOT NULL,
      first_check_in TIME,
      last_check_out TIME,
      working_minutes INTEGER DEFAULT 0,
      break_minutes INTEGER DEFAULT 0,
      net_working_minutes INTEGER DEFAULT 0,
      late_minutes INTEGER DEFAULT 0,
      early_leave_minutes INTEGER DEFAULT 0,
      overtime_minutes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Present',
      missing_check_in BOOLEAN DEFAULT 0,
      missing_check_out BOOLEAN DEFAULT 0,
      last_calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
      UNIQUE(employee_id, date)
    )
  `);

  // 3. سجل التدقيق (Audit Trail)
  runQuery(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      action TEXT NOT NULL, -- UPDATE, DELETE
      old_value TEXT,
      new_value TEXT,
      changed_by INTEGER,
      reason TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول الحضور اليدوي (للتوافق مع النظام القديم)
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.manual_attendance} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date DATE NOT NULL,
      check_in TIME,
      check_out TIME,
      type_id INTEGER,
      notes TEXT,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES ${tables.employees}(id) ON DELETE CASCADE
    )
  `);

  // جدول الحضور والانصراف (القديم - سيتم الاحتفاظ به للتوافقية مؤقتاً)
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.attendance} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date DATE NOT NULL,
      check_in TIME,
      check_out TIME,
      status TEXT DEFAULT 'present',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
      UNIQUE(employee_id, date)
    )
  `);

  // ================================================
  // إضافة الأعمدة الخاصة باحتساب الوقت (آمن)
  // ================================================
  const attendanceExtendedColumns = [
    { col: 'work_minutes', def: 'INTEGER DEFAULT 0' },
    { col: 'late_minutes', def: 'INTEGER DEFAULT 0' },
    { col: 'overtime_minutes', def: 'INTEGER DEFAULT 0' },
  ]
  for (const { col, def } of attendanceExtendedColumns) {
    try {
      db.prepare(`ALTER TABLE ${tables.attendance} ADD COLUMN ${col} ${def}`).run()
    } catch (_) { /* عمود موجود بالفعل */ }
  }

  // جدول الإجازات
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.leaves} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      leave_type TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES ${tables.employees}(id) ON DELETE CASCADE
    )
  `);

  // جدول الرواتب
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.payroll} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      basic_salary REAL NOT NULL,
      allowances REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      net_salary REAL NOT NULL,
      payment_date DATE,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
      UNIQUE(employee_id, month, year)
    )
  `);

  // جدول أجهزة البصمة
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.biometric_devices} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      port INTEGER NOT NULL,
      device_id TEXT,
      status TEXT DEFAULT 'inactive',
      last_sync TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول الفترات / الشيفتات (Enterprise Attendance)
  runQuery(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      name_ar TEXT,
      start_time TEXT NOT NULL DEFAULT '08:00',
      end_time TEXT NOT NULL DEFAULT '17:00',
      grace_minutes INTEGER DEFAULT 15,
      break_minutes INTEGER DEFAULT 60,
      working_days INTEGER DEFAULT 5,
      is_default BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // إدراج شيفت افتراضي (Morning) إن لم يكن موجوداً
  runQuery(`
    INSERT OR IGNORE INTO shifts (name, name_ar, start_time, end_time, grace_minutes, break_minutes, working_days, is_default)
    VALUES ('Morning', 'صباحي', '08:00', '17:00', 15, 60, 5, 1)
  `);
  runQuery(`
    INSERT OR IGNORE INTO shifts (name, name_ar, start_time, end_time, grace_minutes, break_minutes, working_days, is_default)
    VALUES ('Evening', 'مسائي', '14:00', '23:00', 15, 60, 5, 0)
  `);

  // جدول الإعدادات
  runQuery(`
    CREATE TABLE IF NOT EXISTS ${tables.settings} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ================================================
  // إضافة الأعمدة الموسعة إن لم تكن موجودة (آمن)
  // ================================================
  const extendedColumns = [
    { col: 'contract_type', def: 'TEXT' },
    { col: 'allowances', def: 'REAL DEFAULT 0' },
    { col: 'gender', def: 'TEXT' },
    { col: 'national_id', def: 'TEXT' },
    { col: 'marital_status', def: 'TEXT' },
    { col: 'governorate', def: 'TEXT' },
    { col: 'department_name', def: 'TEXT' },
    { col: 'position_name', def: 'TEXT' },
    { col: 'status', def: "TEXT DEFAULT 'active'" },
    { col: 'shift_id', def: 'INTEGER' },
  ]
  for (const { col, def } of extendedColumns) {
    try {
      db.prepare(`ALTER TABLE ${tables.employees} ADD COLUMN ${col} ${def}`).run()
    } catch (_) { /* عمود موجود بالفعل — تجاهل */ }
  }

  // إضافة مستخدم مسؤول افتراضي
  runQuery(`
    INSERT OR IGNORE INTO ${tables.users} 
    (username, password, full_name, role) 
    VALUES ('admin', 'admin', 'مدير النظام', 'admin')
  `);

  // ── Enterprise Attendance Engine Indexes ──
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON ${tables.attendance}(employee_id, date)`).run(); } catch (_) {}
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON ${tables.attendance}(date)`).run(); } catch (_) {}
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_leaves_employee ON ${tables.leaves}(employee_id)`).run(); } catch (_) {}
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_employees_status ON ${tables.employees}(status)`).run(); } catch (_) {}
  
  // ── Attendance Events Indexes (Enterprise) ──
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_att_events_emp_date ON attendance_events(employee_id, date)`).run(); } catch (_) {}
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_att_events_date ON attendance_events(date)`).run(); } catch (_) {}
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_att_events_type ON attendance_events(event_type)`).run(); } catch (_) {}
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_att_events_source ON attendance_events(source)`).run(); } catch (_) {}
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_att_events_status ON attendance_events(status)`).run(); } catch (_) {}
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_att_events_emp_date_type ON attendance_events(employee_id, date, event_type)`).run(); } catch (_) {}
  
  // ── Daily Summary Indexes ──
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_daily_summary_emp_date ON daily_attendance_summary(employee_id, date)`).run(); } catch (_) {}
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_attendance_summary(date)`).run(); } catch (_) {}
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_daily_summary_status ON daily_attendance_summary(status)`).run(); } catch (_) {}
  
  // ── Audit Log Indexes ──
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id)`).run(); } catch (_) {}
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`).run(); } catch (_) {}

  console.log('Database initialized successfully');
}

// دوال للتعامل مع الموظفين
async function getEmployees() {
  return getAll(`
    SELECT 
      e.*,
      e.employee_id   AS code,
      e.first_name || ' ' || COALESCE(e.last_name, '') AS name,
      e.birth_date    AS birthDate,
      e.hire_date     AS hireDate,
      e.salary        AS basicSalary,
      COALESCE(d.name, e.department_id) AS department,
      COALESCE(p.title, e.position_id)  AS position,
      s.id            AS shift_id,
      s.name          AS shift_name,
      s.start_time    AS shift_start,
      s.end_time      AS shift_end,
      s.grace_minutes AS shift_grace
    FROM ${tables.employees} e
    LEFT JOIN ${tables.departments} d ON e.department_id = d.id
    LEFT JOIN ${tables.positions}   p ON e.position_id   = p.id
    LEFT JOIN shifts s ON e.shift_id = s.id
    WHERE e.status = 'active'
  `);
}

async function getEmployeeById(id) {
  return getOne(`
    SELECT 
      e.*,
      e.employee_id   AS code,
      e.first_name || ' ' || COALESCE(e.last_name, '') AS name,
      e.birth_date    AS birthDate,
      e.hire_date     AS hireDate,
      e.salary        AS basicSalary,
      COALESCE(d.name, '') AS department,
      COALESCE(p.title, '') AS position,
      s.id            AS shift_id,
      s.name          AS shift_name,
      s.start_time    AS shift_start,
      s.end_time      AS shift_end,
      s.grace_minutes AS shift_grace
    FROM ${tables.employees} e
    LEFT JOIN ${tables.departments} d ON e.department_id = d.id
    LEFT JOIN ${tables.positions}   p ON e.position_id   = p.id
    LEFT JOIN shifts s ON e.shift_id = s.id
    WHERE e.id = ?
  `, [id]);
}

async function saveEmployee(employee) {
  if (employee.id) {
    // تحديث موظف موجود
    return runQuery(`
      UPDATE ${tables.employees} 
      SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ?,
          birth_date = ?, hire_date = ?, department_id = ?, position_id = ?,
          salary = ?, image = ?, status = ?,
          contract_type = ?, allowances = ?, gender = ?, national_id = ?,
          marital_status = ?, governorate = ?, department_name = ?, position_name = ?,
          shift_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      employee.first_name, employee.last_name, employee.email, employee.phone,
      employee.address, employee.birth_date, employee.hire_date, employee.department_id,
      employee.position_id, employee.salary, employee.image,
      employee.status || 'active',
      employee.contract_type || null,
      employee.allowances || 0,
      employee.gender || null,
      employee.national_id || null,
      employee.marital_status || null,
      employee.governorate || null,
      employee.department_name || employee.department || null,
      employee.position_name || employee.position || null,
      employee.shift_id || null,
      employee.id
    ]);
  } else {
    // إضافة موظف جديد
    return runQuery(`
      INSERT INTO ${tables.employees}
      (employee_id, first_name, last_name, email, phone, address, birth_date,
       hire_date, department_id, position_id, salary, image, status,
       contract_type, allowances, gender, national_id,
       marital_status, governorate, department_name, position_name, shift_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      employee.employee_id || `EMP-${Date.now()}`,
      employee.first_name || '',
      employee.last_name || employee.first_name || '',
      employee.email || null,
      employee.phone || null,
      employee.address || null,
      employee.birth_date || null,
      employee.hire_date || new Date().toISOString().split('T')[0],
      employee.department_id || null,
      employee.position_id || null,
      employee.salary || 0,
      employee.image || null,
      employee.status || 'active',
      employee.contract_type || null,
      employee.allowances || 0,
      employee.gender || null,
      employee.national_id || null,
      employee.marital_status || null,
      employee.governorate || null,
      employee.department_name || employee.department || null,
      employee.position_name || employee.position || null,
      employee.shift_id || null,
    ]);
  }
}

// دوال للتعامل مع الحضور والانصراف
async function getAttendance(employeeId, month) {
  if (employeeId) {
    return getAll(`
      SELECT * FROM ${tables.attendance} 
      WHERE employee_id = ? AND strftime('%Y-%m', date) = ?
      ORDER BY date
    `, [employeeId, month]);
  } else {
    return getAll(`
      SELECT * FROM ${tables.attendance} 
      WHERE strftime('%Y-%m', date) = ?
      ORDER BY date
    `, [month]);
  }
}

async function saveAttendance(attendance) {
  if (attendance.id) {
    // تحديث سجل حضور موجود
    return runQuery(`
      UPDATE ${tables.attendance} 
      SET employee_id = ?, date = ?, check_in = ?, check_out = ?, 
          status = ?, notes = ?
      WHERE id = ?
    `, [
      attendance.employee_id, attendance.date, attendance.check_in,
      attendance.check_out, attendance.status, attendance.notes, attendance.id
    ]);
  } else {
    // إضافة سجل حضور جديد أو تحديث إذا كان موجودًا
    return runQuery(`
      INSERT OR REPLACE INTO ${tables.attendance} 
      (employee_id, date, check_in, check_out, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      attendance.employee_id, attendance.date, attendance.check_in,
      attendance.check_out, attendance.status, attendance.notes
    ]);
  }
}

// دوال للتعامل مع الرواتب
async function getPayrolls(month, year) {
  return getAll(`
    SELECT p.*, e.first_name, e.last_name, e.employee_id
    FROM ${tables.payroll} p
    JOIN ${tables.employees} e ON p.employee_id = e.id
    WHERE p.month = ? AND p.year = ?
    ORDER BY e.first_name, e.last_name
  `, [month, year]);
}

async function savePayroll(payroll) {
  if (payroll.id) {
    // تحديث سجل راتب موجود
    return runQuery(`
      UPDATE ${tables.payroll} 
      SET employee_id = ?, month = ?, year = ?, basic_salary = ?, 
          allowances = ?, deductions = ?, net_salary = ?, payment_date = ?, 
          status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      payroll.employee_id, payroll.month, payroll.year, payroll.basic_salary,
      payroll.allowances, payroll.deductions, payroll.net_salary,
      payroll.payment_date, payroll.status, payroll.id
    ]);
  } else {
    // إضافة سجل راتب جديد أو تحديث إذا كان موجودًا
    return runQuery(`
      INSERT OR REPLACE INTO ${tables.payroll} 
      (employee_id, month, year, basic_salary, allowances, deductions, net_salary, payment_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      payroll.employee_id, payroll.month, payroll.year, payroll.basic_salary,
      payroll.allowances, payroll.deductions, payroll.net_salary,
      payroll.payment_date, payroll.status
    ]);
  }
}

// دوال للتعامل مع السلف
async function getLoans(status = 'approved') {
  return getAll(`
    SELECT l.*, e.first_name, e.last_name, e.employee_id
    FROM ${tables.loans} l
    JOIN ${tables.employees} e ON l.employee_id = e.id
    WHERE l.status = ?
    ORDER BY l.created_at DESC
  `, [status]);
}

async function saveLoan(loan) {
  if (loan.id) {
    // تحديث سلفة موجودة
    return runQuery(`
      UPDATE ${tables.loans} 
      SET employee_id = ?, amount = ?, reason = ?, status = ?, 
          payment_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      loan.employee_id, loan.amount, loan.reason, loan.status,
      loan.payment_date, loan.id
    ]);
  } else {
    // إضافة سلفة جديدة
    return runQuery(`
      INSERT INTO ${tables.loans} 
      (employee_id, amount, reason, status, payment_date)
      VALUES (?, ?, ?, ?, ?)
    `, [
      loan.employee_id, loan.amount, loan.reason, loan.status,
      loan.payment_date
    ]);
  }
}

module.exports = {
  db,
  runQuery,
  getOne,
  getAll,
  runQueryAsync,
  getOneAsync,
  getAllAsync,
  initializeDatabase,
  getEmployees,
  getEmployeeById,
  saveEmployee,
  getAttendance,
  saveAttendance,
  getPayrolls,
  savePayroll,
  getLoans,
  saveLoan,
  tables
};
