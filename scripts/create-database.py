
import sqlite3
import os
import sys

# تحديد ترميز الإخراج
if sys.stdout.encoding != 'utf-8':
    sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

# تحديد مسار قاعدة البيانات
db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'data.db')

# التأكد من وجود مجلد البيانات
os.makedirs(os.path.dirname(db_path), exist_ok=True)

# إنشاء اتصال بقاعدة البيانات
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# تفعيل المفاتيح الأجنبية
cursor.execute("PRAGMA foreign_keys = ON")

# إنشاء جدول المستخدمين
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# إنشاء جدول الأقسام
cursor.execute("""
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# إنشاء جدول المناصب
cursor.execute("""
CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    department_id INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
)
""")

# إنشاء جدول الموظفين
cursor.execute("""
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
)
""")

# إنشاء جدول أنواع الحضور
cursor.execute("""
CREATE TABLE IF NOT EXISTS attendance_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# إضافة أنواع الحضور الافتراضية
cursor.execute("""
INSERT OR IGNORE INTO attendance_types (type_name, description) 
VALUES ('حضور', 'تسجيل حضور الموظف'), ('انصراف', 'تسجيل انصراف الموظف')
""")

# إنشاء جدول إعدادات الحضور
cursor.execute("""
CREATE TABLE IF NOT EXISTS attendance_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# إضافة إعدادات افتراضية
cursor.execute("""
INSERT OR IGNORE INTO attendance_settings (setting_key, setting_value, description) 
VALUES 
('work_start_time', '08:00', 'وقت بدء العمل الافتراضي'),
('work_end_time', '17:00', 'وقت انتهاء العمل الافتراضي'),
('allow_duplicate_checkin', 'false', 'السماح بتسجيل الحضور أكثر من مرة في اليوم'),
('allow_duplicate_checkout', 'false', 'السماح بتسجيل الانصراف أكثر من مرة في اليوم')
""")

# إنشاء جدول الحضور والانصراف (من أجهزة البصمة)
cursor.execute("""
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
)
""")

# إنشاء جدول الحضور والانصراف اليدوي
cursor.execute("""
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
)
""")

# إنشاء جدول الإجازات
cursor.execute("""
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
)
""")

# إنشاء جدول الرواتب
cursor.execute("""
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
)
""")

# إنشاء جدول أجهزة البصمة
cursor.execute("""
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
)
""")

# إنشاء جدول السلف
cursor.execute("""
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
)
""")

# إنشاء جدول الإعدادات
cursor.execute("""
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# إضافة مستخدم افتراضي (admin)
cursor.execute("""
INSERT OR IGNORE INTO users (username, password, full_name, email, role)
VALUES ('admin', 'admin123', 'مدير النظام', 'admin@example.com', 'admin')
""")

# إضافة بعض الأقسام الافتراضية
cursor.execute("""
INSERT OR IGNORE INTO departments (name, description) 
VALUES 
('الموارد البشرية', 'قسم الموارد البشرية'),
('المالية', 'قسم المالية'),
('التقنية', 'قسم التقنية'),
('التسويق', 'قسم التسويق')
""")

# إضافة بعض المناصب الافتراضية
cursor.execute("""
INSERT OR IGNORE INTO positions (title, department_id, description) 
VALUES 
('مدير موارد بشرية', 1, 'مدير قسم الموارد البشرية'),
('موظف موارد بشرية', 1, 'موظف في قسم الموارد البشرية'),
('مدير مالي', 2, 'مدير قسم المالية'),
('محاسب', 2, 'محاسب في قسم المالية'),
('مدير تقني', 3, 'مدير قسم التقنية'),
('مطور برمجيات', 3, 'مطور برمجيات في قسم التقنية'),
('مدير تسويق', 4, 'مدير قسم التسويق'),
('مسوق', 4, 'مسوق في قسم التسويق')
""")

# إضافة بعض الموظفين الافتراضيين
cursor.execute("""
INSERT OR IGNORE INTO employees (employee_id, first_name, last_name, email, phone, hire_date, department_id, position_id, salary)
VALUES 
('EMP001', 'أحمد', 'محمد', 'ahmed@example.com', '0123456789', '2023-01-01', 1, 1, 10000),
('EMP002', 'فاطمة', 'علي', 'fatima@example.com', '0123456780', '2023-02-01', 2, 4, 8000),
('EMP003', 'عبدالله', 'خالد', 'abdullah@example.com', '0123456781', '2023-03-01', 3, 6, 12000),
('EMP004', 'مريم', 'سعيد', 'mariam@example.com', '0123456782', '2023-04-01', 4, 8, 7000)
""")

# حفظ التغييرات وإغلاق الاتصال
conn.commit()
conn.close()

print(f"تم إنشاء قاعدة البيانات بنجاح في: {db_path}")
