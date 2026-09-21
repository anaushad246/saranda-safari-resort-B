import { Unit } from '../models/Unit.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getUnits = asyncHandler(async (req, res) => {
  const units = await Unit.find().sort({ code: 1 });
  return res.status(200).json(
    new ApiResponse(200, units, 'Units retrieved successfully')
  );
});

export const updateUnitStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const unit = await Unit.findById(req.params.id);

  if (!unit) {
    throw new ApiError(404, 'Unit not found');
  }

  if (status) unit.status = status;
  await unit.save();

  return res.status(200).json(
    new ApiResponse(200, unit, 'Unit status updated')
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
