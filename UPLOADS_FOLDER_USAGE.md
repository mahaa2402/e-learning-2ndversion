# Uploads Folder Usage in E-Learning Project

## 📁 Location
- **Path:** `backend/uploads/`
- **Docker Mount:** `./backend/uploads:/app/uploads` (in docker-compose.yml)
- **Container Path:** `/app/uploads`

## 🎯 Purpose
The `uploads` folder is used as a **temporary storage** location for files before they are uploaded to AWS S3. Files are stored here temporarily and then deleted after successful S3 upload.

## 📍 Where It's Used

### 1. **Video Upload** (`backend/routes/VideoUpload.js`)
- **Purpose:** Temporary storage for video files before S3 upload
- **Usage:**
  ```javascript
  const uploadsDir = path.join(__dirname, '../uploads');
  const upload = multer({ dest: uploadsDir });
  ```
- **Flow:**
  1. Video file is uploaded via multer → stored in `uploads/` temporarily
  2. File is read from `uploads/`
  3. Uploaded to S3
  4. Temporary file is deleted: `fs.unlinkSync(file.path)`

### 2. **Course Image Upload** (`backend/routes/Upload.js`)
- **Purpose:** Temporary storage for course background images
- **Usage:**
  ```javascript
  const uploadsDir = path.join(__dirname, '../uploads');
  const imageUpload = multer({ dest: uploadsDir });
  ```
- **Flow:**
  1. Image file uploaded → stored in `uploads/` temporarily
  2. File read and uploaded to S3
  3. Temporary file deleted after successful upload

### 3. **Quiz Image Upload** (`backend/routes/Upload.js`)
- **Purpose:** Temporary storage for quiz question images
- **Usage:** Same as course image upload
- **Flow:** Same as course image upload

### 4. **Video Metadata Extraction** (`backend/routes/Videofetch.js`)
- **Purpose:** Temporary storage for video chunks when extracting duration metadata
- **Usage:**
  ```javascript
  const uploadsDir = path.join(__dirname, '../uploads');
  const tempPath = path.join(uploadsDir, `temp_${Date.now()}_${filename}`);
  ```
- **Flow:**
  1. Downloads first/last 1MB chunks of video from S3
  2. Stores chunks in `uploads/` temporarily
  3. Extracts video duration using ffprobe
  4. Deletes temporary chunks after extraction

## 🔧 Configuration

### Docker Setup
In `docker-compose.yml`:
```yaml
volumes:
  - ./backend/uploads:/app/uploads
```
This mounts the local `backend/uploads` folder to `/app/uploads` in the container.

### Dockerfile
In `backend/Dockerfile`:
```dockerfile
# Create uploads directory
RUN mkdir -p uploads
```
Creates the directory during Docker build.

### Auto-Creation
All routes that use the uploads folder automatically create it if it doesn't exist:
```javascript
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
```

## 📋 File Lifecycle

1. **Upload Request** → File received via HTTP
2. **Temporary Storage** → Stored in `uploads/` by multer
3. **S3 Upload** → File read from `uploads/` and uploaded to S3
4. **Cleanup** → Temporary file deleted from `uploads/`

## ⚠️ Important Notes

### Files Are Temporary
- Files in `uploads/` are **NOT permanent**
- They are deleted immediately after S3 upload
- If upload fails, files may remain (error handling should clean them up)

### Not for Long-Term Storage
- The `uploads/` folder is **NOT** for storing files permanently
- All files should eventually be in AWS S3
- The folder should remain mostly empty during normal operation

### Permissions
- The folder needs **read/write** permissions
- Docker volume mount ensures persistence across container restarts
- Files are created with system default permissions

## 🗂️ Folder Structure

```
backend/
  └── uploads/          # Temporary file storage
      ├── (temporary video files)
      ├── (temporary image files)
      └── (temporary video chunks for metadata)
```

**Note:** Files are automatically named by multer (e.g., `abc123def456`)

## 🔍 Monitoring

### Check Folder Size
```bash
# On server
du -sh backend/uploads

# In container
docker exec e-learning-backend du -sh /app/uploads
```

### List Files (should be mostly empty)
```bash
# On server
ls -la backend/uploads

# In container
docker exec e-learning-backend ls -la /app/uploads
```

### Clean Up Stuck Files
If files remain after failed uploads:
```bash
# On server
rm -rf backend/uploads/*

# In container
docker exec e-learning-backend rm -rf /app/uploads/*
```

## 🐛 Troubleshooting

### Issue: "Cannot find module" or "Directory not found"
**Solution:** Ensure the folder exists:
```bash
mkdir -p backend/uploads
```

### Issue: "Permission denied"
**Solution:** Fix permissions:
```bash
chmod 755 backend/uploads
```

### Issue: Files accumulating (not being deleted)
**Check:**
1. Error handling in upload routes
2. S3 upload success
3. Cleanup code execution

### Issue: Docker volume not mounting
**Check:**
1. Path in docker-compose.yml is correct
2. Folder exists on host machine
3. Docker has permission to access the folder

## 📝 Summary

| Feature | Uses Uploads Folder | Purpose |
|---------|-------------------|---------|
| Video Upload | ✅ Yes | Temporary storage before S3 |
| Course Image Upload | ✅ Yes | Temporary storage before S3 |
| Quiz Image Upload | ✅ Yes | Temporary storage before S3 |
| Video Metadata | ✅ Yes | Temporary chunks for duration extraction |
| Permanent Storage | ❌ No | All files go to S3 |

## 🔐 Security

- The `uploads/` folder should **NOT** be publicly accessible
- Files are temporary and may contain sensitive data
- Ensure proper file permissions
- Don't expose via web server (not in public directory)

## 📦 Git Configuration

The folder is ignored in `.dockerignore`:
```
uploads/*
!uploads/.gitkeep
```

This means:
- Uploaded files are NOT committed to git
- Only a `.gitkeep` file (if exists) would be tracked
- Keeps repository clean


