/**
 * Unified Database Bridge
 * Switches between SQLite (Local/Dev) and MariaDB (Vercel/Prod)
 */

const sqlite = require('./sqlite');
const mariadb = require('./mariadb');

// Determine which database implementation to use based on environment variables
const dbType = (process.env.DB_TYPE || '').toLowerCase();
const hasDatabaseUrl = !!process.env.DATABASE_URL;
const isVercelRuntime = !!process.env.VERCEL;
let implementation;
if (dbType === 'postgres' || hasDatabaseUrl || (isVercelRuntime && dbType !== 'mariadb')) {
    // PostgreSQL implementation will be required later
    implementation = require('./postgres');
} else if (dbType === 'mariadb') {
    implementation = mariadb;
} else {
    // Default to SQLite for local development
    implementation = sqlite;
}

// Initialization guard
let initPromise = null;
const ensureInitialized = async () => {
    if (!initPromise) {
        console.log('[db-bridge] Initializing database...');
        initPromise = Promise.resolve(implementation.initializeDatabase()).then((result) => {
            if (result && result.success === false) {
                throw new Error(result.error || 'Database initialization failed');
            }
            return result;
        });
    }
    return initPromise;
};

/**
 * Ensures we always return a promise (async) even for SQLite
 */
const db = {
    // Basic Query Functions
    runQuery: async (q, p) => {
        await ensureInitialized();
        return implementation.runQuery(q, p);
    },
    getOne: async (q, p) => {
        await ensureInitialized();
        return implementation.getOne(q, p);
    },
    getAll: async (q, p) => {
        await ensureInitialized();
        return implementation.getAll(q, p);
    },

    // Metadata
    tables: implementation.tables || sqlite.tables,

    // Core Entity Helpers
    getEmployees: async (...args) => {
        await ensureInitialized();
        const fn = implementation.getEmployees || sqlite.getEmployees;
        return fn(...args);
    },
    getEmployeeById: async (...args) => {
        await ensureInitialized();
        const fn = implementation.getEmployeeById || sqlite.getEmployeeById;
        return fn(...args);
    },
    saveEmployee: async (...args) => {
        await ensureInitialized();
        const fn = implementation.saveEmployee || sqlite.saveEmployee;
        return fn(...args);
    },

    getAttendance: async (...args) => {
        await ensureInitialized();
        const fn = implementation.getAttendance || sqlite.getAttendance;
        return fn(...args);
    },
    saveAttendance: async (...args) => {
        await ensureInitialized();
        const fn = implementation.saveAttendance || sqlite.saveAttendance;
        return fn(...args);
    },

    getPayrolls: async (...args) => {
        await ensureInitialized();
        const fn = implementation.getPayrolls || sqlite.getPayrolls;
        return fn(...args);
    },
    savePayroll: async (...args) => {
        await ensureInitialized();
        const fn = implementation.savePayroll || sqlite.savePayroll;
        return fn(...args);
    },

    getLoans: async (...args) => {
        await ensureInitialized();
        const fn = implementation.getLoans || sqlite.getLoans;
        return fn(...args);
    },
    saveLoan: async (...args) => {
        await ensureInitialized();
        const fn = implementation.saveLoan || sqlite.saveLoan;
        return fn(...args);
    },

    // Initialization
    initializeDatabase: ensureInitialized
};

module.exports = db;
