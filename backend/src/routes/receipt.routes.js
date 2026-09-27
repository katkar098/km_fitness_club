const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const receiptController = require('../controllers/receipt.controller');
const { validate } = require('../middleware/validate');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Routes
router.get('/', auth, receiptController.getAllReceipts);
router.get('/:id', auth, [
  param('id').isUUID().withMessage('Invalid receipt ID')
], validate, receiptController.getReceiptById);

router.get('/number/:receiptNumber', auth, [
  param('receiptNumber').isString().withMessage('Valid receipt number is required')
], validate, receiptController.getReceiptByNumber);

router.get('/member/:memberId', auth, [
  param('memberId').isUUID().withMessage('Invalid member ID')
], validate, receiptController.getMemberReceipts);

router.get('/:id/download', auth, [
  param('id').isUUID().withMessage('Invalid receipt ID')
], validate, receiptController.downloadReceipt);

router.post('/generate', auth, admin, receiptController.generateReceipt);
router.post('/:id/email', auth, admin, [
  param('id').isUUID().withMessage('Invalid receipt ID'),
  body('email').isEmail().withMessage('Valid email is required')
], validate, receiptController.emailReceipt);

module.exports = router;