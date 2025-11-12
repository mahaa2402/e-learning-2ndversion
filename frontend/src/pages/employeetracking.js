import React, { useState, useEffect } from 'react';
import { User, Mail, Building, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import './employeetracking.css'; // Import the CSS file
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';   // ✅ Sidebar import

// Employee Card component
const EmployeeCard = ({ employee, onViewDetails }) => {
  return (
    <div className="employee-card">
      <div className="employee-card-header">
        <div className="employee-avatar">
          <User style={{ width: '24px', height: '24px', color: 'white' }} />
        </div>
        <div>
          <h3 className="employee-name">{employee.name}</h3>
        
        </div>
      </div>

      <div className="employee-info-list">
        <div className="employee-info-item">
          <Mail className="employee-info-icon" />
          <span>{employee.email}</span>
        </div>
        <div className="employee-info-item">
      
        </div>
        <div className="employee-info-item">
          <Calendar className="employee-info-icon" />
          <span>
            Joined:{' '}
            {new Date(employee.createdAt || employee.joinDate).toLocaleDateString()}
          </span>
        </div>
      </div>

      <button className="button2" onClick={() => onViewDetails(employee)}>
        View Details
      </button>

      <div className="employee-card-footer">
        <span className="employee-footer-label">Employee ID</span>
        <span className="employee-footer-value">
          {employee._id?.slice(-8) || employee.id?.slice(-8) || 'N/A'}
        </span>
        {employee.hasCertificates && (
          <div style={{ marginTop: '8px', padding: '4px 8px', backgroundColor: '#e8f5e8', borderRadius: '4px', fontSize: '12px' }}>
            🏆 {employee.certificateCount} Certificate{employee.certificateCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

// Main Directory
const EmployeeDirectory = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const navigate = useNavigate();

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
      document.cookie.split('; ').find((row) => row.startsWith('authToken='))?.split('=')[1] ||
      document.cookie.split('; ').find((row) => row.startsWith('accessToken='))?.split('=')[1] ||
      document.cookie.split('; ').find((row) => row.startsWith('token='))?.split('=')[1]
    );
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('No authentication token found. Please log in.');
      }

      // First, get all certificates to see which employees have certificates
      console.log('🔍 Fetching certificates to find employees with certificates...');
      const certificatesResponse = await fetch('/api/certificates/all', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        credentials: 'include',
      });

      let employeesWithCertificates = [];
      if (certificatesResponse.ok) {
        const certificatesData = await certificatesResponse.json();
        console.log('📊 Certificates data:', certificatesData);
        
        // Extract unique employee information from certificates
        const uniqueEmployees = {};
        if (certificatesData.certificates && Array.isArray(certificatesData.certificates)) {
          certificatesData.certificates.forEach(cert => {
            const key = cert.employeeEmail || cert.employeeId;
            if (key && !uniqueEmployees[key]) {
              uniqueEmployees[key] = {
                _id: cert.employeeId || cert.employeeEmail,
                name: cert.employeeName || cert.employeeEmail.split('@')[0],
                email: cert.employeeEmail,
               
                createdAt: cert.createdAt || cert.completionDate,
                hasCertificates: true,
                certificateCount: 1
              };
            } else if (uniqueEmployees[key]) {
              uniqueEmployees[key].certificateCount++;
            }
          });
        }
        employeesWithCertificates = Object.values(uniqueEmployees);
        console.log('👥 Employees with certificates:', employeesWithCertificates);
      }

      // Also fetch regular employees for comparison
      const response = await fetch('/api/employee/employees', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        credentials: 'include',
      });

      let regularEmployees = [];
      if (response.ok) {
        const data = await response.json();
        regularEmployees = Array.isArray(data) ? data : [];
        console.log('👤 Regular employees:', regularEmployees);
      }

      // Combine both lists, prioritizing employees with certificates
      const allEmployees = [...employeesWithCertificates, ...regularEmployees.filter(emp => 
        !employeesWithCertificates.some(certEmp => certEmp.email === emp.email)
      )];

      setEmployees(allEmployees);
      console.log('📋 Final employee list:', allEmployees);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(`Failed to fetch employees: ${err.message}`);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const onViewDetails = (employee) => {
    navigate(`/certificatedetail/${employee._id}`);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return (
    <div className="flex h-screen w-screen absolute top-0 left-0">
      {/* ✅ Sidebar on the left */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 overflow-auto employee-directory-container">
        <div className="employee-directory-max-width">
          {/* Loading */}
          {loading && (
            <div className="employee-directory-loading-container">
              <div className="employee-directory-loading-content">
              
               
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="employee-directory-error-container">
              <div className="employee-directory-error-header">
                <AlertCircle
                  style={{ width: '24px', height: '24px', color: '#dc2626' }}
                />
                <h2 className="employee-directory-error-title">
                  Error Loading Employees
                </h2>
              </div>
              <p className="employee-directory-error-text">{error}</p>
              {error.includes('Authentication') && (
                <div className="employee-directory-warning-box">
                  <p className="employee-directory-warning-text">
                    <strong>Troubleshooting:</strong> Make sure you're logged in.
                  </p>
                </div>
              )}
              <button
                className="employee-directory-error-button"
                onClick={fetchEmployees}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Header */}
          {!loading && !error && (
            <>
              <div className="employee-directory-header">
                <div>
                  <h1 className="employee-directory-title">Employee Directory</h1>
                  <p className="employee-directory-subtitle">
                    {employees.length > 0
                      ? `Total Employees: ${employees.length}`
                      : 'Connecting to database...'}
                  </p>
                </div>
                <div className="employee-directory-button-group">
                  <button
                    className="employee-directory-button"
                    onClick={fetchEmployees}
                    disabled={loading}
                  >
                   
                  
                  </button>
                </div>
              </div>

              {/* Employee Grid */}
              {employees.length === 0 ? (
                <div className="employee-directory-empty-state">
                  <User
                    style={{
                      width: '48px',
                      height: '48px',
                      color: '#9ca3af',
                      margin: '0 auto 16px',
                    }}
                  />
                  <h3 className="employee-directory-empty-title">
                    No Employees Found
                  </h3>
                  <p className="employee-directory-empty-text">
                    No employee records found in the database.
                  </p>
                  <button
                    className="employee-directory-button"
                    onClick={fetchEmployees}
                  >
                    Try Loading Again
                  </button>
                </div>
              ) : (
                <div className="employee-directory-grid">
                  {employees.map((employee) => (
                    <EmployeeCard
                      key={employee._id || employee.id || employee.email}
                      employee={employee}
                      onViewDetails={onViewDetails}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Certificate Viewer */}
          {selectedCertificate && (
            <div className="employee-certificate-modal">
              <h2>Certificate Details for {selectedEmployee?.name}</h2>
              <p>
                <strong>Course:</strong> {selectedCertificate.courseTitle}
              </p>
              <p>
                <strong>Date:</strong>{' '}
                {new Date(selectedCertificate.date).toLocaleDateString()}
              </p>
              <p>
                <strong>Awarded By:</strong> {selectedCertificate.awarder}
              </p>
              <p>
                <strong>Description:</strong> {selectedCertificate.description}
              </p>
              <button
                className="employee-directory-button"
                onClick={() => {
                  setSelectedCertificate(null);
                  setSelectedEmployee(null);
                }}
              >
                Close
              </button>
            </div>
          )}

        
        </div>
      </div>
    </div>
  );
};

export default EmployeeDirectory;
