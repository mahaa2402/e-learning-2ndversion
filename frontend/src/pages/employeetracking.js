import React, { useState, useEffect } from 'react';
import { User, Mail, Building, Calendar, RefreshCw, AlertCircle, Trash2, PlusCircle } from 'lucide-react';
import './employeetracking.css'; // Import the CSS file
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';   // ✅ Sidebar import
import { API_ENDPOINTS } from '../config/api';

// Utility: Validate MongoDB ObjectId
const isValidObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

// Employee Card component
const EmployeeCard = ({ employee, onViewDetails, onDelete, isDeleting }) => {
  const showDelete = onDelete && isValidObjectId(employee._id || employee.id);
  return (
    <div className="employee-card">
      <div className="employee-card-header">
        <div className="employee-avatar">
          <User style={{ width: '24px', height: '24px', color: 'white' }} />
        </div>
        <div className="employee-card-header-info">
          <h3 className="employee-name">{employee.name}</h3>
          {employee.department && (
            <span className="employee-department-badge">
              <Building className="employee-info-icon" />
              {employee.department}
            </span>
          )}
        </div>
        {showDelete && (
          <button
            className="employee-delete-button"
            title="Delete employee"
            onClick={() => onDelete(employee)}
            disabled={isDeleting}
          >
            {isDeleting ? '...' : <Trash2 size={18} />}
          </button>
        )}
      </div>

      <div className="employee-info-list">
        <div className="employee-info-item">
          <Mail className="employee-info-icon" />
          <span>{employee.email}</span>
        </div>
        {employee.department && (
          <div className="employee-info-item">
            <Building className="employee-info-icon" />
            <span>{employee.department}</span>
          </div>
        )}
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
          {employee.employeeId || employee._id?.slice(-8) || employee.id?.slice(-8) || 'N/A'}
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
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', department: '', password: '' });
  const [formStatus, setFormStatus] = useState({ type: null, message: '' });
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState(null);
  const [lastTempPassword, setLastTempPassword] = useState('');

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

  const formatEmployeeRecord = (employee = {}, overrides = {}) => {
    const identifier = employee._id || employee.id || overrides.id || employee.email;
    return {
      _id: identifier,
      id: identifier,
      name: employee.name || employee.employeeName || employee.email?.split('@')[0] || 'Unnamed Employee',
      email: employee.email || employee.employeeEmail || '',
      employeeId: employee.employeeId || overrides.employeeId || '',
      department: employee.department || overrides.department || '',
      createdAt: employee.createdAt || employee.completionDate || new Date().toISOString(),
      hasCertificates: Boolean(employee.hasCertificates || employee.certificateCount),
      certificateCount: employee.certificateCount || 0,
      ...overrides,
    };
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
      const certificatesResponse = await fetch(API_ENDPOINTS.CERTIFICATES.GET_ALL, {
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
              uniqueEmployees[key] = formatEmployeeRecord({
                _id: cert.employeeId || cert.employeeEmail,
                name: cert.employeeName,
                email: cert.employeeEmail,
                createdAt: cert.createdAt || cert.completionDate,
                certificateCount: 1,
                hasCertificates: true,
              });
            } else if (uniqueEmployees[key]) {
              uniqueEmployees[key].certificateCount++;
            }
          });
        }
        employeesWithCertificates = Object.values(uniqueEmployees);
        console.log('👥 Employees with certificates:', employeesWithCertificates);
      }

      // Also fetch regular employees for comparison
      const response = await fetch(API_ENDPOINTS.EMPLOYEES.LIST, {
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
        regularEmployees = Array.isArray(data) ? data.map((emp) => formatEmployeeRecord(emp)) : [];
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

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewEmployee((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddEmployee = async (event) => {
    event.preventDefault();
    setFormStatus({ type: null, message: '' });

    const trimmedName = newEmployee.name.trim();
    const trimmedEmail = newEmployee.email.trim();
    const trimmedDepartment = newEmployee.department.trim();
    const trimmedPassword = newEmployee.password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedDepartment) {
      setFormStatus({ type: 'error', message: 'Name, email, and department are required.' });
      return;
    }

    const authToken = getAuthToken();
    if (!authToken) {
      setFormStatus({ type: 'error', message: 'Authentication required. Please login again.' });
      return;
    }

    setIsSubmittingEmployee(true);

    try {
      const response = await fetch(API_ENDPOINTS.EMPLOYEES.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          employeeId: newEmployee.employeeId?.trim() || undefined,
          department: trimmedDepartment,
          password: trimmedPassword || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to add employee');
      }

      const formattedEmployee = formatEmployeeRecord(data.employee, { hasCertificates: false, certificateCount: 0 });
      setEmployees((prev) => [formattedEmployee, ...prev]);
      setNewEmployee({ name: '', email: '', department: '', password: '' });
      setLastTempPassword(data.tempPassword || '');
      setFormStatus({
        type: 'success',
        message: data.passwordProvided
          ? data.message
          : `${data.message}${data.tempPassword ? ` • Temporary password: ${data.tempPassword}` : ''}`,
      });
    } catch (err) {
      setFormStatus({ type: 'error', message: err.message || 'Failed to add employee' });
    } finally {
      setIsSubmittingEmployee(false);
    }
  };

  const handleDeleteEmployee = async (employee) => {
    const employeeId = employee._id || employee.id;
    if (!employeeId) {
      return;
    }

    const confirmed = window.confirm(`Delete employee ${employee.name || employee.email}?`);
    if (!confirmed) {
      return;
    }

    const authToken = getAuthToken();
    if (!authToken) {
      alert('Authentication required. Please login again.');
      return;
    }

    setDeletingEmployeeId(employeeId);

    try {
      let deleteUrl;
      // If the id is not a valid ObjectId, assume it's an email and use delete-by-email query param
      if (!isValidObjectId(employeeId) && employee.email && employee.email.includes('@')) {
        deleteUrl = `${API_ENDPOINTS.EMPLOYEES.LIST}?email=${encodeURIComponent(employee.email)}`;
      } else {
        deleteUrl = API_ENDPOINTS.EMPLOYEES.DELETE(employeeId);
      }

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to delete employee');
      }

      setEmployees((prev) => prev.filter((emp) => (emp._id || emp.id) !== employeeId));
      setFormStatus({ type: 'success', message: data.message || 'Employee deleted successfully' });
    } catch (err) {
      console.error('Error deleting employee:', err);
      alert(err.message || 'Failed to delete employee');
    } finally {
      setDeletingEmployeeId(null);
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
      <div className="flex-1 overflow-auto employee-directory-container1">
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
                    <RefreshCw size={16} style={{ marginRight: 6 }} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="employee-management-panel">
                <div className="employee-add-card">
                  <div className="employee-add-card-header">
                    <div className="employee-add-card-title">
                      <PlusCircle size={20} />
                      <div>
                        <h2>Add Employee</h2>
                        <p>Quickly add a new employee record to the platform.</p>
                      </div>
                    </div>
                  </div>
                  <form className="employee-add-form" onSubmit={handleAddEmployee}>
                    <div className="employee-add-form-group">
                      <label htmlFor="name">Full Name</label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Employee name"
                        value={newEmployee.name}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="employee-add-form-group">
                      <label htmlFor="email">Work Email</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="employee@company.com"
                        value={newEmployee.email}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="employee-add-form-group">
                      <label htmlFor="department">Department</label>
                      <input
                        id="department"
                        name="department"
                        type="text"
                        placeholder="E.g. Operations"
                        value={newEmployee.department}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="employee-add-form-group">
                      <label htmlFor="employeeId">Employee ID</label>
                      <input
                        id="employeeId"
                        name="employeeId"
                        type="text"
                        placeholder="Employee ID (e.g., EMP-12345)"
                        value={newEmployee.employeeId || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="employee-add-form-group">
                      <label htmlFor="password">
                        Password <span className="optional-label">(optional)</span>
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="text"
                        placeholder="Leave blank to auto-generate"
                        value={newEmployee.password}
                        onChange={handleInputChange}
                      />
                    </div>
                    <button
                      type="submit"
                      className="employee-add-submit"
                      disabled={isSubmittingEmployee}
                    >
                      {isSubmittingEmployee ? 'Adding...' : 'Add Employee'}
                    </button>
                  </form>
                  {formStatus.message && (
                    <div className={`employee-add-message ${formStatus.type}`}>
                      {formStatus.message}
                    </div>
                  )}
                  {lastTempPassword && (
                    <div className="employee-add-temp-password">
                      Temporary password: <strong>{lastTempPassword}</strong>
                    </div>
                  )}
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
                      onDelete={handleDeleteEmployee}
                      isDeleting={deletingEmployeeId === (employee._id || employee.id)}
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
