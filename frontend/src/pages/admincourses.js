import React, { useState, useEffect, useRef } from 'react';
import axios from "axios";
import Sidebar from '../components/Sidebar';
import { API_ENDPOINTS } from '../config/api';
import './admincourses.css';

import { Plus, Edit, Trash2, Eye, Video, Search, Filter, PlayCircle, ChevronDown, ChevronUp, X, Save, Clock, CheckCircle, Upload } from "lucide-react";

const CourseAdminDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [activeTab, setActiveTab] = useState('basic');
  const [expandedModules, setExpandedModules] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const videoInputRefs = useRef({});
  const modalRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    duration: '',
    status: 'Draft',
    modules: [],
    createdDate: '2025-07-03',
    enrollments: 0
  });

  const [currentModule, setCurrentModule] = useState({
    id: '',
    title: '',
    video: null,
    quiz: {
      questions: [],
      passingScore: 70
    }
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    type: 'multiple-choice',
    options: ['', '', '', ''],
    correctAnswer: 0,
    points: 1
  });

  const categories = ['Security', 'HR & Compliance', 'Technical', 'Soft Skills', 'Leadership'];
  const questionTypes = ['multiple-choice', 'true-false', 'fill-in-blank'];

  // Using API_ENDPOINTS from config instead of hardcoded URL
;

  // Add a function to fetch courses and expose it for reuse
  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN.COURSES, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setCourses(data.map(course => ({
          ...course,
          id: course._id,
          name: course.name || 'Untitled',
          description: course.description || 'No description',
          duration: course.duration || 'N/A',
          modules: course.modules || [],
          enrollments: course.enrollments || 0,
          status: course.status || 'Draft'
        })));
      } else {
        throw new Error('Invalid data format: Expected an array');
      }
    } catch (err) {
      setError(`Error fetching courses: ${err.message}`);
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

   useEffect(() => {
    fetchCourses();
  }, []);

  // Debug: Monitor form data changes
  useEffect(() => {
    console.log("🔍 Form data changed:", {
      modulesCount: formData.modules?.length || 0,
      pendingUploads: formData.modules?.filter(m => m.video?.pendingUpload).length || 0,
      modules: formData.modules
    });
  }, [formData.modules]);

  // Ensure modal scrolls to top when opened
  useEffect(() => {
    if (showModal) {
      // Scroll to top immediately when modal opens
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Also ensure the modal content is visible after a short delay
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  }, [showModal]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      duration: '',
      status: 'Draft',
      modules: [],
      createdDate: '2025-07-03',
      enrollments: 0
    });
    setCurrentModule({
      id: '',
      title: '',
      video: null,
      quiz: {
        questions: [],
        passingScore: 70,
      }
    });
    setCurrentQuestion({
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 1
    });
    setActiveTab('basic');
    setExpandedModules({});
  };

  const openModal = (course = null) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        ...course,
        id: course._id
      });
    } else {
      setEditingCourse(null);
      resetForm();
    }
    setShowModal(true);
    
    // Immediate scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Additional scroll to ensure modal is visible
    setTimeout(() => {
      if (modalRef.current) {
        modalRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start'
        });
      }
    }, 200);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCourse(null);
    resetForm();
  };
  
const handleSave = async () => {
  if (!formData.name || !formData.description) {
    setError("Please fill in all required fields");
    return;
  }

  const courseData = {
    name: formData.name,
    description: formData.description,
    category: formData.category || "General",
    duration: formData.duration || "TBD",
    status: formData.status || "Draft",
    modules: (formData.modules || []).map((module) => ({
      title: module.title,
      quiz: {
        questions: (module.quiz?.questions || []).map((q) => ({
          question: q.question,
          type: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
        })),
        passingScore: module.quiz?.passingScore || 0,
      },
    })),
    createdDate: formData.createdDate || "2025-07-03",
    enrollments: formData.enrollments || 0,
  };

  setIsLoading(true);
  try {
    let response, savedCourse;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    };

         console.log("🔍 Course data being saved:", courseData);
     console.log("🔍 Current form data:", formData);
     console.log("🔍 Editing course:", editingCourse);

     if (editingCourse) {
       // ✅ Update existing course
       console.log("📝 Updating existing course:", editingCourse.name, "→", formData.name);
       response = await fetch(
         `${API_ENDPOINTS.ADMIN.COURSES}/${editingCourse._id}`,
         { method: "PUT", headers, body: JSON.stringify(courseData) }
       );
       if (!response.ok) throw new Error("Failed to update course");
       savedCourse = { _id: editingCourse._id }; // reuse existing course ID
       console.log("✅ Course updated successfully");
     } else {
       // ✅ Create new course
       console.log("📝 Creating new course:", formData.name);
       response = await fetch(API_ENDPOINTS.ADMIN.COURSES, {
         method: "POST",
         headers,
         body: JSON.stringify(courseData),
       });
       if (!response.ok) throw new Error("Failed to create course");
       savedCourse = await response.json(); // get new ID
       console.log("✅ Course created successfully");
     }

    console.log("✅ Course saved successfully!", savedCourse);

         // --- Upload videos if pending ---
     for (let i = 0; i < formData.modules.length; i++) {
       const module = formData.modules[i];
       if (module.video?.file && module.video?.pendingUpload) {
         console.log(`📤 Uploading video for module ${i + 1}: ${module.title}`);

         const formDataToSend = new FormData();
         formDataToSend.append("video", module.video.file);

         // Use course name instead of ID for consistent S3 folder structure
         if (!formData.name || formData.name.trim() === '') {
           console.error('❌ Course name is empty or undefined');
           alert('Course name is required for video upload');
           continue; // Skip this module
         }
         
         const courseName = formData.name.replace(/\s+/g, '_');
         const moduleNumber = i + 1;

         console.log(`📤 Course details:`, {
           originalName: formData.name,
           sanitizedName: courseName,
           moduleNumber: moduleNumber,
           moduleTitle: module.title
         });
         console.log(`📤 Uploading to: ${courseName}/Module${moduleNumber}`);

         const res = await axios.post(
           `${API_ENDPOINTS.VIDEOS.UPLOAD}/${courseName}/${moduleNumber}`,
           formDataToSend,
           {
             headers: {
               "Content-Type": "multipart/form-data",
               Authorization: `Bearer ${localStorage.getItem("authToken")}`,
             },
             timeout: 30000,
           }
         );

         if (res.data.success) {
           console.log(`✅ Video uploaded for module ${i + 1} to ${courseName}/Module${moduleNumber}`);
         }
       }
     }

    alert("Course and videos saved successfully! 🎉");
    closeModal();

  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};


  const handleDelete = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        const response = await fetch(`${API_ENDPOINTS.ADMIN.COURSES}/${courseId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        if (!response.ok) throw new Error(`Failed to delete course: ${response.statusText}`);
        // Instead of updating state locally, re-fetch all courses for consistency
        await fetchCourses();
      } catch (err) {
        setError('Error deleting course: ' + err.message);
      }
    }
  };

  const addModule = () => {
    if (formData.modules.length >= 5) {
      alert('Maximum 5 modules allowed per course');
      return;
    }

    if (!currentModule.title) {
      alert('Please enter module title');
      return;
    }

    if (!currentModule.video) {
      alert('Please upload a video for this module');
      return;
    }

    if (currentModule.quiz.questions.length === 0) {
      alert('Please add at least one quiz question for this module');
      return;
    }

    // Simple: just add module locally
    const newModule = {
      ...currentModule,
      id: `mod${formData.modules.length + 1}`,
      video: {
        ...currentModule.video,
        pendingUpload: true // Mark for later upload
      },
      quiz: {
        ...currentModule.quiz,
        questions: [...currentModule.quiz.questions]
      }
    };

    setFormData({
      ...formData,
      modules: [...formData.modules, newModule]
    });

    setCurrentModule({
      id: '',
      title: '',
      video: null,
      quiz: {
        questions: [],
        passingScore: 70
      }
    });

    console.log("✅ Module added locally - ready for video upload");
  };

  const removeModule = (moduleIndex) => {
    setFormData({
      ...formData,
      modules: formData.modules.filter((_, index) => index !== moduleIndex)
    });
  };

  // Test backend connection
  const testBackendConnection = async () => {
    console.log('🔍 Testing backend connection...');
    
    try {
      // Test basic connectivity
      const response = await axios.get(API_ENDPOINTS.VIDEOS.HEALTH, { timeout: 5000 });
      console.log('✅ Backend health check successful:', response.data);
      alert('Backend is accessible! ✅\n\nVideo upload service is running.');
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      
      if (error.response?.status === 404) {
        alert('Backend is running but health endpoint not found.\n\nThis might mean:\n1. Backend server needs restart\n2. Route not properly registered\n\nTry restarting your backend server.');
      } else if (error.response?.status === 500) {
        alert('Backend server error (500).\n\nThis usually means:\n1. AWS credentials are missing\n2. Environment variables not set\n3. Server configuration error\n\nCheck your backend console for errors.');
      } else if (error.code === 'ECONNREFUSED') {
        alert('Backend server is not running.\n\nPlease start your backend server first.');
      } else {
        alert(`Backend connection failed: ${error.message}\n\nStatus: ${error.response?.status || 'Unknown'}`);
      }
    }
  };

  // Simple video upload function
  const handleUploadPendingVideos = async () => {
    if (!formData.name) {
      alert('Please enter a course name first');
      return;
    }

    if (!formData.modules || formData.modules.length === 0) {
      alert('Please add at least one module with video');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📤 Starting simple video upload...');
      
      // Upload each module video to AWS S3
      for (let i = 0; i < formData.modules.length; i++) {
        const module = formData.modules[i];
        if (module.video && module.video.file) {
          console.log(`📤 Uploading video for module ${i + 1}: ${module.title}`);
          
          const formDataToSend = new FormData();
          formDataToSend.append("video", module.video.file);
          
          // Use course name and module number for S3 path
          const courseName = formData.name.replace(/\s+/g, '_');
          const moduleNumber = i + 1;
          
          const res = await axios.post(
            `${API_ENDPOINTS.VIDEOS.UPLOAD}/${courseName}/${moduleNumber}`,
            formDataToSend,
            {
              headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${localStorage.getItem("authToken")}`,
              },
              timeout: 30000,
            }
          );

          if (res.data.success) {
            console.log(`✅ Video uploaded for module ${moduleNumber}: ${module.title}`);
            
            // Update module with S3 video data
            const updatedModules = [...formData.modules];
            updatedModules[i].video = {
              ...updatedModules[i].video,
              url: res.data.video.url,
              s3Key: res.data.video.s3Key,
              uploadedAt: res.data.video.uploadedAt,
              pendingUpload: false
            };
            
            setFormData({ ...formData, modules: updatedModules });
          }
        }
      }
      
      alert('All videos uploaded successfully to AWS S3! 🎉');
      closeModal();
      
    } catch (error) {
      console.error('Failed to upload videos:', error);
      
      if (error.response?.status === 500) {
        alert('Server error (500). Check if AWS credentials are configured in backend.');
      } else {
        alert(`Video upload failed: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Simple video upload function - no complex logic needed

  
 const handleVideoUpload = async (e, moduleIndex) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("video/")) {
    alert("Please select a valid video file");
    return;
  }

  // Validate file size (500MB limit)
  if (file.size > 500 * 1024 * 1024) {
    alert("Video file size must be less than 500MB");
    return;
  }

  try {
    // ✅ Handle "new module" case
    if (moduleIndex === "new") {
      setCurrentModule({
        ...currentModule,
        video: {
          file,
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
          type: file.type,
        },
      });
      return;
    }

    // ✅ Step 1: Ensure course is saved and has a real ID
    let courseId = editingCourse?._id || formData._id; 
    if (!courseId) {
      console.log("Saving new course before uploading video...");
      const saveRes = await axios.post(
        API_ENDPOINTS.ADMIN.COURSES,
        formData,
        { headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } }
      );

      // Update state with saved course
      courseId = saveRes.data._id;
      setFormData(saveRes.data);

      console.log("Course saved, new ID:", courseId);
    }

    // ✅ Step 2: Ensure moduleId exists
    let moduleId = formData.modules[moduleIndex]?._id || formData.modules[moduleIndex]?.id;
    if (!moduleId) {
      moduleId = `temp_${Date.now()}_${moduleIndex}`;
    }

    // ✅ Step 3: Upload video to backend
    const formDataToSend = new FormData();
    formDataToSend.append("video", file);

    const res = await axios.post(
      `${API_ENDPOINTS.VIDEOS.UPLOAD}/${courseId}/${moduleId}`,
      formDataToSend,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      }
    );

    // ✅ Step 4: Update module with video metadata
    if (res.data.success) {
      const updatedModules = [...formData.modules];
      updatedModules[moduleIndex].video = {
        url: res.data.videoUrl, // matches backend after we fix response
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        type: file.type,
        s3Key: res.data.s3Key,
        uploadedAt: res.data.uploadDate,
      };

      setFormData({ ...formData, modules: updatedModules });

      console.log("✅ Video uploaded successfully for module", moduleId);
    }
  } catch (error) {
    if (error.response) {
      console.error("Video upload failed:", error.response.data);
      alert("Upload failed: " + (error.response.data.error || "Server error"));
    } else if (error.request) {
      console.error("No response received:", error.request);
      alert("Upload failed: No response from server");
    } else {
      console.error("Error setting up request:", error.message);
      alert("Upload failed: " + error.message);
    }
  }
};


  

  const addQuestionToModule = () => {
    if (!currentQuestion.question) {
      alert('Please enter a question');
      return;
    }

    if (currentQuestion.type === 'multiple-choice' && currentQuestion.options.some(opt => !opt)) {
      alert('Please fill in all answer options for multiple-choice questions');
      return;
    }

    if (currentQuestion.type === 'true-false' && currentQuestion.correctAnswer === null) {
      alert('Please select the correct answer for true-false questions');
      return;
    }

    const newQuestion = {
      ...currentQuestion,
      id: Date.now(),
      options: currentQuestion.type === 'true-false' ? ['True', 'False'] : currentQuestion.options
    };

    setCurrentModule({
      ...currentModule,
      quiz: {
        ...currentModule.quiz,
        questions: [...currentModule.quiz.questions, newQuestion]
      }
    });

    setCurrentQuestion({
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 1
    });
  };

  const removeQuestionFromModule = (questionIndex) => {
    setCurrentModule({
      ...currentModule,
      quiz: {
        ...currentModule.quiz,
        questions: currentModule.quiz.questions.filter((_, index) => index !== questionIndex)
      }
    });
  };

  const toggleModuleExpansion = (moduleIndex) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleIndex]: !prev[moduleIndex]
    }));
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = (course.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (course.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || course.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Published': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="admin-dashboard flex h-screen">
      <Sidebar />
      
      <div className="main-content flex-1 overflow-auto">
        <div className="content-wrapper">
          {error && (
            <div className="error-alert">
              <span>{error}</span>
              <button className="error-close" onClick={() => setError(null)}>×</button>
            </div>
          )}

          <div className="header-sectionn">
            <div className="header-content">
              <div className="header-text">
                <h1 className="header-title">Course Management</h1>
                <p className="header-subtitle">Create, edit, and manage your modular e-learning courses with ease</p>
              </div>
              <button
                onClick={() => openModal()}
                className="create-course-btn"
                disabled={isLoading}
              >
                <Plus className="btn-icon" />
                <span>Create New Course</span>
              </button>
            </div>
          </div>

          <div className="search-filter-section">
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search courses by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-container">
              <Filter className="filter-icon" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="All">All Status</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="courses-grid">
            {filteredCourses.map((course) => (
              <div key={course._id} className="course-card">
                <div className="course-card-header">
                  <h3 className="course-title">{course.name}</h3>
                  <p className="course-description">{course.description}</p>
                  <span className={`status-badge ${course.status.toLowerCase()}`}>
                    {course.status}
                  </span>
                </div>

                <div className="course-card-body">
                  <div className="course-stats">
                    <div className="stat-item">
                      <span className="stat-label">Duration:</span>
                      <span className="stat-value">{course.duration}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Modules:</span>
                      <span className="stat-value">{course.modules?.length || 0}</span>
                    </div>
                  </div>

                  <div className="modules-preview">
                    <div className="modules-header">
                      <h4 className="modules-title">Course Modules</h4>
                    </div>
                    <div className="modules-list">
                      {(course.modules || []).map((module, index) => (
                        <div key={module._id || module.id || index} className="module-item">
                          <PlayCircle className="module-icon" />
                          <span className="module-title">{module.title}</span>
                          <span className="module-questions">{module.quiz?.questions?.length || 0}Q</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="course-card-footer">
                  <div className="action-buttons">
                    <button
                      onClick={() => openModal(course)}
                      className="action-btn edit-btn"
                      disabled={isLoading}
                    >
                      <Edit className="action-icon" />
                      <span>Edit</span>
                    </button>
                    <button className="action-btn view-btn" disabled={isLoading}>
                      <Eye className="action-icon" />
                    </button>
                    <button
                      onClick={() => handleDelete(course._id)}
                      className="action-btn delete-btn"
                      disabled={isLoading}
                    >
                      <Trash2 className="action-icon" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredCourses.length === 0 && !isLoading && (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <p>No courses found. Create your first course to get started!</p>
              </div>
            )}
            {isLoading && (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading courses...</p>
              </div>
            )}
          </div>

          {showModal && (
            <div className="modal-overlay" ref={modalRef}>
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title">
                    {editingCourse ? 'Edit Course' : 'Create New Course'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="modal-close"
                    disabled={isLoading}
                  >
                    <X className="close-icon" />
                  </button>
                </div>

                <div className="modal-tabs">
                  {['basic', 'modules'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`modal-tab ${activeTab === tab ? 'active' : ''}`}
                      disabled={isLoading}
                    >
                      {tab === 'basic' ? 'Basic Info' : 'Modules & Content'}
                    </button>
                  ))}
                </div>

                <div className="modal-body">
                  {activeTab === 'basic' && (
                    <div className="form-section">
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Course Name *</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Enter course name"
                            className="form-input"
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Description *</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Enter course description"
                          rows={4}
                          className="form-textarea"
                          disabled={isLoading}
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Category</label>
                          <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="form-select"
                            disabled={isLoading}
                          >
                            <option value="">Select category</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Duration</label>
                          <input
                            type="text"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            placeholder="e.g., 45 mins"
                            className="form-input"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Status</label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="form-select"
                            disabled={isLoading}
                          >
                            <option value="Draft">Draft</option>
                            <option value="Published">Published</option>
                            <option value="Archived">Archived</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'modules' && (
                    <div className="modules-section">
                      {formData.modules.length > 0 && (
                        <div className="existing-modules">
                          <h3 className="section-title">
                            Course Modules ({formData.modules.length})
                          </h3>
                          <div className="modules-list">
                            {formData.modules.map((module, index) => (
                              <div key={module.id || index} className="module-card">
                                <div className="module-header">
                                  <h4 className="module-title">{module.title}</h4>
                                  <button
                                    onClick={() => removeModule(index)}
                                    className="remove-module-btn"
                                    disabled={isLoading}
                                  >
                                    <Trash2 className="remove-icon" />
                                  </button>
                                </div>
                                <div className="module-info">
                                  {module.quiz.questions.length} questions • {module.quiz.passingScore}% to pass
                                  {module.video && (
                                    <div className="video-status">
                                      {module.video.pendingUpload ? (
                                        <span className="status-pending">
                                          <Clock className="status-icon" />
                                          Video pending upload
                                        </span>
                                      ) : (
                                        <span className="status-uploaded">
                                          <CheckCircle className="status-icon" />
                                          Video uploaded
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {formData.modules.length < 5 && (
                        <div className="video-upload-area">
                          <h3 className="section-title">
                            Add New Module ({formData.modules.length + 1})
                          </h3>
                          
                          <div className="form-group">
                            <label className="form-label">Module Title *</label>
                            <input
                              type="text"
                              value={currentModule.title}
                              onChange={(e) => setCurrentModule({ ...currentModule, title: e.target.value })}
                              placeholder="Enter module title"
                              className="form-input"
                              disabled={isLoading}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Module Video *</label>
                            <div className="video-upload-area">
                              <input
                                type="file"
                                ref={ref => (videoInputRefs.current.newModule = ref)}
                                onChange={(e) => handleVideoUpload(e, 'new')}
                                accept="video/*"
                                className="video-input"
                                disabled={isLoading}
                              />

                              {currentModule.video ? (
                                <div className="video-preview">
                                  <div className="video-info">
                                    <Video className="video-icon" />
                                    <div>
                                      <p className="video-name">{currentModule.video.name}</p>
                                      <p className="video-size">{currentModule.video.size}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setCurrentModule({ ...currentModule, video: null })}
                                    className="remove-video-btn"
                                    disabled={isLoading}
                                  >
                                    <Trash2 className="remove-icon" />
                                  </button>
                                </div>
                              ) : (
                                <div className="upload-prompt">
                                  <Video className="upload-icon" />
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => videoInputRefs.current.newModule?.click()}
                                      className="upload-btn"
                                      disabled={isLoading}
                                    >
                                      Upload Video
                                    </button>
                                  </div>
                                  <p className="upload-hint">MP4, MOV, AVI up to 500MB</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="quiz-section">
                            <div className="quiz-header">
                              <h4 className="quiz-title">Module Quiz *</h4>
                              <div className="passing-score">
                                <label className="score-label">
                                  Passing Score:
                                  <input
                                    type="number"
                                    value={currentModule.quiz.passingScore}
                                    onChange={(e) => setCurrentModule({
                                      ...currentModule,
                                      quiz: { ...currentModule.quiz, passingScore: parseInt(e.target.value) }
                                    })}
                                    min="100"
                                    max="100"
                                    className="score-input"
                                    disabled={isLoading}
                                  />%
                                </label>
                              </div>
                            </div>

                            {currentModule.quiz.questions.length > 0 && (
                              <div className="questions-list">
                                {currentModule.quiz.questions.map((question, qIndex) => (
                                  <div key={question.id} className="question-card">
                                    <div className="question-header">
                                      <div className="question-meta">
                                        <span className="question-number">Q{qIndex + 1}</span>
                                        <span className="question-type">{question.type}</span>
                                      </div>
                                      <button
                                        onClick={() => removeQuestionFromModule(qIndex)}
                                        className="remove-question-btn"
                                        disabled={isLoading}
                                      >
                                        <Trash2 className="remove-icon" />
                                      </button>
                                    </div>
                                    <p className="question-text">{question.question}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="add-question-form">
                              <h5 className="form-subtitle">Add Quiz Question</h5>
                              <div className="question-form">
                                <div className="form-group">
                                  <label className="form-label">Question Type</label>
                                  <select
                                    value={currentQuestion.type}
                                    onChange={(e) => setCurrentQuestion({ 
                                      ...currentQuestion, 
                                      type: e.target.value,
                                      options: e.target.value === 'true-false' ? ['True', 'False'] : ['', '', '', '']
                                    })}
                                    className="form-select"
                                    disabled={isLoading}
                                  >
                                    {questionTypes.map(type => (
                                      <option key={type} value={type}>{type.replace('-', ' ').toUpperCase()}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="form-group">
                                  <label className="form-label">Question Text *</label>
                                  <input
                                    type="text"
                                    value={currentQuestion.question}
                                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                                    placeholder="Enter question text"
                                    className="form-input"
                                    disabled={isLoading}
                                  />
                                </div>

                                {currentQuestion.type === 'multiple-choice' && (
                                  <div className="form-group">
                                    <label className="form-label">Answer Options *</label>
                                    <div className="options-section">
                                      {currentQuestion.options.map((option, index) => (
                                        <div key={index} className="option-row">
                                          <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => {
                                              const newOptions = [...currentQuestion.options];
                                              newOptions[index] = e.target.value;
                                              setCurrentQuestion({ ...currentQuestion, options: newOptions });
                                            }}
                                            placeholder={`Option ${index + 1}`}
                                            className="option-input"
                                            disabled={isLoading}
                                          />
                                          <input
                                            type="radio"
                                            name="correctAnswer"
                                            checked={currentQuestion.correctAnswer === index}
                                            onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: index })}
                                            disabled={isLoading}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {currentQuestion.type === 'true-false' && (
                                  <div className="form-group">
                                    <label className="form-label">Correct Answer *</label>
                                    <div className="true-false-options">
                                      {['True', 'False'].map((option, index) => (
                                        <label key={option} className="radio-option">
                                          <input
                                            type="radio"
                                            name="correctAnswer"
                                            checked={currentQuestion.correctAnswer === index}
                                            onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: index })}
                                            disabled={isLoading}
                                          />
                                          <span>{option}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {currentQuestion.type === 'fill-in-blank' && (
                                  <div className="form-group">
                                    <label className="form-label">Correct Answer *</label>
                                    <input
                                      type="text"
                                      value={currentQuestion.options[0]}
                                      onChange={(e) => setCurrentQuestion({ 
                                        ...currentQuestion, 
                                        options: [e.target.value, '', '', ''],
                                        correctAnswer: 0
                                      })}
                                      placeholder="Enter correct answer"
                                      className="form-input"
                                      disabled={isLoading}
                                    />
                                  </div>
                                )}

                                <div className="form-group">
                                  <label className="form-label">Points</label>
                                  <input
                                    type="number"
                                    value={currentQuestion.points}
                                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) })}
                                    min="1"
                                    className="points-input"
                                    disabled={isLoading}
                                  />
                                </div>

                                <button
                                  onClick={addQuestionToModule}
                                  className="add-question-btn"
                                  disabled={isLoading}
                                >
                                  <Plus className="action-icon" />
                                  <span>Add Question</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="module-actions">
                            <button
                              onClick={addModule}
                              className="add-module-btn"
                              disabled={isLoading}
                            >
                              <Plus className="action-icon" />
                              <span>Add Module</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="modal-footer">
                    <button
                      onClick={closeModal}
                      className="cancel-btn"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="save-btn"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span>Saving...</span>
                      ) : (
                        <>
                          <Save className="action-icon" />
                          <span>Save Course</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseAdminDashboard;
