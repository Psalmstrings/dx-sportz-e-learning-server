const express = require('express');
const router = express.Router();
const {
  getPrograms,
  getProgramBySlug,
  getAdminPrograms,
  createProgram,
  updateProgram,
  deleteProgram
} = require('../controllers/programController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public (non-parameterized first)
router.get('/', getPrograms);

// Admin routes MUST come before /:slug to avoid Express treating "admin" as a slug
router.get('/admin/all', protect, authorize('admin'), getAdminPrograms);
router.post('/admin', protect, authorize('admin'), createProgram);
router.put('/admin/:id', protect, authorize('admin'), updateProgram);
router.delete('/admin/:id', protect, authorize('admin'), deleteProgram);

// Parameterized (catch-all) — must be last
router.get('/:slug', getProgramBySlug);

module.exports = router;
