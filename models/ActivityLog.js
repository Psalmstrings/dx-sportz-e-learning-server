const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsUser',
      required: true
    },
    action: {
      type: String,
      required: true
    },
    targetEntity: {
      type: String,
      required: true
    },
    targetId: {
      type: String,
      default: ''
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

activityLogSchema.index({ admin: 1 });
activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('LmsActivityLog', activityLogSchema);
