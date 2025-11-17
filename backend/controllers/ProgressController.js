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
    const userEmail = (req.body.userEmail || req.user.email)?.trim();
    const courseName = req.body.courseName?.trim();
    const completedModules = req.body.completedModules || [];
    const lastAccessedModule = req.body.lastAccessedModule?.trim();

    console.log('📊 Extracted data (raw):', { 
      userEmail: req.body.userEmail || req.user.email, 
      courseName: req.body.courseName,
      lastAccessedModule: req.body.lastAccessedModule 
    });
    console.log('📊 Extracted data (normalized):', { userEmail, courseName, lastAccessedModule });

    if (!userEmail || !courseName || !lastAccessedModule) {
      return res.status(400).json({ success: false, message: 'userEmail, courseName, and lastAccessedModule are required' });
    }

    console.log('🔍 Querying for existing progress with:', { userEmail, courseName });
    let progress = await UserProgress.findOne({ userEmail, courseName });
    console.log('📊 Existing progress query result:', {
      found: !!progress,
      completedModules: progress?.completedModules?.map(m => m.m_id) || [],
      lastAccessedModule: progress?.lastAccessedModule
    });

    console.log('💾 Saving quiz progress:', {
      userEmail,
      courseName,
      lastAccessedModule,
      completedModules: completedModules,
      existingProgress: progress ? {
        completedModules: progress.completedModules.map(m => m.m_id),
        lastAccessedModule: progress.lastAccessedModule
      } : null
    });

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
        console.log('✅ Added new completed module:', lastAccessedModule);
      } else {
        console.log('ℹ️ Module already in completed list:', lastAccessedModule);
      }
      progress.lastAccessedModule = lastAccessedModule;
    }

    await progress.save();
    console.log('✅ Progress saved successfully:', {
      completedModules: progress.completedModules.map(m => m.m_id),
      lastAccessedModule: progress.lastAccessedModule,
      userEmail,
      courseName
    });

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

    // Reload progress from database to ensure we return the latest state
    const savedProgress = await UserProgress.findOne({ userEmail, courseName });
    console.log('📊 Reloaded progress from database:', {
      found: !!savedProgress,
      completedModules: savedProgress?.completedModules?.map(m => m.m_id) || [],
      lastAccessedModule: savedProgress?.lastAccessedModule,
      userEmail,
      courseName
    });

    res.status(200).json({ 
      success: true, 
      message: 'Progress saved successfully',
      progress: savedProgress,
      savedCourseName: courseName,
      savedUserEmail: userEmail
    });
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
    const userEmail = (req.query.userEmail || req.user.email)?.trim();
    const courseName = req.query.courseName?.trim();
    const courseId = req.query.courseId;
    
    console.log('📊 Query params (raw):', { 
      userEmail: req.query.userEmail || req.user.email,
      courseName: req.query.courseName,
      courseId 
    });
    console.log('📊 Query params (normalized):', { userEmail, courseName, courseId });
    
    if (!userEmail || !courseName) {
      return res.status(400).json({ success: false, message: 'userEmail and courseName are required' });
    }

    // Get user progress - try exact match first, then case-insensitive
    console.log('🔍 Querying progress with:', { userEmail, courseName, queryType: 'getUserProgressWithUnlocking' });
    let progress = await UserProgress.findOne({ userEmail, courseName });
    
    // If not found, try case-insensitive search
    if (!progress) {
      console.log('🔍 Progress not found with exact match, trying case-insensitive...');
      progress = await UserProgress.findOne({ 
        userEmail: new RegExp(`^${userEmail}$`, 'i'),
        courseName: new RegExp(`^${courseName}$`, 'i')
      });
    }
    console.log('📊 Progress query result:', {
      found: !!progress,
      completedModules: progress?.completedModules?.map(m => m.m_id) || [],
      lastAccessedModule: progress?.lastAccessedModule
    });
    
    // Get course data from database - check both common courses and assigned courses
    const CommonCourse = require('../models/common_courses');
    const Course = require('../models/Course');
    
    console.log('🔍 Looking for course with title:', courseName);
    let course = await CommonCourse.findOne({ title: courseName });
    if (!course) {
      console.log('🔍 Course not found by title, trying name:', courseName);
      course = await Course.findOne({ name: courseName });
    }
    
    if (!course) {
      console.log('❌ Course not found with title or name:', courseName);
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    console.log('✅ Course found:', { _id: course._id, title: course.title, name: course.name, modulesCount: course.modules?.length || 0 });

    const lessons = course.modules || [];
    const completedModules = progress ? progress.completedModules : [];
    const completedModuleIds = completedModules.map(mod => mod.m_id);
    
    console.log('📊 Progress calculation:', {
      totalLessons: lessons.length,
      completedModules: completedModules,
      completedModuleIds: completedModuleIds,
      courseModules: lessons.map((l, i) => ({ index: i, m_id: l.m_id, name: l.name || l.title }))
    });
    
    // Find the highest completed module number
    let highestCompletedIndex = -1;
    lessons.forEach((lesson, index) => {
      // Handle different module structures: common courses use m_id, assigned courses use title
      const lessonId = lesson.m_id || lesson.title;
      if (completedModuleIds.includes(lessonId)) {
        highestCompletedIndex = index;
        console.log(`✅ Found completed module at index ${index}: ${lessonId}`);
      }
    });
    
    // Determine which lessons and quizzes should be unlocked
    // Use sequential unlocking: each module unlocks only after the previous one is completed
    const lessonUnlockStatus = lessons.map((lesson, index) => {
      // Handle different module structures: common courses use m_id, assigned courses use title
      const lessonId = lesson.m_id || lesson.title;
      const lessonTitle = lesson.name || lesson.title;
      const isCompleted = completedModuleIds.includes(lessonId);
      
      // For sequential unlocking:
      // 1. First lesson (index 0) is always unlocked
      // 2. Each subsequent lesson requires the previous lesson to be completed
      let isUnlocked = false;
      let canTakeQuiz = false;
      
      if (index === 0) {
        // First lesson/quiz is always unlocked
        isUnlocked = true;
        canTakeQuiz = true;
      } else {
        // Check if the previous lesson (at index - 1) is completed
        const prevLesson = lessons[index - 1];
        const prevLessonId = prevLesson.m_id || prevLesson.title;
        const prevLessonCompleted = completedModuleIds.includes(prevLessonId);
        
        isUnlocked = prevLessonCompleted;
        canTakeQuiz = prevLessonCompleted;
        
        console.log(`🔍 Module ${index} (${lessonId}) unlock check:`, {
          prevLessonIndex: index - 1,
          prevLessonId: prevLessonId,
          prevLessonCompleted: prevLessonCompleted,
          prevLessonInCompletedList: completedModuleIds.includes(prevLessonId),
          allCompletedIds: completedModuleIds
        });
      }
      
      console.log(`🔍 Module ${index} (${lessonId}):`, {
        isUnlocked,
        isCompleted,
        canTakeQuiz,
        lessonTitle
      });
      
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
