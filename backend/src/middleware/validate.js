const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = {};
  errors.array().forEach(err => {
    if (!extractedErrors[err.path]) {
      extractedErrors[err.path] = [];
    }
    extractedErrors[err.path].push(err.msg);
  });

  return res.status(400).json({
    success: false,
    message: 'Validation error',
    errors: extractedErrors
  });
};

const validateQuery = (req, res, next) => {
  // Validate pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  if (page < 1 || limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'Invalid pagination parameters'
    });
  }

  req.pagination = { page, limit, offset: (page - 1) * limit };
  next();
};

module.exports = {
  validate,
  validateQuery
};