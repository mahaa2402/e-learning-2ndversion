/**
 * Test script to generate a course access token for development testing
 * Usage: node test-course-access.js
 */

require('dotenv').config();
const { generateSecureToken } = require('./utils/secureLinkGenerator');

// Test data
const employeeEmail = 'test@example.com'; // Change this to a real employee email in your database
const courseName = 'Food Safety'; // Change this to a real course name
const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

console.log('🔧 Generating test course access token...\n');

try {
  const token = generateSecureToken(employeeEmail, courseName, deadline);
  
  // For development testing, always use localhost:3000
  // Change this to production URL if testing on production server
  const frontendUrl = process.env.TEST_FRONTEND_URL || 'http://localhost:3000';
  
  const accessLink = `${frontendUrl}/course-access?token=${encodeURIComponent(token)}`;
  
  console.log('✅ Token generated successfully!\n');
  console.log('📋 Test Details:');
  console.log('   Employee Email:', employeeEmail);
  console.log('   Course Name:', courseName);
  console.log('   Deadline:', deadline.toLocaleString());
  console.log('\n🔗 Course Access Link:');
  console.log(accessLink);
  console.log('\n📝 Instructions:');
  console.log('1. Make sure backend is running on port 5000');
  console.log('2. Make sure frontend is running on port 3000');
  console.log('3. Copy the link above and open it in your browser');
  console.log('4. It should redirect to /userdashboard after validation\n');
  
} catch (error) {
  console.error('❌ Error generating token:', error.message);
  process.exit(1);
}

