const { Pool } = require('pg');
require('dotenv').config();

// Define default configuration for local development
const defaultConfig = {
    user: 'postgres',
    host: 'db.uffdxraxivdxjglbfkti.supabase.co',
    port: '5432',
    database: 'postgres',
    ssl: {
        rejectUnauthorized: false
    }
};

// Log environment variables for debugging (without sensitive data)
console.log('Database Configuration:', {
    user: process.env.DB_USER || defaultConfig.user,
    host: process.env.DB_HOST || defaultConfig.host,
    port: process.env.DB_PORT || defaultConfig.port,
    database: process.env.DB_NAME || defaultConfig.database,
    ssl: true
});

const pool = new Pool({
    user: process.env.DB_USER || defaultConfig.user,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || defaultConfig.host,
    port: process.env.DB_PORT || defaultConfig.port,
    database: process.env.DB_NAME || defaultConfig.database,
    max: 20,
    idleTimeoutMillis: 300000,
    connectionTimeoutMillis: 20000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test database connection with retries
const testConnection = async (retries = 3, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const client = await pool.connect();
            console.log('Database connection test successful');
            client.release();
            return;
        } catch (err) {
            console.error(`Database connection attempt ${i + 1}/${retries} failed:`, err);
            if (i < retries - 1) {
                console.log(`Retrying in ${delay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
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