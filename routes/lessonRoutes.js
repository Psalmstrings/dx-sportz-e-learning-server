const express = require('express');
const router = express.Router();
const {
  getLessonById,
  serveMaterialFile,
  createLesson,
  updateLesson,
  deleteLesson
} = require('../controllers/lessonController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadMaterial } = require('../middleware/uploadMiddleware');

// Protected: Get lesson & stream course material
router.get('/:id', protect, getLessonById);
router.get('/:id/material', protect, serveMaterialFile);

// Admin
router.post('/', protect, authorize('admin'), uploadMaterial.single('file'), createLesson);
router.put('/:id', protect, authorize('admin'), uploadMaterial.single('file'), updateLesson);
router.delete('/:id', protect, authorize('admin'), deleteLesson);

module.exports = router;
