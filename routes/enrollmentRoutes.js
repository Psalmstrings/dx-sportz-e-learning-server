const express = require('express');
const router = express.Router();
const {
  getMyEnrollments,
  getLearningCourseData,
  getAdminEnrollments,
  extendAccess
} = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Student
router.get('/my', protect, getMyEnrollments);
router.get('/learn/:programSlug', protect, getLearningCourseData);

// Admin
router.get('/admin/all', protect, authorize('admin'), getAdminEnrollments);
router.patch('/admin/:id/extend', protect, authorize('admin'), extendAccess);

module.exports = router;
