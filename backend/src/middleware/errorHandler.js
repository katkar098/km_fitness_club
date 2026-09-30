const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    query: req.query,
    params: req.params
  });

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB.'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files uploaded.'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Database errors
  if (
    (req.path.startsWith('/payments') || req.originalUrl?.includes('/payments')) &&
    err.code === '23502'
  ) {
    return res.status(409).json({
      success: false,
      message: 'Supabase still requires member_id or membership_id for this payment. Run backend/src/sql/migrations/20260926_billing_other_income.sql against the same database configured in backend/.env, then restart the backend.'
    });
  }

  if (
    (req.path.startsWith('/payments') || req.originalUrl?.includes('/payments')) &&
    err.code === '23514'
  ) {
    return res.status(409).json({
      success: false,
      message: 'A Supabase payment check constraint rejected other_income. Run backend/src/sql/migrations/20260926_billing_other_income.sql against the same database configured in backend/.env, then restart the backend.'
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry found'
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
