const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsUser',
      required: true
    },
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsEnrollment',
      required: true
    },
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsProgram',
      required: true
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsModule',
      required: true
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsLesson',
      required: true
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

progressSchema.index({ enrollment: 1, lesson: 1 }, { unique: true });
progressSchema.index({ student: 1, program: 1 });

module.exports = mongoose.model('LmsProgress', progressSchema);
