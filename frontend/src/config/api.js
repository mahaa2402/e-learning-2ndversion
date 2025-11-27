// API Configuration for different environments
const API_CONFIG = {
  development: {
    BASE_URL: 'http://localhost:5000', // Point to local backend
    API_PREFIX: '/api'
  },
  production: {
    BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000', // Local backend
    API_PREFIX: '/api'
  }
};

// Detect environment
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.env.REACT_APP_ENV === 'development' ||
                     window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1';

const config = isDevelopment ? API_CONFIG.development : API_CONFIG.production;

// Debug logging
console.log('🔧 API Configuration:', {
  isDevelopment,
  hostname: window.location.hostname,
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_ENV: process.env.REACT_APP_ENV,
  selectedConfig: config,
  finalBaseURL: config.BASE_URL + config.API_PREFIX
});

// Use the configured URL (will work with Nginx proxy)
const API_BASE_URL = config.BASE_URL + config.API_PREFIX;
console.log('🚀 Using API URL:', API_BASE_URL);

// Export API base URL
export { API_BASE_URL };

// Export individual API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    SEND_OTP: `${API_BASE_URL}/auth/send-otp`,
    VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
    RESEND_OTP: `${API_BASE_URL}/auth/resend-otp`
  },
  COURSES: {
    GET_COURSES: `${API_BASE_URL}/courses/getcourse`,
    GET_COURSE_DETAIL: `${API_BASE_URL}/courses/getcoursedetailpage`,
    GET_COURSE: `${API_BASE_URL}/courses`,
    GET_LESSON: `${API_BASE_URL}/courses/lesson`
  },
  PROGRESS: {
    GET_PROGRESS: `${API_BASE_URL}/progress/get-with-unlocking`,
    UPDATE_PROGRESS: `${API_BASE_URL}/progress/update-progress`,
    SUBMIT_QUIZ: `${API_BASE_URL}/progress/submit-quiz`
  },
  PROFILE: {
    GET_PROFILE: `${API_BASE_URL}/profile`
  },
  CERTIFICATES: {
    GET_CERTIFICATES: `${API_BASE_URL}/certificates/employee-certificates`,
    CHECK_COURSE_COMPLETION: `${API_BASE_URL}/certificate/check-course-completion`,
    GET_ALL: `${API_BASE_URL}/certificates/all`
  },
  EMPLOYEES: {
    LIST: `${API_BASE_URL}/employee/employees`,
    CREATE: `${API_BASE_URL}/employee/employees`,
    DELETE: (employeeId) => `${API_BASE_URL}/employee/employees/${employeeId}`
  },
  TASKS: {
    GET_ASSIGNED_TASKS: `${API_BASE_URL}/assigned-tasks`
    , VALIDATE_ASSIGNED_COURSE: `${API_BASE_URL}/assigned-course/validate`
  },
  QUIZ: {
    CHECK_AVAILABILITY: `${API_BASE_URL}/courses/check-quiz-availability`,
    GET_QUESTIONS: `${API_BASE_URL}/courses/questions`
  },
  ADMIN: {
    DASHBOARD_STATS: `${API_BASE_URL}/admin/simple-dashboard-statistics`, // Using simple endpoint temporarily
    COURSES: `${API_BASE_URL}/admin/courses`, // Use deployed version
    EMPLOYEES: `${API_BASE_URL}/admin/employees`,
    ASSIGNED_TASKS: `${API_BASE_URL}/admin/assigned-tasks`,
    ASSIGNED_COURSE_PROGRESS: `${API_BASE_URL}/admin/all-employees-assigned-course-progress`
  },
  VIDEOS: {
    UPLOAD: `${API_BASE_URL}/videos/upload-video`,
    HEALTH: `${API_BASE_URL}/videos/health`
  },
  UPLOAD: {
    QUIZ_IMAGE: `${API_BASE_URL}/upload/upload-quiz-image`,
    COURSE_IMAGE: `${API_BASE_URL}/upload/upload-course-image`
  }
};

export default API_ENDPOINTS;