# TransitOps 🚛

**Smart Transport Operations Platform**

TransitOps is a centralized end-to-end fleet management system that replaces spreadsheet tracking with real-time analytics, automated business logic compliance, dynamic permissions (RBAC), and document vaults.

---

## 🚀 Key Features

### 🔐 1. Authentication & Dynamic RBAC
* **Session Persistence:** Remembers user session on refresh via browser `localStorage`.
* **Account Lockout:** Temporarily locks accounts for 15 minutes after **5 consecutive failed attempts**.
* **Password Recovery:** Slide-in recovery drawer to request a reset token and update password.
* **Remember Me:** Extends token lifespan to 30 days.
* **Dynamic RBAC Capabilities Grid:** Save changes directly to MongoDB to instantly update roles and permissions.

### 📊 2. Operational Dashboard
* **Real-time Metrics:** Tracks Active Vehicles, Available Vehicles, In Shop, Active Trips, Pending Dispatches, Drivers On Duty, and Fleet Utilization %.
* **Refined Filtering:** Filter entire dashboard by asset type, operating region, and status.
* **SVG Fleet Charts:** Visualize active fleet distribution (Available, On Trip, In Shop, Retired) with progress bars.

### 🚚 3. Vehicle Registry & Document Vault
* **Complete Asset Profile:** Unique registration numbers, load capacities, odometers, and region flags.
* **Vault Document Management:** Upload, download, and delete scans (e.g., Insurance policies, vehicle registrations) stored locally and securely.

### 👨‍✈️ 4. Drivers & Compliance Alerts
* **Completed Trips Counter:** Auto-calculates total completed trips for each driver profile.
* **Email Expiry System:** Automatically runs a cron check at midnight and sends emails for licenses expiring in less than 30 days. Includes a manual trigger button for review.
* **Status Badges:** Color-coded compliance indicators (Valid, Expiring Soon, Expired).

### 🚦 5. Trip Dispatch Console
* **Payload Compliance:** Excludes retired, in-shop, or already-assigned vehicles, as well as suspended or expired-license drivers, from the select pool.
* **Load Constraints:** Blocks dispatch if cargo exceeds the maximum payload weight of the vehicle.
* **Route Limits:** Planned distance validation against a configurable maximum distance limit.

### 🔧 6. Maintenance & Workshop Log
* **Automatic Status Updates:** Moving a vehicle to maintenance shifts its status to `In Shop` and removes it from the dispatch pool. Closing a log changes it back to `Available` (or retains `Retired`).
* **Date Integrity:** Prevents past dates for repair start times.

### 📈 7. Reports & ROI Analytics
* **ROI Metric Formula:** `(Revenue - (Maintenance + Fuel)) / Acquisition Cost`.
* **Monthly Revenue Trend:** Dynamic SVG graph displaying month-by-month financial yields.
* **Spreadsheet Export:** Download full-fleet analytical summaries in CSV format.
* **Print PDF:** Standardized invoice-ready reports layout.

---

## 🛠️ Technology Stack
* **Frontend:** React, Vite, Custom Vanilla CSS, SVG Graphs
* **Backend:** Node.js, Express.js, JWT, Multer (File Upload), Node-cron, Nodemailer
* **Database:** MongoDB (Mongoose ODM)

---

## ⚙️ Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v16+ recommended)
* [MongoDB Atlas](https://www.mongodb.com/) or local MongoDB instance

### Installation
1. Clone the repository and navigate to the project directory:
   ```bash
   cd odoo
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   ```
   ```bash
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

4. Configure Environment variables:
   Create a `.env` file inside the `backend/` directory using the variables below:
   ```env
   # Backend Server Port
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=transitops_super_secret_key_123!

   # MongoDB Connection String
   MONGO_URI=mongodb://localhost:27017/transitops

   # Optional: Mailer Config for Expiry Alerts (Falls back to Ethereal SMTP)
   SMTP_HOST=smtp.ethereal.email
   SMTP_PORT=587
   SMTP_USER=
   SMTP_PASS=
   ```

### Seeding the Database
To quickly register test roles, vehicles, and operational records, execute the seeder:
```bash
cd backend
```
```bash
npm run seed
```

### Running the Application
Start both servers simultaneously in separate terminals:

* **Backend Dev Server:**
  ```bash
  cd backend
  ```
  ```bash
  npm run dev
  ```
  *(Runs on http://localhost:5000)*

* **Frontend Client:**
  ```bash
  cd frontend
  ```
  ```bash
  npm run dev
  ```
  *(Runs on http://localhost:5173)*

---

## 🧪 Integration Tests
Verify end-to-end business rules (vehicle registrations, driver dispatches, maintenance logging, and ROI reports aggregation) by running:
```bash
cd backend
```
```bash
node test-workflow.js
```

---

## 👥 Demo User Credentials

The platform is pre-loaded with four operational test accounts:

| Role | Username / Email | Password |
|---|---|---|
| **Fleet Manager** | `manager@transitops.com` | `password123` |
| **Driver / Dispatcher** | `driver@transitops.com` | `password123` |
| **Safety Officer** | `safety@transitops.com` | `password123` |
| **Financial Analyst** | `analyst@transitops.com` | `password123` |
