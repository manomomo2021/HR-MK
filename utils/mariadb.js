
const { executeQuery, getOne, getAll, executeTransaction } = require('../config/mariadb');

// أسماء الجداول
const tables = {
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
};

// دالة لإنشاء جداول قاعدة البيانات
async function initializeDatabase() {
  try {
    // جدول المستخدمين
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${tables.users} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        department VARCHAR(100),
        employee_id VARCHAR(50),
        phone VARCHAR(20),
        custom_permissions LONGTEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // إضافة الأعمدة المفقودة في حال كان الجدول موجوداً مسبقاً
    const usersExtraColumns = [
      { col: 'department', def: 'VARCHAR(100)' },
      { col: 'employee_id', def: 'VARCHAR(50)' },
      { col: 'phone', def: 'VARCHAR(20)' },
      { col: 'custom_permissions', def: 'LONGTEXT' },
      { col: 'status', def: "VARCHAR(20) DEFAULT 'active'" },
    ];

    for (const { col, def } of usersExtraColumns) {
      try {
        await executeQuery(`ALTER TABLE ${tables.users} ADD COLUMN ${col} ${def}`);
      } catch (e) {
        // الأعمدة موجودة بالفعل أو خطأ آخر — نتجاهلها في مرحلة التهيئة
      }
    }

    // جدول الأقسام
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${tables.departments} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // جدول المناصب
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${tables.positions} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        department_id INT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES ${tables.departments}(id) ON DELETE SET NULL,
        INDEX idx_title (title)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // جدول الموظفين
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${tables.employees} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(20) NOT NULL UNIQUE,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        birth_date DATE,
        hire_date DATE NOT NULL,
        department_id INT,
        position_id INT,
        salary DECIMAL(10, 2),
        image VARCHAR(255),
        contract_type VARCHAR(50),
        allowances DECIMAL(10, 2) DEFAULT 0,
        gender VARCHAR(10),
        national_id VARCHAR(50),
        marital_status VARCHAR(50),
        governorate VARCHAR(50),
        department_name VARCHAR(100),
        position_name VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES ${tables.departments}(id) ON DELETE SET NULL,
        FOREIGN KEY (position_id) REFERENCES ${tables.positions}(id) ON DELETE SET NULL,
        INDEX idx_employee_id (employee_id),
        INDEX idx_name (first_name, last_name),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // إضافة الأعمدة المفقودة في حال كان الجدول موجوداً مسبقاً
    const employeeExtraColumns = [
      { col: 'contract_type', def: 'VARCHAR(50)' },
      { col: 'allowances', def: 'DECIMAL(10, 2) DEFAULT 0' },
      { col: 'gender', def: 'VARCHAR(10)' },
      { col: 'national_id', def: 'VARCHAR(50)' },
      { col: 'marital_status', def: 'VARCHAR(50)' },
      { col: 'governorate', def: 'VARCHAR(50)' },
      { col: 'department_name', def: 'VARCHAR(100)' },
      { col: 'position_name', def: 'VARCHAR(100)' },
      { col: 'status', def: "VARCHAR(20) DEFAULT 'active'" },
    ];

    for (const { col, def } of employeeExtraColumns) {
      try {
        await executeQuery(`ALTER TABLE ${tables.employees} ADD COLUMN ${col} ${def}`);
      } catch (e) {
        // الأعمدة موجودة بالفعل
      }
    }

    // جدول أنواع الحضور
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${tables.attendance_types} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type_name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_type_name (type_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // إضافة أنواع الحضور الافتراضية
    await executeQuery(`
      INSERT IGNORE INTO ${tables.attendance_types} (type_name, description) 
      VALUES ('حضور', 'تسجيل حضور الموظف'), ('انصراف', 'تسجيل انصراف الموظف')
    `);

    // جدول إعدادات الحضور
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${tables.attendance_settings} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(50) NOT NULL UNIQUE,
        setting_value TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_setting_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // إضافة إعدادات افتراضية
    await executeQuery(`
      INSERT IGNORE INTO ${tables.attendance_settings} (setting_key, setting_value, description) 
      VALUES 
      ('work_start_time', '08:00', 'وقت بدء العمل الافتراضي'),
      ('work_end_time', '17:00', 'وقت انتهاء العمل الافتراضي'),
      ('allow_duplicate_checkin', 'false', 'السماح بتسجيل الحضور أكثر من مرة في اليوم'),
      ('allow_duplicate_checkout', 'false', 'السماح بتسجيل الانصراف أكثر من مرة في اليوم')
    `);

    // جدول الحضور والانصراف (من أجهزة البصمة)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${tables.attendance} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        date DATE NOT NULL,
        check_in TIME,
        check_out TIME,
        device_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
        UNIQUE KEY idx_employee_date (employee_id, date),
        INDEX idx_date (date),
        INDEX idx_employee_id (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // جدول الحضور والانصراف اليدوي
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${tables.manual_attendance} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        date DATE NOT NULL,
        check_in TIME,
        check_out TIME,
        type_id INT NOT NULL,
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
        FOREIGN KEY (type_id) REFERENCES ${tables.attendance_types}(id) ON DELETE RESTRICT,
        UNIQUE KEY idx_employee_date_type (employee_id, date, type_id),
        INDEX idx_date (date),
        INDEX idx_employee_id (employee_id),
        INDEX idx_type_id (type_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // جدول الإجازات
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${tables.leaves} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
        INDEX idx_employee_id (employee_id),
        INDEX idx_dates (start_date, end_date),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // جدول الرواتب
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${tables.payroll} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        basic_salary DECIMAL(10, 2) NOT NULL,
        allowances DECIMAL(10, 2) DEFAULT 0,
        deductions DECIMAL(10, 2) DEFAULT 0,
        net_salary DECIMAL(10, 2) NOT NULL,
        payment_date DATE,
        status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
        UNIQUE KEY idx_employee_month_year (employee_id, month, year),
        INDEX idx_month_year (month, year),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // جدول أجهزة البصمة
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${tables.biometric_devices} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        ip_address VARCHAR(15) NOT NULL,
        port INT NOT NULL,
        device_id VARCHAR(50),
        status ENUM('active', 'inactive') DEFAULT 'inactive',
        last_sync TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ip_address (ip_address),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // جدول السلف
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${tables.loans} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        reason TEXT,
        status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
        payment_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
        INDEX idx_employee_id (employee_id),
        INDEX idx_status (status),
        INDEX idx_payment_date (payment_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // جدول الإعدادات
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${tables.settings} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(50) NOT NULL UNIQUE,
        setting_value TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_setting_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // إضافة مستخدم مسؤول افتراضي أو تحديثه لضمان عمل تسجيل الدخول
    await executeQuery(`
      INSERT INTO ${tables.users} 
      (username, password, full_name, role, status) 
      VALUES ('admin', 'admin', 'مدير النظام', 'admin', 'active')
      ON DUPLICATE KEY UPDATE 
      password = VALUES(password),
      status = 'active'
    `);

    console.log('MariaDB database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error: error.message };
  }
}

// دالة للتحقق من وجود سجل حضور لموظف في يوم معين
async function hasAttendanceRecord(employeeId, date) {
  return getOne(`
    SELECT COUNT(*) as count FROM ${tables.attendance} 
    WHERE employee_id = ? AND date = ?
  `, [employeeId, date]);
}

// دالة للتحقق من وجود سجل حضور يدوي لموظف في يوم معين
async function hasManualAttendanceRecord(employeeId, date, typeId) {
  return getOne(`
    SELECT COUNT(*) as count FROM ${tables.manual_attendance} 
    WHERE employee_id = ? AND date = ? AND type_id = ?
  `, [employeeId, date, typeId]);
}

// دالة للتحقق من وجود أي سجل حضور (عادي أو يدوي) لموظف في يوم معين
async function hasAnyAttendanceRecord(employeeId, date) {
  const attendanceResult = await hasAttendanceRecord(employeeId, date);
  const manualResult = await getOne(`
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
async function addAttendance(employeeId, date, checkIn, checkOut, deviceId = null) {
  // التحقق من وجود سجل سابق
  const existingRecord = await hasAttendanceRecord(employeeId, date);

  if (existingRecord.success && existingRecord.data.count > 0) {
    // تحديث السجل الموجود
    return executeQuery(`
      UPDATE ${tables.attendance} 
      SET check_in = ?, check_out = ?, device_id = ?
      WHERE employee_id = ? AND date = ?
    `, [checkIn, checkOut, deviceId, employeeId, date]);
  } else {
    // إضافة سجل جديد
    return executeQuery(`
      INSERT INTO ${tables.attendance} (employee_id, date, check_in, check_out, device_id)
      VALUES (?, ?, ?, ?, ?)
    `, [employeeId, date, checkIn, checkOut, deviceId]);
  }
}

// دالة لإضافة سجل حضور يدوي
async function addManualAttendance(employeeId, date, checkIn, checkOut, typeId, notes = null, createdBy = null) {
  // التحقق من وجود سجل سابق من نفس النوع
  const existingRecord = await hasManualAttendanceRecord(employeeId, date, typeId);

  if (existingRecord.success && existingRecord.data.count > 0) {
    // تحديث السجل الموجود
    return executeQuery(`
      UPDATE ${tables.manual_attendance} 
      SET check_in = ?, check_out = ?, notes = ?
      WHERE employee_id = ? AND date = ? AND type_id = ?
    `, [checkIn, checkOut, notes, employeeId, date, typeId]);
  } else {
    // إضافة سجل جديد
    return executeQuery(`
      INSERT INTO ${tables.manual_attendance} (employee_id, date, check_in, check_out, type_id, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [employeeId, date, checkIn, checkOut, typeId, notes, createdBy]);
  }
}

// دالة للحصول على جميع سجلات الحضور لموظف في شهر معين
async function getEmployeeAttendance(employeeId, year, month) {
  return getAll(`
    SELECT a.*, 
           e.employee_id, e.first_name, e.last_name, e.department, e.position
    FROM ${tables.attendance} a
    JOIN ${tables.employees} e ON a.employee_id = e.id
    WHERE a.employee_id = ? AND YEAR(a.date) = ? AND MONTH(a.date) = ?
    ORDER BY a.date
  `, [employeeId, year, month]);
}

// دالة للحصول على جميع سجلات الحضور اليدوي لموظف في شهر معين
async function getEmployeeManualAttendance(employeeId, year, month) {
  return getAll(`
    SELECT ma.*, 
           e.employee_id, e.first_name, e.last_name, e.department, e.position,
           at.type_name, at.description
    FROM ${tables.manual_attendance} ma
    JOIN ${tables.employees} e ON ma.employee_id = e.id
    JOIN ${tables.attendance_types} at ON ma.type_id = at.id
    WHERE ma.employee_id = ? AND YEAR(ma.date) = ? AND MONTH(ma.date) = ?
    ORDER BY ma.date, ma.type_id
  `, [employeeId, year, month]);
}

// دالة للحصول على جميع سجلات الحضور (العادي واليدوي) لموظف في شهر معين
async function getEmployeeAllAttendance(employeeId, year, month) {
  const attendance = await getEmployeeAttendance(employeeId, year, month);
  const manualAttendance = await getEmployeeManualAttendance(employeeId, year, month);

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
async function getAllEmployees() {
  return getAll(`
    SELECT * FROM ${tables.employees}
    WHERE status = 'active'
    ORDER BY first_name, last_name
  `);
}

// دالة لإضافة موظف جديد
async function addEmployee(employee) {
  return executeQuery(`
    INSERT INTO ${tables.employees} (employee_id, first_name, last_name, email, phone, address, birth_date, hire_date, department_id, position_id, salary, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    employee.employee_id, employee.first_name, employee.last_name,
    employee.email, employee.phone, employee.address,
    employee.birth_date, employee.hire_date, employee.department_id,
    employee.position_id, employee.salary, employee.image
  ]);
}

// دالة لتحديث بيانات موظف
async function updateEmployee(employeeId, employeeData) {
  return executeQuery(`
    UPDATE ${tables.employees} 
    SET employee_id = ?, first_name = ?, last_name = ?, email = ?, phone = ?, 
        address = ?, birth_date = ?, hire_date = ?, department_id = ?, 
        position_id = ?, salary = ?, image = ?
    WHERE id = ?
  `, [
    employeeData.employee_id, employeeData.first_name, employeeData.last_name,
    employeeData.email, employeeData.phone, employeeData.address,
    employeeData.birth_date, employeeData.hire_date, employeeData.department_id,
    employeeData.position_id, employeeData.salary, employeeData.image, employeeId
  ]);
}

// دالة للحصول على إعدادات الحضور
async function getAttendanceSettings() {
  const settings = await getAll(`
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
    return executeQuery(`
      UPDATE ${tables.payroll} 
      SET employee_id = ?, month = ?, year = ?, basic_salary = ?, 
          allowances = ?, deductions = ?, net_salary = ?, payment_date = ?, 
          status = ?
      WHERE id = ?
    `, [
      payroll.employee_id, payroll.month, payroll.year, payroll.basic_salary,
      payroll.allowances, payroll.deductions, payroll.net_salary,
      payroll.payment_date, payroll.status, payroll.id
    ]);
  } else {
    // إضافة سجل راتب جديد أو تحديث إذا كان موجودًا
    return executeQuery(`
      INSERT INTO ${tables.payroll} 
      (employee_id, month, year, basic_salary, allowances, deductions, net_salary, payment_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        basic_salary = VALUES(basic_salary),
        allowances = VALUES(allowances),
        deductions = VALUES(deductions),
        net_salary = VALUES(net_salary),
        payment_date = VALUES(payment_date),
        status = VALUES(status)
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
    return executeQuery(`
      UPDATE ${tables.loans} 
      SET employee_id = ?, amount = ?, reason = ?, status = ?, 
          payment_date = ?
      WHERE id = ?
    `, [
      loan.employee_id, loan.amount, loan.reason, loan.status,
      loan.payment_date, loan.id
    ]);
  } else {
    // إضافة سلفة جديدة
    return executeQuery(`
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
  runQuery: executeQuery,
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
  getPayrolls,
  savePayroll,
  getLoans,
  saveLoan,
  tables
};
