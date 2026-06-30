const { runQuery, tables } = require('./utils/sqlite');

console.log('Repairing user statuses...');

const result = runQuery(
    `UPDATE ${tables.users} SET status = 'active' WHERE status IS NULL OR status = ''`
);

if (result.success) {
    console.log('Successfully updated users with null/empty status.');
} else {
    console.error('Error updating users:', result.error);
}
