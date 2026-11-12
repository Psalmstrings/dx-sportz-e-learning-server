const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dx_academy_secret_jwt_key_2026_super_secure';
const PREVIEW_COOKIE_NAME = 'dx_academy_preview';

/**
 * Middleware that guards all Academy LMS endpoints against public unauthorized access.
 * Allows:
 * 1. Requests carrying a valid preview token (via HTTP-only cookie, x-preview-token header, or dx-preview-token header)
 * 2. Requests carrying a valid LMS admin JWT token
 * Blocks:
 * Unauthorized public visitors with HTTP 403 Forbidden.
 */
const requirePreviewAccess = async (req, res, next) => {
  // 1. Check HTTP-only cookie
  let token = req.cookies && req.cookies[PREVIEW_COOKIE_NAME];

  // 2. Check preview headers
  if (!token) {
    token = req.headers['x-preview-token'] || req.headers['dx-preview-token'];
  }

  // If a preview token was found, verify it
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.isPreviewAuthorized || decoded.type === 'academy_preview') {
        req.isPreviewAuthorized = true;
        return next();
      }
    } catch (err) {
      // Invalid/expired preview token, fall through to check admin auth
    }
  }

  // 3. Check if request has an Authorization Bearer token (preview token or LMS admin token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const bearerToken = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(bearerToken, JWT_SECRET);

      if (decoded.isPreviewAuthorized || decoded.type === 'academy_preview') {
        req.isPreviewAuthorized = true;
        return next();
      }

      if (decoded.id) {
        const user = await User.findById(decoded.id).select('role status');
        if (user && user.role === 'admin' && user.status !== 'suspended') {
          req.isPreviewAuthorized = true;
          return next();
        }
      }
    } catch (err) {
      // Bearer token invalid or expired
    }
  }

  // Block unauthorized request
  return res.status(403).json({
    success: false,
    code: 'ACADEMY_PREVIEW_RESTRICTED',
    message: 'DX Academy is currently in private preview mode. Authorized preview access required.'
  });
};

module.exports = {
  requirePreviewAccess
};
