const express = require('express');
const router = express.Router();
const {
  applyForProgram,
  uploadReceipt,
  getMyApplications,
  getAdminApplications,
  getApplicationById,
  approveApplication,
  rejectApplication
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadReceipt: multerReceipt } = require('../middleware/uploadMiddleware');

// Student
router.post('/apply', protect, applyForProgram);
router.post('/:id/upload-receipt', protect, multerReceipt.single('receipt'), uploadReceipt);
router.get('/my', protect, getMyApplications);
router.get('/:id', protect, getApplicationById);

// Admin
router.get('/admin/all', protect, authorize('admin'), getAdminApplications);
router.patch('/admin/:id/approve', protect, authorize('admin'), approveApplication);
router.patch('/admin/:id/reject', protect, authorize('admin'), rejectApplication);

module.exports = router;
