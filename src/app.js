import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRouter from './routes/authRoutes.js';
import availabilityRouter from './routes/availabilityRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import blockRouter from './routes/blockRoutes.js';
import enquiryRouter from './routes/enquiryRoutes.js';
import unitRouter from './routes/unitRoutes.js';

const app = express();

const rawAllowedOrigins = process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174';
const allowedOrigins = rawAllowedOrigins
  .split(',')
  .map(o => o.trim().replace(/\/$/, '').toLowerCase())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);
      const clean = origin.replace(/\/$/, '').toLowerCase();
      if (allowedOrigins.includes(clean) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy violation: Origin '${origin}' is not authorized to access this API.`));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

// Base Health Check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Saranda Safari Resort API is operational',
    location: 'Village Nimture, P.O. Bolani, Keonjhar, Odisha (Estd. 1998)'
  });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Mount Resort Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/availability', availabilityRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/blocks', blockRouter);
app.use('/api/v1/enquiries', enquiryRouter);
app.use('/api/v1/units', unitRouter);

// 404 Route Catch-All Handler
app.use((req, res, next) => {
  res.status(404).json({
    statusCode: 404,
    success: false,
    message: `Cannot find endpoint '${req.originalUrl}' on this server.`,
    errors: [],
    data: null
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || (err.message && err.message.includes('CORS') ? 403 : 500);
  return res.status(statusCode).json({
    statusCode,
    success: false,
    message: err.message || 'Internal Server Error',
    errors: err.errors || [],
    data: null,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export { app };
