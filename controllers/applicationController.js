const Application = require('../models/Application');
const Program = require('../models/Program');
const Enrollment = require('../models/Enrollment');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { generateApplicationId } = require('../utils/idGenerator');
const emailService = require('../services/emailService');

// @route   POST /api/applications/apply
// @access  Private (Student)
const applyForProgram = async (req, res, next) => {
  try {
    const { programId } = req.body;
    if (!programId) {
      return res.status(400).json({ success: false, message: 'Program ID is required.' });
    }

    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found.' });
    }

    // Check if user already has an active or pending application
    const existing = await Application.findOne({
      student: req.user._id,
      program: program._id,
      status: { $in: ['Pending', 'Payment Verification Required', 'Approved'] }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `You already have an existing application (${existing.applicationId}) for this program. Current status: ${existing.status}.`
      });
    }

    const applicationId = await generateApplicationId(Application);

    const application = await Application.create({
      applicationId,
      student: req.user._id,
      program: program._id,
      amount: program.price,
      currency: program.currency || 'NGN',
      status: 'Payment Verification Required'
    });

    // Notify student
    await Notification.create({
      recipient: req.user._id,
      title: 'Application Created',
      message: `Your application ${applicationId} for ${program.title} has been created. Please upload your payment receipt to complete enrollment.`,
      type: 'info',
      link: '/academy/applications'
    });

    // Send email
    await emailService.sendApplicationSubmitted(req.user, application, program);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully. Please proceed with payment and upload your receipt.',
      application
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/applications/:id/upload-receipt
// @access  Private (Student)
const uploadReceipt = async (req, res, next) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      student: req.user._id
    }).populate('program');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please attach a payment receipt file (image or PDF).' });
    }

    const { transactionReference, paymentDate, paymentNotes } = req.body;

    application.receiptFile = req.file.path;
    application.receiptFileName = req.file.originalname;
    application.receiptMimeType = req.file.mimetype;
    application.receiptUploadedAt = new Date();
    if (transactionReference) application.transactionReference = transactionReference.trim();
    if (paymentDate) application.paymentDate = new Date(paymentDate);
    if (paymentNotes) application.paymentNotes = paymentNotes;

    // Status transitions to Pending verification
    application.status = 'Pending';
    await application.save();

    await Notification.create({
      recipient: req.user._id,
      title: 'Receipt Uploaded',
      message: `Your payment evidence for ${application.applicationId} has been uploaded. Admissions review in progress.`,
      type: 'success',
      link: '/academy/applications'
    });

    res.status(200).json({
      success: true,
      message: 'Payment receipt uploaded successfully. Our admissions board will verify your transfer shortly.',
      application
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/applications/my
// @access  Private (Student)
const getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ student: req.user._id })
      .populate('program', 'title slug level price currency duration')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/admin/applications
// @access  Private (Admin)
const getAdminApplications = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { applicationId: { $regex: search, $options: 'i' } },
        { transactionReference: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [applications, total] = await Promise.all([
      Application.find(query)
        .populate('student', 'fullName email phoneNumber country')
        .populate('program', 'title level price currency duration')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Application.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: applications.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      applications
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/applications/:id
// @access  Private (Student or Admin)
const getApplicationById = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.student = req.user._id;
    }

    const application = await Application.findOne(query)
      .populate('student', 'fullName email phoneNumber country state footballExperience')
      .populate('program')
      .populate('reviewedBy', 'fullName');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    res.status(200).json({
      success: true,
      application
    });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/admin/applications/:id/approve
// @access  Private (Admin)
const approveApplication = async (req, res, next) => {
  try {
    const { adminNotes } = req.body;
    const application = await Application.findById(req.params.id)
      .populate('student')
      .populate('program');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (application.status === 'Approved') {
      return res.status(400).json({ success: false, message: 'Application has already been approved.' });
    }

    application.status = 'Approved';
    application.adminNotes = adminNotes || application.adminNotes;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    await application.save();

    // Calculate Access Duration (Server Time Default 30 Days or program configured duration)
    const accessDays = application.program.accessDurationDays || 30;
    const accessStart = new Date();
    const accessExpiry = new Date(Date.now() + accessDays * 24 * 60 * 60 * 1000);

    // Create or reactivate Enrollment record
    let enrollment = await Enrollment.findOne({
      student: application.student._id,
      program: application.program._id
    });

    if (enrollment) {
      enrollment.application = application._id;
      enrollment.status = 'active';
      enrollment.accessStartDate = accessStart;
      enrollment.accessExpiryDate = accessExpiry;
      await enrollment.save();
    } else {
      enrollment = await Enrollment.create({
        student: application.student._id,
        program: application.program._id,
        application: application._id,
        status: 'active',
        accessStartDate: accessStart,
        accessExpiryDate: accessExpiry,
        progressPercentage: 0,
        completionStatus: 'not_started',
        certificationStatus: 'not_eligible'
      });
    }

    // In-app notification for student
    await Notification.create({
      recipient: application.student._id,
      title: 'Course Access Activated! 🎉',
      message: `Your application for ${application.program.title} has been approved. You have 30 days of full course access.`,
      type: 'success',
      link: `/academy/learn/${application.program.slug}`
    });

    // Send email
    await emailService.sendApplicationApproved(application.student, application.program, enrollment);

    await ActivityLog.create({
      admin: req.user._id,
      action: 'APPROVE_APPLICATION',
      targetEntity: 'Application',
      targetId: application._id.toString(),
      details: {
        applicationId: application.applicationId,
        student: application.student.fullName,
        program: application.program.title
      }
    });

    res.status(200).json({
      success: true,
      message: 'Application approved successfully! Course enrollment activated for 30 days.',
      application,
      enrollment
    });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/admin/applications/:id/reject
// @access  Private (Admin)
const rejectApplication = async (req, res, next) => {
  try {
    const { rejectionReason, adminNotes } = req.body;
    const application = await Application.findById(req.params.id)
      .populate('student')
      .populate('program');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    application.status = 'Rejected';
    application.rejectionReason = rejectionReason || 'Payment verification could not be validated.';
    application.adminNotes = adminNotes || application.adminNotes;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    await application.save();

    await Notification.create({
      recipient: application.student._id,
      title: 'Application Update',
      message: `Your application ${application.applicationId} was not approved: ${application.rejectionReason}`,
      type: 'danger',
      link: '/academy/applications'
    });

    await ActivityLog.create({
      admin: req.user._id,
      action: 'REJECT_APPLICATION',
      targetEntity: 'Application',
      targetId: application._id.toString(),
      details: {
        applicationId: application.applicationId,
        reason: application.rejectionReason
      }
    });

    res.status(200).json({
      success: true,
      message: 'Application rejected',
      application
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyForProgram,
  uploadReceipt,
  getMyApplications,
  getAdminApplications,
  getApplicationById,
  approveApplication,
  rejectApplication
};
