require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const dbConfig = {
    host:    process.env.DB_HOST     || '127.0.0.1',
    port:    parseInt(process.env.DB_PORT || '3306', 10),
    user:    process.env.DB_USER     || 'root',
    password:process.env.DB_PASSWORD || '',
    database:process.env.DB_NAME     || 'crop_damage_db',
    ssl:     process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  };

  console.log('Connecting to database:', dbConfig.host, dbConfig.database);
  
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Database connected successfully.');

    const [columns] = await connection.query('SHOW COLUMNS FROM users');
    const hasBoundary = columns.some(col => col.Field === 'boundary_polygon');
    const hasPendingBoundary = columns.some(col => col.Field === 'pending_boundary_polygon');

    if (!hasBoundary) {
      console.log('Adding boundary_polygon column...');
      await connection.query('ALTER TABLE users ADD COLUMN boundary_polygon LONGTEXT DEFAULT NULL');
      console.log('Added boundary_polygon column.');
    } else {
      console.log('boundary_polygon column already exists.');
    }

    if (!hasPendingBoundary) {
      console.log('Adding pending_boundary_polygon column...');
      await connection.query('ALTER TABLE users ADD COLUMN pending_boundary_polygon LONGTEXT DEFAULT NULL');
      console.log('Added pending_boundary_polygon column.');
    } else {
      console.log('pending_boundary_polygon column already exists.');
    }

    console.log('Migration finished successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();
