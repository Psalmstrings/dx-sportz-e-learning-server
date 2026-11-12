const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsModule',
      required: true
    },
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsProgram',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      enum: ['video', 'external_video', 'pdf', 'text', 'document', 'resource_link', 'assignment', 'quiz'],
      default: 'text'
    },
    // For text content or formatted rich text
    content: {
      type: String,
      default: ''
    },
    // For video URL, YouTube/Vimeo link, or external resource link
    mediaUrl: {
      type: String,
      default: ''
    },
    // For secure local file upload (e.g. PDF course note or document)
    filePath: {
      type: String,
      default: ''
    },
    fileName: {
      type: String,
      default: ''
    },
    fileSize: {
      type: Number,
      default: 0
    },
    durationMinutes: {
      type: Number,
      default: 15
    },
    order: {
      type: Number,
      default: 1
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published'
    }
  },
  { timestamps: true }
);

lessonSchema.index({ module: 1, order: 1 });
lessonSchema.index({ program: 1 });

module.exports = mongoose.model('LmsLesson', lessonSchema);
