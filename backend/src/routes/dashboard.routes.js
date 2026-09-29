const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Routes
router.get('/stats', auth, dashboardController.getDashboardStats);
router.get('/recent-activity', auth, dashboardController.getRecentActivity);
router.get('/member-growth', auth, admin, dashboardController.getMemberGrowth);
router.get('/revenue', auth, admin, dashboardController.getRevenueStats);
router.get('/membership-distribution', auth, admin, dashboardController.getMembershipDistribution);
router.get('/top-members', auth, admin, dashboardController.getTopMembers);

module.exports = router;
