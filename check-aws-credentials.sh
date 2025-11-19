#!/bin/bash

echo "🔍 AWS Credentials Diagnostic Tool"
echo "==================================="
echo ""

# Check if container is running
if ! docker ps | grep -q e-learning-backend; then
    echo "❌ Backend container is not running!"
    echo "   Start it with: docker-compose up -d"
    exit 1
fi

echo "✅ Backend container is running"
echo ""

# Check .env file
echo "📄 Checking .env file:"
echo "----------------------"
if [ -f .env ]; then
    echo "✅ .env file exists"
    if grep -q "AWS_ACCESS_KEY_ID" .env && grep -q "AWS_SECRET_ACCESS_KEY" .env; then
        echo "✅ AWS variables found in .env"
        # Show first 4 chars of access key (safe to show)
        AWS_KEY=$(grep "AWS_ACCESS_KEY_ID" .env | cut -d '=' -f2 | head -c 4)
        if [ ! -z "$AWS_KEY" ]; then
            echo "   AWS_ACCESS_KEY_ID starts with: ${AWS_KEY}..."
        fi
    else
        echo "❌ AWS variables NOT found in .env"
    fi
else
    echo "❌ .env file NOT found in project root"
fi
echo ""

# Check docker-compose.yml
echo "🐳 Checking docker-compose.yml:"
echo "--------------------------------"
if grep -q "AWS_ACCESS_KEY_ID" docker-compose.yml; then
    echo "✅ AWS variables referenced in docker-compose.yml"
else
    echo "❌ AWS variables NOT found in docker-compose.yml"
fi
echo ""

# Check environment variables inside container
echo "🔐 Checking environment variables in container:"
echo "------------------------------------------------"
AWS_VARS=$(docker exec e-learning-backend env | grep AWS)

if [ -z "$AWS_VARS" ]; then
    echo "❌ NO AWS environment variables found in container!"
    echo ""
    echo "💡 This means the variables are not being passed to the container."
    echo "   Check:"
    echo "   1. .env file exists and has AWS variables"
    echo "   2. docker-compose.yml references \${AWS_ACCESS_KEY_ID}"
    echo "   3. Container was restarted after setting variables"
else
    echo "✅ AWS environment variables found in container:"
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
fi
echo ""

# Test AWS connection
echo "🧪 Testing AWS S3 Connection:"
echo "-----------------------------"
docker exec e-learning-backend node -e "
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

console.log('Testing connection...');
s3.listBuckets((err, data) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('   Error code:', err.code);
    if (err.code === 'InvalidAccessKeyId') {
      console.error('   → The Access Key ID is invalid or does not exist');
    } else if (err.code === 'SignatureDoesNotMatch') {
      console.error('   → The Secret Access Key is incorrect');
    }
    process.exit(1);
  } else {
    console.log('✅ Connection successful!');
    console.log('   Available buckets:', data.Buckets.map(b => b.Name).join(', '));
    if (process.env.AWS_BUCKET_NAME) {
      const bucketExists = data.Buckets.some(b => b.Name === process.env.AWS_BUCKET_NAME);
      if (bucketExists) {
        console.log('✅ Target bucket \"' + process.env.AWS_BUCKET_NAME + '\" exists');
      } else {
        console.log('❌ Target bucket \"' + process.env.AWS_BUCKET_NAME + '\" NOT found');
        console.log('   Available buckets:', data.Buckets.map(b => b.Name).join(', '));
      }
    }
    process.exit(0);
  }
});
" 2>&1

echo ""
echo "==================================="
echo "📋 Summary:"
echo ""

# Final check
MISSING_VARS=0
for var in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_BUCKET_NAME AWS_REGION; do
    if ! docker exec e-learning-backend env | grep -q "^${var}="; then
        echo "❌ $var is NOT set"
        MISSING_VARS=$((MISSING_VARS + 1))
    fi
done

if [ $MISSING_VARS -eq 0 ]; then
    echo "✅ All AWS environment variables are set"
else
    echo "❌ $MISSING_VARS AWS environment variable(s) are missing"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Create/update .env file with AWS credentials"
    echo "   2. Restart containers: docker-compose down && docker-compose up -d"
    echo "   3. Run this script again to verify"
fi



