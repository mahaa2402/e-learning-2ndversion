import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import './userdashboard.css';
import { API_ENDPOINTS } from '../config/api';
import {
  Search,
  Filter,
  Play,
  ChevronLeft,
  ChevronRight,
  User,
  BookOpen,
  RefreshCw,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [uncompletedTasks, setUncompletedTasks] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [adminName, setAdminName] = useState(''); // New state for admin name
  const [adminLoading, setAdminLoading] = useState(true); // Loading state for admin profile
  const navigate = useNavigate();

  // Helper to safely extract admin name as string for filtering and rendering
  const getAdminNameString = (assignedBy) => {
    if (!assignedBy) return '';
    if (typeof assignedBy.name === 'string') return assignedBy.name;
    if (typeof assignedBy.name === 'object' && assignedBy.name !== null) {
      if (typeof assignedBy.name.adminName === 'string') return assignedBy.name.adminName;
      if (typeof assignedBy.name.adminEmail === 'string') return assignedBy.name.adminEmail;
    }
    if (typeof assignedBy.adminName === 'string') return assignedBy.adminName;
    if (typeof assignedBy.adminEmail === 'string') return assignedBy.adminEmail;
    if (typeof assignedBy.email === 'string') return assignedBy.email.split('@')[0];
    return '';
  };

  // Filter tasks based on search query
  useEffect(() => {
    const allTasks = [...uncompletedTasks, ...completedTasks];
    if (searchQuery.trim() === '') {
      setFilteredTasks(allTasks);
    } else {
      const filtered = allTasks.filter(task => 
        task.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getAdminNameString(task.assignedBy).toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTasks(filtered);
    }
  }, [searchQuery, uncompletedTasks, completedTasks]);

  // Fetch employee profile information// Updated fetchAdminProfile function with better debugging
const fetchAdminProfile = async () => {
  try {
    setAdminLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please login again.');
    }

  const response = await fetch(API_ENDPOINTS.PROFILE.GET_PROFILE, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      method: 'GET'
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please login again.');
      }
      const errorText = await response.text();
      throw new Error(`Failed to fetch profile: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Enhanced debugging - log the complete response structure
    console.log('=== PROFILE API RESPONSE DEBUG ===');
    console.log('Full response:', JSON.stringify(data, null, 2));
    console.log('Response type:', typeof data);
    console.log('Is array?', Array.isArray(data));
    console.log('Keys in response:', Object.keys(data));
    
    // Try to extract employee name with more comprehensive checking
    let employeeName = '';
    
    // Method 1: Check if it's a success response with data wrapper
    if (data.success && data.data) {
      console.log('Method 1 - Success response with data:', data.data);
      employeeName = data.data.name || data.data.firstName || data.data.fullName || 
                   data.data.username || data.data.email || data.data.employeeName;
    }
    
    // Method 2: Check direct properties on main object
    if (!employeeName) {
      console.log('Method 2 - Direct properties check');
      employeeName = data.name || data.firstName || data.fullName || 
                   data.username || data.email || data.employeeName;
    }
    
    // Method 3: Check for user object
    if (!employeeName && data.user) {
      console.log('Method 3 - User object check:', data.user);
      employeeName = data.user.name || data.user.firstName || data.user.fullName || 
                   data.user.username || data.user.email || data.user.employeeName;
    }
    
    // Method 4: Check for employee object
    if (!employeeName && data.employee) {
      console.log('Method 4 - Employee object check:', data.employee);
      employeeName = data.employee.name || data.employee.firstName || data.employee.fullName || 
                   data.employee.username || data.employee.email || data.employee.employeeName;
    }
    
    // Method 5: Check for profile object
    if (!employeeName && data.profile) {
      console.log('Method 5 - Profile object check:', data.profile);
      employeeName = data.profile.name || data.profile.firstName || data.profile.fullName || 
                   data.profile.username || data.profile.email || data.profile.employeeName;
    }
    
    // Method 6: Check for any nested data structure
    if (!employeeName) {
      console.log('Method 6 - Nested structure search');
      const searchForName = (obj, depth = 0) => {
        if (depth > 3) return null; // Prevent infinite recursion
        
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            
            // Check if current key might contain name
            if (typeof value === 'string' && value.trim() && 
                (key.toLowerCase().includes('name') || 
                 key.toLowerCase().includes('username') || 
                 key.toLowerCase().includes('employee'))) {
              console.log(`Found potential name in key "${key}":`, value);
              return value;
            }
            
            // Recursively search nested objects
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              const nestedName = searchForName(value, depth + 1);
              if (nestedName) return nestedName;
            }
          }
        }
        return null;
      };
      
      employeeName = searchForName(data);
    }
    
    console.log('Final extracted name:', employeeName);
    console.log('=== END DEBUG ===');
    
    // Set the name or fallback to 'Employee'
    setAdminName(employeeName || 'Employee');
    
  } catch (error) {
    console.error('Error fetching employee profile:', error.message);
    setAdminName('Employee'); // Fallback name
  } finally {
    setAdminLoading(false);
  }
};

  const fetchCertificates = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

  const response = await fetch(API_ENDPOINTS.CERTIFICATES.GET_CERTIFICATES, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        method: 'GET'
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        const errorText = await response.text();
        throw new Error(`Failed to fetch certificates: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let certificatesData = [];
      if (data.success && Array.isArray(data.certificates)) {
        certificatesData = data.certificates;
      } else if (Array.isArray(data)) {
        certificatesData = data;
      } else {
        console.warn('Unexpected certificates data format:', data);
        certificatesData = [];
      }
      
      setCertificates(certificatesData);
      return certificatesData;
      
    } catch (error) {
      console.error('Error fetching certificates:', error.message);
      setCertificates([]);
      return [];
    }
  };

  const fetchAssignedTasks = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

  const response = await fetch(API_ENDPOINTS.TASKS.GET_ASSIGNED_TASKS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        method: 'GET'
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        const errorText = await response.text();
        throw new Error(`Failed to fetch tasks: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let tasks = [];
      if (Array.isArray(data)) {
        tasks = data;
      } else if (data && Array.isArray(data.tasks)) {
        tasks = data.tasks;
      } else if (data && Array.isArray(data.data)) {
        tasks = data.data;
      } else {
        console.warn('Unexpected data format:', data);
        tasks = [];
      }
      
      // Sort tasks by deadline (earliest first)
      const sortedTasks = tasks.sort((a, b) => {
        if (!a.deadline || !b.deadline) return 0;
        return new Date(a.deadline) - new Date(b.deadline);
      });
      setAssignedTasks(sortedTasks);
      
    } catch (error) {
      console.error('Error fetching assigned tasks:', error.message);
      setError(error.message);
      setAssignedTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to separate completed and uncompleted tasks based on certificates
  const separateTasksByCompletion = (tasks, certificates) => {
    const completedTaskTitles = new Set(certificates.map(cert => cert.courseTitle));
    
    const completed = tasks.filter(task => 
      completedTaskTitles.has(task.taskTitle) || task.status === 'completed'
    );
    
    const uncompleted = tasks.filter(task => 
      !completedTaskTitles.has(task.taskTitle) && task.status !== 'completed'
    );
    
    setCompletedTasks(completed);
    setUncompletedTasks(uncompleted);
  };

  useEffect(() => {
    // Fetch admin profile, assigned tasks, and certificates
    fetchAdminProfile();
    fetchCertificates();
    fetchAssignedTasks();
  }, []);

  // Update task separation when tasks or certificates change
  useEffect(() => {
    if (assignedTasks.length > 0) {
      separateTasksByCompletion(assignedTasks, certificates);
    }
  }, [assignedTasks, certificates]);

  const handleRefresh = async () => {
    await fetchCertificates();
    fetchAssignedTasks(true);
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'in-progress': return 'warning';
      case 'pending': return 'info';
      case 'overdue': return 'danger';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  const isOverdue = (deadline) => {
    return new Date(deadline) < new Date() && new Date().getTime() - new Date(deadline).getTime() > 0;
  };

  const getDaysRemaining = (deadline) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  };


  return (
    <div className="dashboard">
      {/* Navbar Component */}
      <Navbar showSearch={false} />

      <div className="main-container">
        <div className="layout">
        <aside className="userdash-sidebar">
  <div className="userdash-sidebar-content">
    <div className="userdash-profile">
      <div className="userdash-avatar">
        <User className="userdash-avatar-icon" />
      </div>
                {adminLoading ? (
                  <div className="loading-admin-name">
                    <div className="admin-name-skeleton"></div>
                    <p className="greeting-subtitle">Loading your profile...</p>
                  </div>
                ) : (
                  (() => {
                    // Helper to extract username from email
                    const getNameFromEmail = (email) => {
                      if (!email) return 'Employee';
                      const atIdx = email.indexOf('@');
                      return atIdx > 0 ? email.substring(0, atIdx) : email;
                    };
                    // If adminName is a valid name, use it. If it's an email, extract username. If missing, fallback.
                    let displayName = adminName;
                    if (!displayName || displayName === 'Employee') {
                      // Try to get from localStorage token (JWT)
                      try {
                        const token = localStorage.getItem('token');
                        if (token) {
                          const payload = JSON.parse(atob(token.split('.')[1]));
                          if (payload.email) displayName = getNameFromEmail(payload.email);
                        }
                      } catch (e) { /* ignore */ }
                      if (!displayName || displayName === 'Employee') displayName = 'Employee';
                    } else if (displayName.includes('@')) {
                      displayName = getNameFromEmail(displayName);
                    }
                    // Dynamic greeting
                    const hour = new Date().getHours();
                    let greeting = 'Good Morning';
                    if (hour >= 12 && hour < 18) greeting = 'Good Afternoon';
                    else if (hour >= 18 || hour < 4) greeting = 'Good Evening';
                    return (
                      <>
                        <h3 className="greeting">{greeting} {displayName}</h3>
                        <p className="greeting-subtitle">Continue Your Journey And Achieve Your Target</p>
                      </>
                    );
                  })()
                )}
              </div>
               <div className="userdash-stats">
      <div className="userdash-stat-item">
        <span className="userdash-stat-label">Total Courses Completed</span>
        <span className="userdash-stat-value">
          {completedTasks.length}
        </span>
      </div>
      <div className="userdash-stat-item">
        <span className="userdash-stat-label">Certificates</span>
        <span className="userdash-stat-value">{certificates.length}</span>
      </div>
      <div className="userdash-stat-item">
        <span className="userdash-stat-label">Quizzes Completed</span>
        <span className="userdash-stat-value">-</span>
      </div>
      <div className="userdash-stat-item">
        <span className="userdash-stat-label">Uncompleted Tasks</span>
        <span className="userdash-stat-value">
          {uncompletedTasks.length}
        </span>
      </div>
    </div>

  </div>
</aside>

          <main className="main-content">
            
           
            {/* Uncompleted Tasks Section */}
            <section className="assigned-courses">
              <div className="section-header">
                <h2 className="section-title">Your Assigned Tasks</h2>
                <div className="section-header-actions">
                  <span className="task-count">{uncompletedTasks.length} uncompleted task(s)</span>
                </div>
              </div>

              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p className="loading-text">Loading assigned tasks...</p>
                </div>
              ) : error ? (
                <div className="error-state">
                  <AlertCircle className="error-icon" />
                  <p className="error-text">Error: {error}</p>
                  <button className="btn btn-retry" onClick={handleRefresh}>Retry</button>
                </div>
              ) : uncompletedTasks.length > 0 ? (
                <div className="courses-table-container">
                  <table className="courses-table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-heading">INSTRUCTOR & ASSIGNED DATE</th>
                        <th className="table-heading">TASK DETAILS</th>
                        <th className="table-heading">DEADLINE</th>
                        <th className="table-heading">STATUS</th>
                        <th className="table-heading">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {uncompletedTasks.map((task) => {
                        const daysRemaining = getDaysRemaining(task.deadline);
                        const overdue = isOverdue(task.deadline);
                        
                        return (
                          <tr key={task._id} className={`table-row ${overdue ? 'overdue-row' : ''}`}>
                            <td className="table-cell">
                              <div className="instructor-cell">
                                <div className="instructor-avatar">
                                  <User className="instructor-avatar-icon" />
                                </div>
                                <div className="instructor-info">
                                  <div className="instructor-name">{getAdminNameString(task.assignedBy) || 'Admin'}</div>
                                  {(() => {
                                    const adminNameStr = getAdminNameString(task.assignedBy);
                                    if (adminNameStr && typeof adminNameStr === 'string') {
                                      return (
                                        <div className="admin-name-assignedby">
                                          Assigned by: {adminNameStr}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  <div className="assigned-date">
                                    <Calendar className="date-icon" />
                                    {new Date(task.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="table-cell course-name">
                              <div className="course-details">
                                <div className="course-title">{task.taskTitle}</div>
                                <div className="course-module">Module: {task.module}</div>
                                {task.description && (
                                  <div className="task-description">{task.description}</div>
                                )}
                              </div>
                            </td>
                            <td className="table-cell deadline">
                              <div className="deadline-info">
                                <div className={`deadline-date ${overdue ? 'overdue' : ''}`}>
                                  <Clock className="clock-icon" />
                                  {new Date(task.deadline).toLocaleDateString()}
                                </div>
                                <div className={`priority priority-${getPriorityColor(task.priority)}`}>
                                  {task.priority.toUpperCase()}
                                </div>
                                <div className={`days-remaining ${overdue ? 'overdue' : daysRemaining <= 3 ? 'urgent' : ''}`}>
                                  {overdue ? 'OVERDUE' : daysRemaining === 0 ? 'Due Today' : `${daysRemaining} days left`}
                                </div>
                              </div>
                            </td>
                            <td className="table-cell status">
                              <div className={`status-badge status-${getStatusColor(task.status)}`}>
                                {task.status.toUpperCase()}
                              </div>
                              {task.totalAssignees && (
                                <div className="progress-info">
                                  {task.completedCount || 0}/{task.totalAssignees} Completed
                                </div>
                              )}
                            </td>
                            <td className="table-cell actions">
                              <button 
                                className="btn btn-start-learning"
                                onClick={() => {
                                  navigate('/taskdetailpage', { state: { task } });
                                }}
                              >
                                {task.status === 'in-progress' ? 'Continue' : 'START'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <BookOpen className="empty-state-icon" />
                  <p className="empty-state-text">No uncompleted tasks found.</p>
                  <p className="empty-state-subtext">Great job! You've completed all your assigned tasks.</p>
                </div>
              )}
            </section>

            {/* Completed Tasks Section */}
            {completedTasks.length > 0 && (
              <section className="assigned-courses completed-tasks">
                <div className="section-header">
                  <h2 className="section-title">Completed Tasks</h2>
                  <div className="section-header-actions">
                    <span className="task-count">{completedTasks.length} completed task(s)</span>
                  </div>
                </div>

                <div className="courses-table-container">
                  <table className="courses-table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-heading">INSTRUCTOR & ASSIGNED DATE</th>
                        <th className="table-heading">TASK DETAILS</th>
                        <th className="table-heading">COMPLETION DATE</th>
                        <th className="table-heading">STATUS</th>
                        <th className="table-heading">CERTIFICATE</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {completedTasks.map((task) => {
                        const certificate = certificates.find(cert => cert.courseTitle === task.taskTitle);
                        
                        return (
                          <tr key={task._id} className="table-row completed-row">
                            <td className="table-cell">
                              <div className="instructor-cell">
                                <div className="instructor-avatar">
                                  <User className="instructor-avatar-icon" />
                                </div>
                                <div className="instructor-info">
                                  <div className="instructor-name">{getAdminNameString(task.assignedBy) || 'Admin'}</div>
                                  {(() => {
                                    const adminNameStr = getAdminNameString(task.assignedBy);
                                    if (adminNameStr && typeof adminNameStr === 'string') {
                                      return (
                                        <div className="admin-name-assignedby">
                                          Assigned by: {adminNameStr}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  <div className="assigned-date">
                                    <Calendar className="date-icon" />
                                    {new Date(task.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="table-cell course-name">
                              <div className="course-details">
                                <div className="course-title">{task.taskTitle}</div>
                                <div className="course-module">Module: {task.module}</div>
                                {task.description && (
                                  <div className="task-description">{task.description}</div>
                                )}
                              </div>
                            </td>
                            <td className="table-cell deadline">
                              <div className="deadline-info">
                                <div className="deadline-date completed">
                                  <Clock className="clock-icon" />
                                  {certificate ? new Date(certificate.completionDate).toLocaleDateString() : 'Completed'}
                                </div>
                              </div>
                            </td>
                            <td className="table-cell status">
                              <div className="status-badge status-success">
                                COMPLETED
                              </div>
                            </td>
                            <td className="table-cell actions">
                              {certificate ? (
                                <div className="certificate-actions">
                                  <button 
                                    className="btn btn-certificate"
                                    onClick={() => {
                                      // Store the specific certificate data and navigate to certificate page
                                      localStorage.setItem('selectedCertificate', JSON.stringify(certificate));
                                      localStorage.setItem('courseCompleted', 'true');
                                      localStorage.setItem('completedCourseName', certificate.courseTitle);
                                      localStorage.setItem('lastGeneratedCertificate', JSON.stringify(certificate));
                                      navigate('/certificate');
                                    }}
                                  >
                                    View Certificate
                                  </button>
                                  
                                </div>
                              ) : (
                                <span className="no-certificate">No Certificate</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;

// Helper to extract email from token if needed
function tokenEmail() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return '';
    // JWT: header.payload.signature
    const payload = token.split('.')[1];
    if (!payload) return '';
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (decoded.email) {
      return decoded.email.split('@')[0];
    }
    return '';
  } catch {
    return '';
  }
}
