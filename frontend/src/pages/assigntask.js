import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, BookOpen, Send, X, Search, Check, BarChart, Zap, Activity, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './assigntask.css';
import Sidebar from '../components/Sidebar';  // ✅ import Sidebar component

const TaskAssignment = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    taskTitle: '',
    description: '',
    assignees: [],
    deadline: '',
    priority: 'medium',
    reminderDays: '3'
  });

  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // const sidebarItems = [
  //   { icon: BarChart, label: 'Reports', path: '/admindashboard', active: false },
  //   {
  //     icon: Zap,
  //     label: 'Customization',
  //     path: '/admincourses',
  //     active: false,
  //     onClick: () => navigate('/admincourses'),
  //   },
  //   { 
  //     icon: Users, 
  //     label: 'Assign Task',  
  //     path: '/assigntask',
  //     active: true,
  //     onClick: () => navigate('/assigntask') 
  //   },
  //   { 
  //     icon: Activity, 
  //     label: 'Activities',  
  //     path: '/employeetracking',
  //     active: false,
  //     onClick: () => navigate('/employeetracking') 
  //   }
  // ];

  // const supportItems = [
  //   { icon: HelpCircle, label: 'Get Started' },
  //   { icon: Settings, label: 'Settings' }
  // ];

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setCoursesLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required. Please log in again.');
          setCourses([]);
          setCoursesLoading(false);
          return;
        }

        // Fetch common courses instead of admin courses
        const response = await fetch('/api/courses/getcourse', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Courses API Error Response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();
        console.log('Common Courses API Response:', result);
        
        let courseData;
        if (result && Array.isArray(result)) {
          courseData = result;
        } else {
          console.error('Unexpected courses response format:', result);
          setError('Unexpected response format from courses server.');
          setCourses([]);
          setCoursesLoading(false);
          return;
        }

        // Extract title from common courses (common courses use 'title', not 'name')
        const courseTitles = courseData.map(course => course.title).filter(Boolean);
        setCourses(courseTitles);
        console.log('Available common course titles:', courseTitles);
      } catch (err) {
        console.error('Error fetching common courses:', err);
        setError(`Failed to load courses: ${err.message}`);
        setCourses([]);
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required. Please log in again.');
          setEmployees([]);
          setLoading(false);
          return;
        }

          const response = await fetch('/api/employee/employees', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();
        console.log('Employee API Response:', result);
        
        let employeeData;
        if (result.employees && Array.isArray(result.employees)) {
          employeeData = result.employees;
        } else if (Array.isArray(result)) {
          employeeData = result;
        } else {
          console.error('Unexpected response format:', result);
          setError('Unexpected response format from server.');
          setEmployees([]);
          setLoading(false);
          return;
        }

        const validEmployees = employeeData.filter(emp => 
          emp.email && typeof emp.email === 'string' && 
          emp._id && emp._id.length === 24
        );
        if (validEmployees.length !== employeeData.length) {
          console.warn('Some employees are missing required fields:', employeeData);
          setError('Some employee data is invalid (missing email or ID).');
        }
        setEmployees(validEmployees);
      } catch (err) {
        console.error('Error fetching employees:', err);
        setError(`Failed to load employees: ${err.message}`);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#2ed573';
      default: return '#ffa502';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmployeeSelect = (employee) => {
    if (!employee._id || employee._id.length !== 24) {
      console.error('Invalid employee ID:', employee);
      setError('Cannot select employee with invalid ID.');
      return;
    }
    const isSelected = selectedEmployees.find(emp => emp._id === employee._id);
    if (isSelected) {
      setSelectedEmployees(prev => prev.filter(emp => emp._id !== employee._id));
    } else {
      setSelectedEmployees(prev => [...prev, employee]);
    }
    console.log('Updated selectedEmployees:', selectedEmployees);
  };

  const removeEmployee = (employeeId) => {
    setSelectedEmployees(prev => prev.filter(emp => emp._id !== employeeId));
  };

  const getFilteredEmployees = () => {
    return employees.filter(employee =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('=== Submitting Task ===');
    console.log('Form Data:', formData);
    console.log('Selected Employees:', selectedEmployees);

    const requiredFields = ['taskTitle', 'description', 'deadline'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      setError(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    if (!selectedEmployees.length) {
      setError('Please select at least one employee');
      return;
    }

    const invalidEmployees = selectedEmployees.filter(emp => !emp._id || emp._id.length !== 24 || !emp.email);
    if (invalidEmployees.length > 0) {
      setError('Invalid employee data detected');
      console.error('Invalid employees:', invalidEmployees);
      return;
    }

    const deadlineDate = new Date(formData.deadline);
    if (isNaN(deadlineDate.getTime())) {
      setError('Invalid deadline format');
      return;
    }

    const taskData = {
      taskTitle: formData.taskTitle,
      description: formData.description,
      deadline: formData.deadline,
      priority: formData.priority || 'medium',
      reminderDays: formData.reminderDays ? parseInt(formData.reminderDays) : 3,
      assignees: selectedEmployees.map(emp => ({
        id: emp._id,
        name: emp.name,
        employeeEmail: emp.email,
        department: emp.department
      }))
    };

    let result = null;
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);
      console.log('Sending taskData:', JSON.stringify(taskData, null, 2));
  const response = await fetch('/api/assigned-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(taskData)
      });

      result = await response.json();
      console.log('API Response:', result);

      if (!response.ok) {
        throw new Error(
          result.error || `Failed to assign task: ${result.details || 'Unknown error'}`
        );
      }

      setSuccess('Task assigned successfully!');
      setFormData({
        taskTitle: '',
        description: '',
        assignees: [],
        deadline: '',
        priority: 'medium',
        reminderDays: '3'
      });
      setSelectedEmployees([]);
    } catch (error) {
      console.error('Submission error:', error);
      const errorDetails = result && result.missingFields
        ? ` - ${result.missingFields.join(', ')}`
        : ' - Check server logs for details';
      setError(`Error: ${error.message}${errorDetails}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    console.log('Token exists:', !!token);
    
    if (!token) {
      console.log('No token found!');
      return false;
    }
    
    try {
  const response = await fetch('/api/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      console.log('Token verification result:', result);
      
      if (result.valid && result.user.role === 'admin') {
        console.log('Token is valid and user is admin');
        return true;
      } else {
        console.log('Token invalid or user is not admin');
        return false;
      }
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  };

  const filteredEmployees = getFilteredEmployees();

  return (
   <div className="task-assignment-page flex h-screen w-screen absolute top-0 left-0">

        <Sidebar />
   
      <div className="flex-1 overflow-auto">
        <div className="container">
          <div className="main-wrapper">
            <div className="header-card animate-fade-in">
              <div className="header-content">
                <div className="header-icon-wrapper">
                  <BookOpen className="header-icon" size={24} />
                </div>
                <div>
                  <h1 className="header-title">Assign Learning Task</h1>
                  <p className="header-subtitle">Create and assign e-learning modules to employees with deadlines</p>
                </div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-card animate-slide-up">
                <div className="space-y-8">
                  <div className="form-group">
                    <label className="form-label">
                      Task Title (Course) *
                    </label>
                    {coursesLoading ? (
                      <div className="form-input loading">Loading courses...</div>
                    ) : (
                      <>
                        <select
                          name="taskTitle"
                          value={formData.taskTitle}
                          onChange={handleInputChange}
                          className="form-select"
                          required
                        >
                          <option value="">Select a common course to assign</option>
                          {courses.map((course, index) => (
                            <option key={index} value={course}>{course}</option>
                          ))}
                        </select>
                      </>
                    )}
                    {courses.length === 0 && !coursesLoading && (
                      <p className="text-sm text-gray-500 mt-1">No common courses available. Please create common courses first.</p>
                    )}
                    {error && error.includes('courses') && (
                      <p className="text-sm text-red-500 mt-1">Failed to load common courses. Please try again or create a common course first.</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Provide detailed instructions for the task..."
                      rows="4"
                      className="form-textarea"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Priority
                    </label>
                    <div className="flex items-center space-x-2">
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="form-select flex-1"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <div
                        className="priority-indicator"
                        style={{ backgroundColor: getPriorityColor(formData.priority) }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Deadline *
                    </label>
                    <input
                      type="datetime-local"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Reminder (Days Before)
                    </label>
                    <select
                      name="reminderDays"
                      value={formData.reminderDays}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="1">1 Day</option>
                      <option value="3">3 Days</option>
                      <option value="7">1 Week</option>
                      <option value="14">2 Weeks</option>
                    </select>
                  </div>

                  <div className="submit-section">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="submit-btn"
                    >
                      <Send size={18} />
                      <span>{isSubmitting ? 'Assigning...' : 'Assign Task'}</span>
                    </button>
                  </div>

                  {error && (
                    <div className="error-message animate-slide-down">
                      <div className="font-medium mb-2">Error:</div>
                      <div>{error}</div>
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer font-medium">Debug Information</summary>
                        <div className="mt-2 p-2 bg-red-100 rounded">
                          <p>Selected employees: {selectedEmployees.length}</p>
                          <p>Task title: {formData.taskTitle || 'Not set'}</p>
                          <p>Deadline: {formData.deadline || 'Not set'}</p>
                          <p>Check browser console for more details</p>
                        </div>
                      </details>
                    </div>
                  )}
                  {success && (
                    <div className="success-message animate-slide-down">
                      {success}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-card animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Select Employees ({selectedEmployees.length} selected)
                  </h3>
                  {selectedEmployees.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedEmployees([])}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="employee-selector mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search employees by name, email, or department..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="form-input pl-10"
                    />
                  </div>
                </div>

                {/* Employee List */}
                <div className="employee-list">
                  {loading ? (
                    <div className="p-4 text-center text-gray-500 loading">Loading employees...</div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No employees found</div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredEmployees.map((employee) => (
                        <div
                          key={employee._id}
                          onClick={() => handleEmployeeSelect(employee)}
                          className={`employee-item animate-slide-in-right cursor-pointer p-3 rounded-lg border transition-all ${
                            selectedEmployees.find((emp) => emp._id === employee._id)
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="employee-name font-medium">{employee.name}</div>
                              <div className="employee-department text-sm text-gray-500">{employee.department}</div>
                              <div className="employee-email text-xs text-gray-400">{employee.email}</div>
                            </div>
                            {selectedEmployees.find((emp) => emp._id === employee._id) && (
                              <Check size={16} className="text-green-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedEmployees.length > 0 && (
                  <div className="selected-employees animate-slide-up mt-4">
                    <div className="selected-title">Selected Employees</div>
                    <div className="employee-tags">
                      {selectedEmployees.map((employee) => (
                        <div key={employee._id} className="employee-tag animate-slide-in-right">
                          <span className="employee-tag-name">{employee.name}</span>
                          <button
                            onClick={() => removeEmployee(employee._id)}
                            className="employee-tag-remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="preview-card animate-slide-up">
                <h2 className="preview-title">Task Preview</h2>
                <div className="preview-grid">
                  <div className="preview-column">
                    <div className="preview-item">
                      <span className="preview-label">Task Title:</span>
                      <span className="preview-value">{formData.taskTitle || 'Not set'}</span>
                    </div>
                    <div className="preview-item">
                      <span className="preview-label">Priority:</span>
                      <span className="preview-value">
                        {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}
                        <span
                          className="priority-badge"
                          style={{ backgroundColor: getPriorityColor(formData.priority) }}
                        >
                          {formData.priority.toUpperCase()}
                        </span>
                      </span>
                    </div>
                    <div className="preview-item">
                      <span className="preview-label">Deadline:</span>
                      <span className="preview-value">
                        {formData.deadline
                          ? new Date(formData.deadline).toLocaleString()
                          : 'Not set'}
                      </span>
                    </div>
                    <div className="preview-item">
                      <span className="preview-label">Reminder:</span>
                      <span className="preview-value">{formData.reminderDays} days before</span>
                    </div>
                  </div>
                  <div className="preview-column">
                    <div className="preview-item">
                      <span className="preview-label">Description:</span>
                      <span className="preview-value">{formData.description || 'Not set'}</span>
                    </div>
                    <div className="preview-item">
                      <span className="preview-label">Assignees:</span>
                      <span className="preview-value">
                        {selectedEmployees.length > 0
                          ? selectedEmployees.map(emp => emp.name).join(', ')
                          : 'None selected'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskAssignment;
