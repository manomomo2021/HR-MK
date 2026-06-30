// utils/postgres.js
// PostgreSQL implementation for the unified DB bridge.
// Supports DATABASE_URL (Neon/Vercel) and legacy DB_* env vars.

const { Pool } = require('pg');
const { tables } = require('../config/database');

const connectionString = process.env.DATABASE_URL;
const hasLegacyConfig = !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);
const isVercelRuntime = !!process.env.VERCEL;

if (!connectionString && !hasLegacyConfig) {
    console.warn('[POSTGRES] Missing DB config. Set DATABASE_URL (recommended) or DB_HOST/DB_USER/DB_NAME.');
}

let pool = null;

function getPool() {
    if (pool) return pool;

    if (connectionString) {
        pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
        });
        return pool;
    }

    if (hasLegacyConfig) {
        pool = new Pool({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 5432),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        });
        return pool;
    }

    const envHint = isVercelRuntime ? 'on Vercel project settings' : 'in your .env.local';
    throw new Error(`PostgreSQL config missing: set DATABASE_URL ${envHint}`);
}

function normalizeQuery(query, params = []) {
    if (!Array.isArray(params) || params.length === 0 || !query.includes('?')) {
        return query;
    }

    let index = 0;
    return query.replace(/\?/g, () => {
        index += 1;
        return `$${index}`;
    });
}

async function execute(query, params = []) {
    try {
        const normalizedQuery = normalizeQuery(query, params);
        const client = getPool();
        const { rows, rowCount } = await client.query(normalizedQuery, params);
        return { success: true, data: rows, rowCount };
    } catch (err) {
        console.error('[POSTGRES] Query error:', err);
        return { success: false, error: err.message };
    }
}

async function runQuery(query, params = []) {
    const isInsert = /^\s*insert\b/i.test(query) && !/\breturning\b/i.test(query);
    const queryForRun = isInsert ? `${query.trim().replace(/;$/, '')} RETURNING id` : query;
    const result = await execute(queryForRun, params);
    if (!result.success) return result;

    const data = { rowCount: result.rowCount || 0 };
    if (isInsert) {
        data.lastInsertRowid = result.data?.[0]?.id ?? null;
    }
    return { success: true, data };
}

async function getOne(query, params) {
    const result = await execute(query, params);
    if (!result.success) return result;
    if (result.data.length > 0) return { success: true, data: result.data[0] };
    return { success: true, data: null };
}

async function getAll(query, params) {
    const result = await execute(query, params);
    if (!result.success) return result;
    return { success: true, data: result.data };
}

async function initializeDatabase() {
    try {
        const client = getPool();
        await client.query('SELECT 1');

        const statements = [
            `CREATE TABLE IF NOT EXISTS ${tables.users} (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                email TEXT,
                role TEXT NOT NULL DEFAULT 'user',
                department TEXT,
                employee_id INTEGER,
                phone TEXT,
                custom_permissions TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS shifts (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                name_ar TEXT,
                start_time TEXT NOT NULL DEFAULT '08:00',
                end_time TEXT NOT NULL DEFAULT '17:00',
                grace_minutes INTEGER DEFAULT 15,
                break_minutes INTEGER DEFAULT 60,
                working_days INTEGER DEFAULT 5,
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS ${tables.departments} (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS ${tables.positions} (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                department_id INTEGER REFERENCES ${tables.departments}(id) ON DELETE SET NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS ${tables.employees} (
                id SERIAL PRIMARY KEY,
                employee_id TEXT NOT NULL UNIQUE,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                address TEXT,
                birth_date DATE,
                hire_date DATE NOT NULL,
                department_id INTEGER REFERENCES ${tables.departments}(id) ON DELETE SET NULL,
                position_id INTEGER REFERENCES ${tables.positions}(id) ON DELETE SET NULL,
                salary DOUBLE PRECISION DEFAULT 0,
                image TEXT,
                contract_type TEXT,
                allowances DOUBLE PRECISION DEFAULT 0,
                gender TEXT,
                national_id TEXT,
                marital_status TEXT,
                governorate TEXT,
                department_name TEXT,
                position_name TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `ALTER TABLE ${tables.employees} ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES shifts(id) ON DELETE SET NULL`,
            `INSERT INTO shifts (name, name_ar, start_time, end_time, grace_minutes, break_minutes, working_days, is_default)
             VALUES ('Morning', 'صباحي', '08:00', '17:00', 15, 60, 5, true)
             ON CONFLICT (name) DO NOTHING`,
            `INSERT INTO shifts (name, name_ar, start_time, end_time, grace_minutes, break_minutes, working_days, is_default)
             VALUES ('Evening', 'مسائي', '14:00', '23:00', 15, 60, 5, false)
             ON CONFLICT (name) DO NOTHING`,
            `CREATE TABLE IF NOT EXISTS attendance_events (
                id SERIAL PRIMARY KEY,
                event_id TEXT UNIQUE,
                employee_id INTEGER NOT NULL REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
                event_type TEXT NOT NULL,
                source TEXT NOT NULL,
                date DATE NOT NULL,
                time TIME NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                device_name TEXT,
                ip_address TEXT,
                mac_address TEXT,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                notes TEXT,
                reason TEXT,
                status TEXT DEFAULT 'active',
                created_by INTEGER
            )`,
            `CREATE TABLE IF NOT EXISTS daily_attendance_summary (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
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
                missing_check_in BOOLEAN DEFAULT FALSE,
                missing_check_out BOOLEAN DEFAULT FALSE,
                last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (employee_id, date)
            )`,
            `CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                table_name TEXT NOT NULL,
                record_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                changed_by INTEGER,
                reason TEXT,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS ${tables.attendance} (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                check_in TIME,
                check_out TIME,
                status TEXT DEFAULT 'present',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (employee_id, date)
            )`,
            `CREATE TABLE IF NOT EXISTS ${tables.manual_attendance} (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                check_in TIME,
                check_out TIME,
                type_id INTEGER,
                notes TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS ${tables.leaves} (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
                leave_type TEXT NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS ${tables.payroll} (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
                month INTEGER NOT NULL,
                year INTEGER NOT NULL,
                basic_salary DOUBLE PRECISION NOT NULL,
                allowances DOUBLE PRECISION DEFAULT 0,
                deductions DOUBLE PRECISION DEFAULT 0,
                net_salary DOUBLE PRECISION NOT NULL,
                payment_date DATE,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (employee_id, month, year)
            )`,
            `CREATE TABLE IF NOT EXISTS ${tables.biometric_devices} (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                ip_address TEXT NOT NULL,
                port INTEGER NOT NULL,
                device_id TEXT,
                status TEXT DEFAULT 'inactive',
                last_sync TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS ${tables.settings} (
                id SERIAL PRIMARY KEY,
                key TEXT NOT NULL UNIQUE,
                value TEXT,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS ${tables.attendance_types} (
                id SERIAL PRIMARY KEY,
                type_name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS ${tables.attendance_settings} (
                id SERIAL PRIMARY KEY,
                setting_key TEXT NOT NULL UNIQUE,
                setting_value TEXT,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS ${tables.loans} (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES ${tables.employees}(id) ON DELETE CASCADE,
                amount DOUBLE PRECISION NOT NULL,
                reason TEXT,
                status TEXT DEFAULT 'approved',
                payment_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `INSERT INTO ${tables.users} (username, password, full_name, role)
             VALUES ('admin', 'admin', 'System Admin', 'admin')
             ON CONFLICT (username) DO NOTHING`,
        ];

        for (const statement of statements) {
            await client.query(statement);
        }

        console.log('[POSTGRES] Connection verified and schema initialized');
        return { success: true };
    } catch (e) {
        console.error('[POSTGRES] Initialization error:', e);
        return { success: false, error: e.message };
    }
}

async function getEmployees() {
    return getAll(`
      SELECT 
        e.*,
        e.employee_id AS code,
        e.first_name || ' ' || COALESCE(e.last_name, '') AS name,
        e.birth_date AS "birthDate",
        e.hire_date AS "hireDate",
        e.salary AS "basicSalary",
        COALESCE(d.name, e.department_id::text, '') AS department,
        COALESCE(p.title, e.position_id::text, '') AS position,
        s.id AS shift_id,
        s.name AS shift_name,
        s.start_time AS shift_start,
        s.end_time AS shift_end,
        s.grace_minutes AS shift_grace
      FROM ${tables.employees} e
      LEFT JOIN ${tables.departments} d ON e.department_id = d.id
      LEFT JOIN ${tables.positions} p ON e.position_id = p.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      WHERE e.status = 'active'
    `);
}

async function getEmployeeById(id) {
    return getOne(`
      SELECT 
        e.*,
        e.employee_id AS code,
        e.first_name || ' ' || COALESCE(e.last_name, '') AS name,
        e.birth_date AS "birthDate",
        e.hire_date AS "hireDate",
        e.salary AS "basicSalary",
        COALESCE(d.name, '') AS department,
        COALESCE(p.title, '') AS position,
        s.id AS shift_id,
        s.name AS shift_name,
        s.start_time AS shift_start,
        s.end_time AS shift_end,
        s.grace_minutes AS shift_grace
      FROM ${tables.employees} e
      LEFT JOIN ${tables.departments} d ON e.department_id = d.id
      LEFT JOIN ${tables.positions} p ON e.position_id = p.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      WHERE e.id = ?
    `, [id]);
}

async function saveEmployee(employee) {
    if (employee.id) {
        return runQuery(`
          UPDATE ${tables.employees}
          SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ?,
              birth_date = ?, hire_date = ?, department_id = ?, position_id = ?,
              salary = ?, image = ?, status = ?, contract_type = ?, allowances = ?,
              gender = ?, national_id = ?, marital_status = ?, governorate = ?,
              department_name = ?, position_name = ?, shift_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
            employee.first_name, employee.last_name, employee.email, employee.phone,
            employee.address, employee.birth_date, employee.hire_date, employee.department_id,
            employee.position_id, employee.salary, employee.image, employee.status || 'active',
            employee.contract_type || null, employee.allowances || 0, employee.gender || null,
            employee.national_id || null, employee.marital_status || null, employee.governorate || null,
            employee.department_name || employee.department || null,
            employee.position_name || employee.position || null, employee.shift_id || null, employee.id,
        ]);
    }

    return runQuery(`
      INSERT INTO ${tables.employees}
      (employee_id, first_name, last_name, email, phone, address, birth_date, hire_date,
       department_id, position_id, salary, image, status, contract_type, allowances,
       gender, national_id, marital_status, governorate, department_name, position_name, shift_id)
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

async function getAttendance(employeeId, month) {
    if (employeeId) {
        return getAll(`
          SELECT * FROM ${tables.attendance}
          WHERE employee_id = ? AND TO_CHAR(date, 'YYYY-MM') = ?
          ORDER BY date
        `, [employeeId, month]);
    }

    return getAll(`
      SELECT * FROM ${tables.attendance}
      WHERE TO_CHAR(date, 'YYYY-MM') = ?
      ORDER BY date
    `, [month]);
}

async function saveAttendance(attendance) {
    if (attendance.id) {
        return runQuery(`
          UPDATE ${tables.attendance}
          SET employee_id = ?, date = ?, check_in = ?, check_out = ?, status = ?, notes = ?
          WHERE id = ?
        `, [
            attendance.employee_id, attendance.date, attendance.check_in,
            attendance.check_out, attendance.status, attendance.notes, attendance.id,
        ]);
    }

    return runQuery(`
      INSERT INTO ${tables.attendance} (employee_id, date, check_in, check_out, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (employee_id, date) DO UPDATE SET
        check_in = EXCLUDED.check_in,
        check_out = EXCLUDED.check_out,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes
    `, [
        attendance.employee_id, attendance.date, attendance.check_in,
        attendance.check_out, attendance.status, attendance.notes,
    ]);
}

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
        return runQuery(`
          UPDATE ${tables.payroll}
          SET employee_id = ?, month = ?, year = ?, basic_salary = ?, allowances = ?,
              deductions = ?, net_salary = ?, payment_date = ?, status = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
            payroll.employee_id, payroll.month, payroll.year, payroll.basic_salary,
            payroll.allowances, payroll.deductions, payroll.net_salary,
            payroll.payment_date, payroll.status, payroll.id,
        ]);
    }

    return runQuery(`
      INSERT INTO ${tables.payroll}
      (employee_id, month, year, basic_salary, allowances, deductions, net_salary, payment_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (employee_id, month, year) DO UPDATE SET
        basic_salary = EXCLUDED.basic_salary,
        allowances = EXCLUDED.allowances,
        deductions = EXCLUDED.deductions,
        net_salary = EXCLUDED.net_salary,
        payment_date = EXCLUDED.payment_date,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `, [
        payroll.employee_id, payroll.month, payroll.year, payroll.basic_salary,
        payroll.allowances, payroll.deductions, payroll.net_salary,
        payroll.payment_date, payroll.status,
    ]);
}

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
        return runQuery(`
          UPDATE ${tables.loans}
          SET employee_id = ?, amount = ?, reason = ?, status = ?,
              payment_date = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
            loan.employee_id, loan.amount, loan.reason, loan.status,
            loan.payment_date, loan.id,
        ]);
    }

    return runQuery(`
      INSERT INTO ${tables.loans} (employee_id, amount, reason, status, payment_date)
      VALUES (?, ?, ?, ?, ?)
    `, [
        loan.employee_id, loan.amount, loan.reason, loan.status, loan.payment_date,
    ]);
}

module.exports = {
    runQuery,
    getOne,
    getAll,
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
    tables,
    getPool,
};
