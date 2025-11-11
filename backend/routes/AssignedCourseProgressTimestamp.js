const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  initializeAssignedCourseTimestampProgress,
  assignCourseTimestampToEmployee,
  updateAssignedCourseTimestamp,
  getEmployeeAssignedCourseTimestampProgress,
  getAllEmployeesAssignedCourseTimestampProgress,
  getEmployeeAssignedCourseTimestamps,
  markAssignedCourseTimestampCompleted,
  removeAssignedCourseTimestamp,
  getAssignedCourseTimestampStatistics,
  isCourseTimestampAssignedToEmployee
} = require('../assignedCourseProgressTimestampManager');

// Initialize assigned course timestamp progress for employee (called during registration)
router.post('/initialize', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Employee access required' });
    }

    const progress = await initializeAssignedCourseTimestampProgress(req.user.email);
    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error initializing assigned course timestamp progress:', error);
    res.status(500).json({ error: 'Failed to initialize timestamp progress', message: error.message });
  }
});

// Assign course timestamp to employee (admin only)
router.post('/assign-course-timestamp', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { employeeEmail, courseName, deadline } = req.body;

    if (!employeeEmail || !courseName) {
      return res.status(400).json({ error: 'Employee email and course name are required' });
    }

    const progress = await assignCourseTimestampToEmployee(employeeEmail, courseName, req.user.id, deadline);
    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error assigning course timestamp:', error);
    res.status(500).json({ error: 'Failed to assign course timestamp', message: error.message });
  }
});

// Update assigned course timestamp (when module is completed)
router.patch('/update-timestamp', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Employee access required' });
    }

    const { courseName } = req.body;
    if (!courseName) {
      return res.status(400).json({ error: 'Course name is required' });
    }

    const progress = await updateAssignedCourseTimestamp(req.user.email, courseName);
    if (!progress) {
      return res.status(404).json({ error: 'Course not found or not assigned' });
    }

    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error updating assigned course timestamp:', error);
    res.status(500).json({ error: 'Failed to update timestamp', message: error.message });
  }
});

// Get employee's assigned course timestamp progress
router.get('/employee/:employeeEmail', authenticateToken, async (req, res) => {
  try {
    const { employeeEmail } = req.params;
    
    // Check if user is requesting their own progress or is an admin
    if (req.user.role !== 'admin' && req.user.email !== employeeEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const progress = await getEmployeeAssignedCourseTimestampProgress(employeeEmail);
    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error getting employee assigned course timestamp progress:', error);
    res.status(500).json({ error: 'Failed to get timestamp progress', message: error.message });
  }
});

// Get all employees' assigned course timestamp progress (admin only)
router.get('/all-employees', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const allProgress = await getAllEmployeesAssignedCourseTimestampProgress();
    res.json({ success: true, progress: allProgress });
  } catch (error) {
    console.error('Error getting all employees assigned course timestamp progress:', error);
    res.status(500).json({ error: 'Failed to get all timestamp progress', message: error.message });
  }
});

// Get employee's assigned courses with timestamps
router.get('/employee/:employeeEmail/courses', authenticateToken, async (req, res) => {
  try {
    const { employeeEmail } = req.params;
    
    // Check if user is requesting their own courses or is an admin
    if (req.user.role !== 'admin' && req.user.email !== employeeEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const courses = await getEmployeeAssignedCourseTimestamps(employeeEmail);
    res.json({ success: true, courses });
  } catch (error) {
    console.error('Error getting employee assigned course timestamps:', error);
    res.status(500).json({ error: 'Failed to get course timestamps', message: error.message });
  }
});

// Mark assigned course timestamp as completed
router.patch('/mark-completed', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Employee access required' });
    }

    const { courseName } = req.body;
    if (!courseName) {
      return res.status(400).json({ error: 'Course name is required' });
    }

    const progress = await markAssignedCourseTimestampCompleted(req.user.email, courseName);
    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error marking assigned course timestamp as completed:', error);
    res.status(500).json({ error: 'Failed to mark timestamp as completed', message: error.message });
  }
});

// Remove assigned course timestamp (admin only)
router.delete('/remove-course-timestamp', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { employeeEmail, courseName } = req.body;
    if (!employeeEmail || !courseName) {
      return res.status(400).json({ error: 'Employee email and course name are required' });
    }

    const progress = await removeAssignedCourseTimestamp(employeeEmail, courseName);
    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error removing assigned course timestamp:', error);
    res.status(500).json({ error: 'Failed to remove course timestamp', message: error.message });
  }
});

// Get assigned course timestamp statistics (admin only)
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = await getAssignedCourseTimestampStatistics();
    res.json({ success: true, statistics: stats });
  } catch (error) {
    console.error('Error getting assigned course timestamp statistics:', error);
    res.status(500).json({ error: 'Failed to get timestamp statistics', message: error.message });
  }
});

// Check if a course is assigned to an employee in timestamp collection
router.get('/check-assignment/:employeeEmail/:courseName', authenticateToken, async (req, res) => {
  try {
    const { employeeEmail, courseName } = req.params;
    
    // Check if user is checking their own assignment or is an admin
    if (req.user.role !== 'admin' && req.user.email !== employeeEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const isAssigned = await isCourseTimestampAssignedToEmployee(employeeEmail, courseName);
    res.json({ success: true, isAssigned });
  } catch (error) {
    console.error('Error checking course timestamp assignment:', error);
    res.status(500).json({ error: 'Failed to check assignment', message: error.message });
  }
});

module.exports = router;


