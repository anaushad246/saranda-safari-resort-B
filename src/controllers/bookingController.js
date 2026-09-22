import mongoose from 'mongoose';
import crypto from 'crypto';
import { Booking } from '../models/Booking.js';
import { Unit } from '../models/Unit.js';
import { checkUnitAvailability, normalizeStayTimestamps } from '../services/availabilityEngine.js';
import { calculatePriceQuote } from '../services/pricingEngine.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createBooking = asyncHandler(async (req, res) => {
  const {
    unitId,
    checkInDate,
    checkOutDate,
    nights = 1,
    adults = 1,
    children5to10 = 0,
    infantsUnder5 = 0,
    nonVegPlan = false,
    bonfireAddon = false,
    guest,
    source = 'website_enquiry',
    specialRequests
  } = req.body;

  if (!unitId || !checkInDate || !checkOutDate || !guest?.name || !guest?.phone) {
    throw new ApiError(400, 'Please provide unitId, checkInDate, checkOutDate, guest name, and phone.');
  }

  const cleanPhone = guest.phone.trim();
  const isStaffBooking = Boolean(req.user);

  // Anti-hoarding protection: limit concurrent active pending holds per phone number for public visitors
  if (!isStaffBooking) {
    const activePhoneHolds = await Booking.countDocuments({
      'guest.phone': cleanPhone,
      bookingStatus: 'pending',
      holdExpiresAt: { $gt: new Date() }
    });
    const maxActiveHolds = parseInt(process.env.MAX_ACTIVE_HOLDS_PER_PHONE, 10) || 1;
    if (activePhoneHolds >= maxActiveHolds) {
      throw new ApiError(
        429,
        'You already have an active pending reservation for this mobile number. Please complete payment for your existing booking or wait for the 2-hour hold window to expire.'
      );
    }
  }

  let unit = null;
  if (mongoose.Types.ObjectId.isValid(unitId)) {
    unit = await Unit.findById(unitId);
  }
  if (!unit) {
    unit = await Unit.findOne({ code: String(unitId).toUpperCase() });
  }
  if (!unit) {
    // Variety alias matching (e.g. cherry-blossom -> CB, riverwood -> RW)
    const varietyMap = {
      'riverwood': 'RW',
      'cherry-blossom': 'CB',
      'cherry_blossom': 'CB',
      'autumn-abode': 'AA',
      'autumn_abode': 'AA',
      'spring-abode': 'SA',
      'spring_abode': 'SA',
      'amberwood': 'AW',
      'gulmohar': 'GM',
      'camping-tents': 'TENT',
      'camping_tent': 'TENT'
    };
    const prefix = varietyMap[String(unitId).toLowerCase()];
    if (prefix) {
      const candidates = await Unit.find({
        status: 'active',
        code: new RegExp(`^${prefix}`, 'i')
      }).sort({ code: 1 });

      const isCamp = prefix === 'TENT';
      const stayTimestamps = normalizeStayTimestamps(checkInDate, checkOutDate, isCamp);

      for (const cand of candidates) {
        const avail = await checkUnitAvailability(cand._id, stayTimestamps.checkIn, stayTimestamps.checkOut);
        if (avail.available) {
          unit = cand;
          break;
        }
      }
      if (!unit && candidates.length > 0) {
        unit = candidates[0]; // will fail with a clear 409 unavailable below
      }
    }
  }

  if (!unit) {
    throw new ApiError(404, 'Selected unit does not exist.');
  }

  const isCamping = unit.unitType === 'camping_tent';
  const { checkIn, checkOut } = normalizeStayTimestamps(checkInDate, checkOutDate, isCamping);

  // Strict Capacity Check
  if (adults > unit.maxAdults) {
    throw new ApiError(400, "Party exceeds unit capacity: " + unit.name + " accommodates maximum " + unit.maxAdults + " adults.");
  }

  // 1. Availability check (half-open interval)
  const availability = await checkUnitAvailability(unit._id, checkIn, checkOut);
  if (!availability.available) {
    throw new ApiError(409, availability.reason || 'This unit is unavailable for the selected dates.');
  }

  // 2. Server-side Pricing Engine (Integer Paise & Strict Capacity Guard)
  const quote = calculatePriceQuote({
    unit,
    unitType: unit.unitType,
    adults,
    nights,
    children5to10,
    infantsUnder5,
    includeNonVegPlan: nonVegPlan,
    includeBonfire: bonfireAddon
  });

  // 3. Generate Unique Booking Reference: SSR-2026-XXXX
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const bookingReference = 'SSR-2026-' + randomSuffix;

  // Configurable advance percentage (default 50% as approved by owner)
  const advancePercent = parseInt(process.env.BOOKING_ADVANCE_PERCENTAGE, 10) || 50;
  const totalPaise = quote.paise.grandTotal;
  const advancePayablePaise = Math.round(totalPaise * (advancePercent / 100));
  const balanceDuePaise = totalPaise - advancePayablePaise;

  // 4. Create Booking Document with permanent priceSnapshot
  const booking = await Booking.create({
    bookingReference,
    unit: unit._id,
    unitType: unit.unitType,
    guest: {
      name: guest.name.trim(),
      phone: guest.phone.trim(),
      email: guest.email ? guest.email.trim().toLowerCase() : '',
      idType: guest.idType || 'Aadhaar / Voter ID',
      idNumber: guest.idNumber || ''
    },
    checkIn,
    checkOut,
    nights: quote.nights,
    adults: quote.adults,
    children5to10: quote.children5to10,
    infantsUnder5: quote.infantsUnder5,
    nonVegPlan,
    bonfireAddon,
    financials: {
      baseStayPaise: quote.paise.baseStayTotal,
      childrenPaise: quote.paise.childrenTotal,
      nonVegPaise: quote.paise.nonVegTotal,
      bonfirePaise: quote.paise.bonfireTotal,
      totalPaise,
      advancePayablePaise,
      balanceDuePaise
    },
    holdExpiresAt: isStaffBooking
      ? null
      : new Date(Date.now() + (parseInt(process.env.BOOKING_HOLD_MINUTES, 10) || 120) * 60 * 1000),
    paymentStatus: isStaffBooking ? 'advance_paid' : 'pending',
    bookingStatus: isStaffBooking ? 'confirmed' : 'pending',
    source: isStaffBooking ? 'admin_manual' : source,
    priceSnapshot: {
      unitName: unit.name,
      baseRateApplied: quote.inr.baseStayTotal,
      childRateApplied: quote.inr.childrenTotal,
      nonVegRateApplied: quote.inr.nonVegTotal,
      bonfireRateApplied: quote.inr.bonfireTotal,
      capturedAt: new Date()
    },
    specialRequests
  });

  return res.status(201).json(
    new ApiResponse(201, booking, 'Reservation created successfully')
  );
});

export const getBookings = asyncHandler(async (req, res) => {
  const { status, unitType, fromDate, toDate } = req.query;
  const filter = {};

  if (status) filter.bookingStatus = status;
  if (unitType) filter.unitType = unitType;

  if (fromDate || toDate) {
    filter.checkIn = {};
    if (fromDate) filter.checkIn['$gte'] = new Date(fromDate);
    if (toDate) filter.checkIn['$lte'] = new Date(toDate);
  }

  const bookings = await Booking.find(filter)
    .populate('unit', 'code name unitType maxAdults')
    .sort({ checkIn: 1 });

  return res.status(200).json(
    new ApiResponse(200, { count: bookings.length, bookings }, 'Bookings retrieved')
  );
});

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('unit');
  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  return res.status(200).json(
    new ApiResponse(200, booking, 'Booking details')
  );
});

export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status, paymentStatus, cancellationReason, isResortCancellation } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (status) {
    booking.bookingStatus = status;
    if (status === 'confirmed') {
      booking.holdExpiresAt = null;
      if (!paymentStatus) booking.paymentStatus = 'advance_paid';
    } else if (status === 'checked_in') {
      booking.holdExpiresAt = null;
    } else if (status === 'checked_out') {
      if (!paymentStatus) booking.paymentStatus = 'fully_paid';
    } else if (status === 'cancelled') {
      booking.holdExpiresAt = null;
    }
  }
  if (paymentStatus) booking.paymentStatus = paymentStatus;

  // Handle 100% full refund rule if cancelled by resort
  if (status === 'cancelled') {
    booking.cancellation = {
      cancelledAt: new Date(),
      reason: cancellationReason || 'Cancelled',
      isResortCancellation: Boolean(isResortCancellation),
      refundPercentage: isResortCancellation ? 100 : 0,
      refundAmountPaise: isResortCancellation ? booking.financials.advancePayablePaise : 0
    };
  }

  await booking.save();

  return res.status(200).json(
    new ApiResponse(200, booking, 'Booking status updated')
  );
});
