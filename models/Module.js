const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
  {
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsProgram',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    order: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published'
    }
  },
  { timestamps: true }
);

moduleSchema.index({ program: 1, order: 1 });

module.exports = mongoose.model('LmsModule', moduleSchema);
