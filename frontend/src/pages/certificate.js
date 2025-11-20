import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './certificate.css';
import { API_ENDPOINTS } from '../config/api';

const CertificatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for selectedCertificate immediately (synchronously) before first render
  const initialSelectedCert = typeof window !== 'undefined' ? localStorage.getItem('selectedCertificate') : null;
  let initialCertificateData = null;
  let initialLoading = true;
  
  if (initialSelectedCert) {
    try {
      const cert = JSON.parse(initialSelectedCert);
      if (cert && (cert.courseTitle || cert.courseName)) {
        // Normalize data
        if (!cert.courseTitle && cert.courseName) {
          cert.courseTitle = cert.courseName;
        }
        if (!cert.date && cert.completionDate) {
          cert.date = cert.completionDate;
        }
        initialCertificateData = cert;
        initialLoading = false; // Don't show loading if we have the data
      }
    } catch (e) {
      console.error('Error parsing initial certificate:', e);
    }
  }
  
  const [certificateData, setCertificateData] = useState(initialCertificateData);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(!!initialCertificateData);
  const [courseCompleted, setCourseCompleted] = useState(!!initialCertificateData);
  const [courseId, setCourseId] = useState(null);
  const [lessonId, setLessonId] = useState(null);
  const [refreshedModuleData, setRefreshedModuleData] = useState(null);
  const hasProcessedCertificate = useRef(!!initialCertificateData); // Mark as processed if we have initial data
  const lastLocationKey = useRef(location.key); // Track location key to detect navigation

  // Get employee data from localStorage or user session
  const getEmployeeData = () => {
    let employeeName = "Employee Name";
    let employeeId = "Unknown ID";
    
    // Check if admin is viewing an employee's certificate
    const viewingEmployeeName = localStorage.getItem('viewingEmployeeName');
    const viewingEmployeeId = localStorage.getItem('viewingEmployeeId');
    
    if (viewingEmployeeName) {
      employeeName = viewingEmployeeName;
    }
    if (viewingEmployeeId) {
      employeeId = viewingEmployeeId;
    }
    
    // Try to get from user session if not viewing as admin
    if (!viewingEmployeeName) {
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
    // Check if admin came from certificate detail page
    const cameFromCertificateDetail = localStorage.getItem('cameFromCertificateDetail') === 'true';
    const certificateDetailEmployeeId = localStorage.getItem('certificateDetailEmployeeId');
    
    // Check if user is admin
    const userSession = localStorage.getItem('userSession');
    let isAdmin = false;
    if (userSession) {
      try {
        const user = JSON.parse(userSession);
        isAdmin = user.role === 'admin';
      } catch (e) {
        console.error('Error parsing user session:', e);
      }
    }
    
    // Prevent browser back button from going to quiz page
    const savedCourseId = localStorage.getItem('certificateCourseId');
    const savedLessonId = localStorage.getItem('certificateLessonId');
    
    // Set courseId and lessonId state
    if (savedCourseId) setCourseId(savedCourseId);
    if (savedLessonId) setLessonId(savedLessonId);
    
    // Handle browser back button
    const handlePopState = (event) => {
      // If admin came from certificate detail page, navigate back there
      if (isAdmin && cameFromCertificateDetail && certificateDetailEmployeeId) {
        navigate(`/certificatedetail/${certificateDetailEmployeeId}`, { replace: true });
        // Clear the flag
        localStorage.removeItem('cameFromCertificateDetail');
        localStorage.removeItem('certificateDetailEmployeeId');
      } else if (savedCourseId && savedLessonId) {
        // For regular users, navigate to lesson page instead of going back to quiz
        navigate(`/course/${savedCourseId}/lesson/${savedLessonId}`, { replace: true });
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Replace current history entry to prevent going back to quiz
    if (savedCourseId && savedLessonId && !(isAdmin && cameFromCertificateDetail)) {
      // Replace the quiz page entry with lesson page in history (only for regular users)
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
    } else if (isAdmin && cameFromCertificateDetail && certificateDetailEmployeeId) {
      // For admin from certificate detail, push certificate page with proper history
      window.history.pushState(
        { page: 'certificate', fromDetail: true, employeeId: certificateDetailEmployeeId },
        '',
        window.location.pathname
      );
    }
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  // Cleanup effect: Clear selectedCertificate when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      // Only clear if we're actually navigating away (not just re-rendering)
      // This ensures selectedCertificate is available for the next visit
      // We'll clear it when a new certificate is selected instead
      console.log('🧹 Certificate page unmounting - keeping selectedCertificate for next visit');
    };
  }, []);

  useEffect(() => {
    const initializeCertificate = async () => {
      // Check if this is a new navigation (location key changed)
      const isNewNavigation = location.key !== lastLocationKey.current;
      if (isNewNavigation) {
        console.log('🔄 New navigation detected, resetting processed flag');
        lastLocationKey.current = location.key;
        hasProcessedCertificate.current = false;
        
        // Re-check for selectedCertificate on new navigation
        const newSelectedCert = localStorage.getItem('selectedCertificate');
        if (newSelectedCert) {
          try {
            const cert = JSON.parse(newSelectedCert);
            if (cert && (cert.courseTitle || cert.courseName)) {
              // Normalize data
              if (!cert.courseTitle && cert.courseName) {
                cert.courseTitle = cert.courseName;
              }
              if (!cert.date && cert.completionDate) {
                cert.date = cert.completionDate;
              }
              // Set certificate data immediately
              setCertificateData(cert);
              setCourseCompleted(true);
              setSuccess(true);
              setLoading(false);
              hasProcessedCertificate.current = true;
              localStorage.removeItem('courseCompleted');
              localStorage.removeItem('completedCourseName');
              localStorage.removeItem('lastGeneratedCertificate');
              console.log('🎉 Certificate loaded on new navigation:', cert);
              return; // Exit early - certificate loaded
            }
          } catch (e) {
            console.error('Error parsing certificate on new navigation:', e);
          }
        }
        
        // If no certificate found, reset state for fresh load
        setCertificateData(null);
        setLoading(true);
        setSuccess(false);
        setCourseCompleted(false);
      }
      
      // Reset the processed flag if selectedCertificate has changed
      const currentSelectedCert = localStorage.getItem('selectedCertificate');
      if (currentSelectedCert && hasProcessedCertificate.current && certificateData && !isNewNavigation) {
        // Check if this is a different certificate by comparing
        try {
          const newCert = JSON.parse(currentSelectedCert);
          const existingCert = certificateData;
          // If course titles don't match, it's a new certificate - reset the flag
          if (existingCert && newCert.courseTitle !== existingCert.courseTitle) {
            console.log('🔄 New certificate detected, resetting processed flag');
            hasProcessedCertificate.current = false;
            setCertificateData(null);
            setLoading(true);
            setSuccess(false);
            setCourseCompleted(false);
          } else if (existingCert && newCert.courseTitle === existingCert.courseTitle) {
            // Same certificate, already processed
            console.log('✅ Same certificate already loaded');
            localStorage.removeItem('courseCompleted');
            localStorage.removeItem('completedCourseName');
            localStorage.removeItem('lastGeneratedCertificate');
            return;
          }
        } catch (e) {
          console.error('Error comparing certificates:', e);
        }
      }
      
      // If we already have certificate data from initial check and it's not a new navigation, just clear temporary flags and return
      if (certificateData && hasProcessedCertificate.current && !currentSelectedCert && !isNewNavigation) {
        console.log('✅ Certificate already loaded from initial check');
        localStorage.removeItem('courseCompleted');
        localStorage.removeItem('completedCourseName');
        localStorage.removeItem('lastGeneratedCertificate');
        return;
      }
      
      // Prevent multiple executions (React StrictMode in development) - but allow if new certificate or new navigation
      if (hasProcessedCertificate.current && certificateData && !isNewNavigation) {
        console.log('⚠️ Certificate already processed, skipping...');
        return;
      }
      
      // IMMEDIATE CHECK: Check for selectedCertificate FIRST before any async operations
      const selectedCertificate = localStorage.getItem('selectedCertificate');
      if (selectedCertificate) {
        try {
          console.log('📋 Found selectedCertificate - displaying immediately');
          const certificate = JSON.parse(selectedCertificate);
          
          // Normalize certificate data structure
          if (certificate) {
            if (!certificate.courseTitle && certificate.courseName) {
              certificate.courseTitle = certificate.courseName;
            }
            if (!certificate.date && certificate.completionDate) {
              certificate.date = certificate.completionDate;
            }
            if (certificate.employeeName && !localStorage.getItem('viewingEmployeeName')) {
              localStorage.setItem('viewingEmployeeName', certificate.employeeName);
            }
          }
          
          // Validate and display immediately
          if (certificate && (certificate.courseTitle || certificate.courseName)) {
            setCertificateData(certificate);
            setCourseCompleted(true);
            setSuccess(true);
            setLoading(false);
            hasProcessedCertificate.current = true;
            
            // Get courseId and lessonId for back navigation
            const certCourseId = localStorage.getItem('certificateCourseId');
            const certLessonId = localStorage.getItem('certificateLessonId');
            if (certCourseId) setCourseId(certCourseId);
            if (certLessonId) setLessonId(certLessonId);
            
            // DON'T clear selectedCertificate here - keep it for navigation consistency
            // Only clear other temporary flags
            localStorage.removeItem('courseCompleted');
            localStorage.removeItem('completedCourseName');
            localStorage.removeItem('lastGeneratedCertificate');
            
            console.log('🎉 Certificate displayed instantly:', certificate);
            return; // Exit immediately - no API calls
          }
        } catch (error) {
          console.error('❌ Error parsing selected certificate:', error);
          // Continue to normal flow if parsing fails
        }
      }
      
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

        // Priority 1: Check for lastGeneratedCertificate (for newly completed courses)

        // Priority 2: Check if this is a newly completed course with generated certificate
        if (isCourseCompleted && lastGeneratedCertificate) {
          try {
            // Use the newly generated certificate data
            const certificate = JSON.parse(lastGeneratedCertificate);
            
            // Validate certificate has required fields
            if (!certificate || (!certificate.courseTitle && !certificate.courseName)) {
              throw new Error('Invalid certificate data: missing course title');
            }
            
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
          } catch (error) {
            console.error('Error parsing last generated certificate:', error);
            // Continue to next priority instead of failing
          }
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
        // IMPORTANT: Only do this if we haven't already processed selectedCertificate
        // Check one more time if selectedCertificate was set (in case of timing issues)
        const retrySelectedCert = localStorage.getItem('selectedCertificate');
        if (retrySelectedCert) {
          console.log('⚠️ Found selectedCertificate in fallback, processing it...');
          try {
            const retryCert = JSON.parse(retrySelectedCert);
            if (retryCert && (retryCert.courseTitle || retryCert.courseName)) {
              if (!retryCert.courseTitle && retryCert.courseName) {
                retryCert.courseTitle = retryCert.courseName;
              }
              setCertificateData(retryCert);
              setCourseCompleted(true);
              setSuccess(true);
              setLoading(false);
              localStorage.removeItem('selectedCertificate');
              localStorage.removeItem('courseCompleted');
              localStorage.removeItem('completedCourseName');
              localStorage.removeItem('lastGeneratedCertificate');
              console.log('🎉 Displaying certificate from retry:', retryCert);
              return;
            }
          } catch (e) {
            console.error('Error parsing retry certificate:', e);
          }
        }
        
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication token not found. Please login again.');
          setLoading(false);
          return;
        }

        console.log('🔍 Attempting to fetch certificates from database (no selectedCertificate found)...');
        
        // Get certificates from the database
        let response;
        let data;
        
        try {
          response = await fetch(API_ENDPOINTS.CERTIFICATES.GET_CERTIFICATES, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          data = await response.json();
          console.log('📊 Certificate API response:', data);
        } catch (fetchError) {
          console.error('❌ Network error fetching certificates:', fetchError);
          // If it's a 404, it might be that the endpoint doesn't exist for admin users
          // Don't show error if we're viewing a selected certificate
          if (!selectedCertificate && !lastGeneratedCertificate) {
            setError('Unable to fetch certificates. Please try again.');
          }
          setLoading(false);
          return;
        }
        
        if (!response.ok) {
          if (response.status === 403) {
            setError('Session expired. Please login again.');
            // Clear invalid token
            localStorage.removeItem('authToken');
            localStorage.removeItem('token');
          } else if (response.status === 404) {
            // 404 is okay if we're viewing a selected certificate (admin viewing employee cert)
            console.log('⚠️ 404 from certificate API - this is normal when viewing selected certificate');
            if (!selectedCertificate && !lastGeneratedCertificate) {
              setError('Certificate endpoint not found. Please contact support.');
            }
          } else {
            console.error('❌ Certificate API error:', data);
            setError(data.message || 'Failed to fetch certificate');
          }
          setLoading(false);
          return;
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
                let generateResponse;
                try {
                  generateResponse = await fetch(API_ENDPOINTS.CERTIFICATES.CHECK_COURSE_COMPLETION, {
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
                } catch (fetchError) {
                  console.error('❌ Network error checking course completion:', fetchError);
                  // Skip this attempt
                  generateResponse = null;
                }
                
                if (generateResponse && generateResponse.ok) {
                  const generateData = await generateResponse.json();
                  console.log('🎓 Certificate generation response:', generateData);
                  
                  if (generateData.success && generateData.isCompleted && generateData.certificate) {
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
                    console.log('⚠️ Certificate generation failed:', generateData?.message);
                  }
                } else if (generateResponse && generateResponse.status === 404) {
                  console.log('⚠️ Certificate endpoint returned 404 - this is normal for admin viewing employee certs');
                }
              } catch (generateError) {
                console.error('❌ Error generating certificate:', generateError);
              }
            }
            
            // If no certificate from localStorage course, check all common courses for completion
            // BUT ONLY if we don't have selectedCertificate (admin viewing employee cert)
            const hasSelectedCert = localStorage.getItem('selectedCertificate');
            if (hasSelectedCert) {
              console.log('⚠️ selectedCertificate found during course check, skipping API calls');
              // Try to process it one more time
              try {
                const retryCert = JSON.parse(hasSelectedCert);
                if (retryCert && (retryCert.courseTitle || retryCert.courseName)) {
                  if (!retryCert.courseTitle && retryCert.courseName) {
                    retryCert.courseTitle = retryCert.courseName;
                  }
                  setCertificateData(retryCert);
                  setCourseCompleted(true);
                  setSuccess(true);
                  setLoading(false);
                  localStorage.removeItem('selectedCertificate');
                  localStorage.removeItem('courseCompleted');
                  localStorage.removeItem('completedCourseName');
                  localStorage.removeItem('lastGeneratedCertificate');
                  console.log('🎉 Displaying certificate from course check retry:', retryCert);
                  return;
                }
              } catch (e) {
                console.error('Error parsing certificate in course check:', e);
              }
            }
            
            if (!certificateData && userEmail && !hasSelectedCert) {
              console.log('🔍 Checking all courses for completion...');
              
              // List of common courses to check
              const commonCourses = ['ISP', 'GDPR', 'POSH', 'Factory Act', 'Welding', 'CNC', 'Excel', 'VRU'];
              
              // Try to generate certificate for any completed course
              for (const courseName of commonCourses) {
                try {
                  console.log(`🔍 Checking if ${courseName} is completed...`);
                  let generateResponse;
                  let generateData;
                  
                  try {
                    generateResponse = await fetch(API_ENDPOINTS.CERTIFICATES.CHECK_COURSE_COMPLETION, {
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
                    
                    if (generateResponse && generateResponse.ok) {
                      generateData = await generateResponse.json();
                    } else {
                      console.log(`⚠️ ${courseName} check returned ${generateResponse?.status || 'error'}`);
                      // Continue to next course
                      continue;
                    }
                  } catch (error) {
                    console.log(`⚠️ Error checking ${courseName}:`, error.message);
                    // Continue to next course
                    continue;
                  }
                  
                  if (generateResponse && generateResponse.ok && generateData && generateData.success && generateData.isCompleted && generateData.certificate) {
                    console.log(`✅ Found completed course: ${courseName}, certificate generated`);
                    setCertificateData(generateData.certificate);
                    setCourseCompleted(true);
                    setSuccess(true);
                    setLoading(false);
                    return;
                  }
                } catch (error) {
                  console.log(`⚠️ Error checking ${courseName}:`, error.message);
                  // Continue to next course
                }
              }
            }
            
            // If still no certificate found, check one more time for selectedCertificate
            // (in case it was set after the initial check or there was a timing issue)
            if (!certificateData) {
              const retrySelectedCertificate = localStorage.getItem('selectedCertificate');
              if (retrySelectedCertificate) {
                try {
                  const retryCertificate = JSON.parse(retrySelectedCertificate);
                  if (retryCertificate && (retryCertificate.courseTitle || retryCertificate.courseName)) {
                    // Normalize certificate data
                    if (!retryCertificate.courseTitle && retryCertificate.courseName) {
                      retryCertificate.courseTitle = retryCertificate.courseName;
                    }
                    if (!retryCertificate.date && retryCertificate.completionDate) {
                      retryCertificate.date = retryCertificate.completionDate;
                    }
                    setCertificateData(retryCertificate);
                    setCourseCompleted(true);
                    setSuccess(true);
                    setLoading(false);
                    localStorage.removeItem('selectedCertificate');
                    localStorage.removeItem('courseCompleted');
                    localStorage.removeItem('completedCourseName');
                    localStorage.removeItem('lastGeneratedCertificate');
                    console.log('🎉 Found certificate on final retry:', retryCertificate);
                    return;
                  }
                } catch (error) {
                  console.error('Error parsing retry certificate:', error);
                }
              }
              
              // Only show error if we truly don't have a certificate AND we're not viewing a selected one
              const finalCheck = localStorage.getItem('selectedCertificate');
              if (!finalCheck) {
                setError('No certificates found. Please complete a course first to generate a certificate.');
              } else {
                console.log('⚠️ selectedCertificate still exists, will retry on next render');
                setLoading(false);
              }
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

  // Refresh module counts from course completion status
  useEffect(() => {
    const refreshModuleCounts = async () => {
      if (!certificateData?.courseTitle) return;

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return;

      try {
        // Get user email from token
        let userEmail = '';
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userEmail = payload.email;
        } catch (e) {
          console.error('Error parsing token:', e);
          return;
        }

        // Check course completion status to get accurate module counts
        const response = await fetch(API_ENDPOINTS.CERTIFICATES.CHECK_COURSE_COMPLETION, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            courseName: certificateData.courseTitle,
            userEmail: userEmail
          })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          // Try to get module counts from completionStatus first
          const completionStatus = data.completionStatus;
          if (completionStatus) {
            setRefreshedModuleData({
              completedModules: completionStatus.completedModules || certificateData.completedModules || [],
              totalModules: completionStatus.totalModules || certificateData.totalModules || 0,
              completedCount: completionStatus.completedCount || (Array.isArray(completionStatus.completedModules) ? completionStatus.completedModules.length : 0)
            });
            console.log('✅ Refreshed module counts from completionStatus:', {
              completed: completionStatus.completedCount || (Array.isArray(completionStatus.completedModules) ? completionStatus.completedModules.length : 0),
              total: completionStatus.totalModules
            });
          } else if (data.certificate) {
            // Fallback: use certificate data from response if available
            const cert = data.certificate;
            setRefreshedModuleData({
              completedModules: cert.completedModules || certificateData.completedModules || [],
              totalModules: cert.totalModules || certificateData.totalModules || 0,
              completedCount: Array.isArray(cert.completedModules) ? cert.completedModules.length : (cert.completedModules || 0)
            });
            console.log('✅ Refreshed module counts from certificate:', {
              completed: Array.isArray(cert.completedModules) ? cert.completedModules.length : (cert.completedModules || 0),
              total: cert.totalModules
            });
          }
        }
      } catch (error) {
        console.error('Error refreshing module counts:', error);
        // Use certificate data as fallback
        setRefreshedModuleData({
          completedModules: certificateData.completedModules || [],
          totalModules: certificateData.totalModules || 0,
          completedCount: Array.isArray(certificateData.completedModules) ? certificateData.completedModules.length : 0
        });
      }
    };

    if (certificateData) {
      refreshModuleCounts();
    }
  }, [certificateData]);

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

  // Format date as DD/MM/YYYY
  const formatDate = (dateValue) => {
    if (!dateValue) {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    // If it's already a string, try to parse it
    if (typeof dateValue === 'string') {
      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        const day = String(parsedDate.getDate()).padStart(2, '0');
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const year = parsedDate.getFullYear();
        return `${day}/${month}/${year}`;
      }
      // If parsing fails, return as is (might already be formatted)
      return dateValue;
    }
    
    // If it's a Date object
    if (dateValue instanceof Date) {
      const day = String(dateValue.getDate()).padStart(2, '0');
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const year = dateValue.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    return dateValue;
  };

  // Get certificate details - use refreshed data if available, otherwise use certificate data
  const courseTitle = certificateData?.courseTitle || "Information Security & Data Protection";
  const date = formatDate(certificateData?.date || certificateData?.completionDate);
  const certificateId = certificateData?.certificateId || "CERT-001";
  
  // Use refreshed module data if available, otherwise fall back to certificate data
  const completedModules = refreshedModuleData?.completedModules || certificateData?.completedModules || [];
  const totalModules = refreshedModuleData?.totalModules || certificateData?.totalModules || 0;
  
  // Calculate completed count - prefer array length if it's an array, otherwise use the count
  const completedCount = Array.isArray(completedModules) 
    ? completedModules.length 
    : (refreshedModuleData?.completedCount || (Array.isArray(certificateData?.completedModules) ? certificateData.completedModules.length : 0));

  return (
    <div className="certificate-container">
      <div className="certificate">
        {/* Logo in top right corner */}
        <div className="certificate-logo">
          <img 
            src="/logo_new.jpg" 
            alt="VISTA Logo"
            className="vista-logo-img"
          />
        </div>
        
        <h1 className="certificate-title">Certificate of  Completion</h1>
        <p className="certificate-text">This is to certify that</p>
        <h2 className="employee-name">{employeeName}</h2>
        <p className="certificate-text">has successfully completed the course</p>
        <h3 className="course-title">{courseTitle}</h3>
        
        {/* Course completion details */}
        {totalModules > 0 && (
          <div className="course-details">
            <p className="completion-info">
              <strong>Modules Completed:</strong> {completedCount} of {totalModules}
            </p>
          </div>
        )}
        
        <p className="date">Date: {date}</p>

        {/* Action buttons */}
        <div className="certificate-actions">
          <button 
            className="print-certificate-btn"
            onClick={() => window.print()}
          >
            🖨️ Print Certificate
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificatePage;
