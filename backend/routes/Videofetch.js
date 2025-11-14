// backend/routes/Videofetch.js
const express = require("express");
const AWS = require("aws-sdk");

const router = express.Router(); // ✅ define router

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
});

const BUCKET = process.env.AWS_BUCKET_NAME;
const TTL = parseInt(process.env.VIDEO_URL_TTL_SECONDS || "3600", 10);

// ✅ sanitize course names for safety
const sanitize = (s) => (s || "").replace(/[^a-zA-Z0-9 _-]/g, "").trim();

router.get("/get", async (req, res) => {
  try {
    const courseNameRaw = req.query.courseName;
    const moduleIndexRaw = req.query.moduleIndex;

    if (!courseNameRaw || moduleIndexRaw == null) {
      return res
        .status(400)
        .json({ error: "courseName and moduleIndex are required" });
    }

    const courseName = sanitize(courseNameRaw);
    const moduleIndex = Number(moduleIndexRaw); // keep raw index
    const moduleNumber = moduleIndex + 1; // user-friendly module number

    if (!Number.isFinite(moduleIndex) || moduleIndex < 0) {
      return res.status(400).json({ error: "Invalid moduleIndex" });
    }

    // ✅ S3 path: e-learning/videos/{courseName}/mod{N}/ (VideoUpload uses mod{N})
    // Also check Module{N} format for backward compatibility
    const prefix1 = `e-learning/videos/${courseName}/mod${moduleNumber}/`;
    const prefix2 = `e-learning/videos/${courseName}/Module${moduleNumber}/`;

    console.log("🔎 Looking in S3 prefix (mod{N}):", prefix1);
    console.log("🔎 Also checking (Module{N}):", prefix2);

    // Try mod{N} format first (used by VideoUpload)
    let list = await s3
      .listObjectsV2({
        Bucket: BUCKET,
        Prefix: prefix1,
      })
      .promise();

    console.log("✅ S3 list result count (mod{N}):", list.Contents?.length || 0);

    // If not found, try Module{N} format (backward compatibility)
    if (!list.Contents || list.Contents.length === 0) {
      console.log("🔎 Trying Module{N} format...");
      list = await s3
        .listObjectsV2({
          Bucket: BUCKET,
          Prefix: prefix2,
        })
        .promise();
      console.log("✅ S3 list result count (Module{N}):", list.Contents?.length || 0);
    }

    if (!list.Contents || list.Contents.length === 0) {
      return res
        .status(404)
        .json({ error: "No files in S3", lookedIn: [prefix1, prefix2] });
    }

    // ✅ Filter only video files
    const candidates = list.Contents.filter((o) =>
      /\.(mp4|webm|mov|m4v)$/i.test(o.Key)
    );

    if (!candidates.length) {
      return res
        .status(404)
        .json({ error: "No video files found", files: list.Contents });
    }

    // ✅ Pick most recently modified
    candidates.sort(
      (a, b) => new Date(b.LastModified) - new Date(a.LastModified)
    );
    const chosen = candidates[0];

    console.log("🎬 Chosen file:", chosen.Key);

    // ✅ Generate signed URL
    const signedUrl = s3.getSignedUrl("getObject", {
      Bucket: BUCKET,
      Key: chosen.Key,
      Expires: TTL,
    });

    return res.json({ success: true, url: signedUrl });
  } catch (err) {
    console.error("❌ Backend crashed while fetching video:", err.stack || err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
      stack: err.stack,
    });
  }
});

// Get video durations for all modules of a course
router.get("/durations", async (req, res) => {
  try {
    const courseNameRaw = req.query.courseName;
    
    console.log('📹 Duration request - courseNameRaw:', courseNameRaw);
    
    if (!courseNameRaw) {
      return res.status(400).json({ error: "courseName is required" });
    }

    const courseName = sanitize(courseNameRaw);
    console.log('📹 Sanitized courseName:', courseName);
    
    const ffmpeg = require('fluent-ffmpeg');
    const fs = require('fs');
    const path = require('path');
    const https = require('https');
    const http = require('http');

    const durations = {};

    // Try to get durations for modules 1-10 (adjust as needed)
    for (let moduleNumber = 1; moduleNumber <= 10; moduleNumber++) {
      const prefix = `e-learning/videos/${courseName}/Module${moduleNumber}/`;
      console.log(`📹 Checking module ${moduleNumber} with prefix: ${prefix}`);

      try {
        const list = await s3.listObjectsV2({
          Bucket: BUCKET,
          Prefix: prefix,
        }).promise();
        
        console.log(`📹 Module ${moduleNumber} - Found ${list.Contents?.length || 0} files`);

        if (list.Contents && list.Contents.length > 0) {
          const videoFiles = list.Contents.filter((o) =>
            /\.(mp4|webm|mov|m4v)$/i.test(o.Key)
          );

          if (videoFiles.length > 0) {
            videoFiles.sort(
              (a, b) => new Date(b.LastModified) - new Date(a.LastModified)
            );
            const videoFile = videoFiles[0];

            // For MP4 files, try to get metadata using range request (first and last 1MB)
            // This is more efficient than downloading the entire video
            const uploadsDir = path.join(__dirname, '../uploads');
            // Ensure uploads directory exists
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const tempPath = path.join(uploadsDir, `temp_${Date.now()}_${path.basename(videoFile.Key)}`);
            
            try {
              // Download first 1MB and last 1MB of the video (metadata is usually at start or end)
              const fileSize = videoFile.Size;
              const chunkSize = Math.min(1024 * 1024, fileSize); // 1MB or file size if smaller
              
              // Get first chunk
              const headParams = {
                Bucket: BUCKET,
                Key: videoFile.Key,
                Range: `bytes=0-${chunkSize - 1}`
              };
              
              const headData = await s3.getObject(headParams).promise();
              fs.writeFileSync(tempPath, headData.Body);
              
              // If file is larger, also get last chunk and append
              if (fileSize > chunkSize) {
                const lastChunkStart = Math.max(0, fileSize - chunkSize);
                const tailParams = {
                  Bucket: BUCKET,
                  Key: videoFile.Key,
                  Range: `bytes=${lastChunkStart}-${fileSize - 1}`
                };
                const tailData = await s3.getObject(tailParams).promise();
                fs.appendFileSync(tempPath, tailData.Body);
              }

              // Extract duration using ffprobe
              const duration = await new Promise((resolve, reject) => {
                ffmpeg.ffprobe(tempPath, (err, metadata) => {
                  // Clean up temp file
                  if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                  }
                  if (err) {
                    // If range request didn't work, try full download as fallback
                    console.log(`⚠️ Range request failed for ${videoFile.Key}, trying full download...`);
                    return resolve(null); // Will be handled below
                  }
                  if (metadata.format && metadata.format.duration) {
                    const totalSeconds = metadata.format.duration;
                    resolve(totalSeconds);
                  } else {
                    resolve(null);
                  }
                });
              });

              if (duration) {
                durations[moduleNumber] = duration;
                continue; // Skip to next module if successful
              }
            } catch (rangeError) {
              console.log(`⚠️ Range request failed, trying full download for module ${moduleNumber}...`);
            }

            // Fallback: Full download if range request failed
            try {
              // Ensure uploads directory exists for fallback too
              if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
              }
              
              // Generate signed URL for full download
              const signedUrl = s3.getSignedUrl('getObject', {
                Bucket: BUCKET,
                Key: videoFile.Key,
                Expires: 300,
              });

              // Download file
              const protocol = signedUrl.startsWith('https') ? https : http;
              await new Promise((resolve, reject) => {
                const file = fs.createWriteStream(tempPath);
                protocol.get(signedUrl, (response) => {
                  response.pipe(file);
                  file.on('finish', () => {
                    file.close();
                    resolve();
                  });
                }).on('error', (err) => {
                  if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                  }
                  reject(err);
                });
              });

              // Extract duration using ffprobe
              const duration = await new Promise((resolve, reject) => {
                ffmpeg.ffprobe(tempPath, (err, metadata) => {
                  // Clean up temp file
                  if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                  }
                  if (err) return reject(err);
                  if (metadata.format && metadata.format.duration) {
                    const totalSeconds = metadata.format.duration;
                    resolve(totalSeconds);
                  } else {
                    resolve(null);
                  }
                });
              });

              if (duration) {
                durations[moduleNumber] = duration;
                console.log(`✅ Module ${moduleNumber} duration: ${duration} seconds`);
              }
            } catch (downloadError) {
              console.log(`⚠️ Could not download video for module ${moduleNumber}:`, downloadError.message);
            }
          }
        }
      } catch (err) {
        console.log(`⚠️ Could not get duration for module ${moduleNumber}:`, err.message);
      }
    }

    console.log('📹 Final durations object:', durations);
    return res.json({ success: true, durations });
  } catch (err) {
    console.error("❌ Error fetching video durations:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
});

// Get subtitle file for a module
router.get("/subtitle", async (req, res) => {
  try {
    const courseNameRaw = req.query.courseName;
    const moduleIndexRaw = req.query.moduleIndex;

    if (!courseNameRaw || moduleIndexRaw == null) {
      return res
        .status(400)
        .json({ error: "courseName and moduleIndex are required" });
    }

    const courseName = sanitize(courseNameRaw);
    const moduleIndex = Number(moduleIndexRaw);
    const moduleNumber = moduleIndex + 1;

    if (!Number.isFinite(moduleIndex) || moduleIndex < 0) {
      return res.status(400).json({ error: "Invalid moduleIndex" });
    }

    // ✅ S3 path: e-learning/videos/{courseName}/Module{N}/
    const prefix = `e-learning/videos/${courseName}/Module${moduleNumber}/`;

    console.log("🔎 Looking for subtitle in S3 prefix:", prefix);

    const list = await s3
      .listObjectsV2({
        Bucket: BUCKET,
        Prefix: prefix,
      })
      .promise();

    if (!list.Contents || list.Contents.length === 0) {
      return res
        .status(404)
        .json({ error: "No files in S3", lookedIn: prefix });
    }

    // ✅ Filter only subtitle files (VTT, SRT)
    const candidates = list.Contents.filter((o) =>
      /\.(vtt|srt)$/i.test(o.Key)
    );

    if (!candidates.length) {
      return res
        .status(404)
        .json({ error: "No subtitle files found", files: list.Contents });
    }

    // ✅ Pick most recently modified
    candidates.sort(
      (a, b) => new Date(b.LastModified) - new Date(a.LastModified)
    );
    const chosen = candidates[0];

    console.log("📝 Chosen subtitle file:", chosen.Key);

    // ✅ Generate signed URL
    const signedUrl = s3.getSignedUrl("getObject", {
      Bucket: BUCKET,
      Key: chosen.Key,
      Expires: TTL,
    });

    return res.json({ success: true, url: signedUrl });
  } catch (err) {
    console.error("❌ Backend crashed while fetching subtitle:", err.stack || err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
      stack: err.stack,
    });
  }
});

module.exports = router; // ✅ export router
