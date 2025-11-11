const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  courseTitle: { type: String, required: true },
  issuedOn: { type: Date, default: Date.now },
  certificateId: { type: String, required: true }  // UUID
});

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String, required: true },
  levelCount: { type: Number, default: 0 },
  certificates: [certificateSchema], // ✅ Certificates array
  createdAt: { type: Date, default: Date.now }
});

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
