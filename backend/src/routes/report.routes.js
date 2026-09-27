const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const reportController = require('../controllers/report.controller');
const { validate } = require('../middleware/validate');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Routes
router.get('/attendance', auth, admin, reportController.getAttendanceReport);
router.get('/membership', auth, admin, reportController.getMembershipReport);
router.get('/payment', auth, admin, reportController.getPaymentReport);
router.get('/member', auth, admin, reportController.getMemberReport);

router.get('/attendance/export', auth, admin, reportController.exportAttendanceReport);
router.get('/membership/export', auth, admin, reportController.exportMembershipReport);
router.get('/payment/export', auth, admin, reportController.exportPaymentReport);

module.exports = router;