const express = require('express');
const router = express.Router();
const {
  getModules,
  createModule,
  updateModule,
  deleteModule,
  reorderModules
} = require('../controllers/moduleController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public / Enrolled
router.get('/program/:programId', getModules);

// Admin
router.post('/', protect, authorize('admin'), createModule);
router.put('/reorder', protect, authorize('admin'), reorderModules);
router.put('/:id', protect, authorize('admin'), updateModule);
router.delete('/:id', protect, authorize('admin'), deleteModule);

module.exports = router;
