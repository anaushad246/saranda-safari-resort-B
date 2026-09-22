import { Unit } from '../models/Unit.js';
import { Booking } from '../models/Booking.js';
import { BlockedDate } from '../models/BlockedDate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// Adult ceiling per unitType. `red_white_cottage` is the strictly-3-adult group
// (Cherry Blossom and Gulmohar); the other two cottage types take 4. The pricing
// engine enforces the 3-adult rule independently, so a bad value here cannot be
// exploited — it would only make the inventory disagree with the engine.
const ADULT_CAP_BY_UNIT_TYPE = {
  red_white_cottage: 3,
  wooden_log_house: 4,
  other_cottage: 4,
  camping_tent: 3
};

function assertCapacityMatchesType(unitType, maxAdults) {
  const cap = ADULT_CAP_BY_UNIT_TYPE[unitType];
  if (cap === undefined) {
    throw new ApiError(400, `Unknown unit type: ${unitType}`);
  }
  const adults = Number(maxAdults);
  if (!Number.isInteger(adults) || adults < 1 || adults > cap) {
    throw new ApiError(
      400,
      `A ${unitType.replace(/_/g, ' ')} holds at most ${cap} adults, so maxAdults must be a whole number between 1 and ${cap}.`
    );
  }
}

export const getUnits = asyncHandler(async (req, res) => {
  const units = await Unit.find().sort({ code: 1 });
  return res.status(200).json(
    new ApiResponse(200, units, 'Units retrieved successfully')
  );
});

export const createUnit = asyncHandler(async (req, res) => {
  const {
    code,
    name,
    unitType,
    maxAdults,
    minAdults,
    bedConfiguration,
    bathroomType,
    status,
    features
  } = req.body;

  const required = { code, name, unitType, bedConfiguration, bathroomType };
  for (const [field, value] of Object.entries(required)) {
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new ApiError(400, `${field} is required.`);
    }
  }

  assertCapacityMatchesType(unitType, maxAdults);

  const normalisedCode = String(code).trim().toUpperCase();
  const clash = await Unit.findOne({ code: normalisedCode });
  if (clash) {
    throw new ApiError(409, `Unit code ${normalisedCode} is already used by ${clash.name}.`);
  }

  const resolvedMin = minAdults === undefined ? 1 : Number(minAdults);
  if (resolvedMin > Number(maxAdults)) {
    throw new ApiError(400, `minAdults (${resolvedMin}) cannot exceed maxAdults (${maxAdults}).`);
  }

  const unit = new Unit({
    code: normalisedCode,
    name: String(name).trim(),
    unitType,
    maxAdults: Number(maxAdults),
    minAdults: resolvedMin,
    bedConfiguration: String(bedConfiguration).trim(),
    bathroomType,
    status: status || 'active',
    features: Array.isArray(features) ? features : []
  });

  // Rates may be supplied inline; anything omitted keeps the schema default and can be
  // set later from the Pricing Manager.
  Object.assign(unit, normalizePricingPayload(req.body));

  await unit.save();

  return res.status(201).json(
    new ApiResponse(201, unit, `Unit ${unit.code} created`)
  );
});

// Partial update. The Inventory screen's status dropdown sends only `{ status }`, so
// that path is unchanged; capacity is re-validated whenever it actually moves.
export const updateUnit = asyncHandler(async (req, res) => {
  const unit = await Unit.findById(req.params.id);
  if (!unit) {
    throw new ApiError(404, 'Unit not found');
  }

  const {
    code,
    name,
    unitType,
    maxAdults,
    minAdults,
    bedConfiguration,
    bathroomType,
    status,
    features
  } = req.body;

  const nextType = unitType === undefined ? unit.unitType : unitType;
  const nextMax = maxAdults === undefined ? unit.maxAdults : Number(maxAdults);

  // Only validate capacity when the caller is actually moving it. The Inventory screen's
  // status dropdown sends `{ status }` alone, and that must never fail on account of a
  // stored capacity — the pricing engine enforces the 3-adult rule independently anyway,
  // so a legacy bad value is harmless rather than worth blocking a status change over.
  if (unitType !== undefined || maxAdults !== undefined) {
    assertCapacityMatchesType(nextType, nextMax);
  }

  const nextMin = minAdults === undefined ? unit.minAdults : Number(minAdults);
  if (nextMin > nextMax) {
    throw new ApiError(400, `minAdults (${nextMin}) cannot exceed maxAdults (${nextMax}).`);
  }

  if (code !== undefined) {
    const normalisedCode = String(code).trim().toUpperCase();
    if (normalisedCode !== unit.code) {
      const clash = await Unit.findOne({ code: normalisedCode });
      if (clash) {
        throw new ApiError(409, `Unit code ${normalisedCode} is already used by ${clash.name}.`);
      }
      unit.code = normalisedCode;
    }
  }

  if (name !== undefined) unit.name = String(name).trim();
  if (unitType !== undefined) unit.unitType = unitType;
  if (maxAdults !== undefined) unit.maxAdults = nextMax;
  if (minAdults !== undefined) unit.minAdults = nextMin;
  if (bedConfiguration !== undefined) unit.bedConfiguration = String(bedConfiguration).trim();
  if (bathroomType !== undefined) unit.bathroomType = bathroomType;
  if (status !== undefined) unit.status = status;
  if (features !== undefined && Array.isArray(features)) unit.features = features;

  await unit.save();

  return res.status(200).json(
    new ApiResponse(200, unit, `Unit ${unit.code} updated`)
  );
});

export const deleteUnit = asyncHandler(async (req, res) => {
  const unit = await Unit.findById(req.params.id);
  if (!unit) {
    throw new ApiError(404, 'Unit not found');
  }

  // A unit that has ever been booked or blocked carries history. Booking.unitId is a
  // required ref, so hard-deleting would orphan those records and corrupt past
  // revenue. Refuse, and point the owner at the reversible option instead.
  const [bookingCount, blockCount] = await Promise.all([
    Booking.countDocuments({ unitId: unit._id }),
    BlockedDate.countDocuments({ unit: unit._id })
  ]);

  if (bookingCount || blockCount) {
    const parts = [];
    if (bookingCount) parts.push(`${bookingCount} booking${bookingCount === 1 ? '' : 's'}`);
    if (blockCount) parts.push(`${blockCount} blocked date range${blockCount === 1 ? '' : 's'}`);

    throw new ApiError(
      409,
      `${unit.code} cannot be deleted — it is referenced by ${parts.join(' and ')}. Set its status to "private_block" to retire it instead: that removes it from booking while keeping its history intact.`
    );
  }

  await unit.deleteOne();

  return res.status(200).json(
    new ApiResponse(200, { _id: unit._id, code: unit.code }, `Unit ${unit.code} deleted`)
  );
});

// Helper to normalize user input (accepting either Rupees or Paise, converting both cleanly)
function normalizePricingPayload(body) {
  const {
    pricingTiers,
    pricingTiersRupees,
    pricingTiersPaise,
    campingRates,
    campingRatesRupees,
    campingRatesPaise,
    addons,
    addonsRupees,
    addonsPaise
  } = body;

  const updateFields = {};

  // 1. Pricing Tiers (Cottages)
  const incomingTiers = pricingTiers || pricingTiersRupees;
  if (incomingTiers !== undefined) {
    updateFields.pricingTiers = {};
    updateFields.pricingTiersPaise = {};
    for (const [k, v] of Object.entries(incomingTiers)) {
      if (v === null || v === undefined) {
        updateFields.pricingTiers[k] = null;
        updateFields.pricingTiersPaise[k] = null;
      } else {
        const num = Number(v);
        // If user sends 3500 (rupees)
        updateFields.pricingTiers[k] = num;
        updateFields.pricingTiersPaise[k] = Math.round(num * 100);
      }
    }
  } else if (pricingTiersPaise !== undefined) {
    // If sent via pricingTiersPaise key, auto-detect rupees vs paise
    updateFields.pricingTiers = {};
    updateFields.pricingTiersPaise = {};
    for (const [k, v] of Object.entries(pricingTiersPaise)) {
      if (v === null || v === undefined) {
        updateFields.pricingTiers[k] = null;
        updateFields.pricingTiersPaise[k] = null;
      } else {
        const num = Number(v);
        // Explicitly in Paise
        updateFields.pricingTiersPaise[k] = num;
        updateFields.pricingTiers[k] = Math.round(num / 100);
      }
    }
  }

  // 2. Camping Rates
  const incomingCamping = campingRates || campingRatesRupees;
  if (incomingCamping !== undefined) {
    updateFields.campingRates = {};
    updateFields.campingRatesPaise = {};
    if (incomingCamping.perPerson !== undefined) {
      const p = Number(incomingCamping.perPerson);
      updateFields.campingRates.perPerson = p;
      updateFields.campingRatesPaise.perPerson = Math.round(p * 100);
    }
    if (incomingCamping.couple !== undefined) {
      const c = Number(incomingCamping.couple);
      updateFields.campingRates.couple = c;
      updateFields.campingRatesPaise.couple = Math.round(c * 100);
    }
  } else if (campingRatesPaise !== undefined) {
    updateFields.campingRates = {};
    updateFields.campingRatesPaise = {};
    for (const [k, v] of Object.entries(campingRatesPaise)) {
      const num = Number(v);
      // Explicitly in Paise
      updateFields.campingRatesPaise[k] = num;
      updateFields.campingRates[k] = Math.round(num / 100);
    }
  }

  // 3. Addons
  const incomingAddons = addons || addonsRupees;
  if (incomingAddons !== undefined) {
    updateFields.addons = {};
    updateFields.addonsPaise = {};
    if (incomingAddons.child5to10 !== undefined) {
      const c = Number(incomingAddons.child5to10);
      updateFields.addons.child5to10 = c;
      updateFields.addonsPaise.child5to10Paise = Math.round(c * 100);
    }
    if (incomingAddons.nonVegAdult !== undefined) {
      const a = Number(incomingAddons.nonVegAdult);
      updateFields.addons.nonVegAdult = a;
      updateFields.addonsPaise.nonVegAdultPaise = Math.round(a * 100);
    }
    if (incomingAddons.nonVegChild !== undefined) {
      const nc = Number(incomingAddons.nonVegChild);
      updateFields.addons.nonVegChild = nc;
      updateFields.addonsPaise.nonVegChildPaise = Math.round(nc * 100);
    }
    if (incomingAddons.bonfirePerPerson !== undefined) {
      const b = Number(incomingAddons.bonfirePerPerson);
      updateFields.addons.bonfirePerPerson = b;
      updateFields.addonsPaise.bonfirePerPersonPaise = Math.round(b * 100);
    }
  } else if (addonsPaise !== undefined) {
    updateFields.addonsPaise = addonsPaise;
    updateFields.addons = {
      child5to10: addonsPaise.child5to10Paise ? Math.round(Number(addonsPaise.child5to10Paise) / 100) : undefined,
      nonVegAdult: addonsPaise.nonVegAdultPaise ? Math.round(Number(addonsPaise.nonVegAdultPaise) / 100) : undefined,
      nonVegChild: addonsPaise.nonVegChildPaise ? Math.round(Number(addonsPaise.nonVegChildPaise) / 100) : undefined,
      bonfirePerPerson: addonsPaise.bonfirePerPersonPaise ? Math.round(Number(addonsPaise.bonfirePerPersonPaise) / 100) : undefined
    };
  }

  return updateFields;
}

export const updateUnitPricing = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { applyToAllOfType } = req.body;

  const unit = await Unit.findById(id);
  if (!unit) {
    throw new ApiError(404, 'Unit not found');
  }

  const updateFields = normalizePricingPayload(req.body);

  if (applyToAllOfType) {
    await Unit.updateMany(
      { unitType: unit.unitType },
      { $set: updateFields }
    );
    const updatedUnits = await Unit.find({ unitType: unit.unitType }).sort({ code: 1 });
    return res.status(200).json(
      new ApiResponse(200, { updatedUnits, count: updatedUnits.length }, `Pricing updated for all ${unit.unitType} units in Rupees`)
    );
  } else {
    // Apply to single unit
    if (updateFields.pricingTiers) unit.pricingTiers = { ...unit.pricingTiers, ...updateFields.pricingTiers };
    if (updateFields.pricingTiersPaise) unit.pricingTiersPaise = { ...unit.pricingTiersPaise, ...updateFields.pricingTiersPaise };
    if (updateFields.campingRates) unit.campingRates = { ...unit.campingRates, ...updateFields.campingRates };
    if (updateFields.campingRatesPaise) unit.campingRatesPaise = { ...unit.campingRatesPaise, ...updateFields.campingRatesPaise };
    if (updateFields.addons) unit.addons = { ...unit.addons, ...updateFields.addons };
    if (updateFields.addonsPaise) unit.addonsPaise = { ...unit.addonsPaise, ...updateFields.addonsPaise };

    await unit.save();
    return res.status(200).json(
      new ApiResponse(200, unit, `Pricing updated for unit ${unit.code} in Rupees`)
    );
  }
});

export const updatePricingByType = asyncHandler(async (req, res) => {
  const { unitType } = req.body;

  if (!unitType) {
    throw new ApiError(400, 'unitType is required');
  }

  const updateFields = normalizePricingPayload(req.body);

  await Unit.updateMany({ unitType }, { $set: updateFields });
  const updatedUnits = await Unit.find({ unitType }).sort({ code: 1 });

  return res.status(200).json(
    new ApiResponse(200, updatedUnits, `Pricing updated for all ${unitType} units in Rupees`)
  );
});
