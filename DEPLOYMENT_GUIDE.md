# Deployment and Log Checking Guide

## Step 1: Deploy the Updated Code

### Option A: If using Git (Recommended)
```bash
# 1. Commit your changes
git add backend/routes/Upload.js
git commit -m "Fix: Add AWS validation and better error handling for course image upload"

# 2. Push to your repository
git push origin main

# 3. On your production server, pull the changes
git pull origin main

# 4. Rebuild and restart Docker containers
docker-compose down
docker-compose build backend
docker-compose up -d
```

### Option B: Direct File Transfer
```bash
# 1. Copy the updated file to your production server
# (Use scp, rsync, or your preferred method)
scp backend/routes/Upload.js user@your-server:/path/to/project/backend/routes/

# 2. On production server, rebuild and restart
docker-compose down
docker-compose build backend
docker-compose up -d
```

## Step 2: Check Server Logs

### Method 1: Real-time Log Monitoring (Recommended)
```bash
# View live logs from the backend container
docker-compose logs -f backend

# Or using container name
docker logs -f e-learning-backend
```

### Method 2: View Recent Logs
```bash
# View last 100 lines of logs
docker-compose logs --tail=100 backend

# View logs from last 10 minutes
docker-compose logs --since 10m backend

# View logs with timestamps
docker-compose logs -t backend
```

### Method 3: Search Logs for Specific Errors
```bash
# Search for error messages
docker-compose logs backend | grep -i "error\|❌\|failed"

# Search for upload-related logs
docker-compose logs backend | grep -i "upload\|course image"

# Search for AWS-related logs
docker-compose logs backend | grep -i "aws\|s3\|credentials"
```

## Step 3: Test the Upload Endpoint

### Test from Browser Console
Open your browser's developer console (F12) and run:
```javascript
// Test the upload endpoint
const formData = new FormData();
formData.append('image', new File(['test'], 'test.jpg', { type: 'image/jpeg' }));

fetch('http://16.16.205.98:5000/api/upload/upload-course-image/test-course', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('authToken')}`
  }
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
```

### Test using curl (from server)
```bash
# Create a test image file
echo "test" > test.jpg

# Test the endpoint
curl -X POST \
  http://localhost:5000/api/upload/upload-course-image/test-course \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test.jpg" \
  -v
```

## Step 4: What to Look For in Logs

### ✅ Success Indicators:
```
📤 Course image upload request received
📤 Course name: [course-name]
📤 File: [filename]
📤 Uploading to S3: [s3-key]
📤 Bucket: [bucket-name]
📤 Region: [region]
📤 File read, size: [bytes] bytes
✅ Course image uploaded to S3: [url]
✅ Temporary file deleted
```

### ❌ Error Indicators to Check:

#### 1. AWS Credentials Missing
```
❌ AWS credentials not configured
❌ Missing: { AWS_ACCESS_KEY_ID: true, ... }
```
**Solution:** Check your `.env` file or environment variables in docker-compose.yml

#### 2. File System Issues
```
❌ Error: Temporary file not found after upload
❌ Error deleting temp file: [error]
```
**Solution:** Check file permissions on `uploads/` directory

#### 3. AWS S3 Upload Errors
```
❌ Course image upload error: [AWS error]
❌ Error code: AccessDenied / InvalidAccessKeyId / NoSuchBucket
```
**Solution:** Verify AWS credentials and bucket permissions

#### 4. Network/Connection Issues
```
❌ Error: connect ETIMEDOUT
❌ Error: getaddrinfo ENOTFOUND
```
**Solution:** Check network connectivity and AWS region

## Step 5: Verify Environment Variables

### Check if AWS variables are set in container:
```bash
# Check environment variables in running container
docker exec e-learning-backend env | grep AWS

# Should show:
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# AWS_BUCKET_NAME=...
# AWS_REGION=...
```

### If variables are missing, update docker-compose.yml:
```yaml
environment:
  - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
  - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
  - AWS_BUCKET_NAME=${AWS_BUCKET_NAME}
  - AWS_REGION=${AWS_REGION}
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

## Step 6: Check Upload Directory Permissions

```bash
# Check if uploads directory exists and has correct permissions
docker exec e-learning-backend ls -la /app/uploads

# If directory doesn't exist or has permission issues:
docker exec e-learning-backend mkdir -p /app/uploads
docker exec e-learning-backend chmod 777 /app/uploads
```

## Step 7: Monitor Logs While Testing

1. **Open terminal 1** - Watch logs in real-time:
   ```bash
   docker-compose logs -f backend
   ```

2. **Open terminal 2** - Trigger the upload from your application

3. **Watch terminal 1** - You'll see detailed logs showing exactly where it fails

## Step 8: Common Issues and Solutions

### Issue: "AWS S3 not configured"
**Check:**
- Environment variables are set in docker-compose.yml
- `.env` file exists and has correct values
- Container was restarted after adding variables

### Issue: "AccessDenied" or "InvalidAccessKeyId"
**Check:**
- AWS credentials are correct
- IAM user has S3 upload permissions
- Bucket name is correct

### Issue: "NoSuchBucket"
**Check:**
- Bucket name is correct
- Bucket exists in the specified region
- Region matches the bucket's region

### Issue: "Temporary file not found"
**Check:**
- `uploads/` directory exists
- File permissions allow read/write
- Disk space is available

## Step 9: Get Detailed Error Information

The updated code now provides detailed error information. When an error occurs, check:

1. **Error message** - Shows the specific problem
2. **Error code** - AWS error codes (if applicable)
3. **Stack trace** - In development mode, shows full stack trace

Example error response:
```json
{
  "error": "Failed to upload course image",
  "message": "AccessDenied: Access Denied",
  "code": "AccessDenied",
  "details": "Full stack trace (in development only)"
}
```

## Quick Debugging Commands

```bash
# 1. Check if container is running
docker ps | grep e-learning-backend

# 2. Check container health
docker inspect e-learning-backend | grep -A 10 Health

# 3. Enter container shell
docker exec -it e-learning-backend sh

# 4. Check if uploads directory exists
docker exec e-learning-backend ls -la /app/uploads

# 5. Test AWS connection (inside container)
docker exec e-learning-backend node -e "const AWS=require('aws-sdk'); const s3=new AWS.S3(); s3.listBuckets((err,data)=>{console.log(err||data)});"

# 6. View all environment variables
docker exec e-learning-backend env
```

## Next Steps After Finding the Issue

1. **If AWS credentials are missing:** Add them to your `.env` file and restart
2. **If permissions are wrong:** Fix file/directory permissions
3. **If bucket doesn't exist:** Create the bucket or fix the bucket name
4. **If network issue:** Check firewall rules and AWS security groups

After fixing the issue, test again and monitor the logs to confirm it's working.
