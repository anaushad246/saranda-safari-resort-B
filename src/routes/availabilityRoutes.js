import express from 'express';
import { checkAvailability, getQuote } from '../controllers/availabilityController.js';

const router = express.Router();

router.get('/', checkAvailability);
router.post('/quote', getQuote);

export default router;
