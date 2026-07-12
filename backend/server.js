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

// Start Server
const startServer = async () => {
  await connectDB();
  
  // Migration to fix existing seeded users name
  try {
    const existingDriverUser = await User.findOne({ email: 'driver@transitops.com' });
    if (existingDriverUser && existingDriverUser.name === 'Dispatcher Alex') {
      existingDriverUser.name = 'John Doe';
      await existingDriverUser.save();
      console.log('Migrated driver user account name from "Dispatcher Alex" to "John Doe".');
    }
  } catch (err) {
    console.error('Error running migrations:', err.message);
  }
  
  app.listen(PORT, () => {
    console.log(`TransitOps Backend running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
};

startServer();
