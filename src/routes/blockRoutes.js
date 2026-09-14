import express from 'express';
import { createBlock, getBlocks, deleteBlock } from '../controllers/blockController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, createBlock);
router.get('/', protect, getBlocks);
router.delete('/:id', protect, deleteBlock);

export default router;
