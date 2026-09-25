import express from 'express';
import { 
  createBooking, 
  getBookings, 
  getBookingById, 
  updateBookingStatus 
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { bookingRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/', bookingRateLimiter, createBooking); // Public or owner booking creation
router.get('/', protect, authorize('owner'), getBookings);
router.get('/:id', protect, authorize('owner'), getBookingById);
router.patch('/:id/status', protect, authorize('owner'), updateBookingStatus);

export default router;
