// backend/routes/VideoUpload.js
const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const ffmpeg = require("fluent-ffmpeg");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const Course = require("../models/Course"); // make sure this path is correct
const Common_Course = require("../models/common_courses"); // Import Common_Course model

const router = express.Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Video upload service is running",
    timestamp: new Date().toISOString()
  });
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsDir);
}

// Multer temp storage - NO FILE SIZE LIMIT (supports 1GB+ videos)
const upload = multer({ 
  dest: uploadsDir,
  limits: {
    fileSize: Infinity, // No limit - allows 1GB+ videos
    fieldSize: 10 * 1024 * 1024, // 10MB for other fields
  }
});

// AWS S3 Config
const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
};

// Add endpoint override if needed (for some regions or custom endpoints)
if (process.env.AWS_ENDPOINT) {
  s3Config.endpoint = process.env.AWS_ENDPOINT;
  s3Config.s3ForcePathStyle = true; // Required for some S3-compatible services
  console.log('📤 Using custom AWS endpoint:', process.env.AWS_ENDPOINT);
}

// Enable signature version 4 for better compatibility
s3Config.signatureVersion = 'v4';

const s3 = new AWS.S3(s3Config);

// Log AWS configuration (without sensitive data)
console.log('✅ AWS S3 Configuration:', {
  region: s3Config.region,
  bucket: process.env.AWS_BUCKET_NAME,
  endpoint: s3Config.endpoint || 'default',
  hasAccessKey: !!s3Config.accessKeyId,
  hasSecretKey: !!s3Config.secretAccessKey
});

// Error handler for multer errors (file size limit removed)
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // File size limit errors should not occur since we set fileSize to Infinity
    // But keep this for other multer errors
    return res.status(400).json({ 
      error: "File upload error", 
      details: err.message,
      code: err.code
    });
  }
  next(err);
};

// 🎯 Simple video upload to S3 using course name and module number
router.post(
  "/upload-video/:courseName/:moduleNumber",
  upload.single("video"),
  handleMulterError,
  async (req, res) => {
    // Set timeout for this route (2 hours for large files - matches nginx)
    req.setTimeout(7200000); // 2 hours (7200 seconds)
    res.setTimeout(7200000); // 2 hours (7200 seconds)
    
    try {
      console.log('📥 Video upload request received');
      console.log('📥 Params:', req.params);
      console.log('📥 Files:', req.files);
      console.log('📥 File:', req.file);
      console.log('📥 Body:', req.body);

      const { courseName, moduleNumber } = req.params;
      const file = req.file;

      if (!file) {
        console.error('❌ No file in request');
        return res.status(400).json({ error: "No video file uploaded" });
      }

      // Decode course name if it was URL encoded
      const decodedCourseName = decodeURIComponent(courseName);
      
      // Validate course name and module number
      if (!decodedCourseName || decodedCourseName === 'undefined' || decodedCourseName === 'null') {
        console.error('❌ Invalid course name:', decodedCourseName);
        return res.status(400).json({ error: "Invalid course name" });
      }

      const moduleNum = parseInt(moduleNumber);
      if (!moduleNumber || isNaN(moduleNum) || moduleNum < 1) {
        console.error('❌ Invalid module number:', moduleNumber);
        return res.status(400).json({ error: "Invalid module number" });
      }

      console.log(`📤 Uploading video for course: "${decodedCourseName}", module: ${moduleNum}`);
      console.log(`📤 File: ${file.originalname}, Size: ${file.size} bytes`);

      // Create S3 path: e-learning/videos/CourseName/mod1/video.mp4 (or mod2, mod3, etc.)
      const sanitizedCourseName = decodedCourseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const moduleFolder = `mod${moduleNum}`;
      const uniqueFileName = `${Date.now()}_${uuidv4()}${path.extname(
        file.originalname
      )}`;
      const key = `e-learning/videos/${sanitizedCourseName}/${moduleFolder}/${uniqueFileName}`;
      
      console.log(`📤 S3 Key: ${key}`);
      console.log(`📤 Course Name: "${decodedCourseName}"`);
      console.log(`📤 Sanitized Course Name: "${sanitizedCourseName}"`);
      console.log(`📤 Module Number: ${moduleNum}`);
      console.log(`📤 File Name: ${uniqueFileName}`);

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
        if (file && file.path && fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkError) {
            console.error('❌ Error deleting temp file:', unlinkError);
          }
        }
        
        return res.status(500).json({ 
          error: "AWS S3 not configured. Please check environment variables.",
          details: "Missing AWS credentials or bucket configuration"
        });
      }
      
      // Log AWS configuration (without exposing secrets)
      console.log('✅ AWS Configuration:', {
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 4)}...` : 'NOT SET',
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
        AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
        AWS_REGION: process.env.AWS_REGION
      });

      // Upload to S3
      console.log('📤 Reading file from temp location:', file.path);
      const fileContent = fs.readFileSync(file.path);
      console.log('📤 File read, size:', fileContent.length, 'bytes');
      
      console.log('📤 Uploading to S3...');
      console.log('📤 Bucket:', process.env.AWS_BUCKET_NAME);
      console.log('📤 Key:', key);
      console.log('📤 ContentType:', file.mimetype);
      
      const uploadResult = await s3
        .upload({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          Body: fileContent,
          ContentType: file.mimetype,
        })
        .promise();
      
      console.log('✅ S3 upload successful:', uploadResult.Location);

            // Extract video duration (optional)
      let duration = null;
      try {
        duration = await new Promise((resolve, reject) => {
          ffmpeg.ffprobe(file.path, (err, metadata) => {
            if (err) return reject(err);
            resolve(
              metadata.format.duration
                ? `${Math.floor(metadata.format.duration / 60)}:${Math.floor(
                    metadata.format.duration % 60
                  )
                    .toString()
                    .padStart(2, "0")}`
                : null
            );
          });
        });
      } catch (err) {
        console.warn("⚠️ Could not extract duration", err);
      }

      // Delete temp file
      fs.unlinkSync(file.path);

      console.log(`✅ Video uploaded successfully to S3: ${key}`);

      // Automatically update course in database with video URL
      try {
        let course = null;
        
        // Try to find course by courseId from query parameter first (most reliable)
        if (req.query.courseId) {
          const mongoose = require('mongoose');
          if (mongoose.Types.ObjectId.isValid(req.query.courseId)) {
            course = await Common_Course.findById(req.query.courseId);
            console.log(`📤 Found course by ID: ${req.query.courseId}`);
          }
        }
        
        // If not found by ID, try to find by title
        if (!course) {
          // Try exact title match first
          course = await Common_Course.findOne({ title: decodedCourseName });
          
          // If not found, try case-insensitive match
          if (!course) {
            course = await Common_Course.findOne({ 
              title: { $regex: new RegExp(`^${decodedCourseName.replace(/[^a-zA-Z0-9]/g, '.*')}$`, 'i') }
            });
          }
          
          // If still not found, try sanitized name
          if (!course) {
            const sanitizedTitle = decodedCourseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            course = await Common_Course.findOne({ 
              title: { $regex: new RegExp(sanitizedTitle, 'i') }
            });
          }
        }
        
        if (course) {
          // Find the module by module number (modules array index + 1)
          const moduleIndex = moduleNum - 1;
          if (course.modules && course.modules[moduleIndex]) {
            const module = course.modules[moduleIndex];
            
            // Update module's lessonDetails with video URL
            if (!module.lessonDetails) {
              module.lessonDetails = {
                title: module.name,
                videoUrl: uploadResult.Location,
                content: [],
                duration: duration || `${module.duration || 0}min`,
                notes: module.notes || ''
              };
            } else {
              module.lessonDetails.videoUrl = uploadResult.Location;
              if (duration) {
                module.lessonDetails.duration = duration;
              }
            }
            
            // Mark module as modified
            course.markModified('modules');
            await course.save();
            
            console.log(`✅ Course "${course.title}" (ID: ${course._id}) updated with video URL for module ${moduleNum} (m_id: ${module.m_id})`);
            console.log(`✅ Video URL saved to database: ${uploadResult.Location}`);
          } else {
            console.warn(`⚠️ Module ${moduleNum} (index ${moduleIndex}) not found in course "${course.title}". Course has ${course.modules?.length || 0} modules.`);
          }
        } else {
          console.warn(`⚠️ Could not find course to update. Searched for: "${decodedCourseName}". Video uploaded to S3: ${uploadResult.Location}`);
          console.warn(`⚠️ Video URL will need to be manually added to the course.`);
        }
      } catch (dbError) {
        console.error('❌ Error updating course in database:', dbError);
        console.error('❌ DB Error details:', {
          message: dbError.message,
          stack: dbError.stack
        });
        // Don't fail the upload if DB update fails - video is already in S3
        console.warn('⚠️ Video uploaded to S3 but failed to update course in database. Video URL:', uploadResult.Location);
      }

      const response = {
        success: true,
        message: `Video uploaded for ${decodedCourseName} Module ${moduleNum}`,
        video: {
          url: uploadResult.Location,
          title: file.originalname,
          duration,
          s3Key: key,
          uploadedAt: new Date().toISOString()
        }
      };

      console.log('✅ Sending success response:', JSON.stringify(response, null, 2));
      res.json(response);

      
    } catch (error) {
      console.error("❌ Video upload error:", error);
      console.error("❌ Error stack:", error.stack);
      console.error("❌ Error details:", {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
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
      
      // Provide more specific error messages
      let errorMessage = error.message;
      let errorCode = error.code || 'UNKNOWN_ERROR';
      
      if (error.code === 'InvalidAccessKeyId' || error.message.includes('Access Key Id')) {
        errorMessage = 'The AWS Access Key ID is invalid or does not exist. Please check your AWS credentials.';
        errorCode = 'INVALID_AWS_ACCESS_KEY';
      } else if (error.code === 'SignatureDoesNotMatch') {
        errorMessage = 'The AWS Secret Access Key is incorrect. Please verify your AWS credentials.';
        errorCode = 'INVALID_AWS_SECRET_KEY';
      } else if (error.code === 'NoSuchBucket') {
        errorMessage = `The S3 bucket "${process.env.AWS_BUCKET_NAME}" does not exist. Please check your bucket name.`;
        errorCode = 'BUCKET_NOT_FOUND';
      } else if (error.code === 'UnknownEndpoint' || error.code === 'NetworkingError' || error.code === 'ENOTFOUND') {
        errorMessage = `Cannot connect to AWS S3. Please check your network connection and AWS region configuration. Region: ${process.env.AWS_REGION}, Bucket: ${process.env.AWS_BUCKET_NAME}. Error: ${error.message}`;
        errorCode = 'S3_CONNECTION_ERROR';
        console.error('❌ AWS S3 Connection Error Details:', {
          region: process.env.AWS_REGION,
          bucket: process.env.AWS_BUCKET_NAME,
          endpoint: error.hostname,
          originalError: error.originalError?.message
        });
      }
      
      res.status(500).json({ 
        error: "Video upload failed", 
        details: errorMessage,
        code: errorCode,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

module.exports = router;
