const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { 
  checkCourseCompletionAndGenerateCertificate,
  getCourseCompletionStatus,
  getEmployeeCertificatesAPI,
  Certificate
} = require('../controllers/CertificateController');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// 🔥 MAIN: Check course completion and generate certificate
router.post('/check-course-completion', authenticateToken, checkCourseCompletionAndGenerateCertificate);

// Get course completion status
router.get('/course-status/:courseName', authenticateToken, getCourseCompletionStatus);

// Get all certificates for the authenticated user
router.get('/employee-certificates', authenticateToken, getEmployeeCertificatesAPI);

// Test endpoint to get all certificates (for debugging)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const certificates = await Certificate.find({}).sort({ createdAt: -1 });
    console.log(`🔍 Found ${certificates.length} total certificates`);
    res.status(200).json({
      success: true,
      certificates: certificates,
      count: certificates.length
    });
  } catch (error) {
    console.error('❌ Error fetching all certificates:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal Server Error',
      error: error.message 
    });
  }
});

// Get certificates by employee ID (for admin view)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Fetching certificates for employee ID: ${id}`);

    // First, let's see what certificates exist in the database for debugging
    const allCertificates = await Certificate.find({});
    console.log(`📊 Total certificates in database: ${allCertificates.length}`);
    if (allCertificates.length > 0) {
      console.log(`📋 Sample certificate employee IDs:`, allCertificates.slice(0, 5).map(cert => ({
        id: cert._id,
        employeeId: cert.employeeId,
        employeeEmail: cert.employeeEmail,
        courseTitle: cert.courseTitle
      })));
    }

    // Try multiple search strategies
    let certificates = [];
    let searchMethod = '';

    // Strategy 1: Try to find certificates by employeeId (exact match)
    certificates = await Certificate.find({ employeeId: id });
    if (certificates && certificates.length > 0) {
      searchMethod = 'employeeId';
      console.log(`✅ Found ${certificates.length} certificates by employeeId`);
    }
    
    // Strategy 2: If not found by employeeId, try by employeeEmail
    if (!certificates || certificates.length === 0) {
      certificates = await Certificate.find({ employeeEmail: id });
      if (certificates && certificates.length > 0) {
        searchMethod = 'employeeEmail';
        console.log(`✅ Found ${certificates.length} certificates by employeeEmail`);
      }
    }
    
    // Strategy 3: If still not found, try by _id (MongoDB ObjectId)
    if (!certificates || certificates.length === 0) {
      try {
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(id)) {
          certificates = await Certificate.find({ _id: id });
          if (certificates && certificates.length > 0) {
            searchMethod = '_id';
            console.log(`✅ Found ${certificates.length} certificates by _id`);
          }
        }
      } catch (err) {
        console.log('Invalid ObjectId format');
      }
    }

    // Strategy 4: Try partial matches for employeeId (in case of truncation)
    if (!certificates || certificates.length === 0) {
      const partialMatch = await Certificate.find({ 
        employeeId: { $regex: id, $options: 'i' } 
      });
      if (partialMatch && partialMatch.length > 0) {
        certificates = partialMatch;
        searchMethod = 'partial employeeId match';
        console.log(`✅ Found ${certificates.length} certificates by partial employeeId match`);
      }
    }

    // Strategy 5: Try to find by employee name or partial email
    if (!certificates || certificates.length === 0) {
      const nameOrEmailMatch = await Certificate.find({
        $or: [
          { employeeName: { $regex: id, $options: 'i' } },
          { employeeEmail: { $regex: id, $options: 'i' } }
        ]
      });
      if (nameOrEmailMatch && nameOrEmailMatch.length > 0) {
        certificates = nameOrEmailMatch;
        searchMethod = 'name or email partial match';
        console.log(`✅ Found ${certificates.length} certificates by name/email partial match`);
      }
    }

    // Strategy 6: Try to find by employeeId field that contains the provided ID as a substring
    if (!certificates || certificates.length === 0) {
      const employeeIdSubstringMatch = await Certificate.find({
        employeeId: { $regex: id, $options: 'i' }
      });
      if (employeeIdSubstringMatch && employeeIdSubstringMatch.length > 0) {
        certificates = employeeIdSubstringMatch;
        searchMethod = 'employeeId substring match';
        console.log(`✅ Found ${certificates.length} certificates by employeeId substring match`);
      }
    }

    if (!certificates || certificates.length === 0) {
      console.log(`❌ No certificates found for employee ID: ${id}`);
      console.log(`🔍 Debug info: Searched using all strategies but found no matches`);
      
      return res.status(404).json({ 
        success: false,
        message: `No certificates found for employee ID: ${id}. Please check if this employee has completed any courses.`,
        employeeId: id,
        debug: {
          totalCertificatesInDB: allCertificates.length,
          searchStrategiesUsed: ['employeeId', 'employeeEmail', '_id', 'partial employeeId', 'name/email partial', 'employeeId substring'],
          sampleCertificateIds: allCertificates.slice(0, 3).map(cert => cert.employeeId),
          sampleEmployeeEmails: allCertificates.slice(0, 3).map(cert => cert.employeeEmail),
          sampleEmployeeNames: allCertificates.slice(0, 3).map(cert => cert.employeeName)
        }
      });
    }

    console.log(`✅ Found ${certificates.length} certificates for employee ${id} using method: ${searchMethod}`);
    res.status(200).json({
      success: true,
      certificates: certificates,
      count: certificates.length,
      searchMethod: searchMethod
    });

  } catch (error) {
    console.error('❌ Error fetching certificates by ID:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal Server Error',
      error: error.message 
    });
  }
});

module.exports = router;
