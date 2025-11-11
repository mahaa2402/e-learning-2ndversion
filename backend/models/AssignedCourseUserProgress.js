const mongoose = require('mongoose');

const assignedCourseUserProgressSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  employeeName: { type: String, required: true },
  employeeEmail: { type: String, required: true },
  employeeDepartment: { type: String, required: true },
  // Dynamic assigned course progress fields
  assignedCourseProgress: { type: Map, of: Number, default: {} },
  // Track which admin assigned each course
  courseAssignments: [{
    courseName: { type: String, required: true },
    assignedBy: {
      adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
      adminName: { type: String, required: true },
      adminEmail: { type: String, required: true }
    },
    assignedAt: { type: Date, default: Date.now },
    deadline: { type: Date },
    status: { 
      type: String, 
      enum: ['assigned', 'in-progress', 'completed', 'overdue'], 
      default: 'assigned' 
    }
  }],
  updatedAt: { type: Date, default: Date.now }
});

assignedCourseUserProgressSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('AssignedCourseUserProgress', assignedCourseUserProgressSchema, 'assignedcourse_userprogress'); 
