const { getAll, runQuery, tables } = require('../../utils/db');

export default async function handler(req, res) {
    const { method } = req;

    switch (method) {
        case 'GET':
            try {
                const result = await getAll(`SELECT id, username, full_name as name, email, role, department, employee_id as employeeId, phone, custom_permissions as customPermissions, status, created_at as createdAt, updated_at as updatedAt FROM ${tables.users} ORDER BY created_at DESC`);

                if (result.success) {
                    const parsedUsers = result.data.map(user => ({
                        ...user,
                        customPermissions: user.customPermissions ? JSON.parse(user.customPermissions) : []
                    }));
                    res.status(200).json({ success: true, data: parsedUsers });
                } else {
                    res.status(500).json({ success: false, error: result.error });
                }
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
            break;

        case 'POST':
            try {
                const { username, password, name, email, role, department, employeeId, phone, customPermissions } = req.body;

                if (!username || !password || !name || !role) {
                    res.status(400).json({ success: false, error: 'Missing required fields' });
                    return;
                }

                const result = await runQuery(
                    `INSERT INTO ${tables.users} (username, password, full_name, email, role, department, employee_id, phone, custom_permissions, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [username, password, name, email, role, department, employeeId, phone, JSON.stringify(customPermissions || []), 'active']
                );

                if (result.success) {
                    res.status(201).json({ success: true, data: { id: result.data.lastInsertRowid } });
                } else {
                    res.status(400).json({ success: false, error: result.error });
                }
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
            break;

        case 'PUT':
            try {
                const { id, username, password, name, email, role, department, employeeId, phone, customPermissions, status } = req.body;

                if (!id) {
                    return res.status(400).json({ success: false, error: 'User ID is required' });
                }

                let query = `UPDATE ${tables.users} SET username = ?, full_name = ?, email = ?, role = ?, department = ?, employee_id = ?, phone = ?, custom_permissions = ?, status = ?`;
                let params = [username, name, email, role, department, employeeId, phone, JSON.stringify(customPermissions || []), status || 'active'];

                if (password) {
                    query += `, password = ?`;
                    params.push(password);
                }

                query += ` WHERE id = ?`;
                params.push(id);

                const result = await runQuery(query, params);

                if (result.success) {
                    res.status(200).json({ success: true });
                } else {
                    res.status(400).json({ success: false, error: result.error });
                }
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
            break;

        case 'DELETE':
            try {
                const { id } = req.body;

                if (!id) {
                    res.status(400).json({ success: false, error: 'User ID is required' });
                    return;
                }

                const result = await runQuery(`DELETE FROM ${tables.users} WHERE id = ?`, [id]);

                if (result.success) {
                    res.status(200).json({ success: true });
                } else {
                    res.status(400).json({ success: false, error: result.error });
                }
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
            break;

        default:
            res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
            res.status(405).end(`Method ${method} Not Allowed`);
    }
}
