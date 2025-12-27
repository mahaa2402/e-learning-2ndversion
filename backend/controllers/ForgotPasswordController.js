const OTP = require('../models/OTP');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const { sendOTPEmail } = require('../services/emailService');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Generate 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Request password reset - Send OTP
const requestPasswordReset = async (req, res) => {
  try {
    console.log('🔐 POST /api/auth/forgot-password - Request password reset');
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ 
        error: 'Missing fields',
        details: 'Email and role are required'
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

    // Check if user exists
    let user;
    if (role === 'admin') {
      user = await Admin.findOne({ email: email.toLowerCase() });
    } else if (role === 'employee') {
      user = await Employee.findOne({ email: email.toLowerCase() });
    } else {
      return res.status(400).json({ 
        error: 'Invalid role',
        details: 'Role must be either "admin" or "employee"'
      });
    }

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, an OTP has been sent'
      });
    }

    // Check for recent OTP requests (cooldown: 1 minute)
    const recentOTP = await OTP.findOne({
      email: email.toLowerCase(),
      purpose: 'password-reset',
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
      purpose: 'password-reset',
      isVerified: false
    });

    // Save OTP to database
    const otpRecord = new OTP({
      email: email.toLowerCase(),
      otp: otpCode,
      purpose: 'password-reset',
      expiresAt,
      attempts: 0,
      isVerified: false
    });

    await otpRecord.save();

    // Send OTP via email
    try {
      await sendOTPEmail(email.toLowerCase(), otpCode, 'password-reset');
      console.log(`✅ Password reset OTP sent to ${email}`);
    } catch (emailError) {
      console.error('⚠️ Failed to send email, but OTP saved:', emailError.message);
      // Don't fail the request if email fails, OTP is still valid
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, an OTP has been sent',
      expiresIn: 600 // 10 minutes in seconds
    });

  } catch (err) {
    console.error('❌ Request password reset error:', err);
    res.status(500).json({ 
      error: 'Failed to process password reset request', 
      message: err.message 
    });
  }
};

// Verify OTP for password reset
const verifyPasswordResetOTP = async (req, res) => {
  try {
    console.log('🔐 POST /api/auth/forgot-password/verify - Verify password reset OTP');
    const { email, role, otp } = req.body;

    if (!email || !role || !otp) {
      return res.status(400).json({ 
        error: 'Missing fields',
        details: 'Email, role, and OTP are required'
      });
    }

    // Find the most recent unverified OTP for this email
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      purpose: 'password-reset',
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

    console.log(`✅ Password reset OTP verified for ${email}`);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      verified: true
    });

  } catch (err) {
    console.error('❌ Verify password reset OTP error:', err);
    res.status(500).json({ 
      error: 'Failed to verify OTP', 
      message: err.message 
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    console.log('🔐 POST /api/auth/forgot-password/reset - Reset password');
    const { email, role, otp, newPassword } = req.body;

    if (!email || !role || !otp || !newPassword) {
      return res.status(400).json({ 
        error: 'Missing fields',
        details: 'Email, role, OTP, and new password are required'
      });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Invalid password',
        details: 'Password must be at least 6 characters long'
      });
    }

    // Find verified OTP
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      purpose: 'password-reset',
      isVerified: true,
      otp: otp
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ 
        error: 'Invalid or unverified OTP',
        details: 'Please verify the OTP first before resetting password'
      });
    }

    // Check if OTP is still valid (within 30 minutes of verification)
    const otpAge = (new Date() - otpRecord.createdAt) / (1000 * 60); // minutes
    if (otpAge > 30) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        error: 'OTP expired',
        details: 'This OTP has expired. Please request a new password reset.'
      });
    }

    // Find user
    let user;
    if (role === 'admin') {
      user = await Admin.findOne({ email: email.toLowerCase() });
    } else if (role === 'employee') {
      user = await Employee.findOne({ email: email.toLowerCase() });
    } else {
      return res.status(400).json({ 
        error: 'Invalid role',
        details: 'Role must be either "admin" or "employee"'
      });
    }

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        details: 'No account found with this email'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Delete the OTP record after successful password reset
    await OTP.deleteOne({ _id: otpRecord._id });

    console.log(`✅ Password reset successfully for ${email} (${role})`);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (err) {
    console.error('❌ Reset password error:', err);
    res.status(500).json({ 
      error: 'Failed to reset password', 
      message: err.message 
    });
  }
};

module.exports = {
  requestPasswordReset,
  verifyPasswordResetOTP,
  resetPassword
};
































