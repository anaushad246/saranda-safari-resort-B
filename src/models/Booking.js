import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  bookingReference: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true // e.g. SSR-2026-A1B2
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  unitType: {
    type: String,
    required: true,
    enum: ['red_white_cottage', 'wooden_log_house', 'other_cottage', 'camping_tent']
  },
  guest: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    idType: { type: String, default: 'Aadhaar / Voter ID / Passport' },
    idNumber: { type: String, trim: true }
  },
  checkIn: {
    type: Date,
    required: true // Stored as ISO Date with 09:00:00 (Cottages) or 16:00:00 (Camping)
  },
  checkOut: {
    type: Date,
    required: true // Stored as ISO Date with 09:00:00
  },
  nights: {
    type: Number,
    required: true,
    min: 1
  },
  adults: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  children5to10: {
    type: Number,
    default: 0,
    min: 0
  },
  infantsUnder5: {
    type: Number,
    default: 0,
    min: 0
  },
  nonVegPlan: {
    type: Boolean,
    default: false
  },
  bonfireAddon: {
    type: Boolean,
    default: false
  },
  // All monetary figures stored strictly in integer paise (₹1 = 100 paise)
  financials: {
    baseStayPaise: { type: Number, required: true },
    childrenPaise: { type: Number, default: 0 },
    nonVegPaise: { type: Number, default: 0 },
    bonfirePaise: { type: Number, default: 0 },
    totalPaise: { type: Number, required: true },
    advancePayablePaise: { type: Number, required: true }, // 50%
    balanceDuePaise: { type: Number, required: true }      // 50%
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'advance_paid', 'fully_paid', 'refunded', 'failed'],
    default: 'pending'
  },
  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    default: 'pending'
  },
  source: {
    type: String,
    enum: ['website_enquiry', 'whatsapp_direct', 'phone_walkin', 'admin_manual'],
    default: 'website_enquiry'
  },
  // Price snapshot: permanent record of tariff rules when booking was created
  priceSnapshot: {
    unitName: String,
    baseRateApplied: Number,
    childRateApplied: Number,
    nonVegRateApplied: Number,
    bonfireRateApplied: Number,
    capturedAt: { type: Date, default: Date.now }
  },
  cancellation: {
    cancelledAt: Date,
    reason: String,
    isResortCancellation: { type: Boolean, default: false }, // If true, 100% full refund rule triggers!
    refundPercentage: { type: Number, default: 0 },
    refundAmountPaise: { type: Number, default: 0 }
  },
  specialRequests: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index for quick date overlap conflict detection
bookingSchema.index({ unit: 1, checkIn: 1, checkOut: 1, bookingStatus: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
