require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ── Cloudinary setup ──────────────────────────────────────────────────────────
// If CLOUDINARY_CLOUD_NAME is set, use cloud storage; otherwise fall back to
// local disk storage so the app keeps working in development without Cloudinary.
let upload;
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  const cloudinary = require('cloudinary');
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  const cloudinaryStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'bete-cruan-uploads',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }]
    }
  });

  upload = multer({
    storage: cloudinaryStorage,
    limits: { fileSize: 5 * 1024 * 1024 }
  });
} else {
  // Local disk fallback (for local dev without Cloudinary)
  const fs = require('fs');
  const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  } catch (err) {
    console.warn('Failed to create local uploads directory (non-fatal):', err.message);
  }

  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  upload = multer({
    storage: diskStorage,
    fileFilter: (req, file, cb) => {
      const filetypes = /jpeg|jpg|png|webp/;
      if (filetypes.test(path.extname(file.originalname).toLowerCase()) && filetypes.test(file.mimetype)) {
        return cb(null, true);
      }
      cb(new Error('Only images (jpg, jpeg, png, webp) are allowed.'));
    },
    limits: { fileSize: 5 * 1024 * 1024 }
  });
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_cropdamageapp_2026';
// Admin registration secret code — set this in your Vercel env vars
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE || 'DA-Region10-Admin2026';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local uploads (only used in local dev fallback)
if (!isCloudinaryConfigured) {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// Serve static frontend files
app.use('/admin', express.static(path.join(__dirname, 'ADMIN SIDE')));
app.use('/', express.static(path.join(__dirname, 'FAMERS SIDE')));

// ── Database connection pool ──────────────────────────────────────────────────
const db = mysql.createPool({
  host:    process.env.DB_HOST     || '127.0.0.1',
  port:    parseInt(process.env.DB_PORT || '3306', 10),
  user:    process.env.DB_USER     || 'root',
  password:process.env.DB_PASSWORD || '',
  database:process.env.DB_NAME     || 'crop_damage_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Required for PlanetScale / Railway / cloud MySQL that use SSL
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

// Test connection on startup
db.getConnection()
  .then(conn => {
    console.log('Database connected successfully.');
    conn.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
  });

// ── Authentication Middleware ─────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    try {
      const [users] = await db.query('SELECT status, role, full_name FROM users WHERE id = ?', [decodedUser.id]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'User account not found.' });
      }

      const dbUser = users[0];
      if (dbUser.status === 'inactive') {
        return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
      }

      req.user = {
        id: decodedUser.id,
        username: decodedUser.username,
        role: dbUser.role,
        fullName: dbUser.full_name
      };
      next();
    } catch (dbErr) {
      console.error(dbErr);
      res.status(500).json({ error: 'Database verification failed.' });
    }
  });
};

// Admin check middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access restricted to administrators only.' });
  }
  next();
};

/* ==========================================================================
   AUTHENTICATION ENDPOINTS
   ========================================================================== */

// ── Register Endpoint ─────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { username, password, role, fullName, contactNumber, address, cropType, adminCode, boundaryPolygon } = req.body;

  if (!username || !password || !fullName) {
    return res.status(400).json({ error: 'Username, password, and full name are required.' });
  }

  // Determine role — admin registration requires a valid secret code
  let userRole = 'farmer';
  if (role === 'admin') {
    if (!adminCode || adminCode !== ADMIN_SECRET_CODE) {
      return res.status(403).json({ error: 'Invalid admin registration code. Please contact the system administrator.' });
    }
    userRole = 'admin';
  }

  try {
    // Check if username already exists
    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const defaultStatus = userRole === 'farmer' ? 'inactive' : 'active';
    const [result] = await db.query(
      'INSERT INTO users (username, password_hash, role, full_name, contact_number, address, crop_type, status, boundary_polygon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, passwordHash, userRole, fullName, contactNumber || null, address || null, cropType || 'Rice', defaultStatus, boundaryPolygon || null]
    );

    if (userRole === 'farmer') {
      const [admins] = await db.query('SELECT id FROM users WHERE role = "admin"');
      const msg = `[New Farmer] Farmer FMR-2026-${String(result.insertId).padStart(3, '0')} (${fullName}) has registered and requires verification.`;
      for (const admin of admins) {
        await db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [admin.id, msg]);
      }
    }

    res.status(201).json({
      message: 'Registration successful.',
      userId: result.insertId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error occurred during registration.' });
  }
});

// Forgot Password for Farmers
app.post('/api/auth/forgot-password', async (req, res) => {
  const { username, contactNumber, newPassword } = req.body;
  if (!username || !contactNumber || !newPassword) {
    return res.status(400).json({ error: 'Username, contact number, and new password are required.' });
  }
  try {
    const [users] = await db.query(
      'SELECT id FROM users WHERE username = ? AND role = "farmer"',
      [username]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'Farmer account not found.' });
    }
    const farmer = users[0];
    
    // Fetch contact details from DB
    const [details] = await db.query(
      'SELECT contact_number FROM users WHERE id = ?',
      [farmer.id]
    );
    
    const dbContact = details[0]?.contact_number;
    if (!dbContact || dbContact.replace(/[^0-9]/g, '') !== contactNumber.replace(/[^0-9]/g, '')) {
      return res.status(400).json({ error: 'Verification failed. Contact number does not match.' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, farmer.id]);
    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error occurred during password reset.' });
  }
});

// Forgot Password for Admins
app.post('/api/auth/admin/forgot-password', async (req, res) => {
  const { username, adminCode, newPassword } = req.body;
  if (!username || !adminCode || !newPassword) {
    return res.status(400).json({ error: 'Username, admin secret code, and new password are required.' });
  }
  
  if (adminCode !== ADMIN_SECRET_CODE) {
    return res.status(403).json({ error: 'Invalid admin secret code.' });
  }

  try {
    const [users] = await db.query(
      'SELECT id FROM users WHERE username = ? AND role = "admin"',
      [username]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'Admin account not found.' });
    }
    const adminUser = users[0];

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, adminUser.id]);
    res.json({ message: 'Admin password reset successful. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error occurred during password reset.' });
  }
});

// ── Login Endpoint ────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = users[0];
    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Your account is pending approval or has been deactivated. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Generate token (30-day expiry)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        contactNumber: user.contact_number,
        address: user.address,
        cropType: user.crop_type,
        boundaryPolygon: user.boundary_polygon,
        pendingBoundaryPolygon: user.pending_boundary_polygon
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error occurred during login.' });
  }
});

/* ==========================================================================
   PROFILE ENDPOINTS (FARMER PROFILE EDIT)
   ========================================================================== */

// Get Profile Info
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, full_name, contact_number, address, crop_type, status, boundary_polygon AS boundaryPolygon, pending_boundary_polygon AS pendingBoundaryPolygon, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    res.json(users[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve profile info.' });
  }
});

// Update Profile Info
app.put('/api/profile', authenticateToken, async (req, res) => {
  const { fullName, contactNumber, address, cropType, boundaryPolygon } = req.body;

  if (!fullName) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  try {
    // Check if boundary changed
    const [currentUserRows] = await db.query(
      'SELECT boundary_polygon FROM users WHERE id = ?',
      [req.user.id]
    );

    const oldBoundary = currentUserRows[0] ? currentUserRows[0].boundary_polygon : null;
    let isBoundaryChanged = false;

    if (boundaryPolygon !== undefined && boundaryPolygon !== oldBoundary) {
      isBoundaryChanged = true;
    }

    if (isBoundaryChanged) {
      // Save boundary to pending_boundary_polygon, keep existing boundary_polygon as is
      await db.query(
        'UPDATE users SET full_name = ?, contact_number = ?, address = ?, crop_type = ?, pending_boundary_polygon = ? WHERE id = ?',
        [fullName, contactNumber || null, address || null, cropType || 'Rice', boundaryPolygon, req.user.id]
      );

      // Create notification for all admin users
      const [admins] = await db.query('SELECT id FROM users WHERE role = "admin"');
      const msg = `[Boundary Change] Farmer FMR-2026-${String(req.user.id).padStart(3, '0')} (${fullName}) has updated their farm boundary. Action required.`;
      
      for (const admin of admins) {
        await db.query(
          'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
          [admin.id, msg]
        );
      }

      res.json({
        message: 'Profile updated successfully. Farm boundary change is pending administrator approval.',
        user: { fullName, contactNumber, address, cropType, pendingBoundaryPolygon: boundaryPolygon }
      });
    } else {
      // Normal update
      await db.query(
        'UPDATE users SET full_name = ?, contact_number = ?, address = ?, crop_type = ? WHERE id = ?',
        [fullName, contactNumber || null, address || null, cropType || 'Rice', req.user.id]
      );

      res.json({
        message: 'Profile updated successfully.',
        user: { fullName, contactNumber, address, cropType }
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile info.' });
  }
});

// Change Password
app.put('/api/profile/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  try {
    const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

/* ==========================================================================
   REPORTS ENDPOINTS
   ========================================================================== */

// Create Report Endpoint
app.post('/api/reports', authenticateToken, upload.single('image'), async (req, res) => {
  const { details, severity, latitude, longitude, boundaryPolygon, disasterType } = req.body;

  if (!details || !severity || !latitude || !longitude || !boundaryPolygon) {
    return res.status(400).json({ error: 'Missing required report fields.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Crop damage image is required.' });
  }

  const reportDisaster = disasterType || 'Flood';

  try {
    const farmerId = req.user.id;

    // When using Cloudinary, req.file.path is the full Cloudinary URL.
    // When using local disk, req.file.filename is the stored filename.
    const imageName = isCloudinaryConfigured
      ? req.file.path        // Cloudinary returns the full URL as .path
      : req.file.filename;   // Local disk stores just the filename

    const [result] = await db.query(
      'INSERT INTO reports (farmer_id, image_name, disaster_type, details, severity, status, latitude, longitude, boundary_polygon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [farmerId, imageName, reportDisaster, details, severity, 'pending', latitude, longitude, boundaryPolygon]
    );

    const reportId = result.insertId;

    // Notify all administrators
    const [admins] = await db.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await db.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [admin.id, `New ${reportDisaster} report received from ${req.user.fullName}. Severity: ${severity.toUpperCase()}.`]
      );
    }

    res.status(201).json({ message: 'Report submitted successfully.', reportId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create report.' });
  }
});

// Get Reports Endpoint
app.get('/api/reports', authenticateToken, async (req, res) => {
  const { status, severity, disasterType } = req.query;
  let query = `
    SELECT r.*, u.full_name AS farmer_name, u.contact_number AS farmer_contact, u.address AS farmer_address, u.crop_type AS farmer_crop_type 
    FROM reports r 
    JOIN users u ON r.farmer_id = u.id
  `;
  const params = [];
  const conditions = [];

  // Farmers can only see their own reports
  if (req.user.role === 'farmer') {
    conditions.push('r.farmer_id = ?');
    params.push(req.user.id);
  }

  if (status)      { conditions.push('r.status = ?');       params.push(status); }
  if (severity)    { conditions.push('r.severity = ?');     params.push(severity); }
  if (disasterType){ conditions.push('r.disaster_type = ?');params.push(disasterType); }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY r.created_at DESC';

  try {
    const [reports] = await db.query(query, params);

    // Resolve image URLs: Cloudinary images are already full URLs; local images need the path prefix
    const reportsWithUrls = reports.map(r => ({
      ...r,
      imageUrl: r.image_name && r.image_name.startsWith('http')
        ? r.image_name
        : `/uploads/${r.image_name}`
    }));

    res.json(reportsWithUrls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve reports.' });
  }
});

// Update Report Severity and Status (Admin Only)
app.put('/api/reports/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, severity } = req.body;

  if (!status && !severity) {
    return res.status(400).json({ error: 'At least one field (status or severity) must be specified for update.' });
  }

  try {
    const [reports] = await db.query('SELECT farmer_id, status, severity, disaster_type FROM reports WHERE id = ?', [id]);
    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const report = reports[0];
    const newStatus   = status   || report.status;
    const newSeverity = severity || report.severity;

    await db.query(
      'UPDATE reports SET status = ?, severity = ? WHERE id = ?',
      [newStatus, newSeverity, id]
    );

    let notifMessage = `Your ${report.disaster_type} report #${id} was updated. Status: ${newStatus.toUpperCase()}`;
    if (severity && severity !== report.severity) {
      notifMessage += `, Severity adjusted to: ${newSeverity.toUpperCase()}`;
    }
    notifMessage += '.';

    await db.query(
      'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
      [report.farmer_id, notifMessage]
    );

    res.json({
      message: 'Report updated successfully.',
      report: { id, status: newStatus, severity: newSeverity }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update report.' });
  }
});

/* ==========================================================================
   ADMIN-SIDE FARMER MANAGEMENT ENDPOINTS
   ========================================================================== */

// Get all Farmers list with reports count
app.get('/api/admin/farmers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.username, u.full_name AS fullName, u.contact_number AS contactNumber, 
             u.address, u.crop_type AS cropType, u.status, u.boundary_polygon AS boundaryPolygon,
             u.pending_boundary_polygon AS pendingBoundaryPolygon, u.created_at AS createdAt, 
             COUNT(r.id) AS reportCount
      FROM users u
      LEFT JOIN reports r ON u.id = r.farmer_id
      WHERE u.role = 'farmer'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
    const [farmers] = await db.query(query);
    res.json(farmers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch registered farmers.' });
  }
});

// Toggle Farmer Account status
app.put('/api/admin/farmers/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'active' && status !== 'inactive') {
    return res.status(400).json({ error: 'Invalid account status specified. Must be active or inactive.' });
  }

  try {
    const [result] = await db.query('UPDATE users SET status = ? WHERE id = ? AND role = "farmer"', [status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Farmer not found.' });
    }

    // Notify farmer of status update
    const msg = status === 'active'
      ? 'Your farmer account has been accepted and verified by the administrator.'
      : 'Your farmer account has been deactivated by the administrator.';
    await db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [id, msg]);

    res.json({ message: `Farmer account status updated to ${status}.`, userId: id, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update farmer account status.' });
  }
});

// Approve farmer boundary change
app.post('/api/admin/farmers/:id/approve-boundary', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const [users] = await db.query(
      'SELECT full_name, pending_boundary_polygon FROM users WHERE id = ? AND role = "farmer"',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Farmer not found.' });
    }

    const farmer = users[0];
    if (!farmer.pending_boundary_polygon) {
      return res.status(400).json({ error: 'No pending boundary change found for this farmer.' });
    }

    await db.query(
      'UPDATE users SET boundary_polygon = pending_boundary_polygon, pending_boundary_polygon = NULL WHERE id = ?',
      [id]
    );

    // Notify farmer
    const msg = 'Your farm boundary change request has been approved by the administrator.';
    await db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [id, msg]);

    res.json({ message: 'Farmer boundary approved successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve farmer boundary.' });
  }
});

// Reject farmer boundary change
app.post('/api/admin/farmers/:id/reject-boundary', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const [users] = await db.query(
      'SELECT full_name, pending_boundary_polygon FROM users WHERE id = ? AND role = "farmer"',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Farmer not found.' });
    }

    const farmer = users[0];
    if (!farmer.pending_boundary_polygon) {
      return res.status(400).json({ error: 'No pending boundary change found for this farmer.' });
    }

    await db.query(
      'UPDATE users SET pending_boundary_polygon = NULL WHERE id = ?',
      [id]
    );

    // Notify farmer
    const msg = 'Your farm boundary change request has been rejected by the administrator.';
    await db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [id, msg]);

    res.json({ message: 'Farmer boundary rejected successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject farmer boundary.' });
  }
});

/* ==========================================================================
   NOTIFICATIONS ENDPOINTS
   ========================================================================== */

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

/* ==========================================================================
   DATA EXPORT ENDPOINT (CSV)
   ========================================================================== */

app.get('/api/export/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [reports] = await db.query(`
      SELECT r.id, u.full_name AS farmer_name, u.contact_number AS farmer_contact, 
             r.disaster_type, r.details, r.severity, r.status, r.latitude, r.longitude, 
             r.boundary_polygon, r.created_at 
      FROM reports r 
      JOIN users u ON r.farmer_id = u.id 
      ORDER BY r.created_at DESC
    `);

    let csvContent = 'Report ID,Farmer Name,Farmer Contact,Disaster Type,Incident Details,Severity,Status,Latitude,Longitude,Boundary Polygon,Timestamp\n';
    reports.forEach(report => {
      const escapedDetails     = `"${report.details.replace(/"/g, '""')}"`;
      const escapedPolygon     = `"${report.boundary_polygon.replace(/"/g, '""')}"`;
      const escapedFarmerName  = `"${report.farmer_name.replace(/"/g, '""')}"`;
      const formattedDate      = new Date(report.created_at).toISOString();

      csvContent += `RPT-2026-${String(report.id).padStart(3, '0')},${escapedFarmerName},${report.farmer_contact || ''},${report.disaster_type},${escapedDetails},${report.severity},${report.status},${report.latitude},${report.longitude},${escapedPolygon},${formattedDate}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=crop_damage_reports.csv');
    res.status(200).send(csvContent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export reports to CSV.' });
  }
});

/* ==========================================================================
   START SERVER (local dev only — Vercel uses module.exports)
   ========================================================================== */

// Only listen when run directly (not via Vercel serverless)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
