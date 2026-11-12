const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure destination directories exist
const receiptsDir = path.join(__dirname, '..', 'uploads', 'receipts');
const materialsDir = path.join(__dirname, '..', 'uploads', 'materials');
const certsDir = path.join(__dirname, '..', 'uploads', 'certificates');

[receiptsDir, materialsDir, certsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage for Payment Receipts
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, receiptsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `receipt_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});

const receiptFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only image files (JPG, PNG, WEBP) or PDF receipts are allowed.'));
};

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: receiptFilter
});

// Storage for Course Materials (Admin uploads)
const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, materialsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `material_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});

const materialFilter = (req, file, cb) => {
  const allowed = /pdf|doc|docx|ppt|pptx|mp4|webm|zip|png|jpg|jpeg/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowed.test(ext)) {
    return cb(null, true);
  }
  cb(new Error('Unsupported material file format. Please upload PDF, Word, PowerPoint, video, or image.'));
};

const uploadMaterial = multer({
  storage: materialStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for course files
  fileFilter: materialFilter
});

module.exports = {
  uploadReceipt,
  uploadMaterial
};
