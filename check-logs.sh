#!/bin/bash

# Quick script to check backend logs for upload errors

echo "🔍 Checking E-learning Backend Logs..."
echo "======================================"
echo ""

# Check if container is running
if ! docker ps | grep -q e-learning-backend; then
    echo "❌ Backend container is not running!"
    echo "   Start it with: docker-compose up -d"
    exit 1
fi

echo "✅ Backend container is running"
echo ""

# Show recent errors
echo "📋 Recent Errors (last 50 lines):"
echo "-----------------------------------"
docker-compose logs --tail=50 backend | grep -i "error\|❌\|failed" || echo "No errors found in recent logs"
echo ""

# Show recent upload attempts
echo "📤 Recent Upload Attempts:"
echo "-------------------------"
docker-compose logs --tail=100 backend | grep -i "upload\|course image" || echo "No upload attempts found"
echo ""

# Check AWS environment variables
echo "🔐 AWS Environment Variables Check:"
echo "------------------------------------"
docker exec e-learning-backend env | grep AWS | sed 's/=.*/=***/' || echo "❌ No AWS variables found!"
echo ""

# Check uploads directory
echo "📁 Uploads Directory Check:"
echo "-----------------------------"
docker exec e-learning-backend ls -la /app/uploads 2>/dev/null || echo "❌ Uploads directory not found or not accessible"
echo ""

# Show live logs option
echo "💡 To watch logs in real-time, run:"
echo "   docker-compose logs -f backend"
echo ""



