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
  // Pricing in Indian Rupees (₹ INR) for direct human reading and input
  pricingTiers: {
    oneAdult: { type: Number, default: 3000 },    // ₹3,000
    twoAdults: { type: Number, default: 4000 },   // ₹4,000
    threeAdults: { type: Number, default: 5400 }, // ₹5,400
    fourAdults: { type: Number, default: null }   // ₹6,600 (only valid on log house / other cottage)
  },
  campingRates: {
    perPerson: { type: Number, default: 1499 },   // ₹1,499
    couple: { type: Number, default: 2999 }       // ₹2,999
  },
  addons: {
    child5to10: { type: Number, default: 700 }, // ₹700
    nonVegAdult: { type: Number, default: 300 }, // ₹300
    nonVegChild: { type: Number, default: 150 }, // ₹150
    bonfirePerPerson: { type: Number, default: 250 } // ₹250
  },
  // Pricing in integer paise (1 Rupee = 100 paise) kept in sync for financial safety
  pricingTiersPaise: {
    oneAdult: { type: Number, default: 300000 },
    twoAdults: { type: Number, default: 400000 },
    threeAdults: { type: Number, default: 540000 },
    fourAdults: { type: Number, default: null }
  },
  campingRatesPaise: {
    perPerson: { type: Number, default: 149900 },
    couple: { type: Number, default: 299900 }
  },
  addonsPaise: {
    child5to10Paise: { type: Number, default: 70000 },
    nonVegAdultPaise: { type: Number, default: 30000 },
    nonVegChildPaise: { type: Number, default: 15000 },
    bonfirePerPersonPaise: { type: Number, default: 25000 }
  },
  features: [{ type: String }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Sync Rupees and Paise automatically before saving
unitSchema.pre('save', function (next) {
  // Sync pricingTiers (Rupees) -> pricingTiersPaise
  if (this.pricingTiers) {
    if (!this.pricingTiersPaise) this.pricingTiersPaise = {};
    ['oneAdult', 'twoAdults', 'threeAdults', 'fourAdults'].forEach((tier) => {
      const val = this.pricingTiers[tier];
      this.pricingTiersPaise[tier] = val === null || val === undefined ? null : Math.round(val * 100);
    });
  }

  // Sync campingRates (Rupees) -> campingRatesPaise
  if (this.campingRates) {
    if (!this.campingRatesPaise) this.campingRatesPaise = {};
    if (this.campingRates.perPerson !== undefined) {
      this.campingRatesPaise.perPerson = Math.round(this.campingRates.perPerson * 100);
    }
    if (this.campingRates.couple !== undefined) {
      this.campingRatesPaise.couple = Math.round(this.campingRates.couple * 100);
    }
  }

  // Sync addons (Rupees) -> addonsPaise
  if (this.addons) {
    if (!this.addonsPaise) this.addonsPaise = {};
    if (this.addons.child5to10 !== undefined) {
      this.addonsPaise.child5to10Paise = Math.round(this.addons.child5to10 * 100);
    }
    if (this.addons.nonVegAdult !== undefined) {
      this.addonsPaise.nonVegAdultPaise = Math.round(this.addons.nonVegAdult * 100);
    }
    if (this.addons.nonVegChild !== undefined) {
      this.addonsPaise.nonVegChildPaise = Math.round(this.addons.nonVegChild * 100);
    }
    if (this.addons.bonfirePerPerson !== undefined) {
      this.addonsPaise.bonfirePerPersonPaise = Math.round(this.addons.bonfirePerPerson * 100);
    }
  }

  next();
});

export const Unit = mongoose.model('Unit', unitSchema);
