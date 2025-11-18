# Quick Start Guide - AWS EC2 Deployment

This is a condensed version of the deployment guide. For detailed instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## Prerequisites Checklist

- [ ] AWS Account with EC2 access
- [ ] MongoDB Atlas cluster and connection string
- [ ] AWS S3 bucket created
- [ ] IAM user with S3 permissions
- [ ] SMTP email credentials (Gmail App Password)

## 1. Launch EC2 Instance

1. **EC2 Dashboard** → Launch Instance
2. **AMI**: Ubuntu 22.04 LTS
3. **Instance Type**: t2.micro (free tier) or t3.small (recommended)
4. **Key Pair**: Create/download .pem file
5. **Security Group**: 
   - SSH (22) from your IP
   - HTTP (80) from anywhere (0.0.0.0/0)
   - Custom TCP (5000) from anywhere
6. **Storage**: 20 GB
7. **Launch** → Allocate Elastic IP → Associate with instance

## 2. Connect to EC2

```bash
ssh -i "your-key.pem" ubuntu@YOUR_EC2_IP
```

## 3. Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
exit  # Log out and back in
```

## 4. Transfer Project

```bash
# On EC2
cd ~
git clone YOUR_REPO_URL
# OR use SCP/WinSCP to upload project folder
```

## 5. Configure Environment

```bash
cd ~/e-learning-2ndversion
nano .env
```

Paste and configure:

```bash
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
JWT_SECRET=generate-with-openssl-rand-base64-32
PORT=5000
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
REACT_APP_API_URL=http://YOUR_EC2_IP:5000
```

## 6. Deploy

```bash
docker-compose up -d --build
docker-compose logs -f  # Watch logs
```

## 7. Verify

- Frontend: `http://YOUR_EC2_IP`
- Backend: `http://YOUR_EC2_IP:5000/health`
- Default Admin: `admin@elearning.com` / `admin123`

## Common Commands

```bash
# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Rebuild after changes
docker-compose up -d --build

# Stop
docker-compose down

# Check status
docker-compose ps
```

## Troubleshooting

**Backend won't start**: Check MongoDB connection string and network access
**Frontend can't reach backend**: Verify REACT_APP_API_URL in .env
**S3 uploads fail**: Check AWS credentials and bucket permissions
**Email not sending**: Verify SMTP credentials (use App Password for Gmail)

For detailed troubleshooting, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

