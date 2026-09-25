import express from 'express';
import { submitEnquiry, getEnquiries, updateEnquiryStatus } from '../controllers/enquiryController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', submitEnquiry); // Public enquiry submission
router.get('/', protect, authorize('owner'), getEnquiries);
router.patch('/:id', protect, authorize('owner'), updateEnquiryStatus);

export default router;
