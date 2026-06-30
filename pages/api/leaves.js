const { db, getAll, getOne, runQuery, tables } = require('../../utils/db');

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const result = await getAll(`
                SELECT l.*,
                       (e.first_name || ' ' || COALESCE(e.last_name, '')) AS employeeName,
                       l.leave_type AS type
                FROM ${tables.leaves} l
                JOIN ${tables.employees} e ON l.employee_id = e.id
                ORDER BY l.created_at DESC
            `);

            if (result.success) {
                const data = result.data.map(l => {
                    const start = new Date(l.start_date);
                    const end = new Date(l.end_date);
                    const diffTime = Math.abs(end - start);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    return { ...l, days: diffDays || 0 };
                });
                res.status(200).json({ success: true, data });
            } else {
                res.status(500).json({ success: false, error: result.error });
            }
            return;
        }

        if (req.method === 'POST') {
            const { employee_id, employeeId, leave_type, type, start_date, startDate, end_date, endDate, reason } = req.body;
            const finalEmployeeId = employeeId || employee_id;
            const finalType = type || leave_type;
            const finalStartDate = startDate || start_date;
            const finalEndDate = endDate || end_date;
            
            const result = await runQuery(`
                INSERT INTO ${tables.leaves} (employee_id, leave_type, start_date, end_date, reason, status)
                VALUES (?, ?, ?, ?, ?, 'pending')
            `, [finalEmployeeId, finalType, finalStartDate, finalEndDate, reason]);

            if (result.success) {
                res.status(201).json({ success: true, message: 'Leave request submitted' });
            } else {
                res.status(500).json({ success: false, error: result.error });
            }
            return;
        }

        // Handle PUT (update leave or leave status)
        if (req.method === 'PUT') {
            const { id, status, leave_type, start_date, end_date, reason } = req.body;
            
            if (!id) {
                res.status(400).json({ success: false, error: 'Leave ID is required' });
                return;
            }

            // Verify the leave exists
            const existing = await getOne(`SELECT id FROM ${tables.leaves} WHERE id = ?`, [id]);
            if (!existing.success || !existing.data) {
                res.status(404).json({ success: false, error: 'Leave not found' });
                return;
            }

            // If only status is provided, update just the status
            if (status && !leave_type && !start_date && !end_date) {
                const result = await runQuery(`
                    UPDATE ${tables.leaves} SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
                `, [status, id]);
                if (result.success && (result.data?.changes > 0 || result.data?.rowCount > 0)) {
                    res.status(200).json({ success: true, message: 'Leave status updated' });
                } else {
                    res.status(500).json({ success: false, error: result.error || 'Failed to update leave status' });
                }
                return;
            }

            // Full update
            const result = await runQuery(`
                UPDATE ${tables.leaves} SET leave_type = ?, start_date = ?, end_date = ?, reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `, [leave_type, start_date, end_date, reason, id]);
            if (result.success && (result.data?.changes > 0 || result.data?.rowCount > 0)) {
                res.status(200).json({ success: true, message: 'Leave updated successfully' });
            } else {
                res.status(500).json({ success: false, error: result.error || 'Failed to update leave' });
            }
            return;
        }

        // Handle DELETE
        if (req.method === 'DELETE') {
            const { id } = req.body;
            if (!id) {
                res.status(400).json({ success: false, error: 'Leave ID is required' });
                return;
            }

            // Verify the leave exists
            const existing = await getOne(`SELECT id FROM ${tables.leaves} WHERE id = ?`, [id]);
            if (!existing.success || !existing.data) {
                res.status(404).json({ success: false, error: 'Leave not found' });
                return;
            }

            const result = await runQuery(`DELETE FROM ${tables.leaves} WHERE id = ?`, [id]);
            if (result.success && (result.data?.changes > 0 || result.data?.rowCount > 0)) {
                res.status(200).json({ success: true, message: 'Leave deleted successfully' });
            } else {
                res.status(500).json({ success: false, error: result.error || 'Failed to delete leave' });
            }
            return;
        }

        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
