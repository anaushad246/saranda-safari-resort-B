import { BlockedDate } from '../models/BlockedDate.js';
import { Unit } from '../models/Unit.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createBlock = asyncHandler(async (req, res) => {
  const { unitId, startDate, endDate, reason, notes } = req.body;

  if (!startDate || !endDate || !reason) {
    throw new ApiError(400, 'Please provide startDate, endDate, and reason.');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    throw new ApiError(400, 'End date must be after start date.');
  }

  let unit = null;
  if (unitId) {
    unit = await Unit.findById(unitId);
    if (!unit) {
      throw new ApiError(404, 'Specified unit not found.');
    }
  }

  const block = await BlockedDate.create({
    unit: unit ? unit._id : null,
    startDate: start,
    endDate: end,
    reason,
    notes,
    blockedBy: req.user?._id
  });

  return res.status(201).json(
    new ApiResponse(201, block, 'Date block created successfully')
  );
});

export const getBlocks = asyncHandler(async (req, res) => {
  const blocks = await BlockedDate.find()
    .populate('unit', 'code name unitType')
    .sort({ startDate: 1 });

  return res.status(200).json(
    new ApiResponse(200, blocks, 'Blocked dates retrieved')
  );
});

export const deleteBlock = asyncHandler(async (req, res) => {
  const block = await BlockedDate.findById(req.params.id);
  if (!block) {
    throw new ApiError(404, 'Blocked date record not found.');
  }

  await block.deleteOne();

  return res.status(200).json(
    new ApiResponse(200, null, 'Block removed successfully')
  );
});
