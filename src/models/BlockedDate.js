import mongoose from 'mongoose';

const blockedDateSchema = new mongoose.Schema({
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    default: null // null indicates whole resort property is blocked (e.g. exclusive buyout / private event)
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: ['renovation', 'hourly_stay', 'event', 'private_use', 'maintenance', 'owner_reserve', 'owner_reserved', 'seasonal_closure', 'monsoon_closure', 'offline_booking', 'other']
  },
  notes: {
    type: String,
    trim: true
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

blockedDateSchema.index({ unit: 1, startDate: 1, endDate: 1 });

export const BlockedDate = mongoose.model('BlockedDate', blockedDateSchema);
