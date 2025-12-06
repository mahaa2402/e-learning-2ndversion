const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/Login');
const { sendSignupOTP, verifyOTP, resendOTP } = require('../controllers/OTPController');
const { requestPasswordReset, verifyPasswordResetOTP, resetPassword } = require('../controllers/ForgotPasswordController');
const { verifySecureToken } = require('../utils/secureLinkGenerator');
const AssignedCourseUserProgress = require('../models/AssignedCourseUserProgress');

// Helper function to extract origin from URL string
function extractOrigin(urlString) {
  if (!urlString) return null;
  try {
    const url = new URL(urlString);
    let origin = url.origin;
    // Remove port 5000 (backend port) - frontend should never use this
    if (origin.includes(':5000')) {
      origin = origin.replace(':5000', '');
    }
    return origin;
  } catch (e) {
    // If URL parsing fails, try regex
    const match = urlString.match(/^(https?:\/\/[^\/]+)/);
    if (match) {
      let origin = match[1];
      // Remove port 5000 (backend port)
      if (origin.includes(':5000')) {
        origin = origin.replace(':5000', '');
      }
      return origin;
    }
    return null;
  }
}

// Login route
router.post('/login', login);

// OTP routes
router.post('/send-otp', sendSignupOTP);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Register route (requires OTP verification)
router.post('/register', register);

// Forgot password routes
console.log('📋 Registering forgot password routes...');
router.post('/forgot-password', (req, res, next) => {
  console.log('🔐 POST /api/auth/forgot-password - Route hit');
  requestPasswordReset(req, res, next);
});
router.post('/forgot-password/verify', (req, res, next) => {
  console.log('🔐 POST /api/auth/forgot-password/verify - Route hit');
  verifyPasswordResetOTP(req, res, next);
});
router.post('/forgot-password/reset', (req, res, next) => {
  console.log('🔐 POST /api/auth/forgot-password/reset - Route hit');
  resetPassword(req, res, next);
});
console.log('✅ Forgot password routes registered');

// Validate dashboard link and redirect
router.get('/validate-dashboard-link', async (req, res) => {
  try {
    const { token, email } = req.query;
    
    console.log('🔍 Validating dashboard link...');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Token present: ${!!token}`);
    
    if (!token || !email) {
      console.log('❌ Missing token or email parameter');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
            .error-box { background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #dc3545; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="error-box">
            <h1>❌ Invalid Link</h1>
            <p>This link is missing required parameters. Please contact your administrator.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Verify the token
    const tokenData = verifySecureToken(token);
    
    if (!tokenData) {
      // Token is invalid or expired - return blank page to prevent any visible response
      console.log('❌ Dashboard link validation failed: Token is invalid or expired');
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title></title>
          <style>
            body { margin: 0; padding: 0; background-color: white; }
          </style>
          <script>
            // Try to close the window/tab if opened in a new window
            if (window.opener) {
              window.close();
            } else {
              // If not opened by script, just show blank page
              document.body.style.display = 'none';
            }
          </script>
        </head>
        <body></body>
        </html>
      `);
    }
    
    // Additional explicit expiration check (double-check)
    if (tokenData.deadline && Date.now() > tokenData.deadline) {
      // Deadline has passed - return blank page to prevent any visible response
      console.log('❌ Dashboard link validation failed: Deadline has passed');
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title></title>
          <style>
            body { margin: 0; padding: 0; background-color: white; }
          </style>
          <script>
            // Try to close the window/tab if opened in a new window
            if (window.opener) {
              window.close();
            } else {
              // If not opened by script, just show blank page
              document.body.style.display = 'none';
            }
          </script>
        </head>
        <body></body>
        </html>
      `);
    }
    
    // Verify email matches
    if (tokenData.email !== email) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Denied</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
            .error-box { background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #dc3545; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="error-box">
            <h1>🚫 Access Denied</h1>
            <p>This link is not valid for your email address. Please contact your administrator.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Token is valid and not expired - do an additional DB check.
    // Verify that there exists an assigned course for this user with a matching deadline
    // This ensures link expiration enforcement is tied to the server-side assignment record
    try {
      const assignedProgress = await AssignedCourseUserProgress.findOne({ employeeEmail: email });
      if (!assignedProgress) {
        console.log('⚠️ No assigned progress record found for this employee; denying dashboard access');
        return res.status(403).send(`<h1>Access Denied</h1><p>No active assignment found for this link.</p>`);
      }

      let matchedAssignment = null;
      if (tokenData.assignmentId) {
        // Find by assignment _id if provided in token
        matchedAssignment = assignedProgress.courseAssignments.find(a => {
          try {
            return a._id && a._id.toString() === tokenData.assignmentId.toString();
          } catch (err) {
            return false;
          }
        });
        if (!matchedAssignment) {
          console.log('⚠️ Assignment ID from token not found in DB, falling back to deadline/course match');
        } else {
          console.log('🔍 Matched assignment in DB by assignmentId:', matchedAssignment._id.toString());
        }
      }

      // If assignmentId not present in token or not matched, fallback to existing deadline/course matching
      if (!matchedAssignment) {
        matchedAssignment = assignedProgress.courseAssignments.find(a => {
          const assignmentDeadline = a.deadline ? new Date(a.deadline).getTime() : null;
          const courseMatches = tokenData.course && tokenData.course !== 'dashboard' ? (a.courseName === tokenData.course) : true;
          return courseMatches && assignmentDeadline && tokenData.deadline && Math.abs(assignmentDeadline - tokenData.deadline) < 2000; // tolerance 2s
        });
      }

      if (!matchedAssignment) {
        console.log('⚠️ Assignment not found matching the token deadline; denying access');
        console.log('🔍 Token deadline value:', tokenData.deadline, 'Token deadline ISO:', new Date(tokenData.deadline).toLocaleString());
        return res.status(403).send(`<h1>Access Denied</h1><p>The assignment associated with this link was not found.</p>`);
      }

      // Validate assignment deadline explicitly using DB-sourced value
      if (matchedAssignment.deadline && Date.now() > new Date(matchedAssignment.deadline).getTime()) {
        console.log('❌ Matched assignment deadline passed according to DB; denying access');
        console.log('🔍 Matched assignment deadline (DB):', matchedAssignment.deadline, 'ISO:', new Date(matchedAssignment.deadline).toLocaleString());
        console.log('🔍 Token deadline value:', tokenData.deadline, 'Token deadline ISO:', new Date(tokenData.deadline).toLocaleString());
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Link Expired</title>
          </head>
          <body>
            <h1>Link Expired</h1>
            <p>The deadline for this course has passed and the Start Course link is no longer valid.</p>
          </body>
          </html>
        `);
      }
      if (matchedAssignment.status && matchedAssignment.status === 'completed') {
        console.log('⚠️ Matched assignment already completed; denying dashboard link');
        return res.status(403).send(`<h1>Access Denied</h1><p>This assignment has already been completed. If you need to reassign, contact your admin.</p>`);
      }
      if (matchedAssignment.status && matchedAssignment.status === 'overdue') {
        console.log('⚠️ Matched assignment status is overdue; denying dashboard link');
        return res.status(403).send(`<h1>Access Denied</h1><p>The assignment is overdue and link access is disabled. Contact your admin for a new assignment.</p>`);
      }
    } catch (dbCheckError) {
      console.error('❌ Error during DB assignment validation for dashboard link:', dbCheckError);
      return res.status(500).send(`<h1>Error</h1><p>An error occurred while validating the link.</p>`);
    }
    // Token is valid and not expired, redirect to login page first
    // This ensures user is authenticated before accessing dashboard
    console.log(`✅ Dashboard link is valid and not expired`);
    console.log(`📅 Deadline: ${new Date(tokenData.deadline).toLocaleString()}`);
    console.log(`📅 Current time: ${new Date().toLocaleString()}`);
    
    // Get frontend base URL - ensure it's just the origin without any path
    let frontendBase = null;
    
    // Try to extract origin from environment variables (highest priority)
    if (process.env.FRONTEND_BASE_URL) {
      frontendBase = extractOrigin(process.env.FRONTEND_BASE_URL);
      console.log(`🔗 Using FRONTEND_BASE_URL from env: ${frontendBase}`);
    }
    
    if (!frontendBase && process.env.PLATFORM_LOGIN_URL) {
      frontendBase = extractOrigin(process.env.PLATFORM_LOGIN_URL);
      console.log(`🔗 Using PLATFORM_LOGIN_URL from env: ${frontendBase}`);
    }
    
    // Production hardcoded fallback for 16.16.205.98
    if (!frontendBase) {
      const requestHost = req.get('x-forwarded-host') || req.get('host') || '';
      if (requestHost.includes('16.16.205.98') || requestHost.includes('16.16.205.98:5000')) {
        frontendBase = 'http://16.16.205.98';
        console.log(`🔗 Using hardcoded production frontend URL: ${frontendBase}`);
      }
    }
    
    // Log what we have so far
    console.log(`🔍 Frontend base after env check: ${frontendBase || 'null'}`);
    
    // Fallback: construct from request (avoid localhost in production)
    if (!frontendBase) {
      const protocol = req.protocol || 'http';
      // Check X-Forwarded-Host header first (for reverse proxies)
      let host = req.get('x-forwarded-host') || req.get('host') || null;
      
      console.log(`🔍 Request host: ${host}`);
      console.log(`🔍 X-Forwarded-Host: ${req.get('x-forwarded-host')}`);
      
      if (host) {
        // ALWAYS remove port 5000 (backend port) - frontend never uses this
        if (host.includes(':5000')) {
          host = host.replace(':5000', '');
          console.log(`🔧 Removed port 5000, new host: ${host}`);
        }
        
        // Determine frontend URL based on host
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
          // For localhost, use port 3000 (development)
          frontendBase = `${protocol}://localhost:3000`;
        } else if (host.includes(':3000')) {
          // Keep port 3000 if present (development)
          frontendBase = `${protocol}://${host}`;
        } else {
          // For production, use the host without any port (defaults to port 80/443)
          frontendBase = `${protocol}://${host}`;
        }
        
        console.log(`🔧 Constructed frontend base from request: ${frontendBase}`);
      }
    }
    
    // Final fallback - only use localhost if no environment variables are set
    if (!frontendBase) {
      console.warn('⚠️ No frontend URL determined, using localhost fallback');
      frontendBase = 'http://localhost:3000';
    }
    
    // Ensure frontendBase is clean (no paths, just origin)
    frontendBase = extractOrigin(frontendBase) || frontendBase;
    
    // Remove any trailing slashes and ensure no paths
    frontendBase = frontendBase.replace(/\/+$/, '').replace(/\/.*$/, '');
    
    // CRITICAL: Final safety check - ensure we're NEVER using backend port (5000) for frontend
    // Frontend should be on port 80/443 (default) or 3000 (dev), never 5000
    if (frontendBase && frontendBase.includes(':5000')) {
      console.warn('⚠️ Frontend URL contains port 5000 (backend port), removing it');
      frontendBase = frontendBase.replace(':5000', '');
    }
    
    // Additional safety: if frontendBase is still null or invalid, use a safe default
    if (!frontendBase || frontendBase.includes(':5000')) {
      // Extract host from request and remove port 5000
      const protocol = req.protocol || 'http';
      let safeHost = req.get('x-forwarded-host') || req.get('host') || '16.16.205.98';
      
      // Always remove port 5000 (backend port)
      if (safeHost.includes(':5000')) {
        safeHost = safeHost.replace(':5000', '');
      }
      
      // For production IP addresses, use without port (defaults to port 80)
      // For localhost, use port 3000
      if (safeHost.includes('localhost') || safeHost.includes('127.0.0.1')) {
        frontendBase = `${protocol}://localhost:3000`;
      } else {
        // Production: use host without port (defaults to port 80/443)
        frontendBase = `${protocol}://${safeHost}`;
      }
      
      console.warn(`⚠️ Using fallback frontend URL: ${frontendBase}`);
    }
    
    // FINAL CHECK: One more time, ensure no port 5000
    if (frontendBase && frontendBase.includes(':5000')) {
      console.error('❌ CRITICAL: Frontend URL still contains port 5000 after all checks!');
      frontendBase = frontendBase.replace(':5000', '');
      console.warn(`🔧 Force-removed port 5000, final URL: ${frontendBase}`);
    }
    
    // FINAL VALIDATION: Ensure frontendBase is absolutely correct
    // Must NOT contain port 5000, must be a valid frontend URL
    if (!frontendBase || frontendBase.includes(':5000')) {
      console.error('❌ CRITICAL ERROR: Frontend URL is invalid or contains port 5000!');
      console.error(`❌ Invalid frontendBase: ${frontendBase}`);
      // Force use production URL
      frontendBase = 'http://16.16.205.98';
      console.warn(`🔧 Forced to production URL: ${frontendBase}`);
    }
    
    // Redirect directly to dashboard (user should already be authenticated if coming from login page)
    // If user is not authenticated, they'll be redirected to login by the frontend
    const dashboardUrl = `${frontendBase}/userdashboard?email=${encodeURIComponent(email)}`;
    
    // Final validation of the complete URL
    if (dashboardUrl.includes(':5000')) {
      console.error('❌ CRITICAL ERROR: Dashboard URL contains port 5000!');
      console.error(`❌ Invalid dashboardUrl: ${dashboardUrl}`);
      // Force correct URL
      const correctedUrl = dashboardUrl.replace(':5000', '');
      console.warn(`🔧 Corrected URL: ${correctedUrl}`);
      return res.redirect(correctedUrl);
    }
    
    console.log(`✅ Valid dashboard link, redirecting ${email} to dashboard: ${dashboardUrl}`);
    console.log(`🔗 Final frontend base URL: ${frontendBase}`);
    console.log(`🔗 Request host: ${req.get('host')}`);
    console.log(`🔗 Request protocol: ${req.protocol}`);
    console.log(`🔗 X-Forwarded-Host: ${req.get('x-forwarded-host')}`);
    res.redirect(dashboardUrl);
    
  } catch (error) {
    console.error('❌ Error validating dashboard link:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
          .error-box { background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #dc3545; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="error-box">
          <h1>❌ Error</h1>
          <p>An error occurred while processing your request. Please try again or contact your administrator.</p>
        </div>
      </body>
      </html>
    `);
  }
});

module.exports = router; 
