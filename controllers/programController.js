const Program = require('../models/Program');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const ActivityLog = require('../models/ActivityLog');

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// @route   GET /api/programs
// @access  Public
const getPrograms = async (req, res, next) => {
  try {
    const { level, status = 'published' } = req.query;
    const query = {};

    // By default public only sees published programs
    if (status) query.status = status;
    if (level && level !== 'All') query.level = level;

    const programs = await Program.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: programs.length,
      programs
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/programs/:slug
// @access  Public
const getProgramBySlug = async (req, res, next) => {
  try {
    const program = await Program.findOne({ slug: req.params.slug.toLowerCase() });
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found.' });
    }

    // Fetch published modules and lesson titles for curriculum overview
    const modules = await Module.find({
      program: program._id,
      status: 'published'
    }).sort({ order: 1 });

    const moduleIds = modules.map(m => m._id);
    const lessons = await Lesson.find({
      module: { $in: moduleIds },
      status: 'published'
    })
      .select('title type durationMinutes order module isRequired')
      .sort({ order: 1 });

    const curriculum = modules.map(mod => ({
      _id: mod._id,
      title: mod.title,
      description: mod.description,
      order: mod.order,
      lessons: lessons.filter(l => l.module.toString() === mod._id.toString())
    }));

    res.status(200).json({
      success: true,
      program,
      curriculum
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/admin/programs
// @access  Private (Admin)
const getAdminPrograms = async (req, res, next) => {
  try {
    const programs = await Program.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: programs.length,
      programs
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/admin/programs
// @access  Private (Admin)
const createProgram = async (req, res, next) => {
  try {
    const {
      title,
      description,
      level,
      price,
      currency,
      duration,
      accessDurationDays,
      status,
      requirements,
      objectives,
      courseOutline,
      thumbnail
    } = req.body;

    if (!title || !description || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and tuition price are required.'
      });
    }

    let slug = slugify(title);
    const slugExists = await Program.findOne({ slug });
    if (slugExists) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const program = await Program.create({
      title: title.trim(),
      slug,
      description,
      level: level || 'Beginner',
      price: Number(price),
      currency: currency || 'NGN',
      duration: duration || '4 Weeks',
      accessDurationDays: accessDurationDays ? Number(accessDurationDays) : 30,
      status: status || 'published',
      requirements: Array.isArray(requirements) ? requirements : (requirements ? requirements.split('\n') : []),
      objectives: Array.isArray(objectives) ? objectives : (objectives ? objectives.split('\n') : []),
      courseOutline: Array.isArray(courseOutline) ? courseOutline : [],
      thumbnail: thumbnail || '',
      createdBy: req.user._id
    });

    await ActivityLog.create({
      admin: req.user._id,
      action: 'CREATE_PROGRAM',
      targetEntity: 'Program',
      targetId: program._id.toString(),
      details: { title: program.title, price: program.price }
    });

    res.status(201).json({
      success: true,
      message: 'Program created successfully',
      program
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/admin/programs/:id
// @access  Private (Admin)
const updateProgram = async (req, res, next) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found.' });
    }

    const {
      title,
      description,
      level,
      price,
      currency,
      duration,
      accessDurationDays,
      status,
      requirements,
      objectives,
      thumbnail
    } = req.body;

    if (title && title !== program.title) {
      program.title = title.trim();
      let newSlug = slugify(title);
      const slugExists = await Program.findOne({ slug: newSlug, _id: { $ne: program._id } });
      if (slugExists) newSlug = `${newSlug}-${Date.now().toString().slice(-4)}`;
      program.slug = newSlug;
    }

    if (description !== undefined) program.description = description;
    if (level !== undefined) program.level = level;
    if (price !== undefined) program.price = Number(price);
    if (currency !== undefined) program.currency = currency;
    if (duration !== undefined) program.duration = duration;
    if (accessDurationDays !== undefined) program.accessDurationDays = Number(accessDurationDays);
    if (status !== undefined) program.status = status;
    if (requirements !== undefined) {
      program.requirements = Array.isArray(requirements) ? requirements : requirements.split('\n');
    }
    if (objectives !== undefined) {
      program.objectives = Array.isArray(objectives) ? objectives : objectives.split('\n');
    }
    if (thumbnail !== undefined) program.thumbnail = thumbnail;

    await program.save();

    await ActivityLog.create({
      admin: req.user._id,
      action: 'UPDATE_PROGRAM',
      targetEntity: 'Program',
      targetId: program._id.toString(),
      details: { title: program.title }
    });

    res.status(200).json({
      success: true,
      message: 'Program updated successfully',
      program
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/admin/programs/:id
// @access  Private (Admin)
const deleteProgram = async (req, res, next) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found.' });
    }

    // Soft delete / archive
    program.status = 'archived';
    await program.save();

    await ActivityLog.create({
      admin: req.user._id,
      action: 'ARCHIVE_PROGRAM',
      targetEntity: 'Program',
      targetId: program._id.toString(),
      details: { title: program.title }
    });

    res.status(200).json({
      success: true,
      message: 'Program archived successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPrograms,
  getProgramBySlug,
  getAdminPrograms,
  createProgram,
  updateProgram,
  deleteProgram
};
