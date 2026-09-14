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

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim().replace(/\/$/, '').toLowerCase())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const clean = origin.replace(/\/$/, '').toLowerCase();
      if (allowedOrigins.includes(clean) || allowedOrigins.includes('*')) return callback(null, true);
      return callback(null, true);
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

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
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
