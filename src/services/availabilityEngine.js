import { Unit } from '../models/Unit.js';
import { Booking } from '../models/Booking.js';
import { BlockedDate } from '../models/BlockedDate.js';

/**
 * Normalizes input date strings into exact property check-in/out timestamps.
 * Cottages: 09:00 AM check-in, 09:00 AM check-out next day
 * Camping: 16:00 PM check-in, 09:00 AM check-out next day
 */
export function normalizeStayTimestamps(checkInDateStr, checkOutDateStr, isCamping = false) {
  const checkIn = new Date(checkInDateStr);
  const checkOut = new Date(checkOutDateStr);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    throw new Error('Invalid check-in or check-out date format.');
  }

  if (isCamping) {
    checkIn.setHours(16, 0, 0, 0); // 4:00 PM
  } else {
    checkIn.setHours(9, 0, 0, 0);  // 9:00 AM
  }

  checkOut.setHours(9, 0, 0, 0);   // 9:00 AM

  if (checkOut <= checkIn) {
    throw new Error('Check-out timestamp must be after check-in timestamp.');
  }

  return { checkIn, checkOut };
}

/**
 * Checks if a specific unit is available across the requested timestamp range.
 * Uses half-open interval overlap check:
 * existing.start < requested.end && requested.start < existing.end
 */
export async function checkUnitAvailability(unitId, checkInDate, checkOutDate) {
  // 1. Check for conflicting active bookings
  const conflictingBooking = await Booking.findOne({
    unit: unitId,
    bookingStatus: { $in: ['confirmed', 'checked_in'] },
    checkIn: { $lt: checkOutDate },
    checkOut: { $gt: checkInDate }
  });

  if (conflictingBooking) {
    return {
      available: false,
      conflictType: 'booking',
      reason: 'Unit is reserved for the selected date range.'
    };
  }

  // 2. Check for manual admin blocks (unit-specific OR whole-property)
  const conflictingBlock = await BlockedDate.findOne({
    $or: [
      { unit: unitId },
      { unit: null } // Whole property blocked
    ],
    startDate: { $lt: checkOutDate },
    endDate: { $gt: checkInDate }
  });

  if (conflictingBlock) {
    return {
      available: false,
      conflictType: 'block',
      reason: `Unit is blocked for ${conflictingBlock.reason.replace('_', ' ')}.`
    };
  }

  return {
    available: true,
    conflictType: null,
    reason: null
  };
}

/**
 * Returns all active units with their availability status for the given dates.
 */
export async function getAllUnitsAvailability(checkInDateStr, checkOutDateStr, requestedAdults = 1) {
  const units = await Unit.find({ status: { $ne: 'renovation' } }).sort({ code: 1 });
  const results = [];

  for (const unit of units) {
    const isCamping = unit.unitType === 'camping_tent';
    const { checkIn, checkOut } = normalizeStayTimestamps(checkInDateStr, checkOutDateStr, isCamping);

    // Check capacity first
    let capacityAllowed = true;
    let capacityNotice = null;

    if (requestedAdults > unit.maxAdults) {
      capacityAllowed = false;
      capacityNotice = `Maximum capacity is ${unit.maxAdults} adults.`;
    }

    // Check schedule conflicts
    const scheduleCheck = await checkUnitAvailability(unit._id, checkIn, checkOut);

    results.push({
      unit: {
        _id: unit._id,
        code: unit.code,
        name: unit.name,
        unitType: unit.unitType,
        maxAdults: unit.maxAdults,
        bedConfiguration: unit.bedConfiguration,
        bathroomType: unit.bathroomType,
        status: unit.status
      },
      checkInTimestamp: checkIn.toISOString(),
      checkOutTimestamp: checkOut.toISOString(),
      isAvailable: scheduleCheck.available && capacityAllowed,
      scheduleConflict: scheduleCheck.reason,
      capacityAllowed,
      capacityNotice
    });
  }

  return results;
}
