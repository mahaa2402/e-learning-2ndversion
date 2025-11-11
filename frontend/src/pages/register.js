// src/pages/auth/register.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import './Auth.css';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
  });

  // OTP-related states
  const [otp, setOtp] = useState('');
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [isOTPSent, setIsOTPSent] = useState(false);
  const [isOTPVerified, setIsOTPVerified] = useState(false);
  const [otpResendTimer, setOtpResendTimer] = useState(0);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Countdown timer for resend OTP
  useEffect(() => {
    let interval = null;
    if (otpResendTimer > 0) {
      interval = setInterval(() => {
        setOtpResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpResendTimer]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleOTPChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only numbers, max 6 digits
    setOtp(value);
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.department) {
      setError('Please fill in all fields');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const sendOTP = async () => {
    if (!validateForm()) return;

    setIsSendingOTP(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post(API_ENDPOINTS.AUTH.SEND_OTP, {
        email: formData.email
      });

      setIsOTPSent(true);
      setSuccess('OTP has been sent to your email!');
      setOtpResendTimer(60); // 60 seconds cooldown
      console.log('OTP sent successfully');
    } catch (err) {
      const errorData = err.response?.data || {};
      if (errorData.alreadyRegistered) {
        setError('This email is already registered. Please login instead.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(errorData.details || errorData.error || 'Failed to send OTP');
      }
      console.error('Send OTP error:', err.response?.data);
    } finally {
      setIsSendingOTP(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsVerifyingOTP(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post(API_ENDPOINTS.AUTH.VERIFY_OTP, {
        email: formData.email,
        otp: otp
      });

      setIsOTPVerified(true);
      setSuccess('Email verified successfully! You can now register.');
      // Automatically proceed to registration
      setTimeout(() => {
        handleRegister();
      }, 500);
    } catch (err) {
      const errorData = err.response?.data || {};
      setError(errorData.details || errorData.error || 'Invalid OTP');
      console.error('Verify OTP error:', err.response?.data);
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const resendOTP = async () => {
    if (otpResendTimer > 0) return;

    setIsSendingOTP(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post(API_ENDPOINTS.AUTH.RESEND_OTP, {
        email: formData.email
      });

      setSuccess('OTP has been resent to your email!');
      setOtpResendTimer(60); // Reset timer
      setOtp(''); // Clear previous OTP
    } catch (err) {
      const errorData = err.response?.data || {};
      if (errorData.alreadyRegistered) {
        setError('This email is already registered. Please login instead.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(errorData.details || errorData.error || 'Failed to resend OTP');
      }
      console.error('Resend OTP error:', err.response?.data);
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleRegister = async () => {
    if (!isOTPVerified) {
      setError('Please verify your email with OTP first');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post(API_ENDPOINTS.AUTH.REGISTER, formData);
      setSuccess(res.data.message || 'Registration successful');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const errorData = err.response?.data || {};
      if (errorData.alreadyRegistered) {
        setError('This email is already registered. Please login instead.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        const errorMessage = errorData.error || errorData.details || 'Registration failed';
        setError(errorMessage);
      }
      console.error('Registration error:', err.response?.data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isOTPSent) {
      // Step 1: Send OTP
      sendOTP();
    } else if (!isOTPVerified) {
      // Step 2: Verify OTP
      verifyOTP();
    } else {
      // Step 3: Register
      handleRegister();
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Employee Registration</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            required
            value={formData.name}
            onChange={handleChange}
            disabled={isOTPSent}
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            value={formData.email}
            onChange={handleChange}
            disabled={isOTPSent}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            value={formData.password}
            onChange={handleChange}
            disabled={isOTPSent}
          />

          <input
            type="text"
            name="department"
            placeholder="Department"
            required
            value={formData.department}
            onChange={handleChange}
            disabled={isOTPSent}
          />

          {/* OTP Section */}
          {isOTPSent && !isOTPVerified && (
            <div className="otp-section">
              <label htmlFor="otp">Enter OTP sent to your email:</label>
              <input
                type="text"
                id="otp"
                name="otp"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={handleOTPChange}
                maxLength={6}
                className="otp-input"
              />
              <div className="otp-actions">
                <button
                  type="button"
                  onClick={verifyOTP}
                  disabled={isVerifyingOTP || otp.length !== 6}
                  className="verify-otp-btn"
                >
                  {isVerifyingOTP ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button
                  type="button"
                  onClick={resendOTP}
                  disabled={isSendingOTP || otpResendTimer > 0}
                  className="resend-otp-btn"
                >
                  {otpResendTimer > 0
                    ? `Resend OTP (${otpResendTimer}s)`
                    : isSendingOTP
                    ? 'Sending...'
                    : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}

          {/* Register Button - Only show after OTP is verified */}
          {isOTPVerified && (
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Complete Registration'}
            </button>
          )}

          {/* Send OTP / Verify OTP Button */}
          {!isOTPVerified && (
            <button type="submit" disabled={isSendingOTP || isVerifyingOTP}>
              {!isOTPSent
                ? isSendingOTP
                  ? 'Sending OTP...'
                  : 'Send OTP'
                : isVerifyingOTP
                ? 'Verifying...'
                : 'Verify OTP'}
            </button>
          )}
        </form>
        
        <p>
          Already have an account? 
          <button 
            type="button" 
            onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
}

export default Register;
