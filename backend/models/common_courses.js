// const mongoose = require('mongoose');

// const courseSchema = new mongoose.Schema(
//     {
//         title: { type: String, required: true },


//     }
// )

const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },                     // Course description

    modules: [
      {
        m_id:{ type: String, required: true },
        name: { type: String, required: true },        // Module title or name
        duration: { type: Number, required: true },    // Duration in minutes/hours
        description: { type: String },                 // Optional: brief description
        lessons: { type: Number, required: true },
        // Lesson details for this module
        lessonDetails: {
          title: { type: String },                      // Lesson title
          videoUrl: { type: String },                  // Video URL for the lesson
          content: [{ type: String }],                 // Array of content strings
          duration: { type: String }                   // Lesson duration (e.g., "30min")
        }
      }
    ]
  }
  
);


courseSchema.statics.getCourseInfoWithoutModules = async function () {
  const courses = await this.find({}, '-modules').lean();
  return courses;
};

courseSchema.statics.findByTitle = async function(title) {
  return await this.findOne({ title });
};



const Common_Course = mongoose.model('CommonCourse', courseSchema);

module.exports = Common_Course;
