const Setting = require('../models/Setting');
const ActivityLog = require('../models/ActivityLog');

// Default initial settings
const DEFAULT_SETTINGS = {
  payment: {
    bankName: process.env.BANK_NAME || 'Zenith Bank',
    accountName: process.env.ACCOUNT_NAME || 'DX SPORTS ACADEMY LTD',
    accountNumber: process.env.ACCOUNT_NUMBER || '1234567890',
    instructions: process.env.PAYMENT_INSTRUCTIONS || 'Make a direct bank transfer of the program tuition fee to the account details above. After transfer, upload your payment receipt/screenshot and transaction reference number below for instant administrative verification.'
  },
  academy: {
    name: process.env.ACADEMY_NAME || 'DX Football Academy',
    email: process.env.ACADEMY_EMAIL || 'academy@dxsportz.com',
    phone: '+234 800 000 0000',
    address: 'Lagos, Nigeria'
  },
  signatory: {
    name: 'Academy Technical Director',
    title: 'Head of Coach Education & Technical Development'
  },
  policy: {
    defaultAccessDays: 30
  }
};

// @route   GET /api/settings/public
// @access  Public
const getPublicSettings = async (req, res, next) => {
  try {
    const paymentSetting = await Setting.findOne({ key: 'payment' });
    const academySetting = await Setting.findOne({ key: 'academy' });

    res.status(200).json({
      success: true,
      payment: paymentSetting ? paymentSetting.value : DEFAULT_SETTINGS.payment,
      academy: academySetting ? academySetting.value : DEFAULT_SETTINGS.academy
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/admin/settings
// @access  Private (Admin)
const getAdminSettings = async (req, res, next) => {
  try {
    const settings = await Setting.find();
    const result = { ...DEFAULT_SETTINGS };

    settings.forEach(s => {
      result[s.key] = s.value;
    });

    res.status(200).json({
      success: true,
      settings: result
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/admin/settings
// @access  Private (Admin)
const updateSettings = async (req, res, next) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ success: false, message: 'Setting key and value are required.' });
    }

    const updated = await Setting.findOneAndUpdate(
      { key },
      { value, updatedBy: req.user._id },
      { upsert: true, new: true }
    );

    await ActivityLog.create({
      admin: req.user._id,
      action: 'UPDATE_SETTINGS',
      targetEntity: 'Setting',
      targetId: key,
      details: { key, updatedValue: value }
    });

    res.status(200).json({
      success: true,
      message: `Setting '${key}' updated successfully`,
      setting: updated
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicSettings,
  getAdminSettings,
  updateSettings
};
