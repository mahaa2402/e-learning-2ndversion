# Video Upload Size Limits Configuration

## Current Configuration

### ✅ NO FILE SIZE LIMIT (Supports 1GB+ Videos)

1. **Nginx Configuration** (`frontend/nginx.conf`)
   - `client_max_body_size: 0` - **NO LIMIT** (0 = unlimited)
   - `proxy_connect_timeout: 1800s` - 30 minutes for connection
   - `proxy_send_timeout: 1800s` - 30 minutes for sending data
   - `proxy_read_timeout: 1800s` - 30 minutes for reading response

2. **Multer Configuration** (`backend/routes/VideoUpload.js`)
   - `fileSize: Infinity` - **NO LIMIT** - supports 1GB+ videos
   - `fieldSize: 10 * 1024 * 1024` (10MB) - Maximum size for other form fields

3. **Express Body Parser** (`backend/server.js`)
   - `limit: '10mb'` - For JSON/URL-encoded data (not file uploads)

## How to Upload Large Videos (1GB+)

### ✅ NO FILE SIZE LIMIT!

The system is now configured with **NO FILE SIZE LIMIT**. You can upload videos of **any size**, including 1GB, 2GB, or even larger!

### Important Notes:

1. **Upload Time**: Large videos (1GB+) may take a long time to upload depending on:
   - Your internet connection speed
   - Server bandwidth
   - Network latency
   - **For 1GB video on 10 Mbps connection: ~13 minutes**
   - **For 1GB video on 50 Mbps connection: ~2.5 minutes**

2. **Browser Timeout**: Some browsers may timeout on very slow connections. If this happens:
   - Use a faster internet connection
   - Consider compressing the video before upload
   - Upload during off-peak hours
   - Use a browser with better upload handling (Chrome/Firefox recommended)

3. **Server Resources**: Ensure your server has:
   - **Sufficient disk space** in `/uploads` directory (temporary storage) - needs at least 2x the video size
   - **Adequate memory** for processing large files
   - **Stable network connection** to AWS S3
   - **Long timeout settings** (already configured to 30 minutes)

4. **AWS S3**: Videos are uploaded directly to S3, so:
   - No permanent storage on server (only temporary)
   - S3 supports files up to 5TB for standard uploads
   - Upload speed depends on your connection to AWS
   - Large files are automatically handled by S3 multipart upload

## Testing Large File Uploads

If you encounter upload errors:

1. **Check Network**: Monitor upload progress in browser DevTools (Network tab)
2. **Check Server Logs**: Look for multer errors or timeout messages
3. **Check Nginx Logs**: Verify nginx is accepting the file
4. **Check Disk Space**: Ensure `/uploads` directory has enough space (at least 2x video size)
5. **Check Browser Console**: Look for any JavaScript errors

## Current Status

✅ **NO FILE SIZE LIMIT - Upload videos of any size!**

The system is configured to accept videos of **any size** (1GB, 2GB, 5GB, etc.) with no restrictions.

## Troubleshooting

### Error: "Request Entity Too Large"
- **Cause**: Nginx `client_max_body_size` is too small
- **Fix**: Increase `client_max_body_size` in `nginx.conf`

### Error: "File too large"
- **Cause**: Multer file size limit exceeded
- **Fix**: Increase `fileSize` limit in `VideoUpload.js`

### Error: "Request timeout"
- **Cause**: Upload taking too long
- **Fix**: Increase timeout values in `nginx.conf`

### Error: "ECONNRESET" or "Network Error"
- **Cause**: Connection dropped during upload
- **Fix**: 
  - Check network stability
  - Use a faster connection
  - Consider video compression

## Video Compression Tips

To reduce upload time and storage costs:

1. **Use H.264 codec** - Best compression for web
2. **Reduce resolution** - 1080p is usually sufficient
3. **Lower bitrate** - 2-5 Mbps for most content
4. **Remove audio if not needed** - Saves significant space
5. **Use tools like HandBrake or FFmpeg** for compression

Example FFmpeg command:
```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k output.mp4
```

## Current Status

✅ **500MB video uploads are now supported!**

All configurations have been updated to allow 500MB video uploads.

