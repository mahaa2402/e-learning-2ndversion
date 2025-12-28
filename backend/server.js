// server.js or index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const Admin = require('./models/Admin');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/Admin');
const courseRoutes = require('./routes/Course');
const employeeRoutes = require('./routes/Employee');
const assignedTaskRoutes = require('./routes/AssignedTask');
const progressRoutes = require('./routes/progressRoutes');
const assignedCourseProgressRoutes = require('./routes/AssignedCourseProgress');
const certificateRoutes = require('./routes/CertificateRoutes');
const videoUploadRoutes = require('./routes/VideoUpload');
const videoUploadMultipartRoutes = require('./routes/VideoUploadMultipart');
const videoFetchRoutes = require('./routes/Videofetch');
const uploadRoutes = require('./routes/Upload');
const { initializeEmailService } = require('./services/emailService');

const app = express();

console.log('🔧 Starting E-learning Server...');

// Debug: Check course completion email configuration
console.log('📧 Course Completion Email Configuration:');
console.log('  COURSE_COMPLETION_EXTRA_RECIPIENTS:', process.env.COURSE_COMPLETION_EXTRA_RECIPIENTS ? `Set (${process.env.COURSE_COMPLETION_EXTRA_RECIPIENTS.length} chars)` : 'NOT SET');
console.log('  COMPLETION_NOTIFICATION_EMAIL:', process.env.COMPLETION_NOTIFICATION_EMAIL || 'NOT SET');
console.log('  COMPLETION_NOTIFICATION_NAME:', process.env.COMPLETION_NOTIFICATION_NAME || 'NOT SET (will use default)');

// Initialize email service
initializeEmailService();

// CORS
app.use(cors({
  origin: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type','Authorization','x-auth-token','X-Access-Token','X-Auth-Token','access-token'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing (for JSON/URL-encoded data, not file uploads)
// File uploads are handled by multer with their own limits
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));

// Increase server timeout for large file uploads (2 hours - matches nginx)
app.timeout = 7200000; // 2 hours (7200 seconds)
if (app.setTimeout) {
  app.setTimeout(7200000);
}

// Debug middleware - MUST be after body parsing but before routes
app.use((req, res, next) => {
  // Log ALL requests, especially PUT requests
  if (req.method === 'PUT' || req.url.includes('/update/')) {
    console.log('🚨 ========================================');
    console.log(`🚨 ${req.method} ${req.url}`);
    console.log(`🚨 Original URL: ${req.originalUrl}`);
    console.log(`🚨 Path: ${req.path}`);
    console.log(`🚨 Base URL: ${req.baseUrl || 'N/A'}`);
    console.log(`🚨 Origin: ${req.headers.origin || 'No origin'}`);
    console.log(`🚨 User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'No user-agent'}`);
    if (['POST','PUT','PATCH'].includes(req.method)) {
      console.log(`🚨 Body: ${JSON.stringify(req.body, null, 2)}`);
    }
    console.log('🚨 ========================================\n');
  } else {
    console.log(`📝 ${req.method} ${req.url}`);
  }
  next();
});

// Create default admin if none exists
async function createDefaultAdmin() {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const defaultAdmin = new Admin({
        name: 'Default Admin',
        email: 'admin@elearning.com',
        password: hashedPassword
      });
      await defaultAdmin.save();
      console.log('✅ Default admin created - Email: admin@elearning.com, Password: admin123');
    } else {
      console.log('ℹ️  Admin already exists, skipping default admin creation');
    }
  } catch (err) {
    console.error('❌ Error creating default admin:', err);
  }
}

// Connect to MongoDB
console.log('🔗 Attempting to connect to MongoDB...');
console.log('📡 Connection string:', process.env.MONGO_URI ? 'Present' : 'Missing');
console.log('🗄️ Database name:', process.env.MONGO_URI ? process.env.MONGO_URI.split('/').pop() : 'Unknown');

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
.then(async () => {
  console.log('✅ Connected to MongoDB Atlas');
  console.log('🗄️ Connected to database:', mongoose.connection.db.databaseName);

  const Employee = require('./models/Employee');
  const employeeCount = await Employee.countDocuments();
  console.log(`👥 Current employee count in database: ${employeeCount}`);

  // Await default admin creation
  await createDefaultAdmin();
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err);
  console.error('🔍 Connection details:', {
    uri: process.env.MONGO_URI ? 'Present' : 'Missing',
    error: err.message
  });
});

// Routes
console.log('📋 Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
console.log('📋 Registering /api/courses routes...');
app.use('/api/courses', courseRoutes);
console.log('✅ All routes registered');
app.use('/api/employee', employeeRoutes);
app.use('/api', assignedTaskRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/assigned-course-progress', assignedCourseProgressRoutes);
app.use('/api/certificate', certificateRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/videos', videoUploadRoutes);
app.use('/api/videos/multipart', videoUploadMultipartRoutes);
app.use('/api/video', videoFetchRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000
    };

    try {
      await mongoose.connection.db.admin().ping();
      health.mongodb = 'Connected';
    } catch (err) {
      health.mongodb = 'Disconnected';
      health.mongodb_error = err.message;
    }

    res.json(health);
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message, timestamp: new Date().toISOString() });
  }
});

// Home
app.get('/', (req, res) => {
  res.json({
    message: '🌐 E-learning backend is running...',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/admin/*',
      'GET /api/courses/*',
      'GET /api/employees/*',
      'GET /api/assignedtasks',
      'GET /api/certificates/:id'
    ]
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// 500 handler
app.use((err, req, res, next) => {
  console.error('💥 Unexpected error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message, timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  server.close();
  await mongoose.connection.close();
  console.log('📴 Server and database connections closed');
  process.exit(0);
});
