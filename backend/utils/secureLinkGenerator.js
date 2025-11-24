const crypto = require('crypto');

/**
 * Generate a secure token for course access link
 * Token includes: employeeEmail, courseName, deadline timestamp
 */
function generateSecureToken(employeeEmail, courseName, deadline) {
  const data = {
    email: employeeEmail,
    course: courseName,
    deadline: new Date(deadline).getTime(),
    timestamp: Date.now()
  };
  
  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const secret = process.env.JWT_SECRET || 'default-secret-key';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  
  return `${payload}.${signature}`;
}

/**
 * Verify and decode a secure token
 * Returns decoded data if valid, null if invalid or expired
 */
function verifySecureToken(token) {
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) {
      return null;
    }
    
    const secret = process.env.JWT_SECRET || 'default-secret-key';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) {
      console.log('❌ Invalid token signature');
      return null;
    }
    
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    
    // Check if token has expired (past deadline)
    const now = Date.now();
    if (data.deadline && now > data.deadline) {
      console.log('❌ Token expired - deadline passed');
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error verifying token:', error.message);
    return null;
  }
}

/**
 * Generate a secure course access link
 */
function generateCourseLink(employeeEmail, courseName, deadline, baseUrl) {
  const token = generateSecureToken(employeeEmail, courseName, deadline);
  
  // Determine frontend URL
  let frontendUrl;
  if (process.env.REACT_APP_API_URL) {
    // In production, REACT_APP_API_URL might be like http://ec2-ip:5000
    // We need to extract the base URL and change port to frontend port (80 or 3000)
    const apiUrl = process.env.REACT_APP_API_URL;
    if (apiUrl.includes(':5000')) {
      frontendUrl = apiUrl.replace(':5000', '').replace('/api', '');
    } else {
      // Assume frontend is on same domain but different port or path
      frontendUrl = apiUrl.replace('/api', '');
    }
  } else {
    // Development: use localhost:3000
    frontendUrl = 'http://localhost:3000';
  }
  
  // Point to frontend route that will handle token validation
  return `${frontendUrl}/course-access?token=${encodeURIComponent(token)}`;
}

module.exports = {
  generateSecureToken,
  verifySecureToken,
  generateCourseLink
};

