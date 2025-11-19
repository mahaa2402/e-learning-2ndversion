# Fix 500 Error: Course Image Upload Failed

## Error Message
```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
❌ Course image upload failed: Error: Failed to upload course image
```

## Root Cause
This error occurs because **AWS credentials are missing or incorrect** in your production environment.

## Quick Fix Steps

### Step 1: Check Server Logs
On your production server (`16.16.205.98`), check the backend logs:

```bash
# SSH into your server
ssh username@16.16.205.98

# Navigate to project
cd ~/e-learning-project  # or wherever your project is

# Check logs
docker-compose logs backend | grep -i "aws\|error\|❌\|course image"
```

Look for errors like:
- `❌ AWS credentials not configured`
- `InvalidAccessKeyId`
- `The AWS Access Key Id you provided does not exist`

### Step 2: Verify AWS Environment Variables

Check if AWS variables are set in the container:

```bash
docker exec e-learning-backend env | grep AWS
```

**Expected output:**
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
```

**If variables are missing or empty**, proceed to Step 3.

### Step 3: Set AWS Credentials

#### Option A: Using .env file (Recommended)

1. **Create/Edit `.env` file** in your project root (same directory as `docker-compose.yml`):

```bash
nano .env
```

2. **Add your AWS credentials:**
```env
AWS_ACCESS_KEY_ID=YOUR_ACTUAL_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_ACTUAL_SECRET_ACCESS_KEY
AWS_BUCKET_NAME=your-actual-bucket-name
AWS_REGION=us-east-1
```

3. **Save and exit** (Ctrl+X, then Y, then Enter)

4. **Restart containers:**
```bash
docker-compose down
docker-compose up -d
```

#### Option B: Verify docker-compose.yml

Make sure `docker-compose.yml` references the environment variables:

```yaml
environment:
  - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
  - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
  - AWS_BUCKET_NAME=${AWS_BUCKET_NAME}
  - AWS_REGION=${AWS_REGION}
```

### Step 4: Verify Credentials Are Loaded

After restarting, check again:

```bash
docker exec e-learning-backend env | grep AWS
```

All 4 variables should be set.

### Step 5: Test AWS Connection

Test if credentials work:

```bash
docker exec e-learning-backend node -e "
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});
s3.listBuckets((err, data) => {
  if (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Success! Buckets:', data.Buckets.map(b => b.Name));
    process.exit(0);
  }
});
"
```

### Step 6: Check Logs After Fix

Monitor logs while testing:

```bash
docker-compose logs -f backend
```

Then try uploading an image. You should see:
```
✅ AWS Configuration: { AWS_ACCESS_KEY_ID: 'AKIA...', ... }
📤 Uploading to S3...
✅ Course image uploaded to S3: https://...
```

## Common Issues

### Issue 1: .env file not being read
**Symptoms:** Variables still empty after setting .env

**Solution:**
- Make sure `.env` is in the same directory as `docker-compose.yml`
- Check file permissions: `chmod 644 .env`
- Restart containers: `docker-compose down && docker-compose up -d`

### Issue 2: Wrong AWS credentials
**Symptoms:** Error says "Access Key Id does not exist"

**Solution:**
- Verify credentials in AWS Console (IAM → Users → Security credentials)
- Create new access key if needed
- Update `.env` with correct credentials

### Issue 3: Bucket doesn't exist
**Symptoms:** Error about bucket not found

**Solution:**
- Verify bucket name is correct
- Check bucket exists in the specified region
- Ensure bucket name matches exactly (case-sensitive)

### Issue 4: IAM permissions
**Symptoms:** Access denied errors

**Solution:**
- Ensure IAM user has S3 upload permissions
- Attach policy: `AmazonS3FullAccess` or custom policy with upload permissions

## After Fixing

1. ✅ Deploy updated frontend code (with better error messages)
2. ✅ Set AWS credentials in production
3. ✅ Restart containers
4. ✅ Test image upload
5. ✅ Check logs to confirm success

## What the Updated Code Does

The updated `createcommoncourses.js` now:
- ✅ Requires course title before allowing image upload
- ✅ Shows detailed error messages from backend
- ✅ Provides user-friendly messages for AWS errors
- ✅ Logs detailed error information for debugging

## Still Having Issues?

1. **Check browser console** - Look for detailed error messages
2. **Check server logs** - `docker-compose logs -f backend`
3. **Verify AWS credentials** - Test connection (Step 5)
4. **Check file permissions** - Ensure uploads directory is writable

## Quick Checklist

- [ ] AWS credentials set in `.env` file
- [ ] `.env` file in project root (same as docker-compose.yml)
- [ ] docker-compose.yml references `${AWS_ACCESS_KEY_ID}` etc.
- [ ] Containers restarted after setting variables
- [ ] Variables visible in container (`docker exec ... env | grep AWS`)
- [ ] AWS connection test passes
- [ ] Logs show successful AWS configuration
- [ ] Course title is entered before uploading image

