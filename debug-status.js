const { getAll, tables } = require('./utils/sqlite');

try {
    const result = getAll(`SELECT id, username, status FROM ${tables.users}`);
    console.log('--- Current User Statuses ---');
    result.data.forEach(u => {
        console.log(`ID: ${u.id}, User: [${u.username}], Status: [${u.status}] type: ${typeof u.status}`);
    });
} catch (error) {
    console.error(error);
}
