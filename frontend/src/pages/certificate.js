import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './certificate.css';
import { API_ENDPOINTS } from '../config/api';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
  const [pdfUrl, setPdfUrl] = useState(null); // URL for the filled PDF
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Get employee data from localStorage or user session
  const getEmployeeData = () => {
    let employeeName = "Employee Name";
    let employeeId = "Unknown ID";

    // Determine current user role from session (if available)
    let isAdmin = false;
    const userSessionRaw = localStorage.getItem('userSession');
    if (userSessionRaw) {
      try {
        const user = JSON.parse(userSessionRaw);
        isAdmin = user.role === 'admin';
        // If not admin, prefer the logged-in user's info
        if (!isAdmin) {
          employeeName = user.name || user.email?.split('@')[0] || employeeName;
          employeeId = user._id || user.id || employeeId;
        }
      } catch (e) {
        console.error('Error parsing user session:', e);
      }
    }

    // Only use viewingEmployee* keys when the current user is an admin
    const viewingEmployeeName = localStorage.getItem('viewingEmployeeName');
    const viewingEmployeeId = localStorage.getItem('viewingEmployeeId');
    if (isAdmin && viewingEmployeeName) {
      employeeName = viewingEmployeeName;
    }
    if (isAdmin && viewingEmployeeId) {
      employeeId = viewingEmployeeId;
    }

    // If not admin, remove any stale viewingEmployee keys to avoid showing previous admin's selection
    if (!isAdmin) {
      localStorage.removeItem('viewingEmployeeName');
      localStorage.removeItem('viewingEmployeeId');
      localStorage.removeItem('viewingEmployeeEmail');
    }

    // Fallback to individual localStorage items if still missing
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

  // Generate filled PDF certificate from template
  useEffect(() => {
    const generateFilledPdf = async () => {
      if (!certificateData) {
        return;
      }

      try {
        setIsGeneratingPdf(true);
        
        // Extract employee name - prioritize certificateData, then fallback to getEmployeeData
        // Check multiple possible fields in certificateData
        let certEmployeeName = certificateData?.employeeName || 
                              certificateData?.name || 
                              certificateData?.employee?.name;
        
        // If not found in certificateData, get from getEmployeeData function
        if (!certEmployeeName || certEmployeeName === "Employee Name" || certEmployeeName.trim() === "") {
          const { employeeName: fallbackName } = getEmployeeData();
          certEmployeeName = fallbackName || "Employee Name";
        }
        
        // Final fallback
        if (!certEmployeeName || certEmployeeName === "Employee Name") {
          certEmployeeName = employeeName || "Employee Name";
        }
        
        // Extract course name - check multiple possible fields
        let courseTitle = certificateData?.courseTitle || 
                         certificateData?.courseName || 
                         certificateData?.course?.title ||
                         certificateData?.course?.name ||
                         "Course";
        
        // Format date as DD/MM/YYYY
        const formatDate = (dateValue) => {
          if (!dateValue) {
            const today = new Date();
            const day = String(today.getDate()).padStart(2, '0');
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const year = today.getFullYear();
            return `${day}/${month}/${year}`;
          }
          
          if (typeof dateValue === 'string') {
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
              const day = String(parsedDate.getDate()).padStart(2, '0');
              const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
              const year = parsedDate.getFullYear();
              return `${day}/${month}/${year}`;
            }
            return dateValue;
          }
          
          if (dateValue instanceof Date) {
            const day = String(dateValue.getDate()).padStart(2, '0');
            const month = String(dateValue.getMonth() + 1).padStart(2, '0');
            const year = dateValue.getFullYear();
            return `${day}/${month}/${year}`;
          }
          
          return dateValue;
        };

        // Extract date - prioritize certificateData, check multiple fields
        let date = null;
        
        // Try multiple date fields in order of priority
        if (certificateData?.date) {
          date = formatDate(certificateData.date);
          console.log('📅 Date found in certificateData.date:', certificateData.date, '→ formatted:', date);
        } else if (certificateData?.completionDate) {
          date = formatDate(certificateData.completionDate);
          console.log('📅 Date found in certificateData.completionDate:', certificateData.completionDate, '→ formatted:', date);
        } else if (certificateData?.createdAt) {
          date = formatDate(certificateData.createdAt);
          console.log('📅 Date found in certificateData.createdAt:', certificateData.createdAt, '→ formatted:', date);
        } else if (certificateData?.certificateDate) {
          date = formatDate(certificateData.certificateDate);
          console.log('📅 Date found in certificateData.certificateDate:', certificateData.certificateDate, '→ formatted:', date);
        } else {
          // Use today's date as fallback
          const today = new Date();
          date = formatDate(today);
          console.log('📅 No date found in certificateData, using today\'s date:', date);
        }
        
        // Log the values being used - detailed logging
        console.log('📋 Certificate Data Extraction:');
        console.log('   Full certificateData object:', certificateData);
        console.log('   Extracted values:', {
          employeeName: certEmployeeName,
          courseTitle: courseTitle,
          date: date,
          employeeNameFromData: certificateData?.employeeName,
          nameFromData: certificateData?.name,
          courseTitleFromData: certificateData?.courseTitle,
          courseNameFromData: certificateData?.courseName,
          dateFromData: certificateData?.date,
          completionDateFromData: certificateData?.completionDate
        });
        console.log('   Employee name from getEmployeeData():', employeeName);
        
        // CRITICAL: Log the final values that will be used
        console.log('🎯 FINAL VALUES TO DISPLAY:');
        console.log('   Employee Name:', certEmployeeName);
        console.log('   Course Title:', courseTitle);
        console.log('   Date:', date);
        
        // Validate we have real values (not defaults)
        if (certEmployeeName === "Employee Name" || !certEmployeeName) {
          console.error('❌ ERROR: Employee name is missing or default!');
        }
        if (courseTitle === "Course" || !courseTitle) {
          console.error('❌ ERROR: Course title is missing or default!');
        }
        if (!date) {
          console.error('❌ ERROR: Date is missing!');
        }
        
        // Validate that we have the required values
        if (!certEmployeeName || certEmployeeName === "Employee Name") {
          console.warn('⚠️ Employee name is missing or default. Using fallback.');
          console.warn('   Available data:', {
            certEmployeeName,
            employeeName,
            certificateDataEmployeeName: certificateData?.employeeName,
            certificateDataName: certificateData?.name
          });
        }
        if (!courseTitle || courseTitle === "Course") {
          console.warn('⚠️ Course title is missing or default. Using fallback.');
          console.warn('   Available data:', {
            courseTitle,
            certificateDataCourseTitle: certificateData?.courseTitle,
            certificateDataCourseName: certificateData?.courseName
          });
        }
        if (!date) {
          console.warn('⚠️ Date is missing. Using today\'s date.');
        }
        
        // Use Post Training Certificate template
        // File renamed to remove spaces for better server compatibility
        // Use process.env.PUBLIC_URL for proper deployment (works in both dev and production)
        const fileName = 'VISTA_Post_Training_Certificate_Final_2.pdf';
        
        // Get base URL (empty string in dev, or set path in production)
        // process.env.PUBLIC_URL is set by Create React App and is empty string in dev
        const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, ''); // Remove trailing slash if present
        
        // Build URL - no spaces in filename, so direct path works
        const templateUrl = publicUrl ? `${publicUrl}/${fileName}` : `/${fileName}`;
        
        console.log(`📄 Attempting to load PDF template:`);
        console.log(`   PUBLIC_URL: ${process.env.PUBLIC_URL || '(not set, using root)'}`);
        console.log(`   Base URL: ${publicUrl || '(root)'}`);
        console.log(`   Filename: "${fileName}"`);
        console.log(`   Full URL: "${templateUrl}"`);
        
        // Fetch the PDF template - direct path (no encoding needed since no spaces)
        let templateResponse;
        let finalUrl = templateUrl;
        const possibleUrls = [
          templateUrl, // Direct path
        ];
        
        let loaded = false;
        for (const url of possibleUrls) {
          try {
            console.log(`   Trying URL: ${url}`);
            templateResponse = await fetch(url);
            
            if (templateResponse.ok) {
              finalUrl = url;
              console.log(`✅ Successfully loaded PDF template from: ${url}`);
              loaded = true;
              break;
            } else {
              console.log(`   ❌ Failed with status: ${templateResponse.status}`);
            }
          } catch (fetchError) {
            console.log(`   ❌ Fetch error: ${fetchError.message}`);
            continue;
          }
        }
        
        if (!loaded || !templateResponse || !templateResponse.ok) {
          // If PDF template fails to load, we can't fill it, but we should still try to show it
          console.error('❌ Cannot load PDF template for filling. Will show template without filling.');
          console.error('   This means the employee name, course, and date will not be filled automatically.');
          console.error('   Please ensure the PDF file exists and the dev server has been restarted.');
          
          // Set the PDF URL anyway so it can be displayed (even without filling)
          const fallbackPdfUrl = possibleUrls[0];
          setPdfUrl(fallbackPdfUrl);
          setIsGeneratingPdf(false);
          return; // Exit early - can't fill PDF if we can't load it
        }
        
        const templateBytes = await templateResponse.arrayBuffer();
        const pdfDoc = await PDFDocument.load(templateBytes);
        
        console.log('✅ PDF template loaded successfully, proceeding to fill with data...');
        
        // Get the first page
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();
        
        // Get fonts
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        // Try to fill form fields first (if the PDF has form fields)
        let formFieldsFilled = false;
        try {
          const form = pdfDoc.getForm();
          const fields = form.getFields();
          
          if (fields.length > 0) {
            // Common field names that might exist in the PDF
            const fieldNames = fields.map(f => f.getName());
            console.log('📝 PDF Form Fields found:', fieldNames);
            
            // Try to set common field names (case-insensitive matching with more variations)
            const fieldMap = {
              'employeename': certEmployeeName,
              'employee_name': certEmployeeName,
              'name': certEmployeeName,
              'employee': certEmployeeName,
              'studentname': certEmployeeName,
              'student_name': certEmployeeName,
              'recipient': certEmployeeName,
              'coursename': courseTitle,
              'course_name': courseTitle,
              'course': courseTitle,
              'coursetitle': courseTitle,
              'course_title': courseTitle,
              'assessment': courseTitle,
              'date': date,
              'completiondate': date,
              'completion_date': date,
              'certificatedate': date,
              'certificate_date': date
            };
            
            fields.forEach(field => {
              const fieldName = field.getName().toLowerCase().replace(/\s+/g, '');
              const value = fieldMap[fieldName];
              
              if (value) {
                try {
                  if (field.constructor.name === 'PDFTextField') {
                    field.setText(value);
                    formFieldsFilled = true;
                    console.log(`✅ Filled form field: ${field.getName()} = ${value}`);
                  }
                } catch (e) {
                  console.log(`⚠️ Could not set field ${field.getName()}:`, e);
                }
              }
            });
          } else {
            console.log('ℹ️ No form fields found in PDF');
          }
        } catch (formError) {
          console.log('ℹ️ PDF may not have form fields, will use text overlay:', formError.message);
        }
        
        // ALWAYS overlay text to ensure it displays (even if form fields were filled)
        // This ensures the text is visible regardless of form field support
        // Using pure black for maximum visibility
        const textColor = rgb(0, 0, 0); // Pure black for better visibility
        
        // Ensure we have valid values before drawing
        // Use the actual extracted values - don't use fallbacks if we have real data
        const displayName = certEmployeeName || "Employee Name";
        const displayCourse = courseTitle || "Course";
        const displayDate = date || new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY format
        
        console.log('🎨 FINAL VALUES TO OVERLAY ON PDF:');
        console.log('   Employee Name:', displayName);
        console.log('   Course Title:', displayCourse);
        console.log('   Date:', displayDate);
        
        // Verify we have real values
        if (displayName === "Employee Name") {
          console.warn('⚠️ WARNING: Using default employee name!');
        }
        if (displayCourse === "Course") {
          console.warn('⚠️ WARNING: Using default course name!');
        }
        
        // Better text width calculation using font metrics
        const getTextWidth = (text, fontSize, font) => {
          return font.widthOfTextAtSize(text, fontSize);
        };
        
        // Calculate center position
        const centerX = width / 2;
        
        // Employee Name - centered horizontally
        // Increased font size for better visibility
        const nameFontSize = 48; // Increased from 20 to 28
        const nameWidth = getTextWidth(displayName, nameFontSize, helveticaBoldFont);
        const nameX = centerX - (nameWidth / 2);
        const nameY = height * 0.55; // 55% from bottom = ~45% from top
        
        firstPage.drawText(displayName, {
          x: nameX,
          y: nameY,
          size: nameFontSize,
          font: helveticaBoldFont,
          color: textColor,
        });
        console.log(`✅ Overlaid Employee Name: "${displayName}"`);
        console.log(`   Text: "${displayName}"`);
        console.log(`   Position: x=${nameX.toFixed(2)}, y=${nameY.toFixed(2)} (${(nameY/height*100).toFixed(1)}% from bottom)`);
        console.log(`   Font size: ${nameFontSize}, Width: ${nameWidth.toFixed(2)}`);
        
        // Course Name - centered horizontally, below employee name
        // Increased font size for better visibility
        const courseFontSize = 48; // Increased from 16 to 22
        const courseWidth = getTextWidth(displayCourse, courseFontSize, helveticaBoldFont);
        const courseX = centerX - (courseWidth / 2);
        const courseY = height * 0.40; // 40% from bottom = ~60% from top
        
        firstPage.drawText(displayCourse, {
          x: courseX,
          y: courseY,
          size: courseFontSize,
          font: helveticaBoldFont,
          color: textColor,
        });
        console.log(`✅ Overlaid Course Name: "${displayCourse}"`);
        console.log(`   Text: "${displayCourse}"`);
        console.log(`   Position: x=${courseX.toFixed(2)}, y=${courseY.toFixed(2)} (${(courseY/height*100).toFixed(1)}% from bottom)`);
        console.log(`   Font size: ${courseFontSize}, Width: ${courseWidth.toFixed(2)}`);
        
        // Date - bottom left area, positioned right above the "DATE" label
        // The "DATE" label is typically around 10-12% from bottom, so date should be above it
        const dateFontSize = 48; // Increased from 11 to 14
        const dateWidth = getTextWidth(displayDate, dateFontSize, helveticaBoldFont);
        const dateX = width * 0.34; // 14% from left edge (aligned with DATE label)
        // Position date right above "DATE" label - DATE is around 10% from bottom, so date should be around 13-15% from bottom
        const dateY = height * 0.28; // 15% from bottom (right above the DATE label)
        
        // Draw date with bold font for better visibility
        firstPage.drawText(displayDate, {
          x: dateX,
          y: dateY,
          size: dateFontSize,
          font: helveticaBoldFont, // Changed to bold for better visibility
          color: textColor,
        });
        console.log(`✅ Overlaid Date: "${displayDate}"`);
        console.log(`   Text: "${displayDate}"`);
        console.log(`   Position: x=${dateX.toFixed(2)}, y=${dateY.toFixed(2)} (${(dateY/height*100).toFixed(1)}% from bottom)`);
        console.log(`   Font size: ${dateFontSize}, Width: ${dateWidth.toFixed(2)}`);
        console.log(`   Date value check: displayDate="${displayDate}", date="${date}", certificateData.date="${certificateData?.date}", certificateData.completionDate="${certificateData?.completionDate}"`);
        
        console.log(`📄 PDF Dimensions: ${width.toFixed(2)} x ${height.toFixed(2)}`);
        console.log('✅ All text overlaid on PDF successfully');
        
        console.log(`📄 PDF Dimensions: ${width.toFixed(2)} x ${height.toFixed(2)}`);
        console.log('✅ All text overlaid on PDF successfully');
        
        // Save the PDF
        const pdfBytes = await pdfDoc.save();
        
        // Create blob URL
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // Clean up previous URL if exists
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
        
        setPdfUrl(url);
        setIsGeneratingPdf(false);
        
        console.log('✅ PDF certificate generated successfully');
      } catch (error) {
        console.error('❌ Error generating PDF certificate:', error);
        console.error('Error details:', error.message);
        setIsGeneratingPdf(false);
        
        // Fallback: try to show the template PDF without filling
        // Use process.env.PUBLIC_URL for proper deployment
        const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
        const fallbackFiles = [
          'VISTA_Post_Training_Certificate_Final_2.pdf',
          'VISTA_Pre_Training_Certificate_Final_3.pdf'
        ];
        
        const fallbackUrls = [];
        fallbackFiles.forEach(file => {
          // No spaces in filenames, so direct path works
          const basePath = publicUrl || '';
          fallbackUrls.push(
            `${basePath}/${file}` // Direct path (no encoding needed)
          );
        });
        
        // Try to find a working template using GET request
        for (const url of fallbackUrls) {
          try {
            console.log(`🔄 Trying fallback: ${url}`);
            // Use GET instead of HEAD - some servers don't support HEAD properly
            const testResponse = await fetch(url, { 
              method: 'GET',
              cache: 'no-cache'
            });
            if (testResponse.ok) {
              console.log(`✅ Using fallback template: ${url}`);
              setPdfUrl(url);
              return;
            } else {
              console.log(`   ❌ Failed with status: ${testResponse.status}`);
            }
          } catch (e) {
            console.log(`   ❌ Fallback failed: ${e.message}`);
            continue;
          }
        }
        
        console.error('❌ Could not load any certificate template');
        console.error('   Tried URLs:', fallbackUrls);
        console.error('   Please ensure:');
        console.error('   1. PDF files exist in frontend/public/ folder');
        console.error('   2. React dev server is running (npm start)');
        console.error('   3. Server has been restarted after adding PDF files');
        
        // Last resort: Try to use the first URL anyway (might work in some cases)
        // This allows the certificate to at least attempt to display
        const lastResortUrl = fallbackUrls[0];
        console.log(`⚠️ Attempting last resort: using ${lastResortUrl} anyway`);
        setPdfUrl(lastResortUrl);
        
        // Don't set error - let it try to load and show what happens
        // setError('Failed to load certificate template. Please check the console for details and ensure the PDF files exist in the public folder.');
      }
    };

    if (certificateData) {
      generateFilledPdf();
    }

    // Cleanup function
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [certificateData, employeeName]); // Keep employeeName as dependency for fallback

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
  const certEmployeeName = certificateData?.employeeName || 
                          certificateData?.name || 
                          employeeName || 
                          "Employee Name";
  const courseTitle = certificateData?.courseTitle || 
                     certificateData?.courseName || 
                     "Information Security & Data Protection";
  const date = formatDate(certificateData?.date || certificateData?.completionDate);
  const certificateId = certificateData?.certificateId || "CERT-001";
  
  // Use refreshed module data if available, otherwise fall back to certificate data
  const completedModules = refreshedModuleData?.completedModules || certificateData?.completedModules || [];
  const totalModules = refreshedModuleData?.totalModules || certificateData?.totalModules || 0;
  
  // Calculate completed count - prefer array length if it's an array, otherwise use the count
  const completedCount = Array.isArray(completedModules) 
    ? completedModules.length 
    : (refreshedModuleData?.completedCount || (Array.isArray(certificateData?.completedModules) ? certificateData.completedModules.length : 0));

  // Handle download PDF
  const handleDownloadPdf = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      const safeEmployeeName = certEmployeeName.replace(/\s+/g, '_').replace(/[^\w.-]+/g, '');
      const safeCourseTitle = courseTitle.replace(/\s+/g, '_').replace(/[^\w.-]+/g, '');
      link.download = `Certificate_${safeEmployeeName}_${safeCourseTitle}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle print PDF
  const handlePrintPdf = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } else {
      window.print();
    }
  };

  return (
    <div className="certificate-container">
      {isGeneratingPdf ? (
        <div className="certificate">
          <h2>Generating Certificate...</h2>
          <p>Please wait while we prepare your certificate.</p>
        </div>
      ) : pdfUrl ? (
        <div className="certificate-pdf-container">
          <iframe
            src={pdfUrl}
            title="Certificate PDF"
            style={{
              width: '100%',
              height: '80vh',
              border: 'none',
              minHeight: '800px'
            }}
          />
          
          {/* Action buttons */}
          <div className="certificate-actions">
          
            <button 
              className="download-certificate-btn"
              onClick={handleDownloadPdf}
            >
              📥 Download Certificate
            </button>
          </div>
        </div>
      ) : (
        <div className="certificate">
          {/* Fallback HTML certificate if PDF generation fails */}
          <div className="certificate-logo">
            <img 
              src="/logo_new.jpg" 
              alt="VISTA Logo"
              className="vista-logo-img"
            />
          </div>
          
          <h1 className="certificate-title">Certificate of Completion</h1>
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
      )}
    </div>
  );
};

export default CertificatePage;
