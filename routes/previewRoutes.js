const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  verifyAccess,
  checkStatus,
  exitPreview
} = require('../controllers/previewController');

// Rate limiting specifically for preview access attempts (anti-brute-force)
const previewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many preview access attempts. Please try again in 15 minutes.'
  }
});

router.post('/preview-access', previewLimiter, verifyAccess);
router.get('/preview-status', checkStatus);
router.post('/preview-logout', exitPreview);

module.exports = router;
