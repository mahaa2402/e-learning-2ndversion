const express = require('express');
const router = express.Router();
const { saveQuizProgress, getUserProgress, getUserProgressWithUnlocking } = require('../controllers/ProgressController');
const {authenticateToken} = require('../middleware/auth');

// Debug logs
console.log('saveQuizProgress:', typeof saveQuizProgress, saveQuizProgress);
console.log('getUserProgress:', typeof getUserProgress, getUserProgress);
console.log('getUserProgressWithUnlocking:', typeof getUserProgressWithUnlocking, getUserProgressWithUnlocking);
console.log('authenticateToken:', typeof authenticateToken, authenticateToken);

router.post('/save', authenticateToken, saveQuizProgress);
router.get('/get', authenticateToken, getUserProgress);
router.get('/get-with-unlocking', authenticateToken, getUserProgressWithUnlocking);
router.post('/submit-quiz', authenticateToken, saveQuizProgress);

module.exports = router;
