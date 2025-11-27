// backend/controllers/Admin.js
const { URL } = require('url');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const AssignedTask = require('../models/AssignedTask');
const Course = require('../models/Course');
// FIXED: Rename the imported functions to avoid conflicts
const { 
  assignCourseToEmployee: assignCourseToEmployeeManager, 
  getEmployeeAssignedCourseProgress: getEmployeeAssignedCourseProgressManager, 
  getAllEmployeesAssignedCourseProgress: getAllEmployeesAssignedCourseProgressManager 
} = require('../assignedCourseUserProgressManager');
const { sendTaskAssignmentEmail } = require('../services/emailService');
const { generateCourseLink, generateDashboardLink } = require('../utils/secureLinkGenerator');
const mongoose = require('mongoose');

const resolveFrontendBase = (loginUrl) => {
  if (!loginUrl) return null;
  try {
    const parsed = new URL(loginUrl);
    return parsed.origin;
  } catch (error) {
    return loginUrl.replace(/\/login.*$/i, '').replace(/\/$/, '');
  }
};

const getEmployees = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const employees = await Employee.find({}, '-password').sort({ name: 1 });
    res.json(employees);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ error: 'Failed to fetch employees', message: err.message });
  }
};

const getEmployeesForAssignment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
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
    console.error('Error fetching employees for assignment:', err);
    res.status(500).json({ error: 'Failed to fetch employees', message: err.message });
  }
};

const verifyToken = async (req, res) => {
  try {
    let user;
    if (req.user.role === 'admin') {
      user = await Admin.findById(req.user.id).select('-password');
    } else {
      user = await Employee.findById(req.user.id).select('-password');
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      valid: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: req.user.role,
        department: user.department || undefined
      }
    });
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(500).json({ error: 'Token verification failed', message: err.message });
  }
};

const createAssignedTask = async (req, res) => {
  try {
    console.log('=== BACKEND DEBUG: createAssignedTask ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request user:', req.user);

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required', 
        details: 'Only administrators can assign tasks to employees' 
      });
    }

    const admin = await Admin.findById(req.user.id).select('name email');
    if (!admin) {
      return res.status(404).json({ 
        error: 'Admin account not found', 
        details: 'Your admin account could not be verified' 
      });
    }

    const { taskTitle, description, priority, deadline, reminderDays, assignees, videos, quizzes } = req.body;

    const missingFields = [];
    if (!taskTitle) missingFields.push('taskTitle');
    if (!description) missingFields.push('description');  
    if (!deadline) missingFields.push('deadline');
    if (!assignees || !Array.isArray(assignees) || assignees.length === 0) {
      missingFields.push('assignees');
    }

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missingFields, 
        details: `Please provide: ${missingFields.join(', ')}`,
        receivedFields: Object.keys(req.body)
      });
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid deadline format', 
        details: 'Please provide a valid date for the deadline',
        receivedDeadline: deadline
      });
    }

    let employeeQuery = {};
    if (Array.isArray(assignees)) {
      const objectIds = [];
      const searchCriteria = [];

      assignees.forEach((assignee, index) => {
        if (typeof assignee === 'string') {
          if (mongoose.Types.ObjectId.isValid(assignee) && assignee.length === 24) {
            objectIds.push(assignee);
          }
        } else if (typeof assignee === 'object' && assignee !== null) {
          const id = assignee.id || assignee._id || assignee.employeeId || assignee.value;
          if (id && mongoose.Types.ObjectId.isValid(id) && id.toString().length === 24) {
            objectIds.push(id);
          } else if (assignee.name && assignee.email) {
            searchCriteria.push({ name: assignee.name, email: assignee.email });
          } else if (assignee.email) {
            searchCriteria.push({ email: assignee.email });
          }
        }
      });

      const queryConditions = [];
      if (objectIds.length > 0) {
        queryConditions.push({ _id: { $in: objectIds.map(id => new mongoose.Types.ObjectId(id)) } });
      }
      if (searchCriteria.length > 0) {
        queryConditions.push({ $or: searchCriteria });
      }

      if (queryConditions.length === 0) {
        return res.status(400).json({ 
          error: 'No valid employees selected', 
          details: 'Could not find valid employee identification in the assignees data',
          receivedAssignees: assignees
        });
      }

      employeeQuery = queryConditions.length === 1 ? queryConditions[0] : { $or: queryConditions };
    }

    const employees = await Employee.find(employeeQuery);
    if (employees.length === 0) {
      return res.status(400).json({ 
        error: 'No employees found', 
        details: 'Could not find any employees matching the provided criteria',
        query: employeeQuery,
        receivedAssignees: assignees
      });
    }

    const taskAssignees = employees.map(employee => ({
      employeeId: employee._id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      employeeDepartment: employee.department,
      status: 'assigned',
      progress: 0
    }));

    const assignedTask = new AssignedTask({
      taskTitle,
      description,
      priority: priority || 'medium',
      deadline: deadlineDate,
      reminderDays: reminderDays ? parseInt(reminderDays) : 3,
      assignedBy: {
        adminId: admin._id,
        adminName: admin.name,
        adminEmail: admin.email
      },
      assignees: taskAssignees,
      status: 'active',
      videos: videos || [],
      quizzes: quizzes || []
    });

    console.log('=== SAVING TASK ===');
    console.log('Task object before save:', JSON.stringify(assignedTask, null, 2));
    
    const savedTask = await assignedTask.save();
    
    console.log('=== TASK SAVED SUCCESSFULLY ===');
    console.log('Saved task ID:', savedTask._id);
    console.log('Saved task:', JSON.stringify(savedTask, null, 2));
    
    // Debug: Check database connection and collection
    console.log('=== DATABASE DEBUG ===');
    console.log('Database name:', mongoose.connection.db.databaseName);
    console.log('Collection name:', AssignedTask.collection.name);
    
    // Verify the task was actually saved by querying it back
    const verifyTask = await AssignedTask.findById(savedTask._id);
    console.log('Verification query result:', verifyTask ? 'Task found' : 'Task NOT found');
    
    // Count total tasks in collection
    const totalTasks = await AssignedTask.countDocuments();
    console.log('Total tasks in collection:', totalTasks);
    
    // ============================================================================
    // ADDITIONAL: Create assigned course progress entries
    // ============================================================================
    console.log('=== CREATING ASSIGNED COURSE PROGRESS ENTRIES ===');
    
    try {
      // Treat taskTitle as course name and create assigned course progress for each employee
      for (const employee of employees) {
        console.log(`📝 Creating assigned course progress for: ${employee.name} (${employee.email}) - Course: ${taskTitle}`);
        
        const courseProgress = await assignCourseToEmployeeManager(
          employee.email,
          taskTitle, // Use taskTitle as course name
          admin._id,
          deadlineDate
        );
        
        console.log(`✅ Created assigned course progress for ${employee.name}:`, courseProgress ? 'Success' : 'Failed');
      }
      
      console.log('✅ All assigned course progress entries created successfully');
      
    } catch (courseError) {
      console.error('❌ Error creating assigned course progress entries:', courseError);
      // Don't fail the entire request if course progress creation fails
      console.log('⚠️ Task assignment succeeded, but course progress creation failed');
    }
    
    // ============================================================================
    // SEND EMAIL NOTIFICATIONS TO ASSIGNED EMPLOYEES
    // ============================================================================
    console.log('=== SENDING EMAIL NOTIFICATIONS ===');
    
    try {
      // Get base URL for link generation
      const baseUrl = req.protocol + '://' + req.get('host');

      for (const employee of employees) {
        console.log(`📧 Sending task assignment email to: ${employee.name} (${employee.email})`);
        
        // Generate secure dashboard link with expiration
        let dashboardLink = null;
        try {
          dashboardLink = generateDashboardLink(employee.email, deadlineDate, baseUrl);
          console.log(`🔗 Generated secure dashboard link for ${employee.email}`);
        } catch (linkError) {
          console.error('❌ Error generating dashboard link:', linkError);
          // Continue without link if generation fails
        }

        const emailSent = await sendTaskAssignmentEmail({
          employeeEmail: employee.email,
          employeeName: employee.name,
          taskTitle,
          description,
          deadline: deadlineDate,
          adminName: admin.name,
          adminEmail: admin.email,
          priority: priority || 'medium',
          dashboardLink
        });
        
        if (emailSent) {
          console.log(`✅ Task assignment email sent to ${employee.email}`);
        } else {
          console.log(`⚠️ Failed to send email to ${employee.email}, but task assignment succeeded`);
        }
      }
      
      console.log('✅ Email notification process completed');
      
    } catch (emailError) {
      console.error('❌ Error sending task assignment emails:', emailError);
      // Don't fail the entire request if email sending fails
      console.log('⚠️ Task assignment succeeded, but email notifications failed');
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Task assigned successfully', 
      task: savedTask 
    });
  } catch (err) {
    console.error('Error in createAssignedTask:', err);
    res.status(500).json({ 
      error: 'Failed to assign task', 
      message: err.message 
    });
  }
};

const getAssignedTasks = async (req, res) => {
  try {
    console.log('=== FETCHING ASSIGNED TASKS ===');
    const { status, priority, assignedBy, assignedTo, page = 1, limit = 10 } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedBy) filter['assignedBy.adminId'] = assignedBy;
    if (assignedTo) filter['assignees.employeeId'] = assignedTo;
    if (req.user.role === 'employee') {
      filter['assignees.employeeId'] = req.user.id;
    }
    
    console.log('Filter:', JSON.stringify(filter, null, 2));
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const tasks = await AssignedTask.find(filter)
      .populate('assignees.employeeId', 'name email department')
      .populate('assignedBy.adminId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    console.log('Found tasks:', tasks.length);
    console.log('Tasks:', JSON.stringify(tasks, null, 2));
    
    const totalTasks = await AssignedTask.countDocuments(filter);
    console.log('Total tasks in database:', totalTasks);
    
    res.json({
      tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTasks / parseInt(limit)),
        totalTasks,
        hasNext: skip + tasks.length < totalTasks,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error('Error fetching assigned tasks:', err);
    res.status(500).json({ error: 'Failed to fetch assigned tasks', message: err.message });
  }
};

const getAssignedTaskById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }
    const task = await AssignedTask.findById(req.params.id)
      .populate('assignees.employeeId', 'name email department')
      .populate('assignedBy.adminId', 'name email');
    if (!task) {
      return res.status(404).json({ error: 'Assigned task not found' });
    }
    if (req.user.role === 'employee') {
      const isAssignedToUser = task.assignees.some(
        assignee => assignee.employeeId._id.toString() === req.user.id
      );
      if (!isAssignedToUser) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    res.json({ task });
  } catch (err) {
    console.error('Error fetching assigned task:', err);
    res.status(500).json({ error: 'Failed to fetch assigned task', message: err.message });
  }
};

const updateAssignedTaskProgress = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }
    const { status, progress, notes } = req.body;
    const userId = req.user.id;
    const task = await AssignedTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Assigned task not found' });
    }
    const assigneeIndex = task.assignees.findIndex(
      assignee => assignee.employeeId.toString() === userId
    );
    if (assigneeIndex === -1) {
      return res.status(403).json({ error: 'Task not assigned to you' });
    }
    if (status) {
      task.assignees[assigneeIndex].status = status;
      if (status === 'in-progress' && !task.assignees[assigneeIndex].startedAt) {
        task.assignees[assigneeIndex].startedAt = new Date();
      }
      if (status === 'completed') {
        task.assignees[assigneeIndex].completedAt = new Date();
        task.assignees[assigneeIndex].progress = 100;
      }
    }
    if (progress !== undefined) {
      task.assignees[assigneeIndex].progress = Math.min(100, Math.max(0, progress));
    }
    if (notes) {
      task.assignees[assigneeIndex].notes = notes;
    }
    await task.save();
    res.json({ message: 'Task progress updated successfully', task });
  } catch (err) {
    console.error('Error updating task progress:', err);
    res.status(500).json({ error: 'Failed to update task progress', message: err.message });
  }
};

const deleteAssignedTask = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete tasks' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }
    const deletedTask = await AssignedTask.findByIdAndDelete(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({ error: 'Assigned task not found' });
    }
    res.json({ message: 'Task deleted successfully', deletedTask: { id: deletedTask._id, title: deletedTask.taskTitle, assigneesCount: deletedTask.assignees.length } });
  } catch (err) {
    console.error('Error deleting assigned task:', err);
    res.status(500).json({ error: 'Failed to delete assigned task', message: err.message });
  }
};

const getAllTasksDebug = async (req, res) => {
  try {
    console.log('=== DEBUG: GETTING ALL TASKS ===');
    
    // Get database info
    const dbName = mongoose.connection.db.databaseName;
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Database name:', dbName);
    console.log('All collections:', collections.map(c => c.name));
    
    const allTasks = await AssignedTask.find({}).sort({ createdAt: -1 });
    console.log('All tasks in database:', allTasks.length);
    console.log('All tasks:', JSON.stringify(allTasks, null, 2));
    
    // Also check if there are tasks in other collections
    const allCollections = collections.map(c => c.name);
    const taskCollections = allCollections.filter(name => name.toLowerCase().includes('task'));
    console.log('Collections that might contain tasks:', taskCollections);
    
    res.json({
      success: true,
      databaseName: dbName,
      collections: allCollections,
      taskCollections: taskCollections,
      totalTasks: allTasks.length,
      tasks: allTasks
    });
  } catch (err) {
    console.error('Error fetching all tasks:', err);
    res.status(500).json({ error: 'Failed to fetch all tasks', message: err.message });
  }
};

const getAssignedTasksStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const stats = await AssignedTask.aggregate([
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          activeTasks: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalAssignments: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          totalCompletions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      }
    ]);
    const priorityStats = await AssignedTask.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    const result = {
      overview: stats[0] || { totalTasks: 0, activeTasks: 0, completedTasks: 0, totalAssignments: 0, totalCompletions: 0 },
      byPriority: priorityStats.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, { high: 0, medium: 0, low: 0 }),
      completionRate: stats[0] && stats[0].totalAssignments ? Math.round((stats[0].totalCompletions / stats[0].totalAssignments) * 100) || 0 : 0
    };
    res.json(result);
  } catch (err) {
    console.error('Error fetching task stats:', err);
    res.status(500).json({ error: 'Failed to fetch task statistics', message: err.message });
  }
};

const createCourse = async (req, res) => {
  try {
    if (!req.body.name || !req.body.description) {
      return res.status(400).json({ error: 'Course name and description are required' });
    }
    let processedModules = [];
    if (req.body.modules && Array.isArray(req.body.modules)) {
      processedModules = req.body.modules.map(module => ({
        title: module.title || 'Untitled Module',
        video: module.video || {},
        quiz: module.quiz || { questions: [], passingScore: 70 }
      }));
    }
    const course = new Course({
      name: req.body.name,
      description: req.body.description,
      category: req.body.category || 'General',
      duration: req.body.duration || 'TBD',
      status: req.body.status || 'Draft',
      modules: processedModules,
      createdDate: new Date().toISOString().split('T')[0],
      enrollments: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const savedCourse = await course.save();
    res.status(201).json({ message: 'Course created successfully', course: savedCourse });
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(500).json({ error: 'Failed to create course', message: err.message });
  }
};

const getCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ error: 'Server error while fetching courses', message: err.message });
  }
};

const getCourseById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid course ID format' });
    }
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (err) {
    console.error('Error fetching course:', err);
    res.status(500).json({ error: 'Failed to get course', message: err.message });
  }
};

const getCourseByName = async (req, res) => {
  try {
    const { courseName } = req.params;
    if (!courseName) {
      return res.status(400).json({ error: 'Course name is required' });
    }
    
    console.log('=== FETCHING COURSE BY NAME ===');
    console.log('Course name:', courseName);
    
    const course = await Course.findOne({ name: courseName });
    console.log('Found course:', course ? 'Yes' : 'No');
    
    if (!course) {
      return res.status(404).json({ 
        error: 'Course not found', 
        message: `No course found with name: ${courseName}` 
      });
    }
    
    res.json({
      success: true,
      course: course
    });
  } catch (err) {
    console.error('Error fetching course by name:', err);
    res.status(500).json({ error: 'Failed to get course', message: err.message });
  }
};

const updateCourse = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid course ID format' });
    }
    const existingCourse = await Course.findById(req.params.id);
    if (!existingCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }
    let updateData = {
      name: req.body.name,
      description: req.body.description,
      category: req.body.category || existingCourse.category,
      duration: req.body.duration || existingCourse.duration,
      status: req.body.status || existingCourse.status,
      updatedAt: new Date()
    };
    if (req.body.modules && Array.isArray(req.body.modules)) {
      updateData.modules = req.body.modules.map(module => ({
        title: module.title || 'Untitled Module',
        video: module.video || {},
        quiz: module.quiz || { questions: [], passingScore: 70 }
      }));
    } else {
      updateData.modules = existingCourse.modules;
    }
    if (req.body.createdDate) updateData.createdDate = req.body.createdDate;
    if (req.body.enrollments !== undefined) updateData.enrollments = req.body.enrollments;
    const updated = await Course.findByIdAndUpdate(
      req.params.id, 
      { $set: updateData },
      { new: true, runValidators: true }
    );
    res.json({ message: 'Course updated successfully', course: updated });
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ error: 'Failed to update course', message: err.message });
  }
};

const deleteCourse = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid course ID format' });
    }
    const deleted = await Course.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json({ message: 'Course deleted successfully', deletedCourse: { id: deleted._id, name: deleted.name } });
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ error: 'Failed to delete course', message: err.message });
  }
};

const getAssignedCourses = async (req, res) => {
  try {
    const assignedTasks = await AssignedTask.find({ 
      'assignees.employeeId': req.user.id, 
      status: { $in: ['active', 'in-progress'] }
    })
      .populate('assignees.employeeId', 'name email department')
      .populate('assignedBy.adminId', 'name email')
      .sort({ createdAt: -1 });

    const assignedCourses = assignedTasks.map(task => {
      const userAssignment = task.assignees.find(
        assignee => assignee.employeeId._id.toString() === req.user.id
      );
      return {
        _id: task._id,
        name: task.taskTitle,
        description: task.description,
        module: task.module,
        priority: task.priority,
        deadline: task.deadline,
        status: userAssignment?.status || 'assigned',
        progress: userAssignment?.progress || 0,
        assignedBy: task.assignedBy.adminName,
        assignedDate: task.createdAt,
        estimatedHours: task.estimatedHours,
        type: 'task',
        videos: task.videos || [],
        quizzes: task.quizzes || []
      };
    });

    res.json({ 
      success: true, 
      courses: assignedCourses, 
      count: assignedCourses.length 
    });
  } catch (err) {
    console.error('Error fetching assigned courses:', err);
    res.status(500).json({ 
      error: 'Failed to fetch assigned courses', 
      message: err.message 
    });
  }
};

const getAvailableCourses = async (req, res) => {
  try {
    const courses = await Course.find({ status: 'Published' })
      .select('name description category duration enrollments createdDate')
      .sort({ createdAt: -1 });
    res.json({ success: true, courses: courses, count: courses.length });
  } catch (err) {
    console.error('Error fetching available courses:', err);
    res.status(500).json({ error: 'Failed to fetch available courses', message: err.message });
  }
};

const assignTaskByEmail = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required', details: 'Only administrators can assign tasks' });
    }
    const { employeeEmail, taskTitle, description, module, priority, deadline, estimatedHours, reminderDays, videos, quizzes } = req.body;
    const missingFields = [];
    if (!employeeEmail) missingFields.push('employeeEmail');
    if (!taskTitle) missingFields.push('taskTitle');
    if (!description) missingFields.push('description');
    if (!module) missingFields.push('module');
    if (!deadline) missingFields.push('deadline');
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missingFields, 
        details: `Please provide: ${missingFields.join(', ')}`,
        receivedFields: Object.keys(req.body)
      });
    }
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid deadline format', 
        details: 'Please provide a valid date for the deadline',
        receivedDeadline: deadline
      });
    }
    const admin = await Admin.findById(req.user.id).select('name email');
    if (!admin) {
      return res.status(404).json({ error: 'Admin account not found', details: 'Your admin account could not be verified' });
    }
    const employee = await Employee.findOne({ email: employeeEmail });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found', details: 'No employee with the provided email exists' });
    }
    const assignedTask = new AssignedTask({
      taskTitle,
      description,
      module,
      priority: priority || 'medium',
      deadline: deadlineDate,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      reminderDays: reminderDays ? parseInt(reminderDays) : 3,
      assignedBy: {
        adminId: admin._id,
        adminName: admin.name,
        adminEmail: admin.email
      },
      assignees: [{
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        employeeDepartment: employee.department,
        status: 'assigned',
        progress: 0
      }],
      status: 'active',
      videos: videos || [],
      quizzes: quizzes || []
    });
    const savedTask = await assignedTask.save();
    
    // ============================================================================
    // ADDITIONAL: Create assigned course progress entry
    // ============================================================================
    console.log('=== CREATING ASSIGNED COURSE PROGRESS ENTRY ===');
    
    try {
      console.log(`📝 Creating assigned course progress for: ${employee.name} (${employee.email}) - Course: ${taskTitle}`);
      
      const courseProgress = await assignCourseToEmployeeManager(
        employee.email,
        taskTitle, // Use taskTitle as course name
        admin._id,
        deadlineDate
      );
      
      console.log(`✅ Created assigned course progress for ${employee.name}:`, courseProgress ? 'Success' : 'Failed');
      console.log('✅ Assigned course progress entry created successfully');
      
    } catch (courseError) {
      console.error('❌ Error creating assigned course progress entry:', courseError);
      // Don't fail the entire request if course progress creation fails
      console.log('⚠️ Task assignment succeeded, but course progress creation failed');
    }
    
    // ============================================================================
    // SEND EMAIL NOTIFICATION TO ASSIGNED EMPLOYEE
    // ============================================================================
    console.log('=== SENDING EMAIL NOTIFICATION ===');
    
    try {
      console.log(`📧 Sending task assignment email to: ${employee.name} (${employee.email})`);
      
      // Generate secure dashboard link with expiration
      const baseUrl = req.protocol + '://' + req.get('host');
      let dashboardLink = null;
      try {
        dashboardLink = generateDashboardLink(employee.email, deadlineDate, baseUrl);
        console.log(`🔗 Generated secure dashboard link for ${employee.email}`);
      } catch (linkError) {
        console.error('❌ Error generating dashboard link:', linkError);
        // Continue without link if generation fails
      }

      const emailSent = await sendTaskAssignmentEmail({
        employeeEmail: employee.email,
        employeeName: employee.name,
        taskTitle,
        description,
        deadline: deadlineDate,
        adminName: admin.name,
        adminEmail: admin.email,
        priority: priority || 'medium',
        dashboardLink
      });
      
      if (emailSent) {
        console.log(`✅ Task assignment email sent to ${employee.email}`);
      } else {
        console.log(`⚠️ Failed to send email to ${employee.email}, but task assignment succeeded`);
      }
      
    } catch (emailError) {
      console.error('❌ Error sending task assignment email:', emailError);
      // Don't fail the entire request if email sending fails
      console.log('⚠️ Task assignment succeeded, but email notification failed');
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Task assigned successfully', 
      task: savedTask 
    });
  } catch (err) {
    console.error('Error assigning task by email:', err);
    res.status(500).json({ error: 'Failed to assign task', message: err.message });
  }
};

const getAssignedTasksForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    if (req.user.role === 'employee' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied: Employees can only view their own tasks' });
    }
    const assignedTasks = await AssignedTask.find({ 'assignees.employeeId': userId, status: { $in: ['active', 'in-progress'] } })
      .populate('assignedBy.adminId', 'name email')
      .populate('assignees.employeeId', 'name email department')
      .sort({ createdAt: -1 });
    res.json({ success: true, tasks: assignedTasks, count: assignedTasks.length });
  } catch (err) {
    console.error('Error fetching assigned tasks for user:', err);
    res.status(500).json({ error: 'Failed to fetch assigned tasks', message: err.message });
  }
};

const startAssignedTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }
    const task = await AssignedTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const assigneeIndex = task.assignees.findIndex(
      assignee => assignee.employeeId.toString() === req.user.id
    );
    if (assigneeIndex === -1) {
      return res.status(403).json({ error: 'Task not assigned to you' });
    }
    task.assignees[assigneeIndex].status = 'in-progress';
    task.assignees[assigneeIndex].startedAt = new Date();
    await task.save();
    res.json({ success: true, message: 'Task started successfully', task });
  } catch (err) {
    console.error('Error starting task:', err);
    res.status(500).json({ error: 'Failed to start task', message: err.message });
  }
};

// ============================================================================
// ASSIGNED COURSE FUNCTIONS
// ============================================================================

const assignCourseToEmployeeController = async (req, res) => {
  try {
    console.log('🔍 DEBUG: assignCourseToEmployeeController called');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 User:', req.user);
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { employeeEmail, courseName, deadline } = req.body;

    if (!employeeEmail || !courseName) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'Employee email and course name are required' 
      });
    }

    // Check if course exists
    const course = await Course.findOne({ title: courseName });
    if (!course) {
      return res.status(404).json({ 
        error: 'Course not found', 
        details: `Course "${courseName}" does not exist` 
      });
    }

    // Check if employee exists
    const employee = await Employee.findOne({ email: employeeEmail });
    if (!employee) {
      return res.status(404).json({ 
        error: 'Employee not found', 
        details: `Employee with email "${employeeEmail}" does not exist` 
      });
    }

    const admin = await Admin.findById(req.user.id).select('name email');
    if (!admin) {
      return res.status(404).json({
        error: 'Admin account not found',
        details: 'Your admin account could not be verified'
      });
    }

    const deadlineDate = deadline ? new Date(deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid deadline format',
        details: 'Please provide a valid ISO date string'
      });
    }

    const progress = await assignCourseToEmployeeManager(employeeEmail, courseName, req.user.id, deadlineDate);

    try {
      const baseUrl = req.protocol + '://' + req.get('host');
      const loginUrl =
        process.env.PLATFORM_LOGIN_URL ||
        (process.env.FRONTEND_BASE_URL
          ? `${process.env.FRONTEND_BASE_URL.replace(/\/$/, '')}/login`
          : 'http://localhost:3000/login');
      const frontendBase = resolveFrontendBase(loginUrl);

      let courseLink = null;
      try {
        courseLink = generateCourseLink(employeeEmail, courseName, deadlineDate, baseUrl);
      } catch (linkError) {
        console.error('❌ Failed to generate course access link:', linkError);
      }

      const dashboardLink = frontendBase
        ? `${frontendBase}/userdashboard?email=${encodeURIComponent(employeeEmail)}`
        : null;

      const emailSent = await sendTaskAssignmentEmail({
        employeeEmail,
        employeeName: employee.name,
        taskTitle: courseName,
        description: `You have been enrolled in "${courseName}". Click start to begin the training.`,
        deadline: deadlineDate,
        adminName: admin.name,
        adminEmail: admin.email,
        priority: 'medium',
        courseLink,
        dashboardLink,
        loginUrl
      });

      if (!emailSent) {
        console.warn(`⚠️ Course assignment email could not be sent to ${employeeEmail}`);
      }
    } catch (emailError) {
      console.error('❌ Error sending course assignment email:', emailError);
    }
    
    res.status(201).json({ 
      success: true, 
      message: `Course "${courseName}" assigned successfully to ${employee.name}`,
      progress 
    });

  } catch (error) {
    console.error('Error assigning course to employee:', error);
    res.status(500).json({ 
      error: 'Failed to assign course', 
      message: error.message 
    });
  }
};

const getEmployeeAssignedCourseProgress = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { employeeEmail } = req.params;

    if (!employeeEmail) {
      return res.status(400).json({ error: 'Employee email is required' });
    }

    // FIXED: Use the renamed imported function
    const progress = await getEmployeeAssignedCourseProgressManager(employeeEmail);
    
    if (!progress) {
      return res.status(404).json({ 
        error: 'No progress found', 
        details: `No assigned course progress found for ${employeeEmail}` 
      });
    }

    res.json({ success: true, progress });

  } catch (error) {
    console.error('Error getting employee assigned course progress:', error);
    res.status(500).json({ 
      error: 'Failed to get employee progress', 
      message: error.message 
    });
  }
};

const getAllEmployeesAssignedCourseProgress = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // FIXED: Use the renamed imported function
    const allProgress = await getAllEmployeesAssignedCourseProgressManager();
    res.json({ success: true, progress: allProgress });

  } catch (error) {
    console.error('Error getting all employees assigned course progress:', error);
    res.status(500).json({ 
      error: 'Failed to get all employees progress', 
      message: error.message 
    });
  }
};

// Test function to verify the collection is working
const testAssignedCourseCollection = async (req, res) => {
  try {
    console.log('🧪 Testing assigned course collection...');
    
    // Import the model directly
    const AssignedCourseUserProgress = require('../models/AssignedCourseUserProgress');
    
    // Count documents in collection
    const count = await AssignedCourseUserProgress.countDocuments();
    console.log('📊 Total documents in collection:', count);
    
    // Get all documents
    const allDocs = await AssignedCourseUserProgress.find({});
    console.log('📄 All documents:', JSON.stringify(allDocs, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Collection test completed',
      count: count,
      documents: allDocs
    });

  } catch (error) {
    console.error('❌ Error testing collection:', error);
    res.status(500).json({ 
      error: 'Failed to test collection', 
      message: error.message 
    });
  }
};

// Test function to manually create a test assignment
const createTestAssignment = async (req, res) => {
  try {
    console.log('🧪 Creating test assignment...');
    
    // Get first employee and admin
    const employee = await Employee.findOne({});
    const admin = await Admin.findOne({});
    
    if (!employee || !admin) {
      return res.status(400).json({ 
        error: 'No employee or admin found for testing',
        employee: employee ? 'Found' : 'Not found',
        admin: admin ? 'Found' : 'Not found'
      });
    }
    
    console.log('👤 Test employee:', employee.email);
    console.log('👨‍💼 Test admin:', admin.email);
    
    // Create test assignment
    const progress = await assignCourseToEmployeeManager(
      employee.email, 
      'Test Course', 
      admin._id, 
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    );
    
    res.json({ 
      success: true, 
      message: 'Test assignment created successfully',
      progress: progress
    });

  } catch (error) {
    console.error('❌ Error creating test assignment:', error);
    res.status(500).json({ 
      error: 'Failed to create test assignment', 
      message: error.message 
    });
  }
};

// Test function to test common course progress update
const testCommonCourseProgress = async (req, res) => {
  try {
    console.log('🧪 Testing common course progress update...');
    
    // Get first employee
    const employee = await Employee.findOne({});
    if (!employee) {
      return res.status(400).json({ 
        error: 'No employee found for testing'
      });
    }
    
    console.log('👤 Test employee:', employee.email);
    
    // Test updating progress for ISP course
    const { updateCourseProgress } = require('../commonUserProgressManager');
    
    console.log('📝 Testing progress update for ISP course...');
    const result = await updateCourseProgress(employee.email, 'ISP');
    
    console.log('✅ Test result:', result);
    
    res.json({ 
      success: true, 
      message: 'Common course progress test completed',
      employee: employee.email,
      course: 'ISP',
      result: result
    });

  } catch (error) {
    console.error('❌ Error testing common course progress:', error);
    res.status(500).json({ 
      error: 'Failed to test common course progress', 
      message: error.message 
    });
  }
};

// Dashboard Statistics Controller
// Simple dashboard statistics - minimal version
const getSimpleDashboardStats = async (req, res) => {
  try {
    console.log('📊 Fetching simple dashboard statistics...');

    // 1. Total Employees from Employee table
    const totalUsers = await Employee.countDocuments();
    console.log('👥 Total employees:', totalUsers);

    // 2. Total Courses from common_courses table
    let totalCourses = 0;
    try {
      const Common_Course = require('../models/common_courses');
      totalCourses = await Common_Course.countDocuments();
    } catch (err) {
      console.log('⚠️ Common courses not available:', err.message);
    }

    // 3. Total Certificates from Certificate table
    let totalCertificates = 0;
    try {
      const mongoose = require('mongoose');
      const Certificate = mongoose.model('Certificate');
      totalCertificates = await Certificate.countDocuments();
    } catch (err) {
      console.log('⚠️ Certificates not available:', err.message);
    }

    // Get employee learning data from Certificate table
    let employeeData = [];
    try {
      const Common_Course = require('../models/common_courses');
      const commonCourses = await Common_Course.find({}, 'title').lean();
      
      const Certificate = mongoose.model('Certificate');
      const courseCompletionData = await Certificate.aggregate([
        {
          $group: {
            _id: '$courseTitle',
            count: { $sum: 1 }
          }
        }
      ]);

      const completionMap = {};
      courseCompletionData.forEach(course => {
        completionMap[course._id] = course.count;
      });

      employeeData = commonCourses.map(course => ({
        name: course.title,
        value: completionMap[course.title] || 0
      }));
    } catch (err) {
      console.log('⚠️ Employee learning data query failed:', err.message);
      employeeData = [];
    }

    // Get leaderboard from Certificate table
    let leaderboard = [];
    try {
      const Certificate = mongoose.model('Certificate');
      const leaderboardData = await Certificate.aggregate([
        {
          $group: {
            _id: '$employeeEmail',
            employeeName: { $first: '$employeeName' },
            certificateCount: { $sum: 1 }
          }
        },
        {
          $sort: { certificateCount: -1 }
        },
        {
          $limit: 3
        }
      ]);

      leaderboard = leaderboardData.map((emp, index) => ({
        name: emp.employeeName || 'Unknown Employee',
        points: emp.certificateCount,
        correct: Math.round(Math.random() * 20 + 80),
        rank: index + 1,
        trend: index % 2 === 0 ? 'up' : 'down'
      }));
    } catch (err) {
      console.log('⚠️ Leaderboard query failed:', err.message);
      leaderboard = [];
    }

    // Get weakest and strongest topics from Certificate table
    let weakestTopics = [];
    let strongestTopics = [];
    
    try {
      const Certificate = mongoose.model('Certificate');
      const topicStats = await Certificate.aggregate([
        {
          $group: {
            _id: '$courseTitle',
            certificateCount: { $sum: 1 }
          }
        },
        {
          $match: {
            _id: { $ne: null }
          }
        },
        {
          $sort: { certificateCount: 1 }
        }
      ]);

      if (topicStats.length > 0) {
        // Get the top 2 weakest topics (lowest certificate counts)
        weakestTopics = topicStats.slice(0, 2).map(topic => ({
          name: topic._id || 'Unknown Course',
          completion: topic.certificateCount,
          color: '#EF4444'
        }));

        // Get the top 2 strongest topics (highest certificate counts)
        const startIndex = Math.max(2, topicStats.length - 2);
        strongestTopics = topicStats.slice(startIndex).reverse().map(topic => ({
          name: topic._id || 'Unknown Course',
          completion: topic.certificateCount,
          color: '#10B981'
        }));

        // Ensure no overlap between weakest and strongest
        const weakestNames = weakestTopics.map(t => t.name);
        strongestTopics = strongestTopics.filter(topic => !weakestNames.includes(topic.name));
        
        // If we need more strongest topics, get them from the remaining
        if (strongestTopics.length < 2 && topicStats.length > 4) {
          const remainingTopics = topicStats.slice(2, -2).reverse();
          for (const topic of remainingTopics) {
            if (strongestTopics.length >= 2) break;
            if (!weakestNames.includes(topic._id)) {
              strongestTopics.push({
                name: topic._id || 'Unknown Course',
                completion: topic.certificateCount,
                color: '#10B981'
              });
            }
          }
        }
      }
    } catch (err) {
      console.log('⚠️ Topic stats query failed:', err.message);
    }

    // Simple dashboard data
    const dashboardStats = {
      totalUsers,
      activeCourses: totalCourses,
      assessmentsCompletedToday: 0,
      certificatesIssuedThisWeek: totalCertificates,
      passFailData: [
        { name: 'Pass', value: 80, color: '#10B981' },
        { name: 'Fail', value: 20, color: '#1F2937' }
      ],
      employeeData: employeeData.length > 0 ? employeeData : [
        { name: 'Total Employees', value: totalUsers },
        { name: 'Total Courses', value: totalCourses },
        { name: 'Total Certificates', value: totalCertificates }
      ],
      leaderboard: leaderboard.length > 0 ? leaderboard : [
        { name: 'Employee 1', points: 5, correct: 95, rank: 1, trend: 'up' },
        { name: 'Employee 2', points: 4, correct: 90, rank: 2, trend: 'up' },
        { name: 'Employee 3', points: 3, correct: 85, rank: 3, trend: 'down' }
      ],
      weakestTopics: weakestTopics.length > 0 ? weakestTopics : [],
      strongestTopics: strongestTopics.length > 0 ? strongestTopics : []
    };

    console.log('✅ Simple dashboard statistics compiled successfully');
    console.log('📊 Data:', { totalUsers, totalCourses, totalCertificates });
    res.json({ success: true, data: dashboardStats });

  } catch (error) {
    console.error('❌ Error fetching simple dashboard statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard statistics', 
      message: error.message
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('📊 Fetching dashboard statistics...');

    // Import required models
    const Common_Course = require('../models/common_courses');
    const EmployeeProgress = require('../models/EmployeeProgress');

    // Get current date for filtering
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
    const startOfWeekDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());

    // 1. Total Users (from Employee database)
    const totalUsers = await Employee.countDocuments();
    console.log('👥 Total users:', totalUsers);

    // 2. Active Courses (from both common_courses and admin courses)
    let commonCoursesCount = 0;
    let adminCoursesCount = 0;
    
    try {
      commonCoursesCount = await Common_Course.countDocuments();
    } catch (err) {
      console.log('⚠️ Common courses collection not found or empty:', err.message);
    }
    
    try {
      adminCoursesCount = await Course.countDocuments({ status: 'Published' });
    } catch (err) {
      console.log('⚠️ Admin courses query failed:', err.message);
    }
    
    const activeCourses = commonCoursesCount + adminCoursesCount;
    console.log('📚 Active courses:', activeCourses, '(Common:', commonCoursesCount, 'Admin:', adminCoursesCount, ')');

    // 3. Assessments Completed Today (from EmployeeProgress with timestamp)
    let todayAssessments = 0;
    try {
      const assessmentsCompletedToday = await EmployeeProgress.aggregate([
        {
          $unwind: '$quizProgress'
        },
        {
          $match: {
            'quizProgress.completedAt': {
              $gte: startOfToday
            }
          }
        },
        {
          $count: 'total'
        }
      ]);
      todayAssessments = assessmentsCompletedToday.length > 0 ? assessmentsCompletedToday[0].total : 0;
    } catch (err) {
      console.log('⚠️ EmployeeProgress query failed:', err.message);
    }
    console.log('✅ Assessments completed today:', todayAssessments);

    // 4. Certificates Issued This Week (from Certificate table)
    let weekCertificates = 0;
    try {
      // Import Certificate model from CertificateController
      const mongoose = require('mongoose');
      const Certificate = mongoose.model('Certificate');
      
      const certificatesThisWeek = await Certificate.countDocuments({
        completionDate: {
          $gte: startOfWeekDate
        }
      });
      weekCertificates = certificatesThisWeek;
    } catch (err) {
      console.log('⚠️ Certificates query failed:', err.message);
    }
    console.log('🏆 Certificates issued this week from Certificate table:', weekCertificates);

    // 5. Pass/Fail Percentage (from EmployeeProgress quiz data)
    let passPercentage = 80; // Default value
    let failPercentage = 20;
    
    try {
      const passFailData = await EmployeeProgress.aggregate([
        {
          $unwind: '$quizProgress'
        },
        {
          $group: {
            _id: '$quizProgress.passed',
            count: { $sum: 1 }
          }
        }
      ]);
      
      let passCount = 0;
      let failCount = 0;
      passFailData.forEach(item => {
        if (item._id === true) {
          passCount = item.count;
        } else {
          failCount = item.count;
        }
      });
      
      const totalQuizzes = passCount + failCount;
      passPercentage = totalQuizzes > 0 ? Math.round((passCount / totalQuizzes) * 100) : 80;
      failPercentage = 100 - passPercentage;
    } catch (err) {
      console.log('⚠️ Pass/Fail query failed:', err.message);
    }

    // 6. Employee Learning Chart (common courses with completion counts from Certificate table)
    let employeeData = [];
    try {
      // Import Certificate model from CertificateController
      const mongoose = require('mongoose');
      const Certificate = mongoose.model('Certificate');
      
      // Get all common courses first
      const commonCourses = await Common_Course.find({}, 'title').lean();
      console.log('📚 Common courses found:', commonCourses.length);
      
      // Get certificate counts for each common course from Certificate collection
      const courseCompletionData = await Certificate.aggregate([
        {
          $group: {
            _id: '$courseTitle',
            count: { $sum: 1 }
          }
        }
      ]);

      // Create a map of course completion counts
      const completionMap = {};
      courseCompletionData.forEach(course => {
        completionMap[course._id] = course.count;
      });

      // Map common courses with their completion counts
      employeeData = commonCourses.map(course => ({
        name: course.title,
        value: completionMap[course.title] || 0
      }));

      console.log('📊 Employee learning data from Certificate table:', employeeData);
    } catch (err) {
      console.log('⚠️ Course completion query failed:', err.message);
    }

    // 7. Leaderboard (Top 3 employees with most certificates from Certificate table)
    let leaderboard = [];
    try {
      // Import Certificate model from CertificateController
      const mongoose = require('mongoose');
      const Certificate = mongoose.model('Certificate');
      
      const leaderboardData = await Certificate.aggregate([
        {
          $group: {
            _id: '$employeeEmail',
            employeeName: { $first: '$employeeName' },
            certificateCount: { $sum: 1 }
          }
        },
        {
          $sort: { certificateCount: -1 }
        },
        {
          $limit: 3
        }
      ]);

      leaderboard = leaderboardData.map((emp, index) => ({
        name: emp.employeeName,
        points: emp.certificateCount, // Use certificate count as points
        correct: Math.round(Math.random() * 20 + 80), // Placeholder calculation
        rank: index + 1,
        trend: index % 2 === 0 ? 'up' : 'down'
      }));

      console.log('🏆 Leaderboard data from Certificate table:', leaderboard);
    } catch (err) {
      console.log('⚠️ Leaderboard query failed:', err.message);
    }

    // 8. Weakest and Strongest Topics (based on certificate counts from Certificate table)
    let weakestTopics = [];
    let strongestTopics = [];
    
    try {
      // Import Certificate model from CertificateController
      const mongoose = require('mongoose');
      const Certificate = mongoose.model('Certificate');
      
      // Get certificate counts for each course from Certificate collection
      const topicStats = await Certificate.aggregate([
        {
          $group: {
            _id: '$courseTitle',
            certificateCount: { $sum: 1 }
          }
        },
        {
          $match: {
            _id: { $ne: null } // Exclude null course titles
          }
        },
        {
          $sort: { certificateCount: 1 } // Ascending for weakest first
        }
      ]);

      console.log('📊 Topic stats from Certificate table:', topicStats);

      if (topicStats.length > 0) {
        // Get the top 2 weakest topics (lowest certificate counts)
        weakestTopics = topicStats.slice(0, 2).map(topic => ({
          name: topic._id,
          completion: topic.certificateCount,
          color: '#EF4444'
        }));

        // Get the top 2 strongest topics (highest certificate counts)
        // Only take from the end if there are enough topics to avoid overlap
        const startIndex = Math.max(2, topicStats.length - 2);
        strongestTopics = topicStats.slice(startIndex).reverse().map(topic => ({
          name: topic._id,
          completion: topic.certificateCount,
          color: '#10B981'
        }));

        // Ensure no overlap between weakest and strongest
        const weakestNames = weakestTopics.map(t => t.name);
        strongestTopics = strongestTopics.filter(topic => !weakestNames.includes(topic.name));
        
        // If we need more strongest topics, get them from the remaining
        if (strongestTopics.length < 2 && topicStats.length > 4) {
          const remainingTopics = topicStats.slice(2, -2).reverse();
          for (const topic of remainingTopics) {
            if (strongestTopics.length >= 2) break;
            if (!weakestNames.includes(topic._id)) {
              strongestTopics.push({
                name: topic._id,
                completion: topic.certificateCount,
                color: '#10B981'
              });
            }
          }
        }
      }

      console.log('📉 Weakest topics from Certificate table:', weakestTopics);
      console.log('📈 Strongest topics from Certificate table:', strongestTopics);
    } catch (err) {
      console.log('⚠️ Topic stats query failed:', err.message);
    }

    const dashboardStats = {
      totalUsers,
      activeCourses,
      assessmentsCompletedToday: todayAssessments,
      certificatesIssuedThisWeek: weekCertificates,
      passFailData: [
        { name: 'Pass', value: passPercentage, color: '#10B981' },
        { name: 'Fail', value: failPercentage, color: '#1F2937' }
      ],
      employeeData,
      leaderboard,
      weakestTopics,
      strongestTopics
    };

    console.log('✅ Dashboard statistics compiled successfully');
    console.log('📊 Dashboard data:', JSON.stringify(dashboardStats, null, 2));
    res.json({ success: true, data: dashboardStats });

  } catch (error) {
    console.error('❌ Error fetching dashboard statistics:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard statistics', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  getEmployees,
  getEmployeesForAssignment,
  verifyToken,
  createAssignedTask,
  getAssignedTasks,
  getAssignedTaskById,
  updateAssignedTaskProgress,
  deleteAssignedTask,
  getAllTasksDebug,
  getAssignedTasksStats,
  createCourse,
  getCourses,
  getCourseById,
  getCourseByName,
  updateCourse,
  deleteCourse,
  getAssignedCourses,
  getAvailableCourses,
  assignTaskByEmail,
  getAssignedTasksForUser,
  startAssignedTask,
  // Assigned course functions
  assignCourseToEmployee: assignCourseToEmployeeController,
  getEmployeeAssignedCourseProgress,
  getAllEmployeesAssignedCourseProgress,
  testAssignedCourseCollection,
  createTestAssignment,
  testCommonCourseProgress,
  // Dashboard statistics
  getDashboardStats,
  getSimpleDashboardStats
};
