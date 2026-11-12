const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getStudentsList,
  getStudentDetail,
  toggleStudentStatus,
  getActivityLogs
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin'));

router.get('/dashboard-stats', getDashboardStats);
router.get('/students', getStudentsList);
router.get('/students/:id', getStudentDetail);
router.patch('/students/:id/status', toggleStudentStatus);
router.get('/activity-logs', getActivityLogs);

module.exports = router;
