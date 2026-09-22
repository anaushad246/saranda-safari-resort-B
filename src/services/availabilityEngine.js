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
  // 1. Verify Unit status (Maintenance / Renovation / Private Block)
  const unit = await Unit.findById(unitId);
  if (!unit) {
    return {
      available: false,
      conflictType: 'not_found',
      reason: 'Unit does not exist.'
    };
  }

  if (unit.status !== 'active') {
    return {
      available: false,
      conflictType: 'unit_status',
      reason: `Unit is currently unavailable due to ${unit.status.replace('_', ' ')}.`
    };
  }

  // 2. Check for conflicting active bookings (confirmed, checked_in, or active pending hold)
  const now = new Date();
  const conflictingBooking = await Booking.findOne({
    unit: unitId,
    checkIn: { $lt: checkOutDate },
    checkOut: { $gt: checkInDate },
    $or: [
      { bookingStatus: { $in: ['confirmed', 'checked_in'] } },
      {
        bookingStatus: 'pending',
        holdExpiresAt: { $gt: now }
      }
    ]
  });

  if (conflictingBooking) {
    const isPendingHold = conflictingBooking.bookingStatus === 'pending';
    return {
      available: false,
      conflictType: 'booking',
      reason: isPendingHold
        ? 'Unit is temporarily on hold awaiting advance payment confirmation.'
        : 'Unit is reserved for the selected date range.'
    };
  }

  // 3. Check for manual admin blocks (unit-specific OR whole-property)
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
 * Returns all units with their availability status for the given dates.
 * Considers unit.status ('active' vs 'maintenance'/'renovation'), capacity limit, active bookings and date blocks.
 */
export async function getAllUnitsAvailability(checkInDateStr, checkOutDateStr, requestedAdults = 1) {
  const units = await Unit.find().sort({ code: 1 });
  const cottageTimestamps = normalizeStayTimestamps(checkInDateStr, checkOutDateStr, false);
  const campingTimestamps = normalizeStayTimestamps(checkInDateStr, checkOutDateStr, true);

  const now = new Date();
  // Fetch all overlapping bookings & blocks concurrently to optimize performance
  const [overlappingBookings, overlappingBlocks] = await Promise.all([
    Booking.find({
      checkIn: { $lt: cottageTimestamps.checkOut },
      checkOut: { $gt: cottageTimestamps.checkIn },
      $or: [
        { bookingStatus: { $in: ['confirmed', 'checked_in'] } },
        {
          bookingStatus: 'pending',
          holdExpiresAt: { $gt: now }
        }
      ]
    }).select('unit checkIn checkOut bookingStatus holdExpiresAt'),
    BlockedDate.find({
      startDate: { $lt: cottageTimestamps.checkOut },
      endDate: { $gt: cottageTimestamps.checkIn }
    }).select('unit startDate endDate reason')
  ]);

  const bookedUnitMap = new Map();
  overlappingBookings.forEach(b => {
    const msg = b.bookingStatus === 'pending'
      ? 'Unit is temporarily on hold awaiting advance payment confirmation.'
      : 'Unit is already booked for these dates.';
    bookedUnitMap.set(String(b.unit), msg);
  });
  const wholePropertyBlock = overlappingBlocks.find(b => !b.unit);
  const blockedUnitMap = new Map();
  overlappingBlocks.forEach(b => {
    if (b.unit) blockedUnitMap.set(String(b.unit), b.reason);
  });

  const results = [];

  for (const unit of units) {
    const isCamping = unit.unitType === 'camping_tent';
    const { checkIn, checkOut } = isCamping ? campingTimestamps : cottageTimestamps;

    let isOperational = unit.status === 'active';
    let statusNotice = isOperational ? null : `Unit is currently under ${unit.status.replace('_', ' ')}.`;

    // Capacity validation
    let capacityAllowed = true;
    let capacityNotice = null;
    if (requestedAdults > unit.maxAdults) {
      capacityAllowed = false;
      capacityNotice = `Maximum capacity is ${unit.maxAdults} adults.`;
    }

    // Schedule conflict evaluation
    let scheduleConflict = null;
    if (wholePropertyBlock) {
      scheduleConflict = `Resort is closed for ${wholePropertyBlock.reason.replace('_', ' ')}.`;
    } else if (blockedUnitMap.has(String(unit._id))) {
      scheduleConflict = `Unit is blocked for ${blockedUnitMap.get(String(unit._id)).replace('_', ' ')}.`;
    } else if (bookedUnitMap.has(String(unit._id))) {
      scheduleConflict = bookedUnitMap.get(String(unit._id));
    }

    const isAvailable = isOperational && capacityAllowed && !scheduleConflict;

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
      isAvailable,
      scheduleConflict: statusNotice || scheduleConflict,
      capacityAllowed,
      capacityNotice
    });
  }

  return results;
}

/**
 * Derived capacity of the property, computed from units currently marked active.
 *
 * This is the single source of truth for the overnight ceiling. It is never a
 * hardcoded number, so it moves automatically as units are added, blocked
 * (maintenance/renovation/private_block), or retired.
 *
 * Inactive units are already unbookable (see checkUnitAvailability / the
 * isOperational flag in getAllUnitsAvailability) and every booking is capped at
 * its own unit's maxAdults, so this total is the natural ceiling — it is exposed
 * for display and admin visibility rather than as an extra runtime guard.
 */
export async function getActiveCapacity() {
  const units = await Unit.find({ status: 'active' }).select('unitType maxAdults');

  const isTent = (u) => u.unitType === 'camping_tent';
  const sum = (list) => list.reduce((total, u) => total + (u.maxAdults || 0), 0);

  const cottages = units.filter((u) => !isTent(u));
  const tents = units.filter(isTent);

  return {
    activeUnits: units.length,
    activeCottages: cottages.length,
    activeTents: tents.length,
    cottageAdults: sum(cottages),
    tentAdults: sum(tents),
    totalAdults: sum(units)
  };
}
