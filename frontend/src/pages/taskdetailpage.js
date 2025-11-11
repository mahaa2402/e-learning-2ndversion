// frontend/src/pages/taskdetailpage.js
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Calendar, Clock, User, ChevronLeft, Play, FileText, BookOpen, Award } from 'lucide-react';
import './taskdetail.css';

const TaskDetailPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [task, setTask] = useState(state?.task || null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [videos, setVideos] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getAdminNameString = (assignedBy) => {
    if (!assignedBy) return 'Admin';
    if (typeof assignedBy.adminName === 'string') return assignedBy.adminName;
    return assignedBy.adminEmail?.split('@')[0] || 'Admin';
  };

  const fetchTaskDetails = async () => {
    if (!task?._id) {
      setError('No task ID provided.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

  const response = await fetch(`/api/assigned-tasks/${task._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'GET',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        } else if (response.status === 404) {
          throw new Error('Task not found or invalid task ID.');
        }
        const errorText = await response.text();
        throw new Error(`Failed to fetch task details: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      let fetchedTask = data.task || data;

      if (!fetchedTask?._id) {
        setTask(null);
        throw new Error('Task not found.');
      }

      fetchedTask.videos = fetchedTask.videos || [];
      fetchedTask.quizzes = fetchedTask.quizzes || [];
      setTask(fetchedTask);

      const fetchedVideos = Array.isArray(fetchedTask.videos) ? fetchedTask.videos.map(video => ({
        id: video._id || video.id,
        title: video.title || 'Untitled Video',
        url: video.url || '#',
        thumbnail: video.thumbnail || '/api/placeholder/300/180',
        duration: video.duration || 'Unknown duration'
      })) : [];
      setVideos(fetchedVideos);

      const fetchedQuizzes = Array.isArray(fetchedTask.quizzes) ? fetchedTask.quizzes.map(quiz => ({
        id: quiz._id || quiz.id,
        title: quiz.title || 'Untitled Quiz',
        questions: quiz.questions || [],
        passingScore: quiz.passingScore || 70
      })) : [];
      setQuizzes(fetchedQuizzes);
    } catch (error) {
      console.error('Error fetching task details:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseDetails = async (taskTitle) => {
    if (!taskTitle) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication token not found');
        return;
      }

      console.log('Fetching course details for task title:', taskTitle);
      
  const response = await fetch(`/api/admin/courses/name/${encodeURIComponent(taskTitle)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Course details fetched:', data.course);
        setCourseDetails(data.course);
      } else if (response.status === 404) {
        console.log('No course found for task title:', taskTitle);
        setCourseDetails(null);
      } else {
        console.error('Failed to fetch course details:', response.status);
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, []);

  useEffect(() => {
    if (task?.taskTitle) {
      fetchCourseDetails(task.taskTitle);
    }
  }, [task?.taskTitle]);

  const isOverdue = (deadline) => {
    return new Date(deadline) < new Date() && new Date().getTime() - new Date(deadline).getTime() > 0;
  };

  const getDaysRemaining = (deadline) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff > 0 ? daysDiff : 0;
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'in-progress': return 'warning';
      case 'assigned': return 'info';
      case 'overdue': return 'danger';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="task-detail-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-detail-page">
        <div className="error-state">
          <AlertCircle className="error-icon" />
          <p className="error-text">Error: {error}</p>
          <button className="task-detail-btn task-detail-btn-primary" onClick={fetchTaskDetails}>Retry</button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="task-detail-page">
        <div className="empty-state">
          <AlertCircle className="empty-state-icon" />
          <p className="empty-state-text">No task data available.</p>
          <button className="task-detail-btn task-detail-btn-secondary" onClick={() => navigate(-1)}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-detail-page">
      {/* Header */}
      <header className="task-detail-header">
        <div className="task-detail-header-container">
          <div className="task-detail-header-content">
            <div className="task-detail-logo-section">
              <div className="task-detail-logo">VISTA</div>
              <div className="task-detail-logo-subtitle">InnovativeLearning</div>
            </div>
            <nav className="task-detail-nav">
              <button className="task-detail-nav-link" onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button className="task-detail-nav-link active">Task Details</button>
              <button className="task-detail-nav-link" onClick={() => navigate('/profile')}>Profile</button>
            </nav>
            <div className="task-detail-header-actions">
              <button 
                className="task-detail-btn task-detail-btn-secondary"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft className="task-detail-btn-icon" />
                Back
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="task-detail-hero">
        <div className="task-detail-hero-container">
          <div className="task-detail-hero-content">
            <div className="task-detail-info">
              <div className="task-detail-category">
                {task.priority?.toUpperCase()} PRIORITY
              </div>
              <h1 className="task-detail-title">{task.taskTitle}</h1>
              <p className="task-detail-description">
                {task.description || 'Complete this assigned task to enhance your learning experience.'}
              </p>

              <div className="task-detail-stats">
                <div className="task-detail-stat-item">
                  <Calendar className="task-detail-stat-icon" />
                  <span>Assigned: {new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="task-detail-stat-item">
                  <Clock className="task-detail-stat-icon" />
                  <span>
                    {isOverdue(task.deadline) 
                      ? 'OVERDUE' 
                      : getDaysRemaining(task.deadline) === 0 
                        ? 'Due Today' 
                        : `${getDaysRemaining(task.deadline)} days left`}
                  </span>
                </div>
                {courseDetails && courseDetails.modules && (
                  <div className="task-detail-stat-item">
                    <BookOpen className="task-detail-stat-icon" />
                    <span>{courseDetails.modules.length} Modules</span>
                  </div>
                )}
              </div>

              <div className="task-detail-instructor-info">
                <div className="task-detail-instructor-avatar">
                  <User className="task-detail-instructor-icon" />
                </div>
                <div>
                  <div className="task-detail-instructor-name">
                    {getAdminNameString(task.assignedBy)}
                  </div>
                  <div className="task-detail-instructor-role">Task Administrator</div>
                </div>
              </div>

              <div className="task-detail-tags">
                <span className="task-detail-tag">
                  Due: {new Date(task.deadline).toLocaleDateString()}
                </span>
                <span className="task-detail-tag">
                  Status: {task.status || 'Assigned'}
                </span>
              </div>
            </div>

            <div className="task-detail-thumbnail">
              <img 
                src={courseDetails?.thumbnail || "/api/placeholder/400/250"} 
                alt={task.taskTitle} 
              />
              <div className="task-detail-play-overlay">
                <Play className="task-detail-play-icon" />
                <span>Start Task</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Progress Section */}
      {courseDetails && courseDetails.modules && courseDetails.modules.length > 0 && (
        <section className="task-detail-progress-section">
          <div className="task-detail-progress-container">
            <div className="task-detail-progress-steps">
              <div className="task-detail-step active">
                <div className="task-detail-step-number">1</div>
                <div>
                  <div className="task-detail-step-title">Review Content</div>
                  <div className="task-detail-step-status">Start with course materials</div>
                </div>
              </div>
              <div className="task-detail-step">
                <div className="task-detail-step-number">2</div>
                <div>
                  <div className="task-detail-step-title">Complete Modules</div>
                  <div className="task-detail-step-status">Work through all sections</div>
                </div>
              </div>
              <div className="task-detail-step">
                <div className="task-detail-step-number">3</div>
                <div>
                  <div className="task-detail-step-title">Submit Task</div>
                  <div className="task-detail-step-status">Mark as completed</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Course Modules Section */}
      {courseDetails && courseDetails.modules && courseDetails.modules.length > 0 && (
        <section className="task-detail-outline-section">
          <div className="task-detail-outline-container">
            <h2 className="task-detail-section-title">Course Modules</h2>
            <div className="task-detail-outline-list">
              {courseDetails.modules.map((module, index) => (
                <div key={index} className="task-detail-outline-item">
                  <div className="task-detail-outline-header">
                    <div className="task-detail-outline-number">{String(index + 1).padStart(2, '0')}</div>
                    <div className="task-detail-outline-content">
                      <h3 className="task-detail-outline-title">{module.title || `Module ${index + 1}`}</h3>
                      <p className="task-detail-outline-description">
                        {module.description || 'Complete this module to progress through the task.'}
                      </p>
                      <div className="task-detail-outline-meta">
                        {module.video && module.video.title && (
                          <span className="task-detail-outline-duration">
                            <Play className="task-detail-meta-icon" />
                            Video: {module.video.title}
                          </span>
                        )}
                        {module.quiz && module.quiz.questions && module.quiz.questions.length > 0 && (
                          <span className="task-detail-outline-duration">
                            <FileText className="task-detail-meta-icon" />
                            Quiz: {module.quiz.questions.length} questions
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="task-detail-outline-actions">
             <div className="task-detail-outline-actions">                       
  <button                          
    className="task-detail-btn task-detail-btn-start"                        
    onClick={() => navigate(`/course/${courseDetails.name}/module/${index}`, {   
      state: { 
        taskDetails: task,
        courseDetails: courseDetails,  // Pass the full course data
        selectedModule: courseDetails.modules[index]  // Pass the specific module
      } 
    })}
  >
    Start Module
  </button>
</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Course Information Section */}
      {courseDetails && (
        <section className="task-detail-info-section">
          <div className="task-detail-info-container">
            <h2 className="task-detail-section-title">Course Information</h2>
            <div className="task-detail-info-grid">
              <div className="task-detail-info-card">
                <div className="task-detail-info-header">
                  <BookOpen className="task-detail-info-icon" />
                  <h3>Course Details</h3>
                </div>
                <div className="task-detail-info-content">
                  <p><strong>Name:</strong> {courseDetails.name}</p>
                  <p><strong>Category:</strong> {courseDetails.category || 'N/A'}</p>
                  <p><strong>Duration:</strong> {courseDetails.duration || 'N/A'}</p>
                  {courseDetails.description && (
                    <p><strong>Description:</strong> {courseDetails.description}</p>
                  )}
                </div>
              </div>
              
              <div className="task-detail-info-card">
                <div className="task-detail-info-header">
                  <Award className="task-detail-info-icon" />
                  <h3>Task Requirements</h3>
                </div>
                <div className="task-detail-info-content">
                  <p><strong>Priority:</strong> {task.priority?.toUpperCase()}</p>
                  <p><strong>Deadline:</strong> {new Date(task.deadline).toLocaleDateString()}</p>
                  <p><strong>Status:</strong> {task.status || 'Assigned'}</p>
                  <p><strong>Assigned By:</strong> {getAdminNameString(task.assignedBy)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="task-detail-actions-section">
        <div className="task-detail-actions-container">
          <div className="task-detail-actions-content">
            <div className="task-detail-actions-info">
              <h3>Ready to complete your task?</h3>
              <p>Start working through the course modules to complete this assigned task successfully.</p>
            </div>
            <div className="task-detail-actions-buttons">
              {courseDetails && courseDetails.modules && courseDetails.modules.length > 0 && (
                <button 
                  className="task-detail-btn task-detail-btn-primary task-detail-btn-large"
                  onClick={() => navigate('/taskmodulepage', {
                    state: {
                      courseDetails: courseDetails,
                      selectedModule: courseDetails.modules[0],
                      taskDetails: task
                    }
                  })}
                >
                  <Play className="task-detail-btn-icon" />
                  Start Task
                </button>
              )}
              <button 
                className="task-detail-btn task-detail-btn-outline task-detail-btn-large"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft className="task-detail-btn-icon" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TaskDetailPage;
