const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'General' },
  duration: { type: String, default: 'TBD' },
  status: { 
    type: String, 
    enum: ['Draft', 'Published', 'Archived'], 
    default: 'Draft' 
  },
  modules: [{
    title: { type: String, required: true },
    video: {
      name: { type: String },
      size: { type: String },
      type: { type: String },
      duration: { type: String },
      url: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    },
    quiz: {
      questions: [{
        question: { type: String, required: true },
        type: { 
          type: String, 
          enum: ['multiple-choice', 'true-false', 'fill-in-blank'],
          default: 'multiple-choice'
        },
        options: [String],
        correctAnswer: Number,
        points: { type: Number, default: 1 }
      }],
      passingScore: { type: Number, default: 70 }
    }
  }],
  createdDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  enrollments: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'admin_courses' });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
