const express = require('express');
const router = express.Router();
const Common_Course = require('../models/common_courses');
const {getcourse}=require('../controllers/User')

const Quiz=require('../models/Quiz');

// Log route registration
console.log('✅ Course routes module loaded');
console.log('✅ PUT /update/:courseId route will be registered');

// Debug middleware to see all requests to this router
router.use((req, res, next) => {
  if (req.method === 'PUT' && req.path.includes('update')) {
    console.log('🔍 Router middleware - PUT request detected');
    console.log('🔍 req.method:', req.method);
    console.log('🔍 req.path:', req.path);
    console.log('🔍 req.originalUrl:', req.originalUrl);
    console.log('🔍 req.baseUrl:', req.baseUrl);
    console.log('🔍 req.route:', req.route ? req.route.path : 'NO ROUTE MATCHED YET');
  }
  next();
});
// GET /api/courses - Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch courses', message: err.message });
  }
});

// POST /api/courses - Create a new course
router.post('/', async (req, res) => {
  try {
    const newCourse = new Course(req.body);
    const savedCourse = await newCourse.save();
    res.status(201).json(savedCourse);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create course', message: err.message });
  }
});

router.get('/getcourse', async (req, res) => {
  try {
    const courses = await Common_Course.find({});
    console.log("Fetched courses with modules:", courses.length);
    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/courses/create - Create a new common course
router.post('/create', async (req, res) => {
  try {
    console.log('🔍 Creating common course:', req.body);
    
    const { title, description, modules, backgroundImageUrl, retakeQuizCooldownHours } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Course title is required' });
    }

    if (!modules || !Array.isArray(modules) || modules.length === 0) {
      return res.status(400).json({ error: 'At least one module is required' });
    }

    // Validate modules
    for (const module of modules) {
      if (!module.m_id || !module.name) {
        return res.status(400).json({ error: 'Each module must have m_id and name' });
      }
    }

    // Check if course with same title already exists
    const existingCourse = await Common_Course.findOne({ title });
    if (existingCourse) {
      return res.status(400).json({ error: 'Course with this title already exists' });
    }

    const newCourse = new Common_Course({
      title,
      description: description || '',
      backgroundImageUrl: backgroundImageUrl || null,
      retakeQuizCooldownHours: retakeQuizCooldownHours || 24,
      modules: modules.map(module => {
        const moduleData = {
          m_id: module.m_id,
          name: module.name,
          duration: module.duration || 0,
          description: module.description || '',
          lessons: module.lessons || 1
        };
        
        // Include lesson details if provided
        if (module.lessonDetails) {
          moduleData.lessonDetails = {
            title: module.lessonDetails.title || module.name,
            videoUrl: module.lessonDetails.videoUrl || null,
            content: module.lessonDetails.content || [],
            duration: module.lessonDetails.duration || `${module.duration || 0}min`,
            notes: module.lessonDetails.notes || ''
          };
          console.log(`📋 Module ${module.m_id} lessonDetails:`, moduleData.lessonDetails);
        }
        
        return moduleData;
      })
    });
    
    console.log('📋 Course modules before save:', JSON.stringify(newCourse.modules.map(m => ({
      m_id: m.m_id,
      name: m.name,
      hasLessonDetails: !!m.lessonDetails,
      videoUrl: m.lessonDetails?.videoUrl
    })), null, 2));

    const savedCourse = await newCourse.save();
    console.log('✅ Common course created successfully:', savedCourse._id);

    res.status(201).json({
      success: true,
      message: 'Common course created successfully',
      course: savedCourse
    });
  } catch (error) {
    console.error('❌ Error creating common course:', error);
    res.status(500).json({ 
      error: 'Failed to create common course', 
      message: error.message 
    });
  }
});

router.post('/getcoursedetailpage',getcourse)

// Test route to verify update endpoint is accessible
router.get('/update-test/:courseId', async (req, res) => {
  res.json({ message: 'Update route is accessible', courseId: req.params.courseId });
});

// PUT /api/courses/update/:courseId - Update an existing common course
// IMPORTANT: This route must be defined before the catch-all /:courseId route
router.put('/update/:courseId', async (req, res, next) => {
  console.log('🔄 ========================================');
  console.log('🔄 PUT /update/:courseId route hit!');
  console.log('🔄 Request method:', req.method);
  console.log('🔄 Request originalUrl:', req.originalUrl);
  console.log('🔄 Request path:', req.path);
  console.log('🔄 Request baseUrl:', req.baseUrl);
  console.log('🔄 Request params:', req.params);
  console.log('🔄 Updating common course:', req.params.courseId);
  console.log('🔄 Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔄 ========================================');
  
  try {
    
    const { courseId } = req.params;
    const { title, description, modules, backgroundImageUrl, retakeQuizCooldownHours } = req.body;

    // Validate courseId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    // Find the existing course
    const existingCourse = await Common_Course.findById(courseId);
    if (!existingCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (!title) {
      return res.status(400).json({ error: 'Course title is required' });
    }

    if (!modules || !Array.isArray(modules) || modules.length === 0) {
      return res.status(400).json({ error: 'At least one module is required' });
    }

    // Validate modules
    for (const module of modules) {
      if (!module.m_id || !module.name) {
        return res.status(400).json({ error: 'Each module must have m_id and name' });
      }
    }

    // Check if another course with the same title exists (excluding current course)
    const duplicateCourse = await Common_Course.findOne({ 
      title, 
      _id: { $ne: courseId } 
    });
    if (duplicateCourse) {
      return res.status(400).json({ error: 'Another course with this title already exists' });
    }

    // Update the course
    existingCourse.title = title;
    existingCourse.description = description || '';
    if (backgroundImageUrl !== undefined) {
      existingCourse.backgroundImageUrl = backgroundImageUrl || null;
    }
    if (retakeQuizCooldownHours !== undefined) {
      existingCourse.retakeQuizCooldownHours = retakeQuizCooldownHours || 24;
    }
    existingCourse.modules = modules.map(module => {
      // Find existing module to preserve its lessonDetails if new one doesn't have videoUrl
      const existingModule = existingCourse.modules.find(m => m.m_id === module.m_id);
      
      const moduleData = {
        m_id: module.m_id,
        name: module.name,
        duration: module.duration || 0,
        description: module.description || '',
        lessons: module.lessons || 1
      };
      
      // Include lesson details if provided
      if (module.lessonDetails) {
        moduleData.lessonDetails = {
          title: module.lessonDetails.title || module.name,
          videoUrl: module.lessonDetails.videoUrl || null,
          content: module.lessonDetails.content || [],
          duration: module.lessonDetails.duration || `${module.duration || 0}min`,
          notes: module.lessonDetails.notes || module.notes || ''
        };
        console.log(`📋 Module ${module.m_id} lessonDetails:`, moduleData.lessonDetails);
      } else if (existingModule && existingModule.lessonDetails) {
        // Preserve existing lessonDetails if new module doesn't have it
        console.log(`📋 Preserving existing lessonDetails for module ${module.m_id}`);
        moduleData.lessonDetails = { ...existingModule.lessonDetails };
        // Update notes if provided directly on module
        if (module.notes !== undefined) {
          moduleData.lessonDetails.notes = module.notes;
        }
        // Log if videoUrl is missing
        if (!moduleData.lessonDetails.videoUrl) {
          console.warn(`⚠️ Module ${module.m_id} has lessonDetails but no videoUrl - video may not display`);
        }
      } else if (module.notes) {
        // If notes are provided but no lessonDetails, create lessonDetails with notes
        moduleData.lessonDetails = {
          title: module.name,
          videoUrl: null,
          content: [],
          duration: `${module.duration || 0}min`,
          notes: module.notes
        };
        console.log(`📋 Created lessonDetails for module ${module.m_id} with notes`);
      } else {
        // If no lessonDetails at all, check if we should create empty structure
        // This ensures the structure exists for future video uploads
        console.log(`📋 Module ${module.m_id} has no lessonDetails - will be created when video is uploaded`);
      }
      
      return moduleData;
    });

    const updatedCourse = await existingCourse.save();
    console.log('✅ Common course updated successfully:', updatedCourse._id);

    res.status(200).json({
      success: true,
      message: 'Common course updated successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('❌ Error updating common course:', error);
    res.status(500).json({ 
      error: 'Failed to update common course', 
      message: error.message 
    });
  }
});

// DELETE /api/courses/delete/:courseId - Delete a common course
// IMPORTANT: This route must be defined before the catch-all /:courseId route
router.delete('/delete/:courseId', async (req, res) => {
  try {
    console.log('🗑️ DELETE route hit!');
    console.log('🗑️ Request method:', req.method);
    console.log('🗑️ Request path:', req.path);
    console.log('🗑️ Request params:', req.params);
    
    const { courseId } = req.params;
    
    console.log('🗑️ Deleting course:', courseId);
    
    // Validate courseId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }
    
    // Find and delete the course
    const course = await Common_Course.findByIdAndDelete(courseId);
    
    if (!course) {
      return res.status(404).json({ 
        error: 'Course not found',
        message: `Course with ID '${courseId}' not found`
      });
    }
    
    console.log('✅ Course deleted successfully:', course.title);
    
    res.json({
      success: true,
      message: 'Course deleted successfully',
      deletedCourse: {
        _id: course._id,
        title: course.title
      }
    });
  } catch (error) {
    console.error('❌ Error deleting course:', error);
    res.status(500).json({ 
      error: 'Failed to delete course', 
      message: error.message 
    });
  }
});

// GET /api/courses/lesson/:courseId/:lessonId - Get lesson data for a specific course and lesson
router.get('/lesson/:courseId/:lessonId', async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    
    console.log('🔍 Fetching lesson data:', { courseId, lessonId });
    
    const mongoose = require('mongoose');
    let course = null;
    
    // Try to find course by ID first (only if it's a valid ObjectId)
    if (mongoose.Types.ObjectId.isValid(courseId)) {
      try {
        course = await Common_Course.findById(courseId);
        console.log('📋 Course lookup by ID result:', course ? 'Found' : 'Not found');
      } catch (err) {
        console.log('⚠️ Error finding by ID (might not be valid ObjectId):', err.message);
      }
    } else {
      console.log('⚠️ courseId is not a valid MongoDB ObjectId, trying title lookup');
    }
    
    // If not found by ID, try to find by title (for backward compatibility)
    if (!course) {
      course = await Common_Course.findOne({ title: courseId });
      console.log('📋 Course lookup by title result:', course ? 'Found' : 'Not found');
    }
    
    if (!course) {
      console.log('❌ Course not found with ID or title:', courseId);
      return res.status(404).json({ 
        error: 'Course not found',
        message: `Course with ID or title '${courseId}' not found in database`
      });
    }
    
    // Find the module that matches the lessonId (m_id)
    const module = course.modules.find(mod => mod.m_id === lessonId);
    
    if (!module) {
      return res.status(404).json({ 
        error: 'Lesson not found',
        message: `Lesson with ID '${lessonId}' not found in course '${course.title}'`
      });
    }
    
    // Return lesson data in the format expected by the frontend
    const lessonData = {
      courseId: course._id.toString(),
      courseName: course.title,
      lessonId: module.m_id,
      title: module.lessonDetails?.title || module.name,
      videoUrl: module.lessonDetails?.videoUrl || null,
      content: module.lessonDetails?.content || [],
      duration: module.lessonDetails?.duration || `${module.duration}min`,
      notes: module.lessonDetails?.notes || '',
      moduleName: module.name,
      moduleDescription: module.description
    };
    
    console.log('✅ Lesson data fetched successfully');
    res.json(lessonData);
  } catch (error) {
    console.error('❌ Error fetching lesson data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch lesson data', 
      message: error.message 
    });
  }
});

// POST /api/courses/create-quiz - Create quiz for a module
router.post('/create-quiz', async (req, res) => {
  try {
    console.log('🔍 Creating quiz:', req.body);
    
    const { courseId, mo_id, questions, firstAttemptQuestions, retakeQuestions, passingScore } = req.body;

    if (!courseId || !mo_id) {
      return res.status(400).json({ error: 'courseId and mo_id are required' });
    }

    // Check if course exists
    const course = await Common_Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if module exists in course
    const moduleExists = course.modules.some(mod => mod.m_id === mo_id);
    if (!moduleExists) {
      return res.status(400).json({ error: `Module with m_id '${mo_id}' not found in course` });
    }

    // Check if quiz already exists for this module
    const existingQuiz = await Quiz.findOne({ courseId, mo_id });
    
    // Helper function to map question data
    const mapQuestion = (q) => ({
      question: q.question,
      type: q.type || 'multiple-choice',
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      points: q.points || 1,
      imageUrl: q.imageUrl || null
    });

    if (existingQuiz) {
      // Update existing quiz with new structure
      if (firstAttemptQuestions && retakeQuestions) {
        // New structure: separate question sets
        existingQuiz.firstAttemptQuestions = firstAttemptQuestions.map(mapQuestion);
        existingQuiz.retakeQuestions = retakeQuestions.map(mapQuestion);
      } else if (questions) {
        // Old structure: backward compatibility
        existingQuiz.questions = questions.map(mapQuestion);
      } else {
        return res.status(400).json({ error: 'Either questions or both firstAttemptQuestions and retakeQuestions are required' });
      }
      existingQuiz.passingScore = passingScore || 70;
      existingQuiz.updatedAt = new Date();
      const updatedQuiz = await existingQuiz.save();
      console.log('✅ Quiz updated successfully:', updatedQuiz._id);
      return res.status(200).json({
        success: true,
        message: 'Quiz updated successfully',
        quiz: updatedQuiz
      });
    }

    // Create new quiz
    if (firstAttemptQuestions && retakeQuestions) {
      // New structure: separate question sets
      if (!Array.isArray(firstAttemptQuestions) || firstAttemptQuestions.length === 0) {
        return res.status(400).json({ error: 'At least one first attempt question is required' });
      }
      if (!Array.isArray(retakeQuestions) || retakeQuestions.length === 0) {
        return res.status(400).json({ error: 'At least one retake question is required' });
      }
      
      const newQuiz = new Quiz({
        courseId,
        mo_id,
        firstAttemptQuestions: firstAttemptQuestions.map(mapQuestion),
        retakeQuestions: retakeQuestions.map(mapQuestion),
        passingScore: passingScore || 70
      });
      
      const savedQuiz = await newQuiz.save();
      console.log('✅ Quiz created successfully with new structure:', savedQuiz._id);
      return res.status(201).json({
        success: true,
        message: 'Quiz created successfully',
        quiz: savedQuiz
      });
    } else if (questions) {
      // Old structure: backward compatibility
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'At least one question is required' });
      }
      
      const newQuiz = new Quiz({
        courseId,
        mo_id,
        questions: questions.map(mapQuestion),
        passingScore: passingScore || 70
      });
      
      const savedQuiz = await newQuiz.save();
      console.log('✅ Quiz created successfully with old structure:', savedQuiz._id);
      return res.status(201).json({
        success: true,
        message: 'Quiz created successfully',
        quiz: savedQuiz
      });
    } else {
      return res.status(400).json({ error: 'Either questions or both firstAttemptQuestions and retakeQuestions are required' });
    }
  } catch (error) {
    console.error('❌ Error creating quiz:', error);
    res.status(500).json({ 
      error: 'Failed to create quiz', 
      message: error.message 
    });
  }
});

// POST endpoint for quiz questions
router.post('/questions', async (req, res) => {  // POST /api/quiz/questions
  const { courseId, moduleId, attemptNumber  } = req.body;
  console.log("start with sarvaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")

  console.log('🔍 POST Quiz endpoint called with:', { courseId, moduleId, attemptNumber });

  // if (!courseId || !moduleId) {
  //   console.log('❌ Missing required fields');
  //   return res.status(400).json({ error: 'courseId and moduleId are required' });
  // }

  try {
    // First, let's check if there are any quizzes in the database
    const totalQuizzes = await Quiz.countDocuments();
    console.log('📊 Total quizzes in database:', totalQuizzes);
    
    // Check if there are quizzes for this specific course
    const courseQuizzes = await Quiz.find({ courseId });
    console.log('📚 Quizzes for this course:', courseQuizzes.length);
    console.log('📚 Course quiz details:', courseQuizzes.map(q => ({ courseId: q.courseId, mo_id: q.mo_id })));
    
    // Use the new batch method to get questions based on attempt number
    const quiz = await Quiz.getQuestionsByCourseAndModuleBatch(courseId, moduleId, attemptNumber);
    
    console.log("🎯 Quiz result:", quiz);
    if (!quiz) {
      console.log('❌ No quiz found for:', { courseId, moduleId, attemptNumber });
      return res.status(404).json({ error: 'Quiz not found' });
    }

    console.log('✅ Returning questions:', quiz.questions.length);
    res.json(quiz.questions); // returns the array of questions
  } catch (err) {
    console.error('💥 Error in quiz endpoint:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET endpoint for quiz questions (fallback)
router.get('/questions', async (req, res) => {
  const { courseId, moduleId, attemptNumber = 1 } = req.query;

  console.log('🔍 GET Quiz endpoint called with:', { courseId, moduleId, attemptNumber });

  if (!courseId || !moduleId) {
    console.log('❌ Missing required fields in query');
    return res.status(400).json({ error: 'courseId and moduleId are required as query parameters' });
  }

  try {
    // First, let's check if there are any quizzes in the database
    const totalQuizzes = await Quiz.countDocuments();
    console.log('📊 Total quizzes in database:', totalQuizzes);
    
    // Check if there are quizzes for this specific course
    const courseQuizzes = await Quiz.find({ courseId });
    console.log('📚 Quizzes for this course:', courseQuizzes.length);
    console.log('📚 Course quiz details:', courseQuizzes.map(q => ({ courseId: q.courseId, mo_id: q.mo_id })));
    
    // Use the new batch method to get questions based on attempt number
    const quiz = await Quiz.getQuestionsByCourseAndModuleBatch(courseId, moduleId, parseInt(attemptNumber));
    
    console.log("🎯 Quiz result:", quiz);
    if (!quiz) {
      console.log('❌ No quiz found for:', { courseId, moduleId, attemptNumber });
      return res.status(404).json({ error: 'Quiz not found' });
    }

    console.log('✅ Returning questions:', quiz.questions.length);
    res.json(quiz.questions); // returns the array of questions
  } catch (err) {
    console.error('💥 Error in quiz endpoint:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});




// Debug endpoint to check database contents
router.get('/debug-quizzes', async (req, res) => {
  try {
    console.log('🔍 Debug endpoint called');
    
    // Check total quizzes
    const totalQuizzes = await Quiz.countDocuments();
    console.log('📊 Total quizzes in database:', totalQuizzes);
    
    // Get all quizzes
    const allQuizzes = await Quiz.find({});
    console.log('📚 All quizzes:', allQuizzes.map(q => ({
      id: q._id,
      courseId: q.courseId,
      mo_id: q.mo_id,
      questionCount: q.questions.length
    })));
    
    // Get all courses
    const allCourses = await Course.find({});
    console.log('📖 All courses:', allCourses.map(c => ({
      id: c._id,
      title: c.title,
      modules: c.modules.map(m => ({ m_id: m.m_id, name: m.name }))
    })));
    
    res.json({
      totalQuizzes,
      quizzes: allQuizzes.map(q => ({
        id: q._id,
        courseId: q.courseId,
        mo_id: q.mo_id,
        questionCount: q.questions.length
      })),
      courses: allCourses.map(c => ({
        id: c._id,
        title: c.title,
        modules: c.modules.map(m => ({ m_id: m.m_id, name: m.name }))
      }))
    });
    
  } catch (err) {
    console.error('💥 Error in debug endpoint:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Quiz timestamp validation endpoints
router.post('/check-quiz-availability', async (req, res) => {
  const { courseName } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  if (!courseName) {
    return res.status(400).json({ error: 'courseName is required' });
  }
  
  try {
    // Verify token and get employee email
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const employeeEmail = decoded.email;
    
    console.log(`🔍 Checking quiz availability for ${employeeEmail} - ${courseName}`);
    
    // Fetch course to get retakeQuizCooldownHours
    const Common_Course = require('../models/common_courses');
    const course = await Common_Course.findOne({ title: courseName });
    const cooldownHours = course?.retakeQuizCooldownHours || 24;
    console.log(`⏰ Course cooldown setting: ${cooldownHours} hours`);
    
    const { canTakeQuiz, getQuizCooldownRemaining } = require('../commonUserProgressManager');
    
    const canTake = await canTakeQuiz(employeeEmail, courseName, cooldownHours);
    const cooldown = await getQuizCooldownRemaining(employeeEmail, courseName, cooldownHours);
    
    console.log(`📊 Quiz availability result:`, { canTake, cooldown, cooldownHours });
    
    res.json({
      canTake,
      cooldown,
      cooldownHours, // Include cooldown hours in response for frontend
      message: canTake ? 'Quiz is available' : 'Quiz is not available yet'
    });
    
  } catch (error) {
    console.error('❌ Error checking quiz availability:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.post('/update-quiz-timestamp', async (req, res) => {
  const { courseName } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  if (!courseName) {
    return res.status(400).json({ error: 'courseName is required' });
  }
  
  try {
    // Verify token and get employee email
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const employeeEmail = decoded.email;
    
    console.log(`⏰ Updating quiz timestamp for ${employeeEmail} - ${courseName}`);
    
    const { updateQuizTimestamp } = require('../commonUserProgressManager');
    
    const result = await updateQuizTimestamp(employeeEmail, courseName);
    
    console.log(`✅ Quiz timestamp updated successfully`);
    
    res.json({
      success: true,
      message: 'Quiz timestamp updated',
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Error updating quiz timestamp:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Debug middleware removed - was causing path-to-regexp errors
// The route should work without this middleware

// GET /api/courses/:courseId - Get full course data with all modules
// NOTE: This route MUST be last because it's a catch-all parameterized route
router.get('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    
    console.log('🔍 Fetching course data:', { courseId });
    
    // Check if courseId looks like a MongoDB ObjectId (24 hex characters)
    const mongoose = require('mongoose');
    let course = null;
    
    // Try to find course by ID first (only if it's a valid ObjectId)
    if (mongoose.Types.ObjectId.isValid(courseId)) {
      try {
        course = await Common_Course.findById(courseId);
        console.log('📋 Course lookup by ID result:', course ? 'Found' : 'Not found');
      } catch (err) {
        console.log('⚠️ Error finding by ID (might not be valid ObjectId):', err.message);
      }
    } else {
      console.log('⚠️ courseId is not a valid MongoDB ObjectId, trying title lookup');
    }
    
    // If not found by ID, try to find by title
    if (!course) {
      course = await Common_Course.findOne({ title: courseId });
      console.log('📋 Course lookup by title result:', course ? 'Found' : 'Not found');
    }
    
    if (!course) {
      console.log('❌ Course not found with ID or title:', courseId);
      return res.status(404).json({ 
        error: 'Course not found',
        message: `Course with ID or title '${courseId}' not found in database`
      });
    }
    
    // Transform course data to match the format expected by frontend
    const courseData = {
      _id: course._id.toString(),
      title: course.title,
      description: course.description,
      name: course.title, // For compatibility with static data format
      lessons: {},
      modules: course.modules // Include modules array for quiz page to check final module
    };
    
    // Convert modules to lessons format
    course.modules.forEach(module => {
      if (module.m_id) {
        // Include all modules, even if they don't have lessonDetails
        courseData.lessons[module.m_id] = {
          m_id: module.m_id,
          title: module.lessonDetails?.title || module.name,
          videoUrl: module.lessonDetails?.videoUrl || null,
          content: module.lessonDetails?.content || [],
          duration: module.lessonDetails?.duration || `${module.duration || 0}min`,
          notes: module.lessonDetails?.notes || ''
        };
        console.log(`📹 Module ${module.m_id} - videoUrl: ${module.lessonDetails?.videoUrl || 'null'}`);
      }
    });
    
    console.log('✅ Course data fetched successfully');
    res.json(courseData);
  } catch (error) {
    console.error('❌ Error fetching course data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch course data', 
      message: error.message 
    });
  }
});

// Log that all routes are registered
console.log('✅ All Course routes registered, including PUT /update/:courseId');

// Debug: List all registered routes
router.stack.forEach((r) => {
  if (r.route) {
    const methods = Object.keys(r.route.methods).join(',').toUpperCase();
    console.log(`   ${methods} ${r.route.path}`);
  }
});

module.exports = router;
