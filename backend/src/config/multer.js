const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const logger = require('../utils/logger');

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Storage configuration for member photos
const memberStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/members';
    ensureDirectoryExists(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `member-${uniqueSuffix}${ext}`);
  }
});

// Storage configuration for receipts
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/receipts';
    ensureDirectoryExists(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed.'), false);
  }
};

// Multer instances
const uploadMemberPhoto = multer({
  storage: memberStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

// Memory storage for biometric data
const biometricStorage = multer.memoryStorage();

const uploadBiometric = multer({
  storage: biometricStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

module.exports = {
  uploadMemberPhoto,
  uploadReceipt,
  uploadBiometric
};