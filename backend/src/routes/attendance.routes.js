const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const attendanceController = require('../controllers/attendance.controller');
const { validate } = require('../middleware/validate');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Validation rules
const checkInValidation = [
  body('memberId').isUUID().withMessage('Invalid member ID'),
  body('verificationMethod').optional().isIn(['manual', 'biometric', 'card']).withMessage('Invalid verification method'),
  body('notes').optional().isString().withMessage('Valid notes are required')
];

const checkOutValidation = [
  body('memberId').isUUID().withMessage('Invalid member ID'),
  body('notes').optional().isString().withMessage('Valid notes are required')
];

const updateAttendanceValidation = [
  param('id').isUUID().withMessage('Invalid attendance ID'),
  body('checkIn').optional().isISO8601().withMessage('Valid check-in time is required'),
  body('checkOut').optional().isISO8601().withMessage('Valid check-out time is required'),
  body('status').optional().isIn(['present', 'absent', 'late', 'half_day']).withMessage('Invalid status'),
  body('notes').optional().isString().withMessage('Valid notes are required')
];

// Routes
router.get('/', auth, attendanceController.getAllAttendance);
router.get('/:id', auth, [
  param('id').isUUID().withMessage('Invalid attendance ID')
], validate, attendanceController.getAttendanceById);

router.post('/check-in', auth, checkInValidation, validate, attendanceController.checkIn);
router.post('/check-out', auth, checkOutValidation, validate, attendanceController.checkOut);
router.put('/:id', auth, admin, updateAttendanceValidation, validate, attendanceController.updateAttendance);
router.delete('/:id', auth, admin, [
  param('id').isUUID().withMessage('Invalid attendance ID')
], validate, attendanceController.deleteAttendance);

router.get('/member/:memberId', auth, [
  param('memberId').isUUID().withMessage('Invalid member ID')
], validate, attendanceController.getMemberAttendance);

router.get('/today', auth, attendanceController.getTodayAttendance);
router.get('/report', auth, attendanceController.getAttendanceReport);

module.exports = router;