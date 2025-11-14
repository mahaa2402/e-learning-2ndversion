const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

const router = express.Router();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,   // from IAM user
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'public-read',
    key: function (req, file, cb) {
      cb(null, `videos/${Date.now()}_${file.originalname}`);
    }
  })
});

// Image upload configuration - use temp storage then upload to S3 (same as VideoUpload.js)
const imageUpload = multer({ dest: "uploads/" });
const path = require('path');
const fs = require('fs');
// Use a simple unique ID generator if uuid is not available
const generateUniqueId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Health check for upload routes
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Upload routes are working',
    timestamp: new Date().toISOString()
  });
});

// API endpoint to upload video
router.post('/upload-video', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  res.json({
    message: "Upload successful",
    videoUrl: req.file.location   // S3 public URL
  });
});

// API endpoint to upload quiz question image
// Path: /api/upload/upload-quiz-image/:courseName/:moduleNumber/:questionIndex
router.post('/upload-quiz-image/:courseName/:moduleNumber/:questionIndex', imageUpload.single('image'), async (req, res) => {
  try {
    console.log('📥 Quiz image upload route hit!');
    console.log('📥 Params:', req.params);
    console.log('📥 File:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file');
    
    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const { courseName, moduleNumber, questionIndex } = req.params;
    const file = req.file;

    // Decode and sanitize course name
    const decodedCourseName = decodeURIComponent(courseName);
    const sanitizedCourseName = decodedCourseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const moduleFolder = `mod${moduleNumber || 1}`;
    
    // Create unique filename
    const uniqueFileName = `${Date.now()}_${generateUniqueId()}${path.extname(file.originalname)}`;
    const s3Key = `e-learning/videos/${sanitizedCourseName}/${moduleFolder}/quiz-images/question_${questionIndex || 'new'}_${uniqueFileName}`;
    
    console.log(`📤 Uploading image to S3: ${s3Key}`);
    console.log(`📤 Course Name: "${decodedCourseName}"`);
    console.log(`📤 Sanitized Course Name: "${sanitizedCourseName}"`);
    console.log(`📤 Module Number: ${moduleNumber}`);
    console.log(`📤 Question Index: ${questionIndex}`);
    console.log(`📤 File Name: ${uniqueFileName}`);

    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET_NAME) {
      console.error('❌ AWS credentials not configured');
      // Clean up temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(500).json({ error: "AWS S3 not configured. Please check environment variables." });
    }

    // Read file from temp location
    console.log('📤 Reading file from temp location:', file.path);
    const fileContent = fs.readFileSync(file.path);
    console.log('📤 File read, size:', fileContent.length, 'bytes');
    
    // Upload to S3
    console.log('📤 Uploading to S3...');
    console.log('📤 Bucket:', process.env.AWS_BUCKET_NAME);
    console.log('📤 Key:', s3Key);
    console.log('📤 ContentType:', file.mimetype);
    
    const uploadResult = await s3
      .upload({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
        Body: fileContent,
        ContentType: file.mimetype
        // ACL removed - bucket doesn't allow ACLs, use bucket policy for public access instead
      })
      .promise();
    
    console.log('✅ S3 upload successful:', uploadResult.Location);

    // Delete temp file
    fs.unlinkSync(file.path);

    console.log(`✅ Image uploaded successfully to S3: ${s3Key}`);

    res.json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl: uploadResult.Location, // S3 public URL
      s3Key: s3Key
    });
  } catch (error) {
    console.error('❌ Image upload error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Clean up temp file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('❌ Error deleting temp file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      error: "Failed to upload image", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
