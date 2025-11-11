const OTP = require('../models/OTP');
const { sendOTPEmail } = require('../services/emailService');
const Employee = require('../models/Employee');
const crypto = require('crypto');

// Generate 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP for signup
const sendSignupOTP = async (req, res) => {
  try {
    console.log('📧 POST /api/auth/send-otp - Sending signup OTP');
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email required',
        details: 'Email address is required to send OTP'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email',
        details: 'Please provide a valid email address'
      });
    }

    // Check if email is already registered
    const existingEmployee = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmployee) {
      return res.status(409).json({ 
        error: 'Email already registered',
        details: 'An account with this email already exists',
        alreadyRegistered: true
      });
    }

    // Check for recent OTP requests (cooldown: 1 minute)
    const recentOTP = await OTP.findOne({
      email: email.toLowerCase(),
      purpose: 'signup',
      createdAt: { $gte: new Date(Date.now() - 60000) } // 1 minute ago
    });

    if (recentOTP) {
      const secondsLeft = Math.ceil((60000 - (Date.now() - recentOTP.createdAt)) / 1000);
      return res.status(429).json({ 
        error: 'Please wait',
        details: `Please wait ${secondsLeft} seconds before requesting another OTP`,
        cooldownSeconds: secondsLeft
      });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Delete any existing unverified OTPs for this email
    await OTP.deleteMany({
      email: email.toLowerCase(),
      purpose: 'signup',
      isVerified: false
    });

    // Save OTP to database
    const otpRecord = new OTP({
      email: email.toLowerCase(),
      otp: otpCode,
      purpose: 'signup',
      expiresAt,
      attempts: 0,
      isVerified: false
    });

    await otpRecord.save();

    // Send OTP via email (or log to console if email not configured)
    try {
      await sendOTPEmail(email.toLowerCase(), otpCode, 'signup');
    } catch (emailError) {
      console.error('⚠️ Failed to send email, but OTP saved:', emailError.message);
      // Don't fail the request if email fails, OTP is still valid
    }

    console.log(`✅ OTP sent to ${email}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 600 // 10 minutes in seconds
    });

  } catch (err) {
    console.error('❌ Send OTP error:', err);
    res.status(500).json({ 
      error: 'Failed to send OTP', 
      message: err.message 
    });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    console.log('🔐 POST /api/auth/verify-otp - Verifying OTP');
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        error: 'Missing fields',
        details: 'Email and OTP are required'
      });
    }

    // Find the most recent unverified OTP for this email
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      purpose: 'signup',
      isVerified: false
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(404).json({ 
        error: 'OTP not found',
        details: 'No OTP found for this email. Please request a new OTP.'
      });
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ 
        error: 'OTP expired',
        details: 'This OTP has expired. Please request a new OTP.'
      });
    }

    // Check attempt limit
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({ 
        error: 'Too many attempts',
        details: 'Maximum verification attempts reached. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      const attemptsLeft = 5 - otpRecord.attempts;
      return res.status(400).json({ 
        error: 'Invalid OTP',
        details: `Incorrect OTP. ${attemptsLeft > 0 ? `${attemptsLeft} attempt(s) remaining.` : 'No attempts remaining.'}`,
        attemptsLeft
      });
    }

    // OTP is correct - mark as verified
    otpRecord.isVerified = true;
    otpRecord.attempts = 0;
    await otpRecord.save();

    console.log(`✅ OTP verified for ${email}`);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      verified: true
    });

  } catch (err) {
    console.error('❌ Verify OTP error:', err);
    res.status(500).json({ 
      error: 'Failed to verify OTP', 
      message: err.message 
    });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    console.log('📧 POST /api/auth/resend-otp - Resending OTP');
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email required',
        details: 'Email address is required'
      });
    }

    // Check if email is already registered
    const existingEmployee = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmployee) {
      return res.status(409).json({ 
        error: 'Email already registered',
        details: 'An account with this email already exists',
        alreadyRegistered: true
      });
    }

    // Delete old unverified OTPs
    await OTP.deleteMany({
      email: email.toLowerCase(),
      purpose: 'signup',
      isVerified: false
    });

    // Generate new OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const otpRecord = new OTP({
      email: email.toLowerCase(),
      otp: otpCode,
      purpose: 'signup',
      expiresAt,
      attempts: 0,
      isVerified: false
    });

    await otpRecord.save();

    // Send OTP via email
    try {
      await sendOTPEmail(email.toLowerCase(), otpCode, 'signup');
    } catch (emailError) {
      console.error('⚠️ Failed to send email, but OTP saved:', emailError.message);
    }

    console.log(`✅ OTP resent to ${email}`);

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      expiresIn: 600 // 10 minutes
    });

  } catch (err) {
    console.error('❌ Resend OTP error:', err);
    res.status(500).json({ 
      error: 'Failed to resend OTP', 
      message: err.message 
    });
  }
};

module.exports = {
  sendSignupOTP,
  verifyOTP,
  resendOTP
};

