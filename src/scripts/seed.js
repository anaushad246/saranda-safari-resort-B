import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Unit } from '../models/Unit.js';
import { User } from '../models/User.js';
import connectDB from '../db/index.js';

dotenv.config();

const unitsData = [
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
  {
    code: 'TENT-A',
    name: 'Wilderness Camping Tent A',
    unitType: 'camping_tent',
    maxAdults: 2,
    minAdults: 1,
    bedConfiguration: 'Ground camping mattresses & sleeping gear',
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
    bedConfiguration: 'Ground camping mattresses & sleeping gear',
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
    console.log('[Seed]: 6 Cottages/Log Houses + 2 Camping Tents populated (Capacity: 25 Overnight Guests).');

    // 2. Seed Default Owner Account
    const existingOwner = await User.findOne({ email: 'owner@sarandasafariresort.com' });
    if (!existingOwner) {
      await User.create({
        name: 'Resort Administrator',
        email: 'owner@sarandasafariresort.com',
        password: 'Admin@Saranda1998',
        role: 'owner',
        isActive: true
      });
      console.log('[Seed]: Default owner user created (owner@sarandasafariresort.com / Admin@Saranda1998)');
    } else {
      console.log('[Seed]: Owner user already exists.');
    }

    console.log('[Seed]: Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error.message);
    process.exit(1);
  }
};

seedDatabase();
