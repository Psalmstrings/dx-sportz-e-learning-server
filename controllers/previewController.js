const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dx_academy_secret_jwt_key_2026_super_secure';
const PREVIEW_COOKIE_NAME = 'dx_academy_preview';
const SESSION_EXPIRY_HOURS = 24;

/**
 * Safe string comparison using crypto.timingSafeEqual to prevent timing attacks.
 * Does not log or leak the submitted code.
 */
const safeCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a.trim());
  const bufB = Buffer.from(b.trim());

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Helper to extract preview or user token from request
 */
const extractTokenFromRequest = (req) => {
  // 1. Check HTTP-only cookie
  if (req.cookies && req.cookies[PREVIEW_COOKIE_NAME]) {
    return { token: req.cookies[PREVIEW_COOKIE_NAME], source: 'cookie' };
  }

  // 2. Check dedicated preview headers
  const customHeader = req.headers['x-preview-token'] || req.headers['dx-preview-token'];
  if (customHeader) {
    return { token: customHeader, source: 'header' };
  }

  // 3. Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return { token: req.headers.authorization.split(' ')[1], source: 'authorization' };
  }

  return null;
};

/**
 * @desc    Verify private access code and grant temporary preview session
 * @route   POST /api/academy/preview-access
 * @access  Public (Rate limited)
 */
exports.verifyAccess = async (req, res) => {
  try {
    const { accessCode } = req.body;

    if (!accessCode || typeof accessCode !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A valid preview access code is required.'
      });
    }

    const configuredSecret = process.env.ACADEMY_PREVIEW_CODE;

    if (!configuredSecret) {
      console.error('[Preview Access] ACADEMY_PREVIEW_CODE is not configured in environment variables.');
      return res.status(500).json({
        success: false,
        message: 'Preview access verification is currently unavailable. Please contact the administrator.'
      });
    }

    const isValid = safeCompare(accessCode, configuredSecret);

    if (!isValid) {
      // Intentionally generic error without logging or echoing the user's input
      return res.status(401).json({
        success: false,
        message: 'Invalid access code. Please check your credentials and try again.'
      });
    }

    // Generate signed JWT for the preview session
    const payload = {
      type: 'academy_preview',
      isPreviewAuthorized: true,
      role: 'preview',
      createdAt: Date.now()
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: `${SESSION_EXPIRY_HOURS}h`
    });

    const isProduction = process.env.NODE_ENV === 'production';

    // Set secure HTTP-only cookie
    res.cookie(PREVIEW_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: SESSION_EXPIRY_HOURS * 60 * 60 * 1000,
      path: '/'
    });

    return res.status(200).json({
      success: true,
      message: 'Preview access verified successfully. Welcome to DX Academy.',
      token,
      expiresIn: SESSION_EXPIRY_HOURS * 3600
    });
  } catch (error) {
    console.error('[Preview Access Error]', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during preview verification.'
    });
  }
};

/**
 * @desc    Check whether current visitor has active preview or admin authorization
 * @route   GET /api/academy/preview-status
 * @access  Public
 */
exports.checkStatus = async (req, res) => {
  try {
    const extracted = extractTokenFromRequest(req);

    if (!extracted) {
      return res.status(200).json({
        success: true,
        authorized: false,
        message: 'No active preview session.'
      });
    }

    try {
      const decoded = jwt.verify(extracted.token, JWT_SECRET);

      // 1. Is it a valid preview token?
      if (decoded.isPreviewAuthorized || decoded.type === 'academy_preview') {
        return res.status(200).json({
          success: true,
          authorized: true,
          role: 'preview',
          expiresAt: decoded.exp ? decoded.exp * 1000 : null
        });
      }

      // 2. Or is it an existing registered admin token?
      if (decoded.id) {
        const user = await User.findById(decoded.id).select('role status');
        if (user && user.role === 'admin' && user.status !== 'suspended') {
          return res.status(200).json({
            success: true,
            authorized: true,
            role: 'admin',
            expiresAt: decoded.exp ? decoded.exp * 1000 : null
          });
        }
      }

      return res.status(200).json({
        success: true,
        authorized: false,
        message: 'Session is not authorized for preview access.'
      });
    } catch (jwtErr) {
      // Expired or tampered token
      return res.status(200).json({
        success: true,
        authorized: false,
        message: 'Preview session expired or invalid.'
      });
    }
  } catch (error) {
    console.error('[Preview Status Error]', error.message);
    return res.status(500).json({
      success: false,
      authorized: false,
      message: 'Failed to verify preview session status.'
    });
  }
};

/**
 * @desc    End preview session and clear preview cookie
 * @route   POST /api/academy/preview-logout
 * @access  Public
 */
exports.exitPreview = (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie(PREVIEW_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/'
  });

  return res.status(200).json({
    success: true,
    message: 'Preview session terminated successfully.'
  });
};
