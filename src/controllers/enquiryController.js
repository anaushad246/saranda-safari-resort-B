import crypto from 'crypto';
import { Enquiry } from '../models/Enquiry.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const submitEnquiry = asyncHandler(async (req, res) => {
  const { type, guest, payload } = req.body;

  if (!type || !guest?.name || !guest?.phone) {
    throw new ApiError(400, 'Please provide enquiry type, guest name, and phone number.');
  }

  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const enquiryReference = 'ENQ-2026-' + randomSuffix;

  const enquiry = await Enquiry.create({
    enquiryReference,
    type,
    guest: {
      name: guest.name.trim(),
      phone: guest.phone.trim(),
      email: guest.email ? guest.email.trim().toLowerCase() : ''
    },
    payload: payload || {},
    status: 'new'
  });

  return res.status(201).json(
    new ApiResponse(201, enquiry, 'Enquiry submitted successfully')
  );
});

export const getEnquiries = asyncHandler(async (req, res) => {
  const { type, status } = req.query;
  const filter = {};

  if (type) filter.type = type;
  if (status) filter.status = status;

  const enquiries = await Enquiry.find(filter).sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, { count: enquiries.length, enquiries }, 'Enquiries retrieved')
  );
});

export const updateEnquiryStatus = asyncHandler(async (req, res) => {
  const { status, quotedAmountPaise, internalNotes } = req.body;
  const enquiry = await Enquiry.findById(req.params.id);

  if (!enquiry) {
    throw new ApiError(404, 'Enquiry record not found.');
  }

  if (status) enquiry.status = status;
  if (quotedAmountPaise !== undefined) enquiry.quotedAmountPaise = quotedAmountPaise;
  if (internalNotes !== undefined) enquiry.internalNotes = internalNotes;

  await enquiry.save();

  return res.status(200).json(
    new ApiResponse(200, enquiry, 'Enquiry updated successfully')
  );
});
