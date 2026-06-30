const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(process.cwd(), 'data', 'data.db');

if (!fs.existsSync(DB_PATH)) {
    console.error('Database file not found at:', DB_PATH);
    process.exit(1);
}

const db = new Database(DB_PATH);

try {
    console.log('--- REPAIRING USER STATUSES ---');
    const users = db.prepare("SELECT id, username, status FROM users").all();
    console.log('Current users:', users.length);

    const updateStmt = db.prepare("UPDATE users SET status = 'active' WHERE id = ?");

    for (const user of users) {
        console.log(`Checking user: ${user.username} (status: ${user.status})`);
        if (user.status !== 'active') {
            const result = updateStmt.run(user.id);
            console.log(`Updated user ${user.username} - changes: ${result.changes}`);
        }
    }

    console.log('--- VERIFICATION ---');
    const updatedUsers = db.prepare("SELECT id, username, status FROM users").all();
    console.table(updatedUsers);

} catch (error) {
    console.error('Repair failed:', error);
} finally {
    db.close();
}
