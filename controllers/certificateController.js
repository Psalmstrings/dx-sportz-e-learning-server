const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const Setting = require('../models/Setting');
const { generateCertificateId } = require('../utils/idGenerator');
const { generateCertificatePDF } = require('../services/certificatePdfService');
const emailService = require('../services/emailService');
const path = require('path');
const fs = require('fs');

// @route   GET /api/certificates/my
// @access  Private (Student)
const getMyCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({
      student: req.user._id,
      status: 'VALID'
    })
      .populate('program', 'title slug level duration')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      certificates
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/certificates/verify/:certificateId
// @access  Public
const verifyCertificate = async (req, res, next) => {
  try {
    const certId = req.params.certificateId.trim().toUpperCase();
    const certificate = await Certificate.findOne({ certificateId: certId });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Certificate not found. The Certificate ID provided does not match any official DX Football Academy records.'
      });
    }

    if (certificate.status === 'REVOKED') {
      return res.status(200).json({
        success: true,
        valid: false,
        status: 'REVOKED',
        certificateId: certificate.certificateId,
        studentName: certificate.studentName,
        programTitle: certificate.programTitle,
        message: 'This certificate has been revoked by academy administration.'
      });
    }

    res.status(200).json({
      success: true,
      valid: true,
      status: 'VALID',
      certificate: {
        certificateId: certificate.certificateId,
        studentName: certificate.studentName,
        programTitle: certificate.programTitle,
        programLevel: certificate.programLevel,
        issuedDate: certificate.issuedDate,
        signatoryName: certificate.signatoryName,
        signatoryTitle: certificate.signatoryTitle,
        verificationUrl: certificate.verificationUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/certificates/:id/download
// @access  Public or Student
const downloadCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
        { certificateId: req.params.id.toUpperCase() }
      ]
    });

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate record not found.' });
    }

    if (!certificate.pdfFilePath || !fs.existsSync(certificate.pdfFilePath)) {
      // Regenerate on the fly if missing
      const result = await generateCertificatePDF({
        certificateId: certificate.certificateId,
        studentName: certificate.studentName,
        programTitle: certificate.programTitle,
        programLevel: certificate.programLevel,
        issuedDate: certificate.issuedDate,
        signatoryName: certificate.signatoryName,
        signatoryTitle: certificate.signatoryTitle,
        verificationUrl: certificate.verificationUrl
      });
      certificate.pdfFilePath = result.filePath;
      await certificate.save();
    }

    res.download(certificate.pdfFilePath, `${certificate.certificateId}.pdf`);
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/admin/certificates/approve/:enrollmentId
// @access  Private (Admin)
const adminApproveCertificate = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.enrollmentId)
      .populate('student')
      .populate('program')
      .populate('application');

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment record not found.' });
    }

    // Check if already certified
    const existingCert = await Certificate.findOne({ enrollment: enrollment._id });
    if (existingCert) {
      return res.status(400).json({
        success: false,
        message: `A certificate has already been issued for this enrollment (ID: ${existingCert.certificateId}).`
      });
    }

    // Generate unique Certificate ID
    const certificateId = await generateCertificateId(Certificate);

    // Get Signatory settings or defaults
    const signatorySetting = await Setting.findOne({ key: 'signatory' });
    const signatoryName = signatorySetting?.value?.name || 'Academy Technical Director';
    const signatoryTitle = signatorySetting?.value?.title || 'Director of Coach Education';

    const baseUrl = process.env.CERTIFICATE_BASE_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/academy/verify-certificate`;
    const verificationUrl = `${baseUrl}/${certificateId}`;

    // Generate Landscape PDF
    const pdfResult = await generateCertificatePDF({
      certificateId,
      studentName: enrollment.student.fullName,
      programTitle: enrollment.program.title,
      programLevel: enrollment.program.level || 'Professional',
      issuedDate: new Date(),
      signatoryName,
      signatoryTitle,
      verificationUrl
    });

    // Create Certificate record
    const certificate = await Certificate.create({
      certificateId,
      student: enrollment.student._id,
      program: enrollment.program._id,
      enrollment: enrollment._id,
      studentName: enrollment.student.fullName,
      programTitle: enrollment.program.title,
      programLevel: enrollment.program.level || 'Professional',
      issuedDate: new Date(),
      status: 'VALID',
      pdfFilePath: pdfResult.filePath,
      verificationUrl,
      signatoryName,
      signatoryTitle,
      approvedBy: req.user._id
    });

    // Update Enrollment
    enrollment.certificationStatus = 'certified';
    await enrollment.save();

    // Update Application
    if (enrollment.application) {
      await Application.findByIdAndUpdate(enrollment.application, { status: 'Certified' });
    }

    // In-app notification for student
    await Notification.create({
      recipient: enrollment.student._id,
      title: 'Official Certificate Issued! 🎓',
      message: `Your Certificate of Completion for ${enrollment.program.title} has been officially approved and issued. Certificate ID: ${certificateId}.`,
      type: 'success',
      link: '/academy/certificates'
    });

    // Send email with PDF attachment
    try {
      const emailResult = await emailService.sendCertificateIssued(
        enrollment.student,
        enrollment.program,
        certificate,
        pdfResult.filePath
      );
      if (emailResult.success) {
        certificate.emailSent = true;
        certificate.emailSentAt = new Date();
        await certificate.save();
      }
    } catch (e) {
      console.error('[Certificate] Email sending warning:', e.message);
    }

    await ActivityLog.create({
      admin: req.user._id,
      action: 'APPROVE_CERTIFICATION',
      targetEntity: 'Certificate',
      targetId: certificate._id.toString(),
      details: {
        certificateId,
        student: enrollment.student.fullName,
        program: enrollment.program.title
      }
    });

    res.status(201).json({
      success: true,
      message: `Certificate ${certificateId} generated and issued successfully!`,
      certificate
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/admin/certificates/:id/regenerate
// @access  Private (Admin)
const adminRegenerateCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    const { studentName, signatoryName, signatoryTitle } = req.body;
    if (studentName) certificate.studentName = studentName.trim();
    if (signatoryName) certificate.signatoryName = signatoryName.trim();
    if (signatoryTitle) certificate.signatoryTitle = signatoryTitle.trim();

    const pdfResult = await generateCertificatePDF({
      certificateId: certificate.certificateId,
      studentName: certificate.studentName,
      programTitle: certificate.programTitle,
      programLevel: certificate.programLevel,
      issuedDate: certificate.issuedDate,
      signatoryName: certificate.signatoryName,
      signatoryTitle: certificate.signatoryTitle,
      verificationUrl: certificate.verificationUrl
    });

    certificate.pdfFilePath = pdfResult.filePath;
    await certificate.save();

    await ActivityLog.create({
      admin: req.user._id,
      action: 'REGENERATE_CERTIFICATE',
      targetEntity: 'Certificate',
      targetId: certificate._id.toString(),
      details: { certificateId: certificate.certificateId }
    });

    res.status(200).json({
      success: true,
      message: 'Certificate regenerated successfully',
      certificate
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/admin/certificates/:id/resend-email
// @access  Private (Admin)
const adminResendEmail = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('student')
      .populate('program');

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    await emailService.sendCertificateIssued(
      certificate.student,
      certificate.program,
      certificate,
      certificate.pdfFilePath
    );

    certificate.emailSent = true;
    certificate.emailSentAt = new Date();
    await certificate.save();

    res.status(200).json({
      success: true,
      message: `Certificate email resent successfully to ${certificate.student.email}`
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/admin/certificates
// @access  Private (Admin)
const getAdminCertificates = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { certificateId: { $regex: search, $options: 'i' } },
        { studentName: { $regex: search, $options: 'i' } },
        { programTitle: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [certificates, total] = await Promise.all([
      Certificate.find(query)
        .populate('student', 'email phoneNumber')
        .populate('program', 'level')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Certificate.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: certificates.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      certificates
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyCertificates,
  verifyCertificate,
  downloadCertificate,
  adminApproveCertificate,
  adminRegenerateCertificate,
  adminResendEmail,
  getAdminCertificates
};
