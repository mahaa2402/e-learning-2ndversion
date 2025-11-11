const mongoose = require('mongoose');

const assignedCourseProgressTimestampSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  employeeName: { type: String, required: true },
  employeeEmail: { type: String, required: true },
  employeeDepartment: { type: String, required: true },
  // Dynamic assigned course timestamp fields
  assignedCourseTimestamp: { type: Map, of: Date, default: {} },
  // Track which admin assigned each course and when
  courseTimestampAssignments: [{
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

assignedCourseProgressTimestampSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('AssignedCourseProgressTimestamp', assignedCourseProgressTimestampSchema, 'assignedcourseprogresstimestamp');


