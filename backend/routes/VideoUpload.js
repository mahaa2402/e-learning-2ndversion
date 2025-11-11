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
      const { courseName, moduleNumber } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No video file uploaded" });
      }

      // Validate course name and module number
      if (!courseName || courseName === 'undefined' || courseName === 'null') {
        return res.status(400).json({ error: "Invalid course name" });
      }

      if (!moduleNumber || isNaN(moduleNumber) || moduleNumber < 1) {
        return res.status(400).json({ error: "Invalid module number" });
      }

      console.log(`📤 Uploading video for course: "${courseName}", module: ${moduleNumber}`);
      console.log(`📤 File: ${file.originalname}, Size: ${file.size} bytes`);

      // Create simple S3 path: e-learning/videos/CourseName/Module1/video.mp4
      const uniqueFileName = `${Date.now()}_${uuidv4()}${path.extname(
        file.originalname
      )}`;
      const key = `e-learning/videos/${courseName}/Module${moduleNumber}/${uniqueFileName}`;
      
      console.log(`📤 S3 Key: ${key}`);
      console.log(`📤 Course Name: "${courseName}"`);
      console.log(`📤 Module Number: ${moduleNumber}`);
      console.log(`📤 File Name: ${uniqueFileName}`);

      // Upload to S3
      const fileContent = fs.readFileSync(file.path);
      const uploadResult = await s3
        .upload({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          Body: fileContent,
          ContentType: file.mimetype,
        })
        .promise();

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

      res.json({
        success: true,
        message: `Video uploaded for ${courseName} Module ${moduleNumber}`,
        video: {
          url: uploadResult.Location,
          title: file.originalname,
          duration,
          s3Key: key,
          uploadedAt: new Date().toISOString()
        }
      });

      
    } catch (error) {
      console.error("Video upload error:", error);
      res.status(500).json({ error: "Video upload failed", details: error });
    }
  }
);

module.exports = router;
