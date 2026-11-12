const crypto = require('crypto');

/**
 * Generate a unique sequential-style Application ID
 * Example: APP-2026-000123
 */
const generateApplicationId = async (ApplicationModel) => {
  const year = new Date().getFullYear();
  const count = await ApplicationModel.countDocuments();
  const sequential = String(count + 1).padStart(6, '0');
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const candidate = `APP-${year}-${sequential}`;

  const exists = await ApplicationModel.findOne({ applicationId: candidate });
  if (exists) {
    return `APP-${year}-${sequential}-${randomSuffix}`;
  }
  return candidate;
};

/**
 * Generate a unique Certificate ID
 * Example: FA-2026-000123
 */
const generateCertificateId = async (CertificateModel) => {
  const year = new Date().getFullYear();
  const count = await CertificateModel.countDocuments();
  const sequential = String(count + 1).padStart(6, '0');
  const candidate = `FA-${year}-${sequential}`;

  const exists = await CertificateModel.findOne({ certificateId: candidate });
  if (exists) {
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `FA-${year}-${sequential}-${randomSuffix}`;
  }
  return candidate;
};

module.exports = {
  generateApplicationId,
  generateCertificateId
};
