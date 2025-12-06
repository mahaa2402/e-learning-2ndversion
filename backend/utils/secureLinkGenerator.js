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
    console.log('📅 [DEBUG] Current time (ms):', now, '|', new Date(now).toISOString());
    console.log('📅 [DEBUG] Deadline (ms):', data.deadline, '|', new Date(data.deadline).toISOString());
    console.log('📅 [DEBUG] Time remaining (ms):', data.deadline - now);
    if (data.deadline && now > data.deadline) {
      console.log('❌ Token expired - deadline passed');
      console.log('📅 [DEBUG] Expired by (ms):', now - data.deadline);
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
  
  // Helper function to extract clean origin (protocol + host, no path)
  const extractOrigin = (url) => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch (error) {
      // If URL parsing fails, try to extract origin manually
      const match = url.match(/^(https?:\/\/[^\/]+)/);
      return match ? match[1] : url.replace(/\/.*$/, '');
    }
  };

  // Determine frontend URL - always extract just the origin (no paths)
  let frontendUrl;
  
  // Priority 1: Use FRONTEND_BASE_URL from environment (most reliable for production)
  if (process.env.FRONTEND_BASE_URL) {
    frontendUrl = extractOrigin(process.env.FRONTEND_BASE_URL);
    console.log('🔗 Using FRONTEND_BASE_URL for dashboard link:', frontendUrl);
  }
  // Priority 2: Use PLATFORM_LOGIN_URL from environment (extract origin, remove /login if present)
  else if (process.env.PLATFORM_LOGIN_URL) {
    frontendUrl = extractOrigin(process.env.PLATFORM_LOGIN_URL);
    console.log('🔗 Using PLATFORM_LOGIN_URL for dashboard link:', frontendUrl);
  }
  // Priority 3: Use baseUrl from request (if it's not localhost)
  else if (baseUrl && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
    frontendUrl = extractOrigin(baseUrl);
    if (frontendUrl.includes(':5000')) {
      frontendUrl = frontendUrl.replace(':5000', '');
    }
    console.log('🔗 Using baseUrl for dashboard link:', frontendUrl);
  }
  // Priority 4: Use REACT_APP_API_URL from environment
  else if (process.env.REACT_APP_API_URL) {
    const apiUrl = process.env.REACT_APP_API_URL;
    frontendUrl = extractOrigin(apiUrl);
    if (frontendUrl.includes(':5000')) {
      frontendUrl = frontendUrl.replace(':5000', '');
    }
    frontendUrl = frontendUrl.replace('/api', '');
    console.log('🔗 Using REACT_APP_API_URL for dashboard link:', frontendUrl);
  }
  // Priority 5: Fallback to localhost (development only)
  else {
    frontendUrl = 'http://localhost:3000';
    console.log('⚠️ No environment variables or valid baseUrl, using localhost fallback for dashboard');
  }
  
  // Ensure frontendUrl is clean (no trailing slashes, no paths)
  frontendUrl = frontendUrl.replace(/\/+$/, ''); // Remove trailing slashes
  
  // Point to login page first, then redirect to dashboard after login
  // This ensures user is authenticated before accessing dashboard
  const dashboardLink = `${frontendUrl}/login?redirectToken=${encodeURIComponent(token)}&email=${encodeURIComponent(employeeEmail)}&redirectTo=dashboard`;
  console.log('🔗 Generated secure dashboard link - will redirect to login first:', dashboardLink);
  return dashboardLink;
}

module.exports = {
  generateSecureToken,
  verifySecureToken,
  generateCourseLink,
  generateDashboardLink
};

