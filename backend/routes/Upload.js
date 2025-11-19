const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');

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
// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsDir);
}

const imageUpload = multer({ dest: uploadsDir });

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

// POST /upload-course-image/:courseName - Upload course background image
router.post('/upload-course-image/:courseName', imageUpload.single('image'), async (req, res) => {
  try {
    console.log('📤 Course image upload request received');
    console.log('📤 Course name:', req.params.courseName);
    console.log('📤 File:', req.file ? req.file.originalname : 'No file');

    // Check AWS credentials first
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET_NAME || !process.env.AWS_REGION) {
      console.error('❌ AWS credentials not configured');
      console.error('❌ Missing:', {
        AWS_ACCESS_KEY_ID: !process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: !process.env.AWS_SECRET_ACCESS_KEY,
        AWS_BUCKET_NAME: !process.env.AWS_BUCKET_NAME,
        AWS_REGION: !process.env.AWS_REGION
      });
      
      // Clean up temp file if it exists
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('❌ Error deleting temp file:', unlinkError);
        }
      }
      
      return res.status(500).json({ 
        error: 'AWS S3 not configured. Please check environment variables.',
        details: 'Missing AWS credentials or bucket configuration'
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Sanitize course name (same as video upload)
    const courseName = decodeURIComponent(req.params.courseName)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();

    // Generate unique filename
    const fileExtension = path.extname(req.file.originalname) || '.jpg';
    const uniqueFileName = `${Date.now()}_${generateUniqueId()}${fileExtension}`;
    const s3Key = `e-learning/course-images/${courseName}/${uniqueFileName}`;

    console.log('📤 Uploading to S3:', s3Key);
    console.log('📤 Bucket:', process.env.AWS_BUCKET_NAME);
    console.log('📤 Region:', process.env.AWS_REGION);

    // Check if file exists and is readable
    if (!fs.existsSync(req.file.path)) {
      throw new Error('Temporary file not found after upload');
    }

    // Read the file
    const fileContent = fs.readFileSync(req.file.path);
    console.log('📤 File read, size:', fileContent.length, 'bytes');

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: req.file.mimetype || 'image/jpeg'
    };

    console.log('📤 Uploading to S3 with params:', {
      Bucket: uploadParams.Bucket,
      Key: uploadParams.Key,
      ContentType: uploadParams.ContentType,
      BodySize: fileContent.length
    });

    const uploadResult = await s3.upload(uploadParams).promise();
    console.log('✅ Course image uploaded to S3:', uploadResult.Location);

    // Clean up temporary file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('✅ Temporary file deleted');
    }

    res.json({
      success: true,
      message: 'Course image uploaded successfully',
      image: {
        url: uploadResult.Location,
        s3Key: s3Key,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Course image upload error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    // Clean up temporary file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('✅ Cleaned up temporary file after error');
      } catch (unlinkError) {
        console.error('❌ Error deleting temp file:', unlinkError);
      }
    }

    res.status(500).json({ 
      error: 'Failed to upload course image',
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
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
