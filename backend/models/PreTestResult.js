const mongoose = require('mongoose');

const PreTestResultSchema = new mongoose.Schema({
  courseId: { type: String, required: true },
  courseName: { type: String },
  employeeEmail: { type: String, required: true },
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  percentage: { type: Number },
  passed: { type: Boolean },
  answers: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PreTestResult', PreTestResultSchema);
