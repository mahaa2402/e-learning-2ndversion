import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS, API_BASE_URL } from '../config/api';
import './Auth.css';

const Login = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    role: 'admin' 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [flashMessage, setFlashMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: email, 2: OTP, 3: new password
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: '',
    role: 'admin',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const message = sessionStorage.getItem('flashMessage');
    if (message) {
      setFlashMessage(message);
      sessionStorage.removeItem('flashMessage');
    }

    // Check for redirect token and email from "Start Course" button
    const redirectToken = searchParams.get('redirectToken');
    const email = searchParams.get('email');
    const redirectTo = searchParams.get('redirectTo');

    if (redirectToken && email && redirectTo === 'dashboard') {
      // Store the redirect information for after login
      sessionStorage.setItem('dashboardRedirectToken', redirectToken);
      sessionStorage.setItem('dashboardRedirectEmail', email);
      // Pre-fill email if provided
      if (email) {
        setFormData(prev => ({ ...prev, email }));
      }
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const res = await axios.post(API_ENDPOINTS.AUTH.LOGIN, formData, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });
      
      const token = res.data.token;
      const userData = res.data.user;

      if (token && userData) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('token', token);
        localStorage.setItem('userSession', JSON.stringify(userData));
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('employeeEmail', userData.email); // store email

        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        window.dispatchEvent(new Event('loginSuccess'));

        alert(res.data.message || 'Login successful!');

        const redirectPath = sessionStorage.getItem('redirectAfterLogin');

        // Fetch level progress for all users
        try {
          const progressRes = await fetch(`${API_ENDPOINTS.PROGRESS.GET_PROGRESS.replace('/get-with-unlocking', '')}/${userData.email}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            mode: 'cors'
          });
          
          if (progressRes.ok) {
            const progressData = await progressRes.json();
            // Use new progress structure if available, fallback to old structure
            const levelCount = progressData.data?.currentLevel || progressData.levelCount || 0;
            localStorage.setItem("levelCleared", levelCount);
          } else {
            console.warn("Progress fetch returned non-OK status:", progressRes.status);
            localStorage.setItem("levelCleared", 0);
          }
        } catch (err) {
          console.warn("Could not fetch initial progress, setting default:", err.message);
          localStorage.setItem("levelCleared", 0);
        }

        // Handle navigation based on user role
        const userRole = userData.role || res.data.role;
        
        // Clear any stored redirect info from "Start Course" button (but don't redirect to dashboard)
        // User will follow normal login flow to landing page
        const dashboardRedirectToken = sessionStorage.getItem('dashboardRedirectToken');
        const dashboardRedirectEmail = sessionStorage.getItem('dashboardRedirectEmail');
        if (dashboardRedirectToken || dashboardRedirectEmail) {
          sessionStorage.removeItem('dashboardRedirectToken');
          sessionStorage.removeItem('dashboardRedirectEmail');
          console.log('🧹 Cleared dashboard redirect info - following normal login flow');
        }
        
        if (redirectPath) {
          sessionStorage.removeItem('redirectAfterLogin');
          setTimeout(() => {
            navigate(redirectPath);
          }, 100);
        } else if (userRole === 'admin') {
          setTimeout(() => {
            navigate('/admindashboard');
          }, 100);
        } else {
          setTimeout(() => {
            navigate('/');
          }, 100);
        }
      }

    } catch (err) {
      console.error('Login error:', {
        status: err.response?.status,
        error: err.response?.data?.error,
        details: err.response?.data?.details,
        message: err.message
      });
      const errorMessage = err.response?.data?.details || err.response?.data?.error || 'Login failed. Please check your credentials.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Login</h2>
        {flashMessage && (
          <div className="auth-flash-message">
            {flashMessage}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              name="email"
              type="email"
              placeholder="Email"
              required
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              name="password"
              type="password"
              placeholder="Password"
              required
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
            </select>
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setForgotPasswordData({ ...forgotPasswordData, email: formData.email, role: formData.role });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#007bff',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.9rem'
              }}
            >
              Forgot Password?
            </button>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '10px',
            width: '90%',
            maxWidth: '400px',
            position: 'relative'
          }}>
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setForgotPasswordStep(1);
                setForgotPasswordData({ email: '', role: 'admin', otp: '', newPassword: '', confirmPassword: '' });
              }}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
            <h2 style={{ marginTop: 0 }}>Reset Password</h2>
            
            {forgotPasswordStep === 1 && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setForgotPasswordLoading(true);
                try {
                  const res = await axios.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD_REQUEST, {
                    email: forgotPasswordData.email,
                    role: forgotPasswordData.role
                  });
                  alert(res.data.message || 'OTP sent to your email');
                  setForgotPasswordStep(2);
                } catch (err) {
                  alert(err.response?.data?.details || err.response?.data?.error || 'Failed to send OTP');
                } finally {
                  setForgotPasswordLoading(false);
                }
              }}>
                <div className="form-group">
                  <label htmlFor="forgot-email">Email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    value={forgotPasswordData.email}
                    onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="forgot-role">Role</label>
                  <select
                    id="forgot-role"
                    value={forgotPasswordData.role}
                    onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, role: e.target.value })}
                    required
                  >
                    <option value="admin">Admin</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
                <button type="submit" disabled={forgotPasswordLoading}>
                  {forgotPasswordLoading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            )}

            {forgotPasswordStep === 2 && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setForgotPasswordLoading(true);
                try {
                  const res = await axios.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD_VERIFY, {
                    email: forgotPasswordData.email,
                    role: forgotPasswordData.role,
                    otp: forgotPasswordData.otp
                  });
                  alert(res.data.message || 'OTP verified successfully');
                  setForgotPasswordStep(3);
                } catch (err) {
                  alert(err.response?.data?.details || err.response?.data?.error || 'Invalid OTP');
                } finally {
                  setForgotPasswordLoading(false);
                }
              }}>
                <div className="form-group">
                  <label htmlFor="forgot-otp">Enter OTP</label>
                  <input
                    id="forgot-otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    required
                    maxLength={6}
                    value={forgotPasswordData.otp}
                    onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, otp: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <button type="submit" disabled={forgotPasswordLoading}>
                  {forgotPasswordLoading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setForgotPasswordLoading(true);
                    try {
                      await axios.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD_REQUEST, {
                        email: forgotPasswordData.email,
                        role: forgotPasswordData.role
                      });
                      alert('OTP resent to your email');
                    } catch (err) {
                      alert(err.response?.data?.details || 'Failed to resend OTP');
                    } finally {
                      setForgotPasswordLoading(false);
                    }
                  }}
                  disabled={forgotPasswordLoading}
                  style={{ marginTop: '0.5rem', background: '#6c757d' }}
                >
                  Resend OTP
                </button>
              </form>
            )}

            {forgotPasswordStep === 3 && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
                  alert('Passwords do not match');
                  return;
                }
                if (forgotPasswordData.newPassword.length < 6) {
                  alert('Password must be at least 6 characters long');
                  return;
                }
                setForgotPasswordLoading(true);
                try {
                  const res = await axios.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD_RESET, {
                    email: forgotPasswordData.email,
                    role: forgotPasswordData.role,
                    otp: forgotPasswordData.otp,
                    newPassword: forgotPasswordData.newPassword
                  });
                  alert(res.data.message || 'Password reset successfully');
                  setShowForgotPassword(false);
                  setForgotPasswordStep(1);
                  setForgotPasswordData({ email: '', role: 'admin', otp: '', newPassword: '', confirmPassword: '' });
                } catch (err) {
                  alert(err.response?.data?.details || err.response?.data?.error || 'Failed to reset password');
                } finally {
                  setForgotPasswordLoading(false);
                }
              }}>
                <div className="form-group">
                  <label htmlFor="new-password">New Password</label>
                  <input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    required
                    minLength={6}
                    value={forgotPasswordData.newPassword}
                    onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, newPassword: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm Password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                    value={forgotPasswordData.confirmPassword}
                    onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, confirmPassword: e.target.value })}
                  />
                </div>
                <button type="submit" disabled={forgotPasswordLoading}>
                  {forgotPasswordLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
