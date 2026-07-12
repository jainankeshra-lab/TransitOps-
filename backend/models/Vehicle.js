import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Truck', 'Van', 'Sedan']
  },
  maxCapacity: {
    type: Number, // in kg
    required: true
  },
  odometer: {
    type: Number, // in km
    required: true,
    default: 0
  },
  acquisitionCost: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Available', 'On Trip', 'In Shop', 'Retired'],
    default: 'Available'
  },
  region: {
    type: String,
    default: 'National'
  },
  documents: [{
    name: { type: String, required: true },
    category: { type: String, required: true },
    filePath: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
export default Vehicle;
