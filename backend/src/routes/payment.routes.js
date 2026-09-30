const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const paymentController = require('../controllers/payment.controller');
const { validate } = require('../middleware/validate');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// ------------------------------------------------------------
// FIX: memberId and membershipId were both required(.isUUID()),
// which meant Billing's "Add Income" (Other Income) could never
// save — other income routinely has no membership, and can have
// no member at all (e.g. a walk-in day-pass). Both are now
// optional, and only validated as a UUID if present. receiptType
// was added so the payments row is tagged correctly (the frontend
// already reads this to sort revenue into Membership / Admission
// / Other Income columns); it defaults to 'other_income' here
// since new-membership and renewal payments are created by the
// dedicated /members/enroll and /members/:id/renew endpoints, not
// this route.
// ------------------------------------------------------------

const createPaymentValidation = [
  body('memberId').optional({ nullable: true }).isUUID().withMessage('Invalid member ID'),
  body('membershipId').optional({ nullable: true }).isUUID().withMessage('Invalid membership ID'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('paymentMethod').isIn(['cash', 'card', 'upi', 'bank_transfer', 'other']).withMessage('Invalid payment method'),
  body('paymentStatus').optional().isIn(['pending', 'completed', 'failed', 'refunded']).withMessage('Invalid payment status'),
  body('receiptType').optional().isIn(['new_membership', 'renewal', 'other_income']).withMessage('Invalid receipt type'),
  body('transactionId').optional().isString().withMessage('Valid transaction ID is required'),
  body('description').optional().isString(),
  body('name').optional().isString(),
];

const updatePaymentValidation = [
  param('id').isUUID().withMessage('Invalid payment ID'),
  body('paymentStatus').optional().isIn(['pending', 'completed', 'failed', 'refunded']).withMessage('Invalid payment status'),
  body('transactionId').optional().isString().withMessage('Valid transaction ID is required')
];

// Routes
router.get('/', auth, paymentController.getAllPayments);
router.get('/:id', auth, [
  param('id').isUUID().withMessage('Invalid payment ID')
], validate, paymentController.getPaymentById);

router.post('/', auth, admin, createPaymentValidation, validate, paymentController.createPayment);
router.put('/:id', auth, admin, updatePaymentValidation, validate, paymentController.updatePayment);
router.delete('/:id', auth, admin, [
  param('id').isUUID().withMessage('Invalid payment ID')
], validate, paymentController.deletePayment);

router.get('/member/:memberId', auth, [
  param('memberId').isUUID().withMessage('Invalid member ID')
], validate, paymentController.getMemberPayments);


module.exports = router;
