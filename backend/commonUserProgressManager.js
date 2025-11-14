const mongoose = require('mongoose');
const CommonCourse = require('./models/common_courses');
const Employee = require('./models/Employee');
require('dotenv').config();

// ============================================================================
// COMMON USER PROGRESS MODEL
// ============================================================================

const commonUserProgressSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  employeeName: { type: String, required: true },
  employeeEmail: { type: String, required: true },
  employeeDepartment: { type: String, required: true },
  // Dynamic course progress fields will be added based on common courses in DB
  courseProgress: { type: Map, of: Number, default: {} },
  // Quiz timestamps for tracking retake cooldowns
  quizTimestamp: { type: Map, of: Date, default: {} },
  updatedAt: { type: Date, default: Date.now }
});

commonUserProgressSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const CommonUserProgress = mongoose.model('CommonUserProgress', commonUserProgressSchema);

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Initialize common user progress for an employee
 * Creates a document with all common courses initialized to 0
 */
async function initializeEmployeeProgress(employeeEmail) {
  try {
    // Check if progress already exists
    const existing = await CommonUserProgress.findOne({ employeeEmail });
    if (existing) {
      return existing;
    }

    // Get employee details
    const employee = await Employee.findOne({ email: employeeEmail });
    if (!employee) {
      throw new Error(`Employee not found: ${employeeEmail}`);
    }

    // Fetch all common courses from database
    const commonCourses = await CommonCourse.find({}, 'title');
    
    // Create course progress object with all courses initialized to 0
    const courseProgress = {};
    const quizTimestamp = {};
    commonCourses.forEach(course => {
      courseProgress[course.title] = 0;
      quizTimestamp[course.title] = null; // No timestamp means quiz is available
    });

    // Create new progress document
    const newProgress = new CommonUserProgress({
      employeeId: employee._id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      employeeDepartment: employee.department,
      courseProgress: courseProgress,
      quizTimestamp: quizTimestamp
    });

    await newProgress.save();
    console.log(`✅ Initialized progress for: ${employee.name} (${employeeEmail})`);
    return newProgress;

  } catch (error) {
    console.error('❌ Error initializing employee progress:', error);
    throw error;
  }
}

/**
 * Update course progress when a quiz is completed
 */
async function updateCourseProgress(employeeEmail, courseName) {
  try {
    console.log(`🔍 DEBUG: updateCourseProgress called for ${employeeEmail} - ${courseName}`);
    
    // Check if the course is a common course
    const isCommonCourse = await CommonCourse.findOne({ title: courseName });
    console.log(`🔍 Checking if "${courseName}" is a common course:`, isCommonCourse ? 'Yes' : 'No');
    
    if (!isCommonCourse) {
      console.log(`⚠️ Course "${courseName}" is not a common course, skipping progress update`);
      return null;
    }

    // Get current progress to see what we're updating
    const currentProgress = await CommonUserProgress.findOne({ employeeEmail: employeeEmail });
    console.log(`🔍 Current progress for ${employeeEmail}:`, currentProgress ? 'Found' : 'Not found');
    
    if (currentProgress) {
      const currentCourseProgress = currentProgress.courseProgress.get(courseName) || 0;
      console.log(`📊 Current progress for ${courseName}: ${currentCourseProgress}`);
    }

    // Update the specific course progress by 1
    const result = await CommonUserProgress.findOneAndUpdate(
      { employeeEmail: employeeEmail },
      { $inc: { [`courseProgress.${courseName}`]: 1 } },
      { new: true, upsert: true }
    );

    console.log(`✅ Updated progress for ${employeeEmail} - ${courseName}: +1`);
    console.log(`📊 New progress document:`, JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error('❌ Error updating course progress:', error);
    throw error;
  }
}

/**
 * Get employee's progress for all common courses
 */
async function getEmployeeProgress(employeeEmail) {
  try {
    const progress = await CommonUserProgress.findOne({ employeeEmail });
    return progress;
  } catch (error) {
    console.error('❌ Error getting employee progress:', error);
    throw error;
  }
}

/**
 * Get all employees' progress (for admin dashboard)
 */
async function getAllEmployeesProgress() {
  try {
    const allProgress = await CommonUserProgress.find({})
      .populate('employeeId', 'name email department')
      .sort({ updatedAt: -1 });
    return allProgress;
  } catch (error) {
    console.error('❌ Error getting all employees progress:', error);
    throw error;
  }
}

// ============================================================================
// MIGRATION UTILITIES
// ============================================================================

/**
 * Migrate existing documents to new structure
 * Use this if you have old documents with hardcoded fields
 */
async function migrateExistingDocuments() {
  try {
    console.log('🔄 Starting migration of existing documents...');
    
    // Get all common courses
    const commonCourses = await CommonCourse.find({}, 'title');
    console.log('Available courses:', commonCourses.map(c => c.title));

    // Get all existing documents
    const existingDocs = await CommonUserProgress.find({});
    console.log(`Found ${existingDocs.length} existing documents`);

    // Create courseProgress object
    const courseProgress = {};
    const quizTimestamp = {};
    commonCourses.forEach(course => {
      courseProgress[course.title] = 0;
      quizTimestamp[course.title] = null; // No timestamp means quiz is available
    });

    // Update each document
    let updatedCount = 0;
    for (const doc of existingDocs) {
      const result = await CommonUserProgress.findByIdAndUpdate(
        doc._id,
        { $set: { courseProgress: courseProgress, quizTimestamp: quizTimestamp } },
        { new: true }
      );
      
      if (result) {
        updatedCount++;
        console.log(`✅ Migrated document ${updatedCount}/${existingDocs.length}`);
      }
    }

    console.log(`🎉 Migration complete! Updated ${updatedCount} documents`);
    return updatedCount;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Reset all progress to 0 (useful for testing)
 */
async function resetAllProgress() {
  try {
    console.log('🔄 Resetting all progress to 0...');
    
    const commonCourses = await CommonCourse.find({}, 'title');
    const courseProgress = {};
    const quizTimestamp = {};
    commonCourses.forEach(course => {
      courseProgress[course.title] = 0;
      quizTimestamp[course.title] = null; // Reset timestamps to allow quiz access
    });

    const result = await CommonUserProgress.updateMany(
      {},
      { $set: { courseProgress: courseProgress, quizTimestamp: quizTimestamp } }
    );

    console.log(`✅ Reset progress for ${result.modifiedCount} documents`);
    return result.modifiedCount;

  } catch (error) {
    console.error('❌ Reset failed:', error);
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all common course names
 */
async function getCommonCourseNames() {
  try {
    const courses = await CommonCourse.find({}, 'title');
    return courses.map(course => course.title);
  } catch (error) {
    console.error('❌ Error getting common course names:', error);
    throw error;
  }
}

/**
 * Check if a course is a common course
 */
async function isCommonCourse(courseName) {
  try {
    const course = await CommonCourse.findOne({ title: courseName });
    return !!course;
  } catch (error) {
    console.error('❌ Error checking if course is common:', error);
    return false;
  }
}

/**
 * Get progress statistics for admin dashboard
 */
async function getProgressStatistics() {
  try {
    const allProgress = await CommonUserProgress.find({});
    const commonCourses = await getCommonCourseNames();
    
    const stats = {
      totalEmployees: allProgress.length,
      courses: {},
      overallCompletion: 0
    };

    // Calculate stats for each course
    commonCourses.forEach(courseName => {
      let totalProgress = 0;
      let employeesWithProgress = 0;
      
      allProgress.forEach(progress => {
        const courseProgress = progress.courseProgress.get(courseName) || 0;
        if (courseProgress > 0) {
          employeesWithProgress++;
        }
        totalProgress += courseProgress;
      });

      stats.courses[courseName] = {
        totalProgress,
        averageProgress: allProgress.length > 0 ? totalProgress / allProgress.length : 0,
        employeesWithProgress,
        completionRate: allProgress.length > 0 ? (employeesWithProgress / allProgress.length) * 100 : 0
      };
    });

    // Calculate overall completion
    const totalPossibleProgress = allProgress.length * commonCourses.length;
    const actualTotalProgress = allProgress.reduce((total, progress) => {
      return total + Array.from(progress.courseProgress.values()).reduce((sum, val) => sum + val, 0);
    }, 0);
    
    stats.overallCompletion = totalPossibleProgress > 0 ? (actualTotalProgress / totalPossibleProgress) * 100 : 0;

    return stats;

  } catch (error) {
    console.error('❌ Error getting progress statistics:', error);
    throw error;
  }
}

/**
 * Check if all modules in a course are completed
 */
async function isCourseCompleted(employeeEmail, courseName) {
  try {
    console.log(`🔍 Checking if course "${courseName}" is completed for ${employeeEmail}`);
    
    // Get the course details to know total modules
    const course = await CommonCourse.findOne({ title: courseName });
    if (!course) {
      console.log(`⚠️ Course "${courseName}" not found in common courses`);
      return false;
    }
    
    const totalModules = course.modules.length;
    console.log(`📊 Total modules in ${courseName}: ${totalModules}`);
    
    // Get user progress for this course
    const UserProgress = require('./models/Userprogress');
    const userProgress = await UserProgress.findOne({ userEmail: employeeEmail, courseName });
    if (!userProgress) {
      console.log(`📊 No progress found for ${employeeEmail} in ${courseName}`);
      return false;
    }
    
    const completedModulesCount = userProgress.completedModules.length;
    console.log(`📊 Completed modules: ${completedModulesCount}/${totalModules}`);
    
    const isCompleted = completedModulesCount >= totalModules;
    console.log(`✅ Course completion status: ${isCompleted ? 'COMPLETED' : 'IN PROGRESS'}`);
    
    return {
      isCompleted,
      completedModules: userProgress.completedModules,
      totalModules,
      completedCount: completedModulesCount
    };
    
  } catch (error) {
    console.error('❌ Error checking course completion:', error);
    return false;
  }
}

/**
 * Get course completion status with detailed information
 */
async function getCourseCompletionStatus(employeeEmail, courseName) {
  try {
    const course = await CommonCourse.findOne({ title: courseName });
    if (!course) {
      return {
        isCompleted: false,
        error: 'Course not found'
      };
    }
    
    const UserProgress = require('./models/Userprogress');
    const userProgress = await UserProgress.findOne({ userEmail: employeeEmail, courseName });
    if (!userProgress) {
      return {
        isCompleted: false,
        completedModules: [],
        totalModules: course.modules.length,
        completedCount: 0,
        courseModules: course.modules
      };
    }
    
    const totalModules = course.modules.length;
    const completedModules = userProgress.completedModules;
    const completedCount = completedModules.length;
    const isCompleted = completedCount >= totalModules;
    
    return {
      isCompleted,
      completedModules,
      totalModules,
      completedCount,
      courseModules: course.modules,
      lastAccessedModule: userProgress.lastAccessedModule
    };
    
  } catch (error) {
    console.error('❌ Error getting course completion status:', error);
    return {
      isCompleted: false,
      error: error.message
    };
  }
}

// ============================================================================
// QUIZ TIMESTAMP FUNCTIONS
// ============================================================================

/**
 * Check if employee can take quiz for a specific course
 * Returns true if quiz is available (timestamp is 0 or cooldown hours have passed)
 * @param {string} employeeEmail - Employee email
 * @param {string} courseName - Course name
 * @param {number} cooldownHours - Cooldown time in hours (default: 24)
 */
async function canTakeQuiz(employeeEmail, courseName, cooldownHours = 24) {
  try {
    console.log(`🔍 Checking quiz availability for ${employeeEmail} - ${courseName} (cooldown: ${cooldownHours} hours)`);
    
    const progress = await CommonUserProgress.findOne({ employeeEmail });
    if (!progress) {
      console.log(`📊 No progress found for ${employeeEmail}, initializing...`);
      await initializeEmployeeProgress(employeeEmail);
      return true; // New employee can take quiz
    }
    
    const quizTime = progress.quizTimestamp.get(courseName);
    if (!quizTime) {
      console.log(`✅ No timestamp found for ${courseName}, quiz available`);
      return true; // No timestamp means quiz is available
    }
    
    const now = new Date();
    const timeDiff = now.getTime() - quizTime.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    console.log(`⏰ Quiz timestamp for ${courseName}: ${quizTime}`);
    console.log(`⏰ Current time: ${now}`);
    console.log(`⏰ Hours since last attempt: ${hoursDiff.toFixed(2)}`);
    console.log(`⏰ Required cooldown: ${cooldownHours} hours`);
    
    if (hoursDiff >= cooldownHours) {
      console.log(`✅ ${cooldownHours} hours have passed, quiz available`);
      return true;
    } else {
      console.log(`⏳ Quiz not available yet, ${(cooldownHours - hoursDiff).toFixed(2)} hours remaining`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking quiz availability:', error);
    return false; // Default to blocking on error
  }
}

/**
 * Update quiz timestamp after a failed attempt
 * This sets the timestamp to current time, blocking quiz for 24 hours
 */
async function updateQuizTimestamp(employeeEmail, courseName) {
  try {
    console.log(`⏰ Updating quiz timestamp for ${employeeEmail} - ${courseName}`);
    
    const result = await CommonUserProgress.findOneAndUpdate(
      { employeeEmail: employeeEmail },
      { $set: { [`quizTimestamp.${courseName}`]: new Date() } },
      { new: true, upsert: true }
    );
    
    console.log(`✅ Quiz timestamp updated for ${employeeEmail} - ${courseName}`);
    return result;
  } catch (error) {
    console.error('❌ Error updating quiz timestamp:', error);
    throw error;
  }
}

/**
 * Get remaining time until quiz is available
 * Returns time in hours and minutes
 * @param {string} employeeEmail - Employee email
 * @param {string} courseName - Course name
 * @param {number} cooldownHours - Cooldown time in hours (default: 24)
 */
async function getQuizCooldownRemaining(employeeEmail, courseName, cooldownHours = 24) {
  try {
    const progress = await CommonUserProgress.findOne({ employeeEmail });
    if (!progress) {
      return { hours: 0, minutes: 0, available: true };
    }
    
    const quizTime = progress.quizTimestamp.get(courseName);
    if (!quizTime) {
      return { hours: 0, minutes: 0, available: true };
    }
    
    const now = new Date();
    const timeDiff = now.getTime() - quizTime.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff >= cooldownHours) {
      return { hours: 0, minutes: 0, available: true };
    }
    
    const remainingHours = Math.floor(cooldownHours - hoursDiff);
    const remainingMinutes = Math.floor((cooldownHours - hoursDiff - remainingHours) * 60);
    
    return {
      hours: remainingHours,
      minutes: remainingMinutes,
      available: false
    };
  } catch (error) {
    console.error('❌ Error getting quiz cooldown:', error);
    return { hours: 0, minutes: 0, available: true };
  }
}

/**
 * Clear quiz timestamp when user passes a quiz
 * This removes the cooldown restriction
 */
async function clearQuizTimestamp(employeeEmail, courseName) {
  try {
    console.log(`🧹 Clearing quiz timestamp for ${employeeEmail} - ${courseName}`);
    
    const result = await CommonUserProgress.findOneAndUpdate(
      { employeeEmail: employeeEmail },
      { $unset: { [`quizTimestamp.${courseName}`]: 1 } },
      { new: true }
    );
    
    if (result) {
      console.log(`✅ Quiz timestamp cleared for ${employeeEmail} - ${courseName}`);
    } else {
      console.log(`⚠️ No progress record found for ${employeeEmail}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error clearing quiz timestamp:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Model
  CommonUserProgress,
  
  // Core functions
  initializeEmployeeProgress,
  updateCourseProgress,
  getEmployeeProgress,
  getAllEmployeesProgress,
  
  // Course completion functions
  isCourseCompleted,
  getCourseCompletionStatus,
  
  // Quiz timestamp functions
  canTakeQuiz,
  updateQuizTimestamp,
  getQuizCooldownRemaining,
  clearQuizTimestamp,
  
  // Migration utilities
  migrateExistingDocuments,
  resetAllProgress,
  
  // Utility functions
  getCommonCourseNames,
  isCommonCourse,
  getProgressStatistics
}; 
