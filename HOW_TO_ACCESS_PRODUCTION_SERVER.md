# How to Access Your Production Server

## Your Production Server Details
- **IP Address:** `16.16.205.98`
- **Port:** `5000` (backend)
- **Port:** `80` (frontend)

## Method 1: SSH Access (Most Common)

### On Windows:

#### Option A: Using PowerShell (Windows 10/11)
1. **Open PowerShell** (Press `Win + X` and select "Windows PowerShell" or "Terminal")
2. **SSH into your server:**
   ```powershell
   ssh username@16.16.205.98
   ```
   Replace `username` with your actual server username (common usernames: `ubuntu`, `ec2-user`, `admin`, `root`)

3. **If you have a key file (.pem), use:**
   ```powershell
   ssh -i "path\to\your\key.pem" username@16.16.205.98
   ```
   Example:
   ```powershell
   ssh -i "C:\Users\YourName\Downloads\my-key.pem" ubuntu@16.16.205.98
   ```

#### Option B: Using Windows Terminal
1. Open **Windows Terminal** (or install from Microsoft Store)
2. Same commands as above

#### Option C: Using PuTTY (Alternative)
1. Download PuTTY from: https://www.putty.org/
2. Enter hostname: `16.16.205.98`
3. Port: `22`
4. Click "Open"
5. Enter your username and password

### On Mac/Linux:
```bash
ssh username@16.16.205.98

# Or with key file:
ssh -i ~/path/to/key.pem username@16.16.205.98
```

## Method 2: If You're Using a Cloud Provider

### AWS EC2:
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **EC2** → **Instances**
3. Find your instance with IP `16.16.205.98`
4. Click **Connect** button
5. Use **EC2 Instance Connect** or **SSH Client** tab for connection instructions

### Other Cloud Providers:
- **DigitalOcean:** Use Droplet console or SSH
- **Azure:** Use Azure Cloud Shell or SSH
- **Google Cloud:** Use Cloud Shell or SSH

## Method 3: If Server is on Same Network (Local)

If the server is on your local network, you can access it directly:
```powershell
# Just SSH normally
ssh username@16.16.205.98
```

## After Connecting - What to Do

Once you're connected via SSH, you'll see a command prompt like:
```
username@server-name:~$
```

### Step 1: Navigate to Your Project
```bash
# Find your project directory (common locations)
cd ~/e-learning-project
# OR
cd /var/www/e-learning
# OR
cd /home/username/e-learning-project

# List files to find it
ls -la
```

### Step 2: Check if Docker is Running
```bash
# Check Docker containers
docker ps

# Check docker-compose
docker-compose ps
```

### Step 3: Check AWS Environment Variables
```bash
# Check environment variables in the container
docker exec e-learning-backend env | grep AWS

# If container name is different, find it first:
docker ps
# Then use the container name/ID
docker exec <container-name> env | grep AWS
```

### Step 4: Check Logs
```bash
# View logs
docker-compose logs backend

# Follow logs in real-time
docker-compose logs -f backend
```

## If You Don't Have SSH Access

### Option 1: Ask Your Server Administrator
- Contact whoever set up the server
- Ask for SSH credentials or access

### Option 2: Use Cloud Provider Console
- **AWS:** Use EC2 Instance Connect (browser-based)
- **DigitalOcean:** Use Droplet console
- **Azure:** Use Azure Cloud Shell

### Option 3: Check if You Have Web-Based Access
Some servers have web-based terminal access:
- **cPanel:** Terminal feature
- **Plesk:** Terminal feature
- **Webmin:** Command shell

## Finding Your Project Location

Once connected, find where your project is:

```bash
# Search for docker-compose.yml
find ~ -name "docker-compose.yml" 2>/dev/null

# Search for your project
find ~ -type d -name "*e-learning*" 2>/dev/null

# Check common project locations
ls -la ~/
ls -la /var/www/
ls -la /home/
ls -la /opt/
```

## Quick Commands Reference

Once you're in the project directory:

```bash
# Check AWS variables
docker exec e-learning-backend env | grep AWS

# View logs
docker-compose logs -f backend

# Restart containers
docker-compose down
docker-compose up -d

# Check container status
docker ps

# Check .env file
cat .env | grep AWS
```

## Troubleshooting SSH Connection

### "Permission denied"
- Check username is correct
- Check if you need a password or key file
- Verify key file permissions (on Mac/Linux: `chmod 400 key.pem`)

### "Connection timed out"
- Check if server IP is correct
- Check firewall settings
- Verify SSH port (usually 22) is open

### "Host key verification failed"
```bash
# Remove old host key
ssh-keygen -R 16.16.205.98
# Then try connecting again
```

## Still Can't Access?

1. **Check if you have the server credentials:**
   - Username
   - Password or SSH key file
   - Server IP address

2. **Contact your hosting provider** or server administrator

3. **Check if you can access via web interface:**
   - Try: `http://16.16.205.98` (frontend)
   - Try: `http://16.16.205.98:5000` (backend)

4. **If it's your own server:**
   - Check if SSH service is running
   - Check firewall rules
   - Verify network connectivity

## Next Steps After Access

Once you can access the server:

1. ✅ Navigate to project directory
2. ✅ Check AWS environment variables
3. ✅ Fix missing variables (see AWS_CREDENTIALS_FIX.md)
4. ✅ Restart containers
5. ✅ Test upload functionality



