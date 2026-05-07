/* ════════════════════════════════════════
   MEDICONNECT — APP CONTROLLER
   ════════════════════════════════════════ */

let currentRole = 'patient';

/* ─── DEMO CREDENTIAL MAP ─── */
const DEMO = {
  patient:  '💊 <strong>Patient:</strong> patient@mediconnect.in / patient123',
  doctor:   '👨‍⚕️ <strong>Doctor:</strong> doctor@mediconnect.in / doctor123',
  admin:    '🛡 <strong>Admin:</strong> admin@mediconnect.in / admin123',
  pharmacy: '🏪 <strong>Pharmacy:</strong> pharmacy@mediconnect.in / pharmacy123',
};

/* ─── ROLE SELECTION ─── */
function selectRole(role) {
  currentRole = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('rb-' + role).classList.add('active');
  
  // Show demo credentials
  const demoText = {
    'patient': '💊 <strong>Patient:</strong> patient@mediconnect.in / patient123',
    'doctor': '👨‍⚕️ <strong>Doctor:</strong> doctor@mediconnect.in / doctor123',
    'admin': '🛡 <strong>Admin:</strong> admin@mediconnect.in / admin123',
    'pharmacy': '🏪 <strong>Pharmacy:</strong> pharmacy@mediconnect.in / pharmacy123'
  };
  
  document.getElementById('demo-box').innerHTML = demoText[role] || '';
  document.getElementById('login-error').style.display = 'none';
}

// Store JWT token globally
let jwtToken = null;
let currentConsultationId = null;
let currentDoctorId = 'D01';
let currentPatientId = 'P01';
let currentDoctorSpec = 'General';
let selectedBookingSlot = null;
window.PH_RX_STATUS = {};
let currentCalendarMonth = new Date().getMonth() + 1;
let currentCalendarYear = new Date().getFullYear();
let currentUser = {}; // Store logged-in user info

// Initialize scheduled dates cache
window.SCHEDULED_DATES = [];
window.USER_CONSULTATIONS = []; // Store consultations for current user
window.MESSAGE_STORE = {}; // Store messages per consultation locally

// Load scheduled dates for doctor
async function loadScheduledDates() {
  try {
    const headers = { 'Authorization': 'Bearer ' + jwtToken };
    // Get all schedules for this month and next month
    const monthYears = [
      { month: currentCalendarMonth, year: currentCalendarYear },
      { month: currentCalendarMonth === 12 ? 1 : currentCalendarMonth + 1, year: currentCalendarMonth === 12 ? currentCalendarYear + 1 : currentCalendarYear }
    ];
    
    const allDates = [];
    for (const {month, year} of monthYears) {
      const monthStr = String(month).padStart(2, '0');
      const res = await fetch(`http://localhost:5000/api/schedules/doctor/D01/month?month=${monthStr}&year=${year}`, { headers });
      if (res.ok) {
        const {data} = await res.json();
        data.forEach(slot => {
          const dateStr = slot.slot_date;
          if (!allDates.includes(dateStr)) {
            allDates.push(dateStr);
          }
        });
      }
    }
    window.SCHEDULED_DATES = allDates;
  } catch(e) {
    console.warn('Error loading scheduled dates:', e);
  }
}

/* ─── LOGIN ─── */
async function doLogin() {
  const email   = document.getElementById('inp-email').value.trim();
  const pass    = document.getElementById('inp-pass').value.trim();
  const cred    = DATA.credentials[currentRole];
  const errEl   = document.getElementById('login-error');

  const emailVal = (email === '') ? cred.email : email;
  const passVal  = (pass  === '') ? cred.pass  : pass;

  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailVal, password: passVal })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      errEl.textContent = data.error || 'Login failed';
      errEl.style.display = 'block';
      return;
    }
    
    errEl.style.display = 'none';
    jwtToken = data.token; // save token
    currentUser = data; // Store user info (id, role, name, etc)
    
    // 🔥 Hydrate global DATA object from actual backend
    await loadBackendData();
    
    // Load scheduled dates if doctor
    if (currentRole === 'doctor') {
      await loadScheduledDates();
      // Set patient selector default to first patient
      if (DATA.patients.length > 0) {
        currentPatientId = DATA.patients[0].id;
      }
    } else if (currentRole === 'patient') {
      // For patient, use linked patient record ID from login if available
      currentPatientId = data.patientId || 'P01';
    }
    
    // Navigate to portal
    showPage(cred.page);

    // Render default view
    const defaultViews = { patient:'pt-home', doctor:'dr-home', admin:'ad-home', pharmacy:'ph-home' };
    showView(defaultViews[currentRole], null);
    
    // Initialize cart for patient role
    if (currentRole === 'patient') {
      updateCartBadge();
    }

  } catch(e) {
    errEl.textContent = "Server offline. Ensure backend is running.";
    errEl.style.display = 'block';
  }
}

/* ─── LIVE DATA HYDRATOR ─── */
async function loadBackendData() {
  const headers = { 'Authorization': 'Bearer ' + jwtToken };
  
  // Fetch Patients
  try {
    const ptRes = await fetch('http://localhost:5000/api/patients/', { headers });
    const { data: pts } = await ptRes.json();
    DATA.patients = pts.map(p => ({
      ...p,
      init: p.name.split(' ').map(n=>n[0]).join(''),
      av: 'av-blue', // fallback
      cond: p.condition,
      last: p.updated_at ? p.updated_at.split('T')[0] : 'Just now',
      statusLabel: p.status.charAt(0).toUpperCase() + p.status.slice(1),
      status: p.status === 'active' ? 'b-live' : p.status === 'stable' ? 'b-done' : 'b-wait'
    }));
  } catch(e){ console.warn("Failed loading patients"); }

  // Fetch Doctors
  try {
    const drRes = await fetch('http://localhost:5000/api/doctors/', { headers });
    const { data: drs } = await drRes.json();
    DATA.doctors = drs.map(d => ({
      ...d,
      init: d.name.replace('Dr. ','').split(' ').map(n=>n[0]).join(''),
      av: 'av-teal',
      spec: d.speciality,
      patients: d.total_patients,
      statusLabel: d.status.charAt(0).toUpperCase() + d.status.slice(1),
      status: d.status === 'available' ? 'b-live' : d.status === 'busy' ? 'b-wait' : 'b-done'
    }));
  } catch(e){ console.warn("Failed loading doctors"); }

  // Fetch Consultations
  try {
    const csRes = await fetch('http://localhost:5000/api/consultations', { headers });
    const { data: cs } = await csRes.json();
    
    const mappedCs = cs.map(c => {
      // Lookups for names
      const p = DATA.patients.find(x => x.id === c.patientId) || { name: 'Unknown', init: 'U' };
      const d = DATA.doctors.find(x => x.id === c.doctorId)   || { name: 'Dr. Unknown' };
      return {
        id: c.id, init: p.init, av: 'av-blue', name: p.name, doc: d.name, spec: c.speciality,
        badge: c.status === 'live' ? 'b-live' : (c.status === 'waiting' ? 'b-wait' : (c.status === 'completed' ? 'b-done' : 'b-sched')),
        label: c.status === 'live' ? '🔴 Live' : c.status,
        time: c.time.slice(0,5), 
        duration: c.duration_min ? c.duration_min + ' min' : '—',
        originalStatus: c.status
      };
    });
    
    DATA.consultations = {
      live: mappedCs.filter(c => ['live','waiting'].includes(c.originalStatus)),
      upcoming: mappedCs.filter(c => ['scheduled'].includes(c.originalStatus)),
      completed: mappedCs.filter(c => ['completed','rx_issued'].includes(c.originalStatus)),
    };
  } catch(e){ console.warn("Failed loading consults"); }

  // Fetch Orders
  try {
    const orRes = await fetch('http://localhost:5000/api/orders', { headers });
    const { data: orders } = await orRes.json();
    DATA.orders = orders.map(o => {
      const p = DATA.patients.find(x => x.id === o.patientId) || { name: 'Unknown Patient' };
      return {
        id: o.id, patient: p.name, items: 'View Order Details', 
        amt: '₹' + Math.round(o.total_amount), 
        status: o.status === 'delivered' ? 'b-done' : o.status === 'dispatched' ? 'b-ship' : 'b-wait',
        label: o.status.charAt(0).toUpperCase() + o.status.slice(1),
        date: new Date(o.ordered_at).toLocaleDateString()
      };
    });
  } catch(e){ console.warn("Failed loading orders"); }

  // Fetch Inventory
  try {
    const invRes = await fetch('http://localhost:5000/api/inventory/', { headers });
    const { data: inventory } = await invRes.json();
    DATA.inventory = inventory.map(i => ({
      ...i,
      sku: i.sku,
      name: i.name,
      qty: i.qty,
      min: i.min_qty,
      price: i.price !== null && i.price !== undefined ? `₹${i.price}` : '₹0',
      expiry: i.expiry_date ? i.expiry_date.slice(0, 10) : '—'
    }));
  } catch(e){ console.warn("Failed loading inventory"); }
}

async function submitNewDoctor() {
  const name = document.getElementById('add-doctor-name').value.trim();
  const speciality = document.getElementById('add-doctor-speciality').value.trim();
  const license = document.getElementById('add-doctor-license').value.trim();
  const experience = document.getElementById('add-doctor-experience').value.trim();
  const statusEl = document.getElementById('add-doctor-message');

  statusEl.style.display = 'none';
  statusEl.textContent = '';

  if (!name || !speciality) {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Name and Speciality are required.';
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + jwtToken
  };

  try {
    const res = await fetch('http://localhost:5000/api/doctors/', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, speciality })
    });

    let data;
    try {
      data = await res.json();
    } catch (parseError) {
      console.error('Failed to parse response JSON:', parseError);
      statusEl.style.display = 'block';
      statusEl.textContent = 'Unexpected response from backend. Check console for details.';
      return;
    }

    if (!res.ok) {
      statusEl.style.display = 'block';
      statusEl.textContent = data.error || 'Unable to add doctor.';
      return;
    }

    await loadBackendData();
    showView('ad-doctors', null);
    alert('Doctor added successfully: ' + data.name);
  } catch (e) {
    console.error('Create doctor failed', e);
    statusEl.style.display = 'block';
    statusEl.textContent = 'Could not add doctor. Please check backend and try again.';
  }
}

async function submitNewPatient() {
  const name = document.getElementById('add-patient-name').value.trim();
  const dob = document.getElementById('add-patient-dob').value;
  const gender = document.getElementById('add-patient-gender').value;
  const age = document.getElementById('add-patient-age').value.trim();
  const blood_group = document.getElementById('add-patient-blood-group').value;
  const height_cm = document.getElementById('add-patient-height').value.trim();
  const weight_kg = document.getElementById('add-patient-weight').value.trim();
  const phone = document.getElementById('add-patient-phone').value.trim();
  const address = document.getElementById('add-patient-address').value.trim();
  const city = document.getElementById('add-patient-city').value.trim();
  const state = document.getElementById('add-patient-state').value.trim();
  const allergies = document.getElementById('add-patient-allergies').value.trim();
  const condition_note = document.getElementById('add-patient-condition').value.trim();
  const statusEl = document.getElementById('add-patient-message');

  statusEl.style.display = 'none';
  statusEl.textContent = '';

  if (!name) {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Name is required.';
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + jwtToken
  };

  const payload = {
    name,
    dob: dob || null,
    gender: gender || null,
    age: age ? parseInt(age) : null,
    blood_group: blood_group || null,
    height_cm: height_cm ? parseFloat(height_cm) : null,
    weight_kg: weight_kg ? parseFloat(weight_kg) : null,
    phone: phone || null,
    address: address || null,
    city: city || null,
    state: state || null,
    allergies: allergies || null,
    condition_note: condition_note || null
  };

  try {
    const res = await fetch('http://localhost:5000/api/patients/', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    let data;
    try {
      data = await res.json();
    } catch (parseError) {
      console.error('Failed to parse response JSON:', parseError);
      statusEl.style.display = 'block';
      statusEl.textContent = 'Unexpected response from backend. Check console for details.';
      return;
    }

    if (!res.ok) {
      statusEl.style.display = 'block';
      statusEl.textContent = data.error || 'Unable to add patient.';
      return;
    }

    await loadBackendData();
    showView('ad-users', null);
    alert('Patient added successfully: ' + data.name);
  } catch (e) {
    console.error('Create patient failed', e);
    statusEl.style.display = 'block';
    statusEl.textContent = 'Could not add patient. Please check backend and try again.';
  }
}

async function submitNewInventory() {
  const name = document.getElementById('add-inventory-name').value.trim();
  const qty = parseInt(document.getElementById('add-inventory-qty').value, 10);
  const minQty = parseInt(document.getElementById('add-inventory-minqty').value, 10);
  const price = parseFloat(document.getElementById('add-inventory-price').value);
  const expiry = document.getElementById('add-inventory-expiry').value;
  const statusEl = document.getElementById('add-inventory-message');

  statusEl.style.display = 'none';
  statusEl.textContent = '';

  if (!name || Number.isNaN(qty) || qty < 0) {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Medicine name and quantity are required.';
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + jwtToken
  };

  try {
    const res = await fetch('http://localhost:5000/api/inventory/', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, qty, minQty: isNaN(minQty) ? 20 : minQty, price: isNaN(price) ? 0 : price, expiry })
    });

    const data = await res.json();
    if (!res.ok) {
      statusEl.style.display = 'block';
      statusEl.textContent = data.error || 'Unable to add inventory item.';
      return;
    }

    await loadBackendData();
    showView('ad-inventory', null);
    alert(`Inventory item added: ${data.name}`);
  } catch (e) {
    console.error('Create inventory failed', e);
    statusEl.style.display = 'block';
    statusEl.textContent = 'Could not add inventory item. Please check backend and try again.';
  }
}

// ─── ADMIN FUNCTIONS ───
async function suspendPatient(patientId) {
  if (!confirm('Are you sure you want to suspend this patient? This will permanently delete their record from the database.')) {
    return;
  }

  try {
    const headers = {
      'Authorization': 'Bearer ' + jwtToken
    };

    const res = await fetch(`http://localhost:5000/api/patients/${patientId}`, {
      method: 'DELETE',
      headers
    });

    const data = await res.json();

    if (!res.ok) {
      alert(`Failed to suspend patient: ${data.error || 'Unknown error'}`);
      return;
    }

    alert('Patient suspended successfully');
    await loadBackendData();
    showView('ad-users', null);
  } catch (e) {
    console.error('Suspend patient failed', e);
    alert('Could not suspend patient. Please try again.');
  }
}

async function suspendDoctor(doctorId) {
  if (!confirm('Are you sure you want to suspend this doctor? This will permanently delete their record from the database.')) {
    return;
  }

  try {
    const headers = {
      'Authorization': 'Bearer ' + jwtToken
    };

    const res = await fetch(`http://localhost:5000/api/doctors/${doctorId}`, {
      method: 'DELETE',
      headers
    });

    const data = await res.json();

    if (!res.ok) {
      alert(`Failed to suspend doctor: ${data.error || 'Unknown error'}`);
      return;
    }

    alert('Doctor suspended successfully');
    await loadBackendData();
    showView('ad-doctors', null);
  } catch (e) {
    console.error('Suspend doctor failed', e);
    alert('Could not suspend doctor. Please try again.');
  }
}

async function editPatient(patientId) {
  const newName = prompt('Enter new name for the patient:');
  if (!newName || newName.trim() === '') return;

  const newAge = prompt('Enter new age (leave empty to skip):');
  const newCity = prompt('Enter new city (leave empty to skip):');

  const updates = { name: newName.trim() };
  if (newAge && !isNaN(parseInt(newAge))) {
    updates.age = parseInt(newAge);
  }
  if (newCity && newCity.trim()) {
    updates.city = newCity.trim();
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + jwtToken
    };

    const res = await fetch(`http://localhost:5000/api/patients/${patientId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });

    const data = await res.json();

    if (!res.ok) {
      alert(`Failed to update patient: ${data.error || 'Unknown error'}`);
      return;
    }

    alert('Patient updated successfully');
    await loadBackendData();
    showView('ad-users', null);
  } catch (e) {
    console.error('Update patient failed', e);
    alert('Could not update patient. Please try again.');
  }
}

async function editDoctor(doctorId) {
  const newName = prompt('Enter new name for the doctor:');
  if (!newName || newName.trim() === '') return;

  const newSpeciality = prompt('Enter new speciality (leave empty to skip):');

  const updates = { name: newName.trim() };
  if (newSpeciality && newSpeciality.trim()) {
    updates.speciality = newSpeciality.trim();
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + jwtToken
    };

    const res = await fetch(`http://localhost:5000/api/doctors/${doctorId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });

    const data = await res.json();

    if (!res.ok) {
      alert(`Failed to update doctor: ${data.error || 'Unknown error'}`);
      return;
    }

    alert('Doctor updated successfully');
    await loadBackendData();
    showView('ad-doctors', null);
  } catch (e) {
    console.error('Update doctor failed', e);
    alert('Could not update doctor. Please try again.');
  }
}

// ─── PHARMACY FUNCTIONS ───
async function editInventory(sku) {
  const newName = prompt('Enter new medicine name:');
  if (!newName || newName.trim() === '') return;

  const newPrice = prompt('Enter new price (leave empty to skip):');
  const newQty = prompt('Enter new quantity (leave empty to skip):');

  const updates = { name: newName.trim() };
  if (newPrice && !isNaN(parseFloat(newPrice))) {
    updates.price = parseFloat(newPrice);
  }
  if (newQty && !isNaN(parseInt(newQty))) {
    updates.qty = parseInt(newQty);
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + jwtToken
    };

    const res = await fetch(`http://localhost:5000/api/inventory/${sku}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });

    const data = await res.json();

    if (!res.ok) {
      alert(`Failed to update inventory: ${data.error || 'Unknown error'}`);
      return;
    }

    alert('Inventory item updated successfully');
    await loadBackendData();
    showView('ph-inventory', null);
  } catch (e) {
    console.error('Update inventory failed', e);
    alert('Could not update inventory item. Please try again.');
  }
}

async function deleteInventory(sku) {
  if (!confirm('Are you sure you want to delete this inventory item? This will permanently remove it from the database.')) {
    return;
  }

  try {
    const headers = {
      'Authorization': 'Bearer ' + jwtToken
    };

    const res = await fetch(`http://localhost:5000/api/inventory/${sku}`, {
      method: 'DELETE',
      headers
    });

    const data = await res.json();

    if (!res.ok) {
      alert(`Failed to delete inventory item: ${data.error || 'Unknown error'}`);
      return;
    }

    alert('Inventory item deleted successfully');
    await loadBackendData();
    showView('ph-inventory', null);
  } catch (e) {
    console.error('Delete inventory failed', e);
    alert('Could not delete inventory item. Please try again.');
  }
}

function selectSlot(el) {
  document.querySelectorAll('[data-slot]').forEach(slot => {
    slot.style.background = 'var(--bg2)';
    slot.style.color = 'var(--t2)';
  });
  el.style.background = 'var(--blue)';
  el.style.color = '#fff';
  selectedBookingSlot = el.dataset.slot;
}

async function confirmBooking() {
  const doctorId = currentDoctorId;
  const date = document.getElementById('booking-date')?.value;
  const type = document.getElementById('booking-type')?.value;
  const reason = document.getElementById('booking-reason')?.value.trim();
  const statusEl = document.getElementById('booking-message');

  if (!doctorId) {
    alert('Please select a doctor before booking.');
    return;
  }
  if (!date) {
    alert('Please choose a date for your appointment.');
    return;
  }
  if (!selectedBookingSlot) {
    alert('Please select an available time slot.');
    return;
  }

  const payload = {
    patientId: currentPatientId || currentUser.patientId || currentUser.id,
    doctorId: doctorId,
    type: type || 'video',
    date: date,
    time: `${selectedBookingSlot}:00`,
    spec: currentDoctorSpec || 'General',
    reason: reason || 'General consultation'
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + jwtToken
    };

    const res = await fetch('http://localhost:5000/api/consultations/', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Could not book appointment.');
      return;
    }

    await loadBackendData();
    showView('pt-home', null);
    alert(`✅ Appointment booked for ${date} at ${selectedBookingSlot} with ${DATA.doctors.find(d => d.id === doctorId)?.name || 'selected doctor'}`);
    selectedBookingSlot = null;
  } catch (err) {
    console.error('Booking failed', err);
    alert('An error occurred while booking. Please try again.');
  }
}

/* ─── LOGOUT ─── */
function doLogout() {
  jwtToken = null;
  document.getElementById('inp-email').value = '';
  document.getElementById('inp-pass').value  = '';
  showPage('page-login');
  selectRole('patient');
}

/* ─── PAGE ROUTING ─── */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ─── VIEW ROUTING ─── */
const VIEWS = { ...PT, ...DR, ...AD, ...PH };

const VIEW_TITLES = {
  'pt-home':'Dashboard','pt-book':'Book Appointment','pt-tele':'Teleconsultation',
  'pt-rx':'Prescriptions','pt-records':'Health Records','pt-shop':'Medicine Shop','pt-cart':'Shopping Cart','pt-orders':'My Orders',
  'dr-home':'Dashboard','dr-schedule':'My Schedule','dr-consult':'Consultation Room',
  'dr-patients':'My Patients','dr-rx':'Write Prescription','dr-ehr':'Electronic Health Record',
  'ad-home':'Dashboard','ad-users':'User Management','ad-doctors':'Doctor Management',
  'ad-consults':'Consultations','ad-orders':'Medicine Orders','ad-inventory':'Inventory',
  'ad-payments':'Payments','ad-analytics':'Analytics','ad-settings':'Settings',
  'ph-home':'Dashboard','ph-catalog':'Medicine Catalog','ph-orders':'Order Management',
  'ph-delivery':'Delivery Tracking','ph-inventory':'Inventory','ph-rx-verify':'Rx Verification',
};

const CONTENT_MAP = {
  pt:'pt-content', dr:'dr-content', ad:'ad-content', ph:'ph-content',
};
const TITLE_MAP = {
  pt:'pt-title', dr:'dr-title', ad:'ad-title', ph:'ph-title',
};
const SB_MAP = {
  pt:'#sb-patient .nav-link', dr:'#sb-doctor .nav-link',
  ad:'#sb-admin .nav-link',  ph:'#sb-pharmacy .nav-link',
};

function showView(viewId, navEl) {
  const prefix   = viewId.split('-')[0];
  const renderer = VIEWS[viewId];
  if (!renderer) return;

  // Update content
  const content = document.getElementById(CONTENT_MAP[prefix]);
  content.innerHTML = `<div class="fade-in">${renderer()}</div>`;

  // Update title
  const titleEl = document.getElementById(TITLE_MAP[prefix]);
  if (titleEl) titleEl.textContent = VIEW_TITLES[viewId] || viewId;

  // Update active nav
  if (navEl) {
    document.querySelectorAll(SB_MAP[prefix]).forEach(n => n.classList.remove('active'));
    navEl.classList.add('active');
  }

  // Scroll to top
  content.scrollTop = 0;

  // Init view-specific logic
  initViewLogic(viewId);
}

function initViewLogic(viewId) {
  if (viewId === 'pt-tele') {
    startTimer();
    loadConsultationsAndShowSelector('patient');
  } else if (viewId === 'pt-cart') {
    renderCart();
  } else if (viewId === 'dr-consult') {
    startTimer();
    loadConsultationsAndShowSelector('doctor');
  } else if (viewId === 'dr-schedule') {
    // Load initial schedule for today
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    loadDateSlots(todayStr);
  } else if (viewId === 'dr-patients') {
    loadPatientsData();
  } else if (viewId === 'dr-rx') {
    setupPrescriptionForm();
  }
}

// ─── LOAD DATE SLOTS FOR CALENDAR ─── 
async function loadDateSlots(dateStr) {
  try {
    const headers = { 'Authorization': 'Bearer ' + jwtToken };
    const res = await fetch(
      `http://localhost:5000/api/schedules/doctor/${currentDoctorId}/available?date=${dateStr}`,
      { headers }
    );
    
    if (!res.ok) {
      const container = document.getElementById('schedule-slots-container');
      if (container) {
        container.innerHTML = '<div style="color:var(--t3);font-size:12px;padding:10px;">No schedules available</div>';
      }
      return;
    }
    
    const { data } = await res.json();
    const container = document.getElementById('schedule-slots-container');
    const dateHeader = document.getElementById('schedule-date-header');
    
    if (container && dateHeader) {
      dateHeader.textContent = dateStr.split('-')[2] + ' — Slots';
      
      if (data.length === 0) {
        container.innerHTML = '<div style="color:var(--t3);font-size:12px;padding:10px;">No schedules for this date</div>';
      } else {
        container.innerHTML = data.map(slot => {
          const time = slot.slot_time || slot.slotTime;
          const isBooked = slot.booked_by || slot.bookedBy;
          const bookedBy = slot.booked_by || slot.bookedBy;
          const patientName = bookedBy ? (DATA.patients.find(p => p.id === bookedBy)?.name || bookedBy) : '—';
          
          return `<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);align-items:center;">
            <div style="font-size:12px;font-weight:600;color:var(--t2);width:36px">${time.slice(0, 5)}</div>
            <div style="flex:1;font-size:12px;color:var(--t1);">${patientName}</div>
            <span class="badge ${isBooked ? 'b-live' : 'b-done'}" style="font-size:10px;">${isBooked ? 'Booked' : 'Free'}</span>
          </div>`;
        }).join('');
      }
    }
  } catch (err) {
    console.warn('Error loading slots:', err);
  }
}

// ─── LOAD CONSULTATIONS AND SHOW SELECTOR ─── 
async function loadConsultationsAndShowSelector(role) {
  try {
    const headers = { 'Authorization': 'Bearer ' + jwtToken };
    const endpoint = role === 'doctor' 
      ? 'http://localhost:5000/api/consultations?role=doctor'
      : 'http://localhost:5000/api/consultations?role=patient';
    
    const res = await fetch(endpoint, { headers });
    if (!res.ok) return;
    
    const { data } = await res.json();
    window.USER_CONSULTATIONS = data;
    
    // Auto-select first consultation if available
    if (data.length > 0) {
      currentConsultationId = data[0].id;
      await renderMessagesInChat(currentConsultationId);
    }
  } catch(e) {
    console.warn('Error loading consultations:', e);
  }
}

// ─── LOAD CONSULTATION MESSAGES UI ─── 
async function loadConsultationMessagesUI() {
  // For pt-tele and dr-consult views, load the consultation C001 by default
  if (currentConsultationId) {
    await renderMessagesInChat(currentConsultationId);
  }
}

// ─── RENDER MESSAGES INTO CHAT UI ─── 
async function renderMessagesInChat(consultationId, chatElementId = null) {
  try {
    let chatElement = null;
    if (chatElementId) {
      chatElement = document.getElementById(chatElementId);
    } else {
      chatElement = document.getElementById('tele-chat') || document.getElementById('dr-chat');
    }
    
    if (!chatElement) {
      console.warn('Chat element not found:', chatElementId);
      return;
    }
    
    // Load messages from backend
    const messages = await loadConsultationMessages(consultationId);
    
    // Store in memory for future reference
    if (!window.MESSAGE_STORE) {
      window.MESSAGE_STORE = {};
    }
    window.MESSAGE_STORE[consultationId] = messages;
    
    if (messages.length === 0) {
      chatElement.innerHTML = '<div style="color:var(--t3);font-size:12px;padding:20px;text-align:center;">No messages yet. Start the conversation!</div>';
    } else {
      const messagesHTML = messages.map(msg => {
        const time = new Date(msg.sentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const isMine = msg.senderRole === currentRole;
        const senderLabel = msg.senderRole === 'doctor' ? '👨‍⚕️' : '🧑';
        const displayName = isMine ? 'You' : msg.senderName || (msg.senderRole === 'doctor' ? 'Doctor' : 'Patient');
        
        return `<div class="msg ${isMine ? 'me' : 'them'}">
          <div style="font-size:10px;color:var(--t2);margin-bottom:3px;">${senderLabel} ${displayName}</div>
          <div class="msg-bubble">${msg.messageText}</div>
          <div class="msg-time">${time}</div>
        </div>`;
      }).join('');
      
      chatElement.innerHTML = messagesHTML;
      chatElement.scrollTop = chatElement.scrollHeight;
    }
  } catch (err) {
    console.warn('Error rendering messages:', err);
  }
}

// ─── LOAD DYNAMIC PATIENTS DATA  ─── 
async function loadPatientsData() {
  try {
    const headers = { 'Authorization': 'Bearer ' + jwtToken };
    const res = await fetch('http://localhost:5000/api/patients', { headers });
    
    if (res.ok) {
      const { data } = await res.json();
      // The DATA.patients should already be loaded from loadBackendData
      // Just update the table if needed
    }
  } catch (err) {
    console.warn('Error loading patients:', err);
  }
}

// ─── SETUP PRESCRIPTION FORM ─── 
async function setupPrescriptionForm() {
  // Populate patient dropdown
  const patientSelect = document.getElementById('rx-patient-select');
  if (patientSelect && DATA.patients) {
    patientSelect.innerHTML = DATA.patients.map(p => `
      <option value="${p.id}">${p.name} (${p.id})</option>
    `).join('');
    patientSelect.value = currentPatientId;
    patientSelect.onchange = async function() {
      currentPatientId = this.value;
      // Load consultations for selected patient
      await loadPatientConsultations(currentPatientId);
    };
  }
  
  // Load consultations for current patient
  await loadPatientConsultations(currentPatientId);
}

// ─── LOAD CONSULTATIONS FOR PATIENT ─── 
async function loadPatientConsultations(patientId) {
  try {
    const headers = { 'Authorization': 'Bearer ' + jwtToken };
    const res = await fetch(`http://localhost:5000/api/consultations?patientId=${patientId}`, { headers });
    if (!res.ok) return;
    
    const { data } = await res.json();
    const consultSelect = document.getElementById('rx-consult-select');
    if (consultSelect) {
      consultSelect.innerHTML = data.length === 0 
        ? '<option>No consultations available</option>'
        : data.map(c => `<option value="${c.id}">${c.id} - ${c.speciality}</option>`).join('');
      if (data.length > 0) {
        consultSelect.value = data[0].id;
      }
    }
  } catch(e) {
    console.warn('Error loading consultations:', e);
  }
}

// ─── SAVE PRESCRIPTION TO DATABASE ─── 
async function savePrescription(action) {
  try {
    const headers = { 
      'Authorization': 'Bearer ' + jwtToken,
      'Content-Type': 'application/json'
    };
    
    const patientId = document.getElementById('rx-patient-select')?.value || currentPatientId;
    const consultationId = document.getElementById('rx-consult-select')?.value || currentConsultationId;
    const diagnosis = document.querySelector('.rx-input')?.value || '';
    const medicines = Array.from(document.querySelectorAll('.rx-row')).map(row => {
      const inputs = row.querySelectorAll('.rx-input');
      return {
        name: inputs[0]?.value || '',
        dosage: inputs[1]?.value || '',
        duration: inputs[2]?.value || ''
      };
    }).filter(m => m.name);
    const notes = document.querySelector('textarea.rx-input')?.value || '';
    
    const res = await fetch('http://localhost:5000/api/prescriptions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        patientId,
        consultationId,
        doctorId: currentDoctorId,
        diagnosis,
        medicines,
        notes,
        status: 'issued'
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      alert(`✅ Prescription ${action}! ID: ${data.id || 'saved'}`);
      if (action === 'sent to patient' && currentRole === 'doctor') {
        // Show prescription
        printPrescription();
      }
    } else {
      const err = await res.json();
      alert(`❌ Failed: ${err.error || 'Unknown error'}`);
    }
  } catch(e) {
    console.error('Error saving prescription:', e);
    alert('Error: ' + e.message);
  }
}

// ─── PRINT PRESCRIPTION ─── 
function printPrescription() {
  const printWindow = window.open('', '_blank');
  
  // Extract prescription data from the form
  const patientId = document.getElementById('rx-patient-select')?.value || currentPatientId;
  const patient = DATA.patients.find(p => p.id === patientId);
  const patientName = patient?.name || 'Unknown Patient';
  const patientAge = patient?.age + ' years' || '—';
  const consultationId = document.getElementById('rx-consult-select')?.value || 'C—';
  const diagnosis = document.querySelector('.rx-input')?.value || 'Not specified';
  const doctorName = currentUser.name || 'Dr. unknown';
  const doctorSpec = DATA.doctors.find(d => d.id === currentDoctorId)?.speciality || 'General Practice';
  const doctorLic = 'MH-GP-' + Math.floor(Math.random() * 99999);
  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // Extract medicines
  const medicinesHTML = Array.from(document.querySelectorAll('.rx-row')).map(row => {
    const inputs = row.querySelectorAll('.rx-input');
    const medicine = inputs[0]?.value || '';
    const dosage = inputs[1]?.value || '';
    const duration = inputs[2]?.value || '';
    return `<tr><td>${medicine}</td><td>${dosage}</td><td>${duration}</td></tr>`;
  }).join('');
  
  const notes = document.querySelector('textarea.rx-input')?.value || '';
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Prescription - ${patientName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; color: #333; line-height: 1.6; }
        .prescription { max-width: 8.5in; height: 11in; margin: 0 auto; padding: 30px; background: white; position: relative; }
        .rx-header { border-bottom: 3px solid #003366; padding-bottom: 15px; margin-bottom: 20px; }
        .hospital-name { font-size: 24px; font-weight: bold; color: #003366; margin-bottom: 5px; }
        .hospital-info { font-size: 11px; color: #666; }
        .doc-info { display: flex; justify-content: space-between; font-size: 12px; margin: 15px 0; }
        .doc-info div { flex: 1; }
        .patient-info { background: #f8f8f8; padding: 12px; margin-bottom: 15px; border-radius: 4px; font-size: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .patient-info div { padding: 5px 0; }
        .patient-info strong { color: #003366; display: block; font-size: 11px; }
        .section-title { background: #003366; color: white; padding: 8px 12px; margin-top: 15px; margin-bottom: 10px; font-weight: bold; font-size: 12px; }
        .diagnosis { background: #fff3cd; padding: 10px; margin-bottom: 15px; border-left: 4px solid #ff9800; font-size: 12px; }
        .medicines-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
        .medicines-table th { background: #e8e8e8; padding: 8px; text-align: left; font-weight: bold; border-bottom: 2px solid #333; }
        .medicines-table td { padding: 8px; border-bottom: 1px solid #ddd; }
        .medicines-table tr:nth-child(even) { background: #f9f9f9; }
        .notes { background: #e3f2fd; padding: 10px; border-left: 4px solid #2196F3; font-size: 11px; margin-bottom: 20px; }
        .rx-footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
        .signature { border-top: 2px solid #333; padding-top: 5px; text-align: center; width: 150px; font-size: 12px; font-weight: bold; }
        .date-time { font-size: 10px; color: #666; margin-top: 20px; }
        @media print {
          body { margin: 0; padding: 0; }
          .prescription { margin: 0; height: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="prescription">
        <div class="rx-header">
          <div class="hospital-name">Rx - MediConnect</div>
          <div class="hospital-info">Unified Health Platform | Online Telemedicine</div>
        </div>
        
        <div class="doc-info">
          <div><strong>${doctorName}</strong><br/>${doctorSpec}<br/>License: ${doctorLic}</div>
          <div style="text-align: right;"><strong>Date:</strong> ${today}</div>
        </div>
        
        <div class="patient-info">
          <div><strong>Patient Name:</strong> ${patientName}</div>
          <div><strong>Age:</strong> ${patientAge}</div>
          <div><strong>Patient ID:</strong> ${patientId}</div>
          <div><strong>Consultation ID:</strong> ${consultationId}</div>
        </div>
        
        <div class="section-title">DIAGNOSIS</div>
        <div class="diagnosis">${diagnosis}</div>
        
        <div class="section-title">MEDICINES</div>
        <table class="medicines-table">
          <thead>
            <tr>
              <th>Medicine Name</th>
              <th>Dosage</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${medicinesHTML}
          </tbody>
        </table>
        
        ${notes ? `<div class="section-title">NOTES TO PATIENT</div><div class="notes">${notes.replace(/\\n/g, '<br>')}</div>` : ''}
        
        <div class="rx-footer">
          <div></div>
          <div class="signature">
            ${doctorName}
          </div>
        </div>
        
        <div class="date-time">
          <strong>Important:</strong> Keep this prescription safe. Show it to the pharmacist for medicine dispensing.
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 250);
}

/* ─── DOCUMENT UPLOAD ─── */
async function uploadDocument(type) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const headers = {
        'Authorization': 'Bearer ' + jwtToken
      };
      
      const response = await fetch(`http://localhost:5000/api/patients/${currentPatientId}/documents`, {
        method: 'POST',
        headers,
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} document uploaded successfully!`);
        // Reload the health records view
        showView('pt-records', null);
      } else {
        alert(`❌ Upload failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert(`❌ Error uploading document: ${err.message}`);
    }
  };
  
  input.click();
}
function switchTab(el, tabKey) {
  // Deactivate sibling tabs
  el.closest('.tab-row').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');

  const tabData = {
    'pt-upcoming': DATA.consultations.upcoming,
    'pt-past':     DATA.consultations.completed,
    'dr-live':     DATA.consultations.live,
    'dr-upcoming': DATA.consultations.upcoming,
    'dr-completed':DATA.consultations.completed,
    'ad-live':     DATA.consultations.live,
    'ad-upcoming': DATA.consultations.upcoming,
    'ad-completed':DATA.consultations.completed,
    'all-consults':[...DATA.consultations.live,...DATA.consultations.upcoming,...DATA.consultations.completed],
    'live-consults':DATA.consultations.live,
    'sched-consults':DATA.consultations.upcoming,
  };

  const targetMap = {
    'pt-upcoming':'pt-appt-tab','pt-past':'pt-appt-tab',
    'dr-live':'dr-queue-tab','dr-upcoming':'dr-queue-tab','dr-completed':'dr-queue-tab',
    'ad-live':'ad-consult-tab','ad-upcoming':'ad-consult-tab','ad-completed':'ad-consult-tab',
    'all-consults':'ad-consult-tab','live-consults':'ad-consult-tab','sched-consults':'ad-consult-tab',
  };

  const items = tabData[tabKey];
  const target = document.getElementById(targetMap[tabKey]);
  if (items && target) {
    target.innerHTML = consultList(items);
  }
}

/* ─── TELECONSULT ─── */
let timerInterval;
function startTimer() {
  clearInterval(timerInterval);
  let sec = 504; // 08:24
  timerInterval = setInterval(() => {
    sec++;
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    const el = document.querySelector('.video-area div[style*="LIVE"]');
    if (el) el.textContent = `🔴 LIVE • ${m}:${s}`;
    else clearInterval(timerInterval);
  }, 1000);
}

function toggleControl(btn, on, off) {
  btn.textContent = btn.textContent === on ? off : on;
}

// ─── CALENDAR NAVIGATION ─── 
async function navigateCalendar(direction) {
  if (direction === 'prev') {
    currentCalendarMonth--;
    if (currentCalendarMonth === 0) {
      currentCalendarMonth = 12;
      currentCalendarYear--;
    }
  } else {
    currentCalendarMonth++;
    if (currentCalendarMonth === 13) {
      currentCalendarMonth = 1;
      currentCalendarYear++;
    }
  }
  
  // Re-render the schedule view
  showView('dr-schedule', document.querySelector('#sb-doctor .nav-link:nth-child(3)'));
}

// ─── LOAD SCHEDULE AND SLOTS ─── 
async function loadScheduleForMonth() {
  try {
    const headers = { 'Authorization': 'Bearer ' + jwtToken };
    const res = await fetch(
      `http://localhost:5000/api/schedules/doctor/${currentDoctorId}/month?month=${currentCalendarMonth}&year=${currentCalendarYear}`,
      { headers }
    );
    
    if (!res.ok) {
      console.warn('Failed to load schedule');
      return [];
    }
    
    const { data } = await res.json();
    return data;
  } catch (err) {
    console.warn('Error loading schedule:', err);
    return [];
  }
}

// ─── LOAD CONSULTATION MESSAGES ─── 
async function loadConsultationMessages(consultationId) {
  try {
    currentConsultationId = consultationId;
    const headers = { 'Authorization': 'Bearer ' + jwtToken };
    const res = await fetch(
      `http://localhost:5000/api/messages/consultation/${consultationId}`,
      { headers }
    );
    
    if (!res.ok) {
      console.warn('Failed to load messages');
      return [];
    }
    
    const { data } = await res.json();
    return data;
  } catch (err) {
    console.warn('Error loading messages:', err);
    return [];
  }
}

// ─── SEND CONSULTATION MESSAGE ─── 
async function sendTeleMsg() {
  const input = document.getElementById('tele-msg');
  const text = input.value.trim();
  if (!text) return;
  
  try {
    // Send message to backend
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + jwtToken
    };
    
    const response = await fetch('http://localhost:5000/api/messages/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        consultationId: currentConsultationId,
        senderId: currentUser.id || currentPatientId,
        senderRole: 'patient',
        messageText: text
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      alert('Failed to send message: ' + (error.error || 'Unknown error'));
      return;
    }
    
    const message = await response.json();
    
    // Store in memory for UI
    if (!window.MESSAGE_STORE[currentConsultationId]) {
      window.MESSAGE_STORE[currentConsultationId] = [];
    }
    window.MESSAGE_STORE[currentConsultationId].push(message);
    
    // Update UI
    const chat = document.getElementById('tele-chat');
    const time = new Date(message.sentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const senderLabel = message.senderRole === 'doctor' ? '👨‍⚕️' : '🧑';
    const messageHTML = `<div class="msg me">
      <div style="font-size:10px;color:var(--t2);margin-bottom:3px;">${senderLabel} You</div>
      <div class="msg-bubble">${text}</div>
      <div class="msg-time">${time}</div>
    </div>`;
    
    chat.innerHTML += messageHTML;
    input.value = '';
    chat.scrollTop = chat.scrollHeight;
    
    console.log('Message sent and stored:', message);
  } catch (err) {
    console.error('Error sending message:', err);
    alert('Error sending message: ' + err.message);
  }
}

async function sendDrMsg() {
  const input = document.getElementById('dr-msg');
  const text = input.value.trim();
  if (!text) return;
  
  try {
    // Send message to backend
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + jwtToken
    };
    
    const response = await fetch('http://localhost:5000/api/messages/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        consultationId: currentConsultationId,
        senderId: currentUser.id || currentDoctorId,
        senderRole: 'doctor',
        messageText: text
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      alert('Failed to send message: ' + (error.error || 'Unknown error'));
      return;
    }
    
    const message = await response.json();
    
    // Store in memory for UI
    if (!window.MESSAGE_STORE[currentConsultationId]) {
      window.MESSAGE_STORE[currentConsultationId] = [];
    }
    window.MESSAGE_STORE[currentConsultationId].push(message);
    
    // Update UI
    const chat = document.getElementById('dr-chat');
    const time = new Date(message.sentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const senderLabel = message.senderRole === 'doctor' ? '👨‍⚕️' : '🧑';
    const messageHTML = `<div class="msg me">
      <div style="font-size:10px;color:var(--t2);margin-bottom:3px;">${senderLabel} You</div>
      <div class="msg-bubble">${text}</div>
      <div class="msg-time">${time}</div>
    </div>`;
    
    chat.innerHTML += messageHTML;
    input.value = '';
    chat.scrollTop = chat.scrollHeight;
    
    console.log('Message sent and stored:', message);
  } catch (err) {
    console.error('Error sending message:', err);
    alert('Error sending message: ' + err.message);
  }
}

function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ─── SHOW PATIENT DETAILS MODAL ─── 
function showPatientDetailsModal(patientId, patientName) {
  const patient = DATA.patients.find(p => p.id === patientId);
  if (!patient) {
    alert('Patient not found');
    return;
  }
  
  const modal = window.open('', '_blank', 'width=600,height=700');
  modal.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Patient Details - ${patientName}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
        .modal-content { background: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 3px solid #003366; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #003366; font-size: 24px; }
        .patient-avatar { display: inline-block; width: 60px; height: 60px; background: #003366; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin-right: 15px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
        .info-item { background: #f8f8f8; padding: 12px; border-radius: 6px; }
        .info-label { font-size: 11px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
        .info-value { font-size: 14px; font-weight: 600; color: #003366; }
        .full-width { grid-column: 1 / -1; }
        .status { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; }
        .status-active { background: #e8f5e9; color: #2e7d32; }
        .status-stable { background: #e1f5fe; color: #0277bd; }
        .status-review { background: #fff3e0; color: #e65100; }
        .button { background: #003366; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; margin-top:20px; }
        .button:hover { background: #001d47; }
      </style>
    </head>
    <body>
      <div class="modal-content">
        <div class="header">
          <div style="display:flex;align-items:center;margin-bottom:10px;">
            <div class="patient-avatar">${patient.init}</div>
            <div>
              <h1 style="margin:0;font-size:20px;">${patient.name}</h1>
              <span class="status status-${patient.status}">${patient.statusLabel}</span>
            </div>
          </div>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Age</div>
            <div class="info-value">${patient.age} years</div>
          </div>
          <div class="info-item">
            <div class="info-label">Gender</div>
            <div class="info-value">${patient.gender || 'Not specified'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">City</div>
            <div class="info-value">${patient.city}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Blood Group</div>
            <div class="info-value">${patient.bloodGroup || 'Not specified'}</div>
          </div>
          <div class="info-item full-width">
            <div class="info-label">Primary Condition</div>
            <div class="info-value">${patient.cond}</div>
          </div>
          <div class="info-item full-width">
            <div class="info-label">Allergies</div>
            <div class="info-value">${patient.allergies || 'None'}</div>
          </div>
          <div class="info-item full-width">
            <div class="info-label">Contact</div>
            <div class="info-value">${patient.phone || 'Not available'}</div>
          </div>
        </div>
        
        <button class="button" onclick="window.close()">Close</button>
      </div>
    </body>
    </html>
  `);
}

// ─── PRESCRIPTION ─── 
function addRxRow() {
  const container = document.getElementById('rx-rows');
  const row = document.createElement('div');
  row.className = 'rx-row';
  row.style = 'margin-bottom:8px;display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;align-items:center;';
  row.innerHTML = `
    <input class="rx-input" placeholder="Medicine name"/>
    <input class="rx-input" placeholder="Dosage"/>
    <input class="rx-input" placeholder="Duration"/>
    <button class="btn-del-row" onclick="this.closest('.rx-row').remove()">✕</button>`;
  container.appendChild(row);
}

/* ─── CART ─── */
function addToCart(id, name, price) {
  // Check if item already in cart
  const existingItem = DATA.cart.find(item => item.id === id);
  
  if (existingItem) {
    existingItem.qty = (existingItem.qty || 1) + 1;
  } else {
    // Find the medicine from DATA.medicines to get sku
    const med = DATA.medicines.find(m => m.id === id);
    const sku = med ? `MED-00${parseInt(id.split('M')[1])}` : `MED-${id}`;
    
    DATA.cart.push({ 
      id, 
      sku,
      name, 
      price: parseFloat(price.replace('₹', '')),
      qty: 1
    });
  }
  
  // Update cart badge dynamically
  updateCartBadge();
  alert(`✅ ${name} added to cart!`);
  console.log('Current cart:', DATA.cart);
}

function updateCartBadge() {
  const badges = document.querySelectorAll('[data-cart-count]');
  const totalItems = DATA.cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  badges.forEach(badge => {
    badge.textContent = totalItems;
  });
}

function removeFromCart(index) {
  if (index >= 0 && index < DATA.cart.length) {
    const removed = DATA.cart[index];
    DATA.cart.splice(index, 1);
    updateCartBadge();
    renderCart();
    console.log(`Removed ${removed.name} from cart`);
  }
}

function updateCartQty(index, newQty) {
  if (index >= 0 && index < DATA.cart.length) {
    if (newQty <= 0) {
      removeFromCart(index);
    } else {
      DATA.cart[index].qty = newQty;
      updateCartBadge();
      renderCart();
    }
  }
}

function getCartTotal() {
  return DATA.cart.reduce((total, item) => total + (item.price * item.qty), 0).toFixed(2);
}

function renderCart() {
  const cartContainer = document.getElementById('cart-items');
  if (!cartContainer) return;
  
  if (DATA.cart.length === 0) {
    cartContainer.innerHTML = '<div style="color:var(--t3);font-size:12px;padding:20px;text-align:center;">Your cart is empty. Add medicines to get started!</div>';
    return;
  }
  
  const cartHTML = DATA.cart.map((item, idx) => `
    <div class="cart-item" style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid var(--b2);font-size:13px;">
      <div style="flex:1;">
        <div style="font-weight:600;color:var(--t1);">${item.name}</div>
        <div style="color:var(--t2);font-size:11px;">₹${item.price}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="qty-btn" onclick="updateCartQty(${idx}, ${item.qty - 1})" style="padding:2px 6px;border:1px solid var(--b2);background:none;cursor:pointer;border-radius:3px;">−</button>
        <input type="number" value="${item.qty}" min="1" onchange="updateCartQty(${idx}, parseInt(this.value))" style="width:30px;text-align:center;border:1px solid var(--b2);padding:2px;border-radius:3px;">
        <button class="qty-btn" onclick="updateCartQty(${idx}, ${item.qty + 1})" style="padding:2px 6px;border:1px solid var(--b2);background:none;cursor:pointer;border-radius:3px;">+</button>
        <button class="btn-sm" onclick="removeFromCart(${idx})" style="padding:4px 8px;background:#f5f5f5;color:#d32f2f;border:none;cursor:pointer;border-radius:4px;font-size:11px;">Remove</button>
      </div>
    </div>
  `).join('');
  
  cartContainer.innerHTML = cartHTML;
}

async function checkoutCart() {
  if (DATA.cart.length === 0) {
    alert('❌ Cart is empty!');
    return;
  }
  
  try {
    const totalAmount = parseFloat(getCartTotal());
    
    // Convert cart items to order items format
    const items = DATA.cart.map(item => ({
      sku: item.sku,
      qty: item.qty,
      unitPrice: item.price
    }));
    
    const response = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwtToken
      },
      body: JSON.stringify({
        patientId: currentPatientId || currentUser.id,
        items: items,
        totalAmount: totalAmount,
        prescriptionId: null
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || result.error || 'Order creation failed');
    }
    
    // Confirm the order by updating status to 'confirmed'
    const confirmResponse = await fetch(`http://localhost:5000/api/orders/${result.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwtToken
      },
      body: JSON.stringify({
        status: 'confirmed'
      })
    });
    
    if (confirmResponse.ok) {
      alert(`✅ Order placed and confirmed successfully!\nOrder ID: ${result.id}\nTotal: ₹${totalAmount}`);
    } else {
      alert(`✅ Order placed successfully!\nOrder ID: ${result.id}\nTotal: ₹${totalAmount}\n⚠️ Order confirmation pending.`);
    }
    
    // Clear the cart
    DATA.cart = [];
    updateCartBadge();
    renderCart();
    
    // Reload orders and show orders view
    await loadBackendData();
    showView('pt-orders', null);
    
    console.log('Order created and confirmed:', result);
  } catch (err) {
    console.error('Checkout error:', err);
    alert(`❌ Error placing order: ${err.message}`);
  }
}

/* ─── DOCTOR SELECTION ─── */
function selectDoctor(id, name, spec) {
  const el = document.getElementById('book-doctor-name');
  if (el) el.textContent = `${name} — ${spec}`;
  currentDoctorId = id;
  currentDoctorSpec = spec;
}

function updatePhOrderStatus(orderId, status, selectEl) {
  const order = DATA.orders.find(o => o.id === orderId);
  if (!order) return;
  order.label = status;
  order.status = mapStatus(status);
  const row = document.querySelector(`[data-order-id="${orderId}"]`);
  if (row) {
    const badge = row.querySelector('.order-status-badge');
    if (badge) {
      badge.className = 'badge ' + order.status + ' order-status-badge';
      badge.textContent = order.label;
    }
  }
  if (selectEl) {
    selectEl.value = status;
  }
}

function verifyPrescription(id) {
  window.PH_RX_STATUS = window.PH_RX_STATUS || {};
  window.PH_RX_STATUS[id] = 'Verified';
  const card = document.querySelector(`[data-rx-id="${id}"]`);
  if (!card) return;
  const badge = card.querySelector('.ph-rx-badge');
  const action = card.querySelector('.ph-rx-action');
  if (badge) {
    badge.className = 'badge b-live ph-rx-badge';
    badge.textContent = 'Verified';
  }
  if (action) {
    action.innerHTML = '<div class="badge b-live">✅ Verified — ready for dispensing</div>';
  }
}

function rejectPrescription(id) {
  window.PH_RX_STATUS = window.PH_RX_STATUS || {};
  window.PH_RX_STATUS[id] = 'Rejected';
  const card = document.querySelector(`[data-rx-id="${id}"]`);
  if (!card) return;
  const badge = card.querySelector('.ph-rx-badge');
  const action = card.querySelector('.ph-rx-action');
  if (badge) {
    badge.className = 'badge b-cancel ph-rx-badge';
    badge.textContent = 'Rejected';
  }
  if (action) {
    action.innerHTML = '<div class="badge b-cancel">✕ Rejected</div>';
  }
}

/* ─── DELIVERY STATUS HELPER ─── */
function showDelivery(orderId) {
  alert(`Tracking order ${orderId}.\n\nStatus: Out for delivery\nEstimated arrival: Today 5:00 PM`);
}

function mapStatus(val) {
  const m = { Packing:'b-wait', Dispatched:'b-ship', Delivered:'b-done', Cancelled:'b-cancel' };
  return m[val] || 'b-pend';
}

/* ─── PASSWORD TOGGLE ─── */
function togglePw() {
  const inp = document.getElementById('inp-pass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

/* ─── KEYBOARD SHORTCUTS ─── */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const loginPage = document.getElementById('page-login');
    if (loginPage.classList.contains('active')) doLogin();
  }
});

/* ─── INIT ─── */
selectRole('patient');
