// backend/routes/VideoUploadMultipart.js
const express = require("express");
const { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const Common_Course = require("../models/common_courses");

const router = express.Router();

// AWS S3 Client (v3)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// Validate AWS configuration
const validateAWSConfig = () => {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !BUCKET_NAME || !process.env.AWS_REGION) {
    throw new Error("AWS S3 not configured. Please check environment variables.");
  }
};

// Helper: Generate S3 key for video
const generateS3Key = (courseName, moduleNumber, originalFileName) => {
  const sanitizedCourseName = courseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const moduleFolder = `mod${moduleNumber}`;
  const uniqueFileName = `${Date.now()}_${uuidv4()}${path.extname(originalFileName)}`;
  return `e-learning/videos/${sanitizedCourseName}/${moduleFolder}/${uniqueFileName}`;
};

/**
 * POST /api/videos/multipart/create
 * Creates a multipart upload and returns uploadId and key
 */
router.post("/create", async (req, res) => {
  try {
    validateAWSConfig();

    const { courseName, moduleNumber, fileName, contentType } = req.body;

    if (!courseName || !moduleNumber || !fileName) {
      return res.status(400).json({
        error: "Missing required fields: courseName, moduleNumber, fileName",
      });
    }

    const decodedCourseName = decodeURIComponent(courseName);
    const moduleNum = parseInt(moduleNumber);
    
    if (!decodedCourseName || decodedCourseName === 'undefined' || decodedCourseName === 'null') {
      return res.status(400).json({ error: "Invalid course name" });
    }

    if (isNaN(moduleNum) || moduleNum < 1) {
      return res.status(400).json({ error: "Invalid module number" });
    }

    const key = generateS3Key(decodedCourseName, moduleNum, fileName);

    console.log(`📤 Creating multipart upload for: ${key}`);
    console.log(`📤 Course: "${decodedCourseName}", Module: ${moduleNum}`);

    const command = new CreateMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType || "video/mp4",
    });

    const response = await s3Client.send(command);

    console.log(`✅ Multipart upload created: ${response.UploadId}`);

    res.json({
      success: true,
      uploadId: response.UploadId,
      key: key,
      bucket: BUCKET_NAME,
    });
  } catch (error) {
    console.error("❌ Error creating multipart upload:", error);
    res.status(500).json({
      error: "Failed to create multipart upload",
      details: error.message,
    });
  }
});

/**
 * POST /api/videos/multipart/presigned-url
 * Generates a presigned URL for uploading a specific part
 */
router.post("/presigned-url", async (req, res) => {
  try {
    validateAWSConfig();

    const { uploadId, key, partNumber } = req.body;

    if (!uploadId || !key || !partNumber) {
      return res.status(400).json({
        error: "Missing required fields: uploadId, key, partNumber",
      });
    }

    if (partNumber < 1 || partNumber > 10000) {
      return res.status(400).json({
        error: "partNumber must be between 1 and 10000",
      });
    }

    console.log(`📤 Generating presigned URL for part ${partNumber} of upload ${uploadId}`);

    const command = new UploadPartCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    // Generate presigned URL valid for 1 hour
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    console.log(`✅ Presigned URL generated for part ${partNumber}`);

    res.json({
      success: true,
      presignedUrl: presignedUrl,
      partNumber: partNumber,
    });
  } catch (error) {
    console.error("❌ Error generating presigned URL:", error);
    res.status(500).json({
      error: "Failed to generate presigned URL",
      details: error.message,
    });
  }
});

/**
 * POST /api/videos/multipart/complete
 * Completes the multipart upload and returns the final S3 URL
 */
router.post("/complete", async (req, res) => {
  try {
    validateAWSConfig();

    const { uploadId, key, parts, courseName, moduleNumber, courseId } = req.body;

    if (!uploadId || !key || !parts || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({
        error: "Missing required fields: uploadId, key, parts (array)",
      });
    }

    // Validate parts array structure
    const invalidParts = parts.some(
      (part) => !part.PartNumber || !part.ETag
    );
    if (invalidParts) {
      return res.status(400).json({
        error: "Each part must have PartNumber and ETag",
      });
    }

    console.log(`📤 Completing multipart upload: ${uploadId}`);
    console.log(`📤 Parts to complete: ${parts.length}`);

    const command = new CompleteMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((part) => ({
          PartNumber: part.PartNumber,
          ETag: part.ETag,
        })),
      },
    });

    const response = await s3Client.send(command);

    // Construct the S3 URL
    const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
    console.log(`✅ Multipart upload completed: ${s3Url}`);

    // Update course in database if courseId is provided
    let duration = null;
    if (courseId) {
      try {
        const decodedCourseName = decodeURIComponent(courseName || "");
        const moduleNum = parseInt(moduleNumber || "0");
        
        const course = await Common_Course.findById(courseId);
        if (course && course.modules && course.modules[moduleNum - 1]) {
          const module = course.modules[moduleNum - 1];
          
          if (!module.lessonDetails) {
            module.lessonDetails = {
              title: module.name,
              videoUrl: s3Url,
              content: [],
              duration: duration || `${module.duration || 0}min`,
              notes: module.notes || '',
            };
          } else {
            module.lessonDetails.videoUrl = s3Url;
          }
          
          course.markModified('modules');
          await course.save();
          
          console.log(`✅ Course "${course.title}" updated with video URL for module ${moduleNum}`);
        }
      } catch (dbError) {
        console.error('❌ Error updating course in database:', dbError);
        // Don't fail the upload if DB update fails
      }
    }

    res.json({
      success: true,
      url: s3Url,
      key: key,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error completing multipart upload:", error);
    
    // Attempt to abort the upload on error
    try {
      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: req.body.key,
        UploadId: uploadId,
      });
      await s3Client.send(abortCommand);
      console.log(`⚠️ Aborted multipart upload: ${uploadId}`);
    } catch (abortError) {
      console.error("❌ Error aborting multipart upload:", abortError);
    }

    res.status(500).json({
      error: "Failed to complete multipart upload",
      details: error.message,
    });
  }
});

/**
 * POST /api/videos/multipart/abort
 * Aborts a multipart upload (cleanup on error)
 */
router.post("/abort", async (req, res) => {
  try {
    validateAWSConfig();

    const { uploadId, key } = req.body;

    if (!uploadId || !key) {
      return res.status(400).json({
        error: "Missing required fields: uploadId, key",
      });
    }

    console.log(`📤 Aborting multipart upload: ${uploadId}`);

    const command = new AbortMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
    });

    await s3Client.send(command);

    console.log(`✅ Multipart upload aborted: ${uploadId}`);

    res.json({
      success: true,
      message: "Multipart upload aborted successfully",
    });
  } catch (error) {
    console.error("❌ Error aborting multipart upload:", error);
    res.status(500).json({
      error: "Failed to abort multipart upload",
      details: error.message,
    });
  }
});

module.exports = router;

