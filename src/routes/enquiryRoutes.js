import express from 'express';
import { submitEnquiry, getEnquiries, updateEnquiryStatus } from '../controllers/enquiryController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', submitEnquiry); // Public enquiry submission
router.get('/', protect, getEnquiries);
router.patch('/:id', protect, updateEnquiryStatus);

export default router;
