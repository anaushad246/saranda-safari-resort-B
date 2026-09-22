import express from 'express';
import {
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  updateUnitPricing,
  updatePricingByType
} from '../controllers/unitController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public: Get all units
router.get('/', getUnits);

// Owner only — the whole inventory is owner-controlled. Staff accounts must not be able
// to add, retire, re-cap or re-price accommodation, so every write route below is gated
// on authorize('owner'). There is deliberately no staff-level inventory access.
router.post('/', protect, authorize('owner'), createUnit);
router.patch('/pricing/by-type', protect, authorize('owner'), updatePricingByType);
router.patch('/:id/pricing', protect, authorize('owner'), updateUnitPricing);
router.patch('/:id', protect, authorize('owner'), updateUnit);
router.delete('/:id', protect, authorize('owner'), deleteUnit);

export default router;
