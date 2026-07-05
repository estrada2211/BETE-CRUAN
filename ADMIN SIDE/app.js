// Global State
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));
let reportsData = [];
let farmersData = [];
let alertsData = [];

// Navigation and Panels
let activePanel = 'overview';
const panels = document.querySelectorAll('.content-panel');
const navBtns = document.querySelectorAll('.nav-btn');
const panelTitle = document.getElementById('panel-title');

// Maps State
let adminMap = null;
let markerLayerGroup = null;
let polygonLayerGroup = null;
let rasterLayerGroup = null;
let standardTileLayer = null;
let satelliteTileLayer = null;
let currentMapStyle = 'standard'; // 'standard' or 'satellite'
let provinceGeoJsonData = null;

// Farmer Detail Map state
let farmerDetailMap = null;
let farmerApprovedPolygon = null;
let farmerPendingPolygon = null;

async function loadProvinceGeoJson() {
  if (provinceGeoJsonData) return provinceGeoJsonData;
  try {
    const res = await fetch('region-10-provinces.json');
    if (res.ok) {
      provinceGeoJsonData = await res.json();
      return provinceGeoJsonData;
    } else {
      console.error('Failed to load region-10-provinces.json:', res.statusText);
    }
  } catch (err) {
    console.error('Error fetching region-10-provinces.json:', err);
  }
  return null;
}

function getVisualCoordinates(report) {
  let lat = parseFloat(report.latitude);
  let lng = parseFloat(report.longitude);
  // Coordinate protection: visually place Manila/Luzon reports in Region 10 (CDO)
  if (lat > 14.0 && lat < 15.0 && lng > 120.0 && lng < 122.0) {
    const seed = report.id || 1;
    const offsetLat = (((seed * 17) % 200) - 100) / 5000;
    const offsetLng = (((seed * 31) % 200) - 100) / 5000;
    lat = 8.4542 + offsetLat;
    lng = 124.6319 + offsetLng;
  }
  return [lat, lng];
}


// Drawer Map State
let drawerMap = null;
let drawerPolygonLayer = null;
let currentDrawerReport = null;

// Chart JS Instances
let disasterChartInstance = null;
let statusChartInstance = null;

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('admin-login-form');
const registerForm = document.getElementById('admin-register-form');
const adminDisplayName = document.getElementById('admin-display-name');
const logoutBtn = document.getElementById('btn-logout');

// Auth tab elements
const adminTabLogin    = document.getElementById('admin-tab-login');
const adminTabRegister = document.getElementById('admin-tab-register');
const adminAuthForms   = document.querySelectorAll('.admin-auth-form');
const adminAuthTabs    = document.querySelectorAll('.admin-auth-tab');

// Overview Stats Counters
const overviewStatTotal = document.getElementById('overview-stat-total');
const overviewStatVerified = document.getElementById('overview-stat-verified');
const overviewStatPending = document.getElementById('overview-stat-pending');
const overviewStatFarmers = document.getElementById('overview-stat-farmers');
const overviewStatRate = document.getElementById('overview-stat-rate');

// Mini Stats for panels
const reportMiniTotal = document.getElementById('report-mini-total');
const reportMiniPending = document.getElementById('report-mini-pending');
const reportMiniVerified = document.getElementById('report-mini-verified');
const reportMiniResponded = document.getElementById('report-mini-responded');

const farmerMiniTotal = document.getElementById('farmer-mini-total');
const farmerMiniActive = document.getElementById('farmer-mini-active');
const farmerMiniInactive = document.getElementById('farmer-mini-inactive');
const farmerMiniReports = document.getElementById('farmer-mini-reports');

const mapMiniTotal = document.getElementById('map-mini-total');
const mapMiniPending = document.getElementById('map-mini-pending');
const mapMiniVerified = document.getElementById('map-mini-verified');
const mapMiniResponded = document.getElementById('map-mini-responded');

// Filters & Tables
const tableReportSearch = document.getElementById('table-report-search');
const tableReportStatus = document.getElementById('table-report-status');
const tableReportDisaster = document.getElementById('table-report-disaster');
const reportsTableBody = document.getElementById('reports-table-body');

const tableFarmerSearch = document.getElementById('table-farmer-search');
const tableFarmerStatus = document.getElementById('table-farmer-status');
const farmersTableBody = document.getElementById('farmers-table-body');

const mapFilterDate = document.getElementById('map-filter-date');
const mapFilterDisaster = document.getElementById('map-filter-disaster');
const mapFilterStatus = document.getElementById('map-filter-status');
const btnResetMapFilters = document.getElementById('btn-reset-map-filters');
const mapIncidentCounterLabel = document.getElementById('map-incident-counter-label');
const mapLegendDisastersStats = document.getElementById('map-legend-disasters-stats');

// Advanced Filters & Heatmap Selectors
const mapHeatmapMode = document.getElementById('map-heatmap-mode');
const mapGeoView = document.getElementById('map-geo-view');
const mapSpatialResolution = document.getElementById('map-spatial-resolution');
const mapFilterProvince = document.getElementById('map-filter-province');
const mapFilterMunicipality = document.getElementById('map-filter-municipality');
const mapFilterBarangay = document.getElementById('map-filter-barangay');
const mapFilterCrop = document.getElementById('map-filter-crop');
const mapFilterStartDate = document.getElementById('map-filter-start-date');
const mapFilterEndDate = document.getElementById('map-filter-end-date');
const btnToggleMapStyle = document.getElementById('btn-toggle-map-style');
const mapCustomDateContainerStart = document.getElementById('map-custom-date-container-start');
const mapCustomDateContainerEnd = document.getElementById('map-custom-date-container-end');
const heatmapLegendCard = document.getElementById('heatmap-legend-card');

// Settings
const settingsAdminFullname = document.getElementById('settings-admin-fullname');
const settingsAdminUsername = document.getElementById('settings-admin-username');

// Bell notifications dropdown
const headerNotifBell = document.querySelector('.header-notif-bell');
const bellBadge = document.getElementById('bell-badge');
const bellNotifDropdown = document.getElementById('bell-notif-dropdown');
const bellDropdownListHolder = document.getElementById('bell-dropdown-list-holder');

// Drawer elements
const drawerBackdrop = document.getElementById('drawer-backdrop');
const reportDrawer = document.getElementById('report-drawer');
const btnCloseDrawer = document.getElementById('btn-close-drawer');
const drawerPhoto = document.getElementById('drawer-photo');
const drawerFarmerName = document.getElementById('drawer-farmer-name');
const drawerFarmerContact = document.getElementById('drawer-farmer-contact');
const drawerDate = document.getElementById('drawer-date');
const drawerDisasterType = document.getElementById('drawer-disaster-type');
const drawerGps = document.getElementById('drawer-gps');
const drawerDetails = document.getElementById('drawer-details');
const btnValidate = document.getElementById('btn-validate');
const btnReject = document.getElementById('btn-reject');

// Exports
const btnTriggerReportsExport = document.getElementById('btn-trigger-reports-export');
const btnTriggerFarmersExport = document.getElementById('btn-trigger-farmers-export');
const exportOptionsModal = document.getElementById('export-options-modal');
const btnCloseExportModal = document.getElementById('btn-close-export-modal');
const exportOptPdf = document.getElementById('export-opt-pdf');
const exportOptExcel = document.getElementById('export-opt-excel');
const exportOptCsv = document.getElementById('export-opt-csv');
const pdfPrintLayout = document.getElementById('pdf-print-layout');
const toastElement = document.getElementById('toast');

const API_URL = window.location.origin;

/* ==========================================================================
   AUTHENTICATION CHECK
   ========================================================================== */

function showToast(message, type = 'success') {
  toastElement.innerText = message;
  toastElement.className = `toast ${type}`;
  toastElement.classList.remove('hidden');
  setTimeout(() => {
    toastElement.classList.add('hidden');
  }, 4000);
}

function checkAuth() {
  if (token && currentUser && currentUser.role === 'admin') {
    authScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    adminDisplayName.innerText = currentUser.fullName;
    
    // Set Settings display
    settingsAdminFullname.value = currentUser.fullName;
    settingsAdminUsername.value = currentUser.username;

    // Load initial data
    loadAllData();
    pollNewReports();
  } else {
    authScreen.classList.remove('hidden');
    dashboardScreen.classList.add('hidden');
  }
}

// Monitor all input fields inside .input-with-icon to toggle .has-content and .has-focus classes
document.querySelectorAll('.input-with-icon input').forEach(input => {
  const container = input.closest('.input-with-icon');
  if (!container) return;

  const updateState = () => {
    if (input.value.trim() !== '') {
      container.classList.add('has-content');
    } else {
      container.classList.remove('has-content');
    }
  };

  input.addEventListener('input', updateState);
  input.addEventListener('change', updateState);
  
  input.addEventListener('focus', () => {
    container.classList.add('has-focus');
  });
  input.addEventListener('blur', () => {
    container.classList.remove('has-focus');
    updateState();
  });

  // Run initially in case of autofill
  setTimeout(updateState, 200);
});

// Toggle password visibility for admin fields
document.querySelectorAll('.pwd-toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const input = toggle.parentNode.querySelector('input');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      toggle.innerText = '🙈';
    } else {
      input.type = 'password';
      toggle.innerText = '👁️';
    }
  });
});

/* ==========================================================================
   AUTH TAB SWITCHING
   ========================================================================== */

function switchAdminTab(targetTab) {
  adminAuthTabs.forEach(tab => tab.classList.remove('active'));
  adminAuthForms.forEach(form => form.classList.remove('active'));

  if (targetTab === 'login') {
    adminTabLogin.classList.add('active');
    loginForm.classList.add('active');
  } else {
    adminTabRegister.classList.add('active');
    registerForm.classList.add('active');
  }
}

if (adminTabLogin)    adminTabLogin.addEventListener('click',    () => switchAdminTab('login'));
if (adminTabRegister) adminTabRegister.addEventListener('click', () => switchAdminTab('register'));

// Admin Forgot Password Triggers & Submission
const forgotLink = document.querySelector('.forgot-link');
const adminForgotModal = document.getElementById('admin-forgot-modal');
const adminForgotForm = document.getElementById('admin-forgot-form');
const btnCancelAdminForgot = document.getElementById('btn-cancel-admin-forgot');
const btnCloseAdminForgot = document.getElementById('btn-close-admin-forgot');

if (forgotLink) {
  forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    adminForgotModal.classList.remove('hidden');
  });
}

function closeAdminForgot() {
  adminForgotModal.classList.add('hidden');
  adminForgotForm.reset();
}

if (btnCancelAdminForgot) btnCancelAdminForgot.addEventListener('click', closeAdminForgot);
if (btnCloseAdminForgot) btnCloseAdminForgot.addEventListener('click', closeAdminForgot);

if (adminForgotForm) {
  adminForgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-forgot-username').value.trim();
    const adminCode = document.getElementById('admin-forgot-code').value.trim();
    const newPassword = document.getElementById('admin-forgot-new-password').value;

    try {
      const res = await fetch(`${API_URL}/api/auth/admin/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, adminCode, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Password reset successful! You can now log in.');
        closeAdminForgot();
      } else {
        showToast(data.error || 'Password reset failed.', 'error');
      }
    } catch (err) {
      showToast('Cannot connect to authentication server.', 'error');
    }
  });
}

/* ==========================================================================
   LOGIN HANDLER
   ========================================================================== */

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      if (data.user.role !== 'admin') {
        showToast('Only DA officials are authorized here.', 'error');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      token = data.token;
      currentUser = data.user;
      showToast('Admin authorized successfully.');
      checkAuth();
    } else {
      showToast(data.error || 'Login failed.', 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server.', 'error');
  }
});

/* ==========================================================================
   ADMIN REGISTER HANDLER
   ========================================================================== */

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName       = document.getElementById('reg-fullname').value.trim();
    const username       = document.getElementById('reg-username').value.trim();
    const password       = document.getElementById('reg-password').value;
    const confirmPass    = document.getElementById('reg-confirm-password').value;
    const adminCode      = document.getElementById('reg-admin-code').value;

    if (!fullName || !username || !password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (password !== confirmPass) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Creating Account...';

    try {
      // Register the admin account
      const regRes = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, fullName, role: 'admin', adminCode })
      });

      const regData = await regRes.json();

      if (!regRes.ok) {
        showToast(regData.error || 'Registration failed.', 'error');
        return;
      }

      // Auto-login after registration
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const loginData = await loginRes.json();

      if (loginRes.ok && loginData.user.role === 'admin') {
        localStorage.setItem('token', loginData.token);
        localStorage.setItem('user', JSON.stringify(loginData.user));
        token = loginData.token;
        currentUser = loginData.user;
        showToast('Admin account created! Welcome, ' + fullName + '.');
        checkAuth();
      } else {
        showToast('Account created! Please sign in.', 'success');
        switchAdminTab('login');
      }
    } catch (err) {
      showToast('Cannot connect to server.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Create Admin Account';
    }
  });
}

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  token = null;
  currentUser = null;
  checkAuth();
});

/* ==========================================================================
   NAVIGATION
   ========================================================================== */

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-panel');
    activePanel = target;
    
    // Toggle active button
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Toggle active panel view
    panels.forEach(p => {
      if (p.id === `panel-${target}`) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    // Specific loading actions
    if (target === 'overview') {
      loadAllData();
    } else if (target === 'reports-log') {
      loadAllReports();
    } else if (target === 'farmers') {
      loadRegisteredFarmers();
    } else if (target === 'map-view') {
      loadAllReports();
      setTimeout(() => {
        initAdminMap();
        refreshAdminMap();
      }, 200);
    }
  });
});

/* ==========================================================================
   DATA LOADERS (REPORTS, FARMERS, NOTIFICATIONS)
   ========================================================================== */

async function loadAllData() {
  if (!token) return;
  await Promise.all([
    loadAllReports(),
    loadRegisteredFarmers(),
    loadAdminNotifications(),
    loadProvinceGeoJson()
  ]);
  updateDashboardStats();
}

async function loadAllReports() {
  try {
    const res = await fetch(`${API_URL}/api/reports`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      reportsData = data;
      updateReportMiniStats();
      if (activePanel === 'reports-log') renderReportsTable();
      if (activePanel === 'map-view') refreshAdminMap();
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadRegisteredFarmers() {
  try {
    const res = await fetch(`${API_URL}/api/admin/farmers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      farmersData = data;
      updateFarmerMiniStats();
      if (activePanel === 'farmers') renderFarmersTable();
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadAdminNotifications() {
  try {
    const res = await fetch(`${API_URL}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      alertsData = data;
      renderBellNotifications();
    }
  } catch (err) {
    console.error(err);
  }
}

function pollNewReports() {
  setInterval(() => {
    if (token) {
      loadAllReports();
      loadAdminNotifications();
    }
  }, 20000);
}

/* ==========================================================================
   OVERVIEW & CHARTS
   ========================================================================== */

function updateDashboardStats() {
  const total = reportsData.length;
  const verified = reportsData.filter(r => r.status === 'verified').length;
  const pending = reportsData.filter(r => r.status === 'pending').length;
  const activeFarmersCount = farmersData.filter(f => f.status === 'active').length;

  overviewStatTotal.innerText = total;
  overviewStatVerified.innerText = verified;
  overviewStatPending.innerText = pending;
  overviewStatFarmers.innerText = activeFarmersCount;

  const rate = total > 0 ? Math.round((verified / total) * 100) : 0;
  overviewStatRate.innerText = `${rate}% verification rate`;

  populateRecentDashboardData();
}

function populateRecentDashboardData() {
  // Recent Reports mini-table
  const recentReportsBody = document.getElementById('dashboard-recent-reports-body');
  if (recentReportsBody) {
    recentReportsBody.innerHTML = '';
    const recentReports = reportsData.slice(0, 5);
    if (recentReports.length === 0) {
      recentReportsBody.innerHTML = '<tr><td colspan="5" class="no-data">No reports registered yet.</td></tr>';
    } else {
      recentReports.forEach(report => {
        const tr = document.createElement('tr');
        const dateStr = new Date(report.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric'
        });
        const reportLabel = `RPT-2026-${String(report.id).padStart(3, '0')}`;
        
        tr.innerHTML = `
          <td><strong>${reportLabel}</strong></td>
          <td>${report.farmer_name}</td>
          <td><span class="disaster-tag-icon">${getDisasterIcon(report.disaster_type)}</span> ${report.disaster_type}</td>
          <td>${dateStr}</td>
          <td><span class="status-badge ${report.status}">${report.status}</span></td>
        `;
        
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => openReportDetailsModal(report));
        
        recentReportsBody.appendChild(tr);
      });
    }
  }

  // New Farmers list
  const newFarmersList = document.getElementById('dashboard-new-farmers-list');
  if (newFarmersList) {
    newFarmersList.innerHTML = '';
    const recentFarmers = farmersData.slice(0, 5);
    if (recentFarmers.length === 0) {
      newFarmersList.innerHTML = '<div class="no-data">No registered farmers.</div>';
    } else {
      recentFarmers.forEach(farmer => {
        const item = document.createElement('div');
        item.className = 'farmer-list-item';
        
        const regDate = new Date(farmer.createdAt).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric'
        });
        
        item.innerHTML = `
          <div class="farmer-avatar-circle">${farmer.fullName.charAt(0).toUpperCase()}</div>
          <div class="farmer-list-info">
            <strong>${farmer.fullName}</strong>
            <span>${farmer.address || 'No location'}</span>
          </div>
          <div class="farmer-joined-date">
            Joined ${regDate}
          </div>
        `;
        
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => openFarmerDetailsModal(farmer));
        
        newFarmersList.appendChild(item);
      });
    }
  }

  const linkViewAllReports = document.getElementById('link-view-all-reports');
  if (linkViewAllReports) {
    linkViewAllReports.replaceWith(linkViewAllReports.cloneNode(true));
    document.getElementById('link-view-all-reports').addEventListener('click', (e) => {
      e.preventDefault();
      const reportsBtn = Array.from(navBtns).find(btn => btn.getAttribute('data-panel') === 'reports-log');
      if (reportsBtn) {
        reportsBtn.click();
      }
    });
  }
}

function updateReportMiniStats() {
  const total = reportsData.length;
  const pending = reportsData.filter(r => r.status === 'pending').length;
  const verified = reportsData.filter(r => r.status === 'verified').length;
  const responded = reportsData.filter(r => r.status === 'responded').length;

  if (reportMiniTotal) reportMiniTotal.innerText = total;
  if (reportMiniPending) reportMiniPending.innerText = pending;
  if (reportMiniVerified) reportMiniVerified.innerText = verified;
  if (reportMiniResponded) reportMiniResponded.innerText = responded;

  if (mapMiniTotal) mapMiniTotal.innerText = total;
  if (mapMiniPending) mapMiniPending.innerText = pending;
  if (mapMiniVerified) mapMiniVerified.innerText = verified;
  if (mapMiniResponded) mapMiniResponded.innerText = responded;
}

function updateFarmerMiniStats() {
  const total = farmersData.length;
  const active = farmersData.filter(f => f.status === 'active').length;
  const inactive = farmersData.filter(f => f.status === 'inactive').length;
  const reportsCount = farmersData.reduce((acc, f) => acc + (f.reportCount || 0), 0);

  if (farmerMiniTotal) farmerMiniTotal.innerText = total;
  if (farmerMiniActive) farmerMiniActive.innerText = active;
  if (farmerMiniInactive) farmerMiniInactive.innerText = inactive;
  if (farmerMiniReports) farmerMiniReports.innerText = reportsCount;
}

/* ==========================================================================
   REPORTS TABLE & FILTERING
   ========================================================================== */

function renderReportsTable() {
  const searchStr = tableReportSearch.value.toLowerCase().trim();
  const statusFilter = tableReportStatus.value;
  const disasterFilter = tableReportDisaster.value;

  const filtered = reportsData.filter(r => {
    const matchesSearch = r.farmer_name.toLowerCase().includes(searchStr) || 
                          r.details.toLowerCase().includes(searchStr) || 
                          String(r.id).includes(searchStr) || 
                          (r.latitude + ',' + r.longitude).includes(searchStr);
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesDisaster = disasterFilter === 'all' || r.disaster_type === disasterFilter;

    return matchesSearch && matchesStatus && matchesDisaster;
  });

  if (filtered.length === 0) {
    reportsTableBody.innerHTML = '<tr><td colspan="7" class="no-data">No report records matched query filters.</td></tr>';
    return;
  }

  reportsTableBody.innerHTML = '';
  filtered.forEach(report => {
    const tr = document.createElement('tr');
    
    const formattedDate = new Date(report.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    const reportLabel = `RPT-2026-${String(report.id).padStart(3, '0')}`;

    tr.innerHTML = `
      <td><strong>${reportLabel}</strong></td>
      <td>${report.farmer_name} <span class="sub-name-text">Farmer ID: FMR-${report.farmer_id}</span></td>
      <td>Lat: ${parseFloat(report.latitude).toFixed(4)}, Lng: ${parseFloat(report.longitude).toFixed(4)} <span class="table-pin-icon">📍</span></td>
      <td>${formattedDate}</td>
      <td><span class="disaster-tag-icon">${getDisasterIcon(report.disaster_type)}</span> ${report.disaster_type}</td>
      <td><span class="status-badge ${report.status}">${report.status}</span></td>
      <td>
        <div class="row-actions-flex">
          <button class="row-action-btn view-details" title="View details">👁️</button>
          <button class="row-action-btn verify-trigger ${report.status !== 'pending' ? 'disabled' : ''}" title="Verify report">✓</button>
          <button class="row-action-btn comment-trigger" title="Respond / Action">💬</button>
          <button class="row-action-btn download-pdf" title="Print PDF">📥</button>
        </div>
      </td>
    `;

    // Bind action events
    tr.querySelector('.view-details').addEventListener('click', () => openReportDetailsModal(report));
    
    tr.querySelector('.verify-trigger').addEventListener('click', () => {
      if (report.status === 'pending') {
        openReportDetailsModal(report);
      }
    });

    tr.querySelector('.comment-trigger').addEventListener('click', () => {
      openReportDetailsModal(report);
    });

    tr.querySelector('.download-pdf').addEventListener('click', () => {
      // Direct print report
      triggerReportPdfPrint(report);
    });

    reportsTableBody.appendChild(tr);
  });
}

function getDisasterIcon(type) {
  switch (type) {
    case 'Flood': return '🌧️';
    case 'Drought': return '☀️';
    case 'Typhoon': return '🌀';
    case 'Pest': return '🐛';
    case 'Disease': return '🦠';
    default: return '🌾';
  }
}

tableReportSearch.addEventListener('input', renderReportsTable);
tableReportStatus.addEventListener('change', renderReportsTable);
tableReportDisaster.addEventListener('change', renderReportsTable);

/* ==========================================================================
   REGISTERED FARMERS LOG
   ========================================================================== */

function renderFarmersTable() {
  const searchStr = tableFarmerSearch.value.toLowerCase().trim();
  const statusFilter = tableFarmerStatus.value;

  const filtered = farmersData.filter(f => {
    const matchesSearch = f.fullName.toLowerCase().includes(searchStr) || 
                          f.username.toLowerCase().includes(searchStr) || 
                          (f.address && f.address.toLowerCase().includes(searchStr)) || 
                          String(f.id).includes(searchStr);
    
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    farmersTableBody.innerHTML = '<tr><td colspan="7" class="no-data">No farmers matched query.</td></tr>';
    return;
  }

  farmersTableBody.innerHTML = '';
  filtered.forEach(farmer => {
    const tr = document.createElement('tr');
    
    const regDate = new Date(farmer.createdAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    const namePendingBadge = farmer.pendingBoundaryPolygon ? ' <span class="status-badge pending" style="background-color: #fffbeb; color: #d97706; border: 1px dashed #d97706; font-size: 10px; margin-left: 5px; padding: 2px 6px;">Pending Boundary</span>' : '';

    tr.innerHTML = `
      <td><strong>FMR-2026-${String(farmer.id).padStart(3, '0')}</strong></td>
      <td>${farmer.fullName}${namePendingBadge} <span class="sub-name-text">Registered: ${regDate}</span></td>
      <td>${farmer.address || 'Not set'} <span class="table-pin-icon">📍</span></td>
      <td>${farmer.contactNumber || '-'}<br><span class="sub-name-text">${farmer.username}</span></td>
      <td><span class="status-badge verified">${farmer.reportCount} report(s)</span></td>
      <td><span class="status-badge ${farmer.status}">${farmer.status}</span></td>
      <td>
        <div class="row-actions-flex">
          <button class="row-action-btn view-farmer" title="View location">👁️</button>
          <button class="row-action-btn toggle-status" title="${farmer.status === 'active' ? 'Block Farmer' : 'Activate Farmer'}">
            ${farmer.status === 'active' ? '🚫' : '⚙️'}
          </button>
          <button class="row-action-btn edit-farmer" title="Edit credential">🔑</button>
        </div>
      </td>
    `;

    // View farmer action: open details modal
    tr.querySelector('.view-farmer').addEventListener('click', () => {
      openFarmerDetailsModal(farmer);
    });

    // Disable/Enable toggling
    tr.querySelector('.toggle-status').addEventListener('click', () => {
      const nextStatus = farmer.status === 'active' ? 'inactive' : 'active';
      toggleFarmerStatus(farmer.id, nextStatus);
    });

    tr.querySelector('.edit-farmer').addEventListener('click', () => {
      openFarmerDetailsModal(farmer);
    });

    farmersTableBody.appendChild(tr);
  });
}

tableFarmerSearch.addEventListener('input', renderFarmersTable);
tableFarmerStatus.addEventListener('change', renderFarmersTable);

async function toggleFarmerStatus(id, newStatus) {
  try {
    const res = await fetch(`${API_URL}/api/admin/farmers/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      showToast(`Farmer account is now ${newStatus}.`);
      loadRegisteredFarmers();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to update farmer status.', 'error');
    }
  } catch (err) {
    showToast('Failed to update status.', 'error');
  }
}

/* ==========================================================================
   ADMIN INTERACTIVE MAP VIEW
   ========================================================================== */

const MUNICIPALITY_COORDS = {
  "Cagayan de Oro City": [8.4542, 124.6319],
  "Valencia City": [7.9064, 125.0935],
  "Malaybalay City": [8.1306, 125.1275],
  "Ozamiz City": [8.1481, 123.8436],
  "Mambajao": [9.2505, 124.7170],
  "Iligan City": [8.2280, 124.2452],
  "Cabanatuan City": [15.4833, 120.9667],
  "Manila": [14.5995, 120.9842],
  "Cebu City": [10.3157, 123.8854],
  "Davao City": [7.1907, 125.4553]
};

const BARANGAY_COORDS = {
  "Bonbon": [8.5100, 124.6400],
  "Patag": [8.4900, 124.6200],
  "Carmen": [8.4800, 124.6400],
  "Balulang": [8.4600, 124.6200],
  "Lumbia": [8.4200, 124.6250],
  "Sumpong": [8.1500, 125.1200],
  "San Isidro": [7.9000, 125.0900],
  "Catadman": [8.1500, 123.8400],
  "Poblacion": [9.2500, 124.7100],
  "Tubod": [8.2200, 124.2400],
  "Intramuros": [14.5888, 120.9747]
};

function getReportLocationDetails(report) {
  let barangay = "Poblacion";
  let municipality = "Unknown";
  let province = "Unknown";

  const address = (report.farmer_address || "").toUpperCase();
  const lat = parseFloat(report.latitude);
  const lng = parseFloat(report.longitude);

  // 1. Check coordinates to map to Region 10 locations
  if (lat > 8.3 && lat < 8.6 && lng > 124.4 && lng < 124.8) {
    municipality = "Cagayan de Oro City";
    province = "Misamis Oriental";
    if (lat > 8.50 && lat < 8.52 && lng > 124.63 && lng < 124.66) {
      barangay = "Bonbon";
    } else if (lat > 8.48 && lat < 8.50 && lng > 124.61 && lng < 124.63) {
      barangay = "Patag";
    } else if (lat > 8.47 && lat < 8.49 && lng > 124.63 && lng < 124.66) {
      barangay = "Carmen";
    } else if (lat > 8.45 && lat < 8.47 && lng > 124.60 && lng < 124.64) {
      barangay = "Balulang";
    } else if (lat > 8.40 && lat < 8.44 && lng > 124.60 && lng < 124.65) {
      barangay = "Lumbia";
    } else {
      barangay = "Carmen";
    }
  } 
  else if (lat > 7.7 && lat < 8.2 && lng > 124.8 && lng < 125.3) {
    province = "Bukidnon";
    if (lat > 7.85 && lat < 7.95) {
      municipality = "Valencia City";
      barangay = "San Isidro";
    } else {
      municipality = "Malaybalay City";
      barangay = "Sumpong";
    }
  }
  else if (lat > 8.0 && lat < 8.6 && lng > 123.5 && lng < 124.0) {
    province = "Misamis Occidental";
    municipality = "Ozamiz City";
    barangay = "Catadman";
  }
  else if (lat > 9.1 && lat < 9.3 && lng > 124.6 && lng < 124.9) {
    province = "Camiguin";
    municipality = "Mambajao";
    barangay = "Poblacion";
  }
  else if (lat > 7.8 && lat < 8.3 && lng > 123.7 && lng < 124.5) {
    province = "Lanao del Norte";
    municipality = "Iligan City";
    barangay = "Tubod";
  }
  // Generic coordinates outside Region 10
  else if (lat > 14.0 && lat < 15.0 && lng > 120.5 && lng < 121.5) {
    province = "Metro Manila";
    municipality = "Manila";
    barangay = "Intramuros";
  }
  else if (lat > 10.0 && lat < 11.0 && lng > 123.5 && lng < 124.5) {
    province = "Cebu";
    municipality = "Cebu City";
    barangay = "Poblacion";
  }
  else if (lat > 6.8 && lat < 7.5 && lng > 125.3 && lng < 126.0) {
    province = "Davao del Sur";
    municipality = "Davao City";
    barangay = "Poblacion";
  }

  // 2. Override/refine based on address parsing terms
  if (address.includes("BONBON")) {
    barangay = "Bonbon";
    municipality = "Cagayan de Oro City";
    province = "Misamis Oriental";
  } else if (address.includes("PATAG")) {
    barangay = "Patag";
    municipality = "Cagayan de Oro City";
    province = "Misamis Oriental";
  } else if (address.includes("CARMEN")) {
    barangay = "Carmen";
    municipality = "Cagayan de Oro City";
    province = "Misamis Oriental";
  } else if (address.includes("BALULANG")) {
    barangay = "Balulang";
    municipality = "Cagayan de Oro City";
    province = "Misamis Oriental";
  } else if (address.includes("LUMBIA")) {
    barangay = "Lumbia";
    municipality = "Cagayan de Oro City";
    province = "Misamis Oriental";
  } else if (address.includes("SAN ISIDRO")) {
    barangay = "San Isidro";
    if (address.includes("NUEVA ECIJA")) {
      municipality = "Cabanatuan City";
      province = "Nueva Ecija";
    } else {
      municipality = "Valencia City";
      province = "Bukidnon";
    }
  } else if (address.includes("SUMPONG")) {
    barangay = "Sumpong";
    municipality = "Malaybalay City";
    province = "Bukidnon";
  }

  // Fallback for default test coordinates
  if (province === "Unknown") {
    province = "Misamis Oriental";
    municipality = "Cagayan de Oro City";
    barangay = "Poblacion";
  }

  return { barangay, municipality, province };
}

// Color gradient interpolation helper based on 6-level risk
function getContinuousColor(score) {
  score = Math.max(0.0, Math.min(1.0, score));
  
  const colors = [
    { p: 0.0, r: 41,  g: 128, b: 185 }, // Deep Blue (Very Low Risk)
    { p: 0.2, r: 52,  g: 152, b: 219 }, // Light Blue/Cyan (Low Risk)
    { p: 0.4, r: 46,  g: 204, b: 113 }, // Green (Moderate Risk)
    { p: 0.6, r: 241, g: 196, b: 15 },  // Yellow (High Risk)
    { p: 0.8, r: 230, g: 126, b: 34 },  // Orange (Severe Risk)
    { p: 1.0, r: 231, g: 76,  b: 60 }   // Vibrant Red (Critical Risk)
  ];
  
  let c1 = colors[0];
  let c2 = colors[colors.length - 1];
  
  for (let i = 0; i < colors.length - 1; i++) {
    if (score >= colors[i].p && score <= colors[i+1].p) {
      c1 = colors[i];
      c2 = colors[i+1];
      break;
    }
  }
  
  const range = c2.p - c1.p;
  const t = range === 0 ? 0 : (score - c1.p) / range;
  
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  
  return `rgb(${r}, ${g}, ${b})`;
}


const REGION_10_DATA = {
  "Bukidnon": {
    "Valencia City": ["Poblacion", "San Isidro", "Bagontaas", "Lumbayao", "Guinoyuran"],
    "Malaybalay City": ["Sumpong", "Casisang", "Kalasungay", "San Jose", "Canofoy"],
    "Maramag": ["Anahawon", "Base Camp", "Dagumba-an", "Dologon"],
    "Quezon": ["Libertad", "Magsaysay", "Minapan", "Salawagan", "Poblacion"],
    "Manolo Fortich": ["Damilag", "Alae", "Dahilayan", "Sankanan", "Tankulan"]
  },
  "Camiguin": {
    "Mambajao": ["Poblacion", "Anito", "Balbagon", "Bug-ong", "Yumbing"],
    "Catarman": ["Poblacion", "Bonbon", "Liloan", "Mainit", "Panghiawan"],
    "Guinsiliban": ["Cabuan", "Liong", "Poblacion", "North Poblacion", "South Poblacion"],
    "Mahinog": ["Poblacion", "Binone", "Hubangon", "San Isidro", "San Jose"],
    "Sagay": ["Poblacion", "Alangilan", "Bacnit", "Bugang", "Cuana"]
  },
  "Lanao del Norte": {
    "Iligan City": ["Poblacion", "Hinaplanon", "Suarez", "Tubod", "Dalipuga"],
    "Tubod": ["Poblacion", "Baroy", "Malingao", "Pigcarangan", "Tangcal"],
    "Baroy": ["Poblacion", "Cabasagan", "Dalama", "Libertad", "Salimpuno"],
    "Lala": ["Poblacion", "Lanipao", "Maranding", "Simpak", "Pinuyak"],
    "Kapatagan": ["Poblacion", "Cathedral", "Kahayag", "San Isidro", "Taguitic"]
  },
  "Misamis Occidental": {
    "Oroquieta City": ["Poblacion", "Canubay", "Layawan", "Mobod", "Taboc"],
    "Ozamiz City": ["Poblacion", "Banadero", "Catadman", "Gango", "Maningcol"],
    "Tangub City": ["Poblacion", "Garang", "Maloro", "Migcanaway", "Silangit"],
    "Jimenez": ["Poblacion", "Corrales", "Macabayao", "Sibaroc", "Tabo-o"],
    "Clarin": ["Poblacion", "Guba", "Lupagan", "Pan-ay", "Uguis"]
  },
  "Misamis Oriental": {
    "Cagayan de Oro City": ["Carmen", "Balulang", "Patag", "Bonbon", "Lumbia", "Nazareth", "Macasandig", "Kauswagan"],
    "Gingoog City": ["Poblacion", "Agaman-a", "Badingas", "Lunao", "San Jose"],
    "El Salvador City": ["Poblacion", "Amoros", "Cogon", "Himaya", "Sinaloc"],
    "Opol": ["Poblacion", "Barra", "Igpit", "Luyong Bonbon", "Taboc"],
    "Tagoloan": ["Poblacion", "Baluarte", "Casinglot", "Natumolan", "Santa Cruz"]
  }
};

let locationFiltersInitialized = false;

function populateLocationFilters() {
  if (locationFiltersInitialized) return;
  locationFiltersInitialized = true;

  // Populate Provinces
  mapFilterProvince.innerHTML = '<option value="all">All Provinces</option>';
  Object.keys(REGION_10_DATA).sort().forEach(p => {
    mapFilterProvince.innerHTML += `<option value="${p}">${p}</option>`;
  });

  // Populate Municipalities based on selected Province
  window.updateMunicipalityDropdown = function() {
    const selectedProvince = mapFilterProvince.value;
    const prevM = mapFilterMunicipality.value;
    mapFilterMunicipality.innerHTML = '<option value="all">All Municipalities</option>';
    
    let munisToPopulate = [];
    if (selectedProvince === 'all') {
      // Show all municipalities across all provinces
      Object.keys(REGION_10_DATA).forEach(p => {
        Object.keys(REGION_10_DATA[p]).forEach(m => munisToPopulate.push(m));
      });
    } else if (REGION_10_DATA[selectedProvince]) {
      munisToPopulate = Object.keys(REGION_10_DATA[selectedProvince]);
    }
    
    munisToPopulate = Array.from(new Set(munisToPopulate)).sort();
    munisToPopulate.forEach(m => {
      mapFilterMunicipality.innerHTML += `<option value="${m}">${m}</option>`;
    });

    if (munisToPopulate.includes(prevM)) {
      mapFilterMunicipality.value = prevM;
    } else {
      mapFilterMunicipality.value = 'all';
    }
    window.updateBarangayDropdown();
  };

  // Populate Barangays based on selected Municipality
  window.updateBarangayDropdown = function() {
    const selectedProvince = mapFilterProvince.value;
    const selectedMuni = mapFilterMunicipality.value;
    const prevB = mapFilterBarangay.value;
    mapFilterBarangay.innerHTML = '<option value="all">All Barangays</option>';

    let bgysToPopulate = [];
    if (selectedMuni === 'all') {
      // Show all barangays under selected province (or all)
      if (selectedProvince === 'all') {
        Object.keys(REGION_10_DATA).forEach(p => {
          Object.keys(REGION_10_DATA[p]).forEach(m => {
            REGION_10_DATA[p][m].forEach(b => bgysToPopulate.push(b));
          });
        });
      } else if (REGION_10_DATA[selectedProvince]) {
        Object.keys(REGION_10_DATA[selectedProvince]).forEach(m => {
          REGION_10_DATA[selectedProvince][m].forEach(b => bgysToPopulate.push(b));
        });
      }
    } else {
      // Find municipality's parent province
      let parentProv = selectedProvince;
      if (parentProv === 'all') {
        parentProv = Object.keys(REGION_10_DATA).find(p => REGION_10_DATA[p][selectedMuni]);
      }
      if (parentProv && REGION_10_DATA[parentProv] && REGION_10_DATA[parentProv][selectedMuni]) {
        bgysToPopulate = REGION_10_DATA[parentProv][selectedMuni];
      }
    }

    bgysToPopulate = Array.from(new Set(bgysToPopulate)).sort();
    bgysToPopulate.forEach(b => {
      mapFilterBarangay.innerHTML += `<option value="${b}">${b}</option>`;
    });

    if (bgysToPopulate.includes(prevB)) {
      mapFilterBarangay.value = prevB;
    } else {
      mapFilterBarangay.value = 'all';
    }
  };

  window.updateMunicipalityDropdown();
}

function initAdminMap() {
  if (adminMap) return;

  adminMap = L.map('admin-map', { zoomControl: true }).setView([8.4542, 124.6319], 11);
  
  standardTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap'
  });

  satelliteTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  });

  standardTileLayer.addTo(adminMap);

  rasterLayerGroup = L.layerGroup().addTo(adminMap);
  polygonLayerGroup = L.layerGroup().addTo(adminMap);
  markerLayerGroup = L.layerGroup().addTo(adminMap);

  btnToggleMapStyle.addEventListener('click', () => {
    if (currentMapStyle === 'standard') {
      adminMap.removeLayer(standardTileLayer);
      satelliteTileLayer.addTo(adminMap);
      currentMapStyle = 'satellite';
      btnToggleMapStyle.innerText = '🗺️ Standard View';
      btnToggleMapStyle.classList.remove('secondary');
    } else {
      adminMap.removeLayer(satelliteTileLayer);
      standardTileLayer.addTo(adminMap);
      currentMapStyle = 'standard';
      btnToggleMapStyle.innerText = '🛰️ Satellite View';
      btnToggleMapStyle.classList.add('secondary');
    }
  });

  mapFilterDate.addEventListener('change', () => {
    if (mapFilterDate.value === 'custom') {
      mapCustomDateContainerStart.classList.remove('hidden');
      mapCustomDateContainerEnd.classList.remove('hidden');
    } else {
      mapCustomDateContainerStart.classList.add('hidden');
      mapCustomDateContainerEnd.classList.add('hidden');
    }
    refreshAdminMap();
  });

  mapFilterStartDate.addEventListener('change', refreshAdminMap);
  mapFilterEndDate.addEventListener('change', refreshAdminMap);
  mapFilterProvince.addEventListener('change', () => {
    window.updateMunicipalityDropdown();
    refreshAdminMap();
  });
  mapFilterMunicipality.addEventListener('change', () => {
    window.updateBarangayDropdown();
    refreshAdminMap();
  });
  mapFilterBarangay.addEventListener('change', refreshAdminMap);
  mapFilterCrop.addEventListener('change', refreshAdminMap);
  mapHeatmapMode.addEventListener('change', refreshAdminMap);
  mapGeoView.addEventListener('change', () => {
    if (mapGeoView.value === 'regional') {
      adminMap.setView([8.4542, 124.6319], 9);
    } else {
      adminMap.setView([12.8797, 121.7740], 6);
    }
    refreshAdminMap();
  });
  mapSpatialResolution.addEventListener('change', refreshAdminMap);

  const valRadiusSelect = document.getElementById('validation-radius-select');
  if (valRadiusSelect) {
    valRadiusSelect.addEventListener('change', () => {
      if (currentDrawerReport) {
        runSurroundingValidation(currentDrawerReport, parseFloat(valRadiusSelect.value));
      }
    });
  }
}

function refreshAdminMap() {
  if (!adminMap) return;

  if (!provinceGeoJsonData) {
    loadProvinceGeoJson().then((data) => {
      if (data) {
        refreshAdminMap();
      }
    });
    return;
  }

  markerLayerGroup.clearLayers();
  polygonLayerGroup.clearLayers();
  if (rasterLayerGroup) {
    rasterLayerGroup.clearLayers();
  }

  populateLocationFilters();

  const selectedDisaster = mapFilterDisaster.value;
  const selectedStatus = mapFilterStatus.value;
  const selectedProvince = mapFilterProvince.value;
  const selectedMunicipality = mapFilterMunicipality.value;
  const selectedBarangay = mapFilterBarangay.value;
  const selectedCrop = mapFilterCrop.value;
  const selectedDateRange = mapFilterDate.value;
  const selectedHeatmapMode = mapHeatmapMode.value;
  const selectedGeoView = mapGeoView.value;
  const selectedResolution = mapSpatialResolution.value;

  const filtered = reportsData.filter(r => {
    if (selectedDisaster !== 'all' && r.disaster_type !== selectedDisaster) return false;
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;

    const loc = getReportLocationDetails(r);
    if (selectedProvince !== 'all' && loc.province !== selectedProvince) return false;
    if (selectedMunicipality !== 'all' && loc.municipality !== selectedMunicipality) return false;
    if (selectedBarangay !== 'all' && loc.barangay !== selectedBarangay) return false;

    if (selectedCrop !== 'all' && r.farmer_crop_type !== selectedCrop) return false;

    const reportDate = new Date(r.created_at);
    const now = new Date();
    if (selectedDateRange === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (reportDate < oneWeekAgo) return false;
    } else if (selectedDateRange === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (reportDate < oneMonthAgo) return false;
    } else if (selectedDateRange === 'custom') {
      if (mapFilterStartDate.value) {
        const start = new Date(mapFilterStartDate.value);
        start.setHours(0, 0, 0, 0);
        if (reportDate < start) return false;
      }
      if (mapFilterEndDate.value) {
        const end = new Date(mapFilterEndDate.value);
        end.setHours(23, 59, 59, 999);
        if (reportDate > end) return false;
      }
    }

    return true;
  });

  mapIncidentCounterLabel.innerText = `Showing ${filtered.length} crop damage report(s) on the map`;

  if (selectedHeatmapMode === 'none') {
    heatmapLegendCard.classList.add('hidden');
  } else {
    heatmapLegendCard.classList.remove('hidden');
  }

  if (selectedHeatmapMode !== 'none') {
    const heatmapReports = filtered.filter(r => {
      if (selectedHeatmapMode === 'all_disasters') return true;
      return r.disaster_type === selectedHeatmapMode;
    });

    if (selectedResolution === 'smooth') {
      let bounds;
      let sigma;
      let epsilon;

      if (selectedGeoView === 'regional') {
        bounds = [[7.2, 123.4], [9.4, 125.6]];
        sigma = 0.65;
        epsilon = 0.015;
      } else {
        bounds = [[4.5, 116.5], [21.5, 127.0]];
        sigma = 3.5;
        epsilon = 0.25;
      }

      const latMin = bounds[0][0];
      const lngMin = bounds[0][1];
      const latMax = bounds[1][0];
      const lngMax = bounds[1][1];

      const canvasSize = 180;
      const canvas = document.createElement('canvas');
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(canvasSize, canvasSize);

      for (let y = 0; y < canvasSize; y++) {
        const pixelLat = latMax - (y / (canvasSize - 1)) * (latMax - latMin);
        for (let x = 0; x < canvasSize; x++) {
          const pixelLng = lngMin + (x / (canvasSize - 1)) * (lngMax - lngMin);

          let score = 0.0;
          let decay = 0.0;
          if (heatmapReports.length > 0) {
            let sumWeights = 0;
            let sumWeightedScore = 0;
            let minDistSq = Infinity;

            heatmapReports.forEach(r => {
              const rCoords = getVisualCoordinates(r);
              const rLat = rCoords[0];
              const rLng = rCoords[1];

              const dSq = (pixelLat - rLat) * (pixelLat - rLat) + (pixelLng - rLng) * (pixelLng - rLng);
              if (dSq < minDistSq) {
                minDistSq = dSq;
              }

              const w = 1.0 / (dSq + epsilon);
              let sevScore = 0.2;
              if (r.severity === 'moderate') sevScore = 0.6;
              if (r.severity === 'severe') sevScore = 1.0;

              sumWeights += w;
              sumWeightedScore += w * sevScore;
            });

            const avgSeverity = sumWeightedScore / sumWeights;
            const minDist = Math.sqrt(minDistSq);
            decay = Math.exp(-((minDist / sigma) * (minDist / sigma)));
            score = avgSeverity * decay;
          }

          const colorStr = getContinuousColor(score);
          const rgb = colorStr.match(/\d+/g).map(Number);

          const idx = (y * canvasSize + x) * 4;
          imgData.data[idx] = rgb[0];
          imgData.data[idx + 1] = rgb[1];
          imgData.data[idx + 2] = rgb[2];
          imgData.data[idx + 3] = Math.round(0.6 * 255);
        }
      }

      ctx.putImageData(imgData, 0, 0);

      const overlayUrl = canvas.toDataURL();
      const imageOverlay = L.imageOverlay(overlayUrl, bounds, {
        opacity: 0.85,
        interactive: false
      });
      imageOverlay.addTo(rasterLayerGroup);

    } else if (selectedResolution === 'province') {
      const provinceStats = {};
      const provincesList = ["Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental"];
      provincesList.forEach(prov => {
        provinceStats[prov] = { name: prov, reports: [], farmersCount: 0 };
      });

      heatmapReports.forEach(r => {
        const loc = getReportLocationDetails(r);
        if (provinceStats[loc.province]) {
          provinceStats[loc.province].reports.push(r);
        }
      });

      farmersData.forEach(f => {
        let provName = "Unknown";
        if (f.address) {
          const addressUpper = f.address.toUpperCase();
          if (addressUpper.includes('BONBON') || addressUpper.includes('MISAMIS ORIENTAL') || addressUpper.includes('CAGAYAN DE ORO')) {
            provName = 'Misamis Oriental';
          } else if (addressUpper.includes('SAN ISIDRO') || addressUpper.includes('BUKIDNON') || addressUpper.includes('VALENCIA') || addressUpper.includes('MALAYBALAY')) {
            provName = 'Bukidnon';
          } else if (addressUpper.includes('LANAO DEL NORTE') || addressUpper.includes('ILIGAN') || addressUpper.includes('TUBOD')) {
            provName = 'Lanao del Norte';
          } else if (addressUpper.includes('MISAMIS OCCIDENTAL') || addressUpper.includes('OZAMIZ')) {
            provName = 'Misamis Occidental';
          } else if (addressUpper.includes('CAMIGUIN') || addressUpper.includes('MAMBAJAO')) {
            provName = 'Camiguin';
          }
        }
        if (provName === "Unknown") provName = "Misamis Oriental";
        if (provinceStats[provName]) {
          provinceStats[provName].farmersCount++;
        }
      });

      L.geoJSON(provinceGeoJsonData, {
        style: function(feature) {
          const provName = feature.properties.PROVINCE;
          const stats = provinceStats[provName] || { reports: [], farmersCount: 0 };

          let score = 0.0;
          if (stats.reports.length > 0) {
            let sumSev = 0;
            stats.reports.forEach(r => {
              let s = 0.2;
              if (r.severity === 'moderate') s = 0.6;
              if (r.severity === 'severe') s = 1.0;
              sumSev += s;
            });
            const avgSev = sumSev / stats.reports.length;
            const densityFactor = 0.6 + 0.4 * Math.min(1.0, (stats.reports.length - 1) / 3);
            score = Math.min(1.0, avgSev * densityFactor);
          }

          return {
            color: '#ffffff',
            weight: 1.5,
            fillColor: getContinuousColor(score),
            fillOpacity: 0.6
          };
        },
        onEachFeature: function(feature, layer) {
          const provName = feature.properties.PROVINCE;
          const stats = provinceStats[provName] || { reports: [], farmersCount: 0 };

          let score = 0.0;
          if (stats.reports.length > 0) {
            let sumSev = 0;
            stats.reports.forEach(r => {
              let s = 0.2;
              if (r.severity === 'moderate') s = 0.6;
              if (r.severity === 'severe') s = 1.0;
              sumSev += s;
            });
            const avgSev = sumSev / stats.reports.length;
            const densityFactor = 0.6 + 0.4 * Math.min(1.0, (stats.reports.length - 1) / 3);
            score = Math.min(1.0, avgSev * densityFactor);
          }

          const riskPct = Math.round(score * 100);
          let riskLabel = "Very Low Risk";
          if (score > 0.85) riskLabel = "Critical Risk";
          else if (score > 0.65) riskLabel = "Severe Risk";
          else if (score > 0.45) riskLabel = "High Risk";
          else if (score > 0.25) riskLabel = "Moderate Risk";
          else if (score > 0.05) riskLabel = "Low Risk";

          const color = getContinuousColor(score);
          const tooltipContent = `
            <div style="font-family: 'Outfit', sans-serif; font-size: 12px; padding: 4px;">
              <strong style="color: var(--brand-green); font-size: 13px;">${provName} Province</strong><br>
              <span style="color: var(--text-muted);">View:</span> <strong>Province Boundary Map</strong><br>
              <span style="color: var(--text-muted);">Disaster Risk:</span> <strong style="color: ${color};">${riskLabel} (${riskPct}%)</strong><br>
              <span style="color: var(--text-muted);">Reports Count:</span> <strong>${stats.reports.length} reports</strong><br>
              <span style="color: var(--text-muted);">Farmers registered:</span> <strong>${stats.farmersCount}</strong>
            </div>
          `;
          layer.bindTooltip(tooltipContent, { sticky: true, opacity: 0.95 });

          layer.on('click', () => {
            adminMap.fitBounds(layer.getBounds(), { padding: [20, 20] });
          });
        }
      }).addTo(rasterLayerGroup);

    } else if (selectedResolution === 'municipality' || selectedResolution === 'barangay') {
      const groupStats = {};

      heatmapReports.forEach(r => {
        const loc = getReportLocationDetails(r);
        const nameKey = selectedResolution === 'municipality' ? loc.municipality : loc.barangay;
        
        if (!groupStats[nameKey]) {
          groupStats[nameKey] = {
            name: nameKey,
            reports: [],
            province: loc.province
          };
        }
        groupStats[nameKey].reports.push(r);
      });

      Object.values(groupStats).forEach(stats => {
        let centerCoords = null;
        let radius = 10000;

        if (selectedResolution === 'municipality') {
          centerCoords = MUNICIPALITY_COORDS[stats.name];
          radius = 12000;
        } else {
          centerCoords = BARANGAY_COORDS[stats.name];
          radius = 4000;
        }

        if (!centerCoords) {
          let sumLat = 0, sumLng = 0;
          stats.reports.forEach(r => {
            sumLat += parseFloat(r.latitude);
            sumLng += parseFloat(r.longitude);
          });
          centerCoords = [sumLat / stats.reports.length, sumLng / stats.reports.length];
        }

        let score = 0.0;
        let sumSev = 0;
        stats.reports.forEach(r => {
          let s = 0.2;
          if (r.severity === 'moderate') s = 0.6;
          if (r.severity === 'severe') s = 1.0;
          sumSev += s;
        });
        const avgSev = sumSev / stats.reports.length;
        const densityFactor = 0.6 + 0.4 * Math.min(1.0, (stats.reports.length - 1) / 3);
        score = Math.min(1.0, avgSev * densityFactor);

        const color = getContinuousColor(score);
        const riskPct = Math.round(score * 100);
        
        let riskLabel = "Very Low Risk";
        if (score > 0.85) riskLabel = "Critical Risk";
        else if (score > 0.65) riskLabel = "Severe Risk";
        else if (score > 0.45) riskLabel = "High Risk";
        else if (score > 0.25) riskLabel = "Moderate Risk";
        else if (score > 0.05) riskLabel = "Low Risk";

        const zoneCircle = L.circle(centerCoords, {
          radius: radius,
          color: color,
          weight: 2,
          opacity: 0.5,
          fillColor: color,
          fillOpacity: 0.4
        });

        const levelLabel = selectedResolution === 'municipality' ? 'Municipality' : 'Barangay';
        const tooltipContent = `
          <div style="font-family: 'Outfit', sans-serif; font-size: 12px; padding: 4px;">
            <strong style="color: var(--brand-green); font-size: 13px;">${stats.name} (${stats.province})</strong><br>
            <span style="color: var(--text-muted);">Level:</span> <strong>${levelLabel} heat zone</strong><br>
            <span style="color: var(--text-muted);">Disaster Risk:</span> <strong style="color: ${color};">${riskLabel} (${riskPct}%)</strong><br>
            <span style="color: var(--text-muted);">Report count:</span> <strong>${stats.reports.length} reports</strong>
          </div>
        `;
        zoneCircle.bindTooltip(tooltipContent, { sticky: true, opacity: 0.95 });
        zoneCircle.addTo(rasterLayerGroup);
      });
    }
  }

  const disasterSummaryCounts = {};
  ['Flood', 'Drought', 'Typhoon', 'Pest', 'Disease'].forEach(t => disasterSummaryCounts[t] = 0);

  filtered.forEach(report => {
    const coords = getVisualCoordinates(report);
    const lat = coords[0];
    const lng = coords[1];
    
    disasterSummaryCounts[report.disaster_type] = (disasterSummaryCounts[report.disaster_type] || 0) + 1;

    const isHeatmapActive = selectedHeatmapMode !== 'none';
    let markerColor = '#d32f2f';
    if (report.status === 'verified') markerColor = '#007E3A';
    if (report.status === 'responded') markerColor = '#2980b9';

    const marker = L.circleMarker([lat, lng], {
      radius: isHeatmapActive ? 6 : 9,
      fillColor: markerColor,
      color: '#ffffff',
      weight: isHeatmapActive ? 1.0 : 1.5,
      fillOpacity: isHeatmapActive ? 0.45 : 0.9
    });

    marker.bindTooltip(`
      <strong>RPT-2026-${String(report.id).padStart(3, '0')}</strong><br>
      Farmer: ${report.farmer_name}<br>
      Disaster: ${report.disaster_type}<br>
      Status: ${report.status.toUpperCase()}
    `);

    marker.on('click', () => openReportDrawer(report));
    markerLayerGroup.addLayer(marker);

    if (!isHeatmapActive) {
      try {
        let boundaryCoords = JSON.parse(report.boundary_polygon);
        if (boundaryCoords.length >= 3) {
          const actualLat = parseFloat(report.latitude);
          const actualLng = parseFloat(report.longitude);
          const diffLat = lat - actualLat;
          const diffLng = lng - actualLng;

          if (diffLat !== 0 || diffLng !== 0) {
            boundaryCoords = boundaryCoords.map(pt => [pt[0] + diffLat, pt[1] + diffLng]);
          }

          const polygon = L.polygon(boundaryCoords, {
            color: '#007E3A',
            fillColor: '#007E3A',
            fillOpacity: 0.1,
            weight: 2
          });

          polygon.on('click', () => openReportDrawer(report));
          polygonLayerGroup.addLayer(polygon);
        }
      } catch (err) {
        console.warn(err);
      }
    }
  });

  mapLegendDisastersStats.innerHTML = '';
  Object.entries(disasterSummaryCounts).forEach(([type, count]) => {
    const row = document.createElement('div');
    row.className = 'disaster-stat-row';
    row.innerHTML = `
      <span>${getDisasterIcon(type)} ${type}</span>
      <span class="disaster-stat-count">${count}</span>
    `;
    mapLegendDisastersStats.appendChild(row);
  });

  const mapSidebarReportsList = document.getElementById('map-sidebar-reports-list');
  if (mapSidebarReportsList) {
    mapSidebarReportsList.innerHTML = '';
    if (filtered.length === 0) {
      mapSidebarReportsList.innerHTML = '<div class="no-data" style="font-size: 12px; padding: 10px; text-align: center; color: var(--text-muted);">No reports found.</div>';
    } else {
      filtered.forEach(report => {
        const item = document.createElement('div');
        item.className = 'map-sidebar-report-item';
        
        const dateStr = new Date(report.created_at).toLocaleDateString('en-US', {
          month: 'numeric', day: 'numeric', year: 'numeric'
        });

        item.innerHTML = `
          <span class="map-sidebar-report-dot ${report.status}"></span>
          <div class="map-sidebar-report-info">
            <span class="map-sidebar-report-name">${report.farmer_name}</span>
            <span class="map-sidebar-report-loc">${report.farmer_address || 'Cagayan de Oro City'}</span>
            <span class="map-sidebar-report-date">${dateStr}</span>
          </div>
        `;
        
        item.addEventListener('click', () => {
          const coords = getVisualCoordinates(report);
          adminMap.setView(coords, 15);
          openReportDrawer(report);
        });
        
        mapSidebarReportsList.appendChild(item);
      });
    }
  }

  if (filtered.length > 0 && selectedProvince === 'all' && selectedMunicipality === 'all' && selectedBarangay === 'all' && selectedGeoView === 'regional') {
    const latlngs = filtered.map(r => getVisualCoordinates(r));
    adminMap.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
  }
}

mapFilterDisaster.addEventListener('change', refreshAdminMap);
mapFilterStatus.addEventListener('change', refreshAdminMap);

btnResetMapFilters.addEventListener('click', () => {
  mapFilterDisaster.value = 'all';
  mapFilterStatus.value = 'all';
  mapFilterProvince.value = 'all';
  if (window.updateMunicipalityDropdown) {
    window.updateMunicipalityDropdown();
  }
  mapFilterCrop.value = 'all';
  mapFilterDate.value = 'all';
  mapFilterStartDate.value = '';
  mapFilterEndDate.value = '';
  mapCustomDateContainerStart.classList.add('hidden');
  mapCustomDateContainerEnd.classList.add('hidden');
  mapHeatmapMode.value = 'all_disasters';
  mapGeoView.value = 'regional';
  mapSpatialResolution.value = 'smooth';
  adminMap.setView([8.4542, 124.6319], 9);
  refreshAdminMap();
});

/* ==========================================================================
   REVIEW DRAWER
   ========================================================================== */

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function runSurroundingValidation(report, radiusKm) {
  const rLat = parseFloat(report.latitude);
  const rLng = parseFloat(report.longitude);
  
  const nearby = reportsData.filter(r => {
    if (r.id === report.id) return false;
    const dist = getHaversineDistance(rLat, rLng, parseFloat(r.latitude), parseFloat(r.longitude));
    r.tempDistance = dist;
    return dist <= radiusKm;
  });

  nearby.sort((a, b) => a.tempDistance - b.tempDistance);

  const progressRing = document.getElementById('confidence-progress-ring');
  const percentageLabel = document.getElementById('confidence-percentage-label');
  const levelTag = document.getElementById('confidence-level-tag');
  const summaryText = document.getElementById('confidence-summary-text');
  const listContainer = document.getElementById('nearby-incidents-list');

  if (!progressRing || !percentageLabel || !levelTag || !summaryText || !listContainer) return;

  let score = 0.0;
  let summary = "";
  let level = "Low Confidence";
  let color = "#d32f2f";

  if (nearby.length === 0) {
    score = 0.15;
    level = "Low Confidence";
    color = "#d32f2f";
    summary = "This is an isolated report. No other incidents reported nearby.";
  } else {
    const similar = nearby.filter(r => r.disaster_type === report.disaster_type);
    const sameCount = similar.length;
    const verifiedSameCount = similar.filter(r => r.status === 'verified' || r.status === 'responded').length;

    const densityFactor = Math.min(1.0, sameCount / 3);
    const similarityFactor = sameCount / nearby.length;
    
    const baseScore = 0.25 + 0.45 * densityFactor + 0.2 * similarityFactor;
    const verifiedBonus = Math.min(0.2, verifiedSameCount * 0.1);
    
    score = Math.min(1.0, baseScore + verifiedBonus);

    if (score >= 0.75) {
      level = "High Confidence";
      color = "#007E3A";
    } else if (score >= 0.45) {
      level = "Moderate Confidence";
      color = "#b0a20e";
    } else {
      level = "Low Confidence";
      color = "#e67e22";
    }

    summary = `Found ${sameCount} similar ${report.disaster_type} report(s) out of ${nearby.length} total nearby reports.`;
  }

  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score);
  progressRing.style.strokeDashoffset = offset;
  progressRing.style.stroke = color;

  percentageLabel.innerText = `${Math.round(score * 100)}%`;
  levelTag.innerText = level;
  levelTag.style.color = color;
  summaryText.innerText = summary;

  listContainer.innerHTML = "";
  if (nearby.length === 0) {
    listContainer.innerHTML = `<div style="font-size: 11px; text-align: center; color: var(--text-muted); padding: 8px;">No reports within ${radiusKm}km.</div>`;
  } else {
    nearby.forEach(r => {
      const item = document.createElement('div');
      item.className = 'nearby-incident-item';
      
      const formattedDistance = r.tempDistance.toFixed(2);
      
      item.innerHTML = `
        <div class="nearby-incident-left">
          <span class="nearby-incident-dot ${r.status}"></span>
          <div class="nearby-incident-meta">
            <span class="nearby-incident-id">RPT-2026-${String(r.id).padStart(3, '0')}</span>
            <span class="nearby-incident-desc">${getDisasterIcon(r.disaster_type)} ${r.disaster_type} &bull; ${r.farmer_name}</span>
          </div>
        </div>
        <div class="nearby-incident-right">
          <span class="nearby-incident-distance">${formattedDistance} km</span>
          <span class="nearby-incident-sev ${r.severity}">${r.severity}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        openReportDrawer(r);
      });

      listContainer.appendChild(item);
    });
  }
}

function openReportDrawer(report) {
  currentDrawerReport = report;

  // Set values
  drawerFarmerName.innerText = report.farmer_name;
  drawerFarmerContact.innerText = report.farmer_contact || 'None provided';
  drawerDate.innerText = new Date(report.created_at).toLocaleString();
  drawerDisasterType.innerText = report.disaster_type;
  drawerGps.innerText = `${parseFloat(report.latitude).toFixed(5)}, ${parseFloat(report.longitude).toFixed(5)}`;
  drawerDetails.innerText = report.details;
  drawerPhoto.src = `${API_URL}/uploads/${report.image_name}`;

  // Precheck severity
  document.getElementById(`drawer-sev-${report.severity}`).checked = true;

  // Button disabled configurations
  btnValidate.className = 'v-btn success';
  btnReject.className = 'v-btn danger';

  if (report.status === 'verified') {
    btnValidate.classList.add('disabled');
    btnValidate.innerText = 'Verified ✓';
  } else {
    btnValidate.innerText = 'Verify & Approve';
  }

  if (report.status === 'responded') {
    btnReject.classList.add('disabled');
    btnReject.innerText = 'Responded ✓';
  } else {
    btnReject.innerText = 'Mark as Responded';
  }

  // Display Drawer
  drawerBackdrop.classList.remove('hidden');
  reportDrawer.classList.remove('hidden');

  // Run surrounding farm validation
  const radiusSelect = document.getElementById('validation-radius-select');
  if (radiusSelect) {
    radiusSelect.value = "3";
  }
  runSurroundingValidation(report, 3);

  setTimeout(() => {
    initDrawerMap(report);
  }, 300);
}

function initDrawerMap(report) {
  const lat = parseFloat(report.latitude);
  const lng = parseFloat(report.longitude);

  if (!drawerMap) {
    drawerMap = L.map('drawer-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([lat, lng], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(drawerMap);
    drawerPolygonLayer = L.layerGroup().addTo(drawerMap);
  } else {
    drawerMap.setView([lat, lng], 15);
    drawerPolygonLayer.clearLayers();
  }

  // Draw polygon or single point marker
  try {
    const coords = JSON.parse(report.boundary_polygon);
    if (coords.length >= 3) {
      const polygon = L.polygon(coords, {
        color: '#007E3A',
        fillColor: '#007E3A',
        fillOpacity: 0.25,
        weight: 3
      }).addTo(drawerPolygonLayer);
      drawerMap.fitBounds(polygon.getBounds(), { padding: [10, 10] });
    } else {
      L.marker([lat, lng]).addTo(drawerPolygonLayer);
    }
  } catch (err) {
    L.marker([lat, lng]).addTo(drawerPolygonLayer);
  }

  drawerMap.invalidateSize();
}

function closeDrawer() {
  drawerBackdrop.classList.add('hidden');
  reportDrawer.classList.add('hidden');
  currentDrawerReport = null;
}

btnCloseDrawer.addEventListener('click', closeDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);

// Validate and Reject Trigger operations
btnValidate.addEventListener('click', () => updateReportStatus('verified'));
btnReject.addEventListener('click', () => updateReportStatus('responded'));

async function updateReportStatus(status) {
  if (!currentDrawerReport || !token) return;

  const severityVal = document.querySelector('input[name="drawer-severity"]:checked').value;
  await executeReportAction(currentDrawerReport.id, status, severityVal);
  closeDrawer();
}

// Modal and Drawer report API action
async function executeReportAction(reportId, status, severityVal) {
  try {
    const res = await fetch(`${API_URL}/api/reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status, severity: severityVal })
    });

    if (res.ok) {
      showToast(`Report status updated to ${status}.`);
      closeAllModals();
      loadAllData();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to update report status.', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to database.', 'error');
  }
}

// Centered Modals Management
let currentModalReport = null;

function openReportDetailsModal(report) {
  currentModalReport = report;
  const modal = document.getElementById('report-details-modal');
  const backdrop = document.getElementById('modal-backdrop');

  document.getElementById('modal-report-photo').src = `${API_URL}/uploads/${report.image_name}`;
  document.getElementById('modal-report-id').innerText = `RPT-2026-${String(report.id).padStart(3, '0')}`;

  const statusBadge = document.getElementById('modal-report-status');
  statusBadge.innerText = report.status.toUpperCase();
  statusBadge.className = `status-badge ${report.status}`;

  document.getElementById('modal-report-farmer').innerText = report.farmer_name;
  document.getElementById('modal-report-location').innerText = report.address || `Lat: ${parseFloat(report.latitude).toFixed(4)}, Lng: ${parseFloat(report.longitude).toFixed(4)}`;
  document.getElementById('modal-report-croptype').innerText = report.crop_type || 'Rice';
  document.getElementById('modal-report-disease').innerText = report.disaster_type;
  document.getElementById('modal-report-severity').value = report.severity;
  document.getElementById('modal-report-date').innerText = new Date(report.created_at).toLocaleString();
  document.getElementById('modal-report-notes').innerText = report.details;

  const btnReject = document.getElementById('modal-btn-reject');
  const btnValidate = document.getElementById('modal-btn-validate');

  btnReject.className = 'v-btn danger';
  btnValidate.className = 'v-btn success';

  if (report.status === 'verified') {
    btnValidate.classList.add('disabled');
    btnValidate.innerText = 'Validated ✓';
  } else {
    btnValidate.innerText = 'Validate Report';
  }

  if (report.status === 'responded') {
    btnReject.classList.add('disabled');
    btnReject.innerText = 'Rejected ✓';
  } else {
    btnReject.innerText = 'Reject Report';
  }

  backdrop.classList.remove('hidden');
  modal.classList.remove('hidden');
}

function openFarmerDetailsModal(farmer) {
  const modal = document.getElementById('farmer-details-modal');
  const backdrop = document.getElementById('modal-backdrop');

  document.getElementById('modal-farmer-fullname').innerText = farmer.fullName;

  const statusBadge = document.getElementById('modal-farmer-status-badge');
  statusBadge.innerText = farmer.status === 'active' ? 'Active' : 'Inactive';
  statusBadge.className = `status-badge ${farmer.status}`;

  document.getElementById('modal-farmer-id').innerText = `FMR-2026-${String(farmer.id).padStart(3, '0')}`;
  document.getElementById('modal-farmer-status').innerText = farmer.status.toUpperCase();
  document.getElementById('modal-farmer-contact').innerText = farmer.contactNumber || 'None provided';
  document.getElementById('modal-farmer-email').innerText = farmer.username;
  document.getElementById('modal-farmer-location').innerText = farmer.address || 'Not specified';
  document.getElementById('modal-farmer-joined').innerText = new Date(farmer.createdAt).toLocaleDateString();
  document.getElementById('modal-farmer-reports-count').innerText = `${farmer.reportCount} report(s)`;

  const approvalSection = document.getElementById('boundary-approval-section');
  const verificationSection = document.getElementById('farmer-verification-section');
  
  // Reset visibility states
  approvalSection.classList.add('hidden');
  verificationSection.classList.add('hidden');
  modal.classList.add('mini');

  if (farmer.pendingBoundaryPolygon) {
    modal.classList.remove('mini');
    approvalSection.classList.remove('hidden');
    
    // Wire approval buttons
    const btnApprove = document.getElementById('btn-approve-boundary');
    const btnReject = document.getElementById('btn-reject-boundary');
    
    btnApprove.replaceWith(btnApprove.cloneNode(true));
    btnReject.replaceWith(btnReject.cloneNode(true));
    
    document.getElementById('btn-approve-boundary').addEventListener('click', async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/farmers/${farmer.id}/approve-boundary`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          showToast('Farm boundary update approved.');
          closeAllModals();
          loadAllData();
        } else {
          const data = await res.json();
          showToast(data.error || 'Failed to approve boundary change.', 'error');
        }
      } catch (err) {
        showToast('Server error.', 'error');
      }
    });

    document.getElementById('btn-reject-boundary').addEventListener('click', async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/farmers/${farmer.id}/reject-boundary`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          showToast('Farm boundary update rejected.');
          closeAllModals();
          loadAllData();
        } else {
          const data = await res.json();
          showToast(data.error || 'Failed to reject boundary change.', 'error');
        }
      } catch (err) {
        showToast('Server error.', 'error');
      }
    });
  }

  if (farmer.status === 'inactive') {
    modal.classList.remove('mini');
    verificationSection.classList.remove('hidden');

    const btnVerify = document.getElementById('btn-verify-farmer');
    btnVerify.replaceWith(btnVerify.cloneNode(true));

    document.getElementById('btn-verify-farmer').addEventListener('click', async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/farmers/${farmer.id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'active' })
        });
        if (res.ok) {
          showToast('Farmer account accepted and verified successfully.');
          closeAllModals();
          loadAllData();
        } else {
          const data = await res.json();
          showToast(data.error || 'Failed to verify farmer.', 'error');
        }
      } catch (err) {
        showToast('Server error.', 'error');
      }
    });
  }

  // Initialize and populate farmerDetailMap
  setTimeout(() => {
    if (!farmerDetailMap) {
      farmerDetailMap = L.map('farmer-detail-map', {
        zoomControl: true,
        maxZoom: 18
      }).setView([14.5995, 120.9842], 13);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(farmerDetailMap);
    } else {
      if (farmerApprovedPolygon) farmerDetailMap.removeLayer(farmerApprovedPolygon);
      if (farmerPendingPolygon) farmerDetailMap.removeLayer(farmerPendingPolygon);
      farmerApprovedPolygon = null;
      farmerPendingPolygon = null;
    }

    let bounds = [];
    if (farmer.boundaryPolygon) {
      try {
        const pts = JSON.parse(farmer.boundaryPolygon);
        farmerApprovedPolygon = L.polygon(pts, {
          color: '#007E3A',
          fillColor: '#007E3A',
          fillOpacity: 0.25,
          weight: 3
        }).addTo(farmerDetailMap);
        bounds = farmerApprovedPolygon.getBounds();
      } catch (e) {
        console.error(e);
      }
    }

    if (farmer.pendingBoundaryPolygon) {
      try {
        const pts = JSON.parse(farmer.pendingBoundaryPolygon);
        farmerPendingPolygon = L.polygon(pts, {
          color: '#d97706',
          fillColor: '#d97706',
          fillOpacity: 0.15,
          weight: 3,
          dashArray: '5, 5'
        }).addTo(farmerDetailMap);
        bounds = farmerPendingPolygon.getBounds();
      } catch (e) {
        console.error(e);
      }
    }

    if (bounds && bounds.isValid && bounds.isValid()) {
      farmerDetailMap.fitBounds(bounds, { padding: [15, 15] });
    } else {
      // CDO default if no boundary
      farmerDetailMap.setView([8.4542, 124.6319], 12);
    }

    farmerDetailMap.invalidateSize();
  }, 150);

  backdrop.classList.remove('hidden');
  modal.classList.remove('hidden');
}

function closeAllModals() {
  document.getElementById('modal-backdrop').classList.add('hidden');
  document.getElementById('report-details-modal').classList.add('hidden');
  document.getElementById('farmer-details-modal').classList.add('hidden');
  currentModalReport = null;
}

// Modal Event Listeners
document.getElementById('btn-close-report-modal').addEventListener('click', closeAllModals);
document.getElementById('btn-close-farmer-modal').addEventListener('click', closeAllModals);
document.getElementById('modal-btn-close-farmer').addEventListener('click', closeAllModals);
document.getElementById('modal-backdrop').addEventListener('click', () => {
  closeAllModals();
  closeDrawer();
});

document.getElementById('modal-btn-validate').addEventListener('click', () => {
  if (currentModalReport && currentModalReport.status !== 'verified') {
    const severityVal = document.getElementById('modal-report-severity').value;
    executeReportAction(currentModalReport.id, 'verified', severityVal);
  }
});
document.getElementById('modal-btn-reject').addEventListener('click', () => {
  if (currentModalReport && currentModalReport.status !== 'responded') {
    const severityVal = document.getElementById('modal-report-severity').value;
    executeReportAction(currentModalReport.id, 'responded', severityVal);
  }
});
document.getElementById('modal-report-severity').addEventListener('change', (e) => {
  if (currentModalReport) {
    const newSeverity = e.target.value;
    executeReportAction(currentModalReport.id, currentModalReport.status, newSeverity);
  }
});

/* ==========================================================================
   NOTIFICATIONS BELL INTERACTIVITY
   ========================================================================== */

headerNotifBell.addEventListener('click', (e) => {
  e.stopPropagation();
  bellNotifDropdown.classList.toggle('hidden');
  loadAdminNotifications();
});

document.addEventListener('click', () => {
  bellNotifDropdown.classList.add('hidden');
});

function renderBellNotifications() {
  const unread = alertsData.filter(n => !n.is_read);
  if (unread.length > 0) {
    bellBadge.innerText = unread.length;
    bellBadge.classList.remove('hidden');
  } else {
    bellBadge.classList.add('hidden');
  }

  if (alertsData.length === 0) {
    bellDropdownListHolder.innerHTML = '<div class="no-data">No alerts received.</div>';
    return;
  }

  bellDropdownListHolder.innerHTML = '';
  alertsData.slice(0, 5).forEach(alert => {
    const item = document.createElement('div');
    item.className = `bell-item-card ${alert.is_read ? 'read' : ''}`;
    item.innerText = alert.message;

    // Clicking marks read & opens details if boundary change or new farmer
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      bellNotifDropdown.classList.add('hidden');

      if (alert.message.includes('[Boundary Change]') || alert.message.includes('[New Farmer]')) {
        const match = alert.message.match(/FMR-2026-(\d+)/);
        if (match) {
          const farmerId = parseInt(match[1], 10);
          const farmer = farmersData.find(f => f.id === farmerId);
          if (farmer) {
            openFarmerDetailsModal(farmer);
          }
        }
      }

      if (!alert.is_read) {
        try {
          const res = await fetch(`${API_URL}/api/notifications/${alert.id}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            loadAdminNotifications();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });

    bellDropdownListHolder.appendChild(item);
  });
}

/* ==========================================================================
   CSV & PDF PRINT DATA EXPORTS
   ========================================================================== */

let currentExportTarget = 'reports'; // 'reports' or 'farmers'

function openExportModal(target) {
  currentExportTarget = target;
  exportOptionsModal.classList.remove('hidden');
}

function closeExportModal() {
  exportOptionsModal.classList.add('hidden');
}

if (btnTriggerReportsExport) {
  btnTriggerReportsExport.addEventListener('click', () => openExportModal('reports'));
}

if (btnTriggerFarmersExport) {
  btnTriggerFarmersExport.addEventListener('click', () => openExportModal('farmers'));
}

if (btnCloseExportModal) {
  btnCloseExportModal.addEventListener('click', closeExportModal);
}

// Global click checks to close modal if background clicked
exportOptionsModal.addEventListener('click', (e) => {
  if (e.target === exportOptionsModal) closeExportModal();
});

// PDF Option Click
exportOptPdf.addEventListener('click', () => {
  closeExportModal();
  if (currentExportTarget === 'reports') {
    exportReportsToPdf();
  } else {
    exportFarmersToPdf();
  }
});

// Excel Option Click
exportOptExcel.addEventListener('click', () => {
  closeExportModal();
  if (currentExportTarget === 'reports') {
    exportReportsToExcel();
  } else {
    exportFarmersToExcel();
  }
});

// CSV Option Click
exportOptCsv.addEventListener('click', () => {
  closeExportModal();
  if (currentExportTarget === 'reports') {
    exportReportsToCsv();
  } else {
    exportFarmersToCsv();
  }
});

// Helper: Export Reports to PDF
function exportReportsToPdf() {
  const total = reportsData.length;
  const verified = reportsData.filter(r => r.status === 'verified').length;
  const pending = reportsData.filter(r => r.status === 'pending').length;
  const responded = reportsData.filter(r => r.status === 'responded').length;

  let tableRows = '';
  reportsData.forEach(report => {
    tableRows += `
      <tr>
        <td>RPT-2026-${String(report.id).padStart(3, '0')}</td>
        <td>${report.farmer_name}</td>
        <td>Lat: ${parseFloat(report.latitude).toFixed(4)}, Lng: ${parseFloat(report.longitude).toFixed(4)}</td>
        <td>${report.disaster_type}</td>
        <td style="text-transform: capitalize;">${report.status}</td>
        <td>${new Date(report.created_at).toLocaleDateString()}</td>
      </tr>
    `;
  });

  pdfPrintLayout.innerHTML = `
    <div class="pdf-header">
      <div class="pdf-title">
        <h1>AGRISNAP REGIONAL DAMAGE SUMMARY</h1>
        <p>Department of Agriculture Region 10 - Administrative Assessment</p>
      </div>
      <div class="pdf-meta">
        <strong>Date:</strong> ${new Date().toLocaleString()}<br>
        <strong>Official Authority:</strong> Officer Pedro
      </div>
    </div>

    <div class="pdf-section">
      <h2>1. Status Summary Aggregates</h2>
      <div class="pdf-totals">
        <div class="pdf-total-item">Total Reports: <strong>${total}</strong></div>
        <div class="pdf-total-item">Pending Review: <strong>${pending}</strong></div>
        <div class="pdf-total-item">Verified Incident: <strong>${verified}</strong></div>
        <div class="pdf-total-item">Responded Action: <strong>${responded}</strong></div>
      </div>
    </div>

    <div class="pdf-section">
      <h2>2. Disaster Incident Logs</h2>
      <table class="pdf-table">
        <thead>
          <tr>
            <th>Report ID</th>
            <th>Farmer</th>
            <th>Coordinates</th>
            <th>Disaster</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <div class="pdf-section" style="margin-top: 60px; display: flex; justify-content: flex-end;">
      <div style="border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 8px; font-size: 11px;">
        <strong>DA Authorized Signature</strong>
      </div>
    </div>
  `;

  window.print();
}

// Helper: Export Farmers to PDF
function exportFarmersToPdf() {
  let tableRows = '';
  farmersData.forEach(farmer => {
    tableRows += `
      <tr>
        <td>FMR-2026-${String(farmer.id).padStart(3, '0')}</td>
        <td>${farmer.fullName}</td>
        <td>${farmer.address || 'Not specified'}</td>
        <td>${farmer.cropType}</td>
        <td style="text-transform: capitalize;">${farmer.status}</td>
        <td>${farmer.reportCount}</td>
        <td>${new Date(farmer.createdAt).toLocaleDateString()}</td>
      </tr>
    `;
  });

  pdfPrintLayout.innerHTML = `
    <div class="pdf-header">
      <div class="pdf-title">
        <h1>AGRISNAP REGISTERED FARMERS SUMMARY</h1>
        <p>Department of Agriculture Region 10 - Administrative Records</p>
      </div>
      <div class="pdf-meta">
        <strong>Date:</strong> ${new Date().toLocaleString()}<br>
        <strong>Official Authority:</strong> Officer Pedro
      </div>
    </div>

    <div class="pdf-section">
      <h2>Registered Farmers Log</h2>
      <table class="pdf-table">
        <thead>
          <tr>
            <th>Farmer ID</th>
            <th>Full Name</th>
            <th>Farm Location</th>
            <th>Crop Type</th>
            <th>Status</th>
            <th>Reports</th>
            <th>Date Joined</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <div class="pdf-section" style="margin-top: 60px; display: flex; justify-content: flex-end;">
      <div style="border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 8px; font-size: 11px;">
        <strong>DA Authorized Signature</strong>
      </div>
    </div>
  `;

  window.print();
}

// Helper: Export Reports to CSV
async function exportReportsToCsv() {
  if (!token) return;
  try {
    const res = await fetch(`${API_URL}/api/export/reports`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AgriSnap_Damage_Reports_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('CSV downloaded successfully.');
    }
  } catch (err) {
    showToast('Failed to download CSV.', 'error');
  }
}

// Helper: Export Farmers to CSV
function exportFarmersToCsv() {
  let csvContent = 'Farmer ID,Full Name,Address,Crop Type,Status,Reports Count,Date Registered\n';
  farmersData.forEach(farmer => {
    const regDate = new Date(farmer.createdAt).toISOString();
    const escapedName = `"${farmer.fullName.replace(/"/g, '""')}"`;
    const escapedAddress = `"${(farmer.address || '').replace(/"/g, '""')}"`;
    csvContent += `FMR-2026-${String(farmer.id).padStart(3, '0')},${escapedName},${escapedAddress},${farmer.cropType},${farmer.status},${farmer.reportCount},${regDate}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AgriSnap_Farmers_Records_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  showToast('Farmers list CSV exported successfully.');
}

// Helper: Export Reports to Excel
function exportReportsToExcel() {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Reports</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Report ID</th>
            <th>Farmer Name</th>
            <th>Location</th>
            <th>Disaster Type</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Date Submitted</th>
          </tr>
        </thead>
        <tbody>
  `;
  reportsData.forEach(r => {
    html += `
      <tr>
        <td>RPT-2026-${String(r.id).padStart(3, '0')}</td>
        <td>${r.farmer_name}</td>
        <td>Lat: ${parseFloat(r.latitude).toFixed(4)}, Lng: ${parseFloat(r.longitude).toFixed(4)}</td>
        <td>${r.disaster_type}</td>
        <td>${r.severity}</td>
        <td>${r.status}</td>
        <td>${new Date(r.created_at).toLocaleString()}</td>
      </tr>
    `;
  });
  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;
  
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AgriSnap_Damage_Reports_${Date.now()}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  showToast('Excel document exported successfully.');
}

// Helper: Export Farmers to Excel
function exportFarmersToExcel() {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Farmers</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Farmer ID</th>
            <th>Full Name</th>
            <th>Address</th>
            <th>Crop Type</th>
            <th>Status</th>
            <th>Reports Count</th>
            <th>Date Registered</th>
          </tr>
        </thead>
        <tbody>
  `;
  farmersData.forEach(f => {
    html += `
      <tr>
        <td>FMR-2026-${String(f.id).padStart(3, '0')}</td>
        <td>${f.fullName}</td>
        <td>${f.address || ''}</td>
        <td>${f.cropType}</td>
        <td>${f.status}</td>
        <td>${f.reportCount}</td>
        <td>${new Date(f.createdAt).toLocaleString()}</td>
      </tr>
    `;
  });
  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;
  
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AgriSnap_Farmers_Records_${Date.now()}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  showToast('Farmers Excel document exported successfully.');
}

// Print single report from table row actions
function triggerReportPdfPrint(report) {
  const formattedId = `RPT-2026-${String(report.id).padStart(3, '0')}`;
  
  pdfPrintLayout.innerHTML = `
    <div class="pdf-header">
      <div class="pdf-title">
        <h1>AGRISNAP SINGLE CROP DAMAGE REPORT</h1>
        <p>Official Verification Document - Report ID ${formattedId}</p>
      </div>
      <div class="pdf-meta">
        <strong>Date:</strong> ${new Date(report.created_at).toLocaleString()}
      </div>
    </div>

    <div class="pdf-section">
      <h2>1. Incident Metadata</h2>
      <table class="pdf-table">
        <tr>
          <td style="width: 30%"><strong>Farmer Name</strong></td>
          <td>${report.farmer_name} (Farmer ID: FMR-${report.farmer_id})</td>
        </tr>
        <tr>
          <td><strong>Disaster Classification</strong></td>
          <td>${report.disaster_type}</td>
        </tr>
        <tr>
          <td><strong>GPS Coordinates</strong></td>
          <td>Latitude: ${report.latitude}, Longitude: ${report.longitude}</td>
        </tr>
        <tr>
          <td><strong>Status</strong></td>
          <td style="text-transform: capitalize;">${report.status}</td>
        </tr>
      </table>
    </div>

    <div class="pdf-section">
      <h2>2. Farmer Description Details</h2>
      <div style="border: 1px solid #ddd; padding: 12px; font-size: 12px; background-color: #fcfcfc;">
        ${report.details}
      </div>
    </div>

    <div class="pdf-section" style="margin-top: 40px; display: flex; justify-content: space-between;">
      <div style="border-top: 1px solid #000; width: 180px; text-align: center; padding-top: 8px; font-size: 10px;">
        <strong>Submitted By</strong>
      </div>
      <div style="border-top: 1px solid #000; width: 180px; text-align: center; padding-top: 8px; font-size: 10px;">
        <strong>DA Verification Authority</strong>
      </div>
    </div>
  `;

  window.print();
}

// Initial authorization check
checkAuth();
