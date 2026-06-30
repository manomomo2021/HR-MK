const Database = require('better-sqlite3');
const path = require('path');
const DB_PATH = path.join(process.cwd(), 'data', 'data.db');

const db = new Database(DB_PATH);

try {
    console.log('Force updating all users to status: active');
    const result = db.prepare("UPDATE users SET status = 'active'").run();
    console.log('Rows updated:', result.changes);
} catch (error) {
    console.error('Update failed:', error);
} finally {
    db.close();
}
