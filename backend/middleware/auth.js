// middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Auth check - Header present:', !!authHeader);
  console.log('🔐 Auth check - Token extracted:', !!token);

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ 
      error: 'Access token required',
      details: 'Please provide a valid authentication token'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      console.log('❌ Token verification failed:', err.message);
      return res.status(403).json({ 
        error: 'Invalid token',
        details: err.message === 'jwt expired' ? 'Token has expired, please log in again' : 'Token is invalid'
      });
    }
    
    console.log('✅ Token verified for user:', user.email, 'Role:', user.role);
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
