const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const AssignedCourseUserProgress = require('../models/AssignedCourseUserProgress');
const AssignedCourseProgressTimestamp = require('../models/AssignedCourseProgressTimestamp');
const EmployeeProgress = require('../models/EmployeeProgress');
const UserProgress = require('../models/Userprogress');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Certificate } = require('../controllers/CertificateController'); // Import from CertificateController
const { initializeEmployeeProgress, CommonUserProgress } = require('../commonUserProgressManager');
const { initializeAssignedCourseProgress } = require('../assignedCourseUserProgressManager');
const { sendEmployeeWelcomeEmail } = require('../services/emailService');

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';


// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Simple admin guard based on JWT payload
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
};
// GET /api/profile - Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // req.user should contain the user ID from the JWT token
    const userId = req.user.id || req.user._id || req.user.userId;
    
    console.log('Fetching profile for user ID:', userId); // Debug log
    
    // Find employee and exclude sensitive information like password
    const employee = await Employee.findById(userId).select('-password -__v');
    
    if (!employee) {
      console.log('Employee not found for ID:', userId); // Debug log
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }
    
    console.log('Found employee:', employee.name || employee.firstName); // Debug log
    
    // Return user profile with multiple name options for frontend compatibility
    res.status(200).json({
      success: true,
      data: employee,
      // Provide different name formats for frontend flexibility
      name: employee.name || employee.firstName || employee.username || employee.email,
      username: employee.username || employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      department: employee.department,
      role: employee.role
    });
    
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch employee profile',
      error: error.message 
    });
  }
});

// PUT /api/profile - Update current user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated through this endpoint
    delete updates.password;
    delete updates._id;
    delete updates.__v;
    
    // Find employee and update
    const employee = await Employee.findByIdAndUpdate(
      userId, 
      updates, 
      { new: true, runValidators: true }
    ).select('-password -__v');
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: employee
    });
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user profile',
      error: error.message 
    });
  }
});

// GET /api/user-stats - Get current user statistics
router.get('/user-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    // Basic stats - you can expand this based on your Task/Assignment models
    const stats = {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      certificates: 0,
      quizzesCompleted: 0
    };
    
    // If you have Task/Assignment models, you can fetch actual statistics here
    // Example:
    // const Task = require('../models/Task');
    // const totalTasks = await Task.countDocuments({ assignedTo: userId });
    // const completedTasks = await Task.countDocuments({ assignedTo: userId, status: 'completed' });
    // stats.totalTasks = totalTasks;
    // stats.completedTasks = completedTasks;
    // stats.pendingTasks = totalTasks - completedTasks;
    
    res.status(200).json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user statistics',
      error: error.message 
    });
  }
});

// GET /api/employees-for-assignment - Get all employees for assignment (formatted, no password)
router.get('/employees-for-assignment', async (req, res) => {
  try {
    const employees = await Employee.find({}, 'name email department _id').sort({ name: 1 });
    const formattedEmployees = employees.map(emp => ({
      id: emp._id.toString(),
      value: emp._id.toString(),
      label: `${emp.name} (${emp.email})`,
      name: emp.name,
      email: emp.email,
      department: emp.department
    }));
    res.json({ employees: formattedEmployees, count: employees.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employees', message: err.message });
  }
});

// GET /api/employees - Get all employees (no password)
router.get('/employees', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Fetching employees from database...');
    const employees = await Employee.find({}, '-password').sort({ name: 1 });
    console.log(`📊 Found ${employees.length} employees in database`);
    console.log('👥 Employee list:', employees.map(emp => ({ name: emp.name, email: emp.email, _id: emp._id })));
    res.json(employees);
  } catch (err) {
    console.error('❌ Error fetching employees:', err);
    res.status(500).json({ error: 'Failed to fetch employees', message: err.message });
  }
});

// POST /api/employees - Add a new employee (admin only)
router.post('/employees', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, department, password } = req.body || {};

    if (!name || !email || !department) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Name, email, and department are required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanedName = name.trim();
    const cleanedDepartment = department.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        error: 'Invalid email address',
        details: 'Please provide a valid employee email'
      });
    }

    const existingEmployee = await Employee.findOne({ email: normalizedEmail });
    if (existingEmployee) {
      return res.status(409).json({
        error: 'Employee already exists',
        details: 'An employee with this email already exists'
      });
    }

    const rawPassword = password?.trim() || crypto.randomBytes(5).toString('hex'); // 10 chars fallback

    if (password && password.trim().length < 6) {
      return res.status(400).json({
        error: 'Invalid password',
        details: 'Password must be at least 6 characters long'
      });
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const employee = new Employee({
      name: cleanedName,
      email: normalizedEmail,
      department: cleanedDepartment,
      password: hashedPassword
    });

    const savedEmployee = await employee.save();
    console.log('✅ Admin added employee:', savedEmployee.email);

    // Initialize progress documents
    try {
      await initializeEmployeeProgress(savedEmployee.email);
      console.log('✅ Initialized common progress for manually added employee:', savedEmployee.email);
    } catch (progressError) {
      console.warn('⚠️ Could not initialize common progress:', progressError.message);
    }

    try {
      await initializeAssignedCourseProgress(savedEmployee.email);
      console.log('✅ Initialized assigned course progress for manually added employee:', savedEmployee.email);
    } catch (assignedError) {
      console.warn('⚠️ Could not initialize assigned course progress:', assignedError.message);
    }

    const loginUrl =
      process.env.PLATFORM_LOGIN_URL ||
      (process.env.FRONTEND_BASE_URL ? `${process.env.FRONTEND_BASE_URL.replace(/\/$/, '')}/login` : 'http://localhost:3000/login');
    const adminName = req.user?.name || req.user?.email || 'Administrator';

    try {
      await sendEmployeeWelcomeEmail({
        employeeEmail: savedEmployee.email,
        employeeName: savedEmployee.name,
        adminName,
        loginUrl,
        password: rawPassword,
        isTemporary: !password
      });
    } catch (welcomeError) {
      console.warn('⚠️ Could not send employee welcome email:', welcomeError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Employee added successfully',
      employee: {
        id: savedEmployee._id,
        name: savedEmployee.name,
        email: savedEmployee.email,
        department: savedEmployee.department,
        createdAt: savedEmployee.createdAt
      },
      tempPassword: password ? undefined : rawPassword,
      passwordProvided: Boolean(password)
    });

  } catch (err) {
    console.error('❌ Error adding employee:', err);
    res.status(500).json({
      error: 'Failed to add employee',
      message: err.message
    });
  }
});


router.get('/progress/:email', async (req, res) => {
  try {
    const employee = await Employee.findOne({ email: req.params.email });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    res.json({ levelCount: employee.levelCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
// POST /api/update-progress
router.post('/update-progress', async (req, res) => {
  const { email, levelCount } = req.body;

  try {
    const employee = await Employee.findOneAndUpdate(
      { email: email },
      { levelCount: levelCount },
      { new: true }
    );

    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    res.json({ message: 'Progress updated', levelCount: employee.levelCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


const { v4: uuidv4 } = require('uuid'); // for generating certificateId

// DELETE /api/employees/:id - Delete an employee
router.delete('/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const employeeId = req.params.id;
    console.log(`🗑️ Attempting to delete employee with ID: ${employeeId}`);
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      console.log(`❌ Employee not found with ID: ${employeeId}`);
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    console.log(`👤 Deleting employee: ${employee.name} (${employee.email})`);
    
    // Delete the employee
    await Employee.findByIdAndDelete(employeeId);

    // Cascade delete related records
    try {
      const cascades = await Promise.allSettled([
        Certificate.deleteMany({ employeeEmail: employee.email }),
        AssignedCourseUserProgress.deleteMany({ employeeEmail: employee.email }),
        CommonUserProgress.deleteMany({ employeeEmail: employee.email }),
        AssignedCourseProgressTimestamp.deleteMany({ employeeEmail: employee.email }),
        EmployeeProgress.deleteMany({ employeeEmail: employee.email }),
        UserProgress.deleteMany({ userEmail: employee.email })
      ]);

      cascades.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`🗑️ Cascade delete #${index + 1} completed. Count:`, result.value?.deletedCount);
        } else {
          console.warn(`⚠️ Cascade delete #${index + 1} failed:`, result.reason?.message);
        }
      });
    } catch (cascadeError) {
      console.error('⚠️ Error deleting related records for employee:', cascadeError);
    }
    
    console.log(`✅ Successfully deleted employee: ${employee.name}`);
    res.json({ 
      success: true, 
      message: `Employee ${employee.name} deleted successfully`,
      deletedEmployee: {
        id: employeeId,
        name: employee.name,
        email: employee.email
      }
    });
  } catch (err) {
    console.error('❌ Error deleting employee:', err);
    res.status(500).json({ error: 'Failed to delete employee', message: err.message });
  }
});

// DELETE /api/employees - Delete all employees (for testing)
router.delete('/employees', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const emailQuery = req.query.email;
    if (emailQuery) {
      console.log(`🗑️ Attempting to delete employee by email: ${emailQuery}`);
      const employee = await Employee.findOne({ email: emailQuery });
      if (!employee) {
        console.log(`❌ Employee not found with email: ${emailQuery}`);
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Delete employee and cascades similar to single-delete path
      await Employee.findByIdAndDelete(employee._id);
      try {
        const cascades = await Promise.allSettled([
          Certificate.deleteMany({ employeeEmail: employee.email }),
          AssignedCourseUserProgress.deleteMany({ employeeEmail: employee.email }),
          CommonUserProgress.deleteMany({ employeeEmail: employee.email }),
          AssignedCourseProgressTimestamp.deleteMany({ employeeEmail: employee.email }),
          EmployeeProgress.deleteMany({ employeeEmail: employee.email }),
          UserProgress.deleteMany({ userEmail: employee.email })
        ]);

        cascades.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            console.log(`🗑️ Cascade delete #${index + 1} completed. Count:`, result.value?.deletedCount);
          } else {
            console.warn(`⚠️ Cascade delete #${index + 1} failed:`, result.reason?.message);
          }
        });
      } catch (cascadeError) {
        console.error('⚠️ Error deleting related records for employee by email:', cascadeError);
      }

      console.log(`✅ Successfully deleted employee by email: ${employee.name} (${employee.email})`);
      return res.json({ success: true, message: `Employee ${employee.name} deleted successfully`, deletedEmployee: { id: employee._id, name: employee.name, email: employee.email } });
    }

    console.log('🗑️ Attempting to delete ALL employees...');
    
    const result = await Employee.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} employees from database`);
    
    res.json({ 
      success: true, 
      message: `Deleted ${result.deletedCount} employees successfully`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('❌ Error deleting all employees:', err);
    res.status(500).json({ error: 'Failed to delete employees', message: err.message });
  }
});

// GET /api/employees/count - Get employee count for debugging
router.get('/employees/count', async (req, res) => {
  try {
    const count = await Employee.countDocuments();
    console.log(`📊 Total employees in database: ${count}`);
    res.json({ count, message: `Total employees: ${count}` });
  } catch (err) {
    console.error('❌ Error counting employees:', err);
    res.status(500).json({ error: 'Failed to count employees', message: err.message });
  }
});

module.exports = router;
