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

    // For local development, construct the connection string
    const password = process.env.DB_PASSWORD;
    if (!password) {
        throw new Error('Database password is required');
    }

    const connectionString = `postgresql://${defaultConfig.user}:${password}@${defaultConfig.host}:${defaultConfig.port}/${defaultConfig.database}`;
    
    return {
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    };
};

// Log environment variables for debugging (without sensitive data)
const config = getConnectionConfig();
console.log('Database Configuration:', {
    connectionString: config.connectionString ? '[REDACTED]' : undefined,
    ssl: true
});

const pool = new Pool({
    ...config,
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
            } else {
                console.error('All connection attempts failed. Please check your database configuration and network connectivity.');
                // Don't throw the error, let the application continue
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