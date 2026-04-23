/* ════════════════════════════════════════
   MEDICONNECT — DATA STORE
   ════════════════════════════════════════ */
const DATA = {
  credentials: {
    patient:  { email:'patient@mediconnect.in',  pass:'patient123',  page:'page-patient',  portal:'pt' },
    doctor:   { email:'doctor@mediconnect.in',   pass:'doctor123',   page:'page-doctor',   portal:'dr' },
    admin:    { email:'admin@mediconnect.in',     pass:'admin123',    page:'page-admin',    portal:'ad' },
    pharmacy: { email:'pharmacy@mediconnect.in',  pass:'pharmacy123', page:'page-pharmacy', portal:'ph' },
  },
  demoCreds: {
    patient:  'patient@mediconnect.in / patient123',
    doctor:   'doctor@mediconnect.in / doctor123',
    admin:    'admin@mediconnect.in / admin123',
    pharmacy: 'pharmacy@mediconnect.in / pharmacy123',
  },
  consultations: {
    live: [
      { id:'C001', init:'PR', av:'av-blue',  name:'Priya Ramesh',   doc:'Dr. S. Mehta',    spec:'General',    badge:'b-live', label:'🔴 Live',    time:'14:22', duration:'8 min' },
      { id:'C002', init:'VN', av:'av-teal',  name:'Vivek Naik',     doc:'Dr. A. Sharma',   spec:'Cardiology', badge:'b-wait', label:'Waiting',    time:'14:30', duration:'—' },
      { id:'C003', init:'SA', av:'av-pink',  name:'Sonal Agarwal',  doc:'Dr. R. Iyer',     spec:'Derma',      badge:'b-done', label:'Done',       time:'13:50', duration:'12 min' },
      { id:'C004', init:'MK', av:'av-amber', name:'Manoj Kumar',    doc:'Dr. P. Singh',    spec:'Ortho',      badge:'b-rx',   label:'Rx Issued',  time:'13:10', duration:'18 min' },
      { id:'C005', init:'ND', av:'av-green', name:'Neha Desai',     doc:'Dr. K. Verma',    spec:'Pediatrics', badge:'b-wait', label:'Waiting',    time:'14:45', duration:'—' },
    ],
    upcoming: [
      { id:'C006', init:'RD', av:'av-teal',  name:'Rohit Deshmukh', doc:'Dr. S. Mehta',    spec:'General',    badge:'b-sched', label:'15:00',   time:'15:00', duration:'—' },
      { id:'C007', init:'KS', av:'av-pink',  name:'Kavita Sharma',  doc:'Dr. A. Sharma',   spec:'Cardiology', badge:'b-sched', label:'15:30',   time:'15:30', duration:'—' },
      { id:'C008', init:'AM', av:'av-amber', name:'Amit Mahajan',   doc:'Dr. R. Iyer',     spec:'Derma',      badge:'b-sched', label:'16:00',   time:'16:00', duration:'—' },
    ],
    completed: [
      { id:'C009', init:'PS', av:'av-blue',  name:'Pooja Sinha',    doc:'Dr. K. Verma',    spec:'Pediatrics', badge:'b-done', label:'Completed', time:'11:40', duration:'14 min' },
      { id:'C010', init:'GJ', av:'av-teal',  name:'Ganesh Joshi',   doc:'Dr. P. Singh',    spec:'Ortho',      badge:'b-rx',   label:'Rx Issued', time:'10:55', duration:'22 min' },
      { id:'C011', init:'LT', av:'av-purple',name:'Leena Tiwari',   doc:'Dr. S. Mehta',    spec:'General',    badge:'b-done', label:'Completed', time:'09:30', duration:'11 min' },
    ],
  },
  orders: [
    { id:'ORD-8821', patient:'Priya Ramesh',   items:'Amoxicillin 500mg ×21', amt:'₹420',  status:'b-ship',   label:'Dispatched', date:'Today, 14:10' },
    { id:'ORD-8818', patient:'Manoj Kumar',    items:'Metformin 850mg ×60',   amt:'₹310',  status:'b-wait',   label:'Packing',    date:'Today, 13:42' },
    { id:'ORD-8810', patient:'Sonal Agarwal',  items:'Cetirizine 10mg ×14',   amt:'₹85',   status:'b-done',   label:'Delivered',  date:'Yesterday' },
    { id:'ORD-8807', patient:'Vivek Naik',     items:'Atorvastatin 20mg ×30', amt:'₹540',  status:'b-pend',   label:'Rx Pending', date:'Yesterday' },
    { id:'ORD-8800', patient:'Neha Desai',     items:'Paediatric Syrup ×2',   amt:'₹220',  status:'b-ship',   label:'Dispatched', date:'2 days ago' },
    { id:'ORD-8795', patient:'Rohit Deshmukh', items:'Omeprazole 20mg ×28',   amt:'₹180',  status:'b-done',   label:'Delivered',  date:'3 days ago' },
    { id:'ORD-8790', patient:'Kavita Sharma',  items:'Amlodipine 5mg ×30',    amt:'₹290',  status:'b-cancel', label:'Cancelled',  date:'3 days ago' },
  ],
  medicines: [
    { id:'M01', name:'Amoxicillin 500mg',   brand:'GSK',         price:'₹120', icon:'💊', stock:'in-stock',  stockLabel:'In Stock' },
    { id:'M02', name:'Metformin 850mg',     brand:'Sun Pharma',  price:'₹85',  icon:'💊', stock:'in-stock',  stockLabel:'In Stock' },
    { id:'M03', name:'Cetirizine 10mg',     brand:'Cipla',       price:'₹55',  icon:'💊', stock:'in-stock',  stockLabel:'In Stock' },
    { id:'M04', name:'Atorvastatin 20mg',   brand:'Torrent',     price:'₹200', icon:'💊', stock:'low-stock', stockLabel:'Low Stock (8)' },
    { id:'M05', name:'Omeprazole 20mg',     brand:'Dr. Reddy',   price:'₹90',  icon:'🧴', stock:'in-stock',  stockLabel:'In Stock' },
    { id:'M06', name:'Azithromycin 500mg',  brand:'Mankind',     price:'₹150', icon:'💊', stock:'in-stock',  stockLabel:'In Stock' },
    { id:'M07', name:'Paracetamol 650mg',   brand:'Cipla',       price:'₹40',  icon:'💊', stock:'low-stock', stockLabel:'Low Stock (12)' },
    { id:'M08', name:'Pantoprazole 40mg',   brand:'Abbott',      price:'₹110', icon:'💊', stock:'in-stock',  stockLabel:'In Stock' },
    { id:'M09', name:'Vitamin D3 60K',      brand:'Pfizer',      price:'₹75',  icon:'🧴', stock:'in-stock',  stockLabel:'In Stock' },
  ],
  doctors: [
    { id:'D01', init:'SM', av:'av-teal',  name:'Dr. Suresh Mehta',   spec:'General Physician', patients:142, rating:'4.9', status:'b-live', statusLabel:'Available' },
    { id:'D02', init:'AS', av:'av-blue',  name:'Dr. Anjali Sharma',  spec:'Cardiologist',      patients:98,  rating:'4.8', status:'b-live', statusLabel:'Available' },
    { id:'D03', init:'RI', av:'av-pink',  name:'Dr. Rajesh Iyer',    spec:'Dermatologist',     patients:75,  rating:'4.7', status:'b-wait', statusLabel:'Busy' },
    { id:'D04', init:'PS', av:'av-amber', name:'Dr. Priya Singh',    spec:'Orthopaedics',      patients:110, rating:'4.9', status:'b-done', statusLabel:'Off Duty' },
    { id:'D05', init:'KV', av:'av-green', name:'Dr. Kavita Verma',   spec:'Paediatrics',       patients:88,  rating:'4.6', status:'b-live', statusLabel:'Available' },
  ],
  patients: [
    { id:'P01', init:'PR', av:'av-blue',  name:'Priya Ramesh',   age:32, city:'Mumbai',   last:'14 Apr 2026', cond:'Infection',   status:'b-live', statusLabel:'Active' },
    { id:'P02', init:'VN', av:'av-teal',  name:'Vivek Naik',     age:47, city:'Pune',     last:'14 Apr 2026', cond:'Hypertension', status:'b-live', statusLabel:'Active' },
    { id:'P03', init:'SA', av:'av-pink',  name:'Sonal Agarwal',  age:28, city:'Nagpur',   last:'12 Apr 2026', cond:'Eczema',       status:'b-done', statusLabel:'Stable' },
    { id:'P04', init:'MK', av:'av-amber', name:'Manoj Kumar',    age:55, city:'Nashik',   last:'13 Apr 2026', cond:'Diabetes T2',  status:'b-wait', statusLabel:'Review' },
    { id:'P05', init:'ND', av:'av-green', name:'Neha Desai',     age:4,  city:'Mumbai',   last:'14 Apr 2026', cond:'Fever',        status:'b-live', statusLabel:'Active' },
    { id:'P06', init:'RD', av:'av-purple',name:'Rohit Deshmukh', age:38, city:'Aurangabad',last:'10 Apr 2026',cond:'Back Pain',    status:'b-done', statusLabel:'Stable' },
  ],
  inventory: [
    { name:'Amoxicillin 500mg',  sku:'MED-001', qty:245, min:50,  price:'₹120', expiry:'Dec 2026' },
    { name:'Metformin 850mg',    sku:'MED-002', qty:180, min:40,  price:'₹85',  expiry:'Mar 2027' },
    { name:'Cetirizine 10mg',    sku:'MED-003', qty:320, min:60,  price:'₹55',  expiry:'Jun 2027' },
    { name:'Atorvastatin 20mg',  sku:'MED-004', qty:8,   min:30,  price:'₹200', expiry:'Nov 2026' },
    { name:'Paracetamol 650mg',  sku:'MED-005', qty:12,  min:100, price:'₹40',  expiry:'Sep 2027' },
    { name:'Omeprazole 20mg',    sku:'MED-006', qty:156, min:40,  price:'₹90',  expiry:'Feb 2027' },
    { name:'Azithromycin 500mg', sku:'MED-007', qty:89,  min:30,  price:'₹150', expiry:'Aug 2026' },
  ],
  activity: [
    { dot:'d-b', text:'Order #8821 dispatched to Priya Ramesh',        time:'2 min ago' },
    { dot:'d-g', text:'Prescription verified by Dr. Mehta',            time:'9 min ago' },
    { dot:'d-a', text:'Low stock alert: Paracetamol 650mg',             time:'25 min ago' },
    { dot:'d-r', text:'Payment failed for order #8815',                 time:'1 hr ago' },
    { dot:'d-p', text:'New doctor Dr. Kavita Verma onboarded',          time:'2 hr ago' },
    { dot:'d-g', text:'Order #8810 delivered to Sonal Agarwal',         time:'3 hr ago' },
  ],
  cart: [],
};
