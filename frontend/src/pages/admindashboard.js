import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './admindashboard.css';
import Sidebar from '../components/Sidebar';  // ✅ Import Sidebar component
import { API_ENDPOINTS } from '../config/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BookOpen, 
  Award, 
  Clock, 
  TrendingUp, 
  Download,
  Users
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('ISP');
  const [selectedPeople, setSelectedPeople] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCourses, setActiveCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState(null);
  const [rawReportData, setRawReportData] = useState([]);
  const [reportData, setReportData] = useState({ courses: [], rows: [] });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        console.log('🔍 Admin Dashboard - API URL:', API_ENDPOINTS.ADMIN.DASHBOARD_STATS);
        console.log('🔍 Admin Dashboard - Token:', token ? 'Present' : 'Missing');

  const response = await fetch(API_ENDPOINTS.ADMIN.DASHBOARD_STATS, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          setDashboardData(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch dashboard data');
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const buildReportData = (payload = [], allowedCourses = []) => {
    const allowedSet = allowedCourses.length ? new Set(allowedCourses) : null;
    const courseSet = new Set();
    const rows = [];

    payload.forEach(entry => {
      const employeeName =
        entry.employeeName ||
        entry.employeeId?.name ||
        entry.employeeEmail ||
        'Unknown Employee';
      const employeeEmail = entry.employeeEmail || entry.employeeId?.email || '';
      const courseMap = {};

      (entry.courseAssignments || []).forEach(assignment => {
        const courseName = assignment.courseName;
        if (!courseName) return;
        if (allowedSet && !allowedSet.has(courseName)) {
          return;
        }
        const status = (assignment.status || '').toLowerCase();
        if (status !== 'completed') {
          return;
        }
        courseSet.add(courseName);
        courseMap[courseName] = 'Completed';
      });

      const hasCompleted = Object.values(courseMap).some(value => value === 'Completed');
      if (hasCompleted) {
        rows.push({ employeeName, employeeEmail, courses: courseMap });
      }
    });

    const orderedCourses = allowedSet
      ? allowedCourses.filter(course => courseSet.has(course))
      : Array.from(courseSet).sort((a, b) => a.localeCompare(b));

    const sortedRows = rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

    return { courses: orderedCourses, rows: sortedRows };
  };

  useEffect(() => {
    const fetchCommonCourses = async () => {
      try {
        setCoursesLoading(true);
        setCoursesError(null);
        const response = await fetch(API_ENDPOINTS.COURSES.GET_COURSES);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        const titles = (Array.isArray(result) ? result : [])
          .map(course => course.title)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        setActiveCourses(titles);
      } catch (courseErr) {
        console.error('Error fetching common courses:', courseErr);
        setCoursesError(courseErr.message);
        setActiveCourses([]);
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCommonCourses();
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setReportLoading(true);
        setReportError(null);
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(API_ENDPOINTS.ADMIN.ASSIGNED_COURSE_PROGRESS, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          setRawReportData(result.progress || []);
        } else {
          throw new Error(result.error || 'Failed to fetch course report data');
        }
      } catch (reportErr) {
        console.error('Error fetching course report data:', reportErr);
        setReportError(reportErr.message);
        setRawReportData([]);
      } finally {
        setReportLoading(false);
      }
    };

    fetchReportData();
  }, [navigate]);

  useEffect(() => {
    setReportData(buildReportData(rawReportData, activeCourses));
  }, [rawReportData, activeCourses]);

  const escapeCsv = (value) => {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
  };

  const handleDownloadReport = () => {
    if (!reportData.courses.length || !reportData.rows.length) {
      return;
    }

    const header = ['Employee Name', 'Employee Email', ...reportData.courses];
    const rows = reportData.rows.map(row => {
      const courseStatuses = reportData.courses.map(course => row.courses[course] || '');
      return [row.employeeName, row.employeeEmail || '', ...courseStatuses];
    });

    const csvLines = [header, ...rows]
      .map(line => line.map(escapeCsv).join(','))
      .join('\n');

    const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `course-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Default data for fallback
  const defaultData = {
    totalUsers: 0,
    activeCourses: 0,
    assessmentsCompletedToday: 0,
    certificatesIssuedThisWeek: 0,
    passFailData: [
      { name: 'Pass', value: 0, color: '#10B981' },
      { name: 'Fail', value: 100, color: '#1F2937' }
    ],
    employeeData: [],
    leaderboard: [],
    weakestTopics: [],
    strongestTopics: []
  };

  const data = dashboardData || defaultData;

  // Loading and error states
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-600 font-medium">Error loading dashboard</p>
            <p className="text-gray-600 text-sm mt-2">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
            <div className="flex items-center gap-3">
              {coursesError && (
                <span className="text-sm text-red-600">{coursesError}</span>
              )}
              {reportError && (
                <span className="text-sm text-red-600">{reportError}</span>
              )}
              <button
                onClick={handleDownloadReport}
                disabled={
                  reportLoading ||
                  coursesLoading ||
                  !reportData.courses.length ||
                  !reportData.rows.length
                }
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  reportLoading ||
                  coursesLoading ||
                  !reportData.courses.length ||
                  !reportData.rows.length
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Download className="w-4 h-4 mr-2" />
                {reportLoading || coursesLoading ? 'Preparing...' : 'Download CSV'}
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex gap-4 mt-6">
           
          </div>
        </div>

        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{data.totalUsers}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <BookOpen className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{data.activeCourses}</p>
                </div>
              </div>
            </div>
            
           
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Award className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Certificates Issued This Week</p>
                  <p className="text-2xl font-bold text-gray-900">{data.certificatesIssuedThisWeek}</p>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                    <div 
                      className="bg-blue-600 h-1 rounded-full" 
                      style={{width: `${Math.min(100, (data.certificatesIssuedThisWeek / Math.max(data.totalUsers, 1)) * 100)}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

         

          {/* Employee Learning Chart - Full Width */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">No of Employees Learnt</h3>
           
            </div>
            {data.employeeData && data.employeeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.employeeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p>No learning data available</p>
                  <p className="text-sm">Data will appear when employees complete courses</p>
                </div>
              </div>
            )}
          </div>

          {/* Topics Performance - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Weakest Topics */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Weakest Topics</h3>
              <div className="space-y-4">
                {data.weakestTopics.length > 0 ? data.weakestTopics.map((topic, index) => (
                  <div key={index} className="flex items-center">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{topic.name}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="h-2 rounded-full" 
                          style={{width: `${Math.min(100, (topic.completion / Math.max(data.totalUsers, 1)) * 100)}%`, backgroundColor: topic.color}}
                        ></div>
                      </div>
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-600">
                      {topic.completion} certificates
                    </span>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </div>

            {/* Strongest Topics */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Strongest Topics</h3>
              <div className="space-y-4">
                {data.strongestTopics.length > 0 ? data.strongestTopics.map((topic, index) => (
                  <div key={index} className="flex items-center">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{topic.name}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="h-2 rounded-full" 
                          style={{width: `${Math.min(100, (topic.completion / Math.max(data.totalUsers, 1)) * 100)}%`, backgroundColor: topic.color}}
                        ></div>
                      </div>
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-600">
                      {topic.completion} certificates
                    </span>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row - User Leaderboard and Pass/Fail Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* User Leaderboard */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Leaderboard</h3>
              <div className="space-y-4">
                {data.leaderboard.length > 0 ? data.leaderboard.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.points} Certificates • {user.correct}% Correct</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold text-gray-900 mr-2">{user.rank}</span>
                      <div className={`w-0 h-0 border-l-4 border-r-4 border-transparent ${
                        user.trend === 'up' 
                          ? 'border-b-4 border-b-green-500' 
                          : 'border-t-4 border-t-red-500'
                      }`}></div>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-4">No leaderboard data available</p>
                )}
              </div>
            </div>

            {/* Pass/Fail Chart - Moved to bottom right */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Pass vs Fail Percentage</h3>
              <div className="flex items-center justify-center h-64">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={data.passFailData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {data.passFailData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="ml-6">
                  <div className="flex items-center mb-4">
                    <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                    <span className="text-gray-600">PASS</span>
                  </div>
                  <div className="flex items-center mb-4">
                    <div className="w-4 h-4 bg-gray-800 rounded mr-3"></div>
                    <span className="text-gray-600">FAIL</span>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-gray-900">{data.passFailData[0]?.value || 0}%</p>
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

export default AdminDashboard;
