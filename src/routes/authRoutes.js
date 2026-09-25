import express from 'express';
import { login, getMe } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', authRateLimiter, login);
router.get('/me', protect, authorize('owner'), getMe);

export default router;
