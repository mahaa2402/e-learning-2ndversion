# Fix Token Validation Error

## The Problem

The token was generated on **production** with production's `JWT_SECRET`, but you're testing on **localhost** which has a different `JWT_SECRET`. This causes signature mismatch.

## Solution 1: Use Production JWT_SECRET on Localhost (For Testing)

### Step 1: Get Production JWT_SECRET

On production server:
```bash
docker exec e-learning-backend printenv | grep JWT_SECRET
```

Or check the `.env` file on production server.

### Step 2: Update Localhost .env

On your local machine, in `backend/.env`:
```bash
JWT_SECRET=YOUR_PRODUCTION_JWT_SECRET_HERE
```

### Step 3: Restart Local Backend

```bash
cd backend
npm run dev
```

Now the token should work!

## Solution 2: Generate New Token on Localhost

Generate a fresh token using your localhost JWT_SECRET:

```bash
cd backend
node test-course-access.js
```

Use the generated link - it will work on localhost.

## Solution 3: Test on Production Server

Instead of testing on localhost, test directly on production:

1. Get the email link from production
2. Open it on production URL: `http://35.154.8.180/course-access?token=...`
3. It should work because token and JWT_SECRET match

## Solution 4: Check Token Expiration

The token might also be expired. Check the deadline:

```bash
# Decode the token payload (first part before the dot)
# The token in your URL shows deadline: 1764067920000
# Convert to date:
node -e "console.log(new Date(1764067920000).toLocaleString())"
```

If the date is in the past, the token is expired. Generate a new one.

## Quick Fix Command

**On localhost, to match production:**

```bash
# 1. Get production JWT_SECRET
# SSH to production and run:
docker exec e-learning-backend printenv | grep JWT_SECRET

# 2. Copy the value

# 3. On localhost, update backend/.env
echo "JWT_SECRET=PASTE_PRODUCTION_SECRET_HERE" >> backend/.env

# 4. Restart backend
cd backend
npm run dev
```

## Why This Happens

- **Token Generation**: Uses `JWT_SECRET` from production `.env`
- **Token Validation**: Uses `JWT_SECRET` from localhost `.env`
- **Mismatch**: Different secrets = invalid signature = token rejected

## Best Practice

For testing, always use the same `JWT_SECRET` across environments, OR generate tokens in the same environment where you'll test them.

