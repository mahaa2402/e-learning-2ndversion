import React, { useState, useEffect, useRef } from 'react';
import './quiz.css';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';

const email = localStorage.getItem("employeeEmail"); // stored at login
const currentLevel = parseInt(localStorage.getItem("levelCleared")) || 0;
const thisLesson = 4; // Set this based on current lesson

// Update level in localStorage and backend if eligible
if (thisLesson === currentLevel + 1) {
  const updatedLevel = thisLesson;
  localStorage.setItem("levelCleared", updatedLevel);

  fetch("/api/update-progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, levelCount: updatedLevel }),
  });
}

const Quiz = () => {
  const { courseId, mo_id } = useParams();
  const navigate = useNavigate();
  const [dbCourseName, setDbCourseName] = useState(null);
  const [dbCourse, setDbCourse] = useState(null);
  const [allCourses, setAllCourses] = useState([]);

  // Fetch course name and data from database if courseId is a MongoDB ObjectId
  useEffect(() => {
    const fetchCourseData = async () => {
      // Check if courseId looks like a MongoDB ObjectId (24 hex characters)
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(courseId);
      
      if (isObjectId) {
        try {
          console.log('🔍 Fetching course data from database for courseId:', courseId);
          const response = await fetch(`${API_ENDPOINTS.COURSES.GET_COURSE}/${courseId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const courseData = await response.json();
            console.log('✅ Course data fetched:', courseData);
            setDbCourseName(courseData.title || courseData.name);
            setDbCourse(courseData);
          }
        } catch (error) {
          console.error('❌ Error fetching course data:', error);
        }
      }
    };

    fetchCourseData();
  }, [courseId]);

  // Fetch all courses to determine next course
  useEffect(() => {
    const fetchAllCourses = async () => {
      try {
        // Fetch common courses from database
        const response = await fetch(API_ENDPOINTS.COURSES.GET_COURSES, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const courses = await response.json();
          // Also include static courses
          const staticCourses = ['ISP', 'GDPR', 'POSH', 'Factory Act', 'Welding', 'CNC', 'Excel', 'VRU'];
          const allCoursesList = [
            ...staticCourses.map(title => ({ title, _id: title, isStatic: true })),
            ...courses.map(course => ({ ...course, isStatic: false }))
          ];
          setAllCourses(allCoursesList);
          console.log('✅ All courses fetched for next course navigation:', allCoursesList);
        }
      } catch (error) {
        console.error('❌ Error fetching all courses:', error);
      }
    };

    fetchAllCourses();
  }, []);

  // Function to determine course name based on module ID or course ID
  const getCourseName = () => {
    // For database courses (ObjectId), always use dbCourseName or dbCourse title/name
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(courseId);
    if (isObjectId) {
      if (dbCourseName) {
        console.log('📋 Using dbCourseName for course name:', dbCourseName);
        return dbCourseName;
      }
      if (dbCourse?.title) {
        console.log('📋 Using dbCourse.title for course name:', dbCourse.title);
        return dbCourse.title;
      }
      if (dbCourse?.name) {
        console.log('📋 Using dbCourse.name for course name:', dbCourse.name);
        return dbCourse.name;
      }
    }
    
    // If we have the course name from database, use it
    if (dbCourseName) {
      return dbCourseName;
    }

    // First try to determine from module ID
    if (mo_id) {
      const moduleIdUpper = mo_id.toUpperCase();
      
      if (moduleIdUpper.startsWith('ISP')) {
        return 'ISP';
      } else if (moduleIdUpper.startsWith('GDPR')) {
        return 'GDPR';
      } else if (moduleIdUpper.startsWith('POSH')) {
        return 'POSH';
      } else if (moduleIdUpper.startsWith('FACT')) {
        return 'Factory Act';
      } else if (moduleIdUpper.startsWith('WELD')) {
        return 'Welding';
      } else if (moduleIdUpper.startsWith('CNC')) {
        return 'CNC';
      } else if (moduleIdUpper.startsWith('EXL')) {
        return 'Excel';
      } else if (moduleIdUpper.startsWith('VRU')) {
        return 'VRU';
      }
    }
    
    // If module ID doesn't help, try course ID
    if (courseId) {
      const courseIdUpper = courseId.toUpperCase();
      
      if (courseIdUpper.includes('ISP')) {
        return 'ISP';
      } else if (courseIdUpper.includes('GDPR')) {
        return 'GDPR';
      } else if (courseIdUpper.includes('POSH')) {
        return 'POSH';
      } else if (courseIdUpper.includes('FACT') || courseIdUpper.includes('FACTORY')) {
        return 'Factory Act';
      } else if (courseIdUpper.includes('WELD')) {
        return 'Welding';
      } else if (courseIdUpper.includes('CNC')) {
        return 'CNC';
      } else if (courseIdUpper.includes('EXL') || courseIdUpper.includes('EXCEL')) {
        return 'Excel';
      }
    }
    
    // Default fallback
    return 'ISP';
  };

  // Map lesson keys to module IDs for backend compatibility
  // For newly created common courses, mo_id is already the m_id, so return as-is
  // For static courses, use the mapping
  const getModuleIdFromLessonKey = (lessonKey) => {
    // For newly created common courses (courseId is MongoDB ObjectId), mo_id is already m_id
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(courseId);
    if (isObjectId) {
      console.log('📋 Database course detected, using lessonKey as m_id:', lessonKey);
      return lessonKey;
    }
    
    // For static courses, use the hardcoded mapping
    const moduleMapping = {
      'ISP01': 'ISP01',
      'ISP02': 'ISP02', 
      'ISP03': 'ISP03',
      'ISP04': 'ISP04',
      'POSH01': 'POSH01',
      'POSH02': 'POSH02',
      'POSH03': 'POSH03', 
      'POSH04': 'POSH04',
      'GDPR01': 'GDPR01',
      'GDPR02': 'GDPR02',
      'GDPR03': 'GDPR03',
      'GDPR04': 'GDPR04',
      'FACT01': 'FACTORY01',
      'FACT02': 'FACTORY02',
      'FACT03': 'FACTORY03',
      'FACT04': 'FACTORY04',
      'FACTORY01': 'FACTORY01',
      'FACTORY02': 'FACTORY02',
      'FACTORY03': 'FACTORY03',
      'FACTORY04': 'FACTORY04',
      'WELD01': 'WELDING01',
      'WELD02': 'WELDING02',
      'WELD03': 'WELDING03',
      'WELD04': 'WELDING04',
      'WELDING01': 'WELDING01',
      'WELDING02': 'WELDING02',
      'WELDING03': 'WELDING03',
      'WELDING04': 'WELDING04',
      'CNC01': 'CNC01',
      'CNC02': 'CNC02',
      'CNC03': 'CNC03',
      'EXL01': 'EXL01',
      'EXL02': 'EXL02',
      'EXL03': 'EXL03',
      'EXL04': 'EXL04',
      'CNC04': 'CNC04',
      'VRU01': 'VRU01',
      'VRU02':'VRU02',
      'VRU03':'VRU03',
      'VRU04':'VRU04'
    };
    return moduleMapping[lessonKey] || lessonKey;
  };

  // Check if current module is the final module for the course
  const isFinalModule = (mo_id, courseName) => {
    if (!mo_id || !courseName) return false;
    
    console.log('Checking if final module:', { mo_id, courseName });
    
    // For newly created common courses, check against database course data
    if (dbCourse && dbCourse.modules) {
      const modules = dbCourse.modules;
      const currentModuleIndex = modules.findIndex(m => m.m_id === mo_id);
      const isFinal = currentModuleIndex === modules.length - 1;
      console.log('Is final module (database course)?', isFinal, `(${currentModuleIndex + 1}/${modules.length})`);
      return isFinal;
    }
    
    // For static courses, use hardcoded logic
    const moduleNumber = parseInt(mo_id.match(/\d+/)?.[0] || '0');
    console.log('Extracted module number:', moduleNumber);
    
    // Define final module numbers for each course
    const finalModules = {
      'ISP': 4,        // ISP04 is final
      'POSH': 4,       // POSH04 is final
      'GDPR': 4,       // GDPR04 is final
      'Factory Act': 4, // FACTORY04 is final
      'Welding': 4,    // WELDING04 is final
      'CNC': 4         // CNC04 is final
    };
    
    const isFinal = moduleNumber === finalModules[courseName];
    console.log('Is final module?', isFinal, 'Expected:', finalModules[courseName]);
    
    return isFinal;
  };

  // State management
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [hasFailedOnce, setHasFailedOnce] = useState(false);
  const [isCourseCompleted, setIsCourseCompleted] = useState(false); // New state for course completion
  const [quizAccessAllowed, setQuizAccessAllowed] = useState(false);
  const [accessChecking, setAccessChecking] = useState(true);
  const [quizCompleted, setQuizCompleted] = useState(false); // New state to track if quiz is completed
  const [quizBlocked, setQuizBlocked] = useState(false);
  const [cooldownTime, setCooldownTime] = useState({ hours: 0, minutes: 0 });
  const [noQuizInDB, setNoQuizInDB] = useState(false); // State to track if no quiz exists in database
  const [moduleHasQuiz, setModuleHasQuiz] = useState(true); // Track if current module has a quiz
  const [timeRemaining, setTimeRemaining] = useState(null); // Timer in seconds
  const [timerStarted, setTimerStarted] = useState(false); // Track if timer has started
  const cooldownAlertShown = useRef(false); // Track if cooldown alert has been shown

  // Function to refresh progress data after quiz completion
  const refreshProgressData = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const userEmail = localStorage.getItem('employeeEmail');
      const courseName = getCourseName();
      
      if (!token || !userEmail) {
        console.warn('⚠️ No token or email for progress refresh');
        return null;
      }
      
      console.log('🔄 Refreshing progress data for:', { userEmail, courseName, courseId });
      
      const response = await fetch(`${API_ENDPOINTS.PROGRESS.GET_PROGRESS}?userEmail=${encodeURIComponent(userEmail)}&courseName=${encodeURIComponent(courseName)}&courseId=${encodeURIComponent(courseId)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Progress data refreshed:', data);
        
        // Dispatch event to notify other components about progress update
        window.dispatchEvent(new CustomEvent('progressUpdated', { 
          detail: { 
            progress: data.progress,
            lessonUnlockStatus: data.lessonUnlockStatus,
            courseName: courseName
          } 
        }));
        
        return data;
      } else {
        console.warn('⚠️ Failed to refresh progress data:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Error refreshing progress data:', error);
      return null;
    }
  };

  // Check quiz availability when component mounts
  useEffect(() => {
    const checkQuizAvailability = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found');
          setAccessChecking(false);
          return;
        }

        // First check quiz access (completion status)
        const accessResult = await checkQuizAccess();
        
        // For sequential courses (like POSH), don't apply global cooldown
        // Only show cooldown if the specific quiz was failed recently
        const courseName = getCourseName();
        const isSequentialCourse = ['POSH', 'Welding', 'GDPR', 'ISP', 'Factory Act', 'CNC'].includes(courseName);
        
        if (!accessResult.isCompleted && !accessResult.canTake && !isSequentialCourse) {
          console.log('🔍 Checking quiz availability for course:', courseName);

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
            console.log('📊 Quiz availability result:', result);

            if (!result.canTake) {
              setQuizBlocked(true);
              setCooldownTime(result.cooldown);
              const cooldownHours = result.cooldownHours || 24;
              const hoursText = cooldownHours === 1 ? 'hour' : 'hours';
              setError(`Quiz is not available yet. You can retry in ${result.cooldown.hours}h ${result.cooldown.minutes}m (cooldown: ${cooldownHours} ${hoursText})`);
              setAccessChecking(false);
              return;
            }
          } else {
            console.log('⚠️ Quiz availability check failed, proceeding with normal access check');
          }
        } else if (isSequentialCourse) {
          console.log('🔄 Sequential course detected, skipping global cooldown check');
        }
      } catch (error) {
        console.error('❌ Error checking quiz availability:', error);
        // Continue with normal access checking even if timestamp check fails
        checkQuizAccess();
      }
    };

    checkQuizAvailability();
  }, [courseId, mo_id]);

  // Check if user is allowed to take this quiz
  const checkQuizAccess = async () => {
    try {
      setAccessChecking(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const userEmail = localStorage.getItem('employeeEmail');
      
      if (!token || !userEmail) {
        console.log('No token or email found, allowing access');
        setQuizAccessAllowed(true);
        setAccessChecking(false);
        return { isCompleted: false, canTake: true, hasQuiz: true };
      }

      const courseName = getCourseName();
      const moduleId = getModuleIdFromLessonKey(mo_id);
      
  const response = await fetch(`${API_ENDPOINTS.PROGRESS.GET_PROGRESS}?userEmail=${userEmail}&courseName=${courseName}&courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Quiz access check - unlock status:', data.lessonUnlockStatus);
        console.log('Quiz access check - available lesson IDs:', data.lessonUnlockStatus.map(s => s.lessonId));
        console.log('Quiz access check - looking for moduleId:', moduleId);
        const lessonStatus = data.lessonUnlockStatus.find(lesson => lesson.lessonId === moduleId);
        console.log('Quiz access check - lesson status for', moduleId, ':', lessonStatus);
        
        // Find the index of this module in the unlock status array
        const moduleIndex = data.lessonUnlockStatus.findIndex(lesson => lesson.lessonId === moduleId);
        const isFirstQuiz = moduleIndex === 0;
        
        if (lessonStatus) {
          // Check if module has a quiz
          const hasQuiz = lessonStatus.hasQuiz !== false; // Default to true if not specified
          setModuleHasQuiz(hasQuiz);
          
          // If module doesn't have a quiz, don't allow access
          if (!hasQuiz) {
            console.log('Quiz access check - module does not have a quiz');
            setQuizAccessAllowed(false);
            setNoQuizInDB(true); // Use this state to show the "no quiz available" message
            setAccessChecking(false);
            return { isCompleted: false, canTake: false, hasQuiz: false };
          }
          
          // Check if quiz is already completed - if so, lock it
          if (lessonStatus.isCompleted) {
            console.log('Quiz access check - quiz already completed, locking access');
            setQuizAccessAllowed(false);
            setQuizCompleted(true);
            return { isCompleted: true, canTake: false, hasQuiz: true };
          } else {
            // Determine if user can take quiz
            // Default to allowing access unless explicitly blocked
            // First quiz is always available, or if canTakeQuiz is true/undefined/null
            // Only block if canTakeQuiz is explicitly false AND it's not the first quiz
            let canTake = true; // Default to allowing access
            
            if (!isFirstQuiz && lessonStatus.canTakeQuiz === false) {
              // Only block if it's not the first quiz AND canTakeQuiz is explicitly false
              canTake = false;
            }
            
            console.log('Quiz access check - canTakeQuiz:', lessonStatus.canTakeQuiz, 'isFirstQuiz:', isFirstQuiz, 'final canTake:', canTake);
            setQuizAccessAllowed(canTake);
            setQuizCompleted(false);
            return { isCompleted: false, canTake: canTake, hasQuiz: true };
          }
        } else {
          // If lesson not found in progress, allow access (fallback)
          // This handles cases where the course is newly created or progress hasn't been initialized
          console.log('Quiz access check - lesson not found in unlock status, allowing access as fallback');
          setQuizAccessAllowed(true);
          setModuleHasQuiz(true);
          return { isCompleted: false, canTake: true, hasQuiz: true };
        }
      } else {
        console.log('Failed to check quiz access, allowing access');
        setQuizAccessAllowed(true);
        setModuleHasQuiz(true);
        return { isCompleted: false, canTake: true, hasQuiz: true };
      }
    } catch (error) {
      console.error('Error checking quiz access:', error);
      setQuizAccessAllowed(true); // Allow access on error
      setModuleHasQuiz(true);
      return { isCompleted: false, canTake: true, hasQuiz: true };
    } finally {
      setAccessChecking(false);
    }
  };

  // Fetch questions from backend
  const fetchQuestions = async (attempt) => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching questions for attempt:", attempt);
      console.log("Fetching questions...");
      console.log("Request details:", {
        method: "POST",
  url: API_ENDPOINTS.QUIZ.GET_QUESTIONS,
        courseId: courseId,
        moduleId: mo_id,
        attemptNumber: attempt
      });

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      const requestBody = {
        courseId: courseId,
        moduleId: mo_id,      
        attemptNumber: attempt
      };
      
      console.log("Request body:", JSON.stringify(requestBody, null, 2));
      
  const response = await fetch(API_ENDPOINTS.QUIZ.GET_QUESTIONS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Check if it's a 404 error (no quiz found in database)
        if (response.status === 404) {
          // First, check if the module is configured to have no quiz
          try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const userEmail = localStorage.getItem('employeeEmail');
            const courseName = getCourseName();
            if (token && userEmail) {
              const progressResponse = await fetch(`${API_ENDPOINTS.PROGRESS.GET_PROGRESS}?userEmail=${userEmail}&courseName=${courseName}&courseId=${courseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (progressResponse.ok) {
                const progressData = await progressResponse.json();
                const moduleId = getModuleIdFromLessonKey(mo_id);
                const lessonStatus = progressData.lessonUnlockStatus?.find(lesson => lesson.lessonId === moduleId);
                if (lessonStatus && lessonStatus.hasQuiz === false) {
                  console.log("Module is configured to have no quiz");
                  setModuleHasQuiz(false);
                  setNoQuizInDB(true);
                  setLoading(false);
                  setError(null);
                  return;
                }
              }
            }
          } catch (e) {
            console.log("Could not check if module has quiz:", e);
          }
          // If we reach here, quiz might just not exist in DB (error case)
          console.log("No quiz available in database for this module (404)");
          setNoQuizInDB(true);
          setLoading(false);
          setError(null);
          return;
        }
        throw new Error(`Failed to fetch questions: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched questions for attempt", attempt, ":", data);

      // Transform backend data to match our component structure
      const transformedQuestions = data.map((question, index) => {
        const questionType = question.type || 'multiple-choice';
        
        // Handle options based on question type
        let options = [];
        if (questionType === 'true-false') {
          // For true/false questions, ensure we have "True" and "False" options
          if (Array.isArray(question.options) && question.options.length >= 2) {
            options = question.options;
          } else {
            // Generate True/False options if not provided
            options = ['True', 'False'];
          }
        } else if (questionType === 'fill-in-blank') {
          // For fill-in-blank, we don't need options displayed, but we'll handle it in the UI
          options = question.options || [];
        } else {
          // Multiple choice - use provided options
          options = question.options || [];
        }
        
        // Find the index of the correct answer in the options array
        let correctAnswerId = null;
        if (typeof question.correctAnswer === 'string' && Array.isArray(options)) {
          const idx = options.findIndex(opt => opt === question.correctAnswer || opt.toString() === question.correctAnswer.toString());
          if (idx !== -1) {
            correctAnswerId = String.fromCharCode(97 + idx); // 'a', 'b', ...
          }
        }

        // Handle image URL logic - IMPROVED VERSION
        let imageUrl = null;
        
        console.log('==========================================');
        console.log('Processing question:', question.question);
        console.log('Question type:', questionType);
        console.log('Question options:', options);
        console.log('Raw imageUrl from backend:', question.imageUrl);
        console.log('Type of imageUrl:', typeof question.imageUrl);
        console.log('imageUrl === null:', question.imageUrl === null);
        console.log('imageUrl === "null":', question.imageUrl === 'null');
        console.log('imageUrl field exists?', question.hasOwnProperty('imageUrl'));
        
        if (question.hasOwnProperty('imageUrl')) {
          // imageUrl field exists in the question
          if (question.imageUrl === null || question.imageUrl === 'null' || question.imageUrl === '') {
            // Explicitly null or empty - no image
            imageUrl = null;
            console.log('ImageUrl is null/empty - NO IMAGE will be shown');
          } else if (typeof question.imageUrl === 'string' && question.imageUrl.trim().length > 0) {
            // Valid string URL - use it
            imageUrl = question.imageUrl.trim();
            console.log('Using provided imageUrl:', imageUrl);
          } else {
            // Invalid value - no image
            imageUrl = null;
            console.log('Invalid imageUrl value - NO IMAGE will be shown');
          }
        } else {
          // No imageUrl field - no image
          imageUrl = null;
          console.log('No imageUrl field - NO IMAGE will be shown');
        }
        
        console.log('Final imageUrl decision:', imageUrl);
        console.log('==========================================');

        return {
          id: question._id || question.id || index + 1,
          question: question.question,
          type: questionType, // Store question type
          imageUrl: imageUrl, // Add image URL to question object
          options: options.map((option, optIndex) => ({
            id: String.fromCharCode(97 + optIndex),
            text: option.toString()
          })),
          correctAnswer: correctAnswerId // always 'a', 'b', etc.
        };
      });

      console.log("Transformed questions:", transformedQuestions);
      setQuestions(transformedQuestions);
      setLoading(false);
      
      // Initialize timer when questions are loaded (15 minutes = 900 seconds)
      const quizTimeLimit = 15 * 60; // 15 minutes in seconds
      setTimeRemaining(quizTimeLimit);
      setTimerStarted(true);

    } catch (err) {
      console.error("Error fetching questions:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Reset noQuizInDB when module changes - this runs first
  useEffect(() => {
    setNoQuizInDB(false);
    setModuleHasQuiz(true);
    setError(null);
    setLoading(true);
  }, [courseId, mo_id]);

  // Fetch questions on component mount - runs after reset
  useEffect(() => {
    // Don't fetch if quiz access is not allowed
    // The noQuizInDB check is handled inside fetchQuestions when it gets a 404
    if (courseId && mo_id && quizAccessAllowed) {
      fetchQuestions(attemptNumber);
    }
  }, [courseId, mo_id, quizAccessAllowed]);

  // Timer countdown effect
  useEffect(() => {
    if (!timerStarted || timeRemaining === null || showResults || quizCompleted) {
      return;
    }

    const timerInterval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [timerStarted, timeRemaining, showResults, quizCompleted]);

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (timeRemaining === 0 && timerStarted && !showResults && !quizCompleted && questions.length > 0) {
      setTimerStarted(false);
      handleSubmit();
    }
  }, [timeRemaining, timerStarted, showResults, quizCompleted, questions.length]);

  // Show alert with cooldown time when retake quiz is failed
  useEffect(() => {
    const showCooldownAlert = async () => {
      if (showResults && attemptNumber >= 2 && questions.length > 0 && !cooldownAlertShown.current) {
        // Calculate if user passed using the same logic as calculateScore
        const score = questions.filter(q => {
          return selectedAnswers[q.id] === q.correctAnswer;
        }).length;
        const totalQuestions = questions.length;
        const isPassed = score === totalQuestions; // Must get ALL questions correct
        
        // Only show alert if user failed (did not pass)
        if (!isPassed) {
          cooldownAlertShown.current = true; // Mark as shown to prevent duplicates
          try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            if (token) {
              const courseName = getCourseName();
              
              const cooldownResponse = await fetch('/api/courses/check-quiz-availability', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ courseName })
              });
              
              if (cooldownResponse.ok) {
                const cooldownResult = await cooldownResponse.json();
                if (cooldownResult.cooldown) {
                  const hours = cooldownResult.cooldown.hours;
                  const minutes = cooldownResult.cooldown.minutes;
                  const cooldownHours = cooldownResult.cooldownHours || 24;
                  const hoursText = cooldownHours === 1 ? 'hour' : 'hours';
                  
                  alert(`⏰ You have failed the retake quiz!\n\nYou must wait for the cooldown period before attempting again.\n\n⏳ Time remaining: ${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}\n\nThis ${cooldownHours}-${hoursText} cooldown period is set by admin to ensure proper learning and prevent rapid retakes.`);
                }
              }
            }
          } catch (error) {
            console.error('❌ Error showing cooldown alert:', error);
          }
        }
      }
    };

    // Small delay to ensure state is updated
    const timer = setTimeout(() => {
      showCooldownAlert();
    }, 100);

    return () => clearTimeout(timer);
  }, [showResults, attemptNumber, questions.length, selectedAnswers]);

  // Reset cooldown alert flag when starting a new quiz attempt
  useEffect(() => {
    if (!showResults) {
      cooldownAlertShown.current = false;
    }
  }, [showResults]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    if (seconds === null || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleAnswerSelect = (questionId, optionId) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(question => {
      if (selectedAnswers[question.id] === question.correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const handleSubmit = async () => {
    // Stop timer when submitting
    setTimerStarted(false);
    
    const score = calculateScore();
    const percentage = (score / questions.length) * 100;
    const passed = percentage >= 100; // Changed to 100% (5/5 correct answers required)

    // Always show results first
    setShowResults(true);

    // If first attempt and didn't pass, prepare for retake
    if (!passed && attemptNumber === 1 && !hasFailedOnce) {
      setHasFailedOnce(true);
    }

    // Handle quiz result
    if (passed) {
      // User passed the quiz - submit progress
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      // Always get email from localStorage to ensure we use the current logged-in user's email
      const userEmail = localStorage.getItem('employeeEmail');
      if (!userEmail) {
        console.error('❌ No employeeEmail found in localStorage');
        setError('User email not found. Please log in again.');
        return;
      }
      
      // Log the email being used to help debug user mismatch issues
      console.log('👤 Using email from localStorage:', userEmail);
      console.log('🔍 Verifying email matches current user...');
      
      const courseName = getCourseName();
      const m_id = getModuleIdFromLessonKey(mo_id);
      const completedAt = new Date().toISOString();

      try {
        console.log('✅ User passed quiz, submitting progress...');
        console.log('📊 Progress data:', { userEmail, courseName, m_id, passed, mo_id });
        console.log('🔍 Module ID format check - mo_id:', mo_id, 'm_id:', m_id);
        console.log('🔍 Course ID:', courseId, 'Is ObjectId:', /^[0-9a-fA-F]{24}$/.test(courseId));
        
        // Submit quiz progress to backend
        const response = await fetch(API_ENDPOINTS.PROGRESS.SUBMIT_QUIZ, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            userEmail,
            courseName,
            completedModules: [{ m_id, completedAt }],
            lastAccessedModule: m_id
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Quiz progress saved successfully:', result);
          console.log('✅ Saved module ID:', m_id, 'for course:', courseName);
          console.log('✅ Backend response details:', {
            success: result.success,
            savedCourseName: result.savedCourseName,
            savedUserEmail: result.savedUserEmail,
            progressFound: !!result.progress,
            completedModules: result.progress?.completedModules?.map(m => m.m_id) || []
          });
          
          // Update local storage for backward compatibility
          let currentLevel = parseInt(localStorage.getItem("levelCleared")) || 0;
          const updatedLevel = currentLevel + 1;
          localStorage.setItem("levelCleared", updatedLevel);
          
          console.log('Updated level cleared to:', updatedLevel);
          
          // Use the saved progress from the response, then refresh to get unlock status
          const savedProgress = result.progress;
          const savedCourseName = result.savedCourseName || courseName;
          
          // Wait a bit for database to fully commit, then refresh to get unlock status
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Refresh progress data to get unlock status
          try {
            console.log('🔄 Refreshing progress data to get unlock status...');
            
            // Refresh progress with the exact courseName that was saved
            let refreshedData = null;
            let progressRefreshed = false;
            
            // Try multiple times with increasing delays to ensure progress is updated
            for (let i = 0; i < 8; i++) {
              // Wait before each attempt (except first)
              if (i > 0) {
                const delay = Math.min(400 + (i * 200), 1200); // 400ms, 600ms, 800ms, 1000ms, 1200ms...
                console.log(`⏳ Waiting ${delay}ms before attempt ${i + 1}...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
              
              refreshedData = await refreshProgressData();
              
              // Check if we got valid progress data with the completed module
              if (refreshedData?.progress && refreshedData.progress.completedModules?.some(mod => mod.m_id === m_id)) {
                console.log(`✅ Progress confirmed updated on attempt ${i + 1}`);
                progressRefreshed = true;
                break;
              } else if (refreshedData?.progress && savedProgress) {
                // If we have progress but it doesn't include our module yet, check if it's at least a valid progress object
                console.log(`⏳ Progress found but module not yet included on attempt ${i + 1}, will retry...`);
                console.log('📊 Current progress modules:', refreshedData.progress.completedModules?.map(m => m.m_id) || []);
              } else {
                console.log(`⏳ Progress not found on attempt ${i + 1}, will retry...`);
              }
            }
            
            // Use refreshed data if available, otherwise use saved progress from response
            const progressToUse = refreshedData?.progress || savedProgress;
            const unlockStatusToUse = refreshedData?.lessonUnlockStatus || [];
            
            if (progressToUse) {
              console.log('✅ Using progress data:', {
                hasProgress: !!progressToUse,
                completedModules: progressToUse.completedModules?.map(m => m.m_id) || [],
                hasUnlockStatus: unlockStatusToUse.length > 0
              });
              
              // Dispatch progressUpdated event with the progress data
              window.dispatchEvent(new CustomEvent('progressUpdated', { 
                detail: { 
                  progress: progressToUse,
                  lessonUnlockStatus: unlockStatusToUse,
                  courseName: savedCourseName,
                  courseId: courseId
                } 
              }));
            } else {
              console.warn('⚠️ No progress data available, but quiz was saved successfully');
              // Still dispatch event with saved progress if available
              if (savedProgress) {
                window.dispatchEvent(new CustomEvent('progressUpdated', { 
                  detail: { 
                    progress: savedProgress,
                    lessonUnlockStatus: [],
                    courseName: savedCourseName,
                    courseId: courseId
                  } 
                }));
              }
            }
          } catch (error) {
            console.warn('⚠️ Could not refresh progress data:', error);
            // Still dispatch event with saved progress from response
            if (savedProgress) {
              window.dispatchEvent(new CustomEvent('progressUpdated', { 
                detail: { 
                  progress: savedProgress,
                  lessonUnlockStatus: [],
                  courseName: savedCourseName,
                  courseId: courseId
                } 
              }));
            }
          }

          // Trigger refresh event for taskmodulepage to update completion status
          console.log('🎉 Dispatching quizCompleted event:', { 
            moduleId: m_id, 
            courseId: courseId,
            courseName: courseName 
          });
          window.dispatchEvent(new CustomEvent('quizCompleted', { 
            detail: { 
              moduleId: m_id, 
              courseId: courseId,
              courseName: courseName 
            } 
          }));
          
          // Additional delay to ensure all components have processed the events
          await new Promise(resolve => setTimeout(resolve, 500));

          // Check if course is completed - ALWAYS check, not just for final module
          const currentCourseName = getCourseName();
          
          try {
            console.log('Checking if course is completed after this module...');
            const certificateResponse = await fetch(API_ENDPOINTS.CERTIFICATES.CHECK_COURSE_COMPLETION, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                courseName: currentCourseName,
                courseId: courseId,
                userEmail: userEmail
              }),
            });

            if (certificateResponse.ok) {
              const certificateResult = await certificateResponse.json();
              console.log('Course completion check result:', certificateResult);
              console.log('🔍 Factory Act completion details:', {
                courseName: currentCourseName,
                success: certificateResult.success,
                isCompleted: certificateResult.isCompleted,
                message: certificateResult.message,
                completionStatus: certificateResult.completionStatus
              });

              if (certificateResult.success && certificateResult.isCompleted) {
                console.log('Course completed! Certificate generated:', certificateResult.certificate);
                // Set course completion state
                setIsCourseCompleted(true);
                // Store certificate info in localStorage for the certificate page
                localStorage.setItem('lastGeneratedCertificate', JSON.stringify(certificateResult.certificate));
                localStorage.setItem('courseCompleted', 'true');
                localStorage.setItem('completedCourseName', currentCourseName);
              } else {
                console.log('Course still in progress:', certificateResult.message);
                console.log('🔍 Why not completed?', {
                  success: certificateResult.success,
                  isCompleted: certificateResult.isCompleted,
                  progress: certificateResult.progress,
                  completionStatus: certificateResult.completionStatus
                });
                setIsCourseCompleted(false);
                localStorage.setItem('courseCompleted', 'false');
              }
            } else {
              console.error('Failed to check course completion:', await certificateResponse.json());
              setIsCourseCompleted(false);
            }
          } catch (certError) {
            console.error('Error checking course completion:', certError);
            setIsCourseCompleted(false);
          }
        } else {
          const errorData = await response.json();
          console.error('Failed to save quiz progress:', errorData);
        }
      } catch (error) {
        console.error('Error saving quiz progress:', error);
      }
    } else {
      // User failed the quiz - only set cooldown if this is the second attempt (retake)
      if (attemptNumber === 2) {
        console.log('User failed on second attempt (retake), updating timestamp to block further attempts for 24 hours');
        try {
          const token = localStorage.getItem('authToken') || localStorage.getItem('token');
          if (token) {
            const courseName = getCourseName();
            console.log('⏰ Quiz failed on retake, updating timestamp for course:', courseName);
            
            const response = await fetch('/api/courses/update-quiz-timestamp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ courseName })
            });
            
            if (response.ok) {
              console.log('✅ Quiz timestamp updated after failed retake attempt');
              
              // Fetch cooldown time and show alert
              try {
                const cooldownResponse = await fetch('/api/courses/check-quiz-availability', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ courseName })
                });
                
                if (cooldownResponse.ok) {
                  const cooldownResult = await cooldownResponse.json();
                  if (cooldownResult.cooldown) {
                    const hours = cooldownResult.cooldown.hours;
                    const minutes = cooldownResult.cooldown.minutes;
                    const cooldownHours = cooldownResult.cooldownHours || 24;
                    const hoursText = cooldownHours === 1 ? 'hour' : 'hours';
                    
                    alert(`⏰ You have failed the retake quiz!\n\nYou must wait for the cooldown period before attempting again.\n\n⏳ Time remaining: ${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}\n\nThis ${cooldownHours}-${hoursText} cooldown period is set by admin to ensure proper learning and prevent rapid retakes.`);
                  }
                }
              } catch (cooldownError) {
                console.error('❌ Error fetching cooldown time:', cooldownError);
                // Still show a generic alert even if cooldown fetch fails
                const cooldownHours = dbCourse?.retakeQuizCooldownHours || 24;
                const hoursText = cooldownHours === 1 ? 'hour' : 'hours';
                alert(`⏰ You have failed the retake quiz!\n\nYou must wait for the cooldown period (${cooldownHours} ${hoursText}) before attempting again.\n\nThis cooldown period is set by admin to ensure proper learning and prevent rapid retakes.`);
              }
            } else {
              console.error('❌ Failed to update quiz timestamp');
            }
          }
        } catch (error) {
          console.error('❌ Error updating quiz timestamp:', error);
        }
      } else {
        console.log('User failed on first attempt, allowing retake without cooldown');
      }
    }
  };

  const getNextMoId = (mo_id) => {
    // For database courses, get next module from dbCourse.modules
    if (dbCourse && dbCourse.modules && Array.isArray(dbCourse.modules)) {
      const currentModuleIndex = dbCourse.modules.findIndex(m => m.m_id === mo_id);
      if (currentModuleIndex >= 0 && currentModuleIndex < dbCourse.modules.length - 1) {
        const nextModule = dbCourse.modules[currentModuleIndex + 1];
        console.log('📋 Database course - next module:', nextModule.m_id, 'from index', currentModuleIndex + 1);
        return nextModule.m_id;
      }
      console.log('📋 Database course - no next module (current index:', currentModuleIndex, 'total:', dbCourse.modules.length, ')');
      return null;
    }
    
    // For static courses, use pattern matching (ISP01 -> ISP02, etc.)
    const match = mo_id.match(/^(\D+)(\d+)$/);
    if (!match) {
      console.log('⚠️ getNextMoId: Could not parse module ID pattern:', mo_id);
      return null;
    }

    const [, prefix, numberPart] = match;
    const next = (parseInt(numberPart) + 1).toString().padStart(numberPart.length, '0');
    const nextMoId = `${prefix}${next}`;
    console.log('📋 Static course - next module:', nextMoId, 'from', mo_id);
    return nextMoId;
  };

  // Handle retake quiz button click
  const handleRetakeQuiz = async () => {
    try {
      // Reset quiz state
      setCurrentQuestion(0);
      setSelectedAnswers({});
      setShowResults(false);
      setTimerStarted(false);
      setTimeRemaining(null);
      
      // Increment attempt number for next set of questions
      const nextAttempt = attemptNumber + 1;
      setAttemptNumber(nextAttempt);
      
      // Fetch new questions for the next attempt (timer will be reset in fetchQuestions)
      await fetchQuestions(nextAttempt);
      
    } catch (error) {
      console.error('Error during retake:', error);
      setError('Failed to load retake questions. Please try again.');
    }
  };

  // Access denied state
  if (accessChecking) {
    return (
      <div className="quiz-container">
        <div className="quiz-card">
          <div className="quiz-header">
            <h2>Checking Quiz Access...</h2>
            <p>Please wait while we verify your progress.</p>
          </div>
        </div>
      </div>
    );
  }

  // Quiz blocked by timestamp state
  if (quizBlocked) {
    return (
      <div className="quiz-container">
        <div className="quiz-title-left">
          <h2>{getCourseName()} QUIZ</h2>
        </div>
        
        <div className="quiz-card">
          <div className="quiz-blocked-state">
            <div className="blocked-icon">
              <span>⏰</span>
            </div>
            <h2>Quiz Not Available</h2>
            <p>You cannot take this quiz right now because you already failed it recently.</p>
            <p>Please wait for the cooldown period to expire before retrying.</p>
            
            <div className="cooldown-info">
              <h3>Time Remaining:</h3>
              <div className="cooldown-timer">
                <span className="time-unit">
                  <span className="time-value">{cooldownTime.hours}</span>
                  <span className="time-label">Hours</span>
                </span>
                <span className="time-separator">:</span>
                <span className="time-unit">
                  <span className="time-value">{cooldownTime.minutes.toString().padStart(2, '0')}</span>
                  <span className="time-label">Minutes</span>
                </span>
              </div>
            </div>
            
            <div className="blocked-note">
              <p><strong>Note:</strong> This cooldown period is designed to ensure proper learning and prevent rapid retakes.</p>
            </div>
            
            <button 
              onClick={() => navigate(`/course/${courseId}/lesson/${mo_id}`)}
              className="nav-button primary"
            >
              Back to Lesson
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No quiz available in database state (handles modules configured without quizzes)
  // Check this BEFORE access denied to show proper message for modules without quizzes
  if (noQuizInDB) {
    const nextMoId = getNextMoId(mo_id);
    const courseName = getCourseName();
    const isLastModule = isFinalModule(mo_id, courseName);
    
    return (
      <div className="quiz-container">
        <div className="quiz-title-left">
          <h2>{courseName} QUIZ</h2>
        </div>
        <div className="quiz-card">
          <div className="quiz-header">
            <h2>No Quiz Available</h2>
            <p>No quiz available for this module. You can proceed to next module.</p>
            {nextMoId && !isLastModule ? (
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                    const userEmail = localStorage.getItem('employeeEmail');
                    const moduleId = getModuleIdFromLessonKey(mo_id);
                    
                    if (token && userEmail && courseName) {
                      // Mark current module as completed
                      const response = await fetch(API_ENDPOINTS.PROGRESS.SUBMIT_QUIZ, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          userEmail,
                          courseName,
                          completedModules: [{ m_id: moduleId, completedAt: new Date().toISOString() }],
                          lastAccessedModule: moduleId
                        }),
                      });
                      
                      if (response.ok) {
                        console.log('✅ Module marked as completed, refreshing progress data...');
                        
                        // Refresh progress data to ensure next module quiz is unlocked
                        try {
                          await refreshProgressData();
                          console.log('✅ Progress data refreshed, next module quiz should be unlocked');
                        } catch (refreshError) {
                          console.warn('⚠️ Could not refresh progress data:', refreshError);
                        }
                        
                        // Dispatch event to notify other components
                        window.dispatchEvent(new CustomEvent('quizCompleted', { 
                          detail: { 
                            moduleId: moduleId, 
                            courseId: courseId,
                            courseName: courseName 
                          } 
                        }));
                        
                        // Small delay to ensure backend has processed the completion
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Navigate to next module's lesson page
                        navigate(`/course/${courseId}/lesson/${nextMoId}`);
                      } else {
                        console.warn('⚠️ Could not mark module as completed');
                        // Still navigate even if save fails
                        navigate(`/course/${courseId}/lesson/${nextMoId}`);
                      }
                    } else {
                      // Navigate even if no token
                      navigate(`/course/${courseId}/lesson/${nextMoId}`);
                    }
                  } catch (error) {
                    console.warn('⚠️ Could not save module completion:', error);
                    // Navigate even if error occurs
                    navigate(`/course/${courseId}/lesson/${nextMoId}`);
                  }
                }}
                className="nav-button primary"
                style={{ marginTop: '20px' }}
              >
                Proceed to Next Module
              </button>
            ) : (
              <button
                onClick={() => {
                  navigate(`/course/${courseId}/lesson/${mo_id}`);
                }}
                className="nav-button primary"
                style={{ marginTop: '20px' }}
              >
                Back to Lesson
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Access denied state (only show if it's not a "no quiz" scenario)
  if (!quizAccessAllowed && !noQuizInDB) {
    return (
      <div className="quiz-container">
        {/* Show course title even when quiz is locked */}
        <div className="quiz-title-left">
          <h2>{getCourseName()} QUIZ</h2>
        </div>
        
        <div className="quiz-card">
          <div className={`quiz-access-denied ${quizCompleted ? 'completed' : ''}`}>
            {quizCompleted ? (
              <div className="completion-icon">
                <span>✅</span>
              </div>
            ) : (
              <div className="lock-icon">
                <span>🔒</span>
              </div>
            )}
            <h2>{quizCompleted ? 'Quiz Already Completed' : 'Quiz Locked'}</h2>
            <p>
              {quizCompleted 
                ? 'You have already completed this quiz successfully. You can only view the lesson content.'
                : 'You need to complete the previous lesson before taking this quiz.'
              }
            </p>
            <button 
              onClick={() => navigate(`/course/${courseId}/lesson/${mo_id}`)}
              className="nav-button primary"
            >
              {quizCompleted ? 'View Lesson' : 'Go to Lesson'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="quiz-container">
        <div className="quiz-card">
          <div className="quiz-header">
            <h2>Loading Quiz...</h2>
            <p>Please wait while we fetch your questions.</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state (only show if it's not a "no quiz" scenario)
  if (error) {
    return (
      <div className="quiz-container">
        <div className="quiz-card">
          <div className="quiz-header">
            <h2>Error Loading Quiz</h2>
            <p>Failed to load questions: {error}</p>
            <button onClick={() => fetchQuestions(attemptNumber)} className="nav-button primary">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No questions available (should not reach here if noQuizInDB is true)
  if (!questions.length) {
    return (
      <div className="quiz-container">
        <div className="quiz-card">
          <div className="quiz-header">
            <h2>No Questions Available</h2>
            <p>No questions found for this course and module.</p>
          </div>
        </div>
      </div>
    );
  }

  // Results view
  if (showResults) {
    const score = calculateScore();
    const totalQuestions = questions.length;
    const isPassed = score === totalQuestions; // Must get ALL questions correct (5/5)

    return (
      <div className="results-container">
        <div className="results-card">
          <h1 className="results-title">{getCourseName()} Quiz Results</h1>
          <div className="score-display">
            <div className="score-number">{score}/{totalQuestions}</div>
            <div className="score-message">
              {isPassed
                ? "Congratulations! You passed the quiz."
                : "You did not pass. You can retake with new questions."}
            </div>
          </div>
          
          <div className="questions-review">
            {questions.map((question, index) => (
              <div key={question.id} className="question-review">
                <div className="question-review-title">
                  Question {index + 1}: {question.question}
                </div>
                {/* Show image in results if it exists */}
                {question.imageUrl && (
                  <div className="question-review-image">
                    <img 
                      src={question.imageUrl} 
                      alt={`Question ${index + 1} visual`}
                      style={{
                        maxWidth: '300px',
                        maxHeight: '200px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        margin: '10px 0'
                      }}
                    />
                  </div>
                )}
                <div className="question-review-content">
                  <div className="question-review-answer">
                    Your answer: {selectedAnswers[question.id]
                      ? question.options.find(opt => opt.id === selectedAnswers[question.id])?.text
                      : "Not answered"}
                  </div>
                  <div className={`answer-status ${
                    selectedAnswers[question.id] === question.correctAnswer
                      ? 'correct'
                      : 'incorrect'
                  }`}>
                    {selectedAnswers[question.id] === question.correctAnswer ? 'correct' : 'incorrect'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Show Retake button only if failed and haven't exceeded attempts */}
          {!isPassed && hasFailedOnce && attemptNumber < 2 && (
            <button onClick={handleRetakeQuiz} className="retake-button">
              Retake Quiz
            </button>
          )}
          
          {/* Show message if exceeded attempts (failed retake quiz) */}
          {!isPassed && attemptNumber >= 2 && (
            <div className="attempt-limit-message">
              You have failed the retake quiz. You must wait for the cooldown period (set by admin) before attempting again. Please check back later.
            </div>
          )}
          
          {/* If passed - show appropriate button (works for both first and second attempt) */}
          {isPassed && (
            <>
              {(() => {
                // Check if there's a next module in the current course
                const nextMoId = getNextMoId(mo_id);
                
                if (nextMoId) {
                  // There's a next module - show "Continue to Next Module" button
                  return (
                    <button
                      onClick={async () => {
                        // Ensure progress is saved and refreshed before navigating
                        try {
                          const courseName = getCourseName();
                          const savedM_id = getModuleIdFromLessonKey(mo_id);
                          
                          console.log('🔄 Refreshing progress before navigation to next module...');
                          
                          // Wait longer to ensure backend has fully processed the quiz completion
                          await new Promise(resolve => setTimeout(resolve, 1000));
                          
                          // Refresh progress multiple times to ensure it's up to date
                          let progressData = null;
                          for (let i = 0; i < 5; i++) {
                            progressData = await refreshProgressData();
                            
                            if (progressData) {
                              console.log(`🔄 Progress fetch attempt ${i + 1}:`, progressData);
                              
                              // Check if progress includes the completed module
                              const hasCompletedModule = progressData.progress?.completedModules?.some(mod => mod.m_id === savedM_id);
                              if (hasCompletedModule) {
                                console.log(`✅ Progress confirmed with completed module on attempt ${i + 1}`);
                                break;
                              } else {
                                console.log(`⏳ Progress found but module not yet included on attempt ${i + 1}, retrying...`);
                                console.log('📊 Current completed modules:', progressData.progress?.completedModules?.map(m => m.m_id) || []);
                              }
                            } else {
                              console.log(`⏳ Progress not found on attempt ${i + 1}, retrying...`);
                            }
                            
                            // Wait before next attempt (except on last iteration)
                            if (i < 4) {
                              await new Promise(resolve => setTimeout(resolve, 600));
                            }
                          }
                          
                          if (progressData) {
                            // Dispatch progressUpdated event so lesson page can update immediately
                            console.log('📢 Dispatching progressUpdated event with data:', progressData);
                            window.dispatchEvent(new CustomEvent('progressUpdated', {
                              detail: {
                                courseName: courseName,
                                courseId: courseId,
                                lessonUnlockStatus: progressData.lessonUnlockStatus || [],
                                progress: progressData.progress
                              }
                            }));
                          } else {
                            console.warn('⚠️ Could not fetch progress data, but proceeding with navigation');
                          }
                          
                          // Additional delay to ensure event is processed
                          await new Promise(resolve => setTimeout(resolve, 500));
                        } catch (error) {
                          console.warn('⚠️ Could not refresh progress before navigation:', error);
                        }
                        
                        console.log('🚀 Navigating to next module:', nextMoId);
                        // Use React Router navigate instead of window.location for better state management
                        navigate(`/course/${courseId}/lesson/${nextMoId}`, { 
                          state: { refreshProgress: true, fromQuiz: true } 
                        });
                      }}
                      className="next-course-button"
                    >
                      Continue to Next Module
                    </button>
                  );
                } else {
                  // No more modules in this course - check if there's a next course or show certificate
                  const getNextCourse = () => {
                    if (allCourses.length === 0) return null;
                    
                    const currentCourseName = getCourseName();
                    const currentIndex = allCourses.findIndex(c => 
                      c.title === currentCourseName || c._id === courseId
                    );
                    
                    if (currentIndex >= 0 && currentIndex < allCourses.length - 1) {
                      return allCourses[currentIndex + 1];
                    }
                    return null;
                  };
                  
                  const nextCourse = getNextCourse();
                  
                  if (nextCourse) {
                    // There's a next course - show "Next Course" button
                    const nextCourseId = nextCourse.isStatic ? nextCourse.title : nextCourse._id;
                    
                    // Get first module of next course
                    const getFirstModuleId = () => {
                      if (nextCourse.isStatic) {
                        // For static courses, use the first module ID pattern
                        const staticModuleMap = {
                          'ISP': 'ISP01',
                          'GDPR': 'GDPR01',
                          'POSH': 'POSH01',
                          'Factory Act': 'FACT01',
                          'Welding': 'WELD01',
                          'CNC': 'CNC01',
                          'Excel': 'EXL01',
                          'VRU': 'VRU01'
                        };
                        return staticModuleMap[nextCourse.title] || null;
                      } else {
                        // For database courses, we need to fetch the course data
                        // Return null here, will fetch in onClick handler
                        return null;
                      }
                    };
                    
                    const firstModuleId = getFirstModuleId();
                    
                    return (
                      <div className="next-course-section">
                        <div className="completion-message">
                          Module completed! Check your dashboard for next steps.
                        </div>
                        <button
                          onClick={async () => {
                            if (firstModuleId) {
                              // Static course - navigate directly
                              navigate(`/course/${nextCourseId}/lesson/${firstModuleId}`);
                            } else {
                              // Database course - fetch course data to get first module
                              try {
                                const response = await fetch(`${API_ENDPOINTS.COURSES.GET_COURSE}/${nextCourseId}`, {
                                  method: 'GET',
                                  headers: { 'Content-Type': 'application/json' }
                                });
                                if (response.ok) {
                                  const courseData = await response.json();
                                  if (courseData.modules && courseData.modules.length > 0) {
                                    navigate(`/course/${nextCourseId}/lesson/${courseData.modules[0].m_id}`);
                                  } else {
                                    navigate(`/course/${nextCourseId}`);
                                  }
                                } else {
                                  navigate(`/course/${nextCourseId}`);
                                }
                              } catch (error) {
                                console.error('Error fetching next course:', error);
                                navigate(`/course/${nextCourseId}`);
                              }
                            }
                          }}
                          className="next-course-button"
                        >
                          Next Course: {nextCourse.title}
                        </button>
                      </div>
                    );
                  } else {
                    // No next course - show certificate button (last module of last course)
                    return (
                      <div className="certificate-section">
                        <div className="completion-message">
                          Congratulations! You have completed the entire {getCourseName()} course!
                        </div>
                        <button
                          onClick={() => {
                            // Store courseId and lessonId for back navigation
                            localStorage.setItem('certificateCourseId', courseId);
                            localStorage.setItem('certificateLessonId', mo_id);
                            
                            // Replace quiz page in history with lesson page, then navigate to certificate
                            // This ensures back button goes to lesson, not quiz
                            const lessonPath = `/course/${courseId}/lesson/${mo_id}`;
                            window.history.replaceState(
                              { page: 'lesson', courseId, lessonId: mo_id },
                              '',
                              lessonPath
                            );
                            
                            // Navigate to certificate page (this will push it to history)
                            navigate('/certificate');
                          }}
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
                            marginTop: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          View Your Certificate
                        </button>
                      </div>
                    );
                  }
                }
              })()}
            </>
          )}
        </div>
      </div>
    );
  }

  // Quiz view
  const currentQuestionData = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;

  return (
    <div className="quiz-container">
      {/* ✅ Title moved outside quiz-card */}
      <div className="quiz-title-left">
        <h2>{getCourseName()} QUIZ</h2>
      </div>

      <div className="quiz-card">
        <div className="quiz-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '10px' }}>
            <h1 className="question-text" style={{ margin: 0, flex: 1 }}>
              {currentQuestion + 1} . {currentQuestionData.question}
            </h1>
            {timeRemaining !== null && (
              <div 
                className="quiz-timer"
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  color: timeRemaining <= 60 ? '#dc3545' : timeRemaining <= 300 ? '#ffc107' : '#28a745',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: timeRemaining <= 60 ? '#fff5f5' : timeRemaining <= 300 ? '#fffbf0' : '#f0fdf4',
                  border: `2px solid ${timeRemaining <= 60 ? '#dc3545' : timeRemaining <= 300 ? '#ffc107' : '#28a745'}`,
                  minWidth: '80px',
                  textAlign: 'center'
                }}
              >
                ⏱️ {formatTime(timeRemaining)}
              </div>
            )}
          </div>
          {attemptNumber > 1 && (
            <div className="attempt-indicator">
              Retake Attempt {attemptNumber} 
            </div>
          )}
        </div>

        {/* Question image */}
        {currentQuestionData.imageUrl && (
          <div className="question-image-container">
            <img
              src={currentQuestionData.imageUrl}
              alt={`Question ${currentQuestion + 1} visual`}
              className="question-image"
            />
          </div>
        )}

        {/* Options */}
        <div className="options-container">
          {currentQuestionData.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleAnswerSelect(currentQuestionData.id, option.id)}
              className={`option-button ${
                selectedAnswers[currentQuestionData.id] === option.id ? 'selected' : ''
              }`}
            >
              {option.id}) {option.text}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="navigation-container">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className={`nav-button${currentQuestion === 0 ? '' : ' primary'}`}
          >
            Previous
          </button>

          <div className="progress-indicators">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`progress-dot ${
                  index === currentQuestion
                    ? 'current'
                    : index < currentQuestion
                    ? 'completed'
                    : 'upcoming'
                }`}
              />
            ))}
          </div>

          {isLastQuestion ? (
            <button onClick={handleSubmit} className="nav-button submit">SUBMIT</button>
          ) : (
            <button onClick={handleNext} className="nav-button primary">Next</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Quiz;
