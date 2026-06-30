const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'data.db');
const db = new Database(dbPath);

console.log(`إنشاء قاعدة البيانات في: ${dbPath}`);

db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    department_id INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS employees (
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
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO attendance_types (type_name, description) 
VALUES ('حضور', 'تسجيل حضور الموظف'), ('انصراف', 'تسجيل انصراف الموظف');

CREATE TABLE IF NOT EXISTS attendance_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO attendance_settings (setting_key, setting_value, description) 
VALUES 
('work_start_time', '08:00', 'وقت بدء العمل الافتراضي'),
('work_end_time', '17:00', 'وقت انتهاء العمل الافتراضي'),
('allow_duplicate_checkin', 'false', 'السماح بتسجيل الحضور أكثر من مرة في اليوم'),
('allow_duplicate_checkout', 'false', 'السماح بتسجيل الانصراف أكثر من مرة في اليوم');

CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    device_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS manual_attendance (
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
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES attendance_types(id) ON DELETE RESTRICT,
    UNIQUE(employee_id, date, type_id)
);

CREATE TABLE IF NOT EXISTS leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payroll (
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
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(employee_id, month, year)
);

CREATE TABLE IF NOT EXISTS biometric_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    port INTEGER NOT NULL,
    device_id TEXT,
    status TEXT DEFAULT 'inactive',
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO users (username, password, full_name, email, role)
VALUES ('admin', 'admin123', 'مدير النظام', 'admin@example.com', 'admin');

INSERT OR IGNORE INTO departments (name, description) 
VALUES 
('الموارد البشرية', 'قسم الموارد البشرية'),
('المالية', 'قسم المالية'),
('التقنية', 'قسم التقنية'),
('التسويق', 'قسم التسويق');

INSERT OR IGNORE INTO positions (title, department_id, description) 
VALUES 
('مدير موارد بشرية', 1, 'مدير قسم الموارد البشرية'),
('موظف موارد بشرية', 1, 'موظف في قسم الموارد البشرية'),
('مدير مالي', 2, 'مدير قسم المالية'),
('محاسب', 2, 'محاسب في قسم المالية'),
('مدير تقني', 3, 'مدير قسم التقنية'),
('مطور برمجيات', 3, 'مطور برمجيات في قسم التقنية'),
('مدير تسويق', 4, 'مدير قسم التسويق'),
('مسوق', 4, 'مسوق في قسم التسويق');

INSERT OR IGNORE INTO employees (employee_id, first_name, last_name, email, phone, hire_date, department_id, position_id, salary)
VALUES 
('EMP001', 'أحمد', 'محمد', 'ahmed@example.com', '0123456789', '2023-01-01', 1, 1, 10000),
('EMP002', 'فاطمة', 'علي', 'fatima@example.com', '0123456780', '2023-02-01', 2, 4, 8000),
('EMP003', 'عبدالله', 'خالد', 'abdullah@example.com', '0123456781', '2023-03-01', 3, 6, 12000),
('EMP004', 'مريم', 'سعيد', 'mariam@example.com', '0123456782', '2023-04-01', 4, 8, 7000);
`);

console.log('تم إنشاء الجداول وإدخال البيانات الافتراضية بنجاح.');
db.close();
