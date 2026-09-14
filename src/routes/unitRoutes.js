import express from 'express';
import { 
  getUnits, 
  updateUnitStatus, 
  updateUnitPricing, 
  updatePricingByType 
} from '../controllers/unitController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getUnits);
router.patch('/pricing/by-type', protect, updatePricingByType);
router.patch('/:id/pricing', protect, updateUnitPricing);
router.patch('/:id', protect, updateUnitStatus);

export default router;
