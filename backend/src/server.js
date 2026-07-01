const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const settingsRoutes = require('./routes/settings.routes');
const payrollRoutes = require('./routes/payroll.routes');
const unitEconomicsRoutes = require('./routes/unitEconomics.routes');
const rateCardRoutes = require('./routes/rateCard.routes');
const plModelRoutes = require('./routes/plModel.routes');
const commissionRoutes = require('./routes/commission.routes');
const aiRoutes = require('./routes/ai.routes');

const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'BizzOne Hub API is running', timestamp: new Date().toISOString() });
});

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/payroll', authenticateToken, payrollRoutes);
app.use('/api/unit-economics', authenticateToken, unitEconomicsRoutes);
app.use('/api/rate-card', authenticateToken, rateCardRoutes);
app.use('/api/pl-model', authenticateToken, plModelRoutes);
app.use('/api/commissions', authenticateToken, commissionRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// ─── Database Connection ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const connectMongo = mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    if (require.main === module) {
      process.exit(1);
    }
  });

if (require.main === module) {
  connectMongo.then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  });
}

module.exports = app;
