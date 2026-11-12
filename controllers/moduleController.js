const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const ActivityLog = require('../models/ActivityLog');

// @route   GET /api/programs/:programId/modules
// @access  Public / Enrolled / Admin
const getModules = async (req, res, next) => {
  try {
    const modules = await Module.find({
      program: req.params.programId,
      status: 'published'
    }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      count: modules.length,
      modules
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/admin/modules
// @access  Private (Admin)
const createModule = async (req, res, next) => {
  try {
    const { programId, title, description, order, status } = req.body;
    if (!programId || !title) {
      return res.status(400).json({ success: false, message: 'Program ID and module title are required.' });
    }

    let moduleOrder = order;
    if (!moduleOrder) {
      const highest = await Module.findOne({ program: programId }).sort({ order: -1 });
      moduleOrder = highest ? highest.order + 1 : 1;
    }

    const newModule = await Module.create({
      program: programId,
      title: title.trim(),
      description: description || '',
      order: moduleOrder,
      status: status || 'published'
    });

    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      module: newModule
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/admin/modules/:id
// @access  Private (Admin)
const updateModule = async (req, res, next) => {
  try {
    const mod = await Module.findById(req.params.id);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    const { title, description, order, status } = req.body;
    if (title) mod.title = title.trim();
    if (description !== undefined) mod.description = description;
    if (order !== undefined) mod.order = Number(order);
    if (status) mod.status = status;

    await mod.save();

    res.status(200).json({
      success: true,
      message: 'Module updated successfully',
      module: mod
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/admin/modules/:id
// @access  Private (Admin)
const deleteModule = async (req, res, next) => {
  try {
    const mod = await Module.findById(req.params.id);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    // Delete associated lessons
    await Lesson.deleteMany({ module: mod._id });
    await Module.findByIdAndDelete(mod._id);

    res.status(200).json({
      success: true,
      message: 'Module and associated lessons deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/admin/modules/reorder
// @access  Private (Admin)
const reorderModules = async (req, res, next) => {
  try {
    const { moduleOrders } = req.body; // Array of { id, order }
    if (!Array.isArray(moduleOrders)) {
      return res.status(400).json({ success: false, message: 'moduleOrders array required.' });
    }

    await Promise.all(
      moduleOrders.map(item => Module.findByIdAndUpdate(item.id, { order: item.order }))
    );

    res.status(200).json({
      success: true,
      message: 'Modules reordered successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getModules,
  createModule,
  updateModule,
  deleteModule,
  reorderModules
};
