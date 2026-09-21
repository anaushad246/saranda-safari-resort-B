import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Unit } from '../models/Unit.js';
import { User } from '../models/User.js';
import connectDB from '../db/index.js';

dotenv.config();

// Complete Master Inventory: 14 Cottages/Log Houses + 2 Wilderness Safari Tents = 16 Total Units
const unitsData = [
  // 1. Riverwood (1 unit, max 4 guests)
  {
    code: 'RW-01',
    name: 'Riverwood',
    unitType: 'wooden_log_house',
    maxAdults: 4,
    minAdults: 1,
    bedConfiguration: 'Double bed + two timber twin beds',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiers: { oneAdult: 3000, twoAdults: 4000, threeAdults: 5400, fourAdults: 6600 },
    pricingTiersPaise: { oneAdult: 300000, twoAdults: 400000, threeAdults: 540000, fourAdults: 660000 },
    features: ['Authentic natural timber poles', 'Attached western bathroom', 'Hot water on request', 'River-facing veranda']
  },

  // 2. Cherry Blossom (4 units, max 3 guests each)
  {
    code: 'CB-01',
    name: 'Cherry Blossom 1',
    unitType: 'red_white_cottage',
    maxAdults: 3,
    minAdults: 1,
    bedConfiguration: 'Double bed + extra cot',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiers: { oneAdult: 3000, twoAdults: 4000, threeAdults: 5400, fourAdults: null },
    pricingTiersPaise: { oneAdult: 300000, twoAdults: 400000, threeAdults: 540000, fourAdults: null },
    features: ['Direct Karo River view', 'Attached western bathroom', 'Graceful arched veranda', 'Electricity & ceiling fans']
  },
  {
    code: 'CB-02',
    name: 'Cherry Blossom 2',
    unitType: 'red_white_cottage',
    maxAdults: 3,
    minAdults: 1,
    bedConfiguration: 'Double bed + extra cot',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiers: { oneAdult: 3000, twoAdults: 4000, threeAdults: 5400, fourAdults: null },
    pricingTiersPaise: { oneAdult: 300000, twoAdults: 400000, threeAdults: 540000, fourAdults: null },
    features: ['Direct Karo River view', 'Attached western bathroom', 'Graceful arched veranda', 'Electricity & ceiling fans']
  },
  {
    code: 'CB-03',
    name: 'Cherry Blossom 3',
    unitType: 'red_white_cottage',
    maxAdults: 3,
    minAdults: 1,
    bedConfiguration: 'Double bed + extra cot',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiers: { oneAdult: 3000, twoAdults: 4000, threeAdults: 5400, fourAdults: null },
    pricingTiersPaise: { oneAdult: 300000, twoAdults: 400000, threeAdults: 540000, fourAdults: null },
    features: ['Direct Karo River view', 'Attached western bathroom', 'Graceful arched veranda', 'Electricity & ceiling fans']
  },
  {
    code: 'CB-04',
    name: 'Cherry Blossom 4',
    unitType: 'red_white_cottage',
    maxAdults: 3,
    minAdults: 1,
    bedConfiguration: 'Double bed + extra cot',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiers: { oneAdult: 3000, twoAdults: 4000, threeAdults: 5400, fourAdults: null },
    pricingTiersPaise: { oneAdult: 300000, twoAdults: 400000, threeAdults: 540000, fourAdults: null },
    features: ['Direct Karo River view', 'Attached western bathroom', 'Graceful arched veranda', 'Electricity & ceiling fans']
  },

  // 3. Autumn Abode (3 units, max 4 guests each)
  {
    code: 'AA-01',
    name: 'Autumn Abode 1',
    unitType: 'other_cottage',
    maxAdults: 4,
    minAdults: 1,
    bedConfiguration: 'Double bed + twin beds',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiers: { oneAdult: 3000, twoAdults: 4000, threeAdults: 5400, fourAdults: 6600 },
    pricingTiersPaise: { oneAdult: 300000, twoAdults: 400000, threeAdults: 540000, fourAdults: 660000 },
    features: ['Golden-yellow pillars', 'Sunrise rays outlook', 'Attached western bathroom', 'Veranda beneath leafy shade']
  },
  {
    code: 'AA-02',
    name: 'Autumn Abode 2',
    unitType: 'other_cottage',
    maxAdults: 4,
    minAdults: 1,
    bedConfiguration: 'Double bed + twin beds',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiers: { oneAdult: 3000, twoAdults: 4000, threeAdults: 5400, fourAdults: 6600 },
    pricingTiersPaise: { oneAdult: 300000, twoAdults: 400000, threeAdults: 540000, fourAdults: 660000 },
    features: ['Golden-yellow pillars', 'Sunrise rays outlook', 'Attached western bathroom', 'Veranda beneath leafy shade']
  },
  {
    code: 'AA-03',
    name: 'Autumn Abode 3',
    unitType: 'other_cottage',
    maxAdults: 4,
    minAdults: 1,
    bedConfiguration: 'Double bed + twin beds',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiers: { oneAdult: 3000, twoAdults: 4000, threeAdults: 5400, fourAdults: 6600 },
    pricingTiersPaise: { oneAdult: 300000, twoAdults: 400000, threeAdults: 540000, fourAdults: 660000 },
    features: ['Golden-yellow pillars', 'Sunrise rays outlook', 'Attached western bathroom', 'Veranda beneath leafy shade']
  },

  // 4. Spring Abode (4 units, max 4 guests each)
  {
    code: 'SA-01',
    name: 'Spring Abode 1',
    unitType: 'other_cottage',
    maxAdults: 4,
    minAdults: 1,
    bedConfiguration: 'Double bed + twin beds',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiers: { oneAdult: 3000, twoAdults: 4000, threeAdults: 5400, fourAdults: 6600 },
    pricingTiersPaise: { oneAdult: 300000, twoAdults: 400000, threeAdults: 540000, fourAdults: 660000 },
    features: ['Open green lawn outlook', 'Spacious sit-out veranda', 'Attached western bathroom', 'Family-friendly atmosphere']
  },
  {
    code: 'SA-02',
    name: 'Spring Abode 2',
    unitType: 'other_cottage',
    maxAdults: 4,
    minAdults: 1,
    bedConfiguration: 'Double bed + twin beds',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiers: { oneAdult: 3000, twoAdults: 4000, threeAdults: 5400, fourAdults: 6600 },
    pricingTiersPaise: { oneAdult: 300000, twoAdults: 400000, threeAdults: 540000, fourAdults: 660000 },
    features: ['Open green lawn outlook', 'Spacious sit-out veranda', 'Attached western bathroom', 'Family-friendly atmosphere']
  },
  {
    code: 'SA-03',
    name: 'Spring Abode 3',
    unitType: 'other_cottage',
    maxAdults: 4,
    minAdults: 1,
    bedConfiguration: 'Double bed + twin beds',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiers: { oneAdult: 3000, twoAdults: 4000, threeAdults: 5400, fourAdults: 6600 },
    pricingTiersPaise: { oneAdult: 300000, twoAdults: 400000, threeAdults: 540000, fourAdults: 660000 },
    features: ['Open green lawn outlook', 'Spacious sit-out veranda', 'Attached western bathroom', 'Family-friendly atmosphere']
  },
  {
    code: 'SA-04',
    name: 'Spring Abode 4',
    unitType: 'other_cottage',
    maxAdults: 4,
    minAdults: 1,
    bedConfiguration: 'Double bed + twin beds',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiers: { oneAdult: 3000, twoAdults: 4000, threeAdults: 5400, fourAdults: 6600 },
    pricingTiersPaise: { oneAdult: 300000, twoAdults: 400000, threeAdults: 540000, fourAdults: 660000 },
    features: ['Open green lawn outlook', 'Spacious sit-out veranda', 'Attached western bathroom', 'Family-friendly atmosphere']
  },

  // 5. Gulmohar (1 unit, max 3 guests)
  {
    code: 'GM-01',
    name: 'Gulmohar',
    unitType: 'red_white_cottage',
    maxAdults: 3,
    minAdults: 1,
    bedConfiguration: 'Double bed + extra cot',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiers: { oneAdult: 3000, twoAdults: 4000, threeAdults: 5400, fourAdults: null },
    pricingTiersPaise: { oneAdult: 300000, twoAdults: 400000, threeAdults: 540000, fourAdults: null },
    features: ['Warm red wooden walls', 'Yellow window frames', 'Elevated landscape outlook', 'Attached western bathroom']
  },

  // 6. Amberwood (1 unit, max 4 guests)
  {
    code: 'AW-01',
    name: 'Amberwood',
    unitType: 'other_cottage',
    maxAdults: 4,
    minAdults: 1,
    bedConfiguration: 'Double bed + twin beds',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiers: { oneAdult: 3000, twoAdults: 4000, threeAdults: 5400, fourAdults: 6600 },
    pricingTiersPaise: { oneAdult: 300000, twoAdults: 400000, threeAdults: 540000, fourAdults: 660000 },
    features: ['Rustic wooden charm', 'Earth-toned decor', 'Dappled canopy shade', 'Attached western bathroom']
  },

  // 7. Wilderness Camping Tents (2 units, total 5 guests capacity)
  {
    code: 'TENT-A',
    name: 'Wilderness Camping Tent A',
    unitType: 'camping_tent',
    maxAdults: 2,
    minAdults: 1,
    bedConfiguration: 'Ground camping mattresses & sleeping gear (2 guests)',
    bathroomType: 'shared_block',
    status: 'active',
    campingRates: { perPerson: 1499, couple: 2999 },
    campingRatesPaise: { perPerson: 149900, couple: 299900 },
    features: ['Weatherproof canvas tent', 'Bonfire included', 'Riverfront lawn location', 'Clean shared washrooms']
  },
  {
    code: 'TENT-B',
    name: 'Wilderness Camping Tent B',
    unitType: 'camping_tent',
    maxAdults: 3,
    minAdults: 1,
    bedConfiguration: 'Ground camping mattresses & sleeping gear (3 guests)',
    bathroomType: 'shared_block',
    status: 'active',
    campingRates: { perPerson: 1499, couple: 2999 },
    campingRatesPaise: { perPerson: 149900, couple: 299900 },
    features: ['Weatherproof canvas tent', 'Bonfire included', 'Riverfront lawn location', 'Clean shared washrooms']
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('[Seed]: Connected to MongoDB');

    // 1. Seed Units
    console.log('[Seed]: Populating inventory units...');
    for (const unitItem of unitsData) {
      await Unit.findOneAndUpdate(
        { code: unitItem.code },
        unitItem,
        { upsert: true, returnDocument: 'after' }
      );
    }
    console.log(`[Seed]: ${unitsData.length} units successfully populated (14 Cottages + 2 Camping Tents).`);

    // 2. Seed Default Owner Account
    const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@Saranda1998';
    const existingOwner = await User.findOne({ email: 'owner@sarandasafariresort.com' });
    if (!existingOwner) {
      await User.create({
        name: 'Resort Administrator',
        email: 'owner@sarandasafariresort.com',
        password: defaultPassword,
        role: 'owner',
        isActive: true
      });
      console.log('[Seed]: Default Owner Administrator initialized.');
    } else {
      console.log('[Seed]: Owner account already exists.');
    }

    console.log('[Seed]: Database seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err.message);
    process.exit(1);
  }
};

seedDatabase();
