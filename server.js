require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');
const { initCronJobs } = require('./services/cronService');

// ─── Process-level safety net (catch crashes before Express sees them) ─────────
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION] Server will continue:', err.stack || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION] Reason:', reason);
});

// Route Imports
const cookieParser = require('cookie-parser');
const { requirePreviewAccess } = require('./middleware/previewMiddleware');
const previewRoutes = require('./routes/previewRoutes');
const authRoutes = require('./routes/authRoutes');
const programRoutes = require('./routes/programRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const progressRoutes = require('./routes/progressRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const settingRoutes = require('./routes/settingRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// 1. Database Connection
connectDB();

// 2. Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'https://dxsportz.com',
  'https://www.dxsportz.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev, or specify allowedOrigins
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-preview-token', 'dx-preview-token']
}));

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs on auth
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 3. Body Parsing & Cookie Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Static File Access for Receipts (Admin verification) and Certificates
// NOTE: Protected course lessons are NOT in public static; they are piped securely via /api/lessons/:id/material
app.use('/uploads/receipts', requirePreviewAccess, express.static(path.join(__dirname, 'uploads', 'receipts')));
app.use('/uploads/certificates', requirePreviewAccess, express.static(path.join(__dirname, 'uploads', 'certificates')));

// 5. Health Check & Root
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'DX Football Academy LMS Backend',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// 6. Mount API Routes
// Pre-launch Preview Access & Status endpoints (Public/Rate-limited)
app.use('/api/academy', previewRoutes);

// Protected LMS Routes — Guarded by requirePreviewAccess during pre-launch period
app.use('/api/auth', requirePreviewAccess, authRoutes);
app.use('/api/programs', requirePreviewAccess, programRoutes);
app.use('/api/modules', requirePreviewAccess, moduleRoutes);
app.use('/api/lessons', requirePreviewAccess, lessonRoutes);
app.use('/api/applications', requirePreviewAccess, applicationRoutes);
app.use('/api/enrollments', requirePreviewAccess, enrollmentRoutes);
app.use('/api/progress', requirePreviewAccess, progressRoutes);
app.use('/api/certificates', requirePreviewAccess, certificateRoutes);
app.use('/api/notifications', requirePreviewAccess, notificationRoutes);
app.use('/api/admin', requirePreviewAccess, adminRoutes);
app.use('/api/settings', requirePreviewAccess, settingRoutes);

// 7. 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found on E-Learning Backend.`
  });
});

// 8. Global Error Handler
app.use((err, req, res, next) => {
  // Full stack trace every time so we can diagnose issues
  console.error('[E-Learning API Error]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Guard: if headers were already flushed, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join('. ')
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      message: `Duplicate value for ${field}. Please use a different value.`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error on E-Learning Backend'
  });
});

// 9. Start Server
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  DX FOOTBALL ACADEMY E-LEARNING BACKEND RUNNING      `);
  console.log(`  Port: ${PORT}                                       `);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health   `);
  console.log(`=======================================================`);

  // Start background cron jobs for access expiration and reminders
  initCronJobs();
});

module.exports = app;
