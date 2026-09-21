import express from 'express';
import { 
  getUnits, 
  updateUnitStatus, 
  updateUnitPricing, 
  updatePricingByType 
} from '../controllers/unitController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public: Get all units
router.get('/', getUnits);

// Protected (Owner only): Pricing updates & Unit status changes
router.patch('/pricing/by-type', protect, authorize('owner'), updatePricingByType);
router.patch('/:id/pricing', protect, authorize('owner'), updateUnitPricing);
router.patch('/:id', protect, authorize('owner'), updateUnitStatus);

export default router;
