const express = require('express');
const router = express.Router();
const {
  getMyCertificates,
  verifyCertificate,
  downloadCertificate,
  adminApproveCertificate,
  adminRegenerateCertificate,
  adminResendEmail,
  getAdminCertificates
} = require('../controllers/certificateController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public verification (no auth)
router.get('/verify/:certificateId', verifyCertificate);

// Student routes — MUST be before /:id/download catch-all
router.get('/my', protect, getMyCertificates);

// Admin routes — MUST be before /:id/download catch-all
router.get('/admin/all', protect, authorize('admin'), getAdminCertificates);
router.post('/admin/approve/:enrollmentId', protect, authorize('admin'), adminApproveCertificate);
router.post('/admin/:id/regenerate', protect, authorize('admin'), adminRegenerateCertificate);
router.post('/admin/:id/resend-email', protect, authorize('admin'), adminResendEmail);

// Parameterized (catch-all) — must be last
router.get('/:id/download', downloadCertificate);

module.exports = router;
