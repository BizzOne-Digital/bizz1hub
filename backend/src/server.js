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

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error('❌ Missing required environment variables:', missingEnv.join(', '));
  if (require.main === module) {
    process.exit(1);
  }
}

const app = express();

// ─── Database Connection (Serverless-optimized) ────────────────────────────────
let cached = global._mongooseConnection;
if (!cached) {
  cached = global._mongooseConnection = { conn: null, promise: null };
}

async function connectMongo() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).then((m) => {
      console.log('✅ MongoDB connected');
      return m;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
  return cached.conn;
}

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

// ─── Ensure DB connected before any route ──────────────────────────────────────
app.use(async (req, res, next) => {
  try {
    await connectMongo();
    next();
  } catch (err) {
    res.status(503).json({ success: false, message: 'Database connection failed. Please try again.' });
  }
});

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

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

if (require.main === module) {
  connectMongo().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  });
}

module.exports = app;
