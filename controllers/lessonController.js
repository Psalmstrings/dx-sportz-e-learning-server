const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const path = require('path');
const fs = require('fs');

// @route   GET /api/lessons/:id
// @access  Private (Enrolled Student or Admin)
const getLessonById = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id)
      .populate('module', 'title order')
      .populate('program', 'title slug');

    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    // Access check for student
    if (req.user.role !== 'admin') {
      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        program: lesson.program._id
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You are not enrolled in this program.'
        });
      }

      if (enrollment.status === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Your enrollment in this program has been suspended.'
        });
      }

      if (!enrollment.isAccessActive()) {
        return res.status(403).json({
          success: false,
          code: 'ACCESS_EXPIRED',
          message: 'Your 30-day course access period has expired. Please contact academy administration for renewal.'
        });
      }
    }

    res.status(200).json({
      success: true,
      lesson
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/lessons/material/:id/download
// @access  Private (Enrolled Student with Active Access or Admin)
const serveMaterialFile = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson || !lesson.filePath) {
      return res.status(404).json({ success: false, message: 'Course material file not found.' });
    }

    // Access check
    if (req.user.role !== 'admin') {
      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        program: lesson.program
      });

      if (!enrollment || !enrollment.isAccessActive()) {
        return res.status(403).json({
          success: false,
          code: 'ACCESS_EXPIRED',
          message: 'Access to this protected course material requires an active, valid enrollment.'
        });
      }
    }

    const fullPath = path.resolve(lesson.filePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: 'Physical material file does not exist on server.' });
    }

    res.download(fullPath, lesson.fileName || path.basename(fullPath));
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/admin/lessons
// @access  Private (Admin)
const createLesson = async (req, res, next) => {
  try {
    const {
      moduleId,
      programId,
      title,
      description,
      type,
      content,
      mediaUrl,
      durationMinutes,
      order,
      isRequired,
      status
    } = req.body;

    if (!moduleId || !programId || !title) {
      return res.status(400).json({
        success: false,
        message: 'Module ID, program ID, and lesson title are required.'
      });
    }

    let lessonOrder = order;
    if (!lessonOrder) {
      const highest = await Lesson.findOne({ module: moduleId }).sort({ order: -1 });
      lessonOrder = highest ? highest.order + 1 : 1;
    }

    let filePath = '';
    let fileName = '';
    let fileSize = 0;

    if (req.file) {
      filePath = req.file.path;
      fileName = req.file.originalname;
      fileSize = req.file.size;
    }

    const lesson = await Lesson.create({
      module: moduleId,
      program: programId,
      title: title.trim(),
      description: description || '',
      type: type || 'text',
      content: content || '',
      mediaUrl: mediaUrl || '',
      filePath,
      fileName,
      fileSize,
      durationMinutes: durationMinutes ? Number(durationMinutes) : 15,
      order: lessonOrder,
      isRequired: isRequired !== undefined ? isRequired : true,
      status: status || 'published'
    });

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      lesson
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/admin/lessons/:id
// @access  Private (Admin)
const updateLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    const {
      title,
      description,
      type,
      content,
      mediaUrl,
      durationMinutes,
      order,
      isRequired,
      status
    } = req.body;

    if (title) lesson.title = title.trim();
    if (description !== undefined) lesson.description = description;
    if (type) lesson.type = type;
    if (content !== undefined) lesson.content = content;
    if (mediaUrl !== undefined) lesson.mediaUrl = mediaUrl;
    if (durationMinutes !== undefined) lesson.durationMinutes = Number(durationMinutes);
    if (order !== undefined) lesson.order = Number(order);
    if (isRequired !== undefined) lesson.isRequired = isRequired;
    if (status) lesson.status = status;

    if (req.file) {
      lesson.filePath = req.file.path;
      lesson.fileName = req.file.originalname;
      lesson.fileSize = req.file.size;
    }

    await lesson.save();

    res.status(200).json({
      success: true,
      message: 'Lesson updated successfully',
      lesson
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/admin/lessons/:id
// @access  Private (Admin)
const deleteLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    // Remove file if exists
    if (lesson.filePath && fs.existsSync(lesson.filePath)) {
      try {
        fs.unlinkSync(lesson.filePath);
      } catch (e) {}
    }

    await Lesson.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLessonById,
  serveMaterialFile,
  createLesson,
  updateLesson,
  deleteLesson
};
