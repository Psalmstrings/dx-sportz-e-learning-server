const express = require('express');
const router = express.Router();
const { toggleLessonProgress } = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

router.post('/toggle', protect, toggleLessonProgress);

module.exports = router;
