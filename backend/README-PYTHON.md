# MediConnect Backend - Python Flask Version

## Setup Instructions

### 1. Install Python (if not already installed)
- Download from https://www.python.org/downloads/
- Make sure to check "Add Python to PATH" during installation
- Verify: `python --version`

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the backend directory:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root123
DB_NAME=mediconnect
JWT_SECRET=mediconnect_secret_2026
PORT=5000
```

### 4. Setup Database

Make sure your MySQL database is running and execute the schema:

```bash
mysql -u root -p mediconnect < schema.sql
```

### 5. Run the Server

```bash
python app.py
```

The server will start on `http://localhost:5000`

Check health: `http://localhost:5000/health`

---

## API Endpoints

All endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Auth Routes
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Patients
- `GET /api/patients` - List all patients
- `GET /api/patients/:id` - Get patient details
- `POST /api/patients` - Create new patient
- `PATCH /api/patients/:id` - Update patient

### Doctors
- `GET /api/doctors` - List all doctors
- `GET /api/doctors/:id` - Get doctor details
- `POST /api/doctors` - Create new doctor
- `PATCH /api/doctors/:id/status` - Update doctor status

### Consultations
- `GET /api/consultations` - List consultations
- `POST /api/consultations` - Book consultation
- `PATCH /api/consultations/:id/status` - Update consultation status
- `GET /api/consultations/stats/today` - Today's statistics

### Prescriptions
- `GET /api/prescriptions` - List prescriptions
- `POST /api/prescriptions` - Create prescription
- `PATCH /api/prescriptions/:id/verify` - Verify prescription

### Messages
- `GET /api/messages/consultation/:consultationId` - Get messages
- `POST /api/messages/send` - Send message
- `DELETE /api/messages/:messageId` - Delete message

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Place order
- `PATCH /api/orders/:id/status` - Update order status
- `GET /api/orders/summary/stats` - Order statistics

### Inventory
- `GET /api/inventory` - List inventory
- `POST /api/inventory` - Add item
- `PATCH /api/inventory/:sku` - Restock item
- `GET /api/inventory/alerts/low-stock` - Low stock items

### Schedules
- `GET /api/schedules/doctor/:doctorId/month` - Doctor's monthly schedule
- `GET /api/schedules/doctor/:doctorId/available` - Available slots
- `POST /api/schedules/doctor/:doctorId/create-slots` - Create slots
- `PATCH /api/schedules/:scheduleId/book` - Book slot
- `PATCH /api/schedules/:scheduleId/release` - Release slot

### Analytics
- `GET /api/analytics/overview` - Overview statistics
- `GET /api/analytics/consultations/weekly` - Weekly data
- `GET /api/analytics/revenue/monthly` - Monthly revenue
- `GET /api/analytics/doctors/performance` - Doctor performance
- `GET /api/analytics/pharmacy/revenue` - Pharmacy revenue

---

## Why Python Flask?

✅ **Easy to Understand** - Clean, readable syntax perfect for viva
✅ **Simple to Explain** - Less boilerplate than JavaScript/Java
✅ **Lightweight** - Minimal framework overhead
✅ **Fast Development** - Built-in development server
✅ **Industry Standard** - Widely used for REST APIs

---

## Project Structure

```
backend/
├── app.py              # Main Flask application
├── config.py           # Database configuration
├── requirements.txt    # Python dependencies
├── middleware/
│   └── auth.py        # JWT authentication
└── routes/
    ├── auth.py
    ├── patients.py
    ├── doctors.py
    ├── consultations.py
    ├── prescriptions.py
    ├── messages.py
    ├── orders.py
    ├── inventory.py
    ├── schedules.py
    └── analytics.py
```

---

## Frontend Integration

✅ **No changes needed!** The frontend will work exactly as before because:
- All API endpoints remain the same
- Response formats are identical
- Database schema unchanged
- Just change the backend server URL if needed

---

## Troubleshooting

### ImportError: No module named 'flask'
```bash
pip install -r requirements.txt
```

### Connection refused error
Make sure MySQL is running on localhost:3306

### Token validation errors
Check that JWT_SECRET matches in config.py and environment variables

### CORS errors
Verify CORS is enabled in app.py (it is by default)
