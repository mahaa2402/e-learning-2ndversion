const mongoose = require('mongoose');
const AssignedCourseProgressTimestamp = require('./models/AssignedCourseProgressTimestamp');
const Employee = require('./models/Employee');
const Admin = require('./models/Admin');
const Course = require('./models/Course');
require('dotenv').config();

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Initialize assigned course timestamp progress for an employee
 * Creates a document with assigned courses initialized to null timestamps
 */
async function initializeAssignedCourseTimestampProgress(employeeEmail) {
  try {
    // Check if progress already exists
    const existing = await AssignedCourseProgressTimestamp.findOne({ employeeEmail });
    if (existing) {
      return existing;
    }

    // Get employee details
    const employee = await Employee.findOne({ email: employeeEmail });
    if (!employee) {
      throw new Error(`Employee not found: ${employeeEmail}`);
    }

    // Create new progress document with empty assigned course timestamp progress
    const newProgress = new AssignedCourseProgressTimestamp({
      employeeId: employee._id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      employeeDepartment: employee.department,
      assignedCourseTimestamp: new Map(),
      courseTimestampAssignments: []
    });

    await newProgress.save();
    console.log(`✅ Initialized assigned course timestamp progress for: ${employee.name} (${employeeEmail})`);
    return newProgress;

  } catch (error) {
    console.error('❌ Error initializing assigned course timestamp progress:', error);
    throw error;
  }
}

/**
 * Assign a course timestamp to an employee and initialize timestamp
 */
async function assignCourseTimestampToEmployee(employeeEmail, courseName, adminId, deadline = null) {
  try {
    console.log('🔍 DEBUG: assignCourseTimestampToEmployee called with:', { employeeEmail, courseName, adminId, deadline });
    
    // Get employee details
    const employee = await Employee.findOne({ email: employeeEmail });
    if (!employee) {
      throw new Error(`Employee not found: ${employeeEmail}`);
    }
    console.log('✅ Employee found:', employee.name);

    // Get admin details
    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new Error(`Admin not found: ${adminId}`);
    }
    console.log('✅ Admin found:', admin.name);

    // Find or create progress document
    let progress = await AssignedCourseProgressTimestamp.findOne({ employeeEmail });
    console.log('🔍 Existing timestamp progress found:', progress ? 'Yes' : 'No');
    
    if (!progress) {
      console.log('📝 Creating new timestamp progress document for:', employeeEmail);
      progress = new AssignedCourseProgressTimestamp({
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        employeeDepartment: employee.department,
        assignedCourseTimestamp: new Map(),
        courseTimestampAssignments: []
      });
    }

    // Check if course is already assigned
    const existingAssignment = progress.courseTimestampAssignments.find(
      assignment => assignment.courseName === courseName
    );

    if (existingAssignment) {
      console.log(`⚠️ Course "${courseName}" already assigned to ${employeeEmail} in timestamp collection`);
      return progress;
    }

    console.log('📝 Adding new course timestamp assignment:', courseName);

    // Add course assignment
    progress.courseTimestampAssignments.push({
      courseName: courseName,
      assignedBy: {
        adminId: admin._id,
        adminName: admin.name,
        adminEmail: admin.email
      },
      assignedAt: new Date(),
      deadline: deadline,
      status: 'assigned'
    });

    // Initialize course timestamp to current date (when assigned)
    progress.assignedCourseTimestamp.set(courseName, new Date());

    console.log('💾 Saving timestamp progress document...');
    await progress.save();
    console.log(`✅ Assigned course timestamp "${courseName}" to ${employee.name} (${employeeEmail})`);
    console.log('📊 Final timestamp progress document:', JSON.stringify(progress, null, 2));
    return progress;

  } catch (error) {
    console.error('❌ Error assigning course timestamp to employee:', error);
    throw error;
  }
}

/**
 * Update assigned course timestamp when a module is completed
 */
async function updateAssignedCourseTimestamp(employeeEmail, courseName) {
  try {
    const progress = await AssignedCourseProgressTimestamp.findOne({ employeeEmail });
    if (!progress) {
      throw new Error(`No timestamp progress found for employee: ${employeeEmail}`);
    }

    // Check if course is assigned to this employee
    const courseAssignment = progress.courseTimestampAssignments.find(
      assignment => assignment.courseName === courseName
    );

    if (!courseAssignment) {
      console.log(`⚠️ Course "${courseName}" is not assigned to ${employeeEmail} in timestamp collection`);
      return null;
    }

    // Update timestamp to current time when module is completed
    progress.assignedCourseTimestamp.set(courseName, new Date());

    // Update assignment status based on progress
    courseAssignment.status = 'in-progress';

    await progress.save();
    console.log(`✅ Updated assigned course timestamp for ${employeeEmail} - ${courseName}: ${new Date()}`);

    return progress;

  } catch (error) {
    console.error('❌ Error updating assigned course timestamp:', error);
    throw error;
  }
}

/**
 * Get employee's assigned course timestamp progress
 */
async function getEmployeeAssignedCourseTimestampProgress(employeeEmail) {
  try {
    const progress = await AssignedCourseProgressTimestamp.findOne({ employeeEmail });
    if (!progress) {
      console.log(`📊 No timestamp progress found for ${employeeEmail}, initializing...`);
      return await initializeAssignedCourseTimestampProgress(employeeEmail);
    }
    return progress;
  } catch (error) {
    console.error('❌ Error getting employee assigned course timestamp progress:', error);
    throw error;
  }
}

/**
 * Get all employees' assigned course timestamp progress (admin only)
 */
async function getAllEmployeesAssignedCourseTimestampProgress() {
  try {
    const allProgress = await AssignedCourseProgressTimestamp.find({});
    return allProgress;
  } catch (error) {
    console.error('❌ Error getting all employees assigned course timestamp progress:', error);
    throw error;
  }
}

/**
 * Get employee's assigned courses with timestamps
 */
async function getEmployeeAssignedCourseTimestamps(employeeEmail) {
  try {
    const progress = await AssignedCourseProgressTimestamp.findOne({ employeeEmail });
    if (!progress) {
      return [];
    }
    return progress.courseTimestampAssignments;
  } catch (error) {
    console.error('❌ Error getting employee assigned course timestamps:', error);
    throw error;
  }
}

/**
 * Mark assigned course as completed in timestamp collection
 */
async function markAssignedCourseTimestampCompleted(employeeEmail, courseName) {
  try {
    const progress = await AssignedCourseProgressTimestamp.findOne({ employeeEmail });
    if (!progress) {
      throw new Error(`No timestamp progress found for employee: ${employeeEmail}`);
    }

    // Find the course assignment
    const courseAssignment = progress.courseTimestampAssignments.find(
      assignment => assignment.courseName === courseName
    );

    if (!courseAssignment) {
      throw new Error(`Course "${courseName}" is not assigned to ${employeeEmail}`);
    }

    // Update status to completed
    courseAssignment.status = 'completed';
    
    // Update timestamp to completion time
    progress.assignedCourseTimestamp.set(courseName, new Date());

    await progress.save();
    console.log(`✅ Marked assigned course timestamp as completed for ${employeeEmail} - ${courseName}`);
    return progress;

  } catch (error) {
    console.error('❌ Error marking assigned course timestamp as completed:', error);
    throw error;
  }
}

/**
 * Remove assigned course from timestamp collection
 */
async function removeAssignedCourseTimestamp(employeeEmail, courseName) {
  try {
    const progress = await AssignedCourseProgressTimestamp.findOne({ employeeEmail });
    if (!progress) {
      throw new Error(`No timestamp progress found for employee: ${employeeEmail}`);
    }

    // Remove course from assignments
    progress.courseTimestampAssignments = progress.courseTimestampAssignments.filter(
      assignment => assignment.courseName !== courseName
    );

    // Remove course from timestamp map
    progress.assignedCourseTimestamp.delete(courseName);

    await progress.save();
    console.log(`✅ Removed assigned course timestamp for ${employeeEmail} - ${courseName}`);
    return progress;

  } catch (error) {
    console.error('❌ Error removing assigned course timestamp:', error);
    throw error;
  }
}

/**
 * Get assigned course timestamp statistics
 */
async function getAssignedCourseTimestampStatistics() {
  try {
    const stats = await AssignedCourseProgressTimestamp.aggregate([
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          totalCourses: {
            $sum: { $size: '$courseTimestampAssignments' }
          }
        }
      }
    ]);

    return stats[0] || { totalEmployees: 0, totalCourses: 0 };
  } catch (error) {
    console.error('❌ Error getting assigned course timestamp statistics:', error);
    throw error;
  }
}

/**
 * Check if a course is assigned to an employee in timestamp collection
 */
async function isCourseTimestampAssignedToEmployee(employeeEmail, courseName) {
  try {
    console.log(`🔍 Checking if course "${courseName}" is assigned to ${employeeEmail} in timestamp collection`);
    
    const progress = await AssignedCourseProgressTimestamp.findOne({ employeeEmail });
    if (!progress) {
      console.log(`📊 No timestamp progress found for ${employeeEmail}`);
      return false;
    }
    
    console.log(`📊 Timestamp progress found, checking assignments:`, progress.courseTimestampAssignments.map(a => a.courseName));
    
    const isAssigned = progress.courseTimestampAssignments.some(
      assignment => assignment.courseName === courseName
    );
    
    console.log(`📊 Assignment result: ${isAssigned}`);
    return isAssigned;
  } catch (error) {
    console.error('❌ Error checking if course is assigned in timestamp collection:', error);
    return false;
  }
}

/**
 * Get all assigned course names across all employees from timestamp collection
 */
async function getAllAssignedCourseTimestampNames() {
  try {
    const allProgress = await AssignedCourseProgressTimestamp.find({});
    const courseNames = new Set();
    
    allProgress.forEach(progress => {
      progress.courseTimestampAssignments.forEach(assignment => {
        courseNames.add(assignment.courseName);
      });
    });
    
    return Array.from(courseNames);
  } catch (error) {
    console.error('❌ Error getting all assigned course timestamp names:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  initializeAssignedCourseTimestampProgress,
  assignCourseTimestampToEmployee,
  updateAssignedCourseTimestamp,
  getEmployeeAssignedCourseTimestampProgress,
  getAllEmployeesAssignedCourseTimestampProgress,
  getEmployeeAssignedCourseTimestamps,
  markAssignedCourseTimestampCompleted,
  removeAssignedCourseTimestamp,
  getAssignedCourseTimestampStatistics,
  isCourseTimestampAssignedToEmployee,
  getAllAssignedCourseTimestampNames
};


