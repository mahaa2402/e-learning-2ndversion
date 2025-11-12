import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './certificatedetail.css';

const CertificateDetails = () => {
  const { id } = useParams(); // employee ID passed from route
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressList, setProgressList] = useState([]); // List of user progress objects
  const [progressLoading, setProgressLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState(null);

  const getAuthToken = () => {
    return (
      localStorage.getItem('authToken') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      localStorage.getItem('jwt') ||
      sessionStorage.getItem('authToken') ||
      sessionStorage.getItem('accessToken') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('jwt') ||
      document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1] ||
      document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1] ||
      document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
    );
  };


  // Fetch user progress for a given email and course
  const fetchUserProgress = async (employeeEmail, courseName) => {
    if (!employeeEmail || !courseName) {
      console.warn('No employee email or course name provided for progress fetch');
      return [];
    }
    try {
      setProgressLoading(true);
      const token = getAuthToken();
      if (!token) {
        console.warn('No auth token found for progress fetch');
        return [];
      }
      const url = `/api/progress/get?userEmail=${encodeURIComponent(employeeEmail)}&courseName=${encodeURIComponent(courseName)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        let progressArray = [];
        if (Array.isArray(data.progress)) {
          progressArray = data.progress;
        } else if (data.progress) {
          progressArray = [data.progress];
        }
        return progressArray;
      } else {
        console.warn(`Failed to fetch progress: ${res.status} ${res.statusText}`);
        return [];
      }
    } catch (err) {
      console.error('Error fetching user progress:', err);
      return [];
    } finally {
      setProgressLoading(false);
    }
  };

  // Calculate progress percentage for a course
  const calculateProgressPercentage = (progress) => {
    if (!progress) return 0;
    
    // Handle different possible progress data structures
    if (progress.completedModules && progress.totalModules) {
      const completed = Array.isArray(progress.completedModules) 
        ? progress.completedModules.length 
        : progress.completedModules;
      return Math.round((completed / progress.totalModules) * 100);
    }
    
    if (progress.completed && progress.total) {
      return Math.round((progress.completed / progress.total) * 100);
    }
    
    if (progress.progressPercentage !== undefined) {
      return Math.round(progress.progressPercentage);
    }
    
    return 0;
  };

  const fetchCertificateDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('No authentication token found. Please log in.');
      }

      if (!id) {
        throw new Error('No employee ID provided');
      }

      console.log(`🔍 Fetching certificates for employee ID: ${id}`);

      // First, try to get all certificates to see what's available
      const allCertificatesEndpoint = `/api/certificates/all`;
      console.log(`🔍 Checking all certificates from: ${allCertificatesEndpoint}`);
      
      const allRes = await fetch(allCertificatesEndpoint, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        credentials: 'include'
      });

      if (allRes.ok) {
        const allData = await allRes.json();
        console.log(`📊 Total certificates in database: ${allData.count}`);
        if (allData.certificates && allData.certificates.length > 0) {
          console.log('📋 Available certificates:', allData.certificates.map(cert => ({
            id: cert._id,
            employeeId: cert.employeeId,
            employeeEmail: cert.employeeEmail,
            employeeName: cert.employeeName,
            courseTitle: cert.courseTitle
          })));
        }
      }

      // Use the correct endpoint for fetching all certificates for an employee
      const endpoint = `/api/certificates/${id}`;
      console.log(`Fetching certificates from: ${endpoint}`);
      
      const res = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        credentials: 'include'
      });

      if (!res.ok) {
        if (res.status === 404) {
          // Try to get debug information from the response
          let errorMessage = `No certificates found for employee ID: ${id}. Please check if this employee has completed any courses.`;
          try {
            const errorData = await res.json();
            if (errorData.debug) {
              errorMessage += `\n\nDebug Information:\n- Total certificates in database: ${errorData.debug.totalCertificatesInDB}\n- Sample employee IDs: ${errorData.debug.sampleCertificateIds?.join(', ') || 'None'}`;
            }
          } catch (e) {
            // If we can't parse the error response, use the default message
          }
          throw new Error(errorMessage);
        } else if (res.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else {
          throw new Error(`Failed to fetch certificate details: ${res.status} ${res.statusText}`);
        }
      }

      const data = await res.json();
      console.log('Certificate data received:', data);
      
      const certificatesArray = Array.isArray(data.certificates) ? data.certificates : 
                               (Array.isArray(data) ? data : []);
      setCertificates(certificatesArray);

      // Fetch user progress for the employee (by email and courseName)
      const email = certificatesArray.find(cert => cert.employeeEmail)?.employeeEmail;
      const courseName = certificatesArray.find(cert => cert.courseTitle)?.courseTitle || certificatesArray.find(cert => cert.courseName)?.courseName;
      if (email && courseName) {
        console.log(`🔍 Found employee identifiers - Email: ${email}, Course: ${courseName}`);
        const progressArr = await fetchUserProgress(email, courseName);
        setProgressList(progressArr);
      } else {
        console.warn('❌ No employee email or course name found in certificates, cannot fetch progress');
      }
    } catch (err) {
      console.error('Error fetching certificate details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Debug function to get employee information
  const fetchDebugInfo = async () => {
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      // Use the existing /all endpoint to get all certificates for debugging
      const debugEndpoint = `/api/certificates/all`;
      console.log(`🔍 Fetching debug info from: ${debugEndpoint}`);
      
      const res = await fetch(debugEndpoint, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        
        // Filter certificates that might match this employee ID
        const matchingCertificates = data.certificates.filter(cert => 
          cert.employeeId === id || 
          cert.employeeEmail === id ||
          cert.employeeId.includes(id) ||
          cert.employeeEmail.includes(id)
        );

        // Also try to find employee by checking if any certificate has similar employee info
        const allEmployeeIds = [...new Set(data.certificates.map(cert => cert.employeeId))];
        const allEmployeeEmails = [...new Set(data.certificates.map(cert => cert.employeeEmail))];
        
        setDebugInfo({
          totalCertificates: data.count,
          matchingCertificates: matchingCertificates,
          allEmployeeIds: allEmployeeIds.slice(0, 10), // Show first 10 for reference
          allEmployeeEmails: allEmployeeEmails.slice(0, 10), // Show first 10 for reference
          searchedId: id
        });
        console.log('Debug info received:', data);
      } else {
        const errorData = await res.json();
        console.error('Debug info error:', errorData);
        setDebugInfo({ error: errorData.message || 'Failed to fetch debug info' });
      }
    } catch (err) {
      console.error('Error fetching debug info:', err);
      setDebugInfo({ error: err.message });
    }
  };

  // Function to search for employees
  const searchEmployee = async () => {
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      // Try to get employee information using the correct employee endpoint
      const employeeEndpoint = `/api/employee/employees`;
      console.log(`🔍 Searching for employee at: ${employeeEndpoint}`);
      
      const res = await fetch(employeeEndpoint, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Employee search result:', data);
        
        // Look for employees that might match our ID
        const employees = Array.isArray(data) ? data : (data.employees || []);
        const matchingEmployees = employees.filter(emp => 
          emp._id === id || 
          emp._id.includes(id) ||
          emp.email === id ||
          (emp.name && emp.name.toLowerCase().includes(id.toLowerCase()))
        );
        
        setEmployeeSearch({
          totalEmployees: employees.length,
          matchingEmployees: matchingEmployees,
          allEmployees: employees.slice(0, 10), // Show first 10 for reference
          searchedId: id
        });
      } else {
        const errorData = await res.json();
        console.error('Employee search error:', errorData);
        setEmployeeSearch({ error: errorData.message || 'Failed to search employees' });
      }
    } catch (err) {
      console.error('Error searching employees:', err);
      setEmployeeSearch({ error: err.message });
    }
  };

  useEffect(() => {
    fetchCertificateDetails();
    // eslint-disable-next-line
  }, [id]);

  if (loading) {
    return (
      <div className="certificate-page">
        <div className="loading-container">
          <p className="loading-msg">Loading certificate details...</p>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="certificate-page">
        <div className="error-container">
          <p className="error-msg">❌ {error}</p>
          
          <div style={{ marginTop: '20px' }}>
            <button 
              className="back-button" 
              onClick={fetchDebugInfo}
              style={{ marginRight: '10px', backgroundColor: '#007bff', color: 'white' }}
            >
              🔍 Get Debug Info
            </button>
            <button 
              className="back-button" 
              onClick={searchEmployee}
              style={{ marginRight: '10px', backgroundColor: '#28a745', color: 'white' }}
            >
              👤 Search Employee
            </button>
            <button 
              className="back-button" 
              onClick={() => navigate('/employeetracking')}
              style={{ marginRight: '10px', backgroundColor: '#6f42c1', color: 'white' }}
            >
              📋 Employee Tracking
            </button>
            <button className="back-button" onClick={() => navigate(-1)}>⬅ Go Back</button>
          </div>

          {debugInfo && (
            <div className="debug-info" style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px', 
              fontSize: '14px',
              border: '1px solid #dee2e6'
            }}>
              <h4>🔧 Debug Information:</h4>
              {debugInfo.error ? (
                <p style={{ color: 'red' }}>❌ {debugInfo.error}</p>
              ) : (
                <div>
                  <p><strong>🔍 Debug Results for ID: {debugInfo.searchedId}</strong></p>
                  
                  <p><strong>📊 Database Overview:</strong></p>
                  <ul style={{ marginLeft: '20px' }}>
                    <li><strong>Total certificates in database:</strong> {debugInfo.totalCertificates}</li>
                    <li><strong>Matching certificates found:</strong> {debugInfo.matchingCertificates?.length || 0}</li>
                  </ul>
                  
                  {debugInfo.matchingCertificates && debugInfo.matchingCertificates.length > 0 ? (
                    <div>
                      <p><strong>🎯 Matching Certificates:</strong></p>
                      <ul style={{ marginLeft: '20px' }}>
                        {debugInfo.matchingCertificates.map((cert, idx) => (
                          <li key={idx}>
                            <strong>{cert.courseTitle}</strong> - {cert.certificateId}
                            <br />
                            <small>Employee ID: {cert.employeeId} | Email: {cert.employeeEmail}</small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p style={{ color: 'orange' }}>⚠️ No certificates found matching this employee ID</p>
                  )}
                  
                  <p><strong>📋 Sample Employee IDs in Database:</strong></p>
                  <ul style={{ marginLeft: '20px', fontSize: '12px' }}>
                    {debugInfo.allEmployeeIds?.map((empId, idx) => (
                      <li key={idx}>{empId}</li>
                    ))}
                  </ul>
                  
                  <p><strong>📧 Sample Employee Emails in Database:</strong></p>
                  <ul style={{ marginLeft: '20px', fontSize: '12px' }}>
                    {debugInfo.allEmployeeEmails?.map((email, idx) => (
                      <li key={idx}>{email}</li>
                    ))}
                  </ul>
                  
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                    <p><strong>💡 Troubleshooting Tips:</strong></p>
                    <ul style={{ marginLeft: '20px', fontSize: '12px' }}>
                      <li>Check if the employee ID matches any of the sample IDs above</li>
                      <li>Verify the employee has completed courses and certificates were generated</li>
                      <li>Try using the employee's email address instead of the ID</li>
                      <li>Check if the employee exists in the employee database</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {employeeSearch && (
            <div className="debug-info" style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f0f8ff', 
              borderRadius: '8px', 
              fontSize: '14px',
              border: '1px solid #b3d9ff'
            }}>
              <h4>👤 Employee Search Results:</h4>
              {employeeSearch.error ? (
                <p style={{ color: 'red' }}>❌ {employeeSearch.error}</p>
              ) : (
                <div>
                  <p><strong>🔍 Search Results for ID: {employeeSearch.searchedId}</strong></p>
                  
                  <p><strong>📊 Employee Database Overview:</strong></p>
                  <ul style={{ marginLeft: '20px' }}>
                    <li><strong>Total employees in database:</strong> {employeeSearch.totalEmployees}</li>
                    <li><strong>Matching employees found:</strong> {employeeSearch.matchingEmployees?.length || 0}</li>
                  </ul>
                  
                  {employeeSearch.matchingEmployees && employeeSearch.matchingEmployees.length > 0 ? (
                    <div>
                      <p><strong>🎯 Matching Employees:</strong></p>
                      <ul style={{ marginLeft: '20px' }}>
                        {employeeSearch.matchingEmployees.map((emp, idx) => (
                          <li key={idx}>
                            <strong>{emp.name}</strong> - {emp.email}
                            <br />
                            <small>Employee ID: {emp._id} | Department: {emp.department}</small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p style={{ color: 'orange' }}>⚠️ No employees found matching this ID</p>
                  )}
                  
                  <p><strong>📋 Sample Employee IDs in Database:</strong></p>
                  <ul style={{ marginLeft: '20px', fontSize: '12px' }}>
                    {employeeSearch.allEmployees?.map((emp, idx) => (
                      <li key={idx}>
                        <strong>{emp.name}</strong> - {emp._id}
                        <br />
                        <small>Email: {emp.email}</small>
                      </li>
                    ))}
                  </ul>
                  
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e6f3ff', borderRadius: '5px' }}>
                    <p><strong>💡 Next Steps:</strong></p>
                    <ul style={{ marginLeft: '20px', fontSize: '12px' }}>
                      <li>If you found the correct employee, use their ID to access certificates</li>
                      <li>If no employee found, check if the ID is correct or if the employee exists</li>
                      <li>Try using the employee's email address instead of the ID</li>
                      <li>Verify the employee has completed courses to generate certificates</li>
                      <li><strong>💡 Tip:</strong> Go to <button 
                        onClick={() => navigate('/employeetracking')}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#007bff', 
                          textDecoration: 'underline', 
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '12px'
                        }}
                      >Employee Tracking</button> to see all employees and click on their names to view certificates</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!certificates || certificates.length === 0) {
    return (
      <div className="certificate-page">
        <div className="no-data-container">
          <p className="error-msg">📭 No certificates found for this employee</p>
          <div className="debug-info" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontSize: '14px' }}>
            <h4>🔧 Debug Information:</h4>
            <p><strong>Employee ID:</strong> {id}</p>
            <p><strong>Possible reasons:</strong></p>
            <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
              <li>This employee hasn't completed any courses yet</li>
              <li>Certificates haven't been generated for completed courses</li>
              <li>The employee ID doesn't match the certificate records</li>
              <li>Check the browser console for more detailed information</li>
            </ul>
            <p><strong>Next steps:</strong></p>
            <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
              <li>Verify the employee has completed courses</li>
              <li>Check if certificates were generated for completed courses</li>
              <li>Ensure the employee ID matches the certificate database</li>
            </ul>
          </div>
          <div style={{ marginTop: '20px' }}>
            <button 
              className="back-button" 
              onClick={fetchDebugInfo}
              style={{ marginRight: '10px', backgroundColor: '#007bff', color: 'white' }}
            >
              🔍 Get Debug Info
            </button>
            <button 
              className="back-button" 
              onClick={searchEmployee}
              style={{ marginRight: '10px', backgroundColor: '#28a745', color: 'white' }}
            >
              👤 Search Employee
            </button>
            <button 
              className="back-button" 
              onClick={() => navigate('/employeetracking')}
              style={{ marginRight: '10px', backgroundColor: '#6f42c1', color: 'white' }}
            >
              📋 Employee Tracking
            </button>
            <button className="back-button" onClick={() => navigate(-1)}>⬅ Go Back</button>
          </div>

          {debugInfo && (
            <div className="debug-info" style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px', 
              fontSize: '14px',
              border: '1px solid #dee2e6'
            }}>
              <h4>🔧 Debug Information:</h4>
              {debugInfo.error ? (
                <p style={{ color: 'red' }}>❌ {debugInfo.error}</p>
              ) : (
                <div>
                  <p><strong>🔍 Debug Results for ID: {debugInfo.searchedId}</strong></p>
                  
                  <p><strong>📊 Database Overview:</strong></p>
                  <ul style={{ marginLeft: '20px' }}>
                    <li><strong>Total certificates in database:</strong> {debugInfo.totalCertificates}</li>
                    <li><strong>Matching certificates found:</strong> {debugInfo.matchingCertificates?.length || 0}</li>
                  </ul>
                  
                  {debugInfo.matchingCertificates && debugInfo.matchingCertificates.length > 0 ? (
                    <div>
                      <p><strong>🎯 Matching Certificates:</strong></p>
                      <ul style={{ marginLeft: '20px' }}>
                        {debugInfo.matchingCertificates.map((cert, idx) => (
                          <li key={idx}>
                            <strong>{cert.courseTitle}</strong> - {cert.certificateId}
                            <br />
                            <small>Employee ID: {cert.employeeId} | Email: {cert.employeeEmail}</small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p style={{ color: 'orange' }}>⚠️ No certificates found matching this employee ID</p>
                  )}
                  
                  <p><strong>📋 Sample Employee IDs in Database:</strong></p>
                  <ul style={{ marginLeft: '20px', fontSize: '12px' }}>
                    {debugInfo.allEmployeeIds?.map((empId, idx) => (
                      <li key={idx}>{empId}</li>
                    ))}
                  </ul>
                  
                  <p><strong>📧 Sample Employee Emails in Database:</strong></p>
                  <ul style={{ marginLeft: '20px', fontSize: '12px' }}>
                    {debugInfo.allEmployeeEmails?.map((email, idx) => (
                      <li key={idx}>{email}</li>
                    ))}
                  </ul>
                  
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                    <p><strong>💡 Troubleshooting Tips:</strong></p>
                    <ul style={{ marginLeft: '20px', fontSize: '12px' }}>
                      <li>Check if the employee ID matches any of the sample IDs above</li>
                      <li>Verify the employee has completed courses and certificates were generated</li>
                      <li>Try using the employee's email address instead of the ID</li>
                      <li>Check if the employee exists in the employee database</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {employeeSearch && (
            <div className="debug-info" style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f0f8ff', 
              borderRadius: '8px', 
              fontSize: '14px',
              border: '1px solid #b3d9ff'
            }}>
              <h4>👤 Employee Search Results:</h4>
              {employeeSearch.error ? (
                <p style={{ color: 'red' }}>❌ {employeeSearch.error}</p>
              ) : (
                <div>
                  <p><strong>🔍 Search Results for ID: {employeeSearch.searchedId}</strong></p>
                  
                  <p><strong>📊 Employee Database Overview:</strong></p>
                  <ul style={{ marginLeft: '20px' }}>
                    <li><strong>Total employees in database:</strong> {employeeSearch.totalEmployees}</li>
                    <li><strong>Matching employees found:</strong> {employeeSearch.matchingEmployees?.length || 0}</li>
                  </ul>
                  
                  {employeeSearch.matchingEmployees && employeeSearch.matchingEmployees.length > 0 ? (
                    <div>
                      <p><strong>🎯 Matching Employees:</strong></p>
                      <ul style={{ marginLeft: '20px' }}>
                        {employeeSearch.matchingEmployees.map((emp, idx) => (
                          <li key={idx}>
                            <strong>{emp.name}</strong> - {emp.email}
                            <br />
                            <small>Employee ID: {emp._id} | Department: {emp.department}</small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p style={{ color: 'orange' }}>⚠️ No employees found matching this ID</p>
                  )}
                  
                  <p><strong>📋 Sample Employee IDs in Database:</strong></p>
                  <ul style={{ marginLeft: '20px', fontSize: '12px' }}>
                    {employeeSearch.allEmployees?.map((emp, idx) => (
                      <li key={idx}>
                        <strong>{emp.name}</strong> - {emp._id}
                        <br />
                        <small>Email: {emp.email}</small>
                      </li>
                    ))}
                  </ul>
                  
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e6f3ff', borderRadius: '5px' }}>
                    <p><strong>💡 Next Steps:</strong></p>
                    <ul style={{ marginLeft: '20px', fontSize: '12px' }}>
                      <li>If you found the correct employee, use their ID to access certificates</li>
                      <li>If no employee found, check if the ID is correct or if the employee exists</li>
                      <li>Try using the employee's email address instead of the ID</li>
                      <li>Verify the employee has completed courses to generate certificates</li>
                      <li><strong>💡 Tip:</strong> Go to <button 
                        onClick={() => navigate('/employeetracking')}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#007bff', 
                          textDecoration: 'underline', 
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '12px'
                        }}
                      >Employee Tracking</button> to see all employees and click on their names to view certificates</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="certificate-page">
      <div className="page-header">
        <h1>🎓 Certificate Details</h1>
        <button className="back-button" onClick={() => navigate(-1)}>← Go Back</button>
      </div>

      {/* Certificates Section */}
      <div className="certificates-container">
        <h2>🏅 Certificates ({certificates.length})</h2>
        {certificates.map((certificate, index) => (
          <div key={certificate._id || index} className="certificate-box">
            <div className="certificate-header">
              <h3>{certificate.courseTitle || 'Untitled Course'}</h3>
              {certificate._id && <span className="certificate-id">ID: {certificate._id}</span>}
            </div>
            
            <div className="certificate-details">
              <p><strong>Employee Name:</strong> {certificate.employeeName || 'N/A'}</p>
              <p><strong>Employee Email:</strong> {certificate.employeeEmail || 'N/A'}</p>
              <p><strong>Employee ID:</strong> {certificate.employeeId || 'N/A'}</p>
              <p><strong>Earned On:</strong> {
                certificate.date && !isNaN(Date.parse(certificate.date)) 
                  ? new Date(certificate.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) 
                  : (certificate.createdAt && !isNaN(Date.parse(certificate.createdAt)) 
                      ? new Date(certificate.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        }) 
                      : 'N/A')
              }</p>
              
              {certificate.module && <p><strong>Module:</strong> {certificate.module}</p>}
              {certificate.awarder && <p><strong>Awarded By:</strong> {certificate.awarder}</p>}
              {certificate.description && <p><strong>Description:</strong> {certificate.description}</p>}
              
              {certificate.createdAt && !isNaN(Date.parse(certificate.createdAt)) && (
                <p><strong>Created:</strong> {new Date(certificate.createdAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              )}
              {certificate.updatedAt && !isNaN(Date.parse(certificate.updatedAt)) && (
                <p><strong>Updated:</strong> {new Date(certificate.updatedAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* User Progress Section */}
      {progressList && progressList.length > 0 && (
        <div className="progress-container">
          {progressLoading ? (
            <div className="progress-loading">
              <p>Loading progress data...</p>
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="progress-grid">
              {progressList.map((progress, idx) => (
                <div key={progress.id || progress._id || idx} className="progress-box">
                  <div className="progress-header">
                    <h3>{progress.courseName || progress.courseTitle || 'Unknown Course'}</h3>
                    
                  </div>
                  
                  <div className="progress-details">
                    <p><strong>Last Accessed Module:</strong> {
                      progress.lastAccessedModule || 
                      progress.currentModule || 
                      'None'
                    }</p>
                    
                    {(progress.lastAccessedAt || progress.updatedAt) && (
                      <p><strong>Last Activity:</strong> {
                        new Date(progress.lastAccessedAt || progress.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      }</p>
                    )}
                    
                    <div className="modules-section">
                      <p><strong>Completed Modules ({
                        Array.isArray(progress.completedModules) 
                          ? progress.completedModules.length 
                          : (progress.completedModules || 0)
                      }):</strong></p>
                      
                      {progress.completedModules && Array.isArray(progress.completedModules) && progress.completedModules.length > 0 ? (
                        <ul className="completed-modules-list">
                          {progress.completedModules.map((mod, i) => (
                            <li key={mod.id || mod._id || i} className="module-item">
                              <span className="module-id">
                                {mod.m_id || mod.moduleId || mod.name || mod.title || `Module ${i + 1}`}
                              </span>
                              <span className="completion-date">
                                {mod.completedAt ? new Date(mod.completedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                }) : 'N/A'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="no-modules">No modules completed yet</p>
                      )}
                    </div>

                    {progress.totalModules && (
                      <div className="progress-bar-container">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${calculateProgressPercentage(progress)}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">
                          {Array.isArray(progress.completedModules) 
                            ? progress.completedModules.length 
                            : (progress.completedModules || 0)
                          } of {progress.totalModules} modules completed
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );};

export default CertificateDetails;
