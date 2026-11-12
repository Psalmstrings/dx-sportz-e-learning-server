const mongoose = require('mongoose');

const extensionSchema = new mongoose.Schema(
  {
    extendedDays: { type: Number, required: true },
    previousExpiry: { type: Date, required: true },
    newExpiry: { type: Date, required: true },
    extendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsUser' },
    reason: { type: String, default: '' }
  },
  { timestamps: true }
);

const enrollmentSchema = new mongoose.Schema(
  {
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
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsApplication',
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended'],
      default: 'active'
    },
    accessStartDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    accessExpiryDate: {
      type: Date,
      required: true
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completionStatus: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started'
    },
    completedAt: {
      type: Date,
      default: null
    },
    certificationStatus: {
      type: String,
      enum: ['not_eligible', 'ready_for_review', 'approved', 'certified'],
      default: 'not_eligible'
    },
    accessExtensions: [extensionSchema]
  },
  { timestamps: true }
);

// Method to verify if access is actively valid
enrollmentSchema.methods.isAccessActive = function () {
  if (this.status !== 'active') return false;
  return new Date() <= new Date(this.accessExpiryDate);
};

enrollmentSchema.index({ student: 1, program: 1 });
enrollmentSchema.index({ status: 1 });
enrollmentSchema.index({ accessExpiryDate: 1 });

module.exports = mongoose.model('LmsEnrollment', enrollmentSchema);
