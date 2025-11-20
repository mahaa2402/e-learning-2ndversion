import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import courseData from './coursedata';
import { API_ENDPOINTS } from '../config/api';
import './lessonpage.css';

function LessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  
  // useEffect(() => {
  //   if (courseId === "68885cf5d486bba2975cdca9") {
  //     console.log("🚀 Redirecting to VRU Quiz Page");
  //     navigate("/vru-quiz", { replace: true });
  //   }
  // }, [courseId, navigate]);
const [unlockStatus, setUnlockStatus] = useState([]); // default to empty array
  const [loading, setLoading] = useState(true);
  const [showCoursesDropdown, setShowCoursesDropdown] = useState(false);
  const [commonCourses, setCommonCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const videoRef = useRef(null);

  // State for database course/lesson data
  const [dbCourse, setDbCourse] = useState(null);
  const [dbLesson, setDbLesson] = useState(null);
  const [fetchingFromDb, setFetchingFromDb] = useState(false);

  // Try to get course from static data first (for backward compatibility)
  const staticCourse = courseData[courseId];
  
  // Determine which course data to use
  const course = dbCourse || staticCourse;
  const lessons = course?.lessons || {};
  const lessonKeys = Object.keys(lessons);
  const firstLessonId = lessonKeys[0];

  // Fetch course and lesson data from database if not in static data
  useEffect(() => {
    const fetchCourseFromDatabase = async () => {
      // If course exists in static data, don't fetch from database
      if (staticCourse) {
        console.log('✅ Course found in static data, using static data');
        return;
      }

      // Try to fetch from database
      try {
        setFetchingFromDb(true);
        console.log('🔍 Course not in static data, fetching from database:', courseId);
        
        // First, try to fetch the full course data
        const courseResponse = await fetch(`${API_ENDPOINTS.COURSES.GET_COURSE}/${courseId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (courseResponse.ok) {
          const courseData = await courseResponse.json();
          console.log('✅ Course data fetched from database:', courseData);
          console.log('📹 Lessons in course data:', courseData.lessons);
          console.log('📹 Modules in course data:', courseData.modules);
          // Log video URLs for each lesson
          if (courseData.lessons) {
            Object.keys(courseData.lessons).forEach(lessonKey => {
              console.log(`📹 Lesson ${lessonKey} videoUrl:`, courseData.lessons[lessonKey].videoUrl);
            });
          }
          setDbCourse(courseData);
        } else if (courseResponse.status === 404) {
          console.log('⚠️ Course not found in database either');
        } else {
          throw new Error(`Failed to fetch course: ${courseResponse.status}`);
        }
      } catch (error) {
        console.error('❌ Error fetching course from database:', error);
      } finally {
        setFetchingFromDb(false);
      }
    };

    fetchCourseFromDatabase();
  }, [courseId, staticCourse]);

  // Fetch specific lesson data from database if needed
  useEffect(() => {
    const fetchLessonFromDatabase = async () => {
      // If lesson exists in static course data, don't fetch from database
      if (staticCourse && staticCourse.lessons && staticCourse.lessons[lessonId]) {
        return;
      }

      // If we have database course but lesson not found, fetch specific lesson
      if (dbCourse && !dbCourse.lessons[lessonId]) {
        try {
          console.log('🔍 Fetching specific lesson from database:', { courseId, lessonId });
          const lessonResponse = await fetch(`${API_ENDPOINTS.COURSES.GET_LESSON}/${courseId}/${lessonId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (lessonResponse.ok) {
            const lessonData = await lessonResponse.json();
            console.log('✅ Lesson data fetched from database:', lessonData);
            setDbLesson(lessonData);
            
            // Update dbCourse with this lesson
            if (dbCourse) {
              setDbCourse({
                ...dbCourse,
                lessons: {
                  ...dbCourse.lessons,
                  [lessonId]: {
                    title: lessonData.title,
                    videoUrl: lessonData.videoUrl,
                    content: lessonData.content,
                    duration: lessonData.duration
                  }
                }
              });
            }
          }
        } catch (error) {
          console.error('❌ Error fetching lesson from database:', error);
        }
      }
    };

    if (dbCourse && lessonId) {
      fetchLessonFromDatabase();
    }
  }, [courseId, lessonId, dbCourse, staticCourse]);

  // Fetch common courses for dropdown
  useEffect(() => {
    const fetchCommonCourses = async () => {
      try {
        console.log('Fetching common courses from:', API_ENDPOINTS.COURSES.GET_COURSES);
        const response = await fetch(API_ENDPOINTS.COURSES.GET_COURSES, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }

        const data = await response.json();
        console.log('Common courses fetched:', data);
        setCommonCourses(data);
      } catch (error) {
        console.error('Error fetching common courses:', error);
        setCommonCourses([]);
      }
    };

    fetchCommonCourses();
  }, []);

  // Handle courses dropdown
  const handleCoursesDropdownToggle = () => {
    console.log('Dropdown toggle clicked. Current state:', showCoursesDropdown);
    console.log('Common courses available:', commonCourses);
    setShowCoursesDropdown(!showCoursesDropdown);
  };

  const handleCourseSelect = (courseTitle) => {
    navigate(`/coursedetailpage/${courseTitle}`);
    setShowCoursesDropdown(false);
  };

  // Handle search functionality
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    // Filter courses based on search query
    const filtered = commonCourses.filter(course => 
      course.title.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && searchResults.length > 0) {
      // Navigate to the first search result
      navigate(`/coursedetailpage/${searchResults[0].title}`);
      setSearchQuery('');
      setShowSearchResults(false);
    }
  };

  const handleSearchResultClick = (courseTitle) => {
    navigate(`/coursedetailpage/${courseTitle}`);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // Handle captions toggle
  const handleCaptionsToggle = () => {
    setShowCaptions(!showCaptions);
  };

  // Map lesson ID to module index (e.g., GDPR01 -> 0, GDPR02 -> 1)
  const getModuleIndexFromLessonId = (lessonId) => {
    if (!lessonId) return 0;
    // Extract number from lesson ID (e.g., "GDPR01" -> 1, then subtract 1 for 0-based index)
    const match = lessonId.match(/\d+/);
    if (match) {
      return parseInt(match[0]) - 1;
    }
    return 0;
  };


  // Extract audio and generate captions from video
  const generateAudioCaptions = async () => {
    try {
      // REAL IMPLEMENTATION WOULD INVOLVE:
      // 1. Extract audio from video using Web Audio API or FFmpeg
      // 2. Send audio to speech-to-text service (Google Speech-to-Text, Azure Speech, AWS Transcribe)
      // 3. Get transcribed text with precise timestamps
      // 4. Format as WebVTT
      
      // Example implementation with Google Speech-to-Text:
      // const audioBlob = await extractAudioFromVideo(lesson.videoUrl);
      // const transcription = await speechToText(audioBlob);
      // return formatAsWebVTT(transcription);
      
      // For now, we'll simulate what the actual audio transcription might look like
      // This represents the spoken words from the video's audio track
      
      const audioCaptions = [
        "WEBVTT",
        "",
        "00:00:00.000 --> 00:00:03.500",
        "Welcome to this Information Security training module.",
        "",
        "00:00:03.500 --> 00:00:07.200",
        "Today we will cover the fundamentals of data protection.",
        "",
        "00:00:07.200 --> 00:00:11.800",
        "Let's start with understanding what information security means.",
        "",
        "00:00:11.800 --> 00:00:16.500",
        "Information security is about protecting data from threats.",
        "",
        "00:00:16.500 --> 00:00:21.200",
        "We have three main principles: confidentiality, integrity, and availability.",
        "",
        "00:00:21.200 --> 00:00:25.800",
        "Confidentiality means only authorized people can access information.",
        "",
        "00:00:25.800 --> 00:00:30.500",
        "Integrity ensures that data remains accurate and unchanged.",
        "",
        "00:00:30.500 --> 00:00:35.200",
        "Availability means information is accessible when needed.",
        "",
        "00:00:35.200 --> 00:00:40.000",
        "These principles work together to protect our digital assets.",
        "",
        "00:00:40.000 --> 00:00:44.500",
        "Let me give you a real-world example.",
        "",
        "00:00:44.500 --> 00:00:49.200",
        "When you log into your email account, confidentiality protects your messages.",
        "",
        "00:00:49.200 --> 00:00:53.800",
        "Integrity ensures your emails haven't been tampered with.",
        "",
        "00:00:53.800 --> 00:00:58.500",
        "And availability means you can access your email anytime.",
        "",
        "00:00:58.500 --> 00:01:03.200",
        "Understanding these concepts is crucial for cybersecurity.",
        "",
        "00:01:03.200 --> 00:01:08.000",
        "In our next lesson, we'll explore common security threats."
      ];
      
      return audioCaptions.join('\n');
    } catch (error) {
      console.error('Error generating audio captions:', error);
      return "WEBVTT\n\n00:00:00.000 --> 00:01:00.000\nAudio captions not available";
    }
  };

  // Close dropdown and search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCoursesDropdown && !event.target.closest('.dropdown')) {
        setShowCoursesDropdown(false);
      }
      if (showSearchResults && !event.target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCoursesDropdown, showSearchResults]);

  // Handle captions toggle effect
  useEffect(() => {
    const video = document.querySelector('video');
    if (video && video.textTracks.length > 0) {
      const track = video.textTracks[0];
      track.mode = showCaptions ? 'showing' : 'hidden';
    }
  }, [showCaptions]);
  
  // Map numeric lessonId to actual lesson key
  const getLessonKeyFromId = (id) => {
    if (lessons[id]) return id;
    const numericId = parseInt(id);
    if (!isNaN(numericId) && numericId > 0 && numericId <= lessonKeys.length) {
      return lessonKeys[numericId - 1];
    }
    return firstLessonId;
  };
  
  const actualLessonId = getLessonKeyFromId(lessonId);
  console.log('🔍 Lesson lookup:', { lessonId, actualLessonId, hasDbLesson: !!dbLesson, hasLessonsKey: !!lessons[actualLessonId] });
  
  // Use database lesson if available, otherwise use static lesson
  let lesson = dbLesson ? {
    title: dbLesson.title,
    videoUrl: dbLesson.videoUrl,
    content: dbLesson.content,
    duration: dbLesson.duration,
    notes: dbLesson.notes
  } : lessons[actualLessonId];

  // For database courses, also check if lesson exists in dbCourse.lessons
  if (dbCourse && !lesson && dbCourse.lessons && dbCourse.lessons[lessonId]) {
    console.log('📋 Using lesson from dbCourse.lessons:', lessonId);
    lesson = dbCourse.lessons[lessonId];
  }

  // If lesson still doesn't have videoUrl, try to get it from dbCourse.lessons directly
  if (lesson && !lesson.videoUrl && dbCourse && dbCourse.lessons && dbCourse.lessons[lessonId]) {
    console.log('📋 Getting videoUrl from dbCourse.lessons:', dbCourse.lessons[lessonId].videoUrl);
    lesson.videoUrl = dbCourse.lessons[lessonId].videoUrl;
  }

  console.log('📹 Final lesson data:', { 
    title: lesson?.title, 
    hasVideoUrl: !!lesson?.videoUrl, 
    videoUrl: lesson?.videoUrl 
  });

  // NOTE: The PRIMARY flow is: Upload → S3 → Save URL to DB → Fetch from DB → Display
  // If videoUrl is missing from the database, it means the video hasn't been uploaded yet.
  // No fallback needed - the video should be uploaded and saved to the database.
  if (!lesson?.videoUrl && dbCourse) {
    const courseName = course.name || course.title || '';
    console.warn(`⚠️ Video URL missing from database for course: "${courseName}", module: "${lessonId}"`);
    console.warn(`⚠️ Please upload the video for this module in the admin panel.`);
  }

  // Debounce mechanism to prevent excessive API calls
  const [fetchTimeout, setFetchTimeout] = useState(null);

  // Fetch user progress and unlock status
  const fetchUserProgress = async (force = false, retryCount = 0) => {
    // If not forced and there's already a pending fetch, skip this one
    if (!force && fetchTimeout) {
      console.log('⏳ Fetch already in progress, skipping...');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const userEmail = localStorage.getItem('employeeEmail');

      if (!token || !userEmail) {
        console.log('No token or email found, using default unlock status');
        setUnlockStatus([]);
        setLoading(false);
        return;
      }

      // For database courses, prioritize dbCourse title/name to match quiz.js
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(courseId);
      let courseName;
      if (isObjectId) {
        courseName = dbCourse?.title || dbCourse?.name || course?.name || course?.title || courseId;
        console.log('📋 Database course detected, using courseName:', courseName, 'from dbCourse:', { title: dbCourse?.title, name: dbCourse?.name });
      } else {
        courseName = course?.name || course?.title || dbCourse?.title || dbCourse?.name || courseId;
      }
      
      console.log('📊 Fetching progress with courseName:', courseName, 'courseId:', courseId);
      const response = await fetch(
        `${API_ENDPOINTS.PROGRESS.GET_PROGRESS}?userEmail=${userEmail}&courseName=${encodeURIComponent(courseName)}&courseId=${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Progress data received:', data);

        if (Array.isArray(data.lessonUnlockStatus)) {
          setUnlockStatus(data.lessonUnlockStatus);
          console.log('✅ Unlock status set:', data.lessonUnlockStatus);
          
          // If forced refresh and retry count is less than 1, check if we need to retry once
          // This helps ensure progress is fully updated for newly created courses
          if (force && retryCount < 1) {
            // Check if the progress seems incomplete (e.g., no unlock status)
            const hasUnlockStatus = data.lessonUnlockStatus?.length > 0;
            
            // Only retry once if we don't have unlock status
            if (!hasUnlockStatus) {
              const delay = 1500;
              console.log(`🔄 Progress might be incomplete, retrying in ${delay}ms...`);
              setTimeout(() => {
                fetchUserProgress(true, retryCount + 1);
              }, delay);
            }
          }
        } else {
          console.warn("Unexpected lessonUnlockStatus format:", data.lessonUnlockStatus);
          setUnlockStatus([]);
        }
      } else {
        console.log('Failed to fetch progress, using default unlock status');
        setUnlockStatus([]);
      }
    } catch (error) {
      console.error('Error fetching user progress:', error);
      setUnlockStatus([]);
    } finally {
      setLoading(false);
      // Clear the timeout after fetch completes
      if (fetchTimeout) {
        clearTimeout(fetchTimeout);
        setFetchTimeout(null);
      }
    }
  };

  // Log unlockStatus only when it actually changes
  useEffect(() => {
    console.log("🔓 Unlock status updated:", unlockStatus);
  }, [unlockStatus]);

  // Redirect to correct lesson if numeric ID is used
  useEffect(() => {
    if (course && lessonId !== actualLessonId) {
      console.log(`Redirecting from lesson ${lessonId} to ${actualLessonId}`);
      navigate(`/course/${courseId}/lesson/${actualLessonId}`, { replace: true });
    }
  }, [courseId, lessonId, actualLessonId, navigate]);

  // Fetch progress when dbCourse is loaded (especially important for newly created courses)
  useEffect(() => {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(courseId);
    if (isObjectId && dbCourse && !unlockStatus.length) {
      // If this is a database course and dbCourse just loaded, fetch progress
      console.log('🔄 dbCourse loaded, fetching progress for newly created course...');
      setTimeout(() => {
        fetchUserProgress(true);
      }, 300);
    }
  }, [dbCourse, courseId]);

  // Fetch user progress on mount and when navigating from quiz or when lesson changes
  useEffect(() => {
    if (course || dbCourse) {
      // If navigating from quiz page with refreshProgress flag, force refresh with retry
      const shouldForceRefresh = location.state?.refreshProgress;
      const fromQuiz = location.state?.fromQuiz;
      
      // Add a delay if coming from quiz to ensure progress is saved, with minimal retry
      if (shouldForceRefresh || fromQuiz) {
        console.log('🔄 Coming from quiz page, will refresh progress...');
        
        // Single fetch after a delay to ensure backend has processed
        setTimeout(() => {
          console.log('🔄 Fetching progress after quiz completion...');
          fetchUserProgress(true);
        }, 1000);
        
        // One retry only if needed (handled by fetchUserProgress internal retry logic)
        const retryTimeout = setTimeout(() => {
          console.log('🔄 Retry: Fetching progress after quiz completion...');
          fetchUserProgress(true);
        }, 3000);
        
        // Clear the state after using it
        navigate(location.pathname, { replace: true, state: {} });
        
        return () => {
          clearTimeout(retryTimeout);
        };
      } else {
        // Always refresh progress when lesson changes to ensure unlock status is up to date
        console.log('🔄 Lesson changed, refreshing progress...', { lessonId, courseId });
        // Single fetch only
        fetchUserProgress(true);
      }
    }
  }, [courseId, course, dbCourse, lessonId]);


  // Only refresh on lesson change for ISP course (removed excessive triggers)
  useEffect(() => {
    if (course?.name === 'ISP' && lessonId) {
      console.log('🔄 Lesson changed for ISP course, refreshing unlock status...');
      // Add a small delay to ensure the lesson change is processed
      setTimeout(() => {
        fetchUserProgress();
      }, 100);
    }
  }, [lessonId, course?.name]);

  // Refresh unlock status when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && course) {
        console.log("🔄 Page became visible, refreshing unlock status...");
        fetchUserProgress();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [course]);

// Listen for quiz completion events to refresh unlock status
useEffect(() => {
  let refreshTimeout;

  const handleQuizCompleted = (event) => {
    const { moduleId, courseId: eventCourseId, courseName } = event.detail;
    console.log('🎉 Quiz completed event received:', { moduleId, courseId: eventCourseId, courseName });

    // Check if this completion is for the current course
    const currentCourseName = course?.name;
    if (eventCourseId === courseId || courseName === currentCourseName) {
      console.log('🔄 Refreshing unlock status for current course...');

      // Clear any existing timeout to prevent multiple refreshes
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      // Add a small delay to ensure backend has processed the completion
      refreshTimeout = setTimeout(() => {
        fetchUserProgress();
      }, 500);
    }
  };

  window.addEventListener('quizCompleted', handleQuizCompleted);

  return () => {
    window.removeEventListener('quizCompleted', handleQuizCompleted);
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
  };
}, [courseId, course?.name]);

 
useEffect(() => {
  let refreshTimeout;

  const handleQuizCompleted = (event) => {
    const { moduleId, courseId: eventCourseId, courseName } = event.detail;
    console.log('🎉 Quiz completed event received:', { moduleId, courseId: eventCourseId, courseName });

    // Use the same course name resolution logic as quiz.js
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(courseId);
    let currentCourseName;
    if (isObjectId) {
      // For database courses, prioritize dbCourse title/name to match quiz.js
      currentCourseName = dbCourse?.title || dbCourse?.name || course?.title || course?.name;
    } else {
      currentCourseName = course?.name || course?.title || dbCourse?.title || dbCourse?.name;
    }
    const currentCourseId = courseId;
    
    // Check if this event is for the current course (by name or ID)
    const eventNameNormalized = courseName?.trim().toLowerCase();
    const currentNameNormalized = currentCourseName?.trim().toLowerCase();
    const isCurrentCourse = eventCourseId === currentCourseId || 
        (courseName && currentCourseName && eventNameNormalized === currentNameNormalized);
    
    if (isCurrentCourse) {
      console.log('🔄 Refreshing unlock status for current course after quiz completion...');
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      // Use force refresh once to ensure progress is fully updated
      refreshTimeout = setTimeout(() => {
        fetchUserProgress(true);
      }, 500);
    }
  };

  const handleProgressUpdated = (event) => {
    const { courseName: eventCourseName, courseId: eventCourseId, lessonUnlockStatus, progress } = event.detail || {};
    console.log('🔄 Progress updated event received:', { eventCourseName, eventCourseId, lessonUnlockStatus, progress });

    // Use the same course name resolution logic as quiz.js
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(courseId);
    let currentCourseName;
    if (isObjectId) {
      // For database courses, prioritize dbCourse title/name to match quiz.js
      currentCourseName = dbCourse?.title || dbCourse?.name || course?.title || course?.name;
      console.log('📋 Database course detected, using courseName:', currentCourseName, 'from dbCourse:', { title: dbCourse?.title, name: dbCourse?.name });
    } else {
      currentCourseName = course?.name || course?.title || dbCourse?.title || dbCourse?.name;
    }
    const currentCourseId = courseId;
    
    // Check if this event is for the current course (by name or ID)
    // Use trim() and case-insensitive comparison to handle whitespace issues
    const eventNameNormalized = eventCourseName?.trim().toLowerCase();
    const currentNameNormalized = currentCourseName?.trim().toLowerCase();
    const isCurrentCourse = (eventCourseName && currentCourseName && 
        eventNameNormalized === currentNameNormalized) ||
        (eventCourseId && currentCourseId && eventCourseId === currentCourseId);
    
    console.log('🔍 Course name comparison:', {
      eventCourseName,
      currentCourseName,
      eventNameNormalized,
      currentNameNormalized,
      isCurrentCourse,
      eventCourseId,
      currentCourseId
    });
    
    if (isCurrentCourse) {
      console.log('✅ Updating unlock status from progress update event...');
      if (Array.isArray(lessonUnlockStatus) && lessonUnlockStatus.length > 0) {
        setUnlockStatus(lessonUnlockStatus);
        console.log('✅ Unlock status updated from event:', lessonUnlockStatus);
        setLoading(false); // Ensure loading is cleared
      } else {
        // If lessonUnlockStatus is not provided or empty, fetch it once
        console.log('🔄 lessonUnlockStatus not provided or empty, fetching progress...');
        // Single fetch with delay to allow backend to process
        setTimeout(() => {
          fetchUserProgress(true);
        }, 500);
      }
    } else {
      console.log('⚠️ Course name/ID mismatch or missing:', { eventCourseName, currentCourseName, eventCourseId, currentCourseId });
      // Even if names don't match, if courseId matches, still try to fetch progress
      if (eventCourseId && currentCourseId && eventCourseId === currentCourseId) {
        console.log('🔄 Course IDs match, fetching progress anyway...');
        setTimeout(() => {
          fetchUserProgress(true);
        }, 500);
      }
    }
  };

  window.addEventListener('quizCompleted', handleQuizCompleted);
  window.addEventListener('progressUpdated', handleProgressUpdated);

  return () => {
    window.removeEventListener('quizCompleted', handleQuizCompleted);
    window.removeEventListener('progressUpdated', handleProgressUpdated);
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
  };
}, [courseId, course?.name, fetchUserProgress]);

  // Map lesson keys to backend IDs
  // For newly created common courses, lessonKey is already the m_id, so return as-is
  // For static courses, use the mapping
  const getModuleIdFromLessonKey = (lessonKey) => {
    // For database courses (newly created common courses), lessonKey is already m_id
    if (dbCourse) {
      console.log('📋 Database course detected, using lessonKey as m_id:', lessonKey);
      return lessonKey;
    }
    
    // For static courses, use the hardcoded mapping
    const moduleMapping = {
      'ISP01': 'ISP01', 'ISP02': 'ISP02', 'ISP03': 'ISP03', 'ISP04': 'ISP04',
      'POSH01': 'POSH01', 'POSH02': 'POSH02', 'POSH03': 'POSH03', 'POSH04': 'POSH04',
      'GDPR01': 'GDPR01', 'GDPR02': 'GDPR02', 'GDPR03': 'GDPR03', 'GDPR04': 'GDPR04',
      'FACT01': 'FACTORY01', 'FACT02': 'FACTORY02', 'FACT03': 'FACTORY03', 'FACT04': 'FACTORY04',
      'FACTORY01': 'FACTORY01', 'FACTORY02': 'FACTORY02', 'FACTORY03': 'FACTORY03', 'FACTORY04': 'FACTORY04',
      'WELD01': 'WELDING01', 'WELD02': 'WELDING02', 'WELD03': 'WELDING03', 'WELD04': 'WELDING04',
      'WELDING01': 'WELDING01', 'WELDING02': 'WELDING02', 'WELDING03': 'WELDING03', 'WELDING04': 'WELDING04',
      'CNC01': 'CNC01', 'CNC02': 'CNC02', 'CNC03': 'CNC03', 'CNC04': 'CNC04'
    };
    if (moduleMapping[lessonKey]) return moduleMapping[lessonKey];
    const upperKey = lessonKey.toUpperCase();
    return moduleMapping[upperKey] || lessonKey;
  };

  const isLessonUnlocked = (lessonKey) => {
    if (!Array.isArray(unlockStatus) || unlockStatus.length === 0) {
      return lessonKeys.indexOf(lessonKey) === 0; // default: first lesson unlocked
    }
    const moduleId = getModuleIdFromLessonKey(lessonKey);
    const lessonStatus = unlockStatus.find(status => status.lessonId === moduleId);
    return lessonStatus ? lessonStatus.isUnlocked : false;
  };

  const isQuizAvailable = (lessonKey) => {
    console.log("from isQuizAvailable function",lessonKey)
    if (!Array.isArray(unlockStatus) || unlockStatus.length === 0) {
      return lessonKeys.indexOf(lessonKey) === 0; // default: first quiz available
    }
    const moduleId = getModuleIdFromLessonKey(lessonKey);
    console.log('module id is ', moduleId)


    const lessonStatus = unlockStatus.find(status => status.lessonId === moduleId);
    console.log("lesson status is ", lessonStatus)
    return lessonStatus ? lessonStatus.canTakeQuiz : false;
  };

  const isLessonCompleted = (lessonKey) => {
    if (!Array.isArray(unlockStatus)) return false;
    const moduleId = getModuleIdFromLessonKey(lessonKey);
    const lessonStatus = unlockStatus.find(status => status.lessonId === moduleId);
    return lessonStatus ? lessonStatus.isCompleted : false;
  };

  const isQuizCompleted = (lessonKey) => isLessonCompleted(lessonKey);

  // Check if all modules in the course are completed
  const isCourseCompleted = () => {
    if (!Array.isArray(unlockStatus) || unlockStatus.length === 0) {
      return false;
    }
    
    // Check if all lessons are completed
    return lessonKeys.every(lessonKey => {
      const moduleId = getModuleIdFromLessonKey(lessonKey);
      const lessonStatus = unlockStatus.find(status => status.lessonId === moduleId);
      return lessonStatus ? lessonStatus.isCompleted : false;
    });
  };

  // Auto-generate certificate when course is completed
  useEffect(() => {
    const autoGenerateCertificate = async () => {
      if (isCourseCompleted() && course?.name) {
        console.log('🎓 Course completed! Auto-generating certificate...');
        
        try {
          const token = localStorage.getItem('authToken') || localStorage.getItem('token');
          if (!token) return;
          
          let userEmail = '';
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userEmail = payload.email;
          } catch (e) {
            console.error('Error parsing token:', e);
            return;
          }
          
          const generateResponse = await fetch(API_ENDPOINTS.CERTIFICATES.CHECK_COURSE_COMPLETION, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              courseName: course.name,
              userEmail: userEmail
            })
          });
          
          const generateData = await generateResponse.json();
          console.log('🎓 Auto-certificate generation response:', generateData);
          
          if (generateResponse.ok && generateData.success && generateData.isCompleted && generateData.certificate) {
            console.log('✅ Certificate auto-generated successfully:', generateData.certificate);
            // Store the generated certificate for later use
            localStorage.setItem('lastGeneratedCertificate', JSON.stringify(generateData.certificate));
          }
        } catch (error) {
          console.error('❌ Error auto-generating certificate:', error);
        }
      }
    };
    
    // Only run if we have unlock status and course data
    if (unlockStatus.length > 0 && course?.name) {
      autoGenerateCertificate();
    }
  }, [unlockStatus, course?.name]);

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

      console.log('🎓 Attempting to generate certificate for completed course:', course?.name);
      
      // Try to generate certificate from backend first
      try {
        const generateResponse = await fetch(API_ENDPOINTS.CERTIFICATES.CHECK_COURSE_COMPLETION, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            courseName: course?.name,
            userEmail: userEmail
          })
        });
        
        const generateData = await generateResponse.json();
        console.log('🎓 Certificate generation response:', generateData);
        
        if (generateResponse.ok && generateData.success && generateData.isCompleted && generateData.certificate) {
          // Certificate was generated successfully
          localStorage.setItem('lastGeneratedCertificate', JSON.stringify(generateData.certificate));
          localStorage.setItem('courseCompleted', 'true');
          localStorage.setItem('completedCourseName', course?.name);
          
          console.log('✅ Certificate generated successfully:', generateData.certificate);
        } else {
          console.log('⚠️ Certificate generation failed:', generateData.message);
          // Still proceed with course completion data
          localStorage.setItem('courseCompleted', 'true');
          localStorage.setItem('completedCourseName', course?.name);
        }
      } catch (generateError) {
        console.error('❌ Error generating certificate:', generateError);
        // Still proceed with course completion data
        localStorage.setItem('courseCompleted', 'true');
        localStorage.setItem('completedCourseName', course?.name);
      }
      
      // Store courseId and lessonId for back navigation
      localStorage.setItem('certificateCourseId', courseId);
      localStorage.setItem('certificateLessonId', lessonId);
      
      // Navigate to certificate page
      navigate('/certificate');
    } catch (error) {
      console.error('❌ Error in handleViewCertificate:', error);
      // Fallback: just navigate to certificate page
      localStorage.setItem('courseCompleted', 'true');
      localStorage.setItem('completedCourseName', course?.name);
      navigate('/certificate');
    }
  };

  // Only show "course not found" after loading is complete
  if (!course && !loading && !fetchingFromDb) {
    return (
      <div className="lesson-wrapper">
        <div className="error-container">
          <h2>Course not found</h2>
          <p>The course you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/userdashboard')}>Go to Dashboard</button>
        </div>
      </div>
    );
  }

  // Show loading state while fetching
  if ((loading || fetchingFromDb) && !course) {
    return (
      <div className="lesson-wrapper">
        <div className="loading-container">
          <p>Loading course...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="lesson-wrapper">
        <div className="error-container">
          <h2>Lesson not found</h2>
          <p>The lesson you're looking for doesn't exist in this course.</p>
          <p>Available lessons: {lessonKeys.join(', ')}</p>
          <button onClick={() => navigate(`/course/${courseId}/lesson/${firstLessonId}`)}>
            Go to First Lesson
          </button>
        </div>
      </div>
    );
  }

  if (loading || fetchingFromDb) {
    return (
      <div className="lesson-wrapper">
        <div className="loading-container">
          <h2>Loading lesson...</h2>
          {fetchingFromDb && <p>Fetching course data from database...</p>}
        </div>
      </div>
    );
  }
const renderFormattedContent = (contentArray) => {
  return contentArray.map((line, i) => {
    // Skip empty lines
    if (!line || line.trim() === '') {
      return <br key={i} />;
    }

    // Check if line is a heading (ends with ? or is a section title)
    const isHeading = line.endsWith('?') || 
                     line.endsWith(':') || 
                     line === 'Introduction:' ||
                     line === 'Basic Responsibilities:' ||
                     line === 'Overview of ISP — confidentiality, integrity, and availability of information.' ||
                     line.startsWith('What is') ||
                     line.includes('Responsibilities') ||
                     line.includes('Overview');

    // Check if line is a list item (starts with bullet point or dash)
    const isListItem = line.startsWith('•') || 
                      line.startsWith('-') || 
                      line.startsWith('Keep your') ||
                      line.startsWith('Handle all') ||
                      line.startsWith('Always follow');

    if (isHeading) {
      return (
        <h4 key={i} style={{ 
          fontWeight: 'bold', 
          marginTop: '20px', 
          marginBottom: '10px',
          color: '#2c3e50',
          fontSize: '1.1em'
        }}>
          {line}
        </h4>
      );
    } else if (isListItem) {
      return (
        <p key={i} style={{ 
          marginLeft: '20px', 
          marginBottom: '8px',
          color: '#34495e',
          lineHeight: '1.5'
        }}>
          • {line.replace(/^(•|-)\s*/, '')}
        </p>
      );
    } else {
      return (
        <p key={i} style={{ 
          marginBottom: '12px',
          color: '#34495e',
          lineHeight: '1.6',
          textAlign: 'justify'
        }}>
          {line}
        </p>
      );
    }
  });
};
  return (
    <div className="lesson-wrapper">
      {/* Navbar Component */}
      <Navbar showSearch={true} />

      {/* Top Bar */}
      <div className="top-bar">
        <div>
          <h3>Learn about <span>{course.name}</span></h3>
          <p className="subtitle">{lesson.title}</p>
        </div>
        <div className="top-bar-actions">
         
         
         
        </div>
      </div>

      <div className="lesson-container">
        {/* Video & Notes */}
        <div className="lesson-content">
          <div className="video-container">
            <video 
              width="100%" 
              height="auto" 
              controls
              ref={(video) => {
                videoRef.current = video;
                if (video && video.textTracks.length > 0) {
                  const track = video.textTracks[0];
                  track.mode = showCaptions ? 'showing' : 'hidden';
                }
              }}
            >
            {lesson?.videoUrl ? (
              <source src={lesson.videoUrl} type="video/mp4" />
            ) : (
              <p style={{ padding: '20px', color: 'red' }}>
                ⚠️ Video URL not found. Please check that the video was uploaded correctly.
              </p>
            )}
          </video>
          </div>

          {/* Notes Section - Display below video */}
          {(dbLesson?.notes || lesson?.notes || (dbCourse?.modules?.find(m => m.m_id === lessonId)?.lessonDetails?.notes)) && (
            <div className="lesson-notes" style={{ 
              padding: '20px',
              backgroundColor: '#fff',
              borderRadius: '8px',
              marginTop: '20px',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              maxHeight: 'none',
              overflow: 'visible',
              height: 'auto'
            }}>
              <h3 style={{ 
                marginTop: 0,
                marginBottom: '15px',
                color: '#2c3e50',
                fontSize: '1.3em',
                fontWeight: 'bold',
                borderBottom: '2px solid #3498db',
                paddingBottom: '10px'
              }}>
                📝 Video Notes
              </h3>
              <div style={{
                color: '#34495e',
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                maxHeight: 'none',
                overflow: 'visible',
                height: 'auto',
                display: 'block'
              }}>
                {dbLesson?.notes || lesson?.notes || (dbCourse?.modules?.find(m => m.m_id === lessonId)?.lessonDetails?.notes)}
              </div>
            </div>
          )}
        
          <div className="lesson-paragraphs" style={{ 
  padding: '20px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  marginTop: '20px'
}}>
  {renderFormattedContent(lesson.content)}
</div>
        </div>

        {/* Sidebar */}
        <div className="lesson-sidebar">
          <div className="sidebar-section">
            <h4>Courses</h4>
            {lessonKeys.map((id, index) => {
              const unlocked = isLessonUnlocked(id);
              const completed = isLessonCompleted(id);
              const isCurrentLesson = id === actualLessonId;
              
              // Get module name: for database courses, use module name; for static courses, use lesson title
              let moduleName = lessons[id]?.title || '';
              if (dbCourse && dbCourse.modules) {
                const module = dbCourse.modules.find(m => m.m_id === id);
                if (module) {
                  moduleName = module.name;
                }
              }
              
              const lessonNumber = index + 1;
              
              return (
                <button
                  key={id}
                  className={`lesson-button ${isCurrentLesson ? 'active' : ''} ${completed ? 'completed' : ''} ${!unlocked ? 'locked' : ''}`}
                  disabled={!unlocked}
                  onClick={() => unlocked && navigate(`/course/${courseId}/lesson/${id}`)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    {!unlocked && <span className="lock-icon">🔒</span>}
                    {completed && <span className="check-icon">✓</span>}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Lesson {lessonNumber}: {moduleName}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="sidebar-section">
            <h4>Practice Quiz</h4>
            {lessonKeys.map((id, index) => {
              const quizAvailable = isQuizAvailable(id);
              console.log("is quiz available", quizAvailable);
              const quizCompleted = isQuizCompleted(id);
              const isCurrentLesson = id === actualLessonId;
              
              // Get module name: for database courses, use module name; for static courses, use lesson title
              let moduleName = lessons[id]?.title || '';
              if (dbCourse && dbCourse.modules) {
                const module = dbCourse.modules.find(m => m.m_id === id);
                if (module) {
                  moduleName = module.name;
                }
              }
              
              const quizNumber = index + 1;
              
              return (
                <button
                  key={id}
                  className={`quiz-button ${isCurrentLesson ? 'active' : ''} ${quizCompleted ? 'completed' : ''} ${!quizAvailable ? 'locked' : ''}`}
                  disabled={!quizAvailable}
                  onClick={async () => {
                    // If quiz is already completed, show message with View Lesson button
                    if (quizCompleted) {
                      const userConfirmed = window.confirm(
                        '✅ You have already completed this quiz!\n\nYou cannot retake a completed quiz.\n\nWould you like to view the lesson instead?'
                      );
                      if (userConfirmed) {
                        navigate(`/course/${courseId}/lesson/${id}`);
                      }
                      return;
                    }
                    
                    if (!quizAvailable) return;
                    
                    // Check quiz availability before navigating
                    try {
                      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                      if (token) {
                        const courseName = course.name;
                        console.log('🔍 Checking quiz availability before navigation for course:', courseName);
                        
                        const response = await fetch(API_ENDPOINTS.QUIZ.CHECK_AVAILABILITY, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({ courseName })
                        });
                        
                        if (response.ok) {
                          const result = await response.json();
                          console.log('📊 Quiz availability check result:', result);
                          
                          if (!result.canTake) {
                            // Quiz is blocked, show popup
                            const hours = result.cooldown.hours;
                            const minutes = result.cooldown.minutes;
                            const cooldownHours = result.cooldownHours || 24;
                            const hoursText = cooldownHours === 1 ? 'hour' : 'hours';
                            alert(`⏰ You cannot take this quiz right now!\n\nYou already failed the retake quiz and need to wait ${hours}h ${minutes}m before retrying.\n\nThis ${cooldownHours}-${hoursText} cooldown ensures proper learning and prevents rapid retakes.`);
                            return;
                          }
                        }
                      }
                    } catch (error) {
                      console.error('❌ Error checking quiz availability:', error);
                      // Continue with navigation even if check fails
                    }
                    
                    // Navigate to quiz
                    navigate(`/quiz/${courseId}/${id}`);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    {!quizAvailable && <span className="lock-icon">🔒</span>}
                    {quizCompleted && <span className="check-icon">✓</span>}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Quiz {quizNumber}: {moduleName}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Certificate Section - Show when course is completed */}
          {isCourseCompleted() && (
            <div className="sidebar-section certificate-section">
              <h4>🎓 Course Completed!</h4>
              <div className="completion-message" style={{
                fontSize: '14px',
                color: '#28a745',
                marginBottom: '12px',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                Congratulations! You have completed all modules in the {course?.name} course.
              </div>
              <button
                onClick={handleViewCertificate}
                className="certificate-button"
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginTop: '6px',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                🏆 View Certificate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LessonPage;