import React from 'react';
import { BarChart, Users, Activity, LogOut, BookOpen } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Logout function
  const handleLogout = () => {
    // Clear all authentication data from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('userSession');
    localStorage.removeItem('user');
    localStorage.removeItem('employeeEmail');
    localStorage.removeItem('levelCleared');
    
    // Clear any course completion data
    localStorage.removeItem('courseCompleted');
    localStorage.removeItem('completedCourseName');
    
    // Navigate to main page (landing page)
    navigate('/');
  };

  const sidebarItems = [
    { 
      icon: BarChart, 
      label: 'Reports', 
      path: '/admindashboard', 
      active: location.pathname === '/admindashboard',
      onClick: () => navigate('/admindashboard'),
    },
    {
      icon: BookOpen,
      label: 'Create Courses',
      path: '/createcommoncourses',
      active: location.pathname === '/createcommoncourses',
      onClick: () => navigate('/createcommoncourses'),
    },
    { 
      icon: Users, 
      label: 'Assign Task',  
      path: '/assigntask',
      active: location.pathname === '/assigntask',
      onClick: () => navigate('/assigntask') 
    },
    { 
      icon: Activity, 
      label: 'Activities',  
      path: '/employeetracking',
      active: location.pathname === '/employeetracking',
      onClick: () => navigate('/employeetracking') 
    }
  ];

  // Debug: Log sidebar items to console
  console.log('Sidebar items:', sidebarItems);

  const supportItems = [
    { icon: LogOut, label: 'Logout', onClick: handleLogout }
  ];

  return (
    <div className="sidebar flex flex-col h-full w-64 bg-white border-r border-gray-200 shadow-lg">
      <div className="sidebar-header p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      <div className="sidebar-section flex-1 p-4">
        <div className="sidebar-section-title text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Main
        </div>
        {sidebarItems.map((item, index) => (
          <div
            key={index}
            data-label={item.label}
            className={`sidebar-item flex items-center gap-4 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 mb-1 ${
              item.active 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
            onClick={item.onClick}
            style={{ 
              display: 'flex', 
              visibility: 'visible',
              opacity: 1,
              minHeight: '40px'
            }}
          >
            <item.icon className="sidebar-item-icon w-5 h-5 flex-shrink-0" />
            <span className="font-medium flex-1">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-section p-4 border-t border-gray-200">
        <div className="sidebar-section-title text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Support
        </div>
        {supportItems.map((item, index) => (
          <div 
            key={index} 
            className={`sidebar-item flex items-center gap-4 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 mb-1 ${
              item.label === 'Logout' 
                ? 'text-red-600 hover:bg-red-50 hover:text-red-700' 
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
            onClick={item.onClick}
          >
            <item.icon className="sidebar-item-icon w-5 h-5 flex-shrink-0" />
            <span className="font-medium flex-1">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Admin profile section at bottom */}
      
    </div>
  );
};

export default Sidebar;
