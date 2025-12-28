# Production Setup Guide for Video Presigned URLs

## Overview
The video playback system now uses presigned URLs from S3 to avoid 403 Forbidden errors. This guide covers what needs to be configured for production.

## ✅ Already Configured

1. **Backend Endpoint**: `/api/video/get` is already set up in `backend/routes/Videofetch.js`
2. **Nginx Proxy**: The `/api` location block in `nginx.conf` will proxy video requests
3. **Frontend Code**: Updated to fetch presigned URLs automatically

## 🔧 Production Configuration Steps

### 1. API Configuration (✅ Already Fixed)
The `frontend/src/config/api.js` has been updated to use relative URLs in production:
- **Development**: Uses `http://localhost:5000`
- **Production**: Uses relative URLs (empty BASE_URL) to go through nginx proxy

### 2. Environment Variables (Backend)

Ensure these environment variables are set in your production backend:

```bash
# AWS Configuration
AWS_REGION=eu-north-1
AWS_BUCKET_NAME=intern-vista-work-space
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Video URL TTL (optional, defaults to 3600 seconds = 1 hour)
VIDEO_URL_TTL_SECONDS=3600
```

### 3. Nginx Configuration (✅ Already Configured)

The `frontend/nginx.conf` already has the `/api` location block that will proxy all API requests including `/api/video/get`:

```nginx
location /api {
    proxy_pass http://backend:5000;
    # ... other settings
}
```

**No changes needed** - this will handle `/api/video/get` requests.

### 4. CORS Configuration (If Needed)

If you encounter CORS issues, ensure your backend has CORS enabled for the video endpoint:

```javascript
// In backend/server.js or backend/routes/Videofetch.js
app.use(cors({
  origin: ['http://your-frontend-domain.com', 'https://your-frontend-domain.com'],
  credentials: true
}));
```

### 5. S3 Bucket Permissions

Ensure your S3 bucket allows the backend to:
- ✅ List objects in `e-learning/videos/` prefix
- ✅ Generate presigned URLs (getObject)
- ✅ The bucket itself doesn't need to be public

**Bucket Policy Example** (for the backend IAM user):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::intern-vista-work-space",
        "arn:aws:s3:::intern-vista-work-space/e-learning/videos/*"
      ]
    }
  ]
}
```

### 6. Testing in Production

After deployment, test the following:

1. **Check API Endpoint**:
   ```bash
   curl "https://your-domain.com/api/video/get?courseName=ok2&moduleIndex=0"
   ```
   Should return: `{"success": true, "url": "https://...presigned-url..."}`

2. **Check Browser Console**:
   - Look for: `🔐 Fetching presigned URL for video`
   - Look for: `✅ Presigned URL fetched successfully`
   - Video should load without 403 errors

3. **Check Network Tab**:
   - Video request should have status 200 (not 403)
   - URL should contain `X-Amz-Signature` parameter (indicates presigned URL)

## 🔍 Troubleshooting

### Issue: Still getting 403 Forbidden
**Solution**: 
- Check backend logs for S3 errors
- Verify AWS credentials are correct
- Check S3 bucket permissions

### Issue: Video endpoint returns 404
**Solution**:
- Verify the route is registered: `app.use('/api/video', videoFetchRoutes)`
- Check nginx is proxying `/api/video/*` correctly
- Check backend is running and accessible

### Issue: CORS errors
**Solution**:
- Add CORS headers in backend
- Check nginx is forwarding proper headers
- Verify frontend domain is in CORS whitelist

### Issue: Presigned URL expires too quickly
**Solution**:
- Increase `VIDEO_URL_TTL_SECONDS` environment variable
- Default is 3600 seconds (1 hour)
- Videos longer than 1 hour may need longer TTL

## 📝 Summary

**What's Already Done:**
- ✅ Frontend code updated to fetch presigned URLs
- ✅ API configuration uses relative URLs in production
- ✅ Nginx configured to proxy API requests
- ✅ Backend endpoint exists and is functional

**What You Need to Do:**
1. ✅ Verify backend environment variables are set
2. ✅ Ensure S3 bucket permissions are correct
3. ✅ Test the endpoint after deployment
4. ✅ Monitor for any CORS or permission errors

## 🚀 Deployment Checklist

- [ ] Backend environment variables configured
- [ ] S3 bucket permissions verified
- [ ] Nginx configuration deployed
- [ ] Frontend build uses production API config
- [ ] Test video playback in production
- [ ] Monitor logs for errors
- [ ] Verify presigned URLs are being generated

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check backend logs for S3/API errors
3. Verify network requests in browser DevTools
4. Test the `/api/video/get` endpoint directly



