const { getAll, tables } = require('./utils/sqlite');

try {
    console.log('Checking Users Table...');
    const result = getAll(`SELECT id, username, role, status FROM ${tables.users}`);
    if (result.success) {
        console.log('Users found:', result.data.length);
        console.table(result.data);
    } else {
        console.error('Error fetching users:', result.error);
    }
} catch (error) {
    console.error('Crash during check:', error);
}
