const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  initializeAssignedCourseProgress,
  assignCourseToEmployee,
  updateAssignedCourseProgress,
  getEmployeeAssignedCourseProgress,
  getAllEmployeesAssignedCourseProgress,
  getEmployeeAssignedCourses,
  markAssignedCourseCompleted,
  removeAssignedCourse,
  getAssignedCourseStatistics,
  isCourseAssignedToEmployee
} = require('../assignedCourseUserProgressManager');

// Initialize assigned course progress for employee (called during registration)
router.post('/initialize', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Employee access required' });
    }

    const progress = await initializeAssignedCourseProgress(req.user.email);
    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error initializing assigned course progress:', error);
    res.status(500).json({ error: 'Failed to initialize progress', message: error.message });
  }
});

// Assign course to employee (admin only)
router.post('/assign-course', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { employeeEmail, courseName, deadline } = req.body;

    if (!employeeEmail || !courseName) {
      return res.status(400).json({ error: 'Employee email and course name are required' });
    }

    const progress = await assignCourseToEmployee(employeeEmail, courseName, req.user.id, deadline);
    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error assigning course:', error);
    res.status(500).json({ error: 'Failed to assign course', message: error.message });
  }
});

// Update assigned course progress (when module is completed)
router.patch('/update-progress', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Employee access required' });
    }

    const { courseName } = req.body;

    if (!courseName) {
      return res.status(400).json({ error: 'Course name is required' });
    }

    const progress = await updateAssignedCourseProgress(req.user.email, courseName);
    if (!progress) {
      return res.status(404).json({ error: 'Course not assigned to this employee' });
    }

    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error updating assigned course progress:', error);
    res.status(500).json({ error: 'Failed to update progress', message: error.message });
  }
});

// Get employee's assigned course progress
router.get('/employee-progress', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Employee access required' });
    }

    const progress = await getEmployeeAssignedCourseProgress(req.user.email);
    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error getting employee assigned course progress:', error);
    res.status(500).json({ error: 'Failed to get progress', message: error.message });
  }
});

// Get all employees' assigned course progress (admin only)
router.get('/all-employees-progress', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const allProgress = await getAllEmployeesAssignedCourseProgress();

// Get quiz completion status for a specific course
router.get('/quiz-completion-status/:courseName', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Employee access required' });
    }

    const { courseName } = req.params;
    const employeeEmail = req.user.email;

    console.log('🔍 Getting quiz completion status for:', { courseName, employeeEmail });

    // Get the course details to know total modules
    const Course = require('../models/Course');
    const course = await Course.findOne({ name: courseName });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    console.log('📚 Course found with modules:', course.modules.map(m => m.title));

    // Get user progress for this course (for lesson completion)
    const UserProgress = require('../models/Userprogress');
    const userProgress = await UserProgress.findOne({ userEmail: employeeEmail, courseName });
    
    // Get assigned course progress (for quiz completion)
    const AssignedCourseUserProgress = require('../models/AssignedCourseUserProgress');
    const assignedProgress = await AssignedCourseUserProgress.findOne({ employeeEmail });
    
    let completedModules = [];
    let isAssigned = false;
    let assignedProgressCount = 0;
    
    if (userProgress) {
      completedModules = userProgress.completedModules || [];
      console.log('📊 UserProgress completed modules:', completedModules.map(m => m.m_id));
    }
    
    if (assignedProgress) {
      const courseAssignment = assignedProgress.courseAssignments.find(
        assignment => assignment.courseName === courseName
      );
      isAssigned = !!courseAssignment;
      
      // Get the progress count for this course from the Map
      assignedProgressCount = assignedProgress.assignedCourseProgress.get(courseName) || 0;
      console.log('📊 AssignedCourseProgress count for', courseName, ':', assignedProgressCount);
    }

    // Create completion status for each module
    const moduleCompletionStatus = course.modules.map((module, index) => {
      const moduleId = module.title || `Module ${index + 1}`;
      
      // Check if lesson is completed (from UserProgress)
      const isLessonCompleted = completedModules.some(mod => mod.m_id === moduleId);
      
      // Check if quiz is completed (from AssignedCourseUserProgress)
      // If assignedProgressCount is greater than the module index, then this module's quiz is completed
      const isQuizCompleted = assignedProgressCount > index;
      
      // Overall completion (both lesson and quiz completed)
      const isCompleted = isLessonCompleted && isQuizCompleted;
      
      console.log(`📋 Module ${index + 1} (${moduleId}): lesson=${isLessonCompleted}, quiz=${isQuizCompleted}, overall=${isCompleted}`);
      
      return {
        moduleIndex: index,
        moduleId: moduleId,
        moduleTitle: module.title || `Module ${index + 1}`,
        isCompleted: isCompleted,
        isLessonCompleted: isLessonCompleted,
        isQuizCompleted: isQuizCompleted,
        completedAt: isCompleted ? completedModules.find(mod => mod.m_id === moduleId)?.completedAt : null
      };
    });

    console.log('📊 Final module completion status:', moduleCompletionStatus);

    res.json({
      success: true,
      courseName: courseName,
      totalModules: course.modules.length,
      completedModules: completedModules.length,
      assignedProgressCount: assignedProgressCount,
      moduleCompletionStatus: moduleCompletionStatus,
      isAssigned: isAssigned
    });

  } catch (error) {
    console.error('Error getting quiz completion status:', error);
    res.status(500).json({ error: 'Failed to get quiz completion status', message: error.message });
  }
});
    res.json({ success: true, progress: allProgress });
  } catch (error) {
    console.error('Error getting all employees assigned course progress:', error);
    res.status(500).json({ error: 'Failed to get all progress', message: error.message });
  }
});

// Get employee's assigned courses
router.get('/assigned-courses', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Employee access required' });
    }

    const assignedCourses = await getEmployeeAssignedCourses(req.user.email);
    res.json({ success: true, assignedCourses });
  } catch (error) {
    console.error('Error getting assigned courses:', error);
    res.status(500).json({ error: 'Failed to get assigned courses', message: error.message });
  }
});

// Validate an assigned course for the current employee (checks deadline and status)
router.get('/validate/:courseName', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Employee access required' });
    }

    const { courseName } = req.params;
    if (!courseName) {
      return res.status(400).json({ error: 'Course name is required' });
    }

    const progress = await getEmployeeAssignedCourseProgress(req.user.email);
    if (!progress) {
      return res.status(404).json({ error: 'No assigned progress found for the user' });
    }

    const assignment = progress.courseAssignments.find(a => a.courseName === courseName);
    if (!assignment) {
      return res.status(404).json({ error: 'Course not assigned to this employee' });
    }

    // Check for expiration
    if (assignment.deadline && Date.now() > new Date(assignment.deadline).getTime()) {
      return res.status(400).json({ valid: false, message: 'Assignment deadline passed' });
    }

    // Check for statuses that should block access
    if (assignment.status && (assignment.status === 'completed' || assignment.status === 'overdue')) {
      return res.status(403).json({ valid: false, message: 'Assignment status does not allow access' });
    }

    res.json({ valid: true, assignment });
  } catch (error) {
    console.error('Error validating assigned course:', error);
    res.status(500).json({ error: 'Failed to validate assigned course', message: error.message });
  }
});

// Mark assigned course as completed
router.patch('/mark-completed', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Employee access required' });
    }

    const { courseName } = req.body;

    if (!courseName) {
      return res.status(400).json({ error: 'Course name is required' });
    }

    const progress = await markAssignedCourseCompleted(req.user.email, courseName);
    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error marking course as completed:', error);
    res.status(500).json({ error: 'Failed to mark course as completed', message: error.message });
  }
});

// Remove assigned course from employee (admin only)
router.delete('/remove-course', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { employeeEmail, courseName } = req.body;

    if (!employeeEmail || !courseName) {
      return res.status(400).json({ error: 'Employee email and course name are required' });
    }

    const progress = await removeAssignedCourse(employeeEmail, courseName);
    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error removing assigned course:', error);
    res.status(500).json({ error: 'Failed to remove course', message: error.message });
  }
});

// Get assigned course statistics (admin only)
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const statistics = await getAssignedCourseStatistics();
    res.json({ success: true, statistics });
  } catch (error) {
    console.error('Error getting assigned course statistics:', error);
    res.status(500).json({ error: 'Failed to get statistics', message: error.message });
  }
});

// Check if course is assigned to employee
router.get('/check-assignment/:courseName', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Employee access required' });
    }

    const { courseName } = req.params;
    console.log(`🔍 Checking assignment for course: "${courseName}" and employee: ${req.user.email}`);
    
    const isAssigned = await isCourseAssignedToEmployee(req.user.email, courseName);
    console.log(`📊 Assignment result: ${isAssigned}`);
    
    res.json({ success: true, isAssigned });
  } catch (error) {
    console.error('Error checking course assignment:', error);
    res.status(500).json({ error: 'Failed to check assignment', message: error.message });
  }
});

module.exports = router; 
