# Debugging 400 Bad Request Error on Course Access

## What the Error Means

The 400 error means the backend received the request but rejected it. Common causes:

1. **Token expired** - Deadline has passed
2. **Invalid token signature** - JWT_SECRET mismatch
3. **Token format issue** - Token corrupted or malformed

## How to Debug

### Step 1: Check Backend Logs

On your production server, check the backend logs:

```bash
docker compose logs backend --tail=100 | grep -i "course-access\|token\|error"
```

Or view all recent logs:
```bash
docker compose logs backend --tail=50
```

### Step 2: Look for Specific Error Messages

The enhanced logging will show:

**If token is expired:**
```
❌ Token expired - deadline passed
📅 Expired by: X hours
```

**If signature doesn't match:**
```
❌ Invalid token signature - signatures do not match
⚠️ This could mean:
   1. Token was generated with different JWT_SECRET
   2. Token was tampered with
   3. JWT_SECRET changed between token generation and verification
```

**If token format is wrong:**
```
❌ Token format invalid - missing payload or signature
```

### Step 3: Common Issues and Fixes

#### Issue 1: Token Expired

**Symptoms:**
- Error: "Token expired - deadline passed"
- Logs show deadline in the past

**Fix:**
- Generate a new token with a future deadline
- Or extend the deadline when assigning tasks

#### Issue 2: JWT_SECRET Mismatch

**Symptoms:**
- Error: "Invalid token signature"
- Token was generated with different JWT_SECRET

**Fix:**
1. Check `.env` file has `JWT_SECRET` set
2. Make sure same `JWT_SECRET` is used for:
   - Generating tokens (when assigning tasks)
   - Verifying tokens (when accessing course)
3. If JWT_SECRET changed, all existing tokens become invalid

**To verify:**
```bash
# On production server
docker exec e-learning-backend printenv | grep JWT_SECRET
```

#### Issue 3: Token Double-Encoded

**Symptoms:**
- Token has `%3D` (encoded `=`) in URL
- Token validation fails

**Fix:**
- The code now handles URL decoding automatically
- Should be fixed with the latest update

### Step 4: Test Token Manually

You can test token validation directly:

```bash
# On production server
cd backend
node -e "
require('dotenv').config();
const { verifySecureToken } = require('./utils/secureLinkGenerator');
const token = 'YOUR_TOKEN_HERE';
const result = verifySecureToken(token);
console.log('Result:', result);
"
```

### Step 5: Generate New Test Token

Generate a fresh token for testing:

```bash
cd backend
node test-course-access.js
```

Make sure:
- Deadline is in the future
- JWT_SECRET is set correctly
- Employee email exists in database

## Quick Fix Checklist

- [ ] Check backend logs for specific error
- [ ] Verify JWT_SECRET is set in `.env`
- [ ] Check token deadline hasn't passed
- [ ] Regenerate token if needed
- [ ] Restart backend if JWT_SECRET was changed

## Most Likely Cause

Based on the error, the most likely causes are:

1. **Token expired** - Check the deadline in the token
2. **JWT_SECRET mismatch** - Token generated with different secret than verification

## Next Steps

1. **Check backend logs** to see the specific error
2. **Verify JWT_SECRET** is consistent
3. **Generate a new token** with current JWT_SECRET
4. **Test again** with the new token

## After Fixing

Once you identify and fix the issue:

1. Commit the logging improvements:
   ```bash
   git add backend/routes/Course.js backend/utils/secureLinkGenerator.js frontend/src/pages/CourseAccess.js
   git commit -m "Add detailed logging for course access token validation"
   git push
   ```

2. Redeploy:
   ```bash
   docker compose down
   git pull
   docker compose up -d --build
   ```

The enhanced logging will help identify the exact issue!

