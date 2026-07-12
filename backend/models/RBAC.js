import mongoose from 'mongoose';

const rbacSchema = new mongoose.Schema({
  key: { type: String, default: 'current_matrix', unique: true },
  permissions: [{
    feature: String,
    manager: Boolean,
    driver: Boolean,
    safety: Boolean,
    analyst: Boolean
  }]
}, { timestamps: true });

export default mongoose.model('RBAC', rbacSchema);
