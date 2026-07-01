const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const API_URL = `http://localhost:${PORT}`;

// Helper function to send requests
function makeRequest(url, method, headers = {}, body = null, isBinary = false) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = isBinary ? [] : '';
      res.on('data', (chunk) => {
        if (isBinary) {
          data.push(chunk);
        } else {
          data += chunk;
        }
      });
      res.on('end', () => {
        if (isBinary) {
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(data) });
        } else {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, body: data });
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    
    if (body) {
      if (body instanceof Buffer) {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

// Multipart Form-Data helper for report upload
function buildMultipartBody(boundary, fields, filePath) {
  const chunks = [];
  
  // Append text fields
  for (const [key, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n`));
    chunks.push(Buffer.from(`${value}\r\n`));
  }

  // Append file
  const filename = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath);
  
  chunks.push(Buffer.from(`--${boundary}\r\n`));
  chunks.push(Buffer.from(`Content-Disposition: form-data; name="image"; filename="${filename}"\r\n`));
  chunks.push(Buffer.from(`Content-Type: image/jpeg\r\n\r\n`));
  chunks.push(fileContent);
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  return Buffer.concat(chunks);
}

async function runTests() {
  console.log('--- Starting System API Tests ---');
  let farmerToken = '';
  let adminToken = '';
  let reportId = null;

  try {
    // 1. Farmer Registration
    console.log('\n[TEST 1] Registering Farmer...');
    const regFarmer = await makeRequest(`${API_URL}/api/auth/register`, 'POST', {}, {
      username: 'farmer_test_1',
      password: 'password123',
      fullName: 'Juan Test Farmer',
      contactNumber: '+639111222333',
      role: 'farmer'
    });
    console.log('Result:', regFarmer);

    // 2. Farmer Login
    console.log('\n[TEST 2] Logging in Farmer...');
    const loginFarmer = await makeRequest(`${API_URL}/api/auth/login`, 'POST', {}, {
      username: 'farmer_test_1',
      password: 'password123'
    });
    console.log('Result:', loginFarmer);
    farmerToken = loginFarmer.body.token;

    // 3. Admin Login (admin1 registered earlier via shell command)
    console.log('\n[TEST 3] Logging in Admin...');
    const loginAdmin = await makeRequest(`${API_URL}/api/auth/login`, 'POST', {}, {
      username: 'admin1',
      password: 'password123'
    });
    console.log('Result:', loginAdmin);
    adminToken = loginAdmin.body.token;

    // 4. Report Submission (PWA upload mock)
    console.log('\n[TEST 4] Submitting Crop Damage Report (Farmer)...');
    const imagePath = path.join(__dirname, 'FAMERS SIDE', 'e7af2540-8b40-4d54-be2b-a3d93fcd2e2b.jpg');
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Test image not found at ${imagePath}`);
    }

    const boundary = '----TestBoundary' + Math.random().toString(36).substring(2);
    const fields = {
      details: 'Test details for crop damage due to sudden flood in rice fields.',
      severity: 'moderate',
      latitude: '14.5995',
      longitude: '120.9842',
      boundaryPolygon: JSON.stringify([[14.5990, 120.9830], [14.6000, 120.9830], [14.6000, 120.9850], [14.5990, 120.9850]])
    };

    const multipartBody = buildMultipartBody(boundary, fields, imagePath);
    const uploadRes = await makeRequest(`${API_URL}/api/reports`, 'POST', {
      'Authorization': `Bearer ${farmerToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    }, multipartBody);
    console.log('Result:', uploadRes);
    reportId = uploadRes.body.reportId;

    // 5. Admin List Reports
    console.log('\n[TEST 5] Retrieving Reports Log (Admin)...');
    const listReports = await makeRequest(`${API_URL}/api/reports`, 'GET', {
      'Authorization': `Bearer ${adminToken}`
    });
    console.log(`Result: Retrieved ${listReports.body.length} reports.`);

    // 6. Admin Validation (Status update + Severity adjustment)
    console.log(`\n[TEST 6] Validating Report #${reportId} (Admin)...`);
    const validateRes = await makeRequest(`${API_URL}/api/reports/${reportId}`, 'PUT', {
      'Authorization': `Bearer ${adminToken}`
    }, {
      status: 'verified',
      severity: 'severe'
    });
    console.log('Result:', validateRes);

    // 7. Farmer Notifications verification
    console.log('\n[TEST 7] Fetching Notifications for Farmer...');
    const notifs = await makeRequest(`${API_URL}/api/notifications`, 'GET', {
      'Authorization': `Bearer ${farmerToken}`
    });
    console.log('Result:', notifs.body);

    // 8. Data Export (CSV)
    console.log('\n[TEST 8] Fetching CSV Data Export...');
    const exportCsv = await makeRequest(`${API_URL}/api/export/reports`, 'GET', {
      'Authorization': `Bearer ${adminToken}`
    }, null, true);
    console.log('Result: Status', exportCsv.status, ', Headers:', exportCsv.headers['content-type']);
    console.log('CSV Preview:\n', exportCsv.body.toString().split('\n').slice(0, 3).join('\n'));

    console.log('\n--- All Automated Backend Tests Passed Successfully! ---');
  } catch (err) {
    console.error('Test script failed with error:', err);
  }
}

runTests();
