import { getAllUnitsAvailability } from '../services/availabilityEngine.js';
import { calculatePriceQuote } from '../services/pricingEngine.js';
import { Unit } from '../models/Unit.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const checkAvailability = asyncHandler(async (req, res) => {
  const { checkIn, checkOut, adults } = req.query;

  if (!checkIn || !checkOut) {
    throw new ApiError(400, 'Please provide both checkIn and checkOut dates (YYYY-MM-DD).');
  }

  const requestedAdults = parseInt(adults, 10) || 1;
  const availability = await getAllUnitsAvailability(checkIn, checkOut, requestedAdults);

  const anyAvailable = availability.some(u => u.isAvailable);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        checkIn,
        checkOut,
        requestedAdults,
        anyAvailable,
        units: availability
      },
      'Availability retrieved successfully'
    )
  );
});

export const getQuote = asyncHandler(async (req, res) => {
  const {
    unitId,
    unitType,
    adults,
    nights,
    children5to10,
    infantsUnder5,
    includeNonVegPlan,
    includeBonfire
  } = req.body;

  let unit = null;
  if (unitId) {
    unit = await Unit.findById(unitId);
  } else if (unitType) {
    unit = await Unit.findOne({ unitType });
  }

  const effectiveUnitType = unit?.unitType || unitType;
  if (!effectiveUnitType) {
    throw new ApiError(400, 'unitType or unitId is required.');
  }

  try {
    const quote = calculatePriceQuote({
      unit,
      unitType: effectiveUnitType,
      adults,
      nights,
      children5to10,
      infantsUnder5,
      includeNonVegPlan,
      includeBonfire
    });

    return res.status(200).json(
      new ApiResponse(200, quote, 'Tariff quote calculated successfully')
    );
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});
