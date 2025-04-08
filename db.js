const { Pool } = require('pg');
require('dotenv').config();

// Log environment variables for debugging (without sensitive data)
console.log('Database Configuration:', {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: true
});

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    max: 20,
    idleTimeoutMillis: 300000,
    connectionTimeoutMillis: 20000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test database connection immediately
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('Database connection test successful');
        client.release();
    } catch (err) {
        console.error('Database connection test failed:', err);
        // Don't throw the error, let the application continue
    }
};

testConnection();

// Handle pool errors
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    console.error('Attempting to recover from pool error');
});

// Handle pool connection
pool.on('connect', () => {
    console.log('Database connected successfully');
});

// Handle pool removal
pool.on('remove', () => {
    console.log('Database connection pool removed');
    setTimeout(() => {
        pool.connect((err, client, release) => {
            if (err) {
                console.error('Error reconnecting to the database:', err);
            } else {
                console.log('Successfully reconnected to database');
                release();
            }
        });
    }, 1000);
});

module.exports = pool; 