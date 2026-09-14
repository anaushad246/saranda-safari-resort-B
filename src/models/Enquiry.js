import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema({
  enquiryReference: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true // e.g. ENQ-2026-X1Y2
  },
  type: {
    type: String,
    required: true,
    enum: ['pickup_drop', 'pickup', 'sightseeing', 'event_venue', 'event', 'hourly_stay', 'general_contact']
  },
  guest: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true }
  },
  // Dynamic payload based on enquiry type
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['new', 'in_review', 'quoted', 'confirmed', 'declined', 'closed'],
    default: 'new'
  },
  quotedAmountPaise: {
    type: Number,
    default: null
  },
  internalNotes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

export const Enquiry = mongoose.model('Enquiry', enquirySchema);
