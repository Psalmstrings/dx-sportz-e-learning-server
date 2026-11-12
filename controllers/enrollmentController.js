const Enrollment = require('../models/Enrollment');
const Program = require('../models/Program');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Progress = require('../models/Progress');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

// @route   GET /api/enrollments/my
// @access  Private (Student)
const getMyEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user._id })
      .populate('program')
      .populate('application', 'applicationId status')
      .sort({ createdAt: -1 });

    const now = new Date();

    const formatted = enrollments.map(e => {
      const isStillActive = e.status === 'active' && new Date(e.accessExpiryDate) > now;
      const msLeft = new Date(e.accessExpiryDate).getTime() - now.getTime();
      const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

      return {
        _id: e._id,
        program: e.program,
        status: isStillActive ? 'active' : 'expired',
        accessStartDate: e.accessStartDate,
        accessExpiryDate: e.accessExpiryDate,
        daysRemaining: isStillActive ? daysLeft : 0,
        progressPercentage: e.progressPercentage,
        completionStatus: e.completionStatus,
        certificationStatus: e.certificationStatus,
        completedAt: e.completedAt,
        application: e.application
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      enrollments: formatted
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/enrollments/learn/:programSlug
// @access  Private (Enrolled Student or Admin)
const getLearningCourseData = async (req, res, next) => {
  try {
    const program = await Program.findOne({ slug: req.params.programSlug.toLowerCase() });
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found.' });
    }

    let enrollment = null;
    let isAccessActive = true;
    let daysRemaining = 30;

    if (req.user.role !== 'admin') {
      enrollment = await Enrollment.findOne({
        student: req.user._id,
        program: program._id
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          code: 'NOT_ENROLLED',
          message: 'You have not enrolled in this program.'
        });
      }

      if (enrollment.status === 'suspended') {
        return res.status(403).json({
          success: false,
          code: 'ENROLLMENT_SUSPENDED',
          message: 'Your enrollment in this program is suspended.'
        });
      }

      isAccessActive = enrollment.isAccessActive();
      const msLeft = new Date(enrollment.accessExpiryDate).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

      if (!isAccessActive) {
        return res.status(403).json({
          success: false,
          code: 'ACCESS_EXPIRED',
          message: 'Your 30-day course access period has expired. Please contact administration for access extension or renew your enrollment.',
          expiryDate: enrollment.accessExpiryDate
        });
      }
    }

    // Fetch modules & lessons
    const modules = await Module.find({
      program: program._id,
      status: 'published'
    }).sort({ order: 1 });

    const moduleIds = modules.map(m => m._id);
    const lessons = await Lesson.find({
      module: { $in: moduleIds },
      status: 'published'
    }).sort({ order: 1 });

    // Fetch completed progress for this student
    let completedLessonIds = [];
    if (enrollment) {
      const progressRecords = await Progress.find({
        enrollment: enrollment._id,
        isCompleted: true
      });
      completedLessonIds = progressRecords.map(p => p.lesson.toString());
    }

    const curriculum = modules.map(mod => {
      const modLessons = lessons.filter(l => l.module.toString() === mod._id.toString());
      const modCompleted = modLessons.length > 0 && modLessons.every(l => completedLessonIds.includes(l._id.toString()));

      return {
        _id: mod._id,
        title: mod.title,
        description: mod.description,
        order: mod.order,
        isCompleted: modCompleted,
        lessons: modLessons.map(l => ({
          _id: l._id,
          title: l.title,
          description: l.description,
          type: l.type,
          durationMinutes: l.durationMinutes,
          order: l.order,
          isRequired: l.isRequired,
          isCompleted: completedLessonIds.includes(l._id.toString()),
          hasFile: Boolean(l.filePath)
        }))
      };
    });

    res.status(200).json({
      success: true,
      program,
      enrollment: enrollment ? {
        _id: enrollment._id,
        progressPercentage: enrollment.progressPercentage,
        completionStatus: enrollment.completionStatus,
        certificationStatus: enrollment.certificationStatus,
        accessStartDate: enrollment.accessStartDate,
        accessExpiryDate: enrollment.accessExpiryDate,
        daysRemaining
      } : null,
      curriculum,
      completedLessonIds
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/admin/enrollments
// @access  Private (Admin)
const getAdminEnrollments = async (req, res, next) => {
  try {
    const { status, certificationStatus, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'All') query.status = status;
    if (certificationStatus && certificationStatus !== 'All') query.certificationStatus = certificationStatus;

    const skip = (Number(page) - 1) * Number(limit);

    const [enrollments, total] = await Promise.all([
      Enrollment.find(query)
        .populate('student', 'fullName email phoneNumber country')
        .populate('program', 'title slug level duration')
        .populate('application', 'applicationId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Enrollment.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: enrollments.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      enrollments
    });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/admin/enrollments/:id/extend
// @access  Private (Admin)
const extendAccess = async (req, res, next) => {
  try {
    const { days, customDate, reason } = req.body;
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('student')
      .populate('program');

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found.' });
    }

    const previousExpiry = new Date(enrollment.accessExpiryDate);
    let newExpiry;
    let addedDays = 0;

    if (customDate) {
      newExpiry = new Date(customDate);
      addedDays = Math.round((newExpiry.getTime() - previousExpiry.getTime()) / (1000 * 60 * 60 * 24));
    } else if (days) {
      addedDays = Number(days);
      // If currently expired, extend from now; if still active, extend from previous expiry
      const base = previousExpiry > new Date() ? previousExpiry : new Date();
      newExpiry = new Date(base.getTime() + addedDays * 24 * 60 * 60 * 1000);
    } else {
      return res.status(400).json({ success: false, message: 'Please specify days (+7, +14, +30) or customDate.' });
    }

    enrollment.accessExpiryDate = newExpiry;
    enrollment.status = 'active'; // Reactivate if expired
    enrollment.accessExtensions.push({
      extendedDays: addedDays,
      previousExpiry,
      newExpiry,
      extendedBy: req.user._id,
      reason: reason || 'Administrative extension'
    });

    await enrollment.save();

    // Notify student
    const dateFormatted = newExpiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    await Notification.create({
      recipient: enrollment.student._id,
      title: 'Course Access Extended! ⏳',
      message: `Your access to ${enrollment.program.title} has been extended by administration until ${dateFormatted}.`,
      type: 'success',
      link: `/academy/learn/${enrollment.program.slug}`
    });

    await ActivityLog.create({
      admin: req.user._id,
      action: 'EXTEND_ENROLLMENT_ACCESS',
      targetEntity: 'Enrollment',
      targetId: enrollment._id.toString(),
      details: {
        student: enrollment.student.fullName,
        program: enrollment.program.title,
        addedDays,
        newExpiry
      }
    });

    res.status(200).json({
      success: true,
      message: `Course access successfully extended until ${dateFormatted}`,
      enrollment
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyEnrollments,
  getLearningCourseData,
  getAdminEnrollments,
  extendAccess
};
