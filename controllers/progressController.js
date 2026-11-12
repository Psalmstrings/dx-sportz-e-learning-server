const Progress = require('../models/Progress');
const Enrollment = require('../models/Enrollment');
const Lesson = require('../models/Lesson');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @route   POST /api/progress/toggle
// @access  Private (Student)
const toggleLessonProgress = async (req, res, next) => {
  try {
    const { enrollmentId, lessonId } = req.body;

    if (!enrollmentId || !lessonId) {
      return res.status(400).json({ success: false, message: 'Enrollment ID and lesson ID are required.' });
    }

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      student: req.user._id
    }).populate('program');

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found.' });
    }

    if (!enrollment.isAccessActive()) {
      return res.status(403).json({
        success: false,
        code: 'ACCESS_EXPIRED',
        message: 'Your 30-day course access period has expired. Progress updates are locked.'
      });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    // Find or create progress record
    let progress = await Progress.findOne({
      enrollment: enrollment._id,
      lesson: lesson._id
    });

    if (progress) {
      // Toggle
      progress.isCompleted = !progress.isCompleted;
      progress.completedAt = progress.isCompleted ? new Date() : null;
      await progress.save();
    } else {
      progress = await Progress.create({
        student: req.user._id,
        enrollment: enrollment._id,
        program: enrollment.program._id,
        module: lesson.module,
        lesson: lesson._id,
        isCompleted: true,
        completedAt: new Date()
      });
    }

    // Recalculate total progress percentage across all required lessons
    const totalRequiredLessons = await Lesson.countDocuments({
      program: enrollment.program._id,
      isRequired: true,
      status: 'published'
    });

    const completedRequiredLessons = await Progress.countDocuments({
      enrollment: enrollment._id,
      isCompleted: true
    });

    const calculatedPercentage = totalRequiredLessons > 0
      ? Math.min(100, Math.round((completedRequiredLessons / totalRequiredLessons) * 100))
      : 100;

    enrollment.progressPercentage = calculatedPercentage;

    if (calculatedPercentage > 0 && enrollment.completionStatus === 'not_started') {
      enrollment.completionStatus = 'in_progress';
    }

    // Check Course Completion (100% threshold)
    let justCompleted = false;
    if (calculatedPercentage === 100 && enrollment.completionStatus !== 'completed') {
      enrollment.completionStatus = 'completed';
      enrollment.completedAt = new Date();
      // Strict rule: Ready for certification review by admin (no auto-issuance)
      if (enrollment.certificationStatus === 'not_eligible') {
        enrollment.certificationStatus = 'ready_for_review';
      }
      justCompleted = true;

      // Student notification
      await Notification.create({
        recipient: req.user._id,
        title: 'Curriculum Completed! 🏆',
        message: `Congratulations! You have completed all modules for ${enrollment.program.title}. Your status is now "Ready for Certification". An academy administrator will review your coursework to issue your certificate.`,
        type: 'success',
        link: '/academy/certificates'
      });

      // Admin alert: notify all admin users
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          title: 'Student Ready for Certification',
          message: `${req.user.fullName} completed 100% of ${enrollment.program.title} and is awaiting certificate approval.`,
          type: 'info',
          link: '/academy/admin/certificates'
        });
      }
    }

    await enrollment.save();

    res.status(200).json({
      success: true,
      isCompleted: progress.isCompleted,
      progressPercentage: calculatedPercentage,
      completionStatus: enrollment.completionStatus,
      certificationStatus: enrollment.certificationStatus,
      justCompleted
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  toggleLessonProgress
};
