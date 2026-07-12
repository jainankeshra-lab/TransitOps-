import mongoose from 'mongoose';
import connectDB from '../db.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import Driver from '../models/Driver.js';
import Trip from '../models/Trip.js';
import Maintenance from '../models/Maintenance.js';
import FuelLog from '../models/FuelLog.js';
import Expense from '../models/Expense.js';
import RBAC from '../models/RBAC.js';

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Vehicle.deleteMany({});
    await Driver.deleteMany({});
    await Trip.deleteMany({});
    await Maintenance.deleteMany({});
    await FuelLog.deleteMany({});
    await Expense.deleteMany({});
    await RBAC.deleteMany({});

    console.log('Database cleared.');

    // Seed default RBAC matrix
    await RBAC.create({
      key: 'current_matrix',
      permissions: [
        { feature: 'View Dashboard KPIs', manager: true, driver: true, safety: true, analyst: true },
        { feature: 'Register/Edit Fleet Vehicles', manager: true, driver: false, safety: false, analyst: false },
        { feature: 'Register/Edit Drivers Profiles', manager: true, driver: false, safety: true, analyst: false },
        { feature: 'Create/Draft Dispatches', manager: true, driver: true, safety: false, analyst: false },
        { feature: 'Dispatch Active Trips', manager: true, driver: true, safety: false, analyst: false },
        { feature: 'Complete/Cancel Trips', manager: true, driver: true, safety: false, analyst: false },
        { feature: 'Schedule Maintenance Logs', manager: true, driver: false, safety: false, analyst: false },
        { feature: 'Close Maintenance Tickets', manager: true, driver: false, safety: false, analyst: false },
        { feature: 'Log Fuel refills & Expenses', manager: true, driver: false, safety: false, analyst: true },
        { feature: 'View Financial Yields & ROI Reports', manager: true, driver: true, safety: true, analyst: true },
        { feature: 'Export Report Spreadsheets (CSV)', manager: true, driver: true, safety: true, analyst: true }
      ]
    });
    console.log('Seeded RBAC defaults.');

    // 1. Seed Users (passwords will be hashed via pre-save middleware)
    const users = await User.create([
      { name: 'Fleet Manager', email: 'manager@transitops.com', password: 'password123', role: 'Fleet Manager' },
      { name: 'John Doe', email: 'driver@transitops.com', password: 'password123', role: 'Driver' },
      { name: 'Safety Officer', email: 'safety@transitops.com', password: 'password123', role: 'Safety Officer' },
      { name: 'Financial Analyst', email: 'analyst@transitops.com', password: 'password123', role: 'Financial Analyst' }
    ]);
    console.log('Seeded Users.');

    // 2. Seed Vehicles
    const vehicles = await Vehicle.create([
      { registrationNumber: 'VAN-01', name: 'Ford Transit', type: 'Van', maxCapacity: 800, odometer: 12000, acquisitionCost: 28000, status: 'Available', region: 'East' },
      { registrationNumber: 'TRUCK-02', name: 'Volvo FH16', type: 'Truck', maxCapacity: 8000, odometer: 45000, acquisitionCost: 110000, status: 'Available', region: 'West' },
      { registrationNumber: 'SEDAN-03', name: 'Toyota Camry', type: 'Sedan', maxCapacity: 350, odometer: 8000, acquisitionCost: 24000, status: 'Available', region: 'North' },
      { registrationNumber: 'VAN-04', name: 'Mercedes Sprinter', type: 'Van', maxCapacity: 1200, odometer: 32000, acquisitionCost: 35000, status: 'In Shop', region: 'South' },
      { registrationNumber: 'TRUCK-05', name: 'Scania R500', type: 'Truck', maxCapacity: 10000, odometer: 5000, acquisitionCost: 130000, status: 'Retired', region: 'National' }
    ]);
    console.log('Seeded Vehicles.');

    // 3. Seed Drivers
    // Dates relative to current date (2026-07-12)
    const drivers = await Driver.create([
      { name: 'John Doe', licenseNumber: 'DL-A10098', licenseCategory: 'Commercial', licenseExpiry: new Date('2028-05-15'), contact: '+15550192', safetyScore: 95, status: 'Available' },
      { name: 'Jane Smith', licenseNumber: 'DL-B20034', licenseCategory: 'Commercial', licenseExpiry: new Date('2027-10-20'), contact: '+15550183', safetyScore: 98, status: 'Available' },
      { name: 'Bob Johnson', licenseNumber: 'DL-C30056', licenseCategory: 'Regular', licenseExpiry: new Date('2029-01-10'), contact: '+15550144', safetyScore: 88, status: 'Off Duty' },
      { name: 'Expired Ed', licenseNumber: 'DL-EXP-001', licenseCategory: 'Commercial', licenseExpiry: new Date('2025-12-31'), contact: '+15550100', safetyScore: 75, status: 'Available' },
      { name: 'Suspended Sam', licenseNumber: 'DL-SUS-999', licenseCategory: 'Commercial', licenseExpiry: new Date('2028-06-30'), contact: '+15550999', safetyScore: 50, status: 'Suspended' }
    ]);
    console.log('Seeded Drivers.');

    // 4. Seed Maintenance Logs
    const activeMaintenance = await Maintenance.create({
      vehicle: vehicles[3]._id, // VAN-04 is In Shop
      description: 'Scheduled Engine Service & Brake Pad Replacement',
      cost: 1200,
      startDate: new Date('2026-07-10'),
      status: 'Open'
    });

    const closedMaintenance = await Maintenance.create({
      vehicle: vehicles[0]._id, // VAN-01
      description: 'Oil Change and Air Filter Replacement',
      cost: 250,
      startDate: new Date('2026-05-20'),
      endDate: new Date('2026-05-21'),
      status: 'Closed'
    });
    console.log('Seeded Maintenance Logs.');

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
    console.log('Seeded Fuel & Expenses.');

    // 6. Seed Trips
    // Completed trip
    const completedTrip = await Trip.create({
      source: 'Warehouse A',
      destination: 'Distribution Center 1',
      vehicle: vehicles[0]._id, // VAN-01
      driver: drivers[0]._id, // John Doe
      cargoWeight: 450,
      plannedDistance: 120,
      status: 'Completed',
      fuelConsumed: 12,
      finalOdometer: 12120,
      revenue: 500
    });

    // Active dispatched trip (changes status to On Trip)
    const activeTrip = await Trip.create({
      source: 'Port Terminal 3',
      destination: 'Main Hub',
      vehicle: vehicles[1]._id, // TRUCK-02
      driver: drivers[1]._id, // Jane Smith
      cargoWeight: 6500,
      plannedDistance: 320,
      status: 'Dispatched',
      revenue: 1800
    });

    // Update vehicle and driver status for the active dispatched trip
    await Vehicle.findByIdAndUpdate(vehicles[1]._id, { status: 'On Trip' });
    await Driver.findByIdAndUpdate(drivers[1]._id, { status: 'On Trip' });

    console.log('Seeded Trips.');
    console.log('Database seeding complete successfully.');
    process.exit(0);
  } catch (error) {
    console.error(`Error Seeding Database: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
