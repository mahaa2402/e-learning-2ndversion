//const User = require('../models/User'); // Adjust path according to your User model location
const jwt = require('jsonwebtoken');
const Quiz = require('../models/Quiz');
const Common_Course=require('../models/common_courses') // path depends on your folder structure


// Get user profile
const getUserProfile = async (req, res) => {
  try {
    // req.user should be populated by your authenticateToken middleware
    const userId = req.user.id || req.user._id;
    
    // Find user and exclude sensitive information like password
    const user = await User.findById(userId).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Return user profile
    res.status(200).json({
      success: true,
      data: user,
      // Also return individual fields for easier frontend access
      name: user.name || user.firstName || user.username,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    });
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user profile',
      error: error.message 
    });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated through this endpoint
    delete updates.password;
    delete updates._id;
    delete updates.__v;
    
    // Find user and update
    const user = await User.findByIdAndUpdate(
      userId, 
      updates, 
      { new: true, runValidators: true }
    ).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user profile',
      error: error.message 
    });
  }
};

// Get user statistics (for dashboard)
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    // You can add more statistics here based on your needs
    // For example, if you have Task/Assignment models
    const stats = {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      certificates: 0,
      quizzesCompleted: 0
    };
    
    // If you have a Task model, you can fetch actual statistics
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
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    // Find user with password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password (assuming you have a method to compare passwords)
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password (assuming you have password hashing in your User model)
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};



const getQuizTitles = async (req, res) => {
  try {
    const titles = await Quiz.getAllTitles();
    res.json({ titles });
  } catch (err) {
    console.error('Error fetching titles:', err);
    res.status(500).json({ message: 'Server error' });
  }
};



//used in course detail page to show page 
const getcourse=async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const course = await Common_Course.findByTitle(title);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Convert course to plain object and ensure duration is properly formatted
    const courseObj = course.toObject ? course.toObject() : course;
    
    // Ensure each module has a duration (use the one from database, it should be set when videos are uploaded)
    if (courseObj.modules && Array.isArray(courseObj.modules)) {
      courseObj.modules = courseObj.modules.map(module => {
        const moduleObj = module.toObject ? module.toObject() : module;
        // Duration should already be in the database from when videos were uploaded
        // If not available, it will fall back to the default in the frontend
        return {
          ...moduleObj,
          duration: moduleObj.duration || null // Let frontend handle the fallback
        };
      });
    }

    res.status(200).json(courseObj);
  } catch (error) {
    console.error('Error fetching course by title:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserStats,
  changePassword,
  getQuizTitles,
  getcourse
};
