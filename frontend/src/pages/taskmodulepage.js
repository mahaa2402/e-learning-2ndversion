// frontend/src/pages/taskmodulepage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, ChevronLeft, Play, FileText, CheckCircle, Circle, Check, Subtitles } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import './taskmodulepage.css';

const TaskModulePage = () => {
  const { state } = useLocation();
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();

  const [courseDetails, setCourseDetails] = useState(state?.courseDetails || null);
  const [selectedModule, setSelectedModule] = useState(state?.selectedModule || null);
  const [taskDetails, setTaskDetails] = useState(state?.taskDetails || null);

  const [videoUrl, setVideoUrl] = useState(null);
  const [subtitleUrl, setSubtitleUrl] = useState(null);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [completedModules, setCompletedModules] = useState(new Set());
  const [quizCompletionStatus, setQuizCompletionStatus] = useState({});
  const [unlockStatus, setUnlockStatus] = useState([]); // For sequential unlocking
  const [fetchingUnlockStatus, setFetchingUnlockStatus] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchingCourse, setFetchingCourse] = useState(false);
  const [fetchingQuizStatus, setFetchingQuizStatus] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // 🔍 Fetch course details from backend if not available in state
  const fetchCourseDetails = async () => {
    try {
      setFetchingCourse(true);
      console.log('Fetching course details for courseId:', courseId);

  const response = await fetch(`/api/courses/getcourse`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Courses API Response:', result);
      
      let courseData;
      if (result && Array.isArray(result)) {
        courseData = result;
      } else if (result && result.courses && Array.isArray(result.courses)) {
        courseData = result.courses;
      } else {
        throw new Error('Unexpected response format from courses server');
      }
      
      console.log('Available courses in database:', courseData.map(c => ({
        id: c._id,
        name: c.name,
        description: c.description,
        category: c.category,
        modulesCount: c.modules?.length || 0
      })));

      // Find the course by name (courseId) - try exact match first, then partial match
      let course = courseData.find(c => c.name === courseId);
      
      // If exact match not found, try partial match
      if (!course) {
        course = courseData.find(c => c.name.toLowerCase().includes(courseId.toLowerCase()) || 
                                    courseId.toLowerCase().includes(c.name.toLowerCase()));
      }
      
      // If still not found, try to find by any field that might contain the courseId
      if (!course) {
        course = courseData.find(c => 
          c._id?.toString() === courseId || 
          c.description?.toLowerCase().includes(courseId.toLowerCase()) ||
          c.category?.toLowerCase().includes(courseId.toLowerCase())
        );
      }
      
      if (!course) {
        console.error('Course search failed. Available courses:', courseData.map(c => c.name));
        throw new Error(`Course "${courseId}" not found. Available courses: ${courseData.map(c => c.name).join(', ')}`);
      }
      
      if (course) {
        console.log('Found course:', course);
        
        // Validate course structure
        if (!course.modules || !Array.isArray(course.modules)) {
          console.error('Course structure validation failed:', {
            courseName: course.name,
            hasModules: !!course.modules,
            modulesType: typeof course.modules,
            modulesValue: course.modules
          });
          throw new Error(`Course "${course.name}" has invalid structure. Missing or invalid modules array.`);
        }
        
        if (course.modules.length === 0) {
          console.error('Course has no modules:', course);
          throw new Error(`Course "${course.name}" has no modules.`);
        }
        
        console.log('Course validation passed:', {
          name: course.name,
          modulesCount: course.modules.length,
          moduleTitles: course.modules.map(m => m.title),
          firstModule: course.modules[0]
        });
        
        setCourseDetails(course);
        setSuccessMessage(`✅ Successfully loaded course: ${course.name} with ${course.modules.length} modules`);
        setError(null); // Clear any existing errors
        
        // Set selected module if moduleId is provided
        if (moduleId && course.modules && course.modules.length > parseInt(moduleId)) {
          const module = course.modules[parseInt(moduleId)];
          setSelectedModule(module);
        } else if (course.modules && course.modules.length > 0) {
          setSelectedModule(course.modules[0]);
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(`Course "${courseId}" not found`);
      }
    } catch (err) {
      console.error('Error fetching course details:', err);
      setError(`Failed to load course details: ${err.message}`);
    } finally {
      setFetchingCourse(false);
    }
  };

  // 📹 Fetch video from AWS/backend
  const fetchVideo = async () => {
    try {
  const res = await axios.get("/api/video/get", {
        params: {
          courseName: courseId, 
          moduleIndex: parseInt(moduleId, 10),
        },
      });

      if (res.data && res.data.success && res.data.url) {
        setVideoUrl(res.data.url);
        // Fetch subtitle after video is loaded
        await fetchSubtitle();
      } else {
        console.log("No video found for this module.");
      }
    } catch (err) {
      console.error("Video load error:", err);
      // Don't set error for video, just log it
    }
  };

  // 📝 Fetch subtitle from AWS/backend
  const fetchSubtitle = async () => {
    try {
      const res = await axios.get("/api/video/subtitle", {
        params: {
          courseName: courseId,
          moduleIndex: parseInt(moduleId, 10),
        },
      });

      if (res.data && res.data.success && res.data.url) {
        setSubtitleUrl(res.data.url);
        console.log("✅ Subtitle loaded successfully");
      } else {
        // No subtitle file found - this is normal, not an error
        setSubtitleUrl(null);
      }
    } catch (err) {
      // Handle 404 (no subtitle found) vs other errors
      if (err.response && err.response.status === 404) {
        // No subtitle file exists - this is expected and not an error
        console.log("ℹ️ No subtitle file found for this module (this is normal)");
      } else {
        // Other errors (network, server, etc.) - log but don't show to user
        console.log("⚠️ Could not fetch subtitle:", err.message);
      }
      setSubtitleUrl(null);
      // Don't show error to user - subtitles are optional
    }
  };

  // Toggle subtitle visibility
  const handleSubtitleToggle = () => {
    setShowSubtitles(!showSubtitles);
  };

  // Control subtitle track visibility
  useEffect(() => {
    const video = document.querySelector('.video-player');
    if (video) {
      // Wait for video to load and tracks to be ready
      const handleLoadedMetadata = () => {
        if (video.textTracks && video.textTracks.length > 0) {
          const track = video.textTracks[0];
          track.mode = showSubtitles && subtitleUrl ? 'showing' : 'hidden';
        }
      };
      
      if (video.readyState >= 1) {
        // Metadata already loaded
        handleLoadedMetadata();
      } else {
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
      }
      
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [showSubtitles, subtitleUrl]);

  // 🔍 Fetch quiz completion status for the current course
  const fetchQuizCompletionStatus = useCallback(async () => {
    try {
      if (!courseDetails?.name) return;
      
      setFetchingQuizStatus(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No authentication token found, skipping quiz completion status fetch');
        return;
      }

  const response = await fetch(`/api/assigned-course-progress/quiz-completion-status/${encodeURIComponent(courseDetails.name)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📊 Quiz completion status:', result);
        
        // Create a map of module completion status
        const completionMap = {};
        if (result.moduleCompletionStatus) {
          result.moduleCompletionStatus.forEach(module => {
            completionMap[module.moduleTitle] = {
              isCompleted: module.isCompleted,
              completedAt: module.completedAt
            };
          });
        }
        
        console.log('📊 Quiz completion map:', completionMap);
        setQuizCompletionStatus(completionMap);
      } else {
        console.log('Failed to fetch quiz completion status');
        const errorText = await response.text();
        console.log('Quiz completion error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching quiz completion status:', error);
      // Don't set error for this, just log it
    } finally {
      setFetchingQuizStatus(false);
    }
  }, [courseDetails?.name]);

  // 🔓 Fetch unlock status for sequential access control
  const fetchUnlockStatus = useCallback(async () => {
    try {
      if (!courseDetails?.name) return;
      
      setFetchingUnlockStatus(true);
      
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const userEmail = localStorage.getItem('employeeEmail') || localStorage.getItem('userEmail');
      
      if (!token || !userEmail) {
        console.log('No token or email found, using default unlock status');
        setUnlockStatus([]);
        setFetchingUnlockStatus(false);
        return;
      }

      const response = await fetch(
      `${API_ENDPOINTS.PROGRESS.GET_PROGRESS}?userEmail=${userEmail}&courseName=${courseDetails.name}&courseId=${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('🔓 Full unlock status response:', data);
        console.log('🔓 Unlock status received:', data.lessonUnlockStatus);
        
        if (Array.isArray(data.lessonUnlockStatus)) {
          console.log('📊 Setting unlock status with', data.lessonUnlockStatus.length, 'items');
          data.lessonUnlockStatus.forEach((status, index) => {
            console.log(`📋 Status ${index}:`, status);
            console.log(`📋 Status ${index} lessonId:`, status.lessonId);
            console.log(`📋 Status ${index} isCompleted:`, status.isCompleted);
          });
          setUnlockStatus(data.lessonUnlockStatus);
        } else {
          console.warn("Unexpected lessonUnlockStatus format:", data.lessonUnlockStatus);
          setUnlockStatus([]);
        }
      } else {
        console.log('Failed to fetch unlock status, using default');
        const errorText = await response.text();
        console.log('Error response:', errorText);
        setUnlockStatus([]);
      }
    } catch (error) {
      console.error('Error fetching unlock status:', error);
      setUnlockStatus([]);
    } finally {
      setFetchingUnlockStatus(false);
    }
  }, [courseDetails?.name, courseId]);

  // Refresh quiz completion status when course details change
  useEffect(() => {
    if (courseDetails?.name && courseDetails.modules && courseDetails.modules.length > 0) {
      fetchQuizCompletionStatus();
      fetchUnlockStatus();
    }
  }, [courseDetails, fetchQuizCompletionStatus, fetchUnlockStatus]);

  // Refresh unlock status when page becomes visible (e.g., after quiz completion)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && courseDetails?.name) {
        console.log("🔄 Page became visible, refreshing unlock status...");
        fetchUnlockStatus();
        fetchQuizCompletionStatus();
      }
    };

    const handleFocus = () => {
      if (courseDetails?.name) {
        console.log("🔄 Window focused, refreshing unlock status...");
        fetchUnlockStatus();
        fetchQuizCompletionStatus();
      }
    };

    // Also refresh when the page loads (in case user navigated back from quiz)
    const handlePageLoad = () => {
      if (courseDetails?.name) {
        console.log("🔄 Page loaded, refreshing unlock status...");
        fetchUnlockStatus();
        fetchQuizCompletionStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageLoad);
    
    // Initial refresh when component mounts
    handlePageLoad();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageLoad);
    };
  }, [courseDetails?.name, fetchUnlockStatus, fetchQuizCompletionStatus]);

  // Force refresh completion status when component mounts (for welding course specifically)
  useEffect(() => {
    if (courseDetails?.name === 'Welding' || courseDetails?.title === 'Welding') {
      console.log("🔧 Welding course detected - forcing completion status refresh");
      // Add a small delay to ensure other data is loaded first
      setTimeout(() => {
        fetchUnlockStatus();
        fetchQuizCompletionStatus();
      }, 1000);
    }
  }, [courseDetails?.name, courseDetails?.title, fetchUnlockStatus, fetchQuizCompletionStatus]);

  // Listen for quiz completion events to refresh unlock status
  useEffect(() => {
    const handleQuizCompleted = (event) => {
      const { moduleId, courseId, courseName } = event.detail;
      console.log('🎉 Quiz completed event received:', { moduleId, courseId, courseName });
      
      // Check if this completion is for the current course
      const currentCourseId = courseDetails?._id || courseDetails?.id;
      const currentCourseName = courseDetails?.name || courseDetails?.title;
      
      if (courseId === currentCourseId || courseName === currentCourseName) {
        console.log('🔄 Refreshing unlock status for current course...');
        // Add a small delay to ensure backend has processed the completion
        setTimeout(() => {
          fetchUnlockStatus();
          fetchQuizCompletionStatus();
        }, 500);
      }
    };

    const handleProgressUpdated = (event) => {
      const { courseName: eventCourseName, lessonUnlockStatus } = event.detail;
      console.log('🔄 Progress updated event received:', { eventCourseName, lessonUnlockStatus });
      
      // Check if this update is for the current course
      const currentCourseName = courseDetails?.name || courseDetails?.title;
      
      if (eventCourseName === currentCourseName) {
        console.log('✅ Updating unlock status from progress update event...');
        setUnlockStatus(lessonUnlockStatus);
        
        // Update completed modules based on new progress data
        const completedModules = new Set();
        lessonUnlockStatus.forEach(lesson => {
          if (lesson.isCompleted) {
            completedModules.add(lesson.lessonId);
          }
        });
        setCompletedModules(completedModules);
        
        // Also update quiz completion status
        const quizStatus = {};
        lessonUnlockStatus.forEach(lesson => {
          if (lesson.isCompleted) {
            quizStatus[lesson.lessonId] = { isCompleted: true };
          }
        });
        setQuizCompletionStatus(quizStatus);
      }
    };

    window.addEventListener('quizCompleted', handleQuizCompleted);
    window.addEventListener('progressUpdated', handleProgressUpdated);
    
    return () => {
      window.removeEventListener('quizCompleted', handleQuizCompleted);
      window.removeEventListener('progressUpdated', handleProgressUpdated);
    };
  }, [courseDetails, fetchUnlockStatus, fetchQuizCompletionStatus]);

  useEffect(() => {
    const initializePage = async () => {
      try {
        setLoading(true);
        setError(null);

        // Debug logging - let's see what data we have
        console.log("=== DETAILED DEBUG INFO ===");
        console.log("courseId:", courseId);
        console.log("moduleId:", moduleId);
        console.log("Full state object:", state);
        console.log("All state properties:", state ? Object.keys(state) : 'no state');
        console.log("state.courseDetails:", state?.courseDetails);
        console.log("state.selectedModule:", state?.selectedModule);
        console.log("state.taskDetails:", state?.taskDetails);
        
        // Check if courseDetails is passed under a different name
        console.log("Checking for course data under different names:");
        console.log("state.course:", state?.course);
        console.log("state.courseData:", state?.courseData);
        console.log("state.taskDetails?.course:", state?.taskDetails?.course);
        console.log("state.taskDetails?.courseDetails:", state?.taskDetails?.courseDetails);
        
        console.log("current courseDetails:", courseDetails);
        console.log("current selectedModule:", selectedModule);
        console.log("========================");

        // Try to extract course details from different possible locations
        let extractedCourseDetails = courseDetails;
        if (!extractedCourseDetails) {
          extractedCourseDetails = state?.courseDetails || 
                                  state?.course || 
                                  state?.courseData || 
                                  state?.taskDetails?.course ||
                                  state?.taskDetails?.courseDetails;
          
          if (extractedCourseDetails) {
            console.log("Found course details in alternate location:", extractedCourseDetails);
            setCourseDetails(extractedCourseDetails);
          }
        }

        // If we still don't have course details, fetch them from backend
        if (!extractedCourseDetails && courseId) {
          console.log('No course details found in state, fetching from backend...');
          await fetchCourseDetails();
        } else if (extractedCourseDetails && !extractedCourseDetails.modules) {
          console.log('Course details found but no modules, this might be an incomplete course object');
          setError('Course details are incomplete. Missing modules information.');
        }

        // If we have courseId and moduleId, fetch video
        if (courseId && moduleId) {
          await fetchVideo();
        }

        // Fetch quiz completion status after course details are loaded
        if (extractedCourseDetails?.name) {
          // Don't call fetchQuizCompletionStatus here as it depends on courseDetails state
          // It will be called by the useEffect when courseDetails changes
        }

      } catch (err) {
        console.error('Error initializing page:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [courseId, moduleId, state]);

  // Map lesson keys to backend IDs for unlock status checking
  const getModuleIdFromLessonKey = (lessonKey) => {
    console.log('🔑 Mapping lesson key to module ID:', lessonKey);
    
    // If the lessonKey is already in the correct format (like WELDING04), return it as is
    if (lessonKey && (lessonKey.startsWith('WELDING') || lessonKey.startsWith('FACTORY') || 
        lessonKey.startsWith('ISP') || lessonKey.startsWith('POSH') || 
        lessonKey.startsWith('GDPR') || lessonKey.startsWith('CNC') || lessonKey.startsWith('VRU'))) {
      console.log('🔑 Lesson key is already in correct format:', lessonKey);
      return lessonKey;
    }
    
    // For assigned courses, the lessonKey is already the correct ID (module title)
    // For common courses, we might need mapping
    const moduleMapping = {
      'ISP01': 'ISP01', 'ISP02': 'ISP02', 'ISP03': 'ISP03', 'ISP04': 'ISP04',
      'POSH01': 'POSH01', 'POSH02': 'POSH02', 'POSH03': 'POSH03', 'POSH04': 'POSH04',
      'GDPR01': 'GDPR01', 'GDPR02': 'GDPR02', 'GDPR03': 'GDPR03', 'GDPR04': 'GDPR04',
      'FACT01': 'FACTORY01', 'FACT02': 'FACTORY02', 'FACT03': 'FACTORY03', 'FACT04': 'FACTORY04',
      'FACTORY01': 'FACTORY01', 'FACTORY02': 'FACTORY02', 'FACTORY03': 'FACTORY03', 'FACTORY04': 'FACTORY04',
      'WELD01': 'WELDING01', 'WELD02': 'WELDING02', 'WELD03': 'WELDING03', 'WELD04': 'WELDING04',
      'WELDING01': 'WELDING01', 'WELDING02': 'WELDING02', 'WELDING03': 'WELDING03', 'WELDING04': 'WELDING04',
      'CNC01': 'CNC01', 'CNC02': 'CNC02', 'CNC03': 'CNC03', 'CNC04': 'CNC04',
      'VRU01': 'VRU01', 'VRU02': 'VRU02', 'VRU03': 'VRU03', 'VRU04': 'VRU04',
      // Add mappings for e-learning modules
      'e-learn-module1': 'e-learn-module1',
      'e-learn-mod2': 'e-learn-mod2',
      'e-learn-module2': 'e-learn-module2'
    };
    
    let mappedId = moduleMapping[lessonKey];
    if (!mappedId) {
      const upperKey = lessonKey.toUpperCase();
      mappedId = moduleMapping[upperKey] || lessonKey; // Default to lessonKey itself for assigned courses
    }
    
    console.log('🔑 Mapped result:', { lessonKey, mappedId });
    return mappedId;
  };

  // Check if lesson is completed
  const isLessonCompleted = (moduleTitle) => {
    if (!Array.isArray(unlockStatus)) {
      console.log('🔍 No unlock status available for completion check:', moduleTitle);
      return false;
    }
    const moduleId = getModuleIdFromLessonKey(moduleTitle);
    const lessonStatus = unlockStatus.find(status => status.lessonId === moduleId);
    console.log('🔍 Checking lesson completion:', { 
      moduleTitle, 
      moduleId, 
      lessonStatus, 
      isCompleted: lessonStatus?.isCompleted,
      unlockStatusCount: unlockStatus.length,
      allLessonIds: unlockStatus.map(s => s.lessonId)
    });
    return lessonStatus ? lessonStatus.isCompleted : false;
  };

  // Check if quiz is completed (same as lesson completion)
  const isQuizCompleted = (moduleTitle) => isLessonCompleted(moduleTitle);

  // Check if a lesson/module is unlocked
  const isLessonUnlocked = (moduleTitle, moduleIndex) => {
    console.log('🔍 Checking lesson unlock for:', { moduleTitle, moduleIndex, unlockStatus });
    
    // If unlock status is not available yet, use a safe fallback based on previous module completion
    if (!Array.isArray(unlockStatus) || unlockStatus.length === 0) {
      if (moduleIndex === 0) {
        console.log('📝 No unlock status; unlocking first lesson by default');
        return true;
      }
      const prevModuleTitle = courseDetails?.modules?.[moduleIndex - 1]?.title;
      const prevCompleted = prevModuleTitle ? (
        // Prefer explicit quiz completion map when unlockStatus is unavailable
        quizCompletionStatus?.[prevModuleTitle]?.isCompleted === true
      ) : false;
      console.log('📝 No unlock status; fallback via previous completion:', { prevModuleTitle, prevCompleted });
      return prevCompleted;
    }
    
    const moduleId = getModuleIdFromLessonKey(moduleTitle);
    console.log('🔑 Mapped module title to ID:', { moduleTitle, moduleId });
    
    const lessonStatus = unlockStatus.find(status => status.lessonId === moduleId);
    console.log('📊 Found lesson status:', lessonStatus);
    
    // If we didn't find a status entry for this lesson, also fallback to previous completion
    if (!lessonStatus) {
      if (moduleIndex === 0) return true;
      const prevModuleTitle = courseDetails?.modules?.[moduleIndex - 1]?.title;
      const prevCompleted = prevModuleTitle ? (
        isLessonCompleted(prevModuleTitle) ||
        quizCompletionStatus?.[prevModuleTitle]?.isCompleted === true
      ) : false;
      console.log('🔁 Missing lesson status; fallback via previous completion:', { prevModuleTitle, prevCompleted });
      return prevCompleted;
    }

    const isUnlocked = lessonStatus ? lessonStatus.isUnlocked : false;
    console.log('✅ Is lesson unlocked result:', isUnlocked);
    
    return isUnlocked;
  };

  // Check if a quiz is available
  const isQuizAvailable = (moduleTitle, moduleIndex) => {
    console.log('🔍 Checking quiz availability for:', { moduleTitle, moduleIndex, unlockStatus });
    
    if (!Array.isArray(unlockStatus) || unlockStatus.length === 0) {
      console.log('📝 No unlock status, using default - first quiz available:', moduleIndex === 0);
      return moduleIndex === 0; // default: first quiz available
    }
    
    const moduleId = getModuleIdFromLessonKey(moduleTitle);
    console.log('🔑 Mapped module title to ID:', { moduleTitle, moduleId });
    
    const lessonStatus = unlockStatus.find(status => status.lessonId === moduleId);
    console.log('📊 Found lesson status:', lessonStatus);

    // Fallback unlocking rule: if the previous module is completed, unlock this quiz
    if (moduleIndex > 0 && courseDetails?.modules?.length) {
      const prevModuleTitle = courseDetails.modules[moduleIndex - 1]?.title;
      const prevCompleted = prevModuleTitle ? (
        isLessonCompleted(prevModuleTitle) ||
        (quizCompletionStatus?.[prevModuleTitle]?.isCompleted === true)
      ) : false;

      console.log('🔁 Previous module completion check:', { prevModuleTitle, prevCompleted });
      if (prevCompleted) {
        console.log('✅ Unlocking quiz via previous completion fallback');
        return true;
      }
    }

    const canTakeQuiz = lessonStatus ? lessonStatus.canTakeQuiz : false;
    console.log('✅ Can take quiz result:', canTakeQuiz);
    
    return canTakeQuiz;
  };

  const isModuleCompleted = (module) => {
    if (!module) return false;
    return completedModules.has(module.title) || module.completed;
  };

  // Check if all modules in the course are completed
  const isCourseCompleted = () => {
    if (!courseDetails?.modules) return false;
    
    // Check if all modules are completed
    return courseDetails.modules.every(module => {
      const moduleIdentifier = module.m_id || module.title;
      return isModuleCompleted(moduleIdentifier);
    });
  };

  // Handle certificate button click
  const handleViewCertificate = async () => {
    try {
      // Get user email from token for certificate generation
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

      const courseName = courseDetails?.name || courseDetails?.title || 'Course';
      console.log('🎓 Attempting to generate certificate for completed course:', courseName);
      
      // Try to generate certificate from backend first
      try {
        const generateResponse = await fetch('/api/certificate/check-course-completion', {
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
        console.log('🎓 Certificate generation response:', generateData);
        
        if (generateResponse.ok && generateData.success && generateData.isCompleted && generateData.certificate) {
          // Certificate was generated successfully
          localStorage.setItem('lastGeneratedCertificate', JSON.stringify(generateData.certificate));
          localStorage.setItem('courseCompleted', 'true');
          localStorage.setItem('completedCourseName', courseName);
          
          console.log('✅ Certificate generated successfully:', generateData.certificate);
        } else {
          console.log('⚠️ Certificate generation failed:', generateData.message);
          // Still proceed with course completion data
          localStorage.setItem('courseCompleted', 'true');
          localStorage.setItem('completedCourseName', courseName);
        }
      } catch (generateError) {
        console.error('❌ Error generating certificate:', generateError);
        // Still proceed with course completion data
        localStorage.setItem('courseCompleted', 'true');
        localStorage.setItem('completedCourseName', courseName);
      }
      
      // Navigate to certificate page
      navigate('/certificate');
    } catch (error) {
      console.error('❌ Error in handleViewCertificate:', error);
      // Fallback: just navigate to certificate page
      const courseName = courseDetails?.name || courseDetails?.title || 'Course';
      localStorage.setItem('courseCompleted', 'true');
      localStorage.setItem('completedCourseName', courseName);
      navigate('/certificate');
    }
  };

  if (loading) {
    return (
      <div className="task-module-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading module...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-module-page">
        <div className="error-state">
          <AlertCircle className="error-icon" />
          <p className="error-text">Error: {error}</p>
          <button className="btn btn-back" onClick={() => navigate(-1)}>Back to Task Details</button>
        </div>
      </div>
    );
  }

  const handleVideoProgress = (e) => {
    const video = e.target;
    if (video.duration) {
      const progressPercent = (video.currentTime / video.duration) * 100;
      setProgress(progressPercent);
      
      if (progressPercent >= 90 && !videoCompleted) {
        setVideoCompleted(true);
        if (selectedModule?.title) {
          setCompletedModules(prev => new Set([...prev, selectedModule.title]));
          
          // Save lesson completion to backend
          saveLessonProgress(selectedModule.title);
        }
      }
    }
  };

  // Save lesson completion to backend
  const saveLessonProgress = async (moduleTitle) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !courseDetails?.name) return;

      console.log('💾 Saving lesson completion:', { courseName: courseDetails.name, moduleTitle });

      // Save to UserProgress collection
  const response = await fetch('/api/progress/submit-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userEmail: localStorage.getItem('userEmail') || 'user@example.com', // You might need to get this from context or props
          courseName: courseDetails.name,
          completedModules: [{ m_id: moduleTitle, completedAt: new Date().toISOString() }],
          lastAccessedModule: moduleTitle
        })
      });

      if (response.ok) {
        console.log('✅ Lesson completion saved successfully');
        // Refresh quiz completion status and unlock status to show green tick marks
        setTimeout(() => {
          fetchQuizCompletionStatus();
          fetchUnlockStatus();
        }, 1000);
      } else {
        console.log('⚠️ Failed to save lesson completion');
      }
    } catch (error) {
      console.error('❌ Error saving lesson completion:', error);
    }
  };

  const handleModuleSelect = (module, moduleIndex) => {
    if (!module) return;
    
    // Check if module is unlocked
    const isUnlocked = isLessonUnlocked(module.title, moduleIndex);
    if (!isUnlocked) {
      alert('This lesson is locked. Please complete the previous lesson and quiz first.');
      return;
    }
    
    setSelectedModule(module);
    
    navigate(`/course/${courseId}/module/${moduleIndex}`, {
      state: { courseDetails, selectedModule: module, taskDetails },
    });
  };



  const getModuleProgress = (module) => {
    if (!module) return 0;
    if (selectedModule?.title === module.title) {
      return progress;
    }
    return isModuleCompleted(module) ? 100 : 0;
  };

  return (
    <div className="task-module-page">
      <header className="module-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ChevronLeft className="back-icon" />
            Back to Task Details
          </button>
          <div className="module-title-section">
            <h1 className="module-title">
              Learn about {courseDetails?.name || 'Course'}
            </h1>
            <p className="module-description">
              {courseDetails?.description || 'Introduction to Course Content'}
            </p>
          </div>
        </div>
        <div className="header-right">
          <button className="refresh-btn" onClick={() => {
            console.log('🔄 Manual refresh triggered');
            console.log('🔧 Current course details:', courseDetails);
            console.log('🔧 Current unlock status:', unlockStatus);
            console.log('🔧 Current quiz completion status:', quizCompletionStatus);
            fetchQuizCompletionStatus();
            fetchUnlockStatus();
          }} disabled={fetchingQuizStatus || fetchingUnlockStatus}>
            {(fetchingQuizStatus || fetchingUnlockStatus) ? (
              <div className="loading-spinner-small"></div>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
            )}
            {(fetchingQuizStatus || fetchingUnlockStatus) ? 'Refreshing...' : 'Refresh Progress'}
          </button>
          <div className="time-info">1 hour</div>
        </div>
      </header>

      <main className="module-content">
        {/* Left Side - Video Content */}
        <div className="content-area">
          <section className="video-section">
            <div className="section-header">
              <h2 className="section-title">Video Content</h2>
              {videoCompleted && (
                <div className="completion-badge">
                  <Check className="completion-tick" />
                  <span>Completed</span>
                </div>
              )}
            </div>
            <div className="video-container">
              {videoUrl ? (
                <div className="video-wrapper">
                  <video 
                    controls 
                    className="video-player"
                    onTimeUpdate={handleVideoProgress}
                  >
                    <source src={videoUrl} type="video/mp4" />
                    {subtitleUrl && (
                      <track 
                        kind="captions" 
                        srcLang="en" 
                        label="English" 
                        src={subtitleUrl}
                      />
                    )}
                    Your browser does not support the video tag.
                  </video>
                  {subtitleUrl && (
                    <button 
                      className={`subtitle-toggle-btn ${showSubtitles ? 'active' : ''}`}
                      onClick={handleSubtitleToggle}
                      title={showSubtitles ? 'Hide Subtitles' : 'Show Subtitles'}
                    >
                      <Subtitles size={20} />
                      <span>{showSubtitles ? 'Subtitles ON' : 'Subtitles OFF'}</span>
                    </button>
                  )}
                  {videoCompleted && (
                    <div className="video-completed-overlay">
                      <div className="completion-checkmark">
                        <Check size={48} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="video-placeholder">
                  <Play className="play-icon-large" />
                  <p>No video available for this module</p>
                </div>
              )}
              <div className="video-info">
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="video-duration">
                    {Math.round(progress)}% completed
                    {videoCompleted && <Check className="inline-tick" />}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Side - Course Modules Sidebar */}
        <aside className="modules-sidebar">
          {/* Success Message */}
          {successMessage && (
            <div style={{ 
              padding: '10px', 
              margin: '10px 0', 
              backgroundColor: '#d4edda', 
              color: '#155724', 
              border: '1px solid #c3e6cb', 
              borderRadius: '4px', 
              fontSize: '14px' 
            }}>
              {successMessage}
            </div>
          )}
          
          {/* Courses Section */}
          {/* Courses Section */}
<div className="sidebar-section">
  <h2 className="sidebar-title">Courses</h2>
  <div className="modules-list">
    {courseDetails?.modules?.map((module, index) => {
      // Use m_id for backend course data, fallback to title for static course data
      const moduleIdentifier = module.m_id || module.title;
      const isUnlocked = isLessonUnlocked(moduleIdentifier, index);
      const isCompleted = isLessonCompleted(moduleIdentifier);
      const isCurrentModule = selectedModule?.title === module.title;

      return (
        <button
          key={module._id || index}
          className={`lesson-button ${isCurrentModule ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${!isUnlocked ? 'locked' : ''}`}
          disabled={!isUnlocked}
          onClick={() => handleModuleSelect(module, index)}
        >
          {!isUnlocked && <span className="lock-icon">🔒</span>}
          {isCompleted && <span className="check-icon">✓</span>}
          Lesson {String(index + 1).padStart(2, '0')}: {module.title || `Module ${index + 1}`}
          <span className="duration">{isCompleted ? '✓ Completed' : '30 mins'}</span>
        </button>
      );
    })}
  </div>
</div>

          {/* Practice Quiz Section */}
        <div className="sidebar-section">
  <h2 className="sidebar-title">Practice Quiz</h2>
  <div className="modules-list">
    {courseDetails?.modules?.map((module, index) => {
      // Use m_id for backend course data, fallback to title for static course data
      const moduleIdentifier = module.m_id || module.title;
      const isQuizUnlocked = isQuizAvailable(moduleIdentifier, index);
      const quizCompleted = isQuizCompleted(moduleIdentifier);
      const isCurrentModule = selectedModule?.title === module.title;
      
      console.log('🔍 Quiz status check:', { 
        moduleTitle: module.title, 
        moduleId: module.m_id, 
        moduleIdentifier, 
        index, 
        isQuizUnlocked, 
        quizCompleted,
        unlockStatus: unlockStatus.length
      });

      return (
        <button
          key={`quiz-${module._id || index}`}
          className={`quiz-button ${isCurrentModule ? 'active' : ''} ${quizCompleted ? 'completed' : ''} ${!isQuizUnlocked ? 'locked' : ''}`}
          disabled={!isQuizUnlocked && !quizCompleted}
          onClick={async () => {
            if (quizCompleted) {
              const userConfirmed = window.confirm(
                '✅ You have already completed this quiz!\n\nYou cannot retake a completed quiz.\n\nWould you like to view the lesson instead?'
              );
              if (userConfirmed) {
                // Navigate to the lesson page for this module
                const moduleIdentifier = module.m_id || module.title;
                navigate(`/course/${courseId}/lesson/${moduleIdentifier}`);
              }
              return;
            }

            if (!isQuizUnlocked) return;

            try {
              const token = localStorage.getItem('token');
              if (token) {
                const courseName = courseDetails?.name || courseDetails?.title;
                const response = await fetch('/api/courses/check-quiz-availability', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ courseName })
                });

                if (response.ok) {
                  const result = await response.json();
                  if (!result.canTake) {
                    const hours = result.cooldown.hours;
                    const minutes = result.cooldown.minutes;
                    alert(`⏰ You cannot take this quiz right now!\n\nYou need to wait ${hours}h ${minutes}m before retrying.`);
                    return;
                  }
                }
              }
            } catch (error) {
              console.error('❌ Error checking quiz availability:', error);
            }

        navigate('/assignedquizpage', {
  state: {
    courseDetails,
    selectedModule: module,
    taskDetails,
    courseId,
    moduleId: index
  }
});


          }}
        >
          {!isQuizUnlocked && <span className="lock-icon">🔒</span>}
          {quizCompleted && <span className="check-icon">✓</span>}
          Quiz {String(index + 1).padStart(2, '0')}: {module.title || `Module ${index + 1}`}
        </button>
      );
    })}
  </div>
</div>

          {/* Course Progress Summary */}
          {courseDetails && Object.keys(quizCompletionStatus).length > 0 && (
            <div className="sidebar-section">
              <h2 className="sidebar-title">Course Progress</h2>
              <div className="progress-summary">
                <div className="progress-stats">
                  <div className="progress-stat">
                    <span className="progress-label">Completed:</span>
                    <span className="progress-value completed">
                      {Object.values(quizCompletionStatus).filter(status => status.isCompleted).length}
                    </span>
                  </div>
                  <div className="progress-stat">
                    <span className="progress-label">Total:</span>
                    <span className="progress-value total">
                      {courseDetails.modules.length}
                    </span>
                  </div>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${(Object.values(quizCompletionStatus).filter(status => status.isCompleted).length / courseDetails.modules.length) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="progress-percentage">
                    {Math.round((Object.values(quizCompletionStatus).filter(status => status.isCompleted).length / courseDetails.modules.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Certificate Section - Show when course is completed */}
          {isCourseCompleted() && (
            <div className="sidebar-section certificate-section" style={{
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginTop: '20px',
              border: '2px solid #28a745'
            }}>
              <h3 style={{ 
                color: '#28a745', 
                marginBottom: '12px', 
                textAlign: 'center',
                fontSize: '18px'
              }}>
                🎓 Course Completed!
              </h3>
              <div className="completion-message" style={{
                fontSize: '14px',
                color: '#28a745',
                marginBottom: '16px',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                Congratulations! You have completed all modules in the {courseDetails?.name || courseDetails?.title} course.
              </div>
              <button
                onClick={handleViewCertificate}
                className="certificate-button"
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                🏆 View Certificate
              </button>
            </div>
          )}

          {/* Debug info section - only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ padding: '10px', borderTop: '1px solid #eee', marginTop: '10px', fontSize: '12px', color: '#999' }}>
              <details>
                <summary>Debug Info</summary>
                <div style={{ marginTop: '5px' }}>
                  <div><strong>Course Name:</strong> {courseDetails?.name || 'N/A'}</div>
                  <div><strong>Modules Count:</strong> {courseDetails?.modules?.length || 0}</div>
                  <div><strong>Selected Module:</strong> {selectedModule?.title || 'None'}</div>
                  <div><strong>Unlock Status Count:</strong> {unlockStatus?.length || 0}</div>
                </div>
                <div style={{ marginTop: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => {
                      console.log('🔍 Current unlock status:', unlockStatus);
                      console.log('🔍 Course details:', courseDetails);
                      console.log('🔍 Quiz completion status:', quizCompletionStatus);
                    }}
                    style={{ 
                      padding: '5px 10px', 
                      backgroundColor: '#007bff', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '3px', 
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    Log Debug Info
                  </button>
                  <button 
                    onClick={() => {
                      console.log('🔄 Force refreshing unlock status...');
                      fetchUnlockStatus();
                      fetchQuizCompletionStatus();
                    }}
                    style={{ 
                      padding: '5px 10px', 
                      backgroundColor: '#28a745', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '3px', 
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    Force Refresh
                  </button>
                </div>
                <pre style={{ fontSize: '10px', overflow: 'auto', maxHeight: '200px', background: '#f8f8f8', padding: '5px', borderRadius: '3px', marginTop: '5px' }}>
                  {JSON.stringify({
                    courseId,
                    moduleId,
                    courseName: courseDetails?.name,
                    modulesTitles: courseDetails?.modules?.map(m => m.title) || [],
                    unlockStatus: unlockStatus,
                    quizCompletionStatus: quizCompletionStatus,
                    modulesCount: courseDetails?.modules?.length || 0,
                    selectedModuleTitle: selectedModule?.title || 'None',
                    stateAvailable: !!state,
                    courseDetailsAvailable: !!courseDetails
                  }, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
};

export default TaskModulePage;
