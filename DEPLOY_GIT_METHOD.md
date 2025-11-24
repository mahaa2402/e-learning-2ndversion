# Deploy Using Git Method (Recommended)

## Step-by-Step Deployment

### Step 1: Commit and Push Your Changes (Local Machine)

```bash
# Navigate to project root
cd /path/to/e-learning-project

# Check what files changed
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Add course access route, email notifications, and secure link generation"

# Push to your repository
git push origin main
# (or git push origin master, depending on your branch name)
```

### Step 2: Deploy on Production Server

SSH into your production server and run:

```bash
# Navigate to project directory
cd /path/to/e-learning-project

# Stop running containers
docker compose down

# Pull latest code from git
git pull origin main
# (or git pull origin master)

# Rebuild and start containers
docker compose up -d --build

# Check status
docker compose ps
```

### Step 3: Verify Deployment

```bash
# Check logs for any errors
docker compose logs frontend --tail=50
docker compose logs backend --tail=50

# Test the route
curl http://localhost/course-access
# Should return HTML (even if error, route exists)
```

## Complete Command Sequence

**On Local Machine:**
```bash
git add .
git commit -m "Add course access feature"
git push origin main
```

**On Production Server:**
```bash
cd /path/to/e-learning-project
docker compose down
git pull
docker compose up -d --build
docker compose ps
```

## Benefits of This Method

✅ **Version Control**: All changes are tracked in git  
✅ **Easy Rollback**: Can revert with `git checkout`  
✅ **Consistent**: Same code on all environments  
✅ **Automated**: One command rebuilds everything  

## Important Notes

1. **Make sure `.env` file is NOT in git** (should be in `.gitignore`)
   - Your production `.env` should already exist on the server
   - Don't overwrite it with `git pull`

2. **If you have uncommitted changes on production server:**
   ```bash
   # Stash them first
   git stash
   git pull
   git stash pop
   ```

3. **If you want to rebuild only specific services:**
   ```bash
   docker compose up -d --build frontend  # Only frontend
   docker compose up -d --build backend # Only backend
   ```

## Troubleshooting

### Git Pull Fails
```bash
# If you have local changes that conflict
git stash
git pull
git stash pop
```

### Docker Build Fails
```bash
# Check what went wrong
docker compose logs

# Try rebuilding with no cache
docker compose build --no-cache frontend backend
docker compose up -d
```

### Containers Don't Start
```bash
# Check status
docker compose ps

# View detailed logs
docker compose logs frontend
docker compose logs backend

# Restart specific service
docker compose restart frontend
```

## Quick Reference

```bash
# Full deployment cycle
git add . && git commit -m "Your message" && git push

# On server
docker compose down && git pull && docker compose up -d --build
```

This is the cleanest and most maintainable deployment method! 🚀

