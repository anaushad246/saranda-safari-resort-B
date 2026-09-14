import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Unit } from '../models/Unit.js';
import { User } from '../models/User.js';
import connectDB from '../db/index.js';

dotenv.config();

const unitsData = [
  {
    code: 'RW-01',
    name: 'Red-and-White Cottage 1',
    unitType: 'red_white_cottage',
    maxAdults: 3,
    minAdults: 1,
    bedConfiguration: 'Double bed + extra cot',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiersPaise: {
      oneAdult: 300000,
      twoAdults: 400000,
      threeAdults: 540000,
      fourAdults: null // Strictly disallowed
    },
    features: ['Attached western bathroom', 'Hot water on request', 'Spacious verandah', 'Electricity & ceiling fans']
  },
  {
    code: 'RW-02',
    name: 'Red-and-White Cottage 2',
    unitType: 'red_white_cottage',
    maxAdults: 3,
    minAdults: 1,
    bedConfiguration: 'Double bed + extra cot',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiersPaise: {
      oneAdult: 300000,
      twoAdults: 400000,
      threeAdults: 540000,
      fourAdults: null
    },
    features: ['Attached western bathroom', 'Hot water on request', 'Spacious verandah', 'Electricity & ceiling fans']
  },
  {
    code: 'RW-03',
    name: 'Red-and-White Cottage 3',
    unitType: 'red_white_cottage',
    maxAdults: 3,
    minAdults: 1,
    bedConfiguration: 'Double bed + extra cot',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiersPaise: {
      oneAdult: 300000,
      twoAdults: 400000,
      threeAdults: 540000,
      fourAdults: null
    },
    features: ['Attached western bathroom', 'Hot water on request', 'Spacious verandah', 'Electricity & ceiling fans']
  },
  {
    code: 'RW-04',
    name: 'Red-and-White Cottage 4',
    unitType: 'red_white_cottage',
    maxAdults: 3,
    minAdults: 1,
    bedConfiguration: 'Double bed + extra cot',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiersPaise: {
      oneAdult: 300000,
      twoAdults: 400000,
      threeAdults: 540000,
      fourAdults: null
    },
    features: ['Attached western bathroom', 'Hot water on request', 'Spacious verandah', 'Electricity & ceiling fans']
  },
  {
    code: 'LOG-01',
    name: 'Wooden Log House',
    unitType: 'wooden_log_house',
    maxAdults: 4,
    minAdults: 1,
    bedConfiguration: 'Double bed + two timber twin beds',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiersPaise: {
      oneAdult: 300000,
      twoAdults: 400000,
      threeAdults: 540000,
      fourAdults: 660000 // Valid on log house
    },
    features: ['Authentic natural timber poles', 'Attached western bathroom', 'Hot water on request', 'Large wooden verandah']
  },
  {
    code: 'OTHER-01',
    name: 'Other cottage',
    unitType: 'other_cottage',
    maxAdults: 4,
    minAdults: 1,
    bedConfiguration: 'Double bed + two twin beds',
    bathroomType: 'attached_western',
    status: 'active',
    pricingTiersPaise: {
      oneAdult: 300000,
      twoAdults: 400000,
      threeAdults: 540000,
      fourAdults: 660000 // Valid on other cottage
    },
    features: ['Standalone cottage', 'Attached western bathroom', 'Hot water on request', 'Mango orchard outlook']
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
    campingRatesPaise: {
      perPerson: 149900,
      couple: 299900 // Strictly 299900 (never 299800)
    },
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
    campingRatesPaise: {
      perPerson: 149900,
      couple: 299900
    },
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
