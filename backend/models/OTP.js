const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  purpose: {
    type: String,
    enum: ['signup', 'password-reset', 'email-verification'],
    default: 'signup'
  },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }, // TTL index
  attempts: { type: Number, default: 0, max: 5 },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Compound index for faster lookups
otpSchema.index({ email: 1, purpose: 1 });

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;

