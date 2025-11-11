const mongoose = require('mongoose');

const employeeProgressSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  employeeEmail: {
    type: String,
    required: true
  },
  quizProgress: [{
    quizId: {
      type: Number,
      required: true
    },
    quizName: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    totalQuestions: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      required: true
    },
    passed: {
      type: Boolean,
      required: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    attempts: [{
      score: Number,
      totalQuestions: Number,
      percentage: Number,
      passed: Boolean,
      attemptedAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  currentLevel: {
    type: Number,
    default: 0
  },
  totalQuizzesCompleted: {
    type: Number,
    default: 0
  },
  totalScore: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
employeeProgressSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to add or update quiz progress
employeeProgressSchema.methods.updateQuizProgress = function(quizId, quizName, score, totalQuestions, passed) {
  const percentage = (score / totalQuestions) * 100;
  
  // Find existing quiz progress
  const existingQuizIndex = this.quizProgress.findIndex(qp => qp.quizId === quizId);
  
  if (existingQuizIndex !== -1) {
    // Update existing quiz progress
    const existingQuiz = this.quizProgress[existingQuizIndex];
    
    // Add attempt to history
    existingQuiz.attempts.push({
      score: existingQuiz.score,
      totalQuestions: existingQuiz.totalQuestions,
      percentage: existingQuiz.percentage,
      passed: existingQuiz.passed,
      attemptedAt: existingQuiz.completedAt
    });
    
    // Update current progress
    existingQuiz.score = score;
    existingQuiz.totalQuestions = totalQuestions;
    existingQuiz.percentage = percentage;
    existingQuiz.passed = passed;
    existingQuiz.completedAt = new Date();
  } else {
    // Add new quiz progress
    this.quizProgress.push({
      quizId,
      quizName,
      score,
      totalQuestions,
      percentage,
      passed,
      completedAt: new Date(),
      attempts: []
    });
    
    // Update total quizzes completed
    this.totalQuizzesCompleted += 1;
  }
  
  // Update overall statistics
  this.updateOverallStats();
  
  return this;
};

// Method to update overall statistics
employeeProgressSchema.methods.updateOverallStats = function() {
  if (this.quizProgress.length > 0) {
    this.totalScore = this.quizProgress.reduce((sum, quiz) => sum + quiz.score, 0);
    this.averageScore = this.totalScore / this.quizProgress.length;
    this.currentLevel = this.quizProgress.filter(quiz => quiz.passed).length;
  }
  
  this.lastActivity = new Date();
};

const EmployeeProgress = mongoose.model('EmployeeProgress', employeeProgressSchema);

module.exports = EmployeeProgress; 
