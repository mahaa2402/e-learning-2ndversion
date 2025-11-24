import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';

const CourseAccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const validateAndRedirect = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setError('No access token provided');
        setLoading(false);
        return;
      }

      try {
        // Token is already URL-encoded from the URL, don't encode again
        // But use encodeURIComponent to be safe (it won't double-encode if already encoded)
        const apiUrl = `${API_ENDPOINTS.COURSES.GET_COURSE}/course-access?token=${encodeURIComponent(token)}`;
        console.log('🔍 Calling API:', apiUrl.substring(0, 100) + '...');
        
        // Call backend API to validate token and get redirect URL
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📋 Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ API Error:', errorData);
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (response.ok && data.success) {
          const email = data.employeeEmail || '';
          const dashboardUrl = email ? `/userdashboard?email=${encodeURIComponent(email)}` : '/userdashboard';

          const authToken = localStorage.getItem('token');
          if (!authToken) {
            sessionStorage.setItem('redirectAfterLogin', dashboardUrl);
            sessionStorage.setItem('flashMessage', 'Please login to view your assigned courses.');
            navigate('/login');
            return;
          }

          navigate(dashboardUrl);
        } else {
          setError(data.message || 'Invalid or expired access link');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error validating course access token:', err);
        setError('Failed to validate access link. Please try again or contact support.');
        setLoading(false);
      }
    };

    validateAndRedirect();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div style={{ fontSize: '18px', marginBottom: '20px' }}>Validating access link...</div>
        <div className="spinner" style={{ 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        padding: '20px'
      }}>
        <div style={{ 
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '20px',
          borderRadius: '5px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <h2 style={{ marginTop: 0 }}>Access Denied</h2>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/login')}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default CourseAccess;

