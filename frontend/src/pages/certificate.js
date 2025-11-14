import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './certificate.css';
import { API_ENDPOINTS } from '../config/api';

const CertificatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [certificateData, setCertificateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [courseId, setCourseId] = useState(null);
  const [lessonId, setLessonId] = useState(null);

  // Get employee data from localStorage or user session
  const getEmployeeData = () => {
    let employeeName = "Employee Name";
    let employeeId = "Unknown ID";
    
    // Try to get from user session first
    const userSession = localStorage.getItem('userSession');
    if (userSession) {
      try {
        const user = JSON.parse(userSession);
        employeeName = user.name || user.email?.split('@')[0] || "Employee Name";
        employeeId = user._id || user.id || "Unknown ID";
      } catch (e) {
        console.error('Error parsing user session:', e);
      }
    }
    
    // Fallback to individual localStorage items
    if (employeeName === "Employee Name") {
      employeeName = localStorage.getItem('employeeName') || "Employee Name";
    }
    if (employeeId === "Unknown ID") {
      employeeId = localStorage.getItem('employeeId') || "Unknown ID";
    }
    
    return { employeeName, employeeId };
  };

  const { employeeName, employeeId } = getEmployeeData();

  useEffect(() => {
    // Prevent browser back button from going to quiz page
    const savedCourseId = localStorage.getItem('certificateCourseId');
    const savedLessonId = localStorage.getItem('certificateLessonId');
    
    // Set courseId and lessonId state
    if (savedCourseId) setCourseId(savedCourseId);
    if (savedLessonId) setLessonId(savedLessonId);
    
    // Handle browser back button - redirect to lesson page instead of quiz
    const handlePopState = (event) => {
      if (savedCourseId && savedLessonId) {
        // Navigate to lesson page instead of going back to quiz
        navigate(`/course/${savedCourseId}/lesson/${savedLessonId}`, { replace: true });
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Replace current history entry to prevent going back to quiz
    if (savedCourseId && savedLessonId) {
      // Replace the quiz page entry with lesson page in history
      window.history.replaceState(
        { page: 'lesson', courseId: savedCourseId, lessonId: savedLessonId },
        '',
        `/course/${savedCourseId}/lesson/${savedLessonId}`
      );
      
      // Then push certificate page
      window.history.pushState(
        { page: 'certificate', courseId: savedCourseId, lessonId: savedLessonId },
        '',
        window.location.pathname
      );
    }
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  useEffect(() => {
    const initializeCertificate = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get courseId and lessonId from localStorage (set when navigating from lesson page)
        const savedCourseId = localStorage.getItem('certificateCourseId');
        const savedLessonId = localStorage.getItem('certificateLessonId');
        if (savedCourseId) setCourseId(savedCourseId);
        if (savedLessonId) setLessonId(savedLessonId);

        // Check if this is a newly completed course or a selected certificate from dashboard
        const isCourseCompleted = localStorage.getItem('courseCompleted') === 'true';
        const completedCourseName = localStorage.getItem('completedCourseName');
        const lastGeneratedCertificate = localStorage.getItem('lastGeneratedCertificate');
        const selectedCertificate = localStorage.getItem('selectedCertificate');

        // Priority 1: Check for selected certificate from dashboard
        if (selectedCertificate) {
          const certificate = JSON.parse(selectedCertificate);
          setCertificateData(certificate);
          setCourseCompleted(true);
          setSuccess(true);
          setLoading(false);
          
          // Clear the temporary data
          localStorage.removeItem('selectedCertificate');
          localStorage.removeItem('courseCompleted');
          localStorage.removeItem('completedCourseName');
          localStorage.removeItem('lastGeneratedCertificate');
          
          // Get courseId and lessonId for back navigation
          const certCourseId = localStorage.getItem('certificateCourseId');
          const certLessonId = localStorage.getItem('certificateLessonId');
          if (certCourseId) setCourseId(certCourseId);
          if (certLessonId) setLessonId(certLessonId);
          
          console.log('🎉 Displaying selected certificate from dashboard:', certificate);
          return;
        }

        // Priority 2: Check if this is a newly completed course with generated certificate
        if (isCourseCompleted && lastGeneratedCertificate) {
          // Use the newly generated certificate data
          const certificate = JSON.parse(lastGeneratedCertificate);
          setCertificateData(certificate);
          setCourseCompleted(true);
          setSuccess(true);
          setLoading(false);
          
          // Clear the temporary data
          localStorage.removeItem('courseCompleted');
          localStorage.removeItem('completedCourseName');
          localStorage.removeItem('lastGeneratedCertificate');
          
          // Get courseId and lessonId for back navigation
          const certCourseId = localStorage.getItem('certificateCourseId');
          const certLessonId = localStorage.getItem('certificateLessonId');
          if (certCourseId) setCourseId(certCourseId);
          if (certLessonId) setLessonId(certLessonId);
          
          console.log('🎉 Displaying newly generated certificate:', certificate);
          return;
        }

        // Priority 3: Check if this is a newly completed course (from quiz completion)
        if (isCourseCompleted && completedCourseName) {
          // Get user email from token
          const token = localStorage.getItem('authToken') || localStorage.getItem('token');
          let userEmail = '';
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              userEmail = payload.email;
            } catch (e) {
              console.error('Error parsing token:', e);
            }
          }
          
          // Create a temporary certificate object for display
          const tempCertificate = {
            courseTitle: completedCourseName,
            employeeName: employeeName,
            employeeId: employeeId,
            employeeEmail: userEmail,
            date: new Date().toLocaleDateString(),
            certificateId: `CERT-${Date.now()}`,
            completionDate: new Date(),
            completedModules: ['All Modules'],
            totalModules: 1
          };
          
          setCertificateData(tempCertificate);
          setCourseCompleted(true);
          setSuccess(true);
          setLoading(false);
          
          // Clear the temporary data
          localStorage.removeItem('courseCompleted');
          localStorage.removeItem('completedCourseName');
          
          console.log('🎉 Displaying course completion certificate:', tempCertificate);
          return;
        }

        // Fallback: Try to fetch certificates from database
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication token not found. Please login again.');
          setLoading(false);
          return;
        }

        console.log('🔍 Attempting to fetch certificates from database...');
        
        // Get certificates from the database
        const response = await fetch(API_ENDPOINTS.CERTIFICATES.GET_CERTIFICATES, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        console.log('📊 Certificate API response:', data);
        
        if (!response.ok) {
          if (response.status === 403) {
            setError('Session expired. Please login again.');
            // Clear invalid token
            localStorage.removeItem('authToken');
            localStorage.removeItem('token');
          } else {
            console.error('❌ Certificate API error:', data);
            setError(data.message || 'Failed to fetch certificate');
          }
        } else {
          if (data.success && data.certificates && data.certificates.length > 0) {
            // Use the most recent certificate
            const latestCertificate = data.certificates[0];
            setCertificateData(latestCertificate);
            setSuccess(true);
            console.log('✅ Certificate fetched successfully:', latestCertificate);
          } else {
            console.log('⚠️ No certificates found in database');
            
            // Get user email from token
            let userEmail = '';
            if (token) {
              try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                userEmail = payload.email;
              } catch (e) {
                console.error('Error parsing token:', e);
              }
            }
            
            // Try to generate certificate for completed course from localStorage first
            if (completedCourseName) {
              console.log('🔄 Attempting to generate certificate for completed course:', completedCourseName);
              
              try {
                const generateResponse = await fetch(API_ENDPOINTS.CERTIFICATES.CHECK_COURSE_COMPLETION, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    courseName: completedCourseName,
                    userEmail: userEmail
                  })
                });
                
                const generateData = await generateResponse.json();
                console.log('🎓 Certificate generation response:', generateData);
                
                if (generateResponse.ok && generateData.success && generateData.isCompleted && generateData.certificate) {
                  // Certificate was generated successfully
                  setCertificateData(generateData.certificate);
                  setCourseCompleted(true);
                  setSuccess(true);
                  
                  // Clear the temporary data
                  localStorage.removeItem('courseCompleted');
                  localStorage.removeItem('completedCourseName');
                  
                  console.log('✅ Certificate generated and displayed:', generateData.certificate);
                  setLoading(false);
                  return;
                } else {
                  console.log('⚠️ Certificate generation failed:', generateData.message);
                }
              } catch (generateError) {
                console.error('❌ Error generating certificate:', generateError);
              }
            }
            
            // If no certificate from localStorage course, check all common courses for completion
            if (!certificateData && userEmail) {
              console.log('🔍 Checking all courses for completion...');
              
              // List of common courses to check
              const commonCourses = ['ISP', 'GDPR', 'POSH', 'Factory Act', 'Welding', 'CNC', 'Excel', 'VRU'];
              
              // Try to generate certificate for any completed course
              for (const courseName of commonCourses) {
                try {
                  console.log(`🔍 Checking if ${courseName} is completed...`);
                  const generateResponse = await fetch(API_ENDPOINTS.CERTIFICATES.CHECK_COURSE_COMPLETION, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      courseName: courseName,
                      userEmail: userEmail
                    })
                  });
                  
                  const generateData = await generateResponse.json();
                  
                  if (generateResponse.ok && generateData.success && generateData.isCompleted && generateData.certificate) {
                    console.log(`✅ Found completed course: ${courseName}, certificate generated`);
                    setCertificateData(generateData.certificate);
                    setCourseCompleted(true);
                    setSuccess(true);
                    setLoading(false);
                    return;
                  }
                } catch (error) {
                  console.log(`⚠️ Error checking ${courseName}:`, error.message);
                }
              }
            }
            
            // If still no certificate found, show error
            if (!certificateData) {
              setError('No certificates found. Please complete a course first to generate a certificate.');
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize certificate:', error);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initializeCertificate();
  }, []);

  if (loading) {
    return (
      <div className="certificate-container">
        <div className="certificate">
          <h2>Loading Certificate...</h2>
          <p>Please wait while we prepare your certificate.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="certificate-container">
        <div className="certificate">
          <h2>Certificate Not Found</h2>
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #f5c6cb'
          }}>
            <p style={{ margin: '0', fontSize: '16px' }}>{error}</p>
          </div>
          
          <div style={{ 
            backgroundColor: '#d1ecf1', 
            color: '#0c5460', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #bee5eb'
          }}>
            <h3 style={{ marginTop: '0', color: '#0c5460' }}>💡 How to get a certificate:</h3>
            <ol style={{ marginBottom: '0', paddingLeft: '20px' }}>
              <li>Complete all modules in any course (ISP, GDPR, etc.)</li>
              <li>Pass all quizzes with at least 50% score</li>
              <li>Click the "View Certificate" button that appears</li>
              <li>Your certificate will be automatically generated</li>
            </ol>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔄 Try Again
            </button>
            <button 
              onClick={() => window.location.href = '/userdashboard'}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📚 Go to Courses
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get certificate details
  const courseTitle = certificateData?.courseTitle || "Information Security & Data Protection";
  const date = certificateData?.date || new Date().toLocaleDateString();
  const certificateId = certificateData?.certificateId || "CERT-001";
  const completedModules = certificateData?.completedModules || [];
  const totalModules = certificateData?.totalModules || 0;

  return (
    <div className="certificate-container">
      <div className="certificate">
        {success && (
          <div style={{ 
            backgroundColor: '#d4edda', 
            color: '#155724', 
            padding: '10px', 
            borderRadius: '5px', 
            marginBottom: '20px' 
          }}>
            {courseCompleted && (
              <p>🎉 Congratulations! You have successfully completed the {courseTitle} course!</p>
            )}
          </div>
        )}
        
        <h1 className="certificate-title">Certificate of Completion</h1>
        <p className="certificate-text">This is to certify that</p>
        <h2 className="employee-name">{employeeName}</h2>
        <p className="certificate-text">has successfully completed the course</p>
        <h3 className="course-title">{courseTitle}</h3>
        
        {/* Course completion details */}
        {totalModules > 0 && (
          <div className="course-details">
            <p className="completion-info">
              <strong>Modules Completed:</strong> {completedModules.length} of {totalModules}
            </p>
            {completedModules.length > 0 && (
              <div className="modules-list">
                <p><strong>Completed Modules:</strong></p>
                <ul>
                  {completedModules.map((moduleId, index) => (
                    <li key={index}>{moduleId}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        <p className="date">Date: {date}</p>
        <p className="certificate-id">Certificate ID: {certificateId}</p>

        <div className="signature-section">
          <div className="signature">
            <p>Authorized Signature</p>
            <hr />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
          {courseId && lessonId && (
            <button 
              onClick={() => {
                // Navigate back to lesson page
                navigate(`/course/${courseId}/lesson/${lessonId}`);
                // Clear stored course/lesson IDs
                localStorage.removeItem('certificateCourseId');
                localStorage.removeItem('certificateLessonId');
              }}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
                marginRight: '10px'
              }}
            >
              ⬅ Back to Lesson
            </button>
          )}
          <button 
            onClick={() => navigate('/userdashboard')}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              marginRight: '10px'
            }}
          >
            📚 Go to Dashboard
          </button>
          <button className="print-button" onClick={() => window.print()}>🖨️ Print Certificate</button>
        </div>
      </div>
    </div>
  );
};

export default CertificatePage;
