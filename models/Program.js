const mongoose = require('mongoose');

const programSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Program title is required'],
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Professional', 'Custom'],
      default: 'Beginner'
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0
    },
    currency: {
      type: String,
      default: 'NGN'
    },
    duration: {
      type: String,
      default: '4 Weeks'
    },
    accessDurationDays: {
      type: Number,
      default: 30
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published'
    },
    requirements: {
      type: [String],
      default: []
    },
    objectives: {
      type: [String],
      default: []
    },
    courseOutline: {
      type: [String],
      default: []
    },
    thumbnail: {
      type: String,
      default: ''
    },
    bannerImage: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsUser'
    }
  },
  { timestamps: true }
);

programSchema.index({ status: 1 });
programSchema.index({ level: 1 });

module.exports = mongoose.model('LmsProgram', programSchema);
