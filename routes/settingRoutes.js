const express = require('express');
const router = express.Router();
const {
  getPublicSettings,
  getAdminSettings,
  updateSettings
} = require('../controllers/settingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public: bank details & academy contact
router.get('/public', getPublicSettings);

// Admin: view all settings & update
router.get('/admin', protect, authorize('admin'), getAdminSettings);
router.put('/admin', protect, authorize('admin'), updateSettings);

module.exports = router;
