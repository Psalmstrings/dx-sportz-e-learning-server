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
  // Supports Audios, Videos, Pictures, PDF, DOCS, Slides and Other Document Formats
  const allowed = /pdf|doc|docx|txt|rtf|odt|ppt|pptx|odp|key|mp4|webm|mkv|mov|avi|wmv|ogv|m4v|mp3|wav|m4a|ogg|aac|flac|wma|png|jpg|jpeg|webp|gif|svg|bmp|xls|xlsx|csv|zip|rar|7z/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowed.test(ext)) {
    return cb(null, true);
  }
  cb(new Error('Unsupported material file format. Supported formats include Audios (MP3, WAV, M4A, OGG, AAC), Videos (MP4, WEBM, MKV, MOV), Pictures (PNG, JPG, WEBP, SVG), PDF, DOCS (DOC, DOCX, TXT), Slides (PPT, PPTX), spreadsheets, and ZIP archives.'));
};

const uploadMaterial = multer({
  storage: materialStorage,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB limit for course files
  fileFilter: materialFilter
});

module.exports = {
  uploadReceipt,
  uploadMaterial
};
