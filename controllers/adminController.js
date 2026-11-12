const User = require('../models/User');
const Application = require('../models/Application');
const Enrollment = require('../models/Enrollment');
const Program = require('../models/Program');
const Certificate = require('../models/Certificate');
const ActivityLog = require('../models/ActivityLog');

// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin)
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();

    const [
      totalStudents,
      activeStudents,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      totalPrograms,
      activeEnrollments,
      expiredEnrollments,
      readyForReviewCount,
      certifiedStudents,
      recentActivity
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', status: 'active' }),
      Application.countDocuments({ status: { $in: ['Pending', 'Payment Verification Required'] } }),
      Application.countDocuments({ status: 'Approved' }),
      Application.countDocuments({ status: 'Rejected' }),
      Program.countDocuments({ status: 'published' }),
      Enrollment.countDocuments({ status: 'active', accessExpiryDate: { $gt: now } }),
      Enrollment.countDocuments({
        $or: [
          { status: 'expired' },
          { accessExpiryDate: { $lte: now } }
        ]
      }),
      Enrollment.countDocuments({ certificationStatus: 'ready_for_review' }),
      Certificate.countDocuments({ status: 'VALID' }),
      ActivityLog.find().populate('admin', 'fullName').sort({ createdAt: -1 }).limit(10)
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalPrograms,
        activeEnrollments,
        expiredEnrollments,
        readyForReviewCount,
        certifiedStudents
      },
      recentActivity
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/admin/students
// @access  Private (Admin)
const getStudentsList = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const query = { role: 'student' };

    if (status && status !== 'All') query.status = status;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [students, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: students.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      students
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/admin/students/:id
// @access  Private (Admin)
const getStudentDetail = async (req, res, next) => {
  try {
    const student = await User.findById(req.params.id).select('-password');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const [applications, enrollments, certificates] = await Promise.all([
      Application.find({ student: student._id }).populate('program').sort({ createdAt: -1 }),
      Enrollment.find({ student: student._id }).populate('program').sort({ createdAt: -1 }),
      Certificate.find({ student: student._id }).sort({ createdAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      student,
      applications,
      enrollments,
      certificates
    });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/admin/students/:id/status
// @access  Private (Admin)
const toggleStudentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const student = await User.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    student.status = status || (student.status === 'active' ? 'suspended' : 'active');
    await student.save();

    await ActivityLog.create({
      admin: req.user._id,
      action: 'UPDATE_STUDENT_STATUS',
      targetEntity: 'User',
      targetId: student._id.toString(),
      details: { newStatus: student.status, studentEmail: student.email }
    });

    res.status(200).json({
      success: true,
      message: `Student account status updated to ${student.status}`,
      student
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/admin/activity-logs
// @access  Private (Admin)
const getActivityLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      ActivityLog.find()
        .populate('admin', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ActivityLog.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getStudentsList,
  getStudentDetail,
  toggleStudentStatus,
  getActivityLogs
};
