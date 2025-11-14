// backend/routes/VideoUpload.js
const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const ffmpeg = require("fluent-ffmpeg");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const Course = require("../models/Course"); // make sure this path is correct

const router = express.Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Video upload service is running",
    timestamp: new Date().toISOString()
  });
});

// Multer temp storage
const upload = multer({ dest: "uploads/" });

// AWS S3 Config
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// 🎯 Simple video upload to S3 using course name and module number
router.post(
  "/upload-video/:courseName/:moduleNumber",
  upload.single("video"),
  async (req, res) => {
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

      // Check AWS credentials
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET_NAME) {
        console.error('❌ AWS credentials not configured');
        return res.status(500).json({ error: "AWS S3 not configured. Please check environment variables." });
      }

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
      res.status(500).json({ 
        error: "Video upload failed", 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

module.exports = router;
