-- ═══════════════════════════════════════════════════════════════
--  MEDICONNECT — MYSQL SCHEMA
--  Run this file once to create all tables and seed demo data
--  Usage: mysql -u root -p < schema.sql
-- ═══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS mediconnect
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mediconnect;

-- ─── 1. USERS ────────────────────────────────────────────────
-- Central auth table for all roles (patient / doctor / admin / pharmacy)
CREATE TABLE IF NOT EXISTS users (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  email      VARCHAR(120) NOT NULL,
  password   VARCHAR(255) NOT NULL,           -- bcrypt hash
  role       ENUM('patient','doctor','admin','pharmacy') NOT NULL,
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(15)  DEFAULT NULL,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- ─── 2. PATIENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id             VARCHAR(10)  NOT NULL,          -- e.g. P01
  user_id        CHAR(36)     DEFAULT NULL,       -- FK → users.id (nullable if admin-created)
  name           VARCHAR(100) NOT NULL,
  dob            DATE         DEFAULT NULL,
  gender         ENUM('male','female','other') DEFAULT NULL,
  age            TINYINT UNSIGNED DEFAULT NULL,   -- derived, kept for quick queries
  blood_group    ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') DEFAULT NULL,
  height_cm      DECIMAL(5,1) DEFAULT NULL,
  weight_kg      DECIMAL(5,1) DEFAULT NULL,
  city           VARCHAR(80)  DEFAULT NULL,
  state          VARCHAR(80)  DEFAULT NULL,
  address        TEXT         DEFAULT NULL,
  phone          VARCHAR(15)  DEFAULT NULL,
  allergies      TEXT         DEFAULT NULL,       -- comma-separated or JSON
  condition_note VARCHAR(255) DEFAULT NULL,       -- primary condition label
  status         ENUM('active','stable','review','inactive') NOT NULL DEFAULT 'active',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_patients_user (user_id),
  CONSTRAINT fk_patients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_patients_status (status),
  INDEX idx_patients_city   (city)
) ENGINE=InnoDB;

-- ─── 3. DOCTORS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id              VARCHAR(10)  NOT NULL,          -- e.g. D01
  user_id         CHAR(36)     DEFAULT NULL,
  name            VARCHAR(100) NOT NULL,
  speciality      VARCHAR(100) NOT NULL,
  qualification   VARCHAR(255) DEFAULT NULL,
  experience_yrs  TINYINT UNSIGNED DEFAULT 0,
  license_no      VARCHAR(50)  DEFAULT NULL,
  hospital        VARCHAR(150) DEFAULT NULL,
  city            VARCHAR(80)  DEFAULT NULL,
  consultation_fee DECIMAL(8,2) DEFAULT 300.00,
  rating          DECIMAL(3,2) DEFAULT 0.00,
  total_patients  SMALLINT UNSIGNED DEFAULT 0,
  status          ENUM('available','busy','off','suspended') NOT NULL DEFAULT 'available',
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_doctors_user    (user_id),
  UNIQUE KEY uq_doctors_license (license_no),
  CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_doctors_speciality (speciality),
  INDEX idx_doctors_status     (status)
) ENGINE=InnoDB;

-- ─── 4. CONSULTATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
  id              VARCHAR(10)  NOT NULL,          -- e.g. C001
  patient_id      VARCHAR(10)  NOT NULL,
  doctor_id       VARCHAR(10)  NOT NULL,
  type            ENUM('video','in_person','chat') NOT NULL DEFAULT 'video',
  speciality      VARCHAR(100) DEFAULT NULL,
  scheduled_date  DATE         NOT NULL,
  scheduled_time  TIME         NOT NULL,
  duration_min    TINYINT UNSIGNED DEFAULT NULL,  -- actual duration; NULL until completed
  status          ENUM('scheduled','waiting','live','completed','rx_issued','cancelled') NOT NULL DEFAULT 'scheduled',
  reason          TEXT         DEFAULT NULL,
  notes           TEXT         DEFAULT NULL,      -- doctor's notes
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_consult_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_consult_doctor  FOREIGN KEY (doctor_id)  REFERENCES doctors(id)  ON DELETE CASCADE,
  INDEX idx_consult_date      (scheduled_date),
  INDEX idx_consult_status    (status),
  INDEX idx_consult_patient   (patient_id),
  INDEX idx_consult_doctor    (doctor_id)
) ENGINE=InnoDB;

-- ─── 5. PRESCRIPTIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id               VARCHAR(15)  NOT NULL,         -- e.g. PRX-2201
  consultation_id  VARCHAR(10)  DEFAULT NULL,
  patient_id       VARCHAR(10)  NOT NULL,
  doctor_id        VARCHAR(10)  NOT NULL,
  diagnosis        VARCHAR(255) DEFAULT NULL,
  notes            TEXT         DEFAULT NULL,
  status           ENUM('active','verified','dispensed','expired','cancelled') NOT NULL DEFAULT 'active',
  verified_by      CHAR(36)     DEFAULT NULL,     -- FK → users.id (pharmacy user)
  verified_at      TIMESTAMP    DEFAULT NULL,
  issued_date      DATE         NOT NULL,
  expiry_date      DATE         DEFAULT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_rx_consult  FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE SET NULL,
  CONSTRAINT fk_rx_patient  FOREIGN KEY (patient_id)      REFERENCES patients(id)      ON DELETE CASCADE,
  CONSTRAINT fk_rx_doctor   FOREIGN KEY (doctor_id)       REFERENCES doctors(id)        ON DELETE CASCADE,
  CONSTRAINT fk_rx_verifier FOREIGN KEY (verified_by)     REFERENCES users(id)          ON DELETE SET NULL,
  INDEX idx_rx_patient    (patient_id),
  INDEX idx_rx_status     (status),
  INDEX idx_rx_issued     (issued_date)
) ENGINE=InnoDB;

-- ─── 6. PRESCRIPTION ITEMS (medicines per Rx) ────────────────
CREATE TABLE IF NOT EXISTS prescription_items (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  prescription_id VARCHAR(15)  NOT NULL,
  medicine_name   VARCHAR(150) NOT NULL,
  dosage          VARCHAR(80)  DEFAULT NULL,   -- e.g. "3× daily"
  duration        VARCHAR(80)  DEFAULT NULL,   -- e.g. "7 days"
  quantity        SMALLINT UNSIGNED DEFAULT NULL,
  instructions    VARCHAR(255) DEFAULT NULL,

  PRIMARY KEY (id),
  CONSTRAINT fk_rxitem_rx FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
  INDEX idx_rxitem_rx (prescription_id)
) ENGINE=InnoDB;

-- ─── 7. MEDICINES (catalog) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS medicines (
  sku             VARCHAR(20)  NOT NULL,
  name            VARCHAR(150) NOT NULL,
  brand           VARCHAR(100) DEFAULT NULL,
  category        ENUM('tablet','syrup','injection','topical','supplement','other') DEFAULT 'tablet',
  description     TEXT         DEFAULT NULL,
  price           DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  icon            VARCHAR(10)  DEFAULT '💊',
  requires_rx     TINYINT(1)   NOT NULL DEFAULT 0,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (sku),
  INDEX idx_medicines_name     (name),
  INDEX idx_medicines_category (category)
) ENGINE=InnoDB;

-- ─── 8. INVENTORY ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku         VARCHAR(20)  NOT NULL,
  qty         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  min_qty     SMALLINT UNSIGNED NOT NULL DEFAULT 20,
  batch_no    VARCHAR(50)  DEFAULT NULL,
  expiry_date DATE         DEFAULT NULL,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_inv_medicine FOREIGN KEY (sku) REFERENCES medicines(sku) ON DELETE CASCADE,
  UNIQUE KEY uq_inv_sku_batch (sku, batch_no),
  INDEX idx_inv_qty    (qty),
  INDEX idx_inv_expiry (expiry_date),

  -- CHECK constraint: qty can never go negative
  CONSTRAINT chk_inv_qty     CHECK (qty >= 0),
  CONSTRAINT chk_inv_min_qty CHECK (min_qty >= 0)
) ENGINE=InnoDB;

-- ─── 9. ORDERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              VARCHAR(15)  NOT NULL,          -- e.g. ORD-8821
  patient_id      VARCHAR(10)  NOT NULL,
  prescription_id VARCHAR(15)  DEFAULT NULL,
  total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status          ENUM('pending','rx_pending','packing','dispatched','delivered','cancelled') NOT NULL DEFAULT 'pending',
  payment_status  ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  payment_method  ENUM('upi','card','netbanking','cod','wallet') DEFAULT NULL,
  delivery_address TEXT        DEFAULT NULL,
  tracking_id     VARCHAR(50)  DEFAULT NULL,
  ordered_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dispatched_at   TIMESTAMP    DEFAULT NULL,
  delivered_at    TIMESTAMP    DEFAULT NULL,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_orders_patient FOREIGN KEY (patient_id)      REFERENCES patients(id)      ON DELETE CASCADE,
  CONSTRAINT fk_orders_rx      FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)  ON DELETE SET NULL,
  INDEX idx_orders_patient (patient_id),
  INDEX idx_orders_status  (status),
  INDEX idx_orders_date    (ordered_at),

  CONSTRAINT chk_orders_amount CHECK (total_amount >= 0)
) ENGINE=InnoDB;

-- ─── 10. ORDER ITEMS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    VARCHAR(15)  NOT NULL,
  sku         VARCHAR(20)  NOT NULL,
  qty         SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price  DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  subtotal    DECIMAL(10,2) GENERATED ALWAYS AS (qty * unit_price) STORED,

  PRIMARY KEY (id),
  CONSTRAINT fk_oitem_order    FOREIGN KEY (order_id) REFERENCES orders(id)    ON DELETE CASCADE,
  CONSTRAINT fk_oitem_medicine FOREIGN KEY (sku)      REFERENCES medicines(sku) ON DELETE RESTRICT,
  INDEX idx_oitem_order (order_id),

  CONSTRAINT chk_oitem_qty CHECK (qty > 0)
) ENGINE=InnoDB;

-- ─── 11. PAYMENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id        VARCHAR(15)  DEFAULT NULL,
  consultation_id VARCHAR(10)  DEFAULT NULL,
  patient_id      VARCHAR(10)  NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  type            ENUM('consultation','medicine','refund') NOT NULL DEFAULT 'medicine',
  gateway         ENUM('razorpay','stripe','upi','cod') DEFAULT NULL,
  gateway_txn_id  VARCHAR(100) DEFAULT NULL,
  status          ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
  paid_at         TIMESTAMP    DEFAULT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_pay_order   FOREIGN KEY (order_id)        REFERENCES orders(id)        ON DELETE SET NULL,
  CONSTRAINT fk_pay_consult FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE SET NULL,
  CONSTRAINT fk_pay_patient FOREIGN KEY (patient_id)      REFERENCES patients(id)      ON DELETE CASCADE,
  UNIQUE KEY uq_gateway_txn (gateway_txn_id),
  INDEX idx_pay_status  (status),
  INDEX idx_pay_patient (patient_id),
  INDEX idx_pay_date    (created_at),

  CONSTRAINT chk_pay_amount CHECK (amount > 0)
) ENGINE=InnoDB;

-- ─── 12. NOTIFICATIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     CHAR(36)     NOT NULL,
  type        ENUM('email','sms','push') NOT NULL DEFAULT 'push',
  title       VARCHAR(150) NOT NULL,
  body        TEXT         DEFAULT NULL,
  is_read     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id),
  INDEX idx_notif_read (is_read)
) ENGINE=InnoDB;

-- ─── 13. ACTIVITY LOGS ───────────────────────────────────────
-- To power the activity feeds on the dashboards
CREATE TABLE IF NOT EXISTS activity_logs (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     CHAR(36)     DEFAULT NULL,      -- User who triggered it (optional)
  icon_color  ENUM('d-b','d-g','d-a','d-r','d-p') DEFAULT 'd-b', -- Blue, green, amber, red, purple dots
  activity_text VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_activity_date (created_at)
) ENGINE=InnoDB;

-- ─── 14. DOCTOR SCHEDULES ────────────────────────────────────
-- Dynamic schedule slots for doctors (specific dates and times)
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  doctor_id   VARCHAR(10)  NOT NULL,
  slot_date   DATE         NOT NULL,
  slot_time   TIME         NOT NULL,
  is_available TINYINT(1)  NOT NULL DEFAULT 1,
  booked_by   VARCHAR(10)  DEFAULT NULL,        -- patient_id if booked
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_sched_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_patient FOREIGN KEY (booked_by) REFERENCES patients(id) ON DELETE SET NULL,
  UNIQUE KEY uq_sched_slot (doctor_id, slot_date, slot_time),
  INDEX idx_sched_date (slot_date),
  INDEX idx_sched_doctor (doctor_id),
  INDEX idx_sched_available (is_available)
) ENGINE=InnoDB;

-- ─── 15. CONSULTATION MESSAGES ────────────────────────────────
-- Messages/chat logs during consultations
CREATE TABLE IF NOT EXISTS consultation_messages (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  consultation_id VARCHAR(10)  NOT NULL,
  sender_id       VARCHAR(10)  NOT NULL,        -- patient_id or doctor_id
  sender_role     ENUM('patient','doctor') NOT NULL,
  message_text    TEXT         NOT NULL,
  sent_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_msg_consult FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
  INDEX idx_msg_consult (consultation_id),
  INDEX idx_msg_time (sent_at)
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════════
--  SEED DATA
-- ═══════════════════════════════════════════════════════════════

-- Users (passwords are bcrypt of the demo passwords)
INSERT IGNORE INTO users (id, email, password, role, name, phone) VALUES
('u-patient-01',  'patient@mediconnect.in',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lT7i', 'patient',  'Priya Ramesh',     '+917654321001'),
('u-doctor-01',   'doctor@mediconnect.in',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lT7i', 'doctor',   'Dr. Suresh Mehta', '+917654321002'),
('u-admin-01',    'admin@mediconnect.in',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lT7i', 'admin',    'Arjun Kulkarni',   '+917654321003'),
('u-pharmacy-01', 'pharmacy@mediconnect.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lT7i', 'pharmacy', 'Pharmacy Admin',   '+917654321004');

-- Patients
INSERT IGNORE INTO patients (id, user_id, name, age, gender, blood_group, city, phone, allergies, condition_note, status) VALUES
('P01', 'u-patient-01', 'Priya Ramesh',   32, 'female', 'B+', 'Mumbai',     '+917654321001', 'Penicillin',  'Infection',    'active'),
('P02', NULL,            'Vivek Naik',     47, 'male',   'O+', 'Pune',       '+919876543210', NULL,          'Hypertension', 'active'),
('P03', NULL,            'Sonal Agarwal',  28, 'female', 'A+', 'Nagpur',     '+919876543211', 'Dust Mites',  'Eczema',       'stable'),
('P04', NULL,            'Manoj Kumar',    55, 'male',   'AB+','Nashik',     '+919876543212', NULL,          'Diabetes T2',  'review'),
('P05', NULL,            'Neha Desai',     4,  NULL,     'O-', 'Mumbai',     '+919876543213', NULL,          'Fever',        'active'),
('P06', NULL,            'Rohit Deshmukh', 38, 'male',   'B+', 'Aurangabad', '+919876543214', NULL,          'Back Pain',    'stable');

-- Doctors
INSERT IGNORE INTO doctors (id, user_id, name, speciality, qualification, experience_yrs, license_no, consultation_fee, rating, total_patients, status) VALUES
('D01', 'u-doctor-01', 'Dr. Suresh Mehta',  'General Physician', 'MBBS, MD', 12, 'MH-GP-10234', 300.00, 4.9, 142, 'available'),
('D02', NULL,           'Dr. Anjali Sharma', 'Cardiologist',      'MBBS, DM', 18, 'MH-CD-20145', 600.00, 4.8,  98, 'available'),
('D03', NULL,           'Dr. Rajesh Iyer',   'Dermatologist',     'MBBS, MD', 9,  'MH-DM-30267', 400.00, 4.7,  75, 'busy'),
('D04', NULL,           'Dr. Priya Singh',   'Orthopaedics',      'MBBS, MS', 14, 'MH-OR-40389', 500.00, 4.9, 110, 'off'),
('D05', NULL,           'Dr. Kavita Verma',  'Paediatrics',       'MBBS, MD',  7, 'MH-PD-50412', 350.00, 4.6,  88, 'available');

-- Consultations
INSERT IGNORE INTO consultations (id, patient_id, doctor_id, type, speciality, scheduled_date, scheduled_time, status, reason) VALUES
('C001', 'P01', 'D01', 'video', 'General',     '2026-04-14', '14:22:00', 'live',      'Fever and sore throat for 2 days'),
('C002', 'P02', 'D02', 'video', 'Cardiology',  '2026-04-14', '14:30:00', 'waiting',   'Chest tightness'),
('C003', 'P03', 'D03', 'video', 'Derma',       '2026-04-14', '13:50:00', 'completed', 'Skin rash on arms'),
('C004', 'P04', 'D04', 'video', 'Ortho',       '2026-04-14', '13:10:00', 'rx_issued', 'Lower back pain'),
('C005', 'P05', 'D05', 'video', 'Paediatrics', '2026-04-14', '14:45:00', 'waiting',   'High fever 102°F'),
('C006', 'P06', 'D01', 'video', 'General',     '2026-04-15', '15:00:00', 'scheduled', 'Follow-up');

-- Medicines
INSERT IGNORE INTO medicines (sku, name, brand, category, price, icon, requires_rx) VALUES
('MED-001', 'Amoxicillin 500mg',  'GSK',        'tablet',     120.00, '💊', 1),
('MED-002', 'Metformin 850mg',    'Sun Pharma', 'tablet',      85.00, '💊', 1),
('MED-003', 'Cetirizine 10mg',    'Cipla',      'tablet',      55.00, '💊', 0),
('MED-004', 'Atorvastatin 20mg',  'Torrent',    'tablet',     200.00, '💊', 1),
('MED-005', 'Paracetamol 650mg',  'Cipla',      'tablet',      40.00, '💊', 0),
('MED-006', 'Omeprazole 20mg',    'Dr. Reddys', 'tablet',      90.00, '💊', 1),
('MED-007', 'Azithromycin 500mg', 'Mankind',    'tablet',     150.00, '💊', 1),
('MED-008', 'Pantoprazole 40mg',  'Abbott',     'tablet',     110.00, '💊', 1),
('MED-009', 'Vitamin D3 60K',     'Pfizer',     'supplement',  75.00, '🧴', 0);

-- Inventory
INSERT IGNORE INTO inventory (sku, qty, min_qty, batch_no, expiry_date) VALUES
('MED-001', 245, 50,  'BATCH-2024-A1', '2026-12-01'),
('MED-002', 180, 40,  'BATCH-2024-B2', '2027-03-01'),
('MED-003', 320, 60,  'BATCH-2024-C3', '2027-06-01'),
('MED-004',   8, 30,  'BATCH-2024-D4', '2026-11-01'),  -- LOW STOCK
('MED-005',  12, 100, 'BATCH-2024-E5', '2027-09-01'),  -- LOW STOCK
('MED-006', 156, 40,  'BATCH-2024-F6', '2027-02-01'),
('MED-007',  89, 30,  'BATCH-2024-G7', '2026-08-01'),
('MED-008', 210, 50,  'BATCH-2024-H8', '2026-10-01'),
('MED-009', 134, 30,  'BATCH-2024-I9', '2027-01-01');

-- Prescriptions
INSERT IGNORE INTO prescriptions (id, consultation_id, patient_id, doctor_id, diagnosis, status, issued_date) VALUES
('PRX-2201', 'C001', 'P01', 'D01', 'Acute Pharyngitis / Upper Respiratory Infection', 'active', '2026-04-14'),
('PRX-2198', 'C004', 'P04', 'D04', 'Type 2 Diabetes Mellitus — maintenance Rx',       'active', '2026-04-13');

-- Prescription Items
INSERT IGNORE INTO prescription_items (prescription_id, medicine_name, dosage, duration, quantity) VALUES
('PRX-2201', 'Amoxicillin 500mg',  '3× daily', '7 days',  21),
('PRX-2201', 'Paracetamol 650mg',  'As needed', '5 days',  10),
('PRX-2198', 'Atorvastatin 20mg',  '1× daily', '30 days', 30),
('PRX-2198', 'Metformin 850mg',    '2× daily', '30 days', 60);

-- Orders
INSERT IGNORE INTO orders (id, patient_id, prescription_id, total_amount, status, payment_status, ordered_at) VALUES
('ORD-8821', 'P01', 'PRX-2201', 420.00, 'dispatched', 'paid',    '2026-04-14 13:10:00'),
('ORD-8818', 'P04', 'PRX-2198', 310.00, 'packing',    'paid',    '2026-04-14 12:42:00'),
('ORD-8810', 'P03', NULL,        85.00, 'delivered',  'paid',    '2026-04-13 10:30:00'),
('ORD-8807', 'P02', NULL,       540.00, 'rx_pending', 'pending', '2026-04-13 09:15:00');

-- Order Items
INSERT IGNORE INTO order_items (order_id, sku, qty, unit_price) VALUES
('ORD-8821', 'MED-001', 21, 20.00),
('ORD-8818', 'MED-002', 60,  5.17),
('ORD-8810', 'MED-003', 14,  6.07),
('ORD-8807', 'MED-004', 30, 18.00);

-- Activity Logs
INSERT IGNORE INTO activity_logs (icon_color, activity_text, created_at) VALUES
('d-b', 'Order #8821 dispatched to Priya Ramesh',        DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 MINUTE)),
('d-g', 'Prescription verified by Dr. Mehta',            DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 9 MINUTE)),
('d-a', 'Low stock alert: Paracetamol 650mg',             DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 25 MINUTE)),
('d-r', 'Payment failed for order #8815',                 DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 HOUR)),
('d-p', 'New doctor Dr. Kavita Verma onboarded',          DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 HOUR)),
('d-g', 'Order #8810 delivered to Sonal Agarwal',         DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 3 HOUR));

-- Doctor Schedules (Dynamic slots for April 2026)
INSERT IGNORE INTO doctor_schedules (doctor_id, slot_date, slot_time, is_available, booked_by) VALUES
-- Dr. Mehta (D01) - April 14, 2026
('D01', '2026-04-14', '09:00:00', 0, 'P01'),
('D01', '2026-04-14', '09:30:00', 0, 'P02'),
('D01', '2026-04-14', '10:00:00', 1, NULL),
('D01', '2026-04-14', '10:30:00', 1, NULL),
('D01', '2026-04-14', '11:00:00', 0, 'P04'),
('D01', '2026-04-14', '14:00:00', 0, 'P03'),
('D01', '2026-04-14', '15:00:00', 0, 'P06'),
-- Dr. Mehta (D01) - April 15, 2026
('D01', '2026-04-15', '09:00:00', 1, NULL),
('D01', '2026-04-15', '09:30:00', 1, NULL),
('D01', '2026-04-15', '10:00:00', 1, NULL),
('D01', '2026-04-15', '10:30:00', 1, NULL),
('D01', '2026-04-15', '11:00:00', 1, NULL),
-- Dr. Anjali Sharma (D02) - April 14, 2026
('D02', '2026-04-14', '09:00:00', 1, NULL),
('D02', '2026-04-14', '09:30:00', 1, NULL),
('D02', '2026-04-14', '14:00:00', 1, NULL),
('D02', '2026-04-14', '14:30:00', 0, 'P02'),
('D02', '2026-04-14', '15:00:00', 1, NULL);

-- Consultation Messages
INSERT IGNORE INTO consultation_messages (consultation_id, sender_id, sender_role, message_text, sent_at) VALUES
('C001', 'P01', 'patient', 'Hello Doctor, I have fever and sore throat since yesterday evening.', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)),
('C001', 'D01', 'doctor', 'Hello Priya, how are you feeling today? Let me examine you.', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 4 MINUTE)),
('C001', 'P01', 'patient', 'I have fever and sore throat since yesterday evening, doctor. Temperature is 100.4°F', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 3 MINUTE)),
('C001', 'D01', 'doctor', 'I see. Any cough or body pain? Have you tested for COVID recently?', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 MINUTE)),
('C001', 'P01', 'patient', 'Yes, mild body pain. COVID test was negative this morning.', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 MINUTE)),
('C002', 'P02', 'patient', 'Doctor, I have been experiencing chest tightness for a few days now.', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE)),
('C002', 'D02', 'doctor', 'When did it start? Is it constantly there or intermittent?', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 9 MINUTE)),
('C003', 'P03', 'patient', 'Doctor, I have this rash on my arms that has been itching a lot.', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 20 MINUTE)),
('C003', 'D03', 'doctor', 'Let me see. When did you first notice the rash? Any recent exposure to new products or allergens?', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 18 MINUTE));
