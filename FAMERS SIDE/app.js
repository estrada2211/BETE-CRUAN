// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered successfully', reg.scope))
      .catch(err => console.error('Service Worker registration failed', err));
  });
}

// Global State
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));
let isOnline = navigator.onLine;

// Map states
let reportMap = null;
let userMarker = null;
let currentCoords = { lat: 14.5995, lng: 120.9842 }; // Manila default
let isDrawing = false;
let drawPoints = [];
let drawMarkers = [];
let drawPolyline = null;
let finalPolygon = null;

// IndexedDB Setup for Offline Drafts
let idbDatabase = null;
const request = indexedDB.open('AgriSnapDB', 1);

request.onupgradeneeded = function(event) {
  const db = event.target.result;
  if (!db.objectStoreNames.contains('drafts')) {
    db.createObjectStore('drafts', { keyPath: 'id', autoIncrement: true });
  }
};

request.onsuccess = function(event) {
  idbDatabase = event.target.result;
  console.log('IndexedDB initialized.');
  if (token) {
    loadDraftsFromIndexedDB();
  }
};

// DOM Elements
const connectionBanner = document.getElementById('connection-banner');
const connectionStatusText = document.getElementById('connection-status-text');

const authScreen = document.getElementById('auth-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');

// Views
const dashboardView = document.getElementById('dashboard-view');
const reportView = document.getElementById('report-view');
const reportsListView = document.getElementById('reports-list-view');
const profileView = document.getElementById('profile-view');
const editProfileView = document.getElementById('edit-profile-view');
const changePasswordView = document.getElementById('change-password-view');

// Header welcome title
const welcomeTitle = document.getElementById('welcome-title');

// Buttons / Navigation
const btnToReport = document.getElementById('btn-to-report');
const btnToReportsList = document.getElementById('btn-to-reports-list');
const btnToProfile = document.getElementById('btn-to-profile');
const btnLogout = document.getElementById('btn-logout');
const backBtns = document.querySelectorAll('.back-btn');

// Report Page elements
const reportForm = document.getElementById('damage-report-form');
const reportPhotoInput = document.getElementById('report-photo-input');
const photoPreview = document.getElementById('photo-preview');
const btnTriggerCamera = document.getElementById('btn-trigger-camera');
const btnTriggerUpload = document.getElementById('btn-trigger-upload');
const btnRefreshGps = document.getElementById('btn-refresh-gps');
const gpsCoordinatesVal = document.getElementById('gps-coordinates-val');
const btnStartPolygon = document.getElementById('btn-start-polygon');
const btnResetPolygon = document.getElementById('btn-reset-polygon');
const reportDateTimeVal = document.getElementById('report-date-time-val');
const btnCancelReport = document.getElementById('btn-cancel-report');

// Reports list aggregates
const aggPendingCount = document.getElementById('agg-pending-count');
const aggVerifiedCount = document.getElementById('agg-verified-count');
const aggRespondedCount = document.getElementById('agg-responded-count');
const myReportsListHolder = document.getElementById('my-reports-list-holder');
const latestReportsList = document.getElementById('latest-reports-list');
const pwaDraftsContainer = document.getElementById('pwa-drafts-container');
const pwaDraftsList = document.getElementById('pwa-drafts-list');

// Profile Elements
const btnEditProfileTrigger = document.getElementById('btn-edit-profile-trigger');
const btnChangePwdTrigger = document.getElementById('btn-change-pwd-trigger');
const profileValName = document.getElementById('profile-val-name');
const profileValContact = document.getElementById('profile-val-contact');
const profileValAddress = document.getElementById('profile-val-address');
const profileValCrops = document.getElementById('profile-val-crops');
const profileValGps = document.getElementById('profile-val-gps');

// Edit Profile Form
const editProfileForm = document.getElementById('edit-profile-form');
const editProfileFullname = document.getElementById('edit-profile-fullname');
const editProfileContact = document.getElementById('edit-profile-contact');
const editProfileAddress = document.getElementById('edit-profile-address');
const editProfileCrop = document.getElementById('edit-profile-crop');
const editProfileGps = document.getElementById('edit-profile-gps');
const btnRefreshProfileGps = document.getElementById('btn-refresh-profile-gps');
const btnCancelEditProfile = document.getElementById('btn-cancel-edit-profile');

// Change Password Form
const changePwdForm = document.getElementById('change-pwd-form');
const changePwdCurrent = document.getElementById('change-pwd-current');
const changePwdNew = document.getElementById('change-pwd-new');
const changePwdConfirm = document.getElementById('change-pwd-confirm');
const btnCancelChangePwd = document.getElementById('btn-cancel-change-pwd');

// Notifications
const floatingNotifBtn = document.getElementById('floating-notif-btn');
const floatingBadgeCount = document.getElementById('floating-badge-count');
const notifModalOverlay = document.getElementById('notif-modal-overlay');
const btnCloseNotifModal = document.getElementById('btn-close-notif-modal');
const notifModalListHolder = document.getElementById('notif-modal-list-holder');

// Report Details Modal
const reportDetailsModal   = document.getElementById('report-details-modal');
const btnCloseRptModal     = document.getElementById('btn-close-rpt-modal');
const rptModalId           = document.getElementById('rpt-modal-id');
const rptModalStatusBadge  = document.getElementById('rpt-modal-status-badge');
const rptModalPhoto        = document.getElementById('rpt-modal-photo');
const rptModalNoPhoto      = document.getElementById('rpt-modal-no-photo');
const rptModalType         = document.getElementById('rpt-modal-type');
const rptModalSeverity     = document.getElementById('rpt-modal-severity');
const rptModalDate         = document.getElementById('rpt-modal-date');
const rptModalGps          = document.getElementById('rpt-modal-gps');
const rptModalDescription  = document.getElementById('rpt-modal-description');
const rptModalNotes        = document.getElementById('rpt-modal-notes');
const tlSubmitted          = document.getElementById('tl-submitted');
const tlVerified           = document.getElementById('tl-verified');
const tlResponded          = document.getElementById('tl-responded');

// Confirm / Success Modals
const confirmLogoutModal   = document.getElementById('confirm-logout-modal');
const confirmLogoutCancel  = document.getElementById('confirm-logout-cancel');
const confirmLogoutOk      = document.getElementById('confirm-logout-ok');

const confirmSubmitModal   = document.getElementById('confirm-submit-modal');
const confirmSubmitCancel  = document.getElementById('confirm-submit-cancel');
const confirmSubmitOk      = document.getElementById('confirm-submit-ok');

const confirmCancelModal   = document.getElementById('confirm-cancel-modal');
const confirmCancelStay    = document.getElementById('confirm-cancel-stay');
const confirmCancelOk      = document.getElementById('confirm-cancel-ok');

const successSubmitModal   = document.getElementById('success-submit-modal');
const successSubmitOk      = document.getElementById('success-submit-ok');

const toastElement = document.getElementById('toast');
const API_URL = window.location.origin;

/* ==========================================================================
   UTILITY & TOAST
   ========================================================================== */

function showToast(message, type = 'success') {
  toastElement.innerText = message;
  toastElement.className = `toast ${type}`;
  toastElement.classList.remove('hidden');
  setTimeout(() => {
    toastElement.classList.add('hidden');
  }, 4000);
}

function updateConnectionStatus() {
  isOnline = navigator.onLine;
  if (isOnline) {
    connectionBanner.className = 'connection-banner online';
    connectionStatusText.innerText = 'Connected Online';
    document.querySelectorAll('.connection-status-badge .badge-text').forEach(el => el.innerText = 'Online');
    syncOfflineDrafts();
  } else {
    connectionBanner.className = 'connection-banner offline';
    connectionStatusText.innerText = 'Offline (Draft Saving Active)';
    document.querySelectorAll('.connection-status-badge .badge-text').forEach(el => el.innerText = 'Offline');
  }
}
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
updateConnectionStatus();

/* ==========================================================================
   VIEW NAVIGATION ROUTING
   ========================================================================== */

let activeView = 'auth';
const allViews = [authScreen, dashboardView, reportView, reportsListView, profileView, editProfileView, changePasswordView];

function navigateTo(viewId) {
  // Hide all
  allViews.forEach(v => v.classList.add('hidden'));
  
  // Show target
  const target = document.getElementById(viewId);
  target.classList.remove('hidden');
  
  if (viewId === 'auth-screen') {
    floatingNotifBtn.classList.add('hidden');
  } else {
    floatingNotifBtn.classList.remove('hidden');
  }

  // Trigger sub-actions
  if (viewId === 'dashboard-view') {
    updateDashboardGreeting();
    loadReportHistory();
    loadNotifications();
  } else if (viewId === 'report-view') {
    // Current date/time display
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    const dateStr = new Date().toLocaleDateString('en-US', options);
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    reportDateTimeVal.innerText = `${dateStr} at ${timeStr}`;
    setTimeout(() => {
      initReportMap();
    }, 200);
  } else if (viewId === 'reports-list-view') {
    loadReportHistory();
    loadDraftsFromIndexedDB();
  } else if (viewId === 'profile-view') {
    loadProfileInfo();
  }
}

function updateDashboardGreeting() {
  if (!currentUser) return;
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (currentUser.fullName || currentUser.username || 'Farmer').split(' ')[0];
  const emoji = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙';

  const welcomeEl = document.getElementById('welcome-title');
  if (welcomeEl) welcomeEl.innerText = `${greeting}, ${firstName} ${emoji}`;

  const dateEl = document.getElementById('dash-date-label');
  if (dateEl) {
    dateEl.innerText = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
}

// Set up back buttons
backBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Go back to landing dashboard
    navigateTo('dashboard-view');
  });
});

// Auth tab toggles
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  loginForm.classList.add('active');
  registerForm.classList.remove('active');
});

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  registerForm.classList.add('active');
  loginForm.classList.remove('active');
});

// Dashboard button actions
btnToReport.addEventListener('click', () => navigateTo('report-view'));
btnToReportsList.addEventListener('click', () => navigateTo('reports-list-view'));
btnToProfile.addEventListener('click', () => navigateTo('profile-view'));

// See All shortcut
document.getElementById('btn-dash-see-all')?.addEventListener('click', () => navigateTo('reports-list-view'));

// Cancel Report — show confirm-cancel modal instead of going back directly
btnCancelReport.addEventListener('click', () => {
  confirmCancelModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
});

/* ==========================================================================
   CONFIRM MODAL LOGIC
   ========================================================================== */

// ── Logout confirm ──
btnLogout.addEventListener('click', () => {
  confirmLogoutModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
});
confirmLogoutCancel.addEventListener('click', () => {
  confirmLogoutModal.classList.add('hidden');
  document.body.style.overflow = '';
});
confirmLogoutOk.addEventListener('click', () => {
  confirmLogoutModal.classList.add('hidden');
  document.body.style.overflow = '';
  doLogout();
});
confirmLogoutModal.addEventListener('click', e => {
  if (e.target === confirmLogoutModal) {
    confirmLogoutModal.classList.add('hidden');
    document.body.style.overflow = '';
  }
});

// ── Submit Report confirm ──
confirmSubmitCancel.addEventListener('click', () => {
  confirmSubmitModal.classList.add('hidden');
  document.body.style.overflow = '';
});
confirmSubmitOk.addEventListener('click', () => {
  confirmSubmitModal.classList.add('hidden');
  document.body.style.overflow = '';
  doSubmitReport();
});
confirmSubmitModal.addEventListener('click', e => {
  if (e.target === confirmSubmitModal) {
    confirmSubmitModal.classList.add('hidden');
    document.body.style.overflow = '';
  }
});

// ── Cancel / Discard report confirm ──
confirmCancelStay.addEventListener('click', () => {
  confirmCancelModal.classList.add('hidden');
  document.body.style.overflow = '';
});
confirmCancelOk.addEventListener('click', () => {
  confirmCancelModal.classList.add('hidden');
  document.body.style.overflow = '';
  resetReportForm();
  navigateTo('dashboard-view');
});
confirmCancelModal.addEventListener('click', e => {
  if (e.target === confirmCancelModal) {
    confirmCancelModal.classList.add('hidden');
    document.body.style.overflow = '';
  }
});

// ── Success modal ──
successSubmitOk.addEventListener('click', () => {
  successSubmitModal.classList.add('hidden');
  document.body.style.overflow = '';
  navigateTo('dashboard-view');
});

/* ==========================================================================
   AUTHENTICATION LOGIC
   ========================================================================== */

function checkAuth() {
  if (token && currentUser && currentUser.role === 'farmer') {
    navigateTo('dashboard-view');
    pollNotifications();
  } else {
    navigateTo('auth-screen');
  }
}

function doLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  token = null;
  currentUser = null;
  if (reportMap) {
    reportMap.remove();
    reportMap = null;
  }
  checkAuth();
}

// Register
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;
  const fullName = document.getElementById('register-fullname').value.trim();
  const contactNumber = document.getElementById('register-contact').value.trim();
  const address = document.getElementById('register-address').value.trim();
  const cropType = document.getElementById('register-crop').value;

  try {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, fullName, contactNumber, address, cropType, role: 'farmer' })
    });
    
    const data = await res.json();
    if (res.ok) {
      showToast('Registration successful! Please log in.');
      tabLogin.click();
      registerForm.reset();
    } else {
      showToast(data.error || 'Registration failed.', 'error');
    }
  } catch (err) {
    showToast('Cannot connect to registration server.', 'error');
  }
});

// Login
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
      if (data.user.role !== 'farmer') {
        showToast('Authorized for Farmers only.', 'error');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      token = data.token;
      currentUser = data.user;
      showToast('Login successful!');
      checkAuth();
    } else {
      showToast(data.error || 'Login failed.', 'error');
    }
  } catch (err) {
    showToast('Cannot connect to authentication server.', 'error');
  }
});

/* ==========================================================================
   MAP & GEOLOCATION & DRAWING
   ========================================================================== */

function initReportMap() {
  if (reportMap) return;

  reportMap = L.map('report-map', {
    zoomControl: false,
    maxZoom: 18
  }).setView([currentCoords.lat, currentCoords.lng], 15);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(reportMap);

  const pinIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
  });
  L.Marker.prototype.options.icon = pinIcon;

  userMarker = L.marker([currentCoords.lat, currentCoords.lng], { draggable: true }).addTo(reportMap);
  gpsCoordinatesVal.innerText = `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`;

  userMarker.on('dragend', function(e) {
    const latlng = e.target.getLatLng();
    currentCoords = { lat: latlng.lat, lng: latlng.lng };
    gpsCoordinatesVal.innerText = `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`;
  });

  // Start with current device position
  triggerDeviceGps();

  // Polygon Drawing Clicks
  reportMap.on('click', function(e) {
    if (!isDrawing) return;

    const latlng = e.latlng;
    drawPoints.push([latlng.lat, latlng.lng]);

    // Draw vertex marker
    const marker = L.circleMarker(latlng, {
      radius: 6,
      fillColor: '#007E3A',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    }).addTo(reportMap);

    drawMarkers.push(marker);

    // If first marker, close on click
    if (drawMarkers.length === 1) {
      marker.bindTooltip("Close boundary polygon", { permanent: false, direction: 'top' });
      marker.on('click', function(evt) {
        L.DomEvent.stopPropagation(evt);
        if (isDrawing && drawPoints.length >= 3) {
          savePolygonDrawing();
        }
      });
    }

    if (drawPolyline) {
      drawPolyline.setLatLngs(drawPoints);
    } else {
      drawPolyline = L.polyline(drawPoints, { color: '#007E3A', weight: 3, dashArray: '5, 5' }).addTo(reportMap);
    }
  });
}

function triggerDeviceGps() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (reportMap) {
          reportMap.setView([currentCoords.lat, currentCoords.lng], 16);
          userMarker.setLatLng([currentCoords.lat, currentCoords.lng]);
        }
        gpsCoordinatesVal.innerText = `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`;
      },
      (err) => {
        console.warn('GPS location request denied:', err);
        gpsCoordinatesVal.innerText = 'Permission denied';
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }
}

btnRefreshGps.addEventListener('click', triggerDeviceGps);

// Boundary Tracing Actions
btnStartPolygon.addEventListener('click', () => {
  if (isDrawing) {
    if (drawPoints.length >= 3) {
      savePolygonDrawing();
    } else {
      showToast('Boundary needs at least 3 points.', 'warning');
    }
  } else {
    isDrawing = true;
    btnStartPolygon.innerText = '💾 Save Boundary';
    btnStartPolygon.classList.add('active');
    
    if (finalPolygon) {
      reportMap.removeLayer(finalPolygon);
      finalPolygon = null;
    }
    clearDrawingLayers();
    showToast('Click points on map to outline farm. Click first dot to close.');
  }
});

function savePolygonDrawing() {
  isDrawing = false;
  btnStartPolygon.innerText = '✏️ Draw Boundary';
  btnStartPolygon.classList.remove('active');

  finalPolygon = L.polygon(drawPoints, {
    color: '#007E3A',
    fillColor: '#007E3A',
    fillOpacity: 0.25,
    weight: 3
  }).addTo(reportMap);

  clearDrawingLayers();

  const center = finalPolygon.getBounds().getCenter();
  currentCoords = { lat: center.lat, lng: center.lng };
  userMarker.setLatLng(center);
  gpsCoordinatesVal.innerText = `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`;
  showToast('Farm boundary polygon saved.');
}

function clearDrawingLayers() {
  drawMarkers.forEach(m => reportMap.removeLayer(m));
  drawMarkers = [];
  if (drawPolyline) {
    reportMap.removeLayer(drawPolyline);
    drawPolyline = null;
  }
}

btnResetPolygon.addEventListener('click', () => {
  isDrawing = false;
  btnStartPolygon.innerText = '✏️ Draw Boundary';
  btnStartPolygon.classList.remove('active');
  clearDrawingLayers();
  if (finalPolygon) {
    reportMap.removeLayer(finalPolygon);
    finalPolygon = null;
  }
  drawPoints = [];
  showToast('Map drawings reset.');
});

/* ==========================================================================
   CAMERA & PHOTO INPUT
   ========================================================================== */

btnTriggerCamera.addEventListener('click', () => {
  reportPhotoInput.click();
});

btnTriggerUpload.addEventListener('click', () => {
  reportPhotoInput.click();
});

reportPhotoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      photoPreview.innerHTML = `<img src="${evt.target.result}" alt="Preview Image" style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(file);
  } else {
    resetPhotoPreview();
  }
});

function resetPhotoPreview() {
  photoPreview.innerHTML = `
    <svg class="camera-placeholder-icon" viewBox="0 0 24 24"><path fill="#007E3A" d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>
    <p>Capture or upload photo of crop damage</p>
  `;
}

/* ==========================================================================
   REPORT FORM SUBMISSION
   ========================================================================== */

// Capture pending form data to use when confirmed
let _pendingReportData = null;

reportForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const disasterType = document.getElementById('report-disaster-type').value;
  const description = document.getElementById('report-description').value.trim();
  const file = reportPhotoInput.files[0];

  if (!disasterType) {
    showToast('Please select a disaster type.', 'error');
    return;
  }

  if (drawPoints.length < 3 && !finalPolygon) {
    showToast('Please outline farm boundary on map.', 'error');
    return;
  }

  // Store pending data then show confirm modal
  _pendingReportData = { disasterType, description, file };
  confirmSubmitModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
});

async function doSubmitReport() {
  if (!_pendingReportData) return;
  const { disasterType, description, file } = _pendingReportData;
  _pendingReportData = null;

  const boundaryPolygonStr = JSON.stringify(drawPoints);

  if (!isOnline) {
    // OFFLINE: Save to IndexedDB
    if (!file) { showToast('Please attach a photo.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = function(evt) {
      const draft = {
        disaster_type: disasterType,
        details: description,
        severity: 'moderate',
        latitude: currentCoords.lat,
        longitude: currentCoords.lng,
        boundary_polygon: boundaryPolygonStr,
        image_base64: evt.target.result,
        created_at: new Date().toISOString()
      };
      saveOfflineDraft(draft);
    };
    reader.readAsDataURL(file);
  } else {
    // ONLINE
    const formData = new FormData();
    formData.append('disasterType', disasterType);
    formData.append('details', description);
    formData.append('severity', 'moderate');
    formData.append('latitude', currentCoords.lat);
    formData.append('longitude', currentCoords.lng);
    formData.append('boundaryPolygon', boundaryPolygonStr);
    if (file) formData.append('image', file);

    try {
      const res = await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        resetReportForm();
        // Show success animation modal
        successSubmitModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      } else {
        showToast(data.error || 'Submission failed.', 'error');
      }
    } catch (err) {
      showToast('Cannot connect to server. Try again later.', 'error');
    }
  }
}

function resetReportForm() {
  reportForm.reset();
  resetPhotoPreview();
  if (finalPolygon && reportMap) {
    reportMap.removeLayer(finalPolygon);
    finalPolygon = null;
  }
  drawPoints = [];
  clearDrawingLayers();
}

/* ==========================================================================
   OFFLINE SYNCHRONIZATION (INDEXEDDB)
   ========================================================================== */

function saveOfflineDraft(draft) {
  if (!idbDatabase) return;
  const transaction = idbDatabase.transaction(['drafts'], 'readwrite');
  const store = transaction.objectStore('drafts');
  
  store.add(draft).onsuccess = function() {
    showToast('Offline! Saved crop report as draft locally.', 'warning');
    resetReportForm();
    navigateTo('dashboard-view');
  };
}

function loadDraftsFromIndexedDB() {
  if (!idbDatabase) return;
  const transaction = idbDatabase.transaction(['drafts'], 'readonly');
  const store = transaction.objectStore('drafts');
  
  const drafts = [];
  store.openCursor().onsuccess = function(e) {
    const cursor = e.target.result;
    if (cursor) {
      drafts.push(cursor.value);
      cursor.continue();
    } else {
      renderOfflineDraftsList(drafts);
    }
  };
}

function deleteDraftFromIndexedDB(id) {
  if (!idbDatabase) return;
  const transaction = idbDatabase.transaction(['drafts'], 'readwrite');
  const store = transaction.objectStore('drafts');
  store.delete(id);
}

function renderOfflineDraftsList(drafts) {
  if (drafts.length > 0) {
    pwaDraftsContainer.classList.remove('hidden');
    pwaDraftsList.innerHTML = '';
    drafts.forEach(draft => {
      const card = document.createElement('div');
      card.className = 'report-item-card';
      
      const dateStr = new Date(draft.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });

      card.innerHTML = `
        <div class="report-item-left">
          <div class="report-item-header">
            <span class="report-item-id">DRAFT</span>
            <span class="status-badge draft">Pending Sync</span>
          </div>
          <span class="report-item-type">Type: ${draft.disaster_type}</span>
          <span class="report-item-date">📅 Drafted: ${dateStr}</span>
        </div>
      `;
      pwaDraftsList.appendChild(card);
    });
  } else {
    pwaDraftsContainer.classList.add('hidden');
  }
}

// Convert Base64 back to file blob
function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

// Sync Drafts once online
async function syncOfflineDrafts() {
  if (!isOnline || !idbDatabase) return;

  const transaction = idbDatabase.transaction(['drafts'], 'readonly');
  const store = transaction.objectStore('drafts');
  
  const drafts = [];
  store.openCursor().onsuccess = async function(event) {
    const cursor = event.target.result;
    if (cursor) {
      drafts.push(cursor.value);
      cursor.continue();
    } else {
      if (drafts.length === 0) return;
      
      showToast(`Uploading ${drafts.length} offline drafts...`, 'warning');
      
      for (const draft of drafts) {
        const formData = new FormData();
        formData.append('disasterType', draft.disaster_type);
        formData.append('details', draft.details);
        formData.append('severity', draft.severity);
        formData.append('latitude', draft.latitude);
        formData.append('longitude', draft.longitude);
        formData.append('boundaryPolygon', draft.boundary_polygon);

        try {
          const file = dataURLtoFile(draft.image_base64, `offline_report_${Date.now()}.jpg`);
          formData.append('image', file);

          const res = await fetch(`${API_URL}/api/reports`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });

          if (res.ok) {
            deleteDraftFromIndexedDB(draft.id);
          }
        } catch (err) {
          console.error(err);
          break;
        }
      }
      
      setTimeout(() => {
        showToast('All offline drafts synchronized.');
        loadReportHistory();
      }, 1000);
    }
  };
}

/* ==========================================================================
   REPORTS HISTORY MANAGEMENT
   ========================================================================== */

async function loadReportHistory() {
  if (!token) return;
  try {
    const res = await fetch(`${API_URL}/api/reports`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const reports = await res.json();
    if (res.ok) {
      // Calculate Aggregates
      const pending = reports.filter(r => r.status === 'pending').length;
      const verified = reports.filter(r => r.status === 'verified').length;
      const responded = reports.filter(r => r.status === 'responded').length;

      aggPendingCount.innerText = pending;
      aggVerifiedCount.innerText = verified;
      aggRespondedCount.innerText = responded;

      // Update hero stats strip with pop animation
      function animateStat(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        const prev = parseInt(el.innerText) || 0;
        el.innerText = value;
        if (prev !== value) {
          el.classList.remove('popping');
          void el.offsetWidth; // reflow
          el.classList.add('popping');
        }
      }
      animateStat('dash-stat-pending', pending);
      animateStat('dash-stat-verified', verified);
      animateStat('dash-stat-responded', responded);


      // Populate log lists in My Reports
      if (reports.length === 0) {
        myReportsListHolder.innerHTML = '<div class="no-data">No submitted reports yet.</div>';
        latestReportsList.innerHTML = '<div class="no-data">No submitted reports yet.</div>';
        return;
      }

      // My Reports full list
      myReportsListHolder.innerHTML = '';
      reports.forEach(report => {
        const card = buildReportItemCard(report);
        myReportsListHolder.appendChild(card);
      });

      // Dashboard landing feed (limit to 3)
      latestReportsList.innerHTML = '';
      reports.slice(0, 3).forEach(report => {
        const card = buildReportItemCard(report);
        latestReportsList.appendChild(card);
      });
    }
  } catch (err) {
    console.error('History load failed:', err);
  }
}

function buildReportItemCard(report) {
  const card = document.createElement('div');
  card.className = 'report-item-card';

  const dateStr = new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  const formattedId = `RPT-2026-${String(report.id).padStart(3, '0')}`;

  card.innerHTML = `
    <div class="report-item-left">
      <div class="report-item-header">
        <span class="report-item-id">${formattedId}</span>
        <span class="status-badge ${report.status}">${report.status}</span>
      </div>
      <span class="report-item-type">Type: ${report.disaster_type}</span>
      <span class="report-item-date">📅 Submitted: ${dateStr}</span>
    </div>
    <span class="report-item-chevron">&gt;</span>
  `;

  // Clicking opens the Report Details Modal
  card.addEventListener('click', () => openReportDetailsModal(report));

  return card;
}

/* ==========================================================================
   REPORT DETAILS MODAL
   ========================================================================== */

function openReportDetailsModal(report) {
  const formattedId = `RPT-2026-${String(report.id).padStart(3, '0')}`;
  const dateStr = new Date(report.created_at).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  // -- Header
  rptModalId.innerText = formattedId;
  rptModalStatusBadge.className = `status-badge ${report.status}`;
  rptModalStatusBadge.innerText = report.status.charAt(0).toUpperCase() + report.status.slice(1);

  // -- Timeline steps
  const steps = ['submitted', 'verified', 'responded'];
  const statusIndex = {
    pending:   0, // only submitted active
    verified:  1,
    responded: 2
  };
  const currentIdx = statusIndex[report.status] ?? 0;

  [tlSubmitted, tlVerified, tlResponded].forEach((step, idx) => {
    step.classList.remove('active', 'done');
    // The connecting lines between steps
    const lines = document.querySelectorAll('.rpt-status-timeline .tl-line');
    lines.forEach(l => l.classList.remove('done'));

    if (idx < currentIdx) {
      step.classList.add('done');
    } else if (idx === currentIdx) {
      step.classList.add('active');
    }
  });

  // Color the connecting lines
  const lines = document.querySelectorAll('.rpt-status-timeline .tl-line');
  lines.forEach((line, idx) => {
    line.classList.toggle('done', idx < currentIdx);
  });

  // -- Photo
  if (report.image_url) {
    rptModalPhoto.src = report.image_url;
    rptModalPhoto.classList.remove('hidden');
    rptModalNoPhoto.classList.add('hidden');
  } else {
    rptModalPhoto.src = '';
    rptModalPhoto.classList.add('hidden');
    rptModalNoPhoto.classList.remove('hidden');
  }

  // -- Info grid
  rptModalType.innerText = report.disaster_type || '—';

  const sev = (report.severity || 'moderate').toLowerCase();
  rptModalSeverity.innerHTML = `<span class="severity-pill ${sev}">${sev.charAt(0).toUpperCase() + sev.slice(1)}</span>`;

  rptModalDate.innerText = dateStr;

  if (report.latitude && report.longitude) {
    rptModalGps.innerText = `${parseFloat(report.latitude).toFixed(5)}, ${parseFloat(report.longitude).toFixed(5)}`;
  } else {
    rptModalGps.innerText = '—';
  }

  // -- Description
  rptModalDescription.innerText = report.details || '—';

  // -- DA Notes
  if (report.admin_notes && report.admin_notes.trim() !== '') {
    rptModalNotes.innerHTML = report.admin_notes;
    rptModalNotes.style.color = '';
  } else {
    rptModalNotes.innerHTML = '<span class="rpt-notes-pending">No feedback from DA officer yet.</span>';
  }

  // Show modal
  reportDetailsModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeReportDetailsModal() {
  reportDetailsModal.classList.add('hidden');
  document.body.style.overflow = '';
}

// Wire close events
btnCloseRptModal.addEventListener('click', closeReportDetailsModal);
reportDetailsModal.addEventListener('click', (e) => {
  if (e.target === reportDetailsModal) closeReportDetailsModal();
});

/* ==========================================================================
   PROFILE MANAGEMENT
   ========================================================================== */

async function loadProfileInfo() {
  if (!token) return;
  try {
    const res = await fetch(`${API_URL}/api/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const profile = await res.json();
    if (res.ok) {
      // Set Profile display
      profileValName.innerText = profile.full_name;
      profileValContact.innerText = profile.contact_number || 'None provided';
      profileValAddress.innerText = profile.address || 'None provided';
      profileValCrops.innerText = profile.crop_type || 'Rice';
      
      if (profile.address) {
        profileValGps.innerText = `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`;
      } else {
        profileValGps.innerText = 'Not configured';
      }

      // Pre-fill edit inputs
      editProfileFullname.value = profile.full_name;
      editProfileContact.value = profile.contact_number || '';
      editProfileAddress.value = profile.address || '';
      editProfileCrop.value = profile.crop_type || 'Rice';
      editProfileGps.value = `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`;
    }
  } catch (err) {
    console.error(err);
  }
}

btnEditProfileTrigger.addEventListener('click', () => navigateTo('edit-profile-view'));
btnCancelEditProfile.addEventListener('click', () => navigateTo('profile-view'));

btnChangePwdTrigger.addEventListener('click', () => navigateTo('change-password-view'));
btnCancelChangePwd.addEventListener('click', () => navigateTo('profile-view'));

// Profile Edit GPS refresh button
btnRefreshProfileGps.addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        editProfileGps.value = `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`;
        showToast('Profile coordinates updated.');
      },
      (err) => showToast('GPS location blocked.', 'error')
    );
  }
});

// Submit edit profile info
editProfileForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = editProfileFullname.value.trim();
  const contactNumber = editProfileContact.value.trim();
  const address = editProfileAddress.value.trim();
  const cropType = editProfileCrop.value;

  try {
    const res = await fetch(`${API_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ fullName, contactNumber, address, cropType })
    });
    
    if (res.ok) {
      showToast('Profile changes saved successfully.');
      navigateTo('profile-view');
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to update profile.', 'error');
    }
  } catch (err) {
    showToast('Connection failed.', 'error');
  }
});

// Submit change password
changePwdForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const currentPassword = changePwdCurrent.value;
  const newPassword = changePwdNew.value;
  const confirmPassword = changePwdConfirm.value;

  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match.', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/profile/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    if (res.ok) {
      showToast('Password updated successfully.');
      changePwdForm.reset();
      navigateTo('profile-view');
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to update password.', 'error');
    }
  } catch (err) {
    showToast('Connection failed.', 'error');
  }
});

/* ==========================================================================
   NOTIFICATIONS MANAGEMENT (BELL ICON & MODAL LOG)
   ========================================================================== */

floatingNotifBtn.addEventListener('click', () => {
  notifModalOverlay.classList.remove('hidden');
  loadNotifications();
});

btnCloseNotifModal.addEventListener('click', () => {
  notifModalOverlay.classList.add('hidden');
});

notifModalOverlay.addEventListener('click', (e) => {
  if (e.target === notifModalOverlay) {
    notifModalOverlay.classList.add('hidden');
  }
});

async function loadNotifications() {
  if (!token) return;
  try {
    const res = await fetch(`${API_URL}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const notifications = await res.json();
    if (res.ok) {
      const unread = notifications.filter(n => !n.is_read);
      if (unread.length > 0) {
        floatingBadgeCount.innerText = unread.length;
        floatingBadgeCount.classList.remove('hidden');
      } else {
        floatingBadgeCount.classList.add('hidden');
      }

      // Populate modal list
      if (notifications.length === 0) {
        notifModalListHolder.innerHTML = '<div class="no-data">No alerts received.</div>';
        return;
      }

      notifModalListHolder.innerHTML = '';
      notifications.forEach(notif => {
        const item = document.createElement('div');
        item.className = `notif-item ${!notif.is_read ? 'unread' : ''}`;
        
        const dateStr = new Date(notif.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        item.innerHTML = `
          <div class="notif-item-top">
            <span>ALERT</span>
            <span>${dateStr}</span>
          </div>
          <p class="notif-item-body">${notif.message}</p>
          ${!notif.is_read ? `<span class="notif-item-read-action" data-id="${notif.id}">Mark as Read</span>` : ''}
        `;

        const markBtn = item.querySelector('.notif-item-read-action');
        if (markBtn) {
          markBtn.addEventListener('click', async (evt) => {
            evt.stopPropagation();
            try {
              const readRes = await fetch(`${API_URL}/api/notifications/${notif.id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (readRes.ok) {
                loadNotifications();
              }
            } catch (err) {
              console.error(err);
            }
          });
        }

        notifModalListHolder.appendChild(item);
      });
    }
  } catch (err) {
    console.error('Failed to load notifications:', err);
  }
}

function pollNotifications() {
  loadNotifications();
  setInterval(() => {
    if (token && isOnline) {
      loadNotifications();
    }
  }, 15000);
}

// Initial authentication verify
checkAuth();
