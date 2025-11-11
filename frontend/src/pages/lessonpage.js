import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import courseData from './coursedata';
import { API_ENDPOINTS } from '../config/api';
import './lessonpage.css';

function LessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  
  
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
  const [subtitleUrl, setSubtitleUrl] = useState(null);
  const [subtitleText, setSubtitleText] = useState('');
  const [subtitleCues, setSubtitleCues] = useState([]);
  const videoRef = useRef(null);

  const course = courseData[courseId];
  const lessons = course?.lessons || {};
  const lessonKeys = Object.keys(lessons);
  const firstLessonId = lessonKeys[0];

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

  // Fetch subtitle from backend
  const fetchSubtitle = async () => {
    if (!course?.name || !lessonId) return;
    
    try {
      const moduleIndex = getModuleIndexFromLessonId(lessonId);
      const res = await axios.get("/api/video/subtitle", {
        params: {
          courseName: course.name,
          moduleIndex: moduleIndex,
        },
      });

      if (res.data && res.data.success && res.data.url) {
        setSubtitleUrl(res.data.url);
        // Fetch and parse the VTT file
        await parseSubtitleFile(res.data.url);
        console.log("✅ Subtitle loaded successfully");
      } else {
        setSubtitleUrl(null);
        setSubtitleCues([]);
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.log("ℹ️ No subtitle file found for this lesson (this is normal)");
      } else {
        console.log("⚠️ Could not fetch subtitle:", err.message);
      }
      setSubtitleUrl(null);
      setSubtitleCues([]);
    }
  };

  // Parse VTT subtitle file
  const parseSubtitleFile = async (url) => {
    try {
      const response = await fetch(url);
      const vttText = await response.text();
      
      // Parse VTT format
      const cues = [];
      const lines = vttText.split('\n');
      let currentCue = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip WEBVTT header and empty lines
        if (line === 'WEBVTT' || line === '' || line.startsWith('NOTE')) {
          continue;
        }
        
        // Check if line is a timestamp (format: 00:00:00.000 --> 00:00:03.500)
        const timestampRegex = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;
        const match = line.match(timestampRegex);
        
        if (match) {
          // Parse start and end times
          const startTime = parseTimeToSeconds(match[1], match[2], match[3], match[4]);
          const endTime = parseTimeToSeconds(match[5], match[6], match[7], match[8]);
          
          currentCue = {
            start: startTime,
            end: endTime,
            text: ''
          };
        } else if (currentCue && line) {
          // This is subtitle text
          currentCue.text += (currentCue.text ? ' ' : '') + line;
        } else if (currentCue && line === '' && currentCue.text) {
          // Empty line after text means cue is complete
          cues.push(currentCue);
          currentCue = null;
        }
      }
      
      // Add last cue if exists
      if (currentCue && currentCue.text) {
        cues.push(currentCue);
      }
      
      setSubtitleCues(cues);
      console.log(`✅ Parsed ${cues.length} subtitle cues`);
    } catch (error) {
      console.error('Error parsing subtitle file:', error);
      setSubtitleCues([]);
    }
  };

  // Convert time string to seconds
  const parseTimeToSeconds = (hours, minutes, seconds, milliseconds) => {
    return parseInt(hours) * 3600 + 
           parseInt(minutes) * 60 + 
           parseInt(seconds) + 
           parseInt(milliseconds) / 1000;
  };

  // Get current subtitle text based on video time
  const getCurrentSubtitle = (currentTime) => {
    if (!subtitleCues || subtitleCues.length === 0) return '';
    
    const activeCue = subtitleCues.find(cue => 
      currentTime >= cue.start && currentTime < cue.end
    );
    
    return activeCue ? activeCue.text : '';
  };

  // Handle video time update to sync subtitles
  const handleVideoTimeUpdate = (e) => {
    const video = e.target || videoRef.current;
    if (video) {
      const currentTime = video.currentTime;
      const currentSubtitle = getCurrentSubtitle(currentTime);
      setSubtitleText(currentSubtitle);
    }
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
  const lesson = lessons[actualLessonId];

  // Debounce mechanism to prevent excessive API calls
  const [fetchTimeout, setFetchTimeout] = useState(null);

  // Fetch user progress and unlock status
  const fetchUserProgress = async (force = false) => {
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

      const response = await fetch(
        `${API_ENDPOINTS.PROGRESS.GET_PROGRESS}?userEmail=${userEmail}&courseName=${course.name}&courseId=${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Progress data received:', data);

        if (Array.isArray(data.lessonUnlockStatus)) {
          setUnlockStatus(data.lessonUnlockStatus);
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

  // Fetch user progress on mount
  useEffect(() => {
    if (course) {
      fetchUserProgress();
    }
  }, [courseId, course]);

  // Fetch subtitle when lesson changes
  useEffect(() => {
    if (course && lessonId) {
      fetchSubtitle();
    }
  }, [courseId, lessonId, course?.name]);

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

    const currentCourseName = course?.name;
    if (eventCourseId === courseId || courseName === currentCourseName) {
      console.log('🔄 Refreshing unlock status for current course...');
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      refreshTimeout = setTimeout(() => {
        fetchUserProgress();
      }, 500);
    }
  };

  const handleProgressUpdated = (event) => {
    const { courseName: eventCourseName, lessonUnlockStatus } = event.detail;
    console.log('🔄 Progress updated event received:', { eventCourseName, lessonUnlockStatus });

    if (eventCourseName === course?.name) {
      console.log('✅ Updating unlock status from progress update event...');
      setUnlockStatus(lessonUnlockStatus);
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
  const getModuleIdFromLessonKey = (lessonKey) => {
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

  if (!course) {
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

  if (loading) {
    return (
      <div className="lesson-wrapper">
        <div className="loading-container">
          <h2>Loading lesson...</h2>
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
              onTimeUpdate={handleVideoTimeUpdate}
              ref={(video) => {
                videoRef.current = video;
                if (video && video.textTracks.length > 0) {
                  const track = video.textTracks[0];
                  track.mode = showCaptions ? 'showing' : 'hidden';
                }
              }}
            >
            <source src={lesson.videoUrl} type="video/mp4" />
              {subtitleUrl && (
                <track 
                  kind="captions" 
                  srcLang="en" 
                  label="English" 
                  src={subtitleUrl}
                />
              )}
          </video>
            <div className="video-controls-overlay">
              <button 
                className={`captions-button ${showCaptions ? 'active' : ''}`}
                onClick={handleCaptionsToggle}
                title={showCaptions ? 'Hide Captions' : 'Show Captions'}
              >
                {showCaptions ? '🔤' : '📝'}
              </button>
            </div>
            {/* Subtitle display below video */}
            {subtitleUrl && subtitleText && (
              <div className="subtitle-display">
                <p className="subtitle-text">{subtitleText}</p>
              </div>
            )}
            {/* Show message when no subtitles available */}
            {!subtitleUrl && (
              <div className="subtitle-info-message">
                <p className="subtitle-info-text">
                  <span className="info-icon">ℹ️</span>
                  Subtitles are not available for this video. 
                  <a 
                    href="#subtitle-guide" 
                    className="subtitle-guide-link"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`HOW TO CREATE SUBTITLE FILES:\n\n1. Use YouTube Studio (Free):\n   - Upload your video to YouTube (private)\n   - YouTube auto-generates captions\n   - Download as .vtt file\n   - Upload to S3 in same folder as video\n\n2. Use Online Tools:\n   - Rev.com (paid, accurate)\n   - Otter.ai (free tier available)\n   - Descript.com (free trial)\n\n3. Manual Creation:\n   - Use Subtitle Edit (free software)\n   - Create .vtt file with timestamps\n   - Format: HH:MM:SS.mmm --> HH:MM:SS.mmm\n\n4. Upload to S3:\n   - Path: e-learning/videos/{course.name}/Module{N}/subtitle.vtt\n   - Same folder as your video file`);
                    }}
                  >
                    Learn how to add subtitles
                  </a>
                </p>
              </div>
            )}
          </div>
        
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
            {lessonKeys.map((id) => {
              const unlocked = isLessonUnlocked(id);
              const completed = isLessonCompleted(id);
              const isCurrentLesson = id === actualLessonId;
              return (
                <button
                  key={id}
                  className={`lesson-button ${isCurrentLesson ? 'active' : ''} ${completed ? 'completed' : ''} ${!unlocked ? 'locked' : ''}`}
                  disabled={!unlocked}
                  onClick={() => unlocked && navigate(`/course/${courseId}/lesson/${id}`)}
                >
                  {!unlocked && <span className="lock-icon">🔒</span>}
                  {completed && <span className="check-icon">✓</span>}
                  Lesson {id}: {lessons[id].title.split(' ').slice(0, 3).join(' ')}...
                 
                </button>
              );
            })}
          </div>

          <div className="sidebar-section">
            <h4>Practice Quiz</h4>
            {lessonKeys.map((id) => {
              const quizAvailable = isQuizAvailable(id);
              console.log("is quiz available", quizAvailable);
              const quizCompleted = isQuizCompleted(id);
              const isCurrentLesson = id === actualLessonId;
              return (
                <button
                  key={id}
                  className={`quiz-button ${isCurrentLesson ? 'active' : ''} ${quizCompleted ? 'completed' : ''} ${!quizAvailable ? 'locked' : ''}`}
                  disabled={!quizAvailable}
                  onClick={async () => {
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
                            alert(`⏰ You cannot take this quiz right now!\n\nYou already failed it recently and need to wait ${hours}h ${minutes}m before retrying.\n\nThis 24-hour cooldown ensures proper learning and prevents rapid retakes.`);
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
                  {!quizAvailable && <span className="lock-icon">🔒</span>}
                  {quizCompleted && <span className="check-icon">✓</span>}
                  Quiz {id}: {lessons[id].title.split(' ').slice(0, 2).join(' ')}...
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
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginTop: '8px',
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
        </div>
      </div>
    </div>
  );
}

export default LessonPage;