import rateLimit from 'express-rate-limit';

/**
 * Targeted rate limiter applied specifically to POST /api/v1/bookings.
 * Prevents automated inventory exhaustion and spam submissions from a single IP.
 * Authenticated staff / owner (req.user) bypass this rate limiter automatically.
 */
export const bookingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 5, // Limit each IP to 5 booking attempts per window
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skip: (req) => Boolean(req.user), // Allow authenticated staff / admin unlimited booking creation
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      statusCode: 429,
      message: 'Too many booking attempts from this network. Please wait a few minutes before trying again or contact resort desk directly at 7008307064.'
    });
  }
});

// Brute-force protection for admin login: 5 attempts per 15 minutes per IP
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many login attempts from this IP address. For security, please wait 15 minutes before trying again.'
  }
});
