# 🚨 QUICK FIX: AWS Credentials Error in Production

## Error Messages
```
❌ Course image upload failed: Error: Failed to upload course image
❌ Video upload failed: The AWS Access Key Id you provided does not exist in our records
```

## ✅ Solution: Set AWS Credentials in Production

### Step 1: Connect to Your Production Server

```bash
ssh username@16.16.205.98
```

**Common usernames:** `ubuntu`, `ec2-user`, `admin`, `root`

### Step 2: Navigate to Project Directory

```bash
cd ~/e-learning-project
# OR wherever your project is located
# Find it with: find ~ -name "docker-compose.yml" 2>/dev/null
```

### Step 3: Check Current Status

```bash
# Check if AWS variables are set
docker exec e-learning-backend env | grep AWS

# If you see nothing or empty values, credentials are missing
```

### Step 4: Create/Edit .env File

```bash
# Create or edit .env file
nano .env
```

**Add these lines (replace with YOUR actual AWS credentials):**

```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_BUCKET_NAME=your-actual-bucket-name
AWS_REGION=us-east-1
```

**Where to get your credentials:**
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. IAM → Users → Select your user
3. Security credentials tab
4. Access keys section
5. Create new access key if needed

**Save the file:**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

### Step 5: Verify docker-compose.yml

Make sure it references the environment variables:

```bash
cat docker-compose.yml | grep AWS
```

Should show:
```yaml
- AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
- AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
- AWS_BUCKET_NAME=${AWS_BUCKET_NAME}
- AWS_REGION=${AWS_REGION}
```

### Step 6: Restart Containers

```bash
docker-compose down
docker-compose up -d
```

### Step 7: Verify Credentials Are Loaded

```bash
# Check if variables are now set
docker exec e-learning-backend env | grep AWS
```

**Expected output:**
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
```

### Step 8: Test AWS Connection

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
    console.error('   Code:', err.code);
    process.exit(1);
  } else {
    console.log('✅ Success! Connected to AWS S3');
    console.log('   Buckets:', data.Buckets.map(b => b.Name).join(', '));
    process.exit(0);
  }
});
"
```

**If you see "✅ Success!"** - credentials are working!

**If you see an error:**
- Check the error message
- Verify credentials are correct
- Check IAM permissions

### Step 9: Test Upload

1. Go to your production website
2. Try uploading a course image
3. Check logs: `docker-compose logs -f backend`

You should see:
```
✅ AWS Configuration: { AWS_ACCESS_KEY_ID: 'AKIA...', ... }
📤 Uploading to S3...
✅ Course image uploaded to S3: https://...
```

## 🔍 Troubleshooting

### Problem: Variables still empty after setting .env

**Check:**
```bash
# Is .env in the right place?
ls -la .env

# Is it in the same directory as docker-compose.yml?
pwd
ls -la docker-compose.yml
```

**Fix:**
- Make sure `.env` is in the same directory as `docker-compose.yml`
- Check file permissions: `chmod 644 .env`
- Restart containers again

### Problem: "Access Key Id does not exist"

**This means:**
- The Access Key ID is wrong
- The key was deleted in AWS
- The key belongs to a different AWS account

**Fix:**
1. Go to AWS Console → IAM → Users
2. Create a new access key
3. Update `.env` with the new key
4. Restart containers

### Problem: "SignatureDoesNotMatch"

**This means:**
- The Secret Access Key is wrong

**Fix:**
- Verify the Secret Access Key matches the Access Key ID
- Create a new key pair if needed
- Update `.env` and restart

### Problem: "NoSuchBucket"

**This means:**
- Bucket name is wrong
- Bucket doesn't exist
- Bucket is in a different region

**Fix:**
1. Check bucket name in AWS S3 console
2. Verify bucket exists
3. Check region matches
4. Update `.env` and restart

## 📋 Quick Checklist

Run these commands to verify everything:

```bash
# 1. Check .env exists
ls -la .env

# 2. Check .env has AWS variables (first 4 chars only for security)
grep AWS .env | sed 's/=.*/=***/'

# 3. Check docker-compose references variables
grep AWS docker-compose.yml

# 4. Check variables in container
docker exec e-learning-backend env | grep AWS

# 5. Test AWS connection
docker exec e-learning-backend node -e "const AWS=require('aws-sdk'); const s3=new AWS.S3(); s3.listBuckets((e,d)=>console.log(e?e.message:'✅ OK'))"
```

## 🎯 Expected Result

After fixing, when you upload:
- ✅ No 500 errors
- ✅ Images/videos upload successfully
- ✅ Files appear in S3
- ✅ Logs show success messages

## ⚠️ Security Note

**Never commit `.env` to git!**

Make sure `.env` is in `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## 📞 Still Not Working?

1. **Check server logs:**
   ```bash
   docker-compose logs backend | tail -50
   ```

2. **Check browser console** for detailed error messages

3. **Verify AWS account** - Make sure you're using the correct AWS account

4. **Check IAM permissions** - User needs S3 upload permissions

## 🚀 After Fix

Once credentials are set:
1. ✅ Course image uploads will work
2. ✅ Video uploads will work
3. ✅ Quiz image uploads will work
4. ✅ All files will be stored in S3

