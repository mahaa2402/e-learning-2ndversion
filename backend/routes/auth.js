const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/Login');
const { sendSignupOTP, verifyOTP, resendOTP } = require('../controllers/OTPController');

// Login route
router.post('/login', login);

// OTP routes
router.post('/send-otp', sendSignupOTP);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Register route (requires OTP verification)
router.post('/register', register);

module.exports = router; 
