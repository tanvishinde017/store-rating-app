// Load environment variables before anything else
require('dotenv').config();

const mysql = require('mysql2/promise');

// ---------------------------------------------------------------------------
// Database connection pool
// ---------------------------------------------------------------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'store_rating',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test the connection on startup
async function testConnection() {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    console.log('Database connected:', rows[0].ok);
    return true;
  } catch (err) {
    console.error('Database connection failed:', err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Wraps an async route handler so async errors reach the error handler.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Return the matching role or null. Useful for optional-role checks.
function getRole(req, roles) {
  const userRole = req.user && req.user.role;
  if (!userRole) return null;
  return roles.includes(userRole) ? userRole : null;
}

module.exports = {
  pool,
  asyncHandler,
  getRole,
  testConnection,
};
