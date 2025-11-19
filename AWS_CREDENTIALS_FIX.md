# Fix AWS Credentials Error

## Error Message
```
The AWS Access Key Id you provided does not exist in our records.
```

This error means your AWS Access Key ID is either:
1. **Not set** in the production environment
2. **Incorrect/Invalid** - the key doesn't exist in AWS
3. **Not being passed** to the Docker container

## Step-by-Step Fix

### Step 1: Verify AWS Credentials on Your Local Machine

First, make sure you have valid AWS credentials. Check if you have a `.env` file in your project root:

```bash
# Check if .env file exists
ls -la .env

# View AWS credentials (be careful - don't share these!)
cat .env | grep AWS
```

You should see something like:
```
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
```

### Step 2: Verify Credentials in AWS Console

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **IAM** → **Users** → Select your user
3. Go to **Security credentials** tab
4. Check **Access keys** section
5. Verify the Access Key ID matches what you have in `.env`

**If the key doesn't exist or is different:**
- Create a new access key
- Update your `.env` file with the new credentials

### Step 3: Check Docker Compose Configuration

Open `docker-compose.yml` and verify the environment variables are correctly mapped:

```yaml
environment:
  - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
  - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
  - AWS_BUCKET_NAME=${AWS_BUCKET_NAME}
  - AWS_REGION=${AWS_REGION}
```

### Step 4: Check if Variables are Set in Production

**On your production server**, run:

```bash
# Check if .env file exists
ls -la .env

# Check environment variables in docker-compose
docker-compose config | grep AWS

# Check environment variables inside the container
docker exec e-learning-backend env | grep AWS
```

### Step 5: Set Environment Variables

#### Option A: Using .env file (Recommended)

1. **Create/Edit `.env` file** in your project root:
```bash
nano .env
```

2. **Add your AWS credentials:**
```env
AWS_ACCESS_KEY_ID=YOUR_ACTUAL_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_ACTUAL_SECRET_ACCESS_KEY
AWS_BUCKET_NAME=your-actual-bucket-name
AWS_REGION=your-actual-region
```

3. **Make sure `.env` is in the same directory as `docker-compose.yml`**

4. **Restart containers:**
```bash
docker-compose down
docker-compose up -d
```

#### Option B: Set in docker-compose.yml directly (Not Recommended for Secrets)

```yaml
environment:
  - AWS_ACCESS_KEY_ID=YOUR_ACTUAL_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY=YOUR_ACTUAL_SECRET_ACCESS_KEY
  - AWS_BUCKET_NAME=your-actual-bucket-name
  - AWS_REGION=your-actual-region
```

**⚠️ Warning:** Don't commit secrets to git! Use `.env` file instead.

### Step 6: Verify Variables are Loaded

After restarting, verify the variables are loaded:

```bash
# Check inside container
docker exec e-learning-backend env | grep AWS

# Should show:
# AWS_ACCESS_KEY_ID=AKIA...
# AWS_SECRET_ACCESS_KEY=...
# AWS_BUCKET_NAME=...
# AWS_REGION=...
```

### Step 7: Test AWS Connection

Test if the credentials work:

```bash
# Test AWS connection from inside container
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

### Step 8: Check Logs After Fix

After setting credentials, try uploading again and check logs:

```bash
docker-compose logs -f backend
```

You should now see:
```
✅ AWS Configuration: { AWS_ACCESS_KEY_ID: 'AKIA...', ... }
📤 Uploading to S3...
✅ S3 upload successful: https://...
```

## Common Issues

### Issue 1: .env file not being read

**Solution:**
- Make sure `.env` is in the same directory as `docker-compose.yml`
- Check file permissions: `chmod 644 .env`
- Restart docker-compose: `docker-compose down && docker-compose up -d`

### Issue 2: Variables set but still not working

**Solution:**
- Check for typos in variable names
- Make sure there are no extra spaces: `AWS_ACCESS_KEY_ID=AKIA...` (not `AWS_ACCESS_KEY_ID = AKIA...`)
- Verify the values don't have quotes unless needed

### Issue 3: Access Key exists but still getting error

**Possible causes:**
- Key was deleted in AWS console
- Key belongs to a different AWS account
- Key doesn't have S3 permissions

**Solution:**
- Create a new access key in AWS IAM
- Ensure the IAM user has S3 upload permissions
- Update `.env` with new credentials

### Issue 4: Bucket doesn't exist

**Error:** `NoSuchBucket`

**Solution:**
- Verify bucket name is correct
- Check bucket exists in the specified region
- Ensure bucket name matches exactly (case-sensitive)

## Security Best Practices

1. **Never commit `.env` to git**
   - Add `.env` to `.gitignore`
   - Use environment variables in CI/CD

2. **Use IAM roles instead of access keys** (if on AWS EC2)
   - More secure
   - No need to manage keys

3. **Rotate access keys regularly**
   - Create new keys
   - Update `.env`
   - Delete old keys

4. **Limit IAM permissions**
   - Only grant S3 upload permissions
   - Don't use admin access

## Quick Checklist

- [ ] `.env` file exists in project root
- [ ] `.env` contains all 4 AWS variables
- [ ] AWS credentials are valid (tested in AWS console)
- [ ] `docker-compose.yml` references `${AWS_ACCESS_KEY_ID}` etc.
- [ ] Container restarted after setting variables
- [ ] Variables visible inside container (`docker exec ... env | grep AWS`)
- [ ] AWS connection test passes
- [ ] Logs show successful AWS configuration

## Still Having Issues?

1. **Check server logs:**
   ```bash
   docker-compose logs backend | grep -i "aws\|error\|❌"
   ```

2. **Verify AWS credentials format:**
   - Access Key ID: Starts with `AKIA` (20 characters)
   - Secret Access Key: 40 characters
   - Bucket name: Lowercase, no spaces
   - Region: e.g., `us-east-1`, `us-west-2`

3. **Test with AWS CLI** (if installed):
   ```bash
   aws s3 ls --profile your-profile
   ```

4. **Contact AWS Support** if credentials are definitely correct but still failing



