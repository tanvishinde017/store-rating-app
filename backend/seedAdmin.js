// Seeds a system administrator account and applies the database schema.
// Usage: npm run seed
require('dotenv').config();

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

const dbName = process.env.DB_NAME || 'store_rating';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
const adminName = process.env.ADMIN_NAME || 'System Administrator';

async function main() {
  // 1) Connect without a database so we can create it
  const connection = await mysql.createConnection(dbConfig);
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE \`${dbName}\``);

    // 2) Run the schema to create the tables
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await connection.query(schema);
    console.log('Schema applied to database:', dbName);

    // 3) Seed the admin user if not already present
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [
      adminEmail,
    ]);
    if (existing.length > 0) {
      console.log('Admin user already exists:', adminEmail);
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await connection.query(
        `INSERT INTO users (name, email, password_hash, address, role)
         VALUES (?, ?, ?, ?, 'ADMIN')`,
        [adminName, adminEmail, passwordHash, 'System administrator account']
      );
      console.log('Admin user seeded:', adminEmail);
      console.log('  Password: ' + adminPassword);
    }
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});