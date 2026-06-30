// test-neon.js
require('dotenv').config({ path: '.env.local' }); // load .env.local
const { neon } = require('@neondatabase/serverless');

async function main() {
    console.log('DATABASE_URL:', process.env.DATABASE_URL); // debug
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL not set');
        process.exit(1);
    }

    const sql = neon(process.env.DATABASE_URL);
    try {
        // Simple query – list tables (PostgreSQL specific)
        const rows = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5`;
        console.log('Connected to Neon! Sample tables:', rows);
    } catch (err) {
        console.error('Neon query error:', err);
    }
}

main();
