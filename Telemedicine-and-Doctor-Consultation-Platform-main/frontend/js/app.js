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
      // For patient, set their own ID or get from response
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
    const ptRes = await fetch('http://localhost:5000/api/patients', { headers });
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
    const drRes = await fetch('http://localhost:5000/api/doctors', { headers });
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
    
    // Get messages from memory store
    const messages = window.MESSAGE_STORE[consultationId] || [];
    
    if (messages.length === 0) {
      chatElement.innerHTML = '<div style="color:var(--t3);font-size:12px;padding:20px;text-align:center;">No messages yet. Start the conversation!</div>';
    } else {
      const messagesHTML = messages.map(msg => {
        const time = new Date(msg.sentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const isMine = msg.senderRole === currentRole;
        const senderLabel = msg.senderRole === 'doctor' ? '👨‍⚕️' : '🧑';
        const displayName = isMine ? 'You' : msg.senderName;
        
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

/* ─── TAB SWITCHING ─── */
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
    // Create message object
    const message = {
      id: Date.now(),
      consultationId: currentConsultationId,
      senderId: currentUser.id || currentPatientId,
      senderRole: 'patient',
      senderName: currentUser.name || 'Patient',
      messageText: text,
      sentAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    // Store in memory
    if (!window.MESSAGE_STORE[currentConsultationId]) {
      window.MESSAGE_STORE[currentConsultationId] = [];
    }
    window.MESSAGE_STORE[currentConsultationId].push(message);
    
    // Update UI
    const chat = document.getElementById('tele-chat');
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const senderLabel = message.senderRole === 'doctor' ? '👨‍⚕️' : '🧑';
    const messageHTML = `<div class="msg me">
      <div style="font-size:10px;color:var(--t2);margin-bottom:3px;">${senderLabel} You</div>
      <div class="msg-bubble">${text}</div>
      <div class="msg-time">${time}</div>
    </div>`;
    
    chat.innerHTML += messageHTML;
    input.value = '';
    chat.scrollTop = chat.scrollHeight;
    console.log('Message stored in memory:', message);
  } catch (err) {
    console.error('Error:', err);
    alert('Error: ' + err.message);
  }
}

async function sendDrMsg() {
  const input = document.getElementById('dr-msg');
  const text = input.value.trim();
  if (!text) return;
  
  try {
    // Create message object
    const message = {
      id: Date.now(),
      consultationId: currentConsultationId,
      senderId: currentUser.id || currentDoctorId,
      senderRole: 'doctor',
      senderName: currentUser.name || 'Doctor',
      messageText: text,
      sentAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    // Store in memory
    if (!window.MESSAGE_STORE[currentConsultationId]) {
      window.MESSAGE_STORE[currentConsultationId] = [];
    }
    window.MESSAGE_STORE[currentConsultationId].push(message);
    
    // Update UI
    const chat = document.getElementById('dr-chat');
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const senderLabel = message.senderRole === 'doctor' ? '👨‍⚕️' : '🧑';
    const messageHTML = `<div class="msg me">
      <div style="font-size:10px;color:var(--t2);margin-bottom:3px;">${senderLabel} You</div>
      <div class="msg-bubble">${text}</div>
      <div class="msg-time">${time}</div>
    </div>`;
    
    chat.innerHTML += messageHTML;
    input.value = '';
    chat.scrollTop = chat.scrollHeight;
    console.log('Message stored in memory:', message);
  } catch (err) {
    console.error('Error:', err);
    alert('Error: ' + err.message);
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
    
    alert(`✅ Order placed successfully!\nOrder ID: ${result.id}\nTotal: ₹${totalAmount}`);
    
    // Clear the cart
    DATA.cart = [];
    updateCartBadge();
    renderCart();
    
    // Reload orders and show orders view
    await loadBackendData();
    showView('pt-orders', null);
    
    console.log('Order created:', result);
  } catch (err) {
    console.error('Checkout error:', err);
    alert(`❌ Error placing order: ${err.message}`);
  }
}

/* ─── DOCTOR SELECTION ─── */
function selectDoctor(id, name, spec) {
  const el = document.getElementById('book-doctor-name');
  if (el) el.textContent = `${name} — ${spec}`;
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
