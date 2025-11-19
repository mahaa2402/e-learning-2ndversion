#!/bin/bash

echo "🔧 AWS Credentials Fix Script"
echo "=============================="
echo ""

# Check if running as root or with sudo
if [ "$EUID" -eq 0 ]; then 
   echo "⚠️  Running as root. This is OK for fixing credentials."
fi

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found in current directory"
    echo "   Please navigate to your project directory first"
    exit 1
fi

echo "✅ Found docker-compose.yml"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 .env file not found. Creating it..."
    touch .env
    echo "# AWS Credentials" >> .env
    echo "AWS_ACCESS_KEY_ID=" >> .env
    echo "AWS_SECRET_ACCESS_KEY=" >> .env
    echo "AWS_BUCKET_NAME=" >> .env
    echo "AWS_REGION=" >> .env
    echo ""
    echo "✅ Created .env file"
    echo "⚠️  Please edit .env and add your AWS credentials:"
    echo "   nano .env"
    echo ""
    read -p "Press Enter after you've added credentials to .env..."
fi

# Check if AWS variables are set
echo "🔍 Checking AWS variables in .env..."
if ! grep -q "AWS_ACCESS_KEY_ID=.*[^=]$" .env 2>/dev/null; then
    echo "❌ AWS_ACCESS_KEY_ID is not set in .env"
    echo "   Please edit .env and add your credentials"
    exit 1
fi

if ! grep -q "AWS_SECRET_ACCESS_KEY=.*[^=]$" .env 2>/dev/null; then
    echo "❌ AWS_SECRET_ACCESS_KEY is not set in .env"
    exit 1
fi

if ! grep -q "AWS_BUCKET_NAME=.*[^=]$" .env 2>/dev/null; then
    echo "❌ AWS_BUCKET_NAME is not set in .env"
    exit 1
fi

if ! grep -q "AWS_REGION=.*[^=]$" .env 2>/dev/null; then
    echo "❌ AWS_REGION is not set in .env"
    exit 1
fi

echo "✅ All AWS variables found in .env"
echo ""

# Check if container is running
if ! docker ps | grep -q e-learning-backend; then
    echo "⚠️  Backend container is not running"
    echo "   Starting containers..."
    docker-compose up -d
    sleep 5
fi

# Check variables in container
echo "🔍 Checking AWS variables in container..."
AWS_VARS=$(docker exec e-learning-backend env | grep AWS)

if [ -z "$AWS_VARS" ]; then
    echo "❌ AWS variables NOT found in container"
    echo "   Restarting containers to load .env..."
    docker-compose down
    docker-compose up -d
    sleep 5
    echo "   Waiting for container to start..."
    sleep 10
else
    echo "✅ AWS variables found in container"
fi

# Verify again
echo ""
echo "🔍 Final verification..."
AWS_VARS=$(docker exec e-learning-backend env | grep AWS)

if [ -z "$AWS_VARS" ]; then
    echo "❌ Still no AWS variables in container"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Check docker-compose.yml references \${AWS_ACCESS_KEY_ID}"
    echo "   2. Make sure .env is in same directory as docker-compose.yml"
    echo "   3. Check file permissions: chmod 644 .env"
    exit 1
fi

echo "✅ AWS variables are set:"
echo "$AWS_VARS" | while IFS= read -r line; do
    if [[ $line == AWS_ACCESS_KEY_ID=* ]]; then
        KEY=$(echo "$line" | cut -d '=' -f2 | head -c 4)
        echo "   AWS_ACCESS_KEY_ID=${KEY}..."
    elif [[ $line == AWS_SECRET_ACCESS_KEY=* ]]; then
        echo "   AWS_SECRET_ACCESS_KEY=*** (hidden)"
    else
        echo "   $line"
    fi
done

echo ""
echo "🧪 Testing AWS connection..."
docker exec e-learning-backend node -e "
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});
s3.listBuckets((err, data) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('   Error code:', err.code);
    if (err.code === 'InvalidAccessKeyId') {
      console.error('   → The Access Key ID is invalid');
    } else if (err.code === 'SignatureDoesNotMatch') {
      console.error('   → The Secret Access Key is incorrect');
    }
    process.exit(1);
  } else {
    console.log('✅ Connection successful!');
    console.log('   Buckets:', data.Buckets.map(b => b.Name).join(', '));
    if (process.env.AWS_BUCKET_NAME) {
      const bucketExists = data.Buckets.some(b => b.Name === process.env.AWS_BUCKET_NAME);
      if (bucketExists) {
        console.log('✅ Target bucket exists');
      } else {
        console.log('⚠️  Target bucket not found in list');
      }
    }
    process.exit(0);
  }
});
" 2>&1

TEST_RESULT=$?

echo ""
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ All checks passed!"
    echo ""
    echo "🎉 AWS credentials are configured correctly"
    echo "   You can now upload images and videos"
else
    echo "❌ AWS connection test failed"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Verify credentials in AWS Console"
    echo "   2. Check IAM user has S3 permissions"
    echo "   3. Verify bucket name and region"
    exit 1
fi

