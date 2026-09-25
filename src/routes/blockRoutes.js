import express from 'express';
import { createBlock, getBlocks, deleteBlock } from '../controllers/blockController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, authorize('owner'), createBlock);
router.get('/', protect, authorize('owner'), getBlocks);
router.delete('/:id', protect, authorize('owner'), deleteBlock);

export default router;
