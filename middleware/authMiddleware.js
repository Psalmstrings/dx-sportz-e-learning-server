const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');

// Protect route with JWT verification
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource. Token missing.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dx_academy_secret_jwt_key_2026_super_secure');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account associated with token no longer exists.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact academy administration.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.'
    });
  }
};

// Role-based authorization guard
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user ? req.user.role : 'unauthorized'}' is not permitted to access this administrative endpoint.`
      });
    }
    next();
  };
};

// Check if student has active valid enrollment for a program
const requireActiveEnrollment = async (req, res, next) => {
  try {
    // If admin, bypass
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    const programId = req.params.programId || req.body.programId || req.query.programId;
    if (!programId) {
      return res.status(400).json({ success: false, message: 'Program identification missing.' });
    }

    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      program: programId
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this football program.'
      });
    }

    if (enrollment.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your enrollment in this program is currently suspended.'
      });
    }

    if (!enrollment.isAccessActive()) {
      return res.status(403).json({
        success: false,
        code: 'ACCESS_EXPIRED',
        message: 'Your 30-day course access period has expired. Please contact administration or apply for access renewal.'
      });
    }

    req.enrollment = enrollment;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  protect,
  authorize,
  requireActiveEnrollment
};
