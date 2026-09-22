import express from 'express';
import { checkAvailability, getQuote, getCapacity } from '../controllers/availabilityController.js';

const router = express.Router();

router.get('/', checkAvailability);
router.get('/capacity', getCapacity);
router.post('/quote', getQuote);

export default router;
