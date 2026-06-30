const { getOne, runQuery, tables } = require('../../utils/db');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method Not Allowed' });
        return;
    }

    const { username, oldPassword, newPassword } = req.body;

    if (!username || !oldPassword || !newPassword) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
    }

    try {
        const user = await getOne(
            `SELECT id FROM ${tables.users} WHERE username = ? AND password = ?`,
            [username, oldPassword]
        );

        if (!user.success || !user.data) {
            res.status(401).json({ success: false, error: 'كلمة المرور القديمة غير صحيحة' });
            return;
        }

        const result = await runQuery(
            `UPDATE ${tables.users} SET password = ? WHERE id = ?`,
            [newPassword, user.data.id]
        );

        if (result.success) {
            res.status(200).json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
        return;
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
