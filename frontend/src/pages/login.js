import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    role: 'admin' 
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
        
        if (userRole === 'admin') {
          // Admin always goes to admin dashboard
          setTimeout(() => {
            navigate('/admindashboard');
          }, 100);
        } else {
          // For employees, always redirect to landing page
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
        </form>
      </div>
    </div>
  );
};

export default Login;
