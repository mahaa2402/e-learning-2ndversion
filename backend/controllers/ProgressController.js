const UserProgress = require('../models/Userprogress');
const { updateCourseProgress } = require('../commonUserProgressManager');
const { updateAssignedCourseProgress } = require('../assignedCourseUserProgressManager');
const { clearQuizTimestamp } = require('../commonUserProgressManager');

// Save progress after a quiz is completed
const saveQuizProgress = async (req, res) => {
  try {
    console.log('🔍 DEBUG: saveQuizProgress called');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 User:', req.user);
    
    // Accept userEmail and courseName for flexibility
    const userEmail = req.body.userEmail || req.user.email;
    const courseName = req.body.courseName;
    const completedModules = req.body.completedModules || [];
    const lastAccessedModule = req.body.lastAccessedModule;

    console.log('📊 Extracted data:', { userEmail, courseName, lastAccessedModule });

    if (!userEmail || !courseName || !lastAccessedModule) {
      return res.status(400).json({ success: false, message: 'userEmail, courseName, and lastAccessedModule are required' });
    }

    let progress = await UserProgress.findOne({ userEmail, courseName });

    if (!progress) {
      progress = new UserProgress({
        userEmail,
        courseName,
        completedModules: completedModules.length > 0 ? completedModules : [{ m_id: lastAccessedModule, completedAt: new Date() }],
        lastAccessedModule
      });
    } else {
      // Add to completedModules if not already present
      const alreadyCompleted = progress.completedModules.some(mod => mod.m_id === lastAccessedModule);
      if (!alreadyCompleted) {
        progress.completedModules.push({ m_id: lastAccessedModule, completedAt: new Date() });
      }
      progress.lastAccessedModule = lastAccessedModule;
    }

    await progress.save();

    // Update common user progress if this is a common course
    try {
      await updateCourseProgress(userEmail, courseName);
    } catch (error) {
      console.log('⚠️ Could not update common course progress:', error.message);
    }

    // Update assigned course progress if this course is assigned to the employee
    try {
      await updateAssignedCourseProgress(userEmail, courseName);
    } catch (error) {
      console.log('⚠️ Could not update assigned course progress:', error.message);
    }

    // Clear quiz cooldown timestamp since user passed the quiz
    try {
      await clearQuizTimestamp(userEmail, courseName);
      console.log('✅ Quiz cooldown cleared for user:', userEmail, 'course:', courseName);
    } catch (error) {
      console.log('⚠️ Could not clear quiz cooldown:', error.message);
    }

    res.status(200).json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save progress', error: error.message });
  }
};

// Get progress (used after login)
const getUserProgress = async (req, res) => {
  try {
    const userEmail = req.query.userEmail || req.user.email;
    const courseName = req.query.courseName;
    if (!userEmail || !courseName) {
      return res.status(400).json({ success: false, message: 'userEmail and courseName are required' });
    }
    const progress = await UserProgress.findOne({ userEmail, courseName });
    res.status(200).json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch progress', error: error.message });
  }
};

// Get user progress with lesson unlocking information
const getUserProgressWithUnlocking = async (req, res) => {
  try {
    const userEmail = req.query.userEmail || req.user.email;
    const courseName = req.query.courseName;
    const courseId = req.query.courseId;
    
    if (!userEmail || !courseName) {
      return res.status(400).json({ success: false, message: 'userEmail and courseName are required' });
    }

    // Get user progress
    const progress = await UserProgress.findOne({ userEmail, courseName });
    
    // Get course data from database - check both common courses and assigned courses
    const CommonCourse = require('../models/common_courses');
    const Course = require('../models/Course');
    
    let course = await CommonCourse.findOne({ title: courseName });
    if (!course) {
      course = await Course.findOne({ name: courseName });
    }
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const lessons = course.modules || [];
    const completedModules = progress ? progress.completedModules : [];
    const completedModuleIds = completedModules.map(mod => mod.m_id);
    
    // Find the highest completed module number
    let highestCompletedIndex = -1;
    lessons.forEach((lesson, index) => {
      // Handle different module structures: common courses use m_id, assigned courses use title
      const lessonId = lesson.m_id || lesson.title;
      if (completedModuleIds.includes(lessonId)) {
        highestCompletedIndex = index;
      }
    });
    
    // Determine which lessons and quizzes should be unlocked
    const lessonUnlockStatus = lessons.map((lesson, index) => {
      // Handle different module structures: common courses use m_id, assigned courses use title
      const lessonId = lesson.m_id || lesson.title;
      const lessonTitle = lesson.name || lesson.title;
      const isCompleted = completedModuleIds.includes(lessonId);
      
      // Lesson is unlocked if:
      // 1. It's the first lesson (index 0) OR
      // 2. The previous lesson has been completed
      const prevLessonId = index > 0 ? (lessons[index - 1].m_id || lessons[index - 1].title) : null;
      const isUnlocked = index === 0 || (index > 0 && completedModuleIds.includes(prevLessonId));
      
      // Quiz is available if:
      // 1. It's the first quiz (index 0) OR
      // 2. The previous quiz has been completed
      const canTakeQuiz = index === 0 || (index > 0 && completedModuleIds.includes(prevLessonId));
      
      console.log(`🔍 Module ${lessonId}: isUnlocked=${isUnlocked}, isCompleted=${isCompleted}, canTakeQuiz=${canTakeQuiz}`);
      
      return {
        lessonId,
        lessonTitle,
        isUnlocked,
        isCompleted,
        canTakeQuiz
      };
    });

    res.status(200).json({ 
      success: true, 
      progress,
      lessonUnlockStatus,
      totalLessons: lessons.length,
      completedLessons: completedModules.length
    });
  } catch (error) {
    console.error('Error getting user progress with unlocking:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch progress with unlocking info', error: error.message });
  }
};

module.exports = {
  saveQuizProgress,
  getUserProgress,
  getUserProgressWithUnlocking
};
