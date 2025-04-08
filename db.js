const { Pool } = require('pg');
require('dotenv').config();

// Define default configuration for local development
const defaultConfig = {
    user: 'postgres',
    // Using the direct connection string format for Supabase
    host: process.env.SUPABASE_HOST || 'aws-0-us-west-1.pooler.supabase.com',
    port: '5432',
    database: 'postgres',
    ssl: {
        rejectUnauthorized: false
    }
};

// Determine if we're in production (Vercel) environment
const isProduction = process.env.VERCEL === '1';

// Construct connection config
const getConnectionConfig = () => {
    // If DATABASE_URL is provided (Vercel/Production), use it
    if (process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        };
    }

    // Otherwise use individual config parameters
    return {
        user: process.env.DB_USER || defaultConfig.user,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST || defaultConfig.host,
        port: process.env.DB_PORT || defaultConfig.port,
        database: process.env.DB_NAME || defaultConfig.database,
        ssl: {
            rejectUnauthorized: false
        }
    };
};

// Log environment variables for debugging (without sensitive data)
console.log('Database Configuration:', {
    ...getConnectionConfig(),
    password: '[REDACTED]',
    ssl: true
});

const pool = new Pool({
    ...getConnectionConfig(),
    max: 20,
    idleTimeoutMillis: 300000,
    connectionTimeoutMillis: 20000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
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