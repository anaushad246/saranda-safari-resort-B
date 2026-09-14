import mongoose from 'mongoose';

const unitSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true // e.g. RW-01, RW-02, LOG-01, OTHER-01, TENT-A, TENT-B
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  unitType: {
    type: String,
    required: true,
    enum: ['red_white_cottage', 'wooden_log_house', 'other_cottage', 'camping_tent']
  },
  maxAdults: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  minAdults: {
    type: Number,
    default: 1
  },
  bedConfiguration: {
    type: String,
    required: true
  },
  bathroomType: {
    type: String,
    enum: ['attached_western', 'shared_block'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'renovation', 'private_block'],
    default: 'active'
  },
  // Pricing in integer paise (1 Rupee = 100 paise) to eliminate floating point rounding errors
  pricingTiersPaise: {
    oneAdult: { type: Number, default: 300000 },    // ₹3,000
    twoAdults: { type: Number, default: 400000 },   // ₹4,000
    threeAdults: { type: Number, default: 540000 }, // ₹5,400
    fourAdults: { type: Number, default: null }     // ₹6,600 (only valid on log house / other cottage)
  },
  campingRatesPaise: {
    perPerson: { type: Number, default: 149900 },   // ₹1,499
    couple: { type: Number, default: 299900 }       // ₹2,999 strictly (never ₹2,998)
  },
  addonsPaise: {
    child5to10Paise: { type: Number, default: 70000 }, // ₹700
    nonVegAdultPaise: { type: Number, default: 30000 }, // ₹300
    nonVegChildPaise: { type: Number, default: 15000 }, // ₹150
    bonfirePerPersonPaise: { type: Number, default: 25000 } // ₹250
  },
  features: [{ type: String }]
}, {
  timestamps: true
});

export const Unit = mongoose.model('Unit', unitSchema);
