const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsUser',
      required: true
    },
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsProgram',
      required: true
    },
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsEnrollment',
      required: true
    },
    studentName: {
      type: String,
      required: true
    },
    programTitle: {
      type: String,
      required: true
    },
    programLevel: {
      type: String,
      default: 'Professional'
    },
    issuedDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['VALID', 'REVOKED'],
      default: 'VALID'
    },
    pdfFilePath: {
      type: String,
      default: ''
    },
    verificationUrl: {
      type: String,
      required: true
    },
    signatoryName: {
      type: String,
      default: 'Academy Director'
    },
    signatoryTitle: {
      type: String,
      default: 'Head of Technical Development'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsUser'
    },
    emailSent: {
      type: Boolean,
      default: false
    },
    emailSentAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

certificateSchema.index({ student: 1 });
certificateSchema.index({ program: 1 });

module.exports = mongoose.model('LmsCertificate', certificateSchema);
