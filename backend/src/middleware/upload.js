const multer = require('multer');
const path = require('path');

// Configure storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    if (file.fieldname === 'photo') {
      uploadPath += 'members/';
    } else if (file.fieldname === 'receipt') {
      uploadPath += 'receipts/';
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

// Multer middleware
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

// Single file upload
const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

// Multiple files upload
const uploadMultiple = (fields) => {
  return upload.fields(fields);
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple
};