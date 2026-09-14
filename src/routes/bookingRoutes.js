import express from 'express';
import { 
  createBooking, 
  getBookings, 
  getBookingById, 
  updateBookingStatus 
} from '../controllers/bookingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', createBooking); // Public or staff can create reservations
router.get('/', protect, getBookings);
router.get('/:id', protect, getBookingById);
router.patch('/:id/status', protect, updateBookingStatus);

export default router;
