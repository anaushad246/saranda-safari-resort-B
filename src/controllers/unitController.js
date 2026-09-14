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

export const updateUnitPricing = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { pricingTiersPaise, campingRatesPaise, addonsPaise, applyToAllOfType } = req.body;

  const unit = await Unit.findById(id);
  if (!unit) {
    throw new ApiError(404, 'Unit not found');
  }

  const updateFields = {};
  if (pricingTiersPaise !== undefined) updateFields.pricingTiersPaise = pricingTiersPaise;
  if (campingRatesPaise !== undefined) updateFields.campingRatesPaise = campingRatesPaise;
  if (addonsPaise !== undefined) updateFields.addonsPaise = addonsPaise;

  if (applyToAllOfType) {
    await Unit.updateMany(
      { unitType: unit.unitType },
      { $set: updateFields }
    );
    const updatedUnits = await Unit.find({ unitType: unit.unitType }).sort({ code: 1 });
    return res.status(200).json(
      new ApiResponse(200, { updatedUnits, count: updatedUnits.length }, `Pricing updated for all ${unit.unitType} units`)
    );
  } else {
    Object.assign(unit, updateFields);
    await unit.save();
    return res.status(200).json(
      new ApiResponse(200, unit, `Pricing updated for unit ${unit.code}`)
    );
  }
});

export const updatePricingByType = asyncHandler(async (req, res) => {
  const { unitType, pricingTiersPaise, campingRatesPaise, addonsPaise } = req.body;

  if (!unitType) {
    throw new ApiError(400, 'unitType is required');
  }

  const updateFields = {};
  if (pricingTiersPaise !== undefined) updateFields.pricingTiersPaise = pricingTiersPaise;
  if (campingRatesPaise !== undefined) updateFields.campingRatesPaise = campingRatesPaise;
  if (addonsPaise !== undefined) updateFields.addonsPaise = addonsPaise;

  await Unit.updateMany({ unitType }, { $set: updateFields });
  const updatedUnits = await Unit.find({ unitType }).sort({ code: 1 });

  return res.status(200).json(
    new ApiResponse(200, updatedUnits, `Pricing updated for all ${unitType} units`)
  );
});
