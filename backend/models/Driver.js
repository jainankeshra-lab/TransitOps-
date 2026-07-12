import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  licenseNumber: {
    type: String,
    required: true,
    trim: true
  },
  licenseCategory: {
    type: String,
    required: true
  },
  licenseExpiry: {
    type: Date,
    required: true
  },
  contact: {
    type: String,
    required: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  safetyScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  status: {
    type: String,
    required: true,
    enum: ['Available', 'On Trip', 'Off Duty', 'Suspended'],
    default: 'Available'
  }
}, {
  timestamps: true
});

const Driver = mongoose.model('Driver', driverSchema);
export default Driver;
