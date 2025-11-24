# How to Get a Course Access Token

## Method 1: Generate Test Token (Easiest)

### On Production Server:

```bash
cd ~/e-learning-2ndversion/backend

# Edit the test script to use a real employee email
nano test-course-access.js
```

Change these lines:
```javascript
const employeeEmail = 'mahaashrichandran@gmail.com'; // Use real employee email
const courseName = 'Factory Act'; // Use real course name
const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
```

Then run:
```bash
node test-course-access.js
```

This will output:
```
🔗 Course Access Link:
http://35.154.8.180/course-access?token=eyJlbWFpbCI6...
```

**Copy the token part** (everything after `?token=`)

## Method 2: Extract from Email URL

If you received an email with "Start Course Now" button:

1. **Right-click** the button/link
2. **Copy link address**
3. The URL will look like:
   ```
   http://35.154.8.180/course-access?token=eyJlbWFpbCI6...
   ```
4. **Copy everything after `?token=`** - that's your token!

## Method 3: From Browser URL

If you already clicked a link and it's in your browser:

1. Look at the browser address bar
2. The URL will be:
   ```
   http://35.154.8.180/course-access?token=eyJlbWFpbCI6...
   ```
3. **Copy everything after `?token=`**

## Method 4: Generate Token Manually (Advanced)

If you want to generate one programmatically:

```bash
cd ~/e-learning-2ndversion/backend
node -e "
require('dotenv').config();
const { generateSecureToken } = require('./utils/secureLinkGenerator');
const token = generateSecureToken(
  'mahaashrichandran@gmail.com',  // Employee email
  'Factory Act',                   // Course name
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
);
console.log('Token:', token);
"
```

## Quick Test with Token

Once you have the token, test it:

```bash
# Test the endpoint
curl "http://localhost:5000/api/courses/course-access?token=YOUR_TOKEN_HERE"

# Or test the full link
curl "http://35.154.8.180/course-access?token=YOUR_TOKEN_HERE"
```

## Example Token Format

A token looks like this:
```
eyJlbWFpbCI6Im1haGFhc2hyaWNoYW5kcmFuQGdtYWlsLmNvbSIsImNvdXJzZSI6IkZhY3RvcnkgQWN0IiwiZGVhZGxpbmUiOjE3NjQwNjc5MjAwMDAsInRpbWVzdGFtcCI6MTc2Mzk2MTc4MTI0NX0.454f5498d01103b31f1bd8c3b58ab1d4097b0e6db27ad8bd494a393702fcccef
```

It has two parts separated by a dot (`.`):
- First part: Base64 encoded data (email, course, deadline)
- Second part: HMAC signature

## Important Notes

⚠️ **Token Expiration**: Tokens expire at the deadline. If the deadline has passed, generate a new one.

⚠️ **JWT_SECRET**: Tokens are tied to the `JWT_SECRET` in your `.env` file. If you change it, all existing tokens become invalid.

⚠️ **Employee Email**: The token must match a real employee email in your database.

## Quick Command Summary

```bash
# Generate token
cd backend
node test-course-access.js

# Test token
curl "http://localhost:5000/api/courses/course-access?token=TOKEN_HERE"

# Watch logs while testing
docker compose logs -f backend
```

