const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    applicationId: {
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
    status: {
      type: String,
      enum: ['Pending', 'Payment Verification Required', 'Approved', 'Rejected', 'Completed', 'Certified'],
      default: 'Payment Verification Required'
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'NGN'
    },
    // Payment evidence
    receiptFile: {
      type: String,
      default: ''
    },
    receiptFileName: {
      type: String,
      default: ''
    },
    receiptMimeType: {
      type: String,
      default: ''
    },
    receiptUploadedAt: {
      type: Date,
      default: null
    },
    transactionReference: {
      type: String,
      default: ''
    },
    paymentDate: {
      type: Date,
      default: null
    },
    paymentNotes: {
      type: String,
      default: ''
    },
    // Admin Review
    adminNotes: {
      type: String,
      default: ''
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsUser',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

applicationSchema.index({ student: 1 });
applicationSchema.index({ program: 1 });
applicationSchema.index({ status: 1 });

module.exports = mongoose.model('LmsApplication', applicationSchema);
