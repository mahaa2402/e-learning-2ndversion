// const mongoose = require('mongoose');

// const quizSchema = new mongoose.Schema({
//   courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
//   mo_id: { type: String, required: true },
//   questions: [
//     {
//       question: { type: String, required: true },
//       type: {
//         type: String,
//         enum: ['multiple-choice', 'true-false', 'fill-in-blank'],
//         default: 'multiple-choice'
//       },
//       options: [String],
//       correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
//       points: { type: Number, default: 1 }
//     }
//   ],
//   passingScore: { type: Number, default: 70 },
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now }
// });


// // 📌 Static function to get all titles
// quizSchema.statics.getAllTitles = async function () {
//   const titles = await this.find({}, 'title').lean();
//   return titles.map(q => q.title);
// };

// const Quiz = mongoose.model('Quiz', quizSchema);

// module.exports = Quiz;



const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommonCourse',
    required: true
  },
  mo_id: {
    type: String,
    required: true  // Will be validated to match a Course's module ID
  },
  questions: [
    {
      question: { type: String, required: true },
      type: {
        type: String,
        enum: ['multiple-choice', 'true-false', 'fill-in-blank'],
        default: 'multiple-choice'
      },
      options: [String],
      correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
      points: { type: Number, default: 1 }
    }
  ],
  passingScore: { type: Number, default: 70 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Validate that mo_id exists in the course's modules
quizSchema.pre('save', async function (next) {
  const Common_Course = mongoose.model('CommonCourse');
  const course = await Common_Course.findById(this.courseId);

  if (!course) {
    return next(new Error('Invalid courseId: Course not found'));
  }

  const moduleExists = course.modules.some(mod => mod.m_id === this.mo_id);

  if (!moduleExists) {
    return next(new Error(`Invalid mo_id: Module '${this.mo_id}' not found in course '${this.courseId}'`));
  }

  next();
});

// quizSchema.statics.getQuestionsByCourseAndModule = async function (courseId, moduleId) {
//   return this.findOne({ courseId, mo_id: moduleId }, { questions: 1, _id: 0 });
// };

// New method to get questions in batches
quizSchema.statics.getQuestionsByCourseAndModuleBatch = async function (courseId, moduleId, attemptNumber ) { //attemptnumber ==1 changeddd
  console.log('🔍 getQuestionsByCourseAndModuleBatch called with:', { courseId, moduleId, attemptNumber, courseIdType: typeof courseId });
  
  const mongoose = require('mongoose');
  
  // Try to find quiz with courseId as ObjectId first
  let quiz = await this.findOne({ courseId: courseId, mo_id: moduleId }, { questions: 1, _id: 0 });
  
  // If not found and courseId is a string, try converting to ObjectId
  if (!quiz && typeof courseId === 'string' && mongoose.Types.ObjectId.isValid(courseId)) {
    const objectIdCourseId = new mongoose.Types.ObjectId(courseId);
    console.log('🔄 Retrying with ObjectId conversion:', objectIdCourseId);
    quiz = await this.findOne({ courseId: objectIdCourseId, mo_id: moduleId }, { questions: 1, _id: 0 });
  }
  
  // If still not found, try with string comparison using $expr
  if (!quiz && typeof courseId === 'string') {
    console.log('🔄 Retrying with string comparison');
    quiz = await this.findOne({ 
      $expr: { $eq: [{ $toString: "$courseId" }, String(courseId)] }, 
      mo_id: moduleId 
    }, { questions: 1, _id: 0 });
  }
  
  // If still not found, try finding by moduleId alone (fallback - in case courseId doesn't match)
  if (!quiz) {
    console.log('🔄 Retrying with moduleId only (ignoring courseId):', moduleId);
    quiz = await this.findOne({ mo_id: moduleId }, { questions: 1, _id: 0 });
    if (quiz) {
      console.log('⚠️ Found quiz by moduleId only - courseId mismatch detected!');
    }
  }
  
  console.log('🔍 Found quiz:', quiz ? 'Yes' : 'No');
  
  if (!quiz || !quiz.questions) {
    console.log('❌ No quiz or questions found');
    return null;
  }

  const questions = quiz.questions;
  console.log('📚 Total questions in quiz:', questions.length);
  
  // For first attempt, return first 5 questions
  if (attemptNumber === 1) {
    const result = { questions: questions.slice(0, 5) };
    console.log('✅ Returning first 5 questions for attempt 1');
    return result;
  }
  
  // For retake (attempt 2), return next 5 questions (questions 6-10)
  if (attemptNumber === 2) {
    const result = { questions: questions.slice(5, 10) };
    console.log('✅ Returning questions 6-10 for attempt 2');
    return result;
  }
  
  // For any other attempt, return all questions
  console.log('✅ Returning all questions for attempt', attemptNumber);
  return { questions: questions };
};


const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;
