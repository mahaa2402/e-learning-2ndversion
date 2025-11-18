# Project Structure & Overview

## 📁 Project Architecture

This is a full-stack e-learning platform with the following structure:

```
e-learning-2ndversion/
├── backend/                 # Node.js/Express API Server
│   ├── controllers/         # Request handlers
│   ├── models/              # MongoDB/Mongoose models
│   ├── routes/              # API route definitions
│   ├── middleware/          # Authentication middleware
│   ├── services/            # Email service
│   ├── uploads/              # Temporary file storage
│   ├── server.js            # Main server file
│   ├── package.json         # Backend dependencies
│   └── Dockerfile           # Backend container definition
│
├── frontend/                # React Application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Page components
│   │   ├── routes/          # React Router configuration
│   │   ├── config/          # API configuration
│   │   └── App.js           # Main React component
│   ├── public/              # Static assets
│   ├── package.json         # Frontend dependencies
│   ├── Dockerfile           # Frontend container definition
│   └── nginx.conf           # Nginx configuration
│
├── docker-compose.yml       # Multi-container orchestration
├── DEPLOYMENT_GUIDE.md      # Comprehensive deployment guide
├── QUICK_START.md           # Quick reference guide
├── env.example.txt          # Environment variables template
└── PROJECT_STRUCTURE.md     # This file
```

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18
- **Framework**: Express 5
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: AWS S3
- **Email**: Nodemailer (SMTP)
- **Video Processing**: FFmpeg (via fluent-ffmpeg)

### Frontend
- **Framework**: React 19
- **Routing**: React Router DOM 7
- **HTTP Client**: Axios
- **Build Tool**: React Scripts 5
- **Web Server**: Nginx (production)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Cloud**: AWS EC2, S3
- **Database**: MongoDB Atlas

## 🔑 Key Features

1. **User Management**
   - Employee registration with OTP verification
   - Admin authentication
   - JWT-based session management

2. **Course Management**
   - Course creation and management
   - Module-based course structure
   - Video lesson support
   - Progress tracking

3. **Quiz System**
   - Quiz creation and assignment
   - Image support for questions
   - Progress tracking

4. **Certificate Generation**
   - Automatic certificate generation on course completion
   - Certificate viewing and download

5. **File Management**
   - Video upload to AWS S3
   - Image upload for courses and quizzes
   - Secure file handling

6. **Admin Dashboard**
   - Employee management
   - Course assignment
   - Progress tracking
   - Statistics and analytics

## 📦 Docker Setup

### Backend Container
- **Base Image**: node:18-alpine
- **Port**: 5000
- **Dependencies**: FFmpeg for video processing
- **Health Check**: `/health` endpoint

### Frontend Container
- **Build Stage**: node:18-alpine (builds React app)
- **Production Stage**: nginx:alpine (serves static files)
- **Port**: 80
- **Features**: 
  - API proxying to backend
  - Static file serving
  - Gzip compression

### Docker Compose
- **Network**: Bridge network for inter-container communication
- **Volumes**: Persistent storage for uploads
- **Health Checks**: Automatic container health monitoring
- **Dependencies**: Frontend waits for backend to be healthy

## 🔐 Environment Variables

Required environment variables (see `env.example.txt`):

### Database
- `MONGO_URI` - MongoDB Atlas connection string

### Security
- `JWT_SECRET` - Secret key for JWT token signing

### AWS S3
- `AWS_ACCESS_KEY_ID` - AWS IAM access key
- `AWS_SECRET_ACCESS_KEY` - AWS IAM secret key
- `AWS_REGION` - AWS region (e.g., us-east-1)
- `AWS_BUCKET_NAME` - S3 bucket name

### Email/SMTP
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password (App Password for Gmail)
- `FROM_EMAIL` - Sender email address

### Application
- `PORT` - Backend server port (default: 5000)
- `REACT_APP_API_URL` - Backend API URL for frontend

## 🚀 Deployment Files Created

1. **backend/Dockerfile** - Backend container definition
2. **frontend/Dockerfile** - Frontend multi-stage build
3. **frontend/nginx.conf** - Nginx configuration for React app
4. **docker-compose.yml** - Orchestration file
5. **backend/.dockerignore** - Backend build exclusions
6. **frontend/.dockerignore** - Frontend build exclusions
7. **DEPLOYMENT_GUIDE.md** - Comprehensive deployment instructions
8. **QUICK_START.md** - Quick reference guide
9. **env.example.txt** - Environment variables template

## 📝 Default Credentials

After first deployment, a default admin is created:
- **Email**: `admin@elearning.com`
- **Password**: `admin123`

**⚠️ IMPORTANT**: Change these credentials immediately after first login!

## 🔄 Development vs Production

### Development
- Backend runs on `localhost:5000`
- Frontend runs on `localhost:3000` (React dev server)
- Hot reload enabled
- Detailed error messages

### Production
- Backend runs in Docker on port 5000
- Frontend served via Nginx on port 80
- Optimized builds
- Environment-specific configurations

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP

### Courses
- `GET /api/courses/getcourse` - Get all courses
- `GET /api/courses/getcoursedetailpage` - Get course details
- `GET /api/courses/lesson` - Get lesson content

### Progress
- `GET /api/progress/get-with-unlocking` - Get user progress
- `POST /api/progress/update-progress` - Update progress
- `POST /api/progress/submit-quiz` - Submit quiz

### Admin
- `GET /api/admin/courses` - Admin course management
- `GET /api/admin/employees` - Employee management
- `GET /api/admin/simple-dashboard-statistics` - Dashboard stats

### Uploads
- `POST /api/videos/upload-video` - Upload video
- `POST /api/upload/upload-quiz-image` - Upload quiz image
- `POST /api/upload/upload-course-image` - Upload course image

### Health
- `GET /health` - Health check endpoint

## 🐛 Common Issues & Solutions

1. **MongoDB Connection Failed**
   - Check `MONGO_URI` format
   - Verify network access in MongoDB Atlas
   - Ensure IP is whitelisted

2. **S3 Upload Fails**
   - Verify AWS credentials
   - Check bucket permissions
   - Ensure bucket policy allows uploads

3. **Email Not Sending**
   - Use App Password for Gmail (not regular password)
   - Check SMTP port (587 for TLS, 465 for SSL)
   - Verify firewall allows SMTP traffic

4. **Frontend Can't Reach Backend**
   - Verify `REACT_APP_API_URL` in `.env`
   - Rebuild frontend after changing API URL
   - Check CORS configuration

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [React Documentation](https://react.dev/)

## 🎯 Next Steps

1. Review `DEPLOYMENT_GUIDE.md` for detailed deployment instructions
2. Set up AWS EC2 instance
3. Configure MongoDB Atlas
4. Set up AWS S3 bucket
5. Configure environment variables
6. Deploy using Docker Compose
7. Test the application
8. Set up domain and SSL (optional)

---

For deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
For quick reference, see [QUICK_START.md](./QUICK_START.md)

