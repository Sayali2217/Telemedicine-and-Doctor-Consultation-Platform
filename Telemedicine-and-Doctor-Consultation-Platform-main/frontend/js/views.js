/* ════════════════════════════════════════
   MEDICONNECT — VIEW RENDERERS
   ════════════════════════════════════════ */

/* ─── SHARED HELPERS ─── */
const svgIcon = {
  user:   `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke-linecap="round"/></svg>`,
  video:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1" y="3" width="11" height="8" rx="1.5"/><path d="M12 6l3-2v6l-3-2V6z"/></svg>`,
  rx:     `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="1" width="10" height="14" rx="1.5"/><path d="M5.5 5h5M5.5 8h5M5.5 11h3" stroke-linecap="round"/></svg>`,
  cart:   `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1.5 1.5h2l1.5 8h8l2-5.5H4.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="13" r="1" fill="currentColor" stroke="none"/></svg>`,
  cal:    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v4M11 1v4M2 7h12"/></svg>`,
  chart:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1.5 14.5l3.5-5 3 2.5 3.5-6 3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

function statCard(label, value, delta, deltaClass, iconSvg, iconClass) {
  return `<div class="stat-card">
    <div class="stat-top">
      <div class="stat-lbl">${label}</div>
      <div class="stat-icon ${iconClass}">${iconSvg}</div>
    </div>
    <div class="stat-val">${value}</div>
    <div class="stat-delta ${deltaClass}">${delta}</div>
  </div>`;
}

function barChart(data, labels) {
  const max = Math.max(...data);
  const bars = data.map((v, i) => `<div class="bar ${i === data.indexOf(max) ? 'hl' : ''}" style="height:${Math.round((v/max)*100)}%" title="${v}"></div>`).join('');
  const lbls = labels.map(l => `<span>${l}</span>`).join('');
  return `<div class="bar-chart">${bars}</div><div class="bar-labels">${lbls}</div>`;
}

function activityFeed(items) {
  return items.map(a => `
    <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
      <div class="activity-dot ${a.dot}" style="margin-top:5px;"></div>
      <div><div style="font-size:12px;color:var(--t1);">${a.text}</div>
      <div style="font-size:11px;color:var(--t3);margin-top:2px;">${a.time}</div></div>
    </div>`).join('');
}

function consultList(items) {
  return items.map(c => `
    <div class="list-item">
      <div class="avatar ${c.av}">${c.init}</div>
      <div class="item-info">
        <div class="item-main">${c.name}</div>
        <div class="item-sub">${c.doc} · ${c.spec}</div>
      </div>
      <span class="badge ${c.badge}">${c.label}</span>
      <div class="item-time">${c.time}</div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════
   PATIENT VIEWS
══════════════════════════════════════════════ */
const PT = {
  'pt-home': () => `
    <div class="stats-grid">
      ${statCard('Upcoming Appointments','3','Next: Tomorrow 10:00','up',svgIcon.cal,'si-b')}
      ${statCard('Active Prescriptions','5','2 need renewal','up',svgIcon.rx,'si-t')}
      ${statCard('Medicine Orders','2','1 out for delivery','up',svgIcon.cart,'si-a')}
      ${statCard('Health Score','82 / 100','↑ 4 pts this week','up',svgIcon.chart,'si-g')}
    </div>
    <div class="g-3-1">
      <div class="card">
        <div class="tab-row">
          <div class="tab active" onclick="switchTab(this,'pt-upcoming')">Upcoming</div>
          <div class="tab" onclick="switchTab(this,'pt-past')">Past Visits</div>
        </div>
        <div class="card-body" id="pt-appt-tab">
          ${consultList(DATA.consultations.upcoming.map(c => ({...c, av:'av-blue', init:'PR', name:'Dr. '+c.doc.replace('Dr. ',''), doc:'With '+c.doc})))}
          <div style="margin-top:12px;">
            <button class="btn-sm" onclick="showView('pt-book',document.querySelector('#sb-patient .nav-link:nth-child(4)'))">+ Book New Appointment</button>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card">
          <div class="card-header"><div class="card-title">Health Vitals</div><div class="card-action">Update</div></div>
          <div class="card-body">
            ${[['Blood Pressure','118/76 mmHg',72],['Heart Rate','78 bpm',78],['SpO2','98%',98],['BMI','22.4',74]].map(([l,v,p]) => `
              <div style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                  <span style="color:var(--t2)">${l}</span><strong>${v}</strong>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${p}%"></div></div>
              </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Active Rx</div><div class="card-action">View all</div></div>
          <div class="card-body">
            ${[['Amoxicillin 500mg','3× daily · Day 3 of 7'],['Vitamin D3 60K','Weekly · 4 weeks left']].map(([n,d]) => `
              <div style="display:flex;gap:10px;margin-bottom:10px;">
                <div style="width:34px;height:34px;background:var(--blue-l);border-radius:var(--r-sm);display:flex;align-items:center;justify-content:center;font-size:16px;">💊</div>
                <div><div style="font-size:12.5px;font-weight:500;">${n}</div><div style="font-size:11px;color:var(--t2);">${d}</div></div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
    <div class="g-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Recent Orders</div><div class="card-action" onclick="showView('pt-orders',null)">View all</div></div>
        <div class="card-body">
          ${DATA.orders.slice(0,3).map(o => `
            <div class="list-item">
              <div style="font-size:18px">📦</div>
              <div class="item-info"><div class="item-main">${o.items}</div><div class="item-sub">${o.id} · ${o.date}</div></div>
              <span class="badge ${o.status}">${o.label}</span>
              <div style="font-size:12px;font-weight:600;color:var(--t1)">${o.amt}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Activity</div></div>
        <div class="card-body">${activityFeed(DATA.activity.slice(0,4))}</div>
      </div>
    </div>`,

  'pt-book': () => `
    <div class="section-title">Book Appointment</div>
    <div class="section-sub">Choose a doctor and a timeslot</div>
    <div style="display:grid;grid-template-columns:1fr 360px;gap:16px;">
      <div>
        <div class="card" style="margin-bottom:14px;">
          <div class="card-header"><div class="card-title">Available Doctors</div></div>
          <div class="card-body">
            <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
              ${['All','General','Cardiology','Derma','Ortho','Paediatrics'].map((s,i) => `<span class="chip" style="${i===0?'background:var(--blue);color:#fff;':''}" onclick="this.parentNode.querySelectorAll('.chip').forEach(c=>c.style='');this.style='background:var(--blue);color:#fff;'">${s}</span>`).join('')}
            </div>
            ${DATA.doctors.map(d => `
              <div class="list-item" style="cursor:pointer;" onclick="selectDoctor('${d.id}','${d.name}','${d.spec}')">
                <div class="avatar ${d.av}">${d.init}</div>
                <div class="item-info">
                  <div class="item-main">${d.name}</div>
                  <div class="item-sub">${d.spec} · ⭐ ${d.rating} · ${d.patients} patients</div>
                </div>
                <span class="badge ${d.status}">${d.statusLabel}</span>
                <button class="btn-sm" style="font-size:11px;padding:5px 10px;">Book</button>
              </div>`).join('')}
          </div>
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-header"><div class="card-title" id="book-doctor-name">Select a Doctor</div></div>
          <div class="card-body">
            <div style="font-size:12px;color:var(--t2);margin-bottom:12px;">Pick a date & time slot</div>
            <div class="form-field"><label>Date</label><input type="date" class="rx-input" value="2026-04-15"/></div>
            <div class="form-field"><label>Consultation Type</label>
              <select class="rx-input"><option>Video Consultation</option><option>In-Person</option><option>Chat Consultation</option></select>
            </div>
            <div style="font-size:11px;font-weight:600;color:var(--t2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">Available Slots</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px;">
              ${['09:00','09:30','10:00','10:30','11:00','12:00','14:00','15:30','16:00'].map((t,i) => `
                <div onclick="this.closest('.card-body').querySelectorAll('[data-slot]').forEach(x=>x.style='background:var(--bg2);color:var(--t2);');this.style='background:var(--blue);color:#fff;'"
                  data-slot="${t}" style="background:var(--bg2);color:var(--t2);border-radius:var(--r-sm);padding:8px;text-align:center;font-size:12px;cursor:pointer;transition:all .15s;">${t}</div>`).join('')}
            </div>
            <div class="form-field"><label>Reason for visit</label><input class="rx-input" placeholder="Briefly describe your symptoms…"/></div>
            <button class="btn-sm" style="width:100%;" onclick="alert('✅ Appointment booked! You will receive a confirmation SMS.')">Confirm Booking</button>
          </div>
        </div>
      </div>
    </div>`,

  'pt-tele': () => {
    const consultation = DATA.consultations.live[0] || {};
    const docName = consultation.doc || 'Dr. Suresh Mehta';
    const patientName = 'You';
    return `
    <div class="consult-room">
      <div class="video-area">
        <div class="video-main-placeholder">👨‍⚕️</div>
        <div class="video-main-name">${docName} · ${consultation.spec || 'General Physician'}</div>
        <div style="position:absolute;top:14px;left:14px;background:rgba(0,0,0,.5);color:rgba(255,255,255,.8);border-radius:var(--r-sm);padding:4px 10px;font-size:11px;">🔴 LIVE • 08:24</div>
        <div class="video-self">
          <div class="video-self-placeholder">🧑</div>
          <div style="font-size:10px;color:rgba(255,255,255,.5);">${patientName}</div>
        </div>
        <div class="video-controls">
          <button class="vc-btn vc-mute" title="Mute" onclick="toggleControl(this,'🎤','🔇')">🎤</button>
          <button class="vc-btn vc-video" title="Camera" onclick="toggleControl(this,'📹','📵')">📹</button>
          <button class="vc-btn vc-chat" title="Chat">💬</button>
          <button class="vc-btn vc-end" title="End Call" onclick="if(confirm('End consultation?'))showView('pt-home',document.querySelector('#sb-patient .nav-link:nth-child(2)'))">📞</button>
        </div>
      </div>
      <div class="consult-panel">
        <div class="card" style="flex-shrink:0;">
          <div class="card-header"><div class="card-title">Consultation Info</div></div>
          <div class="card-body">
            <div style="margin-bottom:8px;">
              <label style="font-size:11px;color:var(--t2);font-weight:600;">SELECT CONSULTATION</label>
              <select id="pt-consult-selector" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px;font-size:12px;margin-top:4px;" onchange="currentConsultationId=this.value; renderMessagesInChat(currentConsultationId, 'tele-chat');">
                ${window.USER_CONSULTATIONS.map(c => `<option value="${c.id}">${c.id} - ${DATA.patients.find(p => p.id === c.patientId)?.name || c.patientId}</option>`).join('')}
              </select>
            </div>
            <div style="display:flex;gap:10px;align-items:center;margin-top:12px;margin-bottom:10px;">
              <div class="avatar av-blue" style="width:40px;height:40px;font-size:13px;">${consultation.init || 'PR'}</div>
              <div><div style="font-size:13px;font-weight:600;">${docName}</div><div style="font-size:11px;color:var(--t2);">${consultation.spec || 'General Physician'}</div></div>
            </div>
            ${(DATA.patients[0] ? [['Chief Complaint','Fever + Sore throat for 2 days'],['Allergies',DATA.patients[0].allergies || 'None'],['Blood Group',DATA.patients[0].bloodGroup || 'B+'],['Last Visit','08 Apr 2026']] : []).map(([k,v]) => `
              <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border);">
                <span style="color:var(--t2)">${k}</span><strong>${v}</strong>
              </div>`).join('')}
          </div>
        </div>
        <div class="chat-box">
          <div style="padding:9px 12px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;">Chat</div>
          <div class="chat-msgs" id="tele-chat">
            <div style="color:var(--t3);font-size:12px;padding:20px;text-align:center;">Loading messages...</div>
          </div>
          <div class="chat-input">
            <input id="tele-msg" placeholder="Type a message…" onkeydown="if(event.key==='Enter')sendTeleMsg()"/>
            <button onclick="sendTeleMsg()">Send</button>
          </div>
        </div>
      </div>
    </div>`
  },

  'pt-rx': () => `
    <div class="section-title">My Prescriptions</div>
    <div class="card">
      <div class="tab-row">
        <div class="tab active">Active</div>
        <div class="tab">Past</div>
      </div>
      <div class="card-body">
        <table class="data-table">
          <thead><tr><th>Medicine</th><th>Prescribed By</th><th>Dosage</th><th>Duration</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${[
              ['Amoxicillin 500mg','Dr. S. Mehta','3× daily','7 days','b-live','Active'],
              ['Vitamin D3 60K','Dr. K. Verma','Weekly','4 weeks','b-live','Active'],
              ['Cetirizine 10mg','Dr. R. Iyer','1× daily (night)','14 days','b-wait','Renewal Due'],
              ['Paracetamol 650mg','Dr. S. Mehta','As needed','PRN','b-done','Completed'],
            ].map(([med,doc,dose,dur,bs,bl]) => `
              <tr>
                <td><div style="font-weight:500">💊 ${med}</div></td>
                <td style="color:var(--t2)">${doc}</td>
                <td>${dose}</td>
                <td>${dur}</td>
                <td><span class="badge ${bs}">${bl}</span></td>
                <td><button class="btn-sm" style="font-size:11px;padding:5px 10px;" onclick="showView('pt-shop',null)">Order</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`,

  'pt-records': () => `
    <div class="section-title">Health Records</div>
    <div class="g-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Medical History</div></div>
        <div class="card-body">
          ${[['Upper Respiratory Infection','Apr 2026','Dr. S. Mehta'],['Skin Allergy','Feb 2026','Dr. R. Iyer'],['Vitamin D Deficiency','Jan 2026','Dr. K. Verma'],['Sprained Ankle','Nov 2025','Dr. P. Singh']].map(([c,d,doc]) => `
            <div class="list-item">
              <div style="width:32px;height:32px;background:var(--blue-l);border-radius:var(--r-sm);display:flex;align-items:center;justify-content:center;font-size:14px;">🏥</div>
              <div class="item-info"><div class="item-main">${c}</div><div class="item-sub">${doc}</div></div>
              <div class="item-time">${d}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Lab Reports</div><div class="card-action">Upload</div></div>
        <div class="card-body">
          ${[['CBC - Complete Blood Count','Mar 2026','Normal'],['Lipid Profile','Feb 2026','Borderline'],['Blood Sugar Fasting','Jan 2026','Normal'],['Vitamin D Level','Jan 2026','Low']].map(([n,d,r]) => `
            <div class="list-item">
              <div style="font-size:20px">🧪</div>
              <div class="item-info"><div class="item-main">${n}</div><div class="item-sub">${d}</div></div>
              <span class="badge ${r==='Normal'?'b-live':r==='Low'?'b-wait':'b-pend'}">${r}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>`,

  'pt-shop': () => `
    <div class="section-title">Medicine Shop</div>
    <div style="display:flex;gap:8px;margin-bottom:14px;align-items:center;flex-wrap:wrap;">
      <div class="search-box" style="width:220px;"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="6" cy="6" r="4"/><path d="M10 10l3 3" stroke-linecap="round"/></svg><input placeholder="Search medicines…"/></div>
      ${['All','Tablets','Syrups','Vitamins','OTC'].map((c,i) => `<span class=\"chip\" style=\"${i===0?'background:var(--blue);color:#fff;':''}\">Chip ${c}</span>`).join('')}
      <div style="margin-left:auto;cursor:pointer;" onclick="showView('pt-cart',null)">
        <span class="badge b-blue" style="background:var(--blue);color:#fff;font-size:12px;padding:5px 12px;" data-cart-count="0">🛒 Cart (<span data-cart-count>0</span>)</span>
      </div>
    </div>
    <div class="med-grid">
      ${DATA.medicines.map(m => `
        <div class="med-card">
          <div class="med-icon">${m.icon}</div>
          <div class="med-name">${m.name}</div>
          <div class="med-brand">${m.brand}</div>
          <div class="med-price">${m.price}</div>
          <span class="med-stock ${m.stock}">${m.stockLabel}</span>
          <button class="btn-cart" onclick="addToCart('${m.id}','${m.name}','${m.price}')">Add to Cart</button>
        </div>`).join('')}
    </div>`,

  'pt-cart': () => {
    const total = getCartTotal();
    return `
    <div class="section-title">🛒 Shopping Cart</div>
    <div class="card" style="margin-bottom:14px;">
      <div class="card-header">
        <div class="card-title">Cart Items</div>
        <div class="card-action" onclick="showView('pt-shop',null)">← Continue Shopping</div>
      </div>
      <div class="card-body">
        <div id="cart-items" style="max-height:400px;overflow-y:auto;"></div>
        ${DATA.cart.length === 0 ? `<div style="color:var(--t3);font-size:12px;padding:20px;text-align:center;">Your cart is empty</div>` : `
          <div style="border-top:2px solid var(--b2);margin-top:12px;padding-top:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:600;color:var(--t1);margin-bottom:12px;">
              <span>Total: ₹${total}</span>
              <div style="display:flex;gap:8px;">
                <button class="btn" onclick="DATA.cart=[];updateCartBadge();renderCart();" style="padding:6px 12px;background:#f5f5f5;color:#d32f2f;border:none;cursor:pointer;border-radius:4px;font-size:12px;">Clear Cart</button>
                <button class="btn" onclick="checkoutCart()" style="padding:6px 16px;background:var(--blue);color:#fff;border:none;cursor:pointer;border-radius:4px;font-size:12px;font-weight:600;">✓ Checkout</button>
              </div>
            </div>
          </div>
        `}
      </div>
    </div>
    ${DATA.cart.length > 0 ? `
    <div class="card" style="background:#f0f7ff;border-left:4px solid var(--blue);">
      <div class="card-body" style="padding:12px;">
        <div style="font-size:12px;color:var(--t1);margin-bottom:6px;"><strong>📋 Order Summary</strong></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;color:var(--t2);">
          <div>Items: ${DATA.cart.reduce((s,i) => s + i.qty, 0)}</div>
          <div>Total Amount: ₹${total}</div>
          <div>Shipping: Free</div>
          <div>Est. Delivery: 2-3 days</div>
        </div>
      </div>
    </div>
    ` : ''}
    `;
  },

  'pt-orders': () => `
    <div class="section-title">My Orders</div>
    <div class="card">
      <div class="tab-row">
        <div class="tab active">All</div>
        <div class="tab">Active</div>
        <div class="tab">Delivered</div>
      </div>
      <div class="card-body">
        <table class="data-table">
          <thead><tr><th>Order ID</th><th>Items</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${DATA.orders.map(o => `
              <tr>
                <td style="font-weight:600;color:var(--blue)">${o.id}</td>
                <td>${o.items}</td>
                <td style="color:var(--t2)">${o.date}</td>
                <td style="font-weight:600">${o.amt}</td>
                <td><span class="badge ${o.status}">${o.label}</span></td>
                <td><button class="btn-sm" style="font-size:11px;padding:5px 10px;" onclick="showDelivery('${o.id}')">Track</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`,
};

/* ══════════════════════════════════════════════
   DOCTOR VIEWS
══════════════════════════════════════════════ */
const DR = {
  'dr-home': () => `
    <div class="stats-grid">
      ${statCard('Patients Today','12','3 live, 4 waiting','up',svgIcon.user,'si-t')}
      ${statCard('Teleconsults','8','↑ 2 from yesterday','up',svgIcon.video,'si-b')}
      ${statCard('Rx Written Today','9','23 this week','up',svgIcon.rx,'si-a')}
      ${statCard('Rating','4.9 ⭐','Based on 142 reviews','up',svgIcon.chart,'si-g')}
    </div>
    <div class="g-3-1">
      <div class="card">
        <div class="card-header"><div class="card-title">Today's Queue</div><div class="card-action" onclick="showView('dr-consult',null)">Go to Consult Room</div></div>
        <div class="tab-row">
          <div class="tab active" onclick="switchTab(this,'dr-live')">Live</div>
          <div class="tab" onclick="switchTab(this,'dr-upcoming')">Scheduled</div>
          <div class="tab" onclick="switchTab(this,'dr-completed')">Completed</div>
        </div>
        <div class="card-body" id="dr-queue-tab">${consultList(DATA.consultations.live)}</div>
      </div>
      <div class="col">
        <div class="card">
          <div class="card-header"><div class="card-title">This Week</div></div>
          <div class="card-body">
            ${barChart([8,12,10,15,14,6,3],['M','T','W','T','F','S','S'])}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">
              ${[['Consultations','58'],['Avg Duration','14 min'],['Prescriptions','47'],['Satisfaction','4.9/5']].map(([l,v]) => `
                <div style="background:var(--bg);border-radius:var(--r-md);padding:10px 12px;">
                  <div style="font-size:10px;color:var(--t2)">${l}</div>
                  <div style="font-size:18px;font-weight:700;color:var(--t1);margin-top:3px;">${v}</div>
                </div>`).join('')}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Activity</div></div>
          <div class="card-body">${activityFeed(DATA.activity.slice(0,4))}</div>
        </div>
      </div>
    </div>`,

  'dr-schedule': () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[currentCalendarMonth - 1];
    
    // Get first day of month and number of days
    const firstDay = new Date(currentCalendarYear, currentCalendarMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentCalendarYear, currentCalendarMonth, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentCalendarMonth - 1 && today.getFullYear() === currentCalendarYear;
    
    // Generate calendar grid
    const calendarDays = [];
    
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }
    
    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      calendarDays.push(d);
    }
    
    const calendarHTML = calendarDays.map((d) => {
      if (!d) return '<div style="padding:8px 0;"></div>';
      const isTodayDate = isCurrentMonth && d === today.getDate();
      // Check if date has scheduled slots
      const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const hasSchedule = window.SCHEDULED_DATES && window.SCHEDULED_DATES.includes(dateStr);
      return `<div style="padding:8px 0;border-radius:var(--r-sm);cursor:pointer;font-size:12.5px;position:relative;
        background:${isTodayDate?'var(--blue)':hasSchedule?'var(--blue-l)':'transparent'};
        color:${isTodayDate?'#fff':hasSchedule?'var(--blue)':'var(--t1)'};
        font-weight:${isTodayDate||hasSchedule?'600':'400'};" onclick="loadDateSlots('${dateStr}')" title="${hasSchedule?'Has appointments':' No appointments'}">${d}${hasSchedule&&!isTodayDate?'<span style="position:absolute;bottom:2px;right:4px;width:4px;height:4px;background:var(--blue);border-radius:50%;"></span>':''}</div>`;
    }).join('');
    
    const todayDateStr = isCurrentMonth ? `${currentCalendarYear}-${String(currentCalendarMonth).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}` : `${currentCalendarYear}-${String(currentCalendarMonth).padStart(2,'0')}-01`;
    
    return `
      <div class="section-title">My Schedule</div>
      <div style="display:grid;grid-template-columns:1fr 300px;gap:14px;">
        <div class="card">
          <div class="card-header">
            <div class="card-title">${monthName} ${currentCalendarYear}</div>
            <div style="display:flex;gap:6px;">
              <button class="btn-sm" style="background:var(--bg);color:var(--t2);border:1px solid var(--border);" onclick="navigateCalendar('prev')">◀</button>
              <button class="btn-sm" style="background:var(--bg);color:var(--t2);border:1px solid var(--border);" onclick="navigateCalendar('next')">▶</button>
            </div>
          </div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center;margin-bottom:8px;">
              ${['S','M','T','W','T','F','S'].map(d=>`<div style="font-size:11px;font-weight:600;color:var(--t3);padding:6px 0">${d}</div>`).join('')}
            </div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center;">
              ${calendarHTML}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title" id="schedule-date-header">${todayDateStr.split('-')[2]} — Slots</div></div>
          <div class="card-body" id="schedule-slots-container">
            <div style="color:var(--t3);font-size:12px;padding:10px;text-align:center;">Loading schedules...</div>
          </div>
        </div>
      </div>
    `;
  },

  'dr-consult': () => {
    const consultation = DATA.consultations.live[0] || {};
    const patientInit = consultation.init || 'PR';
    const patientName = consultation.name || 'Patient Name';
    const patientAge = consultation.age || '32';
    return `
    <div class="consult-room">
      <div class="video-area">
        <div class="video-main-placeholder">🧑</div>
        <div class="video-main-name">${patientName} · Patient · ${patientAge} yrs</div>
        <div style="position:absolute;top:14px;left:14px;background:rgba(0,0,0,.5);color:rgba(255,255,255,.8);border-radius:var(--r-sm);padding:4px 10px;font-size:11px;">🔴 LIVE • 08:24</div>
        <div class="video-self">
          <div class="video-self-placeholder">👨‍⚕️</div>
          <div style="font-size:10px;color:rgba(255,255,255,.5);">${currentUser.name?.split(' ')[1] || 'Dr. Mehta'}</div>
        </div>
        <div class="video-controls">
          <button class="vc-btn vc-mute" onclick="toggleControl(this,'🎤','🔇')">🎤</button>
          <button class="vc-btn vc-video" onclick="toggleControl(this,'📹','📵')">📹</button>
          <button class="vc-btn vc-chat">💬</button>
          <button class="vc-btn" style="background:rgba(255,255,255,.15);" onclick="showView('dr-rx',null)">📋</button>
          <button class="vc-btn vc-end" onclick="if(confirm('End consultation?'))showView('dr-home',document.querySelector('#sb-doctor .nav-link:nth-child(2)'))">📞</button>
        </div>
      </div>
      <div class="consult-panel">
        <div class="card" style="flex-shrink:0;">
          <div class="card-header"><div class="card-title">Consultation Queue</div></div>
          <div class="card-body">
            <div style="margin-bottom:8px;">
              <label style="font-size:11px;color:var(--t2);font-weight:600;">SELECT CONSULTATION</label>
              <select id="dr-consult-selector" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px;font-size:12px;margin-top:4px;" onchange="currentConsultationId=this.value; renderMessagesInChat(currentConsultationId, 'dr-chat');">
                ${window.USER_CONSULTATIONS.map(c => {
                  const patient = DATA.patients.find(p => p.id === c.patientId);
                  return `<option value="${c.id}">${c.id} - ${patient?.name || 'Unknown'}</option>`;
                }).join('')}
              </select>
            </div>
            <div style="display:flex;gap:10px;align-items:center;margin-top:12px;margin-bottom:10px;">
              <div class="avatar ${consultation.av || 'av-blue'}" style="width:40px;height:40px;font-size:13px;">${patientInit}</div>
              <div><div style="font-size:13px;font-weight:600;">${patientName}</div><div style="font-size:11px;color:var(--t2);">${patientAge} yrs · ${consultation.gender || 'Not specified'}</div></div>
            </div>
            ${(DATA.patients.length > 0 ? [['Chief Complaint',DATA.patients[0].cond || 'Routine checkup'],['Temperature','98.6°F'],['Blood Pressure','120/80 mmHg'],['Allergies',DATA.patients[0].allergies || 'None']] : []).map(([k,v]) => `
              <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);">
                <span style="color:var(--t2)">${k}</span><strong>${v}</strong>
              </div>`).join('')}
            <button class="btn-sm" style="width:100%;margin-top:12px;" onclick="showView('dr-rx',null)">+ Write Prescription</button>
          </div>
        </div>
        <div class="chat-box">
          <div style="padding:9px 12px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;">Consultation Notes</div>
          <div class="chat-msgs" id="dr-chat">
            <div style="color:var(--t3);font-size:12px;padding:20px;text-align:center;">Loading messages...</div>
          </div>
          <div class="chat-input">
            <input id="dr-msg" placeholder="Type a note or message…" onkeydown="if(event.key==='Enter')sendDrMsg()"/>
            <button onclick="sendDrMsg()">Send</button>
          </div>
        </div>
      </div>
    </div>`
  },

  'dr-patients': () => `
    <div class="section-title">My Patients</div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Patient List</div>
        <div class="search-box" style="width:180px;"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="6" cy="6" r="4"/><path d="M10 10l3 3" stroke-linecap="round"/></svg><input placeholder="Search…"/></div>
      </div>
      <div class="card-body" style="padding:0;">
        <table class="data-table">
          <thead><tr><th>Patient</th><th>Age</th><th>City</th><th>Condition</th><th>Last Visit</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${DATA.patients.map(p => `
              <tr>
                <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar ${p.av} sm">${p.init}</div><strong>${p.name}</strong></div></td>
                <td>${p.age}</td><td>${p.city}</td><td>${p.cond}</td><td style="color:var(--t2)">${p.last}</td>
                <td><span class="badge ${p.status}">${p.statusLabel}</span></td>
                <td><button class="btn-sm" style="font-size:11px;padding:5px 10px;" onclick="showPatientDetailsModal('${p.id}', '${p.name}')">View</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`,

  'dr-rx': () => {
    const selectedPatient = DATA.patients.find(p => p.id === currentPatientId) || DATA.patients[0] || {};
    return `
    <div class="section-title">Write Prescription</div>
    <div style="display:grid;grid-template-columns:1fr 280px;gap:14px;">
      <div class="card">
        <div class="card-header"><div class="card-title">Prescription</div></div>
        <div class="card-body">
          <div style="margin-bottom:14px;">
            <label style="font-size:11px;color:var(--t2);font-weight:600;text-transform:uppercase;">Select Patient</label>
            <select id="rx-patient-select" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px;font-size:12px;margin-top:4px;">
              ${DATA.patients.map(p => `<option value="${p.id}" ${p.id === currentPatientId ? 'selected' : ''}>${p.name} (${p.id})</option>`).join('')}
            </select>
          </div>
          
          <div style="margin-bottom:14px;">
            <label style="font-size:11px;color:var(--t2);font-weight:600;text-transform:uppercase;">Select Consultation</label>
            <select id="rx-consult-select" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px;font-size:12px;margin-top:4px;">
              <option>Loading consultations...</option>
            </select>
          </div>
          
          <div style="display:flex;gap:10px;margin-bottom:14px;align-items:center;padding:10px;background:var(--bg);border-radius:4px;">
            <div class="avatar av-blue" style="width:40px;height:40px;font-size:13px;">${selectedPatient.init || 'P'}</div>
            <div><div style="font-weight:600;font-size:12px">${selectedPatient.name || 'Select a patient'}</div><div style="font-size:11px;color:var(--t2);">${selectedPatient.age || '—'} yrs · ${selectedPatient.city || '—'}</div></div>
          </div>
          
          <div style="font-size:12px;font-weight:600;color:var(--t2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Diagnosis</div>
          <input class="rx-input" style="width:100%;margin-bottom:14px;" placeholder="Enter diagnosis"/>
          
          <div style="font-size:12px;font-weight:600;color:var(--t2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Medicines</div>
          <div id="rx-rows">
            <div class="rx-row" style="margin-bottom:8px;display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;align-items:center;">
              <input class="rx-input" placeholder="Medicine name"/>
              <input class="rx-input" placeholder="Dosage"/>
              <input class="rx-input" placeholder="Duration"/>
              <button class="btn-del-row" onclick="this.closest('.rx-row').remove()">✕</button>
            </div>
          </div>
          <button class="btn-add-row" onclick="addRxRow()">+ Add Medicine</button>
          
          <div style="margin-top:14px;font-size:12px;font-weight:600;color:var(--t2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Notes to Patient</div>
          <textarea class="rx-input" style="width:100%;height:70px;resize:vertical;" placeholder="Additional notes for patient..."></textarea>
          
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="btn-sm" onclick="savePrescription('sent to patient')">Send to Patient</button>
            <button class="btn-sm" style="background:var(--teal);" onclick="savePrescription('sent to pharmacy')">Send to Pharmacy</button>
            <button class="btn-sm" style="background:var(--bg);color:var(--t2);border:1px solid var(--border);" onclick="printPrescription()">🖨️ Print</button>
            <button class="btn-sm" style="background:var(--bg);color:var(--t2);border:1px solid var(--border);" onclick="savePrescription('saved as draft')">💾 Save Draft</button>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card">
          <div class="card-header"><div class="card-title">Drug Interactions</div></div>
          <div class="card-body">
            <div class="badge b-live" style="margin-bottom:8px;font-size:11px;">✅ Checking...</div>
            <div style="font-size:11px;color:var(--t2);line-height:1.6;">Add medicines to check for interactions and allergies.</div>
            ${selectedPatient.allergies ? `<div class="badge b-cancel" style="margin-top:8px;font-size:11px;">⚠️ Allergy Alert: ${selectedPatient.allergies}</div>` : ''}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Past Prescriptions</div></div>
          <div class="card-body">
            ${DATA.patients.length > 0 ? [['Cetirizine 10mg','Feb 2026','Dr. R. Iyer'],['Vitamin D3','Jan 2026','Dr. K. Verma']].map(([m,d,doc]) => `
              <div class="list-item">
                <div style="font-size:18px">💊</div>
                <div class="item-info"><div class="item-main">${m}</div><div class="item-sub">${doc}</div></div>
                <div class="item-time">${d}</div>
              </div>`).join('') : '<div style="color:var(--t3);font-size:11px;">No past prescriptions</div>'}
          </div>
        </div>
      </div>
    </div>`;
  },

  'dr-ehr': () => `
    <div class="section-title">Electronic Health Record</div>
    <div class="g-2">
      <div class="col">
        <div class="card">
          <div class="card-header"><div class="card-title">Patient Profile</div></div>
          <div class="card-body">
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
              <div class="avatar av-blue" style="width:48px;height:48px;font-size:15px;">PR</div>
              <div><div style="font-size:15px;font-weight:600;">Priya Ramesh</div><div style="font-size:12px;color:var(--t2);">Patient ID: P001 · Joined Jan 2025</div></div>
            </div>
            ${[['DOB','12 Mar 1994 (32 yrs)'],['Gender','Female'],['Blood Group','B+'],['Phone','+91 98765 43210'],['City','Mumbai, Maharashtra'],['Height','162 cm'],['Weight','58 kg'],['BMI','22.1 (Normal)']].map(([k,v]) => `
              <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;">
                <span style="color:var(--t2)">${k}</span><strong>${v}</strong>
              </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Allergies & Conditions</div></div>
          <div class="card-body">
            <div style="margin-bottom:10px;"><div style="font-size:11px;font-weight:600;color:var(--red);margin-bottom:6px;">⚠️ ALLERGIES</div>
              ${['Penicillin','Dust Mites'].map(a=>`<span class="badge b-cancel" style="margin-right:4px;">${a}</span>`).join('')}
            </div>
            <div><div style="font-size:11px;font-weight:600;color:var(--t2);margin-bottom:6px;">CHRONIC CONDITIONS</div>
              <div style="font-size:12px;color:var(--t2);">No chronic conditions on record.</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card">
          <div class="card-header"><div class="card-title">Visit History</div></div>
          <div class="card-body">
            ${[['14 Apr 2026','Upper Resp. Infection','Dr. S. Mehta','Rx Issued'],['08 Apr 2026','Follow-up','Dr. S. Mehta','Completed'],['14 Feb 2026','Skin Allergy','Dr. R. Iyer','Rx Issued'],['10 Jan 2026','Vitamin D deficiency','Dr. K. Verma','Rx Issued']].map(([d,c,doc,s]) => `
              <div class="list-item">
                <div style="width:32px;height:32px;background:var(--blue-l);border-radius:var(--r-sm);display:flex;align-items:center;justify-content:center;font-size:13px;">🏥</div>
                <div class="item-info"><div class="item-main">${c}</div><div class="item-sub">${doc}</div></div>
                <div><div class="item-time">${d}</div><span class="badge b-rx" style="margin-top:2px;">${s}</span></div>
              </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Vitals Trend</div></div>
          <div class="card-body">
            ${barChart([78,80,76,79,78,77,78],['Jan','Feb','Mar','Apr','May','Jun','Jul'])}
            <div style="font-size:11px;color:var(--t3);margin-top:6px;">Heart Rate (bpm) — Last 7 months</div>
          </div>
        </div>
      </div>
    </div>`,
};

/* ══════════════════════════════════════════════
   ADMIN VIEWS
══════════════════════════════════════════════ */
const AD = {
  'ad-home': () => `
    <div class="stats-grid">
      ${statCard('Active Patients','1,248','↑ 12% this month','up',svgIcon.user,'si-b')}
      ${statCard('Consultations Today','34','↑ 8 from yesterday','up',svgIcon.video,'si-t')}
      ${statCard('Pending Orders','87','↓ 5 unfulfilled','dn',svgIcon.cart,'si-a')}
      ${statCard('Revenue (MTD)','₹4.2L','↑ 19% vs last month','up',svgIcon.chart,'si-g')}
    </div>
    <div class="g-3-1">
      <div class="card">
        <div class="tab-row">
          <div class="tab active" onclick="switchTab(this,'ad-live')">Live</div>
          <div class="tab" onclick="switchTab(this,'ad-upcoming')">Upcoming</div>
          <div class="tab" onclick="switchTab(this,'ad-completed')">Completed</div>
        </div>
        <div class="card-body" id="ad-consult-tab">${consultList(DATA.consultations.live)}</div>
      </div>
      <div class="col">
        <div class="card">
          <div class="card-header"><div class="card-title">Weekly Revenue</div></div>
          <div class="card-body">
            ${barChart([42000,68000,55000,82000,76000,34000,21000],['M','T','W','T','F','S','S'])}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Activity Feed</div></div>
          <div class="card-body">${activityFeed(DATA.activity)}</div>
        </div>
      </div>
    </div>
    <div class="g-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Recent Orders</div><div class="card-action" onclick="showView('ad-orders',null)">View all</div></div>
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>Order ID</th><th>Patient</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>${DATA.orders.slice(0,5).map(o=>`<tr><td style="font-weight:600;color:var(--blue)">${o.id}</td><td>${o.patient}</td><td style="font-weight:600">${o.amt}</td><td><span class="badge ${o.status}">${o.label}</span></td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Doctor Availability</div><div class="card-action" onclick="showView('ad-doctors',null)">Manage</div></div>
        <div class="card-body">
          ${DATA.doctors.map(d=>`
            <div class="list-item">
              <div class="avatar ${d.av}">${d.init}</div>
              <div class="item-info"><div class="item-main">${d.name}</div><div class="item-sub">${d.spec}</div></div>
              <span class="badge ${d.status}">${d.statusLabel}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>`,

  'ad-users': () => `
    <div class="section-title">Users Management</div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">All Patients (${DATA.patients.length})</div>
        <div style="display:flex;gap:8px;"><button class="btn-sm">+ Add Patient</button></div>
      </div>
      <div class="card-body" style="padding:0;">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Age</th><th>City</th><th>Condition</th><th>Last Visit</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${DATA.patients.map(p=>`
            <tr><td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar ${p.av} sm">${p.init}</div><strong>${p.name}</strong></div></td>
            <td>${p.age}</td><td>${p.city}</td><td>${p.cond}</td><td style="color:var(--t2)">${p.last}</td>
            <td><span class="badge ${p.status}">${p.statusLabel}</span></td>
            <td><button class="btn-sm" style="font-size:11px;padding:5px 10px;margin-right:4px;">Edit</button><button class="btn-sm" style="font-size:11px;padding:5px 10px;background:var(--red-l);color:var(--red);">Suspend</button></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`,

  'ad-doctors': () => `
    <div class="section-title">Doctor Management</div>
    <div class="card">
      <div class="card-header"><div class="card-title">All Doctors</div><button class="btn-sm">+ Onboard Doctor</button></div>
      <div class="card-body" style="padding:0;">
        <table class="data-table">
          <thead><tr><th>Doctor</th><th>Specialisation</th><th>Patients</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${DATA.doctors.map(d=>`
            <tr><td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar ${d.av} sm">${d.init}</div><strong>${d.name}</strong></div></td>
            <td>${d.spec}</td><td>${d.patients}</td><td>⭐ ${d.rating}</td>
            <td><span class="badge ${d.status}">${d.statusLabel}</span></td>
            <td><button class="btn-sm" style="font-size:11px;padding:5px 10px;margin-right:4px;">Edit</button><button class="btn-sm" style="font-size:11px;padding:5px 10px;background:var(--red-l);color:var(--red);">Suspend</button></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`,

  'ad-consults': () => `<div class="section-title">Consultations</div>
    <div class="card"><div class="tab-row"><div class="tab active" onclick="switchTab(this,'all-consults')">All</div><div class="tab" onclick="switchTab(this,'live-consults')">Live</div><div class="tab" onclick="switchTab(this,'sched-consults')">Scheduled</div></div>
    <div class="card-body"><table class="data-table"><thead><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Speciality</th><th>Time</th><th>Duration</th><th>Status</th></tr></thead>
    <tbody>${[...DATA.consultations.live,...DATA.consultations.upcoming,...DATA.consultations.completed].map(c=>`
      <tr><td style="font-weight:600;color:var(--blue)">${c.id}</td><td>${c.name}</td><td>${c.doc}</td><td>${c.spec}</td><td>${c.time}</td><td>${c.duration}</td><td><span class="badge ${c.badge}">${c.label}</span></td></tr>`).join('')}
    </tbody></table></div></div>`,

  'ad-orders': () => `<div class="section-title">Medicine Orders</div>
    <div class="card"><div class="card-header"><div class="card-title">All Orders (${DATA.orders.length})</div><button class="btn-sm" onclick="alert('Export CSV')">Export</button></div>
    <div class="card-body" style="padding:0;"><table class="data-table"><thead><tr><th>Order ID</th><th>Patient</th><th>Items</th><th>Amount</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${DATA.orders.map(o=>`<tr><td style="font-weight:600;color:var(--blue)">${o.id}</td><td>${o.patient}</td><td>${o.items}</td><td style="font-weight:600">${o.amt}</td><td style="color:var(--t2)">${o.date}</td><td><span class="badge ${o.status}">${o.label}</span></td>
    <td><button class="btn-sm" style="font-size:11px;padding:5px 10px;">View</button></td></tr>`).join('')}</tbody></table></div></div>`,

  'ad-inventory': () => `<div class="section-title">Inventory</div>
    <div class="card"><div class="card-header"><div class="card-title">Stock Overview</div><button class="btn-sm">+ Add Item</button></div>
    <div class="card-body" style="padding:0;"><table class="data-table"><thead><tr><th>Medicine</th><th>SKU</th><th>Qty</th><th>Min Stock</th><th>Price</th><th>Expiry</th><th>Status</th></tr></thead>
    <tbody>${DATA.inventory.map(i=>{const low=i.qty<i.min;return`<tr><td style="font-weight:500">💊 ${i.name}</td><td style="color:var(--t3)">${i.sku}</td>
    <td style="font-weight:${low?'700':'400'};color:${low?'var(--red)':'var(--t1)'};">${i.qty}</td><td>${i.min}</td><td>${i.price}</td><td>${i.expiry}</td>
    <td><span class="badge ${low?'b-cancel':'b-live'}">${low?'Low Stock':'In Stock'}</span></td></tr>`;}).join('')}</tbody></table></div></div>`,

  'ad-payments': () => `<div class="section-title">Payments</div>
    <div class="stats-grid" style="margin-bottom:14px;">
      ${statCard('Total Revenue','₹4.2L','MTD','-',svgIcon.chart,'si-g')}
      ${statCard('Consultation Fees','₹1.8L','58 consults','-',svgIcon.video,'si-b')}
      ${statCard('Pharmacy Revenue','₹2.1L','87 orders','-',svgIcon.cart,'si-a')}
      ${statCard('Refunds','₹18,400','7 orders','-',svgIcon.user,'si-p')}
    </div>
    <div class="card"><div class="card-body">${barChart([38000,62000,51000,78000,69000,32000,19000],['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])}</div></div>`,

  'ad-analytics': () => `<div class="section-title">Analytics</div>
    <div class="analytics-kpi">
      <div class="kpi-card"><div class="kpi-label">Total Consultations (Apr)</div><div class="kpi-val">248</div><div class="kpi-sub">↑ 18% vs March</div></div>
      <div class="kpi-card"><div class="kpi-label">Avg. Session Duration</div><div class="kpi-val">14.2 min</div><div class="kpi-sub">↑ 1.8 min improvement</div></div>
      <div class="kpi-card"><div class="kpi-label">Patient Satisfaction</div><div class="kpi-val">4.79 ⭐</div><div class="kpi-sub">Based on 186 reviews</div></div>
    </div>
    <div class="g-2" style="margin-top:14px;">
      <div class="card"><div class="card-header"><div class="card-title">Consultation Volume (Weekly)</div></div><div class="card-body">${barChart([42,58,50,74,66,30,18],['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])}</div></div>
      <div class="card"><div class="card-header"><div class="card-title">Revenue by Category</div></div><div class="card-body">
        ${[['Consultation Fees',43,'var(--blue)'],['Pharmacy',50,'var(--teal)'],['Lab Reports',7,'var(--amber)']].map(([l,p,c])=>`
          <div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span style="color:var(--t2)">${l}</span><strong>${p}%</strong></div>
          <div class="progress-bar"><div class="progress-fill" style="width:${p}%;background:${c}"></div></div></div>`).join('')}
      </div></div>
    </div>`,

  'ad-settings': () => `<div class="section-title">Platform Settings</div>
    <div class="g-2">
      <div class="card"><div class="card-header"><div class="card-title">General Settings</div></div><div class="card-body">
        ${[['Platform Name','MediConnect'],['Support Email','support@mediconnect.in'],['Currency','INR (₹)'],['Timezone','IST (UTC+5:30)'],['Max Consultation Duration','30 min']].map(([l,v])=>`
          <div class="form-field"><label>${l}</label><input class="rx-input" value="${v}"/></div>`).join('')}
        <button class="btn-sm">Save Changes</button>
      </div></div>
      <div class="card"><div class="card-header"><div class="card-title">Notification Settings</div></div><div class="card-body">
        ${[['Email Notifications','on'],['SMS Alerts','on'],['Push Notifications','off'],['Low Stock Alerts','on'],['Payment Alerts','on']].map(([l,s])=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">
            <span style="font-size:12.5px">${l}</span>
            <div style="width:36px;height:20px;border-radius:10px;background:${s==='on'?'var(--green)':'var(--bg2)'};cursor:pointer;position:relative;transition:background .2s;" onclick="this.style.background=this.style.background.includes('green')?'var(--bg2)':'var(--green)'">
              <div style="position:absolute;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s;left:${s==='on'?'18px':'2px'};"></div>
            </div>
          </div>`).join('')}
      </div></div>
    </div>`,
};

/* ══════════════════════════════════════════════
   PHARMACY VIEWS
══════════════════════════════════════════════ */
const PH = {
  'ph-home': () => `
    <div class="stats-grid">
      ${statCard('Orders Today','24','7 pending dispatch','up',svgIcon.cart,'si-a')}
      ${statCard('Rx Verifications','18','3 awaiting','dn',svgIcon.rx,'si-b')}
      ${statCard('Low Stock Items','2','Reorder needed','dn',svgIcon.user,'si-p')}
      ${statCard('Revenue Today','₹18,400','↑ 12% vs yesterday','up',svgIcon.chart,'si-g')}
    </div>
    <div class="g-3-1">
      <div class="card">
        <div class="card-header"><div class="card-title">Order Queue</div><div class="card-action" onclick="showView('ph-orders',null)">View all</div></div>
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>Order ID</th><th>Patient</th><th>Items</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>${DATA.orders.slice(0,5).map(o=>`<tr><td style="font-weight:600;color:var(--blue)">${o.id}</td><td>${o.patient}</td><td style="max-width:160px">${o.items}</td><td style="font-weight:600">${o.amt}</td>
            <td><span class="badge ${o.status}">${o.label}</span></td>
            <td><button class="btn-sm" style="font-size:11px;padding:5px 10px;" onclick="event.stopPropagation();alert('Order updated!')">Update</button></td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="col">
        <div class="card"><div class="card-header"><div class="card-title">Today's Revenue</div></div><div class="card-body">${barChart([2200,3100,2800,4200,3700,1800,600],['7am','9am','11am','1pm','3pm','5pm','7pm'])}</div></div>
        <div class="card"><div class="card-header"><div class="card-title">Activity</div></div><div class="card-body">${activityFeed(DATA.activity.slice(0,4))}</div></div>
      </div>
    </div>`,

  'ph-catalog': () => `<div class="section-title">Medicine Catalog</div>
    <div class="med-grid">${DATA.medicines.map(m=>`
      <div class="med-card">
        <div class="med-icon">${m.icon}</div>
        <div class="med-name">${m.name}</div><div class="med-brand">${m.brand}</div>
        <div class="med-price">${m.price}</div>
        <span class="med-stock ${m.stock}">${m.stockLabel}</span>
        <div style="display:flex;gap:6px;margin-top:10px;">
          <button class="btn-sm" style="flex:1;font-size:11px;">Edit</button>
          <button class="btn-sm" style="background:var(--red-l);color:var(--red);border:none;border-radius:var(--r-md);padding:6px;cursor:pointer;font-size:11px;">Delete</button>
        </div>
      </div>`).join('')}</div>`,

  'ph-orders': () => `<div class="section-title">Order Management</div>
    <div class="card"><div class="card-header"><div class="card-title">All Orders</div><button class="btn-sm" onclick="alert('Export CSV')">Export</button></div>
    <div class="card-body" style="padding:0;"><table class="data-table"><thead><tr><th>Order ID</th><th>Patient</th><th>Items</th><th>Amount</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${DATA.orders.map(o=>`<tr><td style="font-weight:600;color:var(--blue)">${o.id}</td><td>${o.patient}</td><td>${o.items}</td><td style="font-weight:600">${o.amt}</td><td style="color:var(--t2)">${o.date}</td>
    <td><span class="badge ${o.status}">${o.label}</span></td>
    <td><select class="rx-input" style="width:100px;padding:4px 8px;font-size:11px;" onchange="this.previousElementSibling.className='badge '+mapStatus(this.value)"><option>Packing</option><option>Dispatched</option><option>Delivered</option><option>Cancelled</option></select></td></tr>`).join('')}
    </tbody></table></div></div>`,

  'ph-delivery': () => `<div class="section-title">Delivery Tracking</div>
    <div class="g-2">
      ${DATA.orders.slice(0,2).map(o=>`
        <div class="card"><div class="card-header"><div class="card-title">${o.id}</div><span class="badge ${o.status}">${o.label}</span></div>
        <div class="card-body">
          <div style="font-size:12px;color:var(--t2);margin-bottom:12px;">${o.patient} · ${o.items}</div>
          <div class="track-steps">
            ${[['Order Placed','14 Apr, 13:00',true,true],['Rx Verified','14 Apr, 13:15',true,true],['Packing','14 Apr, 13:42',o.label!=='Dispatched'&&o.label!=='Delivered',o.label==='Dispatched'||o.label==='Delivered'],['Dispatched','14 Apr, 14:10',false,o.label==='Dispatched']].map(([l,t,done,active], i, arr)=>`
              <div class="track-step">
                <div class="step-line">
                  <div class="step-dot ${done||active?'done':''}"></div>
                  ${i<arr.length-1?`<div class="step-connector ${done?'done':''}"></div>`:''}
                </div>
                <div class="step-info"><div class="step-label">${l}</div><div class="step-time">${done||active?t:'Pending'}</div></div>
              </div>`).join('')}
          </div>
        </div></div>`).join('')}
    </div>`,

  'ph-inventory': () => AD['ad-inventory'](),

  'ph-rx-verify': () => `<div class="section-title">Prescription Verification</div>
    <div class="card"><div class="card-body">
      ${[['PRX-2201','Priya Ramesh','Dr. S. Mehta','Amoxicillin 500mg, Paracetamol 650mg','b-wait','Pending'],['PRX-2198','Manoj Kumar','Dr. P. Singh','Atorvastatin 20mg, Metformin 850mg','b-wait','Pending'],['PRX-2195','Neha Desai','Dr. K. Verma','Paediatric Syrup, Vitamin C','b-live','Verified']].map(([id,p,doc,meds,bs,bl])=>`
        <div style="border:1px solid var(--border);border-radius:var(--r-md);padding:14px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="font-weight:600;color:var(--blue)">${id}</div><span class="badge ${bs}">${bl}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-bottom:10px;">
            <div><span style="color:var(--t2)">Patient: </span>${p}</div>
            <div><span style="color:var(--t2)">Doctor: </span>${doc}</div>
            <div style="grid-column:span 2"><span style="color:var(--t2)">Medicines: </span>${meds}</div>
          </div>
          ${bl==='Pending'?`<div style="display:flex;gap:8px;"><button class="btn-sm" style="background:var(--green);" onclick="this.parentNode.parentNode.querySelector('.badge').className='badge b-live';this.parentNode.innerHTML='<span class=badge b-live>✅ Verified</span>'">✓ Verify</button>
          <button class="btn-sm" style="background:var(--red-l);color:var(--red);">✕ Reject</button></div>`:
          `<div class="badge b-live">✅ Verified — ready for dispensing</div>`}
        </div>`).join('')}
    </div></div>`,
};
