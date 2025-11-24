# Deploy Course Access Feature to Production

## Prerequisites

✅ Course access is working on localhost  
✅ All code changes are saved  
✅ You have access to your production server (35.154.8.180)

## Deployment Steps

### Step 1: Transfer Updated Code to Production Server

**Option A: Using Git (Recommended)**
```bash
# On your local machine
git add .
git commit -m "Add course access route and email notifications"
git push origin main

# SSH into production server
ssh user@35.154.8.180

# Navigate to project directory
cd /path/to/e-learning-project

# Pull latest changes
git pull origin main
```

**Option B: Using SCP/File Transfer**
```bash
# Copy updated files to production server
scp -r frontend/src/routes/AppRoutes.js user@35.154.8.180:/path/to/project/frontend/src/routes/
scp -r frontend/src/pages/CourseAccess.js user@35.154.8.180:/path/to/project/frontend/src/pages/
scp -r backend/routes/Course.js user@35.154.8.180:/path/to/project/backend/routes/
scp -r backend/services/emailService.js user@35.154.8.180:/path/to/project/backend/services/
scp -r backend/controllers/Admin.js user@35.154.8.180:/path/to/project/backend/controllers/
scp -r backend/utils/secureLinkGenerator.js user@35.154.8.180:/path/to/project/backend/utils/
scp -r backend/assignedCourseUserProgressManager.js user@35.154.8.180:/path/to/project/backend/
```

### Step 2: Rebuild Frontend Container

On your production server:

```bash
# Navigate to project root
cd /path/to/e-learning-project

# Rebuild frontend container (this will include the new route)
docker-compose build frontend

# Restart frontend container
docker-compose up -d frontend
```

### Step 3: Rebuild Backend Container (Optional but Recommended)

Since we added new routes and functionality:

```bash
# Rebuild backend container
docker-compose build backend

# Restart backend container
docker-compose up -d backend
```

### Step 4: Verify Deployment

**Check Container Status:**
```bash
docker-compose ps
```

Both containers should show "Up" status.

**Check Logs:**
```bash
# Frontend logs
docker-compose logs frontend

# Backend logs
docker-compose logs backend
```

Look for any errors in the logs.

### Step 5: Test in Production

1. **Test the route directly:**
   - Visit: `http://35.154.8.180/course-access`
   - Should show error (no token), but route should exist

2. **Test with a real assignment:**
   - Log in as admin
   - Assign a task to an employee
   - Check email (or backend logs if email not configured)
   - Click "Start Course Now" button
   - Should redirect to dashboard

3. **Test token validation:**
   ```bash
   # On production server, generate a test token
   cd backend
   node test-course-access.js
   # But modify it to use production URL:
   # Change frontendUrl to: http://35.154.8.180
   ```

## Quick Deployment Command (All-in-One)

If you're on the production server and have all code updated:

```bash
cd /path/to/e-learning-project

# Rebuild and restart both containers
docker-compose down
docker-compose build --no-cache frontend backend
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Troubleshooting

### Route Still Not Working

1. **Clear browser cache:**
   - Press `Ctrl+Shift+R` (hard refresh)
   - Or use incognito/private window

2. **Verify route is in build:**
   ```bash
   # Check if route exists in built files
   docker exec e-learning-frontend cat /usr/share/nginx/html/index.html | grep course-access
   ```

3. **Check nginx configuration:**
   ```bash
   docker exec e-learning-frontend cat /etc/nginx/conf.d/default.conf
   ```
   Should have `try_files $uri $uri/ /index.html;`

### Backend API Not Responding

1. **Check backend is running:**
   ```bash
   docker-compose ps backend
   ```

2. **Check backend logs:**
   ```bash
   docker-compose logs backend | tail -50
   ```

3. **Test backend health:**
   ```bash
   curl http://35.154.8.180:5000/health
   ```

### Email Links Not Working

1. **Check email service configuration:**
   - Verify `.env` has `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`
   - Check backend logs for email sending errors

2. **Verify link generation:**
   - Check backend logs when assigning task
   - Should see: `🔗 Generated secure course link for...`

## Post-Deployment Checklist

- [ ] Frontend container rebuilt and running
- [ ] Backend container rebuilt and running
- [ ] `/course-access` route accessible (shows error without token)
- [ ] Task assignment email includes "Start Course Now" button
- [ ] Clicking email link redirects to dashboard
- [ ] Course completion email sent to admin
- [ ] All logs show no errors

## Rollback (If Needed)

If something goes wrong:

```bash
# Stop containers
docker-compose down

# Revert to previous version (if using git)
git checkout HEAD~1

# Rebuild and restart
docker-compose build frontend backend
docker-compose up -d
```

## Summary

The main step is **rebuilding the frontend Docker container** since we added a new route. The backend changes will be picked up automatically if you're using volume mounts, but rebuilding ensures everything is up to date.

**Key Command:**
```bash
docker-compose build frontend && docker-compose up -d frontend
```

