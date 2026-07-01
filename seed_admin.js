require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crop_damage_db'
};

async function seed() {
  console.log('Starting DB Seeding...');
  const connection = await mysql.createConnection(dbConfig);

  try {
    // 1. Create database and tables if they don't exist
    const schemaSql = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('farmer', 'admin') NOT NULL DEFAULT 'farmer',
        full_name VARCHAR(100) NOT NULL,
        contact_number VARCHAR(20),
        address VARCHAR(255) DEFAULT NULL,
        crop_type VARCHAR(100) DEFAULT 'Rice',
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        farmer_id INT NOT NULL,
        image_name VARCHAR(255) NOT NULL,
        disaster_type ENUM('Flood', 'Drought', 'Typhoon', 'Pest', 'Disease') NOT NULL DEFAULT 'Flood',
        details TEXT NOT NULL,
        severity ENUM('minor', 'moderate', 'severe') NOT NULL,
        status ENUM('pending', 'verified', 'responded') NOT NULL DEFAULT 'pending',
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        boundary_polygon LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_reports_farmer FOREIGN KEY (farmer_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `;

    // Execute schema queries
    const statements = schemaSql.split(';').map(s => s.trim()).filter(Boolean);
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log('Schema tables verified/created.');

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const pwdHash = await bcrypt.hash('password123', salt);

    // 3. Insert Admin
    await connection.query(`
      INSERT INTO users (username, password_hash, role, full_name, contact_number, status)
      VALUES ('admin1', ?, 'admin', 'Officer Pedro', '+639171234567', 'active')
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)
    `, [pwdHash]);
    console.log('Admin user seeded (admin1 / password123).');

    // 4. Insert Farmers
    const farmers = [
      { username: 'farmer1', name: 'Juan Dela Cruz', address: 'Bonbon, Cagayan de Oro City, Misamis Oriental', crop: 'Rice' },
      { username: 'farmer2', name: 'Maria Santos', address: 'San Isidro, Valencia City, Bukidnon', crop: 'Corn' },
      { username: 'farmer3', name: 'Pedro Penduko', address: 'Sumpong, Malaybalay City, Bukidnon', crop: 'Vegetables' },
      { username: 'farmer4', name: 'Jose Rizal', address: 'Catadman, Ozamiz City, Misamis Occidental', crop: 'Coconut' },
      { username: 'farmer5', name: 'Goyo Del Pilar', address: 'Tubod, Iligan City, Lanao del Norte', crop: 'Fruits' },
      // Nationwide mock farmers
      { username: 'farmer_manila', name: 'Luzon Farmer', address: 'Intramuros, Manila, Metro Manila', crop: 'Vegetables' },
      { username: 'farmer_cebu', name: 'Visayas Farmer', address: 'Poblacion, Cebu City, Cebu', crop: 'Coconut' },
      { username: 'farmer_davao', name: 'Davao Farmer', address: 'Poblacion, Davao City, Davao del Sur', crop: 'Fruits' }
    ];

    const farmerIds = {};
    for (const f of farmers) {
      await connection.query(`
        INSERT INTO users (username, password_hash, role, full_name, contact_number, address, crop_type, status)
        VALUES (?, ?, 'farmer', ?, '+639170000000', ?, ?, 'active')
        ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)
      `, [f.username, pwdHash, f.name, f.address, f.crop]);
      
      const [rows] = await connection.query('SELECT id FROM users WHERE username = ?', [f.username]);
      farmerIds[f.username] = rows[0].id;
    }
    console.log('Farmers seeded successfully.');

    // 5. Insert mock disaster reports
    // Clear old reports to keep it clean and predictable
    await connection.query('DELETE FROM reports');

    // Polygon drawing helpers (small bounding boxes around lat/lng)
    const makePoly = (lat, lng) => JSON.stringify([
      [lat - 0.002, lng - 0.002],
      [lat + 0.002, lng - 0.002],
      [lat + 0.002, lng + 0.002],
      [lat - 0.002, lng + 0.002]
    ]);

    const reports = [
      // Region 10 reports
      { fid: farmerIds.farmer1, type: 'Disease', severity: 'severe', lat: 8.5120, lng: 124.6420, details: 'Bacterial blight outbreak affecting 3 hectares of rice.' },
      { fid: farmerIds.farmer1, type: 'Flood', severity: 'moderate', lat: 8.4850, lng: 124.6220, details: 'Flooding in Patag due to flash flood.' },
      { fid: farmerIds.farmer2, type: 'Drought', severity: 'severe', lat: 7.9050, lng: 125.0920, details: 'Severe dry spell destroying corn fields.' },
      { fid: farmerIds.farmer3, type: 'Pest', severity: 'moderate', lat: 8.1320, lng: 125.1250, details: 'Armyworm infestation detected in Malaybalay.' },
      { fid: farmerIds.farmer4, type: 'Typhoon', severity: 'severe', lat: 8.1490, lng: 123.8420, details: 'Typhoon winds damaged coconut trees.' },
      { fid: farmerIds.farmer5, type: 'Flood', severity: 'minor', lat: 8.2250, lng: 124.2420, details: 'Minor river overflow.' },
      // Cluster CDO reports to show nice color transitions
      { fid: farmerIds.farmer1, type: 'Disease', severity: 'minor', lat: 8.4750, lng: 124.6380, details: 'Leaf spot starting on Rice.' },
      { fid: farmerIds.farmer1, type: 'Disease', severity: 'moderate', lat: 8.4620, lng: 124.6180, details: 'Tungro virus in Carmen.' },
      
      // Nationwide reports
      { fid: farmerIds.farmer_manila, type: 'Drought', severity: 'severe', lat: 14.5910, lng: 120.9810, details: 'Severe drought in Central Luzon boundary.' },
      { fid: farmerIds.farmer_cebu, type: 'Typhoon', severity: 'severe', lat: 10.3120, lng: 123.8820, details: 'Visayas typhoon damage.' },
      { fid: farmerIds.farmer_davao, type: 'Pest', severity: 'moderate', lat: 7.1850, lng: 125.4520, details: 'Davao banana pests outbreak.' }
    ];

    for (const r of reports) {
      await connection.query(`
        INSERT INTO reports (farmer_id, image_name, disaster_type, details, severity, status, latitude, longitude, boundary_polygon)
        VALUES (?, 'fdd305bb-94e2-4610-b787-90a3694c6840.jpg', ?, ?, ?, 'verified', ?, ?, ?)
      `, [r.fid, r.type, r.details, r.severity, r.lat, r.lng, makePoly(r.lat, r.lng)]);
    }
    console.log('Mock reports seeded successfully.');
    console.log('Seeding finished successfully.');

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await connection.end();
  }
}

seed();
