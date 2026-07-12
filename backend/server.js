import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './db.js';

// Models for auto-seeding check
import User from './models/User.js';
import Vehicle from './models/Vehicle.js';
import Driver from './models/Driver.js';
import Trip from './models/Trip.js';
import Maintenance from './models/Maintenance.js';
import FuelLog from './models/FuelLog.js';
import Expense from './models/Expense.js';

// Route imports
import authRouter from './routes/auth.js';
import vehiclesRouter from './routes/vehicles.js';
import driversRouter from './routes/drivers.js';
import tripsRouter from './routes/trips.js';
import maintenanceRouter from './routes/maintenance.js';
import expensesRouter from './routes/expenses.js';
import reportsRouter from './routes/reports.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and parsing body
app.use(cors());
app.use(express.json());

// Routes registration
app.use('/api/auth', authRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/reports', reportsRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Server Error: ' + err.message });
});

// Auto-seed function (only triggers if DB has no users)
const autoSeed = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) return;

    console.log('Database is empty. Auto-seeding mock records...');

    // 1. Seed Users
    const users = await User.create([
      { name: 'Fleet Manager', email: 'manager@transitops.com', password: 'password123', role: 'Fleet Manager' },
      { name: 'Dispatcher Alex', email: 'driver@transitops.com', password: 'password123', role: 'Driver' },
      { name: 'Safety Officer', email: 'safety@transitops.com', password: 'password123', role: 'Safety Officer' },
      { name: 'Financial Analyst', email: 'analyst@transitops.com', password: 'password123', role: 'Financial Analyst' }
    ]);

    // 2. Seed Vehicles
    const vehicles = await Vehicle.create([
      { registrationNumber: 'VAN-01', name: 'Ford Transit', type: 'Van', maxCapacity: 800, odometer: 12000, acquisitionCost: 28000, status: 'Available', region: 'East' },
      { registrationNumber: 'TRUCK-02', name: 'Volvo FH16', type: 'Truck', maxCapacity: 8000, odometer: 45000, acquisitionCost: 110000, status: 'Available', region: 'West' },
      { registrationNumber: 'SEDAN-03', name: 'Toyota Camry', type: 'Sedan', maxCapacity: 350, odometer: 8000, acquisitionCost: 24000, status: 'Available', region: 'North' },
      { registrationNumber: 'VAN-04', name: 'Mercedes Sprinter', type: 'Van', maxCapacity: 1200, odometer: 32000, acquisitionCost: 35000, status: 'In Shop', region: 'South' },
      { registrationNumber: 'TRUCK-05', name: 'Scania R500', type: 'Truck', maxCapacity: 10000, odometer: 5000, acquisitionCost: 130000, status: 'Retired', region: 'National' }
    ]);

    // 3. Seed Drivers
    const drivers = await Driver.create([
      { name: 'John Doe', licenseNumber: 'DL-A10098', licenseCategory: 'Commercial', licenseExpiry: new Date('2028-05-15'), contact: '+15550192', safetyScore: 95, status: 'Available' },
      { name: 'Jane Smith', licenseNumber: 'DL-B20034', licenseCategory: 'Commercial', licenseExpiry: new Date('2027-10-20'), contact: '+15550183', safetyScore: 98, status: 'Available' },
      { name: 'Bob Johnson', licenseNumber: 'DL-C30056', licenseCategory: 'Regular', licenseExpiry: new Date('2029-01-10'), contact: '+15550144', safetyScore: 88, status: 'Off Duty' },
      { name: 'Expired Ed', licenseNumber: 'DL-EXP-001', licenseCategory: 'Commercial', licenseExpiry: new Date('2025-12-31'), contact: '+15550100', safetyScore: 75, status: 'Available' },
      { name: 'Suspended Sam', licenseNumber: 'DL-SUS-999', licenseCategory: 'Commercial', licenseExpiry: new Date('2028-06-30'), contact: '+15550999', safetyScore: 50, status: 'Suspended' }
    ]);

    // 4. Seed Maintenance Logs
    const activeMaintenance = await Maintenance.create({
      vehicle: vehicles[3]._id,
      description: 'Scheduled Engine Service & Brake Pad Replacement',
      cost: 1200,
      startDate: new Date('2026-07-10'),
      status: 'Open'
    });

    const closedMaintenance = await Maintenance.create({
      vehicle: vehicles[0]._id,
      description: 'Oil Change and Air Filter Replacement',
      cost: 250,
      startDate: new Date('2026-05-20'),
      endDate: new Date('2026-05-21'),
      status: 'Closed'
    });

    // 5. Seed Fuel Logs & Expenses
    await FuelLog.create([
      { vehicle: vehicles[0]._id, liters: 50, cost: 75, date: new Date('2026-06-01') },
      { vehicle: vehicles[0]._id, liters: 45, cost: 68, date: new Date('2026-06-15') },
      { vehicle: vehicles[1]._id, liters: 250, cost: 375, date: new Date('2026-06-10') }
    ]);

    await Expense.create([
      { vehicle: vehicles[0]._id, type: 'Tolls', amount: 35, description: 'Highway 101 tolls', date: new Date('2026-06-05') },
      { vehicle: vehicles[1]._id, type: 'Insurance', amount: 450, description: 'Monthly Premium', date: new Date('2026-07-01') }
    ]);

    // 6. Seed Trips
    await Trip.create({
      source: 'Warehouse A',
      destination: 'Distribution Center 1',
      vehicle: vehicles[0]._id,
      driver: drivers[0]._id,
      cargoWeight: 450,
      plannedDistance: 120,
      status: 'Completed',
      fuelConsumed: 12,
      finalOdometer: 12120,
      revenue: 500
    });

    const activeTrip = await Trip.create({
      source: 'Port Terminal 3',
      destination: 'Main Hub',
      vehicle: vehicles[1]._id,
      driver: drivers[1]._id,
      cargoWeight: 6500,
      plannedDistance: 320,
      status: 'Dispatched',
      revenue: 1800
    });

    // Update statuses for active dispatched trip
    await Vehicle.findByIdAndUpdate(vehicles[1]._id, { status: 'On Trip' });
    await Driver.findByIdAndUpdate(drivers[1]._id, { status: 'On Trip' });

    console.log('Database auto-seeded successfully.');
  } catch (error) {
    console.error('Error auto-seeding database:', error.message);
  }
};

// Start Server
const startServer = async () => {
  await connectDB();
  await autoSeed();
  
  app.listen(PORT, () => {
    console.log(`TransitOps Backend running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
};

startServer();
