// Simple dashboard route for testing
const express = require('express');
const router = express.Router();
const { getSimpleDashboardStats } = require('../controllers/SimpleDashboard');
const { authenticateToken } = require('../middleware/auth');

// Simple dashboard statistics route
router.get('/simple-dashboard-statistics', authenticateToken, getSimpleDashboardStats);

module.exports = router;



