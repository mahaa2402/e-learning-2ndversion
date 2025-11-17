# E-Learning Platform - AWS EC2 Deployment Guide

This comprehensive guide will walk you through deploying your e-learning platform to AWS EC2 using Docker and Docker Compose.

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [AWS EC2 Setup](#aws-ec2-setup)
4. [Environment Configuration](#environment-configuration)
5. [Docker Setup on EC2](#docker-setup-on-ec2)
6. [Deployment Steps](#deployment-steps)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance & Updates](#maintenance--updates)

---

## 🎯 Project Overview

### Architecture
- **Backend**: Node.js/Express API server (Port 5000)
- **Frontend**: React application served via Nginx (Port 80)
- **Database**: MongoDB Atlas (cloud-hosted)
- **File Storage**: AWS S3
- **Email Service**: SMTP (for OTP emails)

### Technology Stack
- **Backend**: Node.js 18, Express 5, Mongoose
- **Frontend**: React 19, React Router
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (for frontend)

---

## ✅ Prerequisites

Before starting, ensure you have:

1. **AWS Account** with:
   - EC2 access
   - S3 bucket created
   - IAM user with S3 permissions
   - Security group configured

2. **MongoDB Atlas Account**:
   - Cluster created
   - Database user configured
   - Network access whitelist configured

3. **SMTP Email Account**:
   - Gmail with App Password, or
   - Other SMTP service credentials

4. **Domain Name (Optional)**:
   - For production use

---

## 🚀 AWS EC2 Setup

### Step 1: Launch EC2 Instance

1. **Go to EC2 Dashboard** → Click "Launch Instance"

2. **Configure Instance**:
   - **Name**: `e-learning-platform`
   - **AMI**: Ubuntu Server 22.04 LTS (recommended)
   - **Instance Type**: 
     - Minimum: `t2.micro` (free tier)
     - Recommended: `t2.small` or `t3.small` for production
   - **Key Pair**: Create or select existing key pair (.pem file)
   - **Network Settings**: 
     - Create security group with rules:
       - **SSH (22)**: Your IP
       - **HTTP (80)**: 0.0.0.0/0 (all traffic)
       - **HTTPS (443)**: 0.0.0.0/0 (optional, for SSL)
       - **Custom TCP (5000)**: 0.0.0.0/0 (for backend API)

3. **Storage**: 20 GB minimum (gp3 SSD recommended)

4. **Launch Instance**

### Step 2: Configure Security Group

After instance creation, update security group:

1. Go to **EC2** → **Security Groups**
2. Select your security group
3. **Inbound Rules**:
   ```
   Type          Protocol    Port Range    Source
   SSH           TCP         22            Your IP/32
   HTTP          TCP         80            0.0.0.0/0
   HTTPS         TCP         443           0.0.0.0/0
   Custom TCP    TCP         5000          0.0.0.0/0
   ```

### Step 3: Allocate Elastic IP (Recommended)

1. Go to **EC2** → **Elastic IPs** → **Allocate Elastic IP**
2. **Allocate** → **Associate** with your instance
3. Note the Elastic IP address (you'll use this for your domain/API URL)

---

## 🔧 Environment Configuration

### Step 1: Create Environment File

On your local machine, create a `.env` file in the project root:

```bash
# MongoDB Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority

# JWT Secret Key (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Backend Port
PORT=5000

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-s3-bucket-name

# Email/SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
FROM_EMAIL=your-email@gmail.com

# Frontend API URL - Replace with your EC2 Elastic IP or domain
# Format: http://YOUR_EC2_IP:5000 or http://yourdomain.com
REACT_APP_API_URL=http://YOUR_EC2_ELASTIC_IP:5000
```

### Step 2: Configure MongoDB Atlas

1. **Create Database User**:
   - Go to MongoDB Atlas → Database Access
   - Create user with read/write permissions
   - Note username and password

2. **Configure Network Access**:
   - Go to Network Access
   - Add IP Address: `0.0.0.0/0` (or your EC2 IP for security)
   - Click "Add IP Address"

3. **Get Connection String**:
   - Go to Clusters → Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your database password
   - Replace `<dbname>` with your database name
   - Use this as `MONGO_URI` in `.env`

### Step 3: Configure AWS S3

1. **Create S3 Bucket**:
   - Go to S3 → Create bucket
   - Name: `your-bucket-name`
   - Region: Choose your region
   - **Uncheck** "Block all public access" (or configure bucket policy)
   - Create bucket

2. **Configure Bucket Policy** (for public read access):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```

3. **Create IAM User**:
   - Go to IAM → Users → Create user
   - Name: `e-learning-s3-user`
   - Attach policy: `AmazonS3FullAccess` (or create custom policy)
   - Create access key → Note `Access Key ID` and `Secret Access Key`

### Step 4: Configure Email (Gmail Example)

1. **Enable 2-Factor Authentication** on Gmail account
2. **Generate App Password**:
   - Google Account → Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this as `SMTP_PASS` in `.env`

---

## 🐳 Docker Setup on EC2

### Step 1: Connect to EC2 Instance

```bash
# On Windows (PowerShell)
ssh -i "your-key.pem" ubuntu@YOUR_EC2_IP

# On Mac/Linux
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

### Step 2: Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### Step 3: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Log out and log back in for group changes to take effect
exit
```

### Step 4: Reconnect and Verify

```bash
ssh -i "your-key.pem" ubuntu@YOUR_EC2_IP
docker ps  # Should work without sudo
```

---

## 📦 Deployment Steps

### Step 1: Transfer Project to EC2

**Option A: Using Git (Recommended)**

```bash
# On EC2
cd ~
git clone https://github.com/your-username/e-learning-2ndversion.git
cd e-learning-2ndversion
```

**Option B: Using SCP**

```bash
# On your local machine
scp -i "your-key.pem" -r ./e-learning-2ndversion ubuntu@YOUR_EC2_IP:~/
```

**Option C: Using WinSCP (Windows)**

1. Download WinSCP
2. Connect using your EC2 IP and .pem key
3. Upload project folder

### Step 2: Create Environment File on EC2

```bash
# On EC2
cd ~/e-learning-2ndversion
nano .env
```

Paste your environment variables (from Step 1 of Environment Configuration).

**Important**: Update `REACT_APP_API_URL` with your EC2 Elastic IP:
```bash
REACT_APP_API_URL=http://YOUR_EC2_ELASTIC_IP:5000
```

Save and exit (Ctrl+X, Y, Enter)

### Step 3: Build and Start Containers

```bash
# Navigate to project root
cd ~/e-learning-2ndversion

# Build and start containers
docker-compose up -d --build

# View logs
docker-compose logs -f
```

### Step 4: Verify Deployment

```bash
# Check running containers
docker-compose ps

# Check backend health
curl http://localhost:5000/health

# Check frontend
curl http://localhost/
```

### Step 5: Access Application

- **Frontend**: `http://YOUR_EC2_ELASTIC_IP`
- **Backend API**: `http://YOUR_EC2_ELASTIC_IP:5000`
- **Health Check**: `http://YOUR_EC2_ELASTIC_IP:5000/health`

---

## 🔒 Post-Deployment Configuration

### Step 1: Configure Firewall (UFW)

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw enable
```

### Step 2: Set Up Domain (Optional)

1. **Point Domain to EC2 IP**:
   - Go to your domain registrar
   - Add A record: `@` → `YOUR_EC2_ELASTIC_IP`
   - Add A record: `www` → `YOUR_EC2_ELASTIC_IP`

2. **Update Environment Variables**:
   ```bash
   # Edit .env
   REACT_APP_API_URL=http://yourdomain.com
   ```

3. **Rebuild Frontend**:
   ```bash
   docker-compose up -d --build frontend
   ```

### Step 3: Set Up SSL Certificate (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate (if using domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
```

### Step 4: Configure Auto-Start on Reboot

Docker Compose services should auto-start, but verify:

```bash
# Check if containers restart on reboot
docker update --restart=unless-stopped $(docker ps -q)
```

Or add to systemd:

```bash
# Create systemd service
sudo nano /etc/systemd/system/e-learning.service
```

Add:
```ini
[Unit]
Description=E-Learning Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/e-learning-2ndversion
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable e-learning.service
sudo systemctl start e-learning.service
```

---

## 🐛 Troubleshooting

### Issue: Containers won't start

```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs backend
docker-compose logs frontend

# Restart services
docker-compose restart
```

### Issue: Backend can't connect to MongoDB

1. **Check MongoDB Atlas Network Access**:
   - Ensure EC2 IP is whitelisted
   - Or use `0.0.0.0/0` for testing

2. **Verify MONGO_URI**:
   ```bash
   docker-compose exec backend env | grep MONGO_URI
   ```

3. **Test connection**:
   ```bash
   docker-compose exec backend node -e "require('mongoose').connect(process.env.MONGO_URI).then(() => console.log('Connected')).catch(e => console.error(e))"
   ```

### Issue: Frontend can't reach backend

1. **Check REACT_APP_API_URL**:
   ```bash
   docker-compose exec frontend env | grep REACT_APP_API_URL
   ```

2. **Rebuild frontend** with correct API URL:
   ```bash
   docker-compose up -d --build frontend
   ```

### Issue: S3 uploads failing

1. **Verify AWS credentials**:
   ```bash
   docker-compose exec backend env | grep AWS
   ```

2. **Check S3 bucket permissions**:
   - Verify IAM user has S3 access
   - Check bucket policy

### Issue: Email not sending

1. **Check SMTP configuration**:
   ```bash
   docker-compose exec backend env | grep SMTP
   ```

2. **For Gmail**: Ensure App Password is used, not regular password

### Issue: Port already in use

```bash
# Check what's using the port
sudo lsof -i :5000
sudo lsof -i :80

# Stop conflicting services
sudo systemctl stop apache2  # if Apache is running
sudo systemctl stop nginx    # if standalone Nginx is running
```

### View Container Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Access Container Shell

```bash
# Backend
docker-compose exec backend sh

# Frontend
docker-compose exec frontend sh
```

---

## 🔄 Maintenance & Updates

### Update Application

```bash
# Pull latest code
cd ~/e-learning-2ndversion
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Or rebuild specific service
docker-compose up -d --build backend
docker-compose up -d --build frontend
```

### Backup Database

```bash
# Export from MongoDB Atlas (use MongoDB Compass or mongoexport)
# Or set up automated backups in MongoDB Atlas dashboard
```

### Monitor Resources

```bash
# Check container resource usage
docker stats

# Check disk space
df -h

# Check memory
free -h
```

### Stop/Start Services

```bash
# Stop all
docker-compose down

# Start all
docker-compose up -d

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

### Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup (be careful!)
docker system prune -a --volumes
```

---

## 📊 Monitoring & Health Checks

### Health Check Endpoints

- **Backend**: `http://YOUR_EC2_IP:5000/health`
- **Frontend**: `http://YOUR_EC2_IP/health`

### Set Up CloudWatch Monitoring (Optional)

1. Go to CloudWatch → Metrics
2. Monitor EC2 instance metrics:
   - CPU Utilization
   - Network In/Out
   - Disk Read/Write

### Set Up Alarms (Optional)

1. CloudWatch → Alarms → Create alarm
2. Monitor:
   - High CPU usage (>80%)
   - Low disk space (<20%)
   - Instance status check failures

---

## 🔐 Security Best Practices

1. **Use Strong JWT Secret**: Generate with:
   ```bash
   openssl rand -base64 32
   ```

2. **Restrict MongoDB Network Access**: Use EC2 IP instead of `0.0.0.0/0`

3. **Use IAM Roles**: Instead of access keys (advanced)

4. **Enable SSL/HTTPS**: Use Let's Encrypt (free)

5. **Regular Updates**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   docker-compose pull
   docker-compose up -d --build
   ```

6. **Backup Regularly**: Set up automated MongoDB Atlas backups

7. **Monitor Logs**: Check for suspicious activity

---

## 📝 Quick Reference Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild after code changes
docker-compose up -d --build

# Restart service
docker-compose restart backend

# Check status
docker-compose ps

# Access container
docker-compose exec backend sh

# Update environment variables
nano .env
docker-compose up -d --build
```

---

## 🆘 Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Verify environment variables: `docker-compose exec backend env`
3. Test connectivity: `curl http://localhost:5000/health`
4. Check container status: `docker-compose ps`

---

## ✅ Deployment Checklist

- [ ] EC2 instance launched and configured
- [ ] Security group rules configured
- [ ] Elastic IP allocated and associated
- [ ] Docker and Docker Compose installed
- [ ] MongoDB Atlas configured and accessible
- [ ] AWS S3 bucket created and configured
- [ ] IAM user created with S3 permissions
- [ ] SMTP credentials configured
- [ ] Environment file created with all variables
- [ ] Project files transferred to EC2
- [ ] Containers built and started
- [ ] Health checks passing
- [ ] Frontend accessible at http://EC2_IP
- [ ] Backend accessible at http://EC2_IP:5000
- [ ] Domain configured (if applicable)
- [ ] SSL certificate installed (if applicable)
- [ ] Auto-start configured
- [ ] Monitoring set up (optional)

---

**Congratulations! Your e-learning platform should now be deployed and running on AWS EC2! 🎉**

