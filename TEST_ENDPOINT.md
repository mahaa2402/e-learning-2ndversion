# Test Course Access Endpoint

## Issue Found

The logs show the route is registered (`GET /course-access`), but **no requests are reaching it** when you click the link. This suggests:

1. The frontend might be calling the wrong URL
2. CORS issue blocking the request
3. Network error before reaching backend

## Test Steps

### Step 1: Test the Endpoint Directly

On your production server, test the endpoint manually:

```bash
# Get a token from an email or generate one
# Then test:
curl "http://localhost:5000/api/courses/course-access?token=YOUR_TOKEN_HERE"
```

Or from your local machine:
```bash
curl "http://35.154.8.180:5000/api/courses/course-access?token=YOUR_TOKEN_HERE"
```

### Step 2: Watch Logs While Testing

In one terminal, keep logs running:
```bash
docker compose logs -f backend
```

In another terminal or browser, click the course access link and watch for:
- `🔍 Course access request received`
- Any error messages

### Step 3: Check Browser Console

When you click the link, open browser DevTools (F12) and check:
1. **Console tab** - Look for JavaScript errors
2. **Network tab** - Look for the API request to `/api/courses/course-access`
   - Check the request URL
   - Check the response status
   - Check for CORS errors

### Step 4: Verify API URL Configuration

The frontend might be using the wrong API URL. Check:

```bash
# In browser console (F12), run:
console.log(API_ENDPOINTS.COURSES.GET_COURSE);
```

It should show: `http://35.154.8.180/api/courses` (or your production URL)

## Common Issues

### Issue 1: Wrong API URL

**Symptom:** Request goes to wrong server or port

**Fix:** Check `frontend/src/config/api.js` and ensure `REACT_APP_API_URL` is set correctly in production

### Issue 2: CORS Error

**Symptom:** Browser console shows CORS error

**Fix:** Backend CORS should already be configured, but verify in `backend/server.js`

### Issue 3: Token Already Expired

**Symptom:** Token deadline has passed

**Fix:** Generate a new token with a future deadline

## Quick Debug Command

Test with a fresh token:

```bash
# On production server
cd backend
node test-course-access.js

# Copy the generated link
# Open it in browser
# Watch logs: docker compose logs -f backend
```

## What to Look For

When you click the link, you should see in logs:

```
🔍 Course access request received
📋 Raw token from query: ...
🔍 Verifying token...
```

If you don't see these logs, the request isn't reaching the backend!

