const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/Login');
const { sendSignupOTP, verifyOTP, resendOTP } = require('../controllers/OTPController');
const { verifySecureToken } = require('../utils/secureLinkGenerator');

// Helper function to extract origin from URL string
function extractOrigin(urlString) {
  if (!urlString) return null;
  try {
    const url = new URL(urlString);
    return url.origin;
  } catch (e) {
    // If URL parsing fails, try regex
    const match = urlString.match(/^(https?:\/\/[^\/]+)/);
    return match ? match[1] : null;
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
      // Token is invalid or expired
      console.log('❌ Dashboard link validation failed: Token is invalid or expired');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Expired</title>
          <meta http-equiv="refresh" content="0;url=#">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
            .error-box { background: white; padding: 40px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #dc3545; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; margin: 10px 0; }
            .warning-icon { font-size: 48px; margin-bottom: 20px; }
            .deadline-info { background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0; }
            .deadline-info strong { color: #856404; }
          </style>
        </head>
        <body>
          <div class="error-box">
            <div class="warning-icon">⏰</div>
            <h1>Link Expired</h1>
            <div class="deadline-info">
              <p><strong>The deadline for this course has passed.</strong></p>
              <p>This "Start Course" link is no longer valid and cannot be used to access the course.</p>
            </div>
            <p>If you need to access this course, please contact your administrator for a new assignment.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #999;">This link has been permanently disabled and will not work even if clicked again.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Additional explicit expiration check (double-check)
    if (tokenData.deadline && Date.now() > tokenData.deadline) {
      console.log('❌ Dashboard link validation failed: Deadline has passed');
      const deadlineDate = new Date(tokenData.deadline).toLocaleString();
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Expired</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
            .error-box { background: white; padding: 40px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #dc3545; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; margin: 10px 0; }
            .warning-icon { font-size: 48px; margin-bottom: 20px; }
            .deadline-info { background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0; }
            .deadline-info strong { color: #856404; }
          </style>
        </head>
        <body>
          <div class="error-box">
            <div class="warning-icon">⏰</div>
            <h1>Link Expired</h1>
            <div class="deadline-info">
              <p><strong>The deadline for this course was: ${deadlineDate}</strong></p>
              <p>This "Start Course" link expired after the deadline and is no longer valid.</p>
            </div>
            <p>If you need to access this course, please contact your administrator for a new assignment.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #999;">This link has been permanently disabled and will not work even if clicked again.</p>
          </div>
        </body>
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
    
    // Token is valid and not expired, redirect to user dashboard
    console.log(`✅ Dashboard link is valid and not expired`);
    console.log(`📅 Deadline: ${new Date(tokenData.deadline).toLocaleString()}`);
    console.log(`📅 Current time: ${new Date().toLocaleString()}`);
    
    // Get frontend base URL - ensure it's just the origin without any path
    let frontendBase = null;
    
    // Try to extract origin from environment variables
    if (process.env.FRONTEND_BASE_URL) {
      frontendBase = extractOrigin(process.env.FRONTEND_BASE_URL);
    }
    
    if (!frontendBase && process.env.PLATFORM_LOGIN_URL) {
      frontendBase = extractOrigin(process.env.PLATFORM_LOGIN_URL);
    }
    
    // Fallback: construct from request
    if (!frontendBase) {
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:3000';
      // If host includes port 5000, change to 3000 for frontend
      if (host.includes(':5000')) {
        frontendBase = `${protocol}://${host.replace(':5000', ':3000')}`;
      } else {
        frontendBase = `${protocol}://${host}`;
      }
    }
    
    // Final fallback
    if (!frontendBase) {
      frontendBase = 'http://localhost:3000';
    }
    
    // Ensure frontendBase is clean (no paths, just origin)
    frontendBase = extractOrigin(frontendBase) || frontendBase;
    
    // Construct the dashboard URL - ensure it's just /userdashboard (no /login prefix)
    const dashboardUrl = `${frontendBase}/userdashboard?email=${encodeURIComponent(email)}`;
    
    console.log(`✅ Valid dashboard link, redirecting ${email} to dashboard: ${dashboardUrl}`);
    console.log(`🔗 Frontend base URL: ${frontendBase}`);
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
