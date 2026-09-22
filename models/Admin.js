import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Seller' },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['seller', 'superadmin'],
      default: 'seller',
    },
    // Only meaningful for role: 'seller'. Superadmins are always 'approved'.
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    businessName: { type: String, default: '' },
    businessPhone: { type: String, default: '' },
    businessAddress: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Admin || mongoose.model('Admin', AdminSchema);