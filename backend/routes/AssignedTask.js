// backend/routes/AssignedTask.js
const express = require('express');
const router = express.Router();
const { createAssignedTask, getAssignedTasks, getAssignedTaskById, updateAssignedTaskProgress, deleteAssignedTask } = require('../controllers/Admin');
const { authenticateToken } = require('../middleware/auth');

router.post('/assigned-tasks', authenticateToken, createAssignedTask);
router.get('/assigned-tasks', authenticateToken, getAssignedTasks);
router.get('/assigned-tasks/:id', authenticateToken, getAssignedTaskById);
router.patch('/assigned-tasks/:id/progress', authenticateToken, updateAssignedTaskProgress);
router.delete('/assigned-tasks/:id', authenticateToken, deleteAssignedTask);


module.exports = router;
