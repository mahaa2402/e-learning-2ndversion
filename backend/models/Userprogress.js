const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },  // ✅ changed from userId
  courseName: { type: String, required: true },
  completedModules: [
    {
      m_id: String,
      completedAt: Date
    }
  ],
  lastAccessedModule: String
});

module.exports = mongoose.model('UserProgress', userProgressSchema);
