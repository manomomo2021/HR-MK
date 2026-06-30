const { getAll, runQuery, tables } = require('../../utils/db');

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    if (req.method !== 'GET') {
        res.status(405).end('Method Not Allowed');
        return;
    }

    try {
        console.log('[db-sync] Starting sync...');

        // 1. جلب الموظفين
        const employeesResult = await getAll(`
            SELECT
                e.*,
                e.employee_id                                    AS code,
                (e.first_name || ' ' || COALESCE(e.last_name,'')) AS name,
                e.birth_date                                     AS birthDate,
                e.hire_date                                      AS hireDate,
                e.salary                                         AS basicSalary,
                COALESCE(e.contract_type,  '')                   AS contractType,
                COALESCE(e.national_id,    '')                   AS nationalId,
                COALESCE(e.marital_status, '')                   AS maritalStatus,
                COALESCE(e.governorate,    '')                   AS governorate,
                COALESCE(e.allowances, 0)                        AS allowances,
                COALESCE(e.department_name, '')                  AS department,
                COALESCE(e.position_name,   '')                  AS position
            FROM ${tables.employees} e
        `);

        // 2. جلب بقية الجداول
        const attendance = await getAll(`SELECT * FROM ${tables.attendance}`);
        const payroll = await getAll(`SELECT * FROM ${tables.payroll}`);
        const loans = await getAll(`SELECT * FROM ${tables.loans}`);

        // 3. جلب الإجازات مع حساب المدة برمجياً
        const leavesRaw = await getAll(`
            SELECT l.*,
                   e.first_name || ' ' || COALESCE(e.last_name, '') AS employeeName,
                   l.leave_type AS type
            FROM ${tables.leaves} l
            JOIN ${tables.employees} e ON l.employee_id = e.id
            ORDER BY l.created_at DESC
        `);

        const leaves = leavesRaw.success ? leavesRaw.data.map(l => {
            const start = new Date(l.start_date);
            const end = new Date(l.end_date);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return { ...l, days: diffDays || 0 };
        }) : [];

        const biometric_devices = await getAll(`SELECT * FROM ${tables.biometric_devices}`);

        res.status(200).json({
            success: true,
            data: {
                employees: employeesResult.data || [],
                attendance: attendance.data || [],
                payroll: payroll.data || [],
                loans: loans.data || [],
                leaves: leaves,
                devices: biometric_devices.data || [],
                settings: {}
            }
        });
    } catch (error) {
        console.error('[db-sync] fatal error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
