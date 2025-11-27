const crypto = require('crypto');

/**
 * Generate a secure token for course access link
 * Token includes: employeeEmail, courseName, deadline timestamp
 */
function generateSecureToken(employeeEmail, courseName, deadline, assignmentId = null) {
  const data = {
    email: employeeEmail,
    course: courseName,
    deadline: new Date(deadline).getTime(),
    timestamp: Date.now(),
    assignmentId: assignmentId || null
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
    console.log('🔍 Verifying token...');
    console.log('📋 Token length:', token ? token.length : 0);
    console.log('📋 Token preview:', token ? token.substring(0, 100) + '...' : 'Missing');
    
    const [payload, signature] = token.split('.');
    if (!payload || !signature) {
      console.log('❌ Token format invalid - missing payload or signature');
      console.log('📋 Payload exists:', !!payload);
      console.log('📋 Signature exists:', !!signature);
      return null;
    }
    
    const secret = process.env.JWT_SECRET || 'default-secret-key';
    console.log('🔑 Using JWT_SECRET:', secret ? 'Set (' + secret.length + ' chars)' : 'Using default');
    
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    console.log('📋 Expected signature:', expectedSignature.substring(0, 20) + '...');
    console.log('📋 Received signature:', signature.substring(0, 20) + '...');
    
    if (signature !== expectedSignature) {
      console.log('❌ Invalid token signature - signatures do not match');
      console.log('⚠️ This could mean:');
      console.log('   1. Token was generated with different JWT_SECRET');
      console.log('   2. Token was tampered with');
      console.log('   3. JWT_SECRET changed between token generation and verification');
      return null;
    }
    
    console.log('✅ Signature valid, decoding payload...');
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    console.log('📋 Decoded data:', {
      email: data.email,
      course: data.course,
      deadline: new Date(data.deadline).toLocaleString(),
      timestamp: new Date(data.timestamp).toLocaleString()
    });
    
    // Check if token has expired (past deadline)
    const now = Date.now();
    console.log('📅 Current time:', new Date(now).toLocaleString());
    console.log('📅 Deadline time:', new Date(data.deadline).toLocaleString());
    console.log('📅 Time remaining:', Math.max(0, data.deadline - now), 'ms');
    
    if (data.deadline && now > data.deadline) {
      console.log('❌ Token expired - deadline passed');
      console.log('📅 Expired by:', (now - data.deadline) / (1000 * 60 * 60), 'hours');
      return null;
    }
    
    console.log('✅ Token is valid and not expired');
    return data;
  } catch (error) {
    console.error('❌ Error verifying token:', error.message);
    console.error('❌ Error stack:', error.stack);
    return null;
  }
}

/**
 * Generate a secure course access link
 */
function generateCourseLink(employeeEmail, courseName, deadline, baseUrl) {
  const token = generateSecureToken(employeeEmail, courseName, deadline, null);
  
  // Determine frontend URL
  let frontendUrl;
  
  // Priority 1: Use baseUrl from request (most reliable)
  if (baseUrl) {
    // baseUrl is like http://35.154.8.180:5000 (backend URL)
    // Convert to frontend URL (same domain, port 80 or no port)
    if (baseUrl.includes(':5000')) {
      frontendUrl = baseUrl.replace(':5000', '');
    } else if (baseUrl.includes(':3000')) {
      frontendUrl = baseUrl; // Already frontend URL
    } else {
      // No port specified, assume same domain
      frontendUrl = baseUrl;
    }
    console.log('🔗 Using baseUrl for frontend:', frontendUrl);
  }
  // Priority 2: Use REACT_APP_API_URL from environment
  else if (process.env.REACT_APP_API_URL) {
    const apiUrl = process.env.REACT_APP_API_URL;
    if (apiUrl.includes(':5000')) {
      frontendUrl = apiUrl.replace(':5000', '').replace('/api', '');
    } else {
      frontendUrl = apiUrl.replace('/api', '');
    }
    console.log('🔗 Using REACT_APP_API_URL for frontend:', frontendUrl);
  }
  // Priority 3: Fallback to localhost (development only)
  else {
    frontendUrl = 'http://localhost:3000';
    console.log('⚠️ No baseUrl or REACT_APP_API_URL, using localhost fallback');
  }
  
  // Point to frontend route that will handle token validation
  const accessLink = `${frontendUrl}/course-access?token=${encodeURIComponent(token)}`;
  console.log('🔗 Generated course access link:', accessLink.substring(0, 100) + '...');
  return accessLink;
}

/**
 * Generate a secure dashboard link with expiration
 */
function generateDashboardLink(employeeEmail, deadline, baseUrl, courseName = 'dashboard', assignmentId = null) {
  // Ensure deadline is a Date object
  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
  console.log(`🔗 Generating dashboard link for ${employeeEmail}`);
  console.log(`📅 Deadline: ${deadlineDate.toISOString()} (${deadlineDate.toLocaleString()})`);
  
  const token = generateSecureToken(employeeEmail, courseName || 'dashboard', deadlineDate, assignmentId);
  if (assignmentId) {
    console.log('🔗 Generating dashboard link with assignmentId:', assignmentId);
  } else {
    console.log('🔗 Generating dashboard link without assignmentId');
  }
  
  // Determine frontend URL
  let frontendUrl;
  
  // Priority 1: Use baseUrl from request (most reliable)
  if (baseUrl) {
    if (baseUrl.includes(':5000')) {
      frontendUrl = baseUrl.replace(':5000', '');
    } else if (baseUrl.includes(':3000')) {
      frontendUrl = baseUrl;
    } else {
      frontendUrl = baseUrl;
    }
    console.log('🔗 Using baseUrl for dashboard link:', frontendUrl);
  }
  // Priority 2: Use REACT_APP_API_URL from environment
  else if (process.env.REACT_APP_API_URL) {
    const apiUrl = process.env.REACT_APP_API_URL;
    if (apiUrl.includes(':5000')) {
      frontendUrl = apiUrl.replace(':5000', '').replace('/api', '');
    } else {
      frontendUrl = apiUrl.replace('/api', '');
    }
    console.log('🔗 Using REACT_APP_API_URL for dashboard link:', frontendUrl);
  }
  // Priority 3: Fallback to localhost (development only)
  else {
    frontendUrl = 'http://localhost:3000';
    console.log('⚠️ No baseUrl or REACT_APP_API_URL, using localhost fallback for dashboard');
  }
  
  // Point to backend route that will validate and redirect
  const backendBase = baseUrl || process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const dashboardLink = `${backendBase}/api/auth/validate-dashboard-link?token=${encodeURIComponent(token)}&email=${encodeURIComponent(employeeEmail)}`;
  console.log('🔗 Generated secure dashboard link with expiration');
  return dashboardLink;
}

module.exports = {
  generateSecureToken,
  verifySecureToken,
  generateCourseLink,
  generateDashboardLink
};

