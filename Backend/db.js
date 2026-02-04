const mysql = require("mysql2");
require('dotenv').config();

// Create a connection pool instead of a single connection
// Pools automatically handle connection management and reconnection
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Function to wait for database to be ready with exponential backoff
async function waitForDatabase(maxRetries = 30, initialDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await new Promise((resolve, reject) => {
                pool.getConnection((err, connection) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    // Test the connection with a simple query
                    connection.ping((pingErr) => {
                        connection.release();
                        if (pingErr) {
                            reject(pingErr);
                        } else {
                            resolve();
                        }
                    });
                });
            });
            console.log('Database is ready');
            return true;
        } catch (err) {
            const delay = initialDelay * Math.pow(2, attempt - 1);
            if (attempt < maxRetries) {
                console.log(`Database not ready (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('Failed to connect to database after', maxRetries, 'attempts');
                throw err;
            }
        }
    }
}

// Test the connection on startup (non-blocking)
pool.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.');
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.');
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused. Will retry automatically.');
        }
        // Don't exit process here, just log error. 
        // Subsequent queries will retry automatically when pool can connect.
    }
    if (connection) {
        console.log('Connected to Database');
        connection.release();
    }
});

// Export the pool and waitForDatabase function
module.exports = pool;
module.exports.waitForDatabase = waitForDatabase;
