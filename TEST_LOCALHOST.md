# Testing Course Access on Localhost (Development)

## Important: Use localhost, NOT production server!

The production server (`35.154.8.180`) doesn't have the updated route yet. You need to test on `localhost:3000` for development.

## Step-by-Step Instructions

### Step 1: Start Backend (Terminal 1)

```bash
cd backend
npm run dev
```

Wait for: `🚀 Server running on port 5000`

### Step 2: Start Frontend (Terminal 2)

```bash
cd frontend
npm start
```

Wait for: Browser opens at `http://localhost:3000`

**IMPORTANT:** Make sure it says `localhost:3000`, NOT `35.154.8.180`

### Step 3: Generate Test Link for Localhost

```bash
cd backend
node test-course-access.js
```

This will generate a link like:
```
http://localhost:3000/course-access?token=...
```

### Step 4: Test the Link

1. **Copy the generated link** (it should start with `http://localhost:3000`)
2. **Paste it in your browser**
3. You should see:
   - Loading spinner: "Validating access link..."
   - Then redirect to `/userdashboard`

## If You Still See "No routes matched location"

### Check 1: Verify Frontend is Running on Localhost

Open browser and go to: `http://localhost:3000`

You should see your app. If you see production site, you're on the wrong server!

### Check 2: Verify Route is in Code

Open `frontend/src/routes/AppRoutes.js` and verify line 69 has:
```javascript
<Route path="/course-access" element={<CourseAccess />} />
```

### Check 3: Restart Frontend Dev Server

1. Stop frontend: Press `Ctrl+C` in Terminal 2
2. Start again: `npm start`
3. Wait for it to fully load
4. Try the link again

### Check 4: Clear Browser Cache

Sometimes browser caches old routes:
- Press `Ctrl+Shift+R` (hard refresh)
- Or open in incognito/private window

## Quick Verification

Run this in your browser console (F12) when on `localhost:3000`:

```javascript
// Check if route exists
console.log(window.location.href);
// Should show: http://localhost:3000/...

// Try navigating programmatically
window.location.href = '/course-access?token=test';
// Should navigate to course-access page
```

## Expected Behavior

✅ **Correct (Development):**
- URL: `http://localhost:3000/course-access?token=...`
- Shows loading spinner
- Redirects to dashboard

❌ **Wrong (Production):**
- URL: `http://35.154.8.180/course-access?token=...`
- Shows "No routes matched location"
- This is because production build doesn't have the route yet

## Testing with Real Email Link

If you want to test with a real task assignment:

1. Make sure you're on `localhost:3000`
2. Log in as admin
3. Assign a task
4. The email link will be generated with `localhost:3000` (in development)
5. Click the link - it should work!

## Summary

**For Development Testing:**
- ✅ Use: `http://localhost:3000`
- ❌ Don't use: `http://35.154.8.180` (production, needs rebuild)

**The route is in your code, but production server needs to be rebuilt and redeployed to have it!**

