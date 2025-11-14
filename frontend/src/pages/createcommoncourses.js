import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { API_ENDPOINTS } from '../config/api';
import './createcommoncourses.css';
import { Plus, Edit, Trash2, Video, Save, X, Upload, FileText, Clock, CheckCircle } from "lucide-react";

const CreateCommonCourses = () => {
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingModuleIndex, setEditingModuleIndex] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [expandedModules, setExpandedModules] = useState({});
  
  const videoInputRefs = useRef({});
  const modalRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    modules: [],
    backgroundImage: null, // For storing the image file
    backgroundImageUrl: null, // For storing the uploaded image URL
    retakeQuizCooldownHours: 24 // Default 24 hours (1 day) for retake quiz cooldown
  });

  const [currentModule, setCurrentModule] = useState({
    m_id: '',
    name: '',
    duration: 0,
    description: '',
    lessons: 1,
    video: null,
    notes: '', // Notes for the video
    quiz: {
      firstAttemptQuestions: [],
      retakeQuestions: [],
      passingScore: 70
    }
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    firstAttempt: {
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1,
      imageUrl: null
    },
    retake: {
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1,
      imageUrl: null
    }
  });

  const questionTypes = ['multiple-choice', 'true-false', 'fill-in-blank'];

  // Fetch existing common courses
  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.COURSES.GET_COURSES, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setCourses(data);
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

  useEffect(() => {
    if (showModal) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      // Cleanup: restore body scroll on unmount
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      modules: [],
      backgroundImage: null,
      backgroundImageUrl: null,
      retakeQuizCooldownHours: 24
    });
    setCurrentModule({
      m_id: '',
      name: '',
      duration: '',
      description: '',
      lessons: 1,
      video: null,
      notes: '',
      quiz: {
        firstAttemptQuestions: [],
        retakeQuestions: [],
        passingScore: 70
      }
    });
    setCurrentQuestion({
      firstAttempt: {
        question: '',
        type: 'multiple-choice',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 1,
        imageUrl: null
      },
      retake: {
        question: '',
        type: 'multiple-choice',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 1,
        imageUrl: null
      }
    });
    setActiveTab('basic');
    setExpandedModules({});
    setEditingModuleIndex(null);
    // Clear the video input field
    if (videoInputRefs.current['new']) {
      videoInputRefs.current['new'].value = '';
    }
  };

  const openModal = (course = null) => {
    if (course) {
      setEditingCourse(course);
      // Convert database modules format to formData format
      // Database has lessonDetails.videoUrl, formData expects module.video.url
      const convertedModules = (course.modules || []).map(module => ({
        ...module,
        video: module.lessonDetails?.videoUrl ? {
          url: module.lessonDetails.videoUrl,
          name: module.name || 'Video',
          uploadedAt: new Date().toISOString(),
          pendingUpload: false
        } : null
      }));
      setFormData({
        title: course.title || '',
        description: course.description || '',
        modules: convertedModules.map(module => ({
          ...module,
          notes: module.lessonDetails?.notes || ''
        })),
        backgroundImage: null,
        backgroundImageUrl: course.backgroundImageUrl || null,
        retakeQuizCooldownHours: course.retakeQuizCooldownHours || 24
      });
    } else {
      setEditingCourse(null);
      resetForm();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCourse(null);
    resetForm();
    setError(null);
    setSuccess(null);
  };

  const generateModuleId = () => {
    return `module_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleAddModule = async () => {
    if (!currentModule.name) {
      setError("Please provide module name");
      return;
    }

    // If editing an existing module, update it instead of adding a new one
    if (editingModuleIndex !== null) {
      return handleUpdateModule(editingModuleIndex);
    }

    // If there's a video file that hasn't been uploaded yet, upload it first
    let videoUrl = null;
    let videoData = null;
    
    if (currentModule.video?.file && !currentModule.video.url) {
      try {
        setIsLoading(true);
        const courseTitle = formData.title || editingCourse?.title;
        if (!courseTitle) {
          // If course title isn't set, keep the file reference for later upload
          console.log('⚠️ Course title not set, keeping video file reference for later upload');
          videoData = {
            file: currentModule.video.file,
            name: currentModule.video.file.name,
            size: `${(currentModule.video.file.size / 1024 / 1024).toFixed(2)} MB`,
            type: currentModule.video.file.type,
            pendingUpload: true
          };
        } else {
          // Course title is set, upload the video now
          // Calculate module number: existing modules count + 1 (for the new module being added)
          // If editing an existing course, we need to account for existing modules in the database
          let moduleNumber = formData.modules.length + 1;
          
          // If editing an existing course, check if there are existing modules in the database
          // that aren't in formData yet (this shouldn't happen, but be safe)
          if (editingCourse && editingCourse.modules) {
            // Use the maximum of: existing DB modules count or current formData modules count
            moduleNumber = Math.max(editingCourse.modules.length, formData.modules.length) + 1;
            console.log('📤 Editing existing course - existing modules:', editingCourse.modules.length, 'formData modules:', formData.modules.length, 'new module number:', moduleNumber);
          }
          
          const formDataToSend = new FormData();
          formDataToSend.append("video", currentModule.video.file);

          // Sanitize course name like admincourses does (match backend sanitization)
          // Backend uses: replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
          const courseName = courseTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          const uploadUrl = `${API_ENDPOINTS.VIDEOS.UPLOAD}/${encodeURIComponent(courseName)}/${moduleNumber}`;
          console.log('📤 Uploading video to:', uploadUrl);
          console.log('📤 Course title:', courseTitle);
          console.log('📤 Course name (sanitized):', courseName);
          console.log('📤 Module number:', moduleNumber);
          console.log('📤 File:', currentModule.video.file.name, currentModule.video.file.size, 'bytes');

          const token = localStorage.getItem('token') || localStorage.getItem('authToken');
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: formDataToSend,
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          console.log('📤 Upload response status:', uploadResponse.status);
          console.log('📤 Upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));

          if (!uploadResponse.ok) {
            let errorData;
            try {
              errorData = await uploadResponse.json();
            } catch (e) {
              errorData = { error: `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}` };
            }
            console.error('❌ Upload failed:', errorData);
            throw new Error(errorData.error || `Failed to upload video: ${uploadResponse.statusText}`);
          }

          const uploadResult = await uploadResponse.json();
          console.log('✅ Upload result:', uploadResult);
          
          // Validate upload result
          if (!uploadResult.video?.url && !uploadResult.videoUrl) {
            console.error('❌ Upload result missing video URL:', uploadResult);
            throw new Error('Upload succeeded but no video URL returned');
          }
          
          videoUrl = uploadResult.video?.url || uploadResult.videoUrl;
          console.log('✅ Video URL:', videoUrl);
          
          // Store video data with URL
          videoData = {
            url: videoUrl,
            name: currentModule.video.file.name,
            size: `${(currentModule.video.file.size / 1024 / 1024).toFixed(2)} MB`,
            type: currentModule.video.file.type,
            s3Key: uploadResult.video?.s3Key,
            uploadedAt: uploadResult.video?.uploadedAt || new Date().toISOString(),
            pendingUpload: false
          };
          
          console.log('✅ Video uploaded successfully before adding module');
        }
      } catch (err) {
        console.error('❌ Video upload failed:', err);
        // If upload fails but file exists, keep the file reference for later
        if (currentModule.video?.file) {
          console.log('⚠️ Keeping video file reference for later upload');
          videoData = {
            file: currentModule.video.file,
            name: currentModule.video.file.name,
            size: `${(currentModule.video.file.size / 1024 / 1024).toFixed(2)} MB`,
            type: currentModule.video.file.type,
            pendingUpload: true
          };
          setError(`Video upload failed: ${err.message}. The video file will be uploaded when you save the course.`);
        } else {
          setError(err.message || "Failed to upload video");
          setIsLoading(false);
          return;
        }
      } finally {
        setIsLoading(false);
      }
    } else if (currentModule.video?.url) {
      // Video already has URL
      videoUrl = currentModule.video.url;
      videoData = {
        url: currentModule.video.url,
        name: currentModule.video.name || '',
        size: currentModule.video.size || '',
        type: currentModule.video.type || '',
        s3Key: currentModule.video.s3Key,
        uploadedAt: currentModule.video.uploadedAt || new Date().toISOString(),
        pendingUpload: false
      };
    } else if (currentModule.video?.file) {
      // Video file exists but no URL (shouldn't happen, but handle it)
      console.log('⚠️ Video file exists but no URL, keeping file reference');
      videoData = {
        file: currentModule.video.file,
        name: currentModule.video.file.name,
        size: `${(currentModule.video.file.size / 1024 / 1024).toFixed(2)} MB`,
        type: currentModule.video.file.type,
        pendingUpload: true
      };
    }

    // Auto-generate module ID if not provided
    const moduleId = currentModule.m_id || generateModuleId();
    const newModule = {
      m_id: moduleId,
      name: currentModule.name,
      duration: currentModule.duration || 0,
      description: currentModule.description || '',
      lessons: currentModule.lessons || 1,
      video: videoData, // Use the videoData we prepared above
      notes: currentModule.notes || '', // Include notes
      quiz: currentModule.quiz || { questions: [], passingScore: 70 }
    };
    
    console.log('📋 New module created:', {
      m_id: newModule.m_id,
      name: newModule.name,
      hasVideo: !!newModule.video,
      videoUrl: newModule.video?.url,
      hasVideoFile: !!newModule.video?.file,
      pendingUpload: newModule.video?.pendingUpload
    });

    // If video was uploaded successfully, ensure lessonDetails is set
    if (newModule.video?.url && !newModule.lessonDetails) {
      newModule.lessonDetails = {
        title: newModule.name,
        videoUrl: newModule.video.url,
        content: [],
        duration: `${newModule.duration || 0}min`,
        notes: newModule.notes || ''
      };
      console.log('✅ Added lessonDetails to new module with video URL:', newModule.video.url);
    } else if (newModule.notes && !newModule.lessonDetails) {
      // Even if no video, set lessonDetails if notes exist
      newModule.lessonDetails = {
        title: newModule.name,
        videoUrl: null,
        content: [],
        duration: `${newModule.duration || 0}min`,
        notes: newModule.notes
      };
    } else if (newModule.lessonDetails) {
      // Update existing lessonDetails with notes
      newModule.lessonDetails.notes = newModule.notes || '';
    }

    setFormData({
      ...formData,
      modules: [...formData.modules, newModule]
    });

    // Reset current module - don't auto-generate ID, leave it empty
    setCurrentModule({
      m_id: '',
      name: '',
      duration: '',
      description: '',
      lessons: 1,
      video: null,
      notes: '',
      quiz: {
        firstAttemptQuestions: [],
        retakeQuestions: [],
        passingScore: 70
      }
    });
    setEditingModuleIndex(null); // Clear editing state
    // Clear the video input field
    if (videoInputRefs.current['new']) {
      videoInputRefs.current['new'].value = '';
    }
    setError(null);
  };

  const handleRemoveModule = (index) => {
    const updatedModules = formData.modules.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      modules: updatedModules
    });
    // If we're editing the removed module, clear editing state
    if (editingModuleIndex === index) {
      setEditingModuleIndex(null);
      // Reset current module
      setCurrentModule({
        m_id: '',
        name: '',
        duration: '',
        description: '',
        lessons: 1,
        video: null,
        notes: '',
        quiz: {
          firstAttemptQuestions: [],
          retakeQuestions: [],
          passingScore: 70
        }
      });
    } else if (editingModuleIndex !== null && editingModuleIndex > index) {
      // Adjust editing index if a module before it was removed
      setEditingModuleIndex(editingModuleIndex - 1);
    }
  };

  const handleEditModule = (index) => {
    const moduleToEdit = formData.modules[index];
    setEditingModuleIndex(index);
    
    // Populate currentModule with the module data
    setCurrentModule({
      m_id: moduleToEdit.m_id || '',
      name: moduleToEdit.name || '',
      duration: moduleToEdit.duration || '',
      description: moduleToEdit.description || '',
      lessons: moduleToEdit.lessons || 1,
      video: moduleToEdit.video || null,
      notes: moduleToEdit.notes || '',
      quiz: moduleToEdit.quiz || {
        firstAttemptQuestions: [],
        retakeQuestions: [],
        passingScore: 70
      }
    });
    
    // Scroll to the form
    const formElement = document.querySelector('.module-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleUpdateModule = async (index) => {
    if (!currentModule.name) {
      setError("Please provide module name");
      return;
    }

    // Handle video upload if there's a new file
    let videoUrl = null;
    let videoData = null;
    
    if (currentModule.video?.file && !currentModule.video.url) {
      try {
        setIsLoading(true);
        const courseTitle = formData.title || editingCourse?.title;
        if (!courseTitle) {
          videoData = {
            file: currentModule.video.file,
            name: currentModule.video.file.name,
            size: `${(currentModule.video.file.size / 1024 / 1024).toFixed(2)} MB`,
            type: currentModule.video.file.type,
            pendingUpload: true
          };
        } else {
          const moduleNumber = index + 1;
          const formDataToSend = new FormData();
          formDataToSend.append("video", currentModule.video.file);

          const courseName = courseTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          const uploadUrl = `${API_ENDPOINTS.VIDEOS.UPLOAD}/${encodeURIComponent(courseName)}/${moduleNumber}`;

          const token = localStorage.getItem('token') || localStorage.getItem('authToken');
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: formDataToSend,
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!uploadResponse.ok) {
            let errorData;
            try {
              errorData = await uploadResponse.json();
            } catch (e) {
              errorData = { error: `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}` };
            }
            throw new Error(errorData.error || `Failed to upload video: ${uploadResponse.statusText}`);
          }

          const uploadResult = await uploadResponse.json();
          videoUrl = uploadResult.video?.url || uploadResult.videoUrl;
          
          videoData = {
            url: videoUrl,
            name: currentModule.video.file.name,
            size: `${(currentModule.video.file.size / 1024 / 1024).toFixed(2)} MB`,
            type: currentModule.video.file.type,
            s3Key: uploadResult.video?.s3Key,
            uploadedAt: uploadResult.video?.uploadedAt || new Date().toISOString(),
            pendingUpload: false
          };
        }
      } catch (err) {
        console.error('❌ Video upload failed:', err);
        if (currentModule.video?.file) {
          videoData = {
            file: currentModule.video.file,
            name: currentModule.video.file.name,
            size: `${(currentModule.video.file.size / 1024 / 1024).toFixed(2)} MB`,
            type: currentModule.video.file.type,
            pendingUpload: true
          };
          setError(`Video upload failed: ${err.message}. The video file will be uploaded when you save the course.`);
        } else {
          setError(err.message || "Failed to upload video");
          setIsLoading(false);
          return;
        }
      } finally {
        setIsLoading(false);
      }
    } else if (currentModule.video?.url) {
      videoData = {
        url: currentModule.video.url,
        name: currentModule.video.name || '',
        size: currentModule.video.size || '',
        type: currentModule.video.type || '',
        s3Key: currentModule.video.s3Key,
        uploadedAt: currentModule.video.uploadedAt || new Date().toISOString(),
        pendingUpload: false
      };
    } else if (currentModule.video?.file) {
      videoData = {
        file: currentModule.video.file,
        name: currentModule.video.file.name,
        size: `${(currentModule.video.file.size / 1024 / 1024).toFixed(2)} MB`,
        type: currentModule.video.file.type,
        pendingUpload: true
      };
    }

    // Auto-generate module ID if not provided
    const moduleId = currentModule.m_id || generateModuleId();
    const updatedModule = {
      m_id: moduleId,
      name: currentModule.name,
      duration: currentModule.duration || 0,
      description: currentModule.description || '',
      lessons: currentModule.lessons || 1,
      video: videoData,
      notes: currentModule.notes || '',
      quiz: currentModule.quiz || { questions: [], passingScore: 70 }
    };

    if (updatedModule.video?.url && !updatedModule.lessonDetails) {
      updatedModule.lessonDetails = {
        title: updatedModule.name,
        videoUrl: updatedModule.video.url,
        content: [],
        duration: `${updatedModule.duration || 0}min`,
        notes: updatedModule.notes || ''
      };
    } else if (updatedModule.notes && !updatedModule.lessonDetails) {
      updatedModule.lessonDetails = {
        title: updatedModule.name,
        videoUrl: null,
        content: [],
        duration: `${updatedModule.duration || 0}min`,
        notes: updatedModule.notes
      };
    } else if (updatedModule.lessonDetails) {
      updatedModule.lessonDetails.notes = updatedModule.notes || '';
    }

    const updatedModules = [...formData.modules];
    updatedModules[index] = updatedModule;
    
    setFormData({
      ...formData,
      modules: updatedModules
    });

    // Reset current module
    setCurrentModule({
      m_id: '',
      name: '',
      duration: '',
      description: '',
      lessons: 1,
      video: null,
      notes: '',
      quiz: {
        firstAttemptQuestions: [],
        retakeQuestions: [],
        passingScore: 70
      }
    });
    setEditingModuleIndex(null);
    // Clear the video input field
    if (videoInputRefs.current['new']) {
      videoInputRefs.current['new'].value = '';
    }
    setError(null);
  };

  const handleVideoUpload = async (moduleIndex, file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file");
      return;
    }

    // Check file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      setError("Video file size must be less than 500MB");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // If it's a new module (not yet added to formData.modules), just store the file
      // Video will be uploaded to S3 when "Add Module" button is clicked
      if (moduleIndex === 'new') {
        setCurrentModule({
          ...currentModule,
          video: {
            file: file,
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            type: file.type,
            pendingUpload: true // Mark as pending upload - will upload when module is added
          }
        });
        setSuccess(`Video file selected. It will be uploaded to S3 when you click "Add Module".`);
        setIsLoading(false);
        return;
      }

      // For existing modules, upload to S3 immediately (like admincourses.js does)
      const courseTitle = formData.title || editingCourse?.title;
      if (!courseTitle) {
        setError("Please enter course title before uploading video");
        setIsLoading(false);
        return;
      }

      // Get module number (1-based index)
      const moduleNumber = moduleIndex + 1;
      
      // Sanitize course name like admincourses does (match backend sanitization)
      // Backend uses: replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      const courseName = courseTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

      // Upload video to S3 using the same pattern as admincourses
      const formDataToSend = new FormData();
      formDataToSend.append("video", file);

      const uploadUrl = `${API_ENDPOINTS.VIDEOS.UPLOAD}/${encodeURIComponent(courseName)}/${moduleNumber}`;
      console.log('📤 Uploading video to:', uploadUrl);
      console.log('📤 Course title:', courseTitle);
      console.log('📤 Course name (sanitized):', courseName);
      console.log('📤 Module number:', moduleNumber);
      console.log('📤 File:', file.name, file.size, 'bytes');
      console.log('📤 File type:', file.type);

      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formDataToSend,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📤 Upload response status:', uploadResponse.status);
      console.log('📤 Upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));

      if (!uploadResponse.ok) {
        let errorData;
        try {
          errorData = await uploadResponse.json();
        } catch (e) {
          errorData = { error: `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}` };
        }
        console.error('❌ Upload failed:', errorData);
        throw new Error(errorData.error || `Failed to upload video: ${uploadResponse.statusText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ Upload result:', uploadResult);
      
      // Validate upload result
      if (!uploadResult.video?.url && !uploadResult.videoUrl) {
        console.error('❌ Upload result missing video URL:', uploadResult);
        throw new Error('Upload succeeded but no video URL returned');
      }
      
      const videoUrl = uploadResult.video?.url || uploadResult.videoUrl;
      console.log('✅ Video URL:', videoUrl);
      
      // Update module with video URL (using same structure as admincourses)
      const updatedModules = [...formData.modules];
      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        video: {
          url: videoUrl,
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          type: file.type,
          s3Key: uploadResult.video?.s3Key,
          uploadedAt: uploadResult.video?.uploadedAt || new Date().toISOString(),
          pendingUpload: false
        }
      };

      setFormData({
        ...formData,
        modules: updatedModules
      });

      // Video uploaded to S3 - URL stored in formData
      // Will be saved to database when course is saved (not auto-saved)

      setSuccess(`Video uploaded successfully for module ${moduleNumber}`);
    } catch (err) {
      setError(err.message || "Failed to upload video");
      console.error('❌ Video upload error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddQuestion = () => {
    // Validate first attempt question
    if (!currentQuestion.firstAttempt.question.trim()) {
      setError("Please provide a question for first attempt");
      return;
    }

    if (currentQuestion.firstAttempt.type === 'multiple-choice') {
      if (currentQuestion.firstAttempt.options.some(opt => !opt.trim())) {
        setError("Please fill all options for first attempt multiple-choice question");
        return;
      }
      if (!currentQuestion.firstAttempt.correctAnswer || !currentQuestion.firstAttempt.correctAnswer.trim()) {
        setError("Please select a correct answer for first attempt question");
        return;
      }
    } else if (currentQuestion.firstAttempt.type === 'true-false') {
      if (!currentQuestion.firstAttempt.correctAnswer || (currentQuestion.firstAttempt.correctAnswer !== 'True' && currentQuestion.firstAttempt.correctAnswer !== 'False')) {
        setError("Please select True or False for first attempt question");
        return;
      }
    } else if (currentQuestion.firstAttempt.type === 'fill-in-blank') {
      if (!currentQuestion.firstAttempt.correctAnswer || !currentQuestion.firstAttempt.correctAnswer.trim()) {
        setError("Please provide a correct answer for first attempt fill-in-blank question");
        return;
      }
    }

    // Validate retake question
    if (!currentQuestion.retake.question.trim()) {
      setError("Please provide a question for retake attempt");
      return;
    }

    if (currentQuestion.retake.type === 'multiple-choice') {
      if (currentQuestion.retake.options.some(opt => !opt.trim())) {
        setError("Please fill all options for retake multiple-choice question");
        return;
      }
      if (!currentQuestion.retake.correctAnswer || !currentQuestion.retake.correctAnswer.trim()) {
        setError("Please select a correct answer for retake question");
        return;
      }
    } else if (currentQuestion.retake.type === 'true-false') {
      if (!currentQuestion.retake.correctAnswer || (currentQuestion.retake.correctAnswer !== 'True' && currentQuestion.retake.correctAnswer !== 'False')) {
        setError("Please select True or False for retake question");
        return;
      }
    } else if (currentQuestion.retake.type === 'fill-in-blank') {
      if (!currentQuestion.retake.correctAnswer || !currentQuestion.retake.correctAnswer.trim()) {
        setError("Please provide a correct answer for retake fill-in-blank question");
        return;
      }
    }

    const newFirstAttemptQuestion = {
      question: currentQuestion.firstAttempt.question,
      type: currentQuestion.firstAttempt.type,
      options: currentQuestion.firstAttempt.type === 'multiple-choice' ? currentQuestion.firstAttempt.options : [],
      correctAnswer: currentQuestion.firstAttempt.correctAnswer,
      points: currentQuestion.firstAttempt.points || 1,
      imageUrl: currentQuestion.firstAttempt.imageUrl || null
    };

    const newRetakeQuestion = {
      question: currentQuestion.retake.question,
      type: currentQuestion.retake.type,
      options: currentQuestion.retake.type === 'multiple-choice' ? currentQuestion.retake.options : [],
      correctAnswer: currentQuestion.retake.correctAnswer,
      points: currentQuestion.retake.points || 1,
      imageUrl: currentQuestion.retake.imageUrl || null
    };

    setCurrentModule({
      ...currentModule,
      quiz: {
        ...currentModule.quiz,
        firstAttemptQuestions: [...currentModule.quiz.firstAttemptQuestions, newFirstAttemptQuestion],
        retakeQuestions: [...currentModule.quiz.retakeQuestions, newRetakeQuestion]
      }
    });

    setCurrentQuestion({
      firstAttempt: {
        question: '',
        type: 'multiple-choice',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 1,
        imageUrl: null
      },
      retake: {
        question: '',
        type: 'multiple-choice',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 1,
        imageUrl: null
      }
    });
    setError(null);
    
    // Calculate success message
    const totalQuestionPairs = currentModule.quiz.firstAttemptQuestions.length + 1;
    setSuccess(`Question pair added! (Total: ${totalQuestionPairs} question pairs - ${totalQuestionPairs} for first attempt, ${totalQuestionPairs} for retake)`);
  };

  const handleRemoveQuestion = (questionIndex) => {
    const updatedFirstAttempt = currentModule.quiz.firstAttemptQuestions.filter((_, i) => i !== questionIndex);
    const updatedRetake = currentModule.quiz.retakeQuestions.filter((_, i) => i !== questionIndex);
    setCurrentModule({
      ...currentModule,
      quiz: {
        ...currentModule.quiz,
        firstAttemptQuestions: updatedFirstAttempt,
        retakeQuestions: updatedRetake
      }
    });
  };

  const handleSave = async () => {
    if (!formData.title) {
      setError("Please provide a course title");
      return;
    }

    if (formData.modules.length === 0) {
      setError("Please add at least one module");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const courseTitle = formData.title;

      // Step 1: Upload any pending videos that haven't been uploaded yet (like admincourses.js)
      console.log('📤 Checking for pending video uploads...');
      const updatedModules = [...formData.modules];
      
      // Sanitize course name like admincourses does (match backend sanitization)
      // Backend uses: replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      const courseName = courseTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      console.log('📤 Course title:', courseTitle);
      console.log('📤 Course name (sanitized):', courseName);
      
      let videosUploaded = 0;
      
      for (let i = 0; i < updatedModules.length; i++) {
        const module = updatedModules[i];
        
        // Debug: Log module video status
        console.log(`🔍 Module ${i + 1} "${module.name}" video status:`, {
          hasVideo: !!module.video,
          hasFile: !!module.video?.file,
          hasUrl: !!module.video?.url,
          pendingUpload: module.video?.pendingUpload,
          videoObject: module.video
        });
        
        // If module has a video file but no URL, upload it now (like admincourses.js checks for pendingUpload)
        // Also handle case where video is stored directly as File (backward compatibility)
        const hasVideoFile = module.video?.file instanceof File || (module.video instanceof File);
        const needsUpload = (hasVideoFile && !module.video?.url) || module.video?.pendingUpload;
        
        if (needsUpload) {
          // Get the file object (either from module.video.file or module.video itself)
          const videoFile = module.video?.file instanceof File 
            ? module.video.file 
            : (module.video instanceof File ? module.video : null);
          
          if (!videoFile) {
            console.error(`❌ Module ${i + 1} has invalid file object:`, module.video);
            throw new Error(`Module "${module.name}" has an invalid video file. Please re-upload the video.`);
          }
          
          console.log(`📤 Uploading video for module ${i + 1}: ${module.name}`);
          console.log(`📤 Module video file:`, {
            name: videoFile.name,
            size: videoFile.size,
            type: videoFile.type
          });
          try {
            // Calculate module number correctly
            // For existing modules being updated, use their position in the array
            // For new modules added during edit, they should be at the end
            let moduleNumber = i + 1;
            
            // If editing an existing course, we need to check if this is a new module or existing one
            // New modules added during edit will be at the end of the array
            // Existing modules keep their original module numbers
            if (editingCourse && editingCourse.modules) {
              // Check if this module exists in the original course by comparing m_id
              const existingModule = editingCourse.modules.find(m => m.m_id === module.m_id);
              if (existingModule) {
                // This is an existing module - find its original position in the database
                const originalIndex = editingCourse.modules.findIndex(m => m.m_id === module.m_id);
                moduleNumber = originalIndex + 1;
                console.log(`📤 Module "${module.name}" (m_id: ${module.m_id}) is existing module, using original module number: ${moduleNumber}`);
              } else {
                // This is a new module - calculate position after all existing modules
                // Count how many new modules come before this one
                const newModulesBeforeThis = updatedModules.slice(0, i).filter(m => 
                  !editingCourse.modules.some(existing => existing.m_id === m.m_id)
                ).length;
                moduleNumber = editingCourse.modules.length + newModulesBeforeThis + 1;
                console.log(`📤 Module "${module.name}" (m_id: ${module.m_id}) is new module, using module number: ${moduleNumber} (existing: ${editingCourse.modules.length}, new before this: ${newModulesBeforeThis})`);
              }
            }
            
            const formDataToSend = new FormData();
            formDataToSend.append("video", videoFile);

            const uploadUrl = `${API_ENDPOINTS.VIDEOS.UPLOAD}/${encodeURIComponent(courseName)}/${moduleNumber}`;
            console.log('📤 Upload URL:', uploadUrl);
            console.log('📤 Course name:', courseName);
            console.log('📤 Module number:', moduleNumber);

            const uploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              body: formDataToSend,
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            console.log('📤 Upload response status:', uploadResponse.status);
            console.log('📤 Upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));

            if (!uploadResponse.ok) {
              let errorData;
              try {
                errorData = await uploadResponse.json();
              } catch (e) {
                errorData = { error: `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}` };
              }
              console.error('❌ Upload failed:', errorData);
              throw new Error(errorData.error || `Failed to upload video for module ${module.name}: ${uploadResponse.statusText}`);
            }

            const uploadResult = await uploadResponse.json();
            console.log('✅ Upload result:', uploadResult);
            
            // Validate upload result
            if (!uploadResult.video?.url && !uploadResult.videoUrl) {
              console.error('❌ Upload result missing video URL:', uploadResult);
              throw new Error('Upload succeeded but no video URL returned');
            }
            
            const videoUrl = uploadResult.video?.url || uploadResult.videoUrl;
            console.log('✅ Video URL:', videoUrl);
            
            // Update module with video URL (using same structure as admincourses)
            updatedModules[i] = {
              ...module,
              video: {
                url: videoUrl,
                name: module.video?.name || videoFile.name,
                size: module.video?.size || `${(videoFile.size / 1024 / 1024).toFixed(2)} MB`,
                type: module.video?.type || videoFile.type,
                s3Key: uploadResult.video?.s3Key,
                uploadedAt: uploadResult.video?.uploadedAt || new Date().toISOString(),
                pendingUpload: false
              }
            };
            
            videosUploaded++;
            console.log(`✅ Video uploaded successfully for module ${i + 1}: ${module.name}`);
          } catch (err) {
            console.error('❌ Video upload failed:', err);
            throw new Error(`Failed to upload video for module "${module.name}": ${err.message}`);
          }
        }
      }
      
      if (videosUploaded > 0) {
        console.log(`✅ Successfully uploaded ${videosUploaded} video(s) to S3`);
      }

      // Step 2: Also check if currentModule has a video that needs uploading
      // This handles the case where a module was added but video upload failed or was deferred
      if (currentModule.video?.file && !currentModule.video?.url) {
        console.log('📤 Uploading video for current module before adding...');
        // Calculate module number: existing modules count + 1
        let moduleNumber = updatedModules.length + 1;
        
        // If editing an existing course, account for existing modules
        if (editingCourse && editingCourse.modules) {
          moduleNumber = Math.max(editingCourse.modules.length, updatedModules.length) + 1;
          console.log('📤 Editing existing course - calculating module number for current module:', moduleNumber);
        }
        
        const formDataToSend = new FormData();
        formDataToSend.append("video", currentModule.video.file);

        const courseName = courseTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const uploadUrl = `${API_ENDPOINTS.VIDEOS.UPLOAD}/${encodeURIComponent(courseName)}/${moduleNumber}`;
        console.log('📤 Upload URL for current module:', uploadUrl);
        console.log('📤 Course name (sanitized):', courseName);
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: formDataToSend,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!uploadResponse.ok) {
          let errorData;
          try {
            errorData = await uploadResponse.json();
          } catch (e) {
            errorData = { error: `HTTP ${uploadResponse.status}` };
          }
          throw new Error(errorData.error || 'Failed to upload video for current module');
        }

        const uploadResult = await uploadResponse.json();
        console.log('✅ Current module upload result:', uploadResult);
        
        // Validate upload result
        if (!uploadResult.video?.url && !uploadResult.videoUrl) {
          console.error('❌ Upload result missing video URL:', uploadResult);
          throw new Error('Upload succeeded but no video URL returned');
        }
        
        const videoUrl = uploadResult.video?.url || uploadResult.videoUrl;
        console.log('✅ Video URL:', videoUrl);
        
        currentModule.video.url = videoUrl;
        currentModule.video.s3Key = uploadResult.video?.s3Key;
        currentModule.video.uploadedAt = uploadResult.video?.uploadedAt || new Date().toISOString();
        currentModule.video.pendingUpload = false;
      }

      // Step 3: Upload course background image if needed
      let finalBackgroundImageUrl = formData.backgroundImageUrl;
      
      // If there's a new image file but no URL, upload it
      if (formData.backgroundImage && !formData.backgroundImageUrl) {
        try {
          console.log('📤 Uploading course background image...');
          const courseName = courseTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          const formDataToSend = new FormData();
          formDataToSend.append("image", formData.backgroundImage);

          const uploadUrl = `${API_ENDPOINTS.UPLOAD.QUIZ_IMAGE.replace('/upload-quiz-image', '/upload-course-image')}/${encodeURIComponent(courseName)}`;
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: formDataToSend,
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            finalBackgroundImageUrl = uploadResult.image?.url;
            console.log('✅ Course background image uploaded:', finalBackgroundImageUrl);
          } else {
            console.warn('⚠️ Failed to upload course background image');
          }
        } catch (err) {
          console.error('❌ Error uploading course background image:', err);
          // Don't fail the entire save if image upload fails
        }
      }

      // Step 4: Prepare course data with all video URLs
      const courseData = {
        title: formData.title,
        description: formData.description || '',
        backgroundImageUrl: finalBackgroundImageUrl,
        retakeQuizCooldownHours: formData.retakeQuizCooldownHours || 24,
        modules: updatedModules.map((module, index) => {
          const moduleData = {
          m_id: module.m_id,
          name: module.name,
          duration: module.duration || 0,
          description: module.description || '',
          lessons: module.lessons || 1
          };
          
          // Always include lessonDetails if video URL exists (required for video display)
          // Check multiple sources for video URL:
          // 1. module.video.url (from formData - most recent upload)
          // 2. module.lessonDetails.videoUrl (from database - existing or newly added)
          // 3. Check if editingCourse has the video URL for this module
          let videoUrl = module.video?.url || module.lessonDetails?.videoUrl;
          
          // If still no videoUrl and we're editing, check the original course data
          if (!videoUrl && editingCourse && editingCourse.modules) {
            const originalModule = editingCourse.modules.find(m => m.m_id === module.m_id);
            videoUrl = originalModule?.lessonDetails?.videoUrl;
          }
          
          // If module has lessonDetails already (e.g., from handleAddModule), use it
          if (module.lessonDetails && module.lessonDetails.videoUrl) {
            moduleData.lessonDetails = {
              ...module.lessonDetails,
              videoUrl: module.lessonDetails.videoUrl,
              notes: module.lessonDetails.notes || module.notes || ''
            };
            console.log(`✅ Module "${module.name}" has lessonDetails with video URL: ${module.lessonDetails.videoUrl}`);
          } else if (videoUrl) {
            moduleData.lessonDetails = {
              title: module.name,
              videoUrl: videoUrl, // S3 URL from upload or existing from database
              content: module.lessonDetails?.content || [], // Preserve existing content if any
              duration: module.lessonDetails?.duration || `${module.duration || 0}min`,
              notes: module.lessonDetails?.notes || module.notes || ''
            };
            console.log(`✅ Module "${module.name}" has video URL: ${videoUrl}`);
          } else {
            console.log(`⚠️ Module "${module.name}" has no video URL`);
            // Even if no video, include lessonDetails structure if it exists to preserve other data
            if (module.lessonDetails || module.notes) {
              moduleData.lessonDetails = {
                ...module.lessonDetails,
                videoUrl: null, // Explicitly set to null
                notes: module.lessonDetails?.notes || module.notes || ''
              };
            }
          }
          
          return moduleData;
        })
      };

      // Log video URLs before saving
      console.log('📤 Course data to save:', JSON.stringify(courseData, null, 2));
      console.log('📹 Video URLs in course data:', courseData.modules.map(m => ({
        m_id: m.m_id,
        name: m.name,
        hasVideoUrl: !!m.lessonDetails?.videoUrl,
        videoUrl: m.lessonDetails?.videoUrl
      })));

      // Use update route if editing, create route if new course
      const isEditing = editingCourse && editingCourse._id;
      const endpoint = isEditing 
        ? `${API_ENDPOINTS.COURSES.GET_COURSES.replace('/getcourse', '/update')}/${editingCourse._id}`
        : `${API_ENDPOINTS.COURSES.GET_COURSES.replace('/getcourse', '/create')}`;
      const method = isEditing ? 'PUT' : 'POST';
      
      console.log(`📤 ${isEditing ? 'Updating' : 'Creating'} course via ${method} ${endpoint}`);
      console.log(`📤 Editing course ID: ${editingCourse?._id}`);
      console.log(`📤 Full endpoint URL: ${endpoint}`);

      console.log(`📤 Sending ${method} request to: ${endpoint}`);
      console.log(`📤 Request body preview:`, {
        title: courseData.title,
        modulesCount: courseData.modules.length,
        modulesWithVideo: courseData.modules.filter(m => m.lessonDetails?.videoUrl).length
      });

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(courseData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} course`);
      }

      const result = await response.json();
      console.log(`✅ Course ${isEditing ? 'updated' : 'created'}:`, result);
      
      // Verify video URLs were saved
      if (result.course?.modules) {
        const savedVideoUrls = result.course.modules.map(m => ({
          m_id: m.m_id,
          name: m.name,
          hasVideoUrl: !!m.lessonDetails?.videoUrl,
          videoUrl: m.lessonDetails?.videoUrl
        }));
        console.log('📹 Video URLs saved in database:', savedVideoUrls);
        
        // Check if any expected video URLs are missing
        const expectedVideoUrls = courseData.modules
          .filter(m => m.lessonDetails?.videoUrl)
          .map(m => ({ m_id: m.m_id, videoUrl: m.lessonDetails.videoUrl }));
        const missingUrls = expectedVideoUrls.filter(expected => 
          !savedVideoUrls.find(saved => saved.m_id === expected.m_id && saved.videoUrl === expected.videoUrl)
        );
        if (missingUrls.length > 0) {
          console.error('❌ Some video URLs were not saved:', missingUrls);
          setError(`Warning: Some video URLs may not have been saved. Please check the course.`);
        }
      }
      
      // If there are videos or quizzes, save them separately
      const courseId = isEditing ? editingCourse._id : (result.course?._id || result._id);
      if (updatedModules.some(m => m.video || (m.quiz && (m.quiz.firstAttemptQuestions?.length > 0 || m.quiz.retakeQuestions?.length > 0)))) {
        
        // Save quizzes for each module
        for (const module of updatedModules) {
          if (module.quiz && (module.quiz.firstAttemptQuestions?.length > 0 || module.quiz.retakeQuestions?.length > 0)) {
            const quizResponse = await fetch(`${API_ENDPOINTS.COURSES.GET_COURSES.replace('/getcourse', '/create-quiz')}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
              },
              body: JSON.stringify({
                courseId: courseId,
                mo_id: module.m_id,
                firstAttemptQuestions: module.quiz.firstAttemptQuestions || [],
                retakeQuestions: module.quiz.retakeQuestions || [],
                passingScore: module.quiz.passingScore || 70
              })
            });
            
            if (!quizResponse.ok) {
              console.error('Failed to save quiz for module:', module.m_id);
            }
          }
        }
      }

      // Set editingCourse after creation for future edits
      if (!isEditing && result.course) {
        console.log('📝 Setting editingCourse after course creation');
        setEditingCourse(result.course);
      }

      // Show success message with video upload info
      let successMessage = isEditing ? "Course updated successfully!" : "Course created successfully!";
      if (videosUploaded > 0) {
        successMessage += ` ${videosUploaded} video(s) uploaded to S3 and saved to database.`;
      }
      
      alert(successMessage + " 🎉");
      setSuccess(successMessage);
      
      setTimeout(() => {
        closeModal();
        fetchCourses();
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to create course");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModuleExpansion = (index) => {
    setExpandedModules({
      ...expandedModules,
      [index]: !expandedModules[index]
    });
  };

  const handleDelete = async (course) => {
    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete the course "${course.title}"?\n\nThis action cannot be undone and will delete all modules and associated data.`
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      console.log('🗑️ Deleting course:', course._id);
      
      // Construct the delete URL
      const baseUrl = API_ENDPOINTS.COURSES.GET_COURSES.replace('/getcourse', '');
      const deleteUrl = `${baseUrl}/delete/${course._id}`;
      console.log('🗑️ Delete URL:', deleteUrl);
      console.log('🗑️ Base URL:', baseUrl);
      console.log('🗑️ Course ID:', course._id);
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      console.log('🗑️ Delete response status:', response.status);
      console.log('🗑️ Delete response URL:', response.url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete course');
      }

      const result = await response.json();
      console.log('✅ Course deleted:', result);
      
      setSuccess(`Course "${course.title}" deleted successfully!`);
      
      // Refresh the course list
      setTimeout(() => {
        fetchCourses();
        setSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('❌ Delete error:', err);
      setError(err.message || "Failed to delete course");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen create-common-courses-container">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="course-header p-6">
          <h2>Create Common Courses</h2>
          <div className="header-actions">
            <button
              onClick={() => openModal()}
              className="create-btn"
            >
              <Plus className="w-4 h-4" />
              Create New Course
            </button>
          </div>
        </div>

        <div className="p-6">
          {isLoading && !showModal && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p className="loading-text">Loading courses...</p>
            </div>
          )}

          {error && !showModal && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {success && !showModal && (
            <div className="alert alert-success">
              {success}
            </div>
          )}

          <div className="courses-grid">
            {courses.map((course) => (
              <div key={course._id} className="course-card">
                <h3 className="course-card-title">{course.title}</h3>
                <p className="course-card-meta">
                  {course.modules?.length || 0} Module{course.modules?.length !== 1 ? 's' : ''}
                </p>
                <div className="course-card-actions">
                  <button
                    onClick={() => openModal(course)}
                    className="btn-edit"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(course)}
                    className="btn-delete"
                    title="Delete course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {courses.length === 0 && !isLoading && (
            <div className="empty-state">
              <p>No common courses found. Create your first course!</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" ref={modalRef} onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {editingCourse ? 'Edit Course' : 'Create New Common Course'}
                </h3>
                <button
                  onClick={closeModal}
                  className="modal-close-btn"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {error && (
                <div className="alert alert-error" style={{ margin: '1.5rem 2rem 0' }}>
                  {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success" style={{ margin: '1.5rem 2rem 0' }}>
                  {success}
                </div>
              )}

              {/* Tabs */}
              <div className="tabs-container">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
                >
                  Basic Info
                </button>
                <button
                  onClick={() => setActiveTab('modules')}
                  className={`tab-button ${activeTab === 'modules' ? 'active' : ''}`}
                >
                  Modules ({formData.modules.length})
                </button>
              </div>

              <div className="modal-body">
                {/* Basic Info Tab */}
                {activeTab === 'basic' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label required">
                        Course Title
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="form-input"
                        placeholder="e.g., ISP, GDPR, POSH"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="form-textarea"
                        rows="4"
                        placeholder="Course description..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Course Background Image
                      </label>
                      <div className="file-upload-wrapper">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;

                          try {
                            setIsLoading(true);
                            setError(null);

                            // Sanitize course name
                            const courseTitle = formData.title || editingCourse?.title || 'temp';
                            const courseName = courseTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                            
                            const formDataToSend = new FormData();
                            formDataToSend.append("image", file);

                            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
                            const uploadUrl = `${API_ENDPOINTS.UPLOAD.COURSE_IMAGE}/${encodeURIComponent(courseName)}`;
                            
                            console.log('📤 Uploading course image to:', uploadUrl);

                            const uploadResponse = await fetch(uploadUrl, {
                              method: 'POST',
                              body: formDataToSend,
                              headers: {
                                'Authorization': `Bearer ${token}`
                              }
                            });

                            if (!uploadResponse.ok) {
                              let errorData;
                              try {
                                errorData = await uploadResponse.json();
                              } catch (e) {
                                errorData = { error: `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}` };
                              }
                              throw new Error(errorData.error || `Failed to upload image: ${uploadResponse.statusText}`);
                            }

                            const uploadResult = await uploadResponse.json();
                            console.log('✅ Course image upload result:', uploadResult);
                            
                            if (!uploadResult.image?.url) {
                              throw new Error('Upload succeeded but no image URL returned');
                            }

                            setFormData({
                              ...formData,
                              backgroundImage: file,
                              backgroundImageUrl: uploadResult.image.url
                            });
                            
                            setSuccess('Course image uploaded successfully!');
                          } catch (err) {
                            console.error('❌ Course image upload failed:', err);
                            setError(`Failed to upload image: ${err.message}`);
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                          className="file-upload-input"
                        />
                        {formData.backgroundImageUrl && (
                          <div className="file-upload-preview">
                            <img 
                              src={formData.backgroundImageUrl} 
                              alt="Course background preview" 
                            />
                            <p className="form-help-text">Current course image</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Retake Quiz Cooldown Time (Hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={formData.retakeQuizCooldownHours || ''}
                        onChange={(e) => setFormData({ ...formData, retakeQuizCooldownHours: e.target.value ? parseInt(e.target.value) : '' })}
                        className="form-input"
                        placeholder="24"
                      />
                      <p className="form-help-text">
                        Time (in hours) users must wait after failing the retake quiz before attempting again. Default: 24 hours (1 day)
                      </p>
                    </div>
                  </div>
                )}

                {/* Modules Tab */}
                {activeTab === 'modules' && (
                  <div>
                    {/* Add Module Form */}
                    <div className="module-form-section">
                      <h4>{editingModuleIndex !== null ? `Edit Module ${editingModuleIndex + 1}` : 'Add New Module'}</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">
                            Module ID (Auto-generated if empty)
                          </label>
                          <input
                            type="text"
                            value={currentModule.m_id}
                            onChange={(e) => setCurrentModule({ ...currentModule, m_id: e.target.value })}
                            className="form-input"
                            placeholder="Leave empty to auto-generate"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label required">
                            Module Name
                          </label>
                          <input
                            type="text"
                            value={currentModule.name}
                            onChange={(e) => setCurrentModule({ ...currentModule, name: e.target.value })}
                            className="form-input"
                            placeholder="Module name"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">
                            Duration (minutes)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={currentModule.duration || ''}
                            onChange={(e) => setCurrentModule({ ...currentModule, duration: e.target.value ? parseInt(e.target.value) : '' })}
                            className="form-input"
                            placeholder="Enter duration in minutes"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">
                            Number of Lessons
                          </label>
                          <input
                            type="number"
                            value={currentModule.lessons}
                            onChange={(e) => setCurrentModule({ ...currentModule, lessons: parseInt(e.target.value) || 1 })}
                            className="form-input"
                            min="1"
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          Module Description
                        </label>
                        <textarea
                          value={currentModule.description}
                          onChange={(e) => setCurrentModule({ ...currentModule, description: e.target.value })}
                          className="form-textarea"
                          rows="2"
                          placeholder="Module description..."
                        />
                      </div>

                      {/* Video Upload */}
                      <div className="form-group">
                        <label className="form-label">
                          Video (Optional)
                        </label>
                        <div className="file-upload-wrapper">
                          <input
                            type="file"
                            accept="video/*"
                            ref={(el) => (videoInputRefs.current['new'] = el)}
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                handleVideoUpload('new', file);
                              }
                            }}
                            className="file-upload-input"
                          />
                          {currentModule.video && (
                            <div className="module-badges" style={{ marginTop: '0.5rem' }}>
                              <span className="module-badge video">
                                <Video className="w-4 h-4" />
                                {currentModule.video.name || currentModule.video.file?.name || 'Video selected'}
                                {currentModule.video.pendingUpload && (
                                  <span className="ml-2">(Pending upload)</span>
                                )}
                                {currentModule.video.url && (
                                  <span className="ml-2">(Uploaded)</span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notes Section */}
                      <div className="form-group">
                        <label className="form-label">
                          Video Notes (Optional)
                        </label>
                        <textarea
                          value={currentModule.notes || ''}
                          onChange={(e) => setCurrentModule({ ...currentModule, notes: e.target.value })}
                          className="form-textarea"
                          rows="4"
                          placeholder="Add notes for this video module. These notes will be displayed below the video for students..."
                        />
                        <p className="form-help-text">
                          These notes will be displayed below the video in the lesson page
                        </p>
                      </div>

                      {/* Quiz Section */}
                      <div className="quiz-section">
                        <h5 className="quiz-section-title">Quiz Questions</h5>
                        <p className="quiz-section-description">
                          Add question pairs: one for first attempt and one for retake. Both questions will be added together.
                        </p>
                        
                        {/* Add Question Form - Two Columns */}
                        <div className="question-form-container">
                          <div className="question-columns">
                            {/* First Attempt Question */}
                            <div className="question-column first-attempt">
                              <h6 className="question-column-title">First Attempt Question</h6>
                              <div className="form-group">
                                <label className="form-label">
                                  Question
                                </label>
                                <input
                                  type="text"
                                  value={currentQuestion.firstAttempt.question}
                                  onChange={(e) => setCurrentQuestion({ 
                                    ...currentQuestion, 
                                    firstAttempt: { ...currentQuestion.firstAttempt, question: e.target.value }
                                  })}
                                  className="form-input"
                                  placeholder="Enter question..."
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">
                                  Question Type
                                </label>
                                <select
                                  value={currentQuestion.firstAttempt.type}
                                  onChange={(e) => setCurrentQuestion({ 
                                    ...currentQuestion, 
                                    firstAttempt: { 
                                      ...currentQuestion.firstAttempt, 
                                      type: e.target.value, 
                                      options: e.target.value === 'multiple-choice' ? ['', '', '', ''] : []
                                    }
                                  })}
                                  className="form-select"
                                >
                                  {questionTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                              </div>
                              {currentQuestion.firstAttempt.type === 'multiple-choice' && (
                                <>
                                  <div className="form-group">
                                    <label className="form-label">
                                      Options (Select the correct answer)
                                    </label>
                                    {currentQuestion.firstAttempt.options.map((option, idx) => (
                                      <div key={idx} className="option-item">
                                        <input
                                          type="radio"
                                          name="firstAttemptCorrectAnswer"
                                          checked={currentQuestion.firstAttempt.correctAnswer === option}
                                          onChange={() => setCurrentQuestion({ 
                                            ...currentQuestion, 
                                            firstAttempt: { ...currentQuestion.firstAttempt, correctAnswer: option }
                                          })}
                                        />
                                        <input
                                          type="text"
                                          value={option}
                                          onChange={(e) => {
                                            const newOptions = [...currentQuestion.firstAttempt.options];
                                            const oldValue = newOptions[idx];
                                            newOptions[idx] = e.target.value;
                                            const newCorrectAnswer = currentQuestion.firstAttempt.correctAnswer === oldValue 
                                              ? e.target.value 
                                              : currentQuestion.firstAttempt.correctAnswer;
                                            setCurrentQuestion({ 
                                              ...currentQuestion, 
                                              firstAttempt: { 
                                                ...currentQuestion.firstAttempt, 
                                                options: newOptions,
                                                correctAnswer: newCorrectAnswer
                                              }
                                            });
                                          }}
                                          placeholder={`Option ${idx + 1}`}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  {currentQuestion.firstAttempt.correctAnswer && (
                                    <div className="correct-answer-badge">
                                      <p>
                                        ✓ Correct Answer: <strong>{currentQuestion.firstAttempt.correctAnswer}</strong>
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                              {currentQuestion.firstAttempt.type === 'true-false' && (
                                <>
                                  <div className="form-group">
                                    <label className="form-label">
                                      Select Correct Answer
                                    </label>
                                    <div 
                                      className={`option-item ${currentQuestion.firstAttempt.correctAnswer === 'True' ? 'checked' : ''}`}
                                      onClick={() => setCurrentQuestion({ 
                                        ...currentQuestion, 
                                        firstAttempt: { ...currentQuestion.firstAttempt, correctAnswer: 'True' }
                                      })}
                                    >
                                      <input
                                        type="radio"
                                        name="firstAttemptTrueFalse"
                                        checked={currentQuestion.firstAttempt.correctAnswer === 'True'}
                                        onChange={() => setCurrentQuestion({ 
                                          ...currentQuestion, 
                                          firstAttempt: { ...currentQuestion.firstAttempt, correctAnswer: 'True' }
                                        })}
                                      />
                                      <label>True</label>
                                    </div>
                                    <div 
                                      className={`option-item ${currentQuestion.firstAttempt.correctAnswer === 'False' ? 'checked' : ''}`}
                                      onClick={() => setCurrentQuestion({ 
                                        ...currentQuestion, 
                                        firstAttempt: { ...currentQuestion.firstAttempt, correctAnswer: 'False' }
                                      })}
                                    >
                                      <input
                                        type="radio"
                                        name="firstAttemptTrueFalse"
                                        checked={currentQuestion.firstAttempt.correctAnswer === 'False'}
                                        onChange={() => setCurrentQuestion({ 
                                          ...currentQuestion, 
                                          firstAttempt: { ...currentQuestion.firstAttempt, correctAnswer: 'False' }
                                        })}
                                      />
                                      <label>False</label>
                                    </div>
                                  </div>
                                  {currentQuestion.firstAttempt.correctAnswer && (
                                    <div className="correct-answer-badge">
                                      <p>
                                        ✓ Correct Answer: <strong>{currentQuestion.firstAttempt.correctAnswer}</strong>
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                              {currentQuestion.firstAttempt.type === 'fill-in-blank' && (
                                <>
                                  <div className="form-group">
                                    <label className="form-label">
                                      Correct Answer
                                    </label>
                                    <input
                                      type="text"
                                      value={currentQuestion.firstAttempt.correctAnswer || ''}
                                      onChange={(e) => setCurrentQuestion({ 
                                        ...currentQuestion, 
                                        firstAttempt: { ...currentQuestion.firstAttempt, correctAnswer: e.target.value }
                                      })}
                                      className="form-input"
                                      placeholder="Enter the correct answer"
                                    />
                                  </div>
                                  {currentQuestion.firstAttempt.correctAnswer && (
                                    <div className="correct-answer-badge">
                                      <p>
                                        ✓ Correct Answer: <strong>{currentQuestion.firstAttempt.correctAnswer}</strong>
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                              <div className="form-group">
                                <label className="form-label">
                                  Points
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={currentQuestion.firstAttempt.points}
                                  onChange={(e) => setCurrentQuestion({ 
                                    ...currentQuestion, 
                                    firstAttempt: { ...currentQuestion.firstAttempt, points: parseInt(e.target.value) || 1 }
                                  })}
                                  className="form-input"
                                />
                              </div>
                            </div>

                            {/* Retake Question */}
                            <div className="question-column retake">
                              <h6 className="question-column-title">Retake Question</h6>
                              <div className="form-group">
                                <label className="form-label">
                                  Question
                                </label>
                                <input
                                  type="text"
                                  value={currentQuestion.retake.question}
                                  onChange={(e) => setCurrentQuestion({ 
                                    ...currentQuestion, 
                                    retake: { ...currentQuestion.retake, question: e.target.value }
                                  })}
                                  className="form-input"
                                  placeholder="Enter question..."
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">
                                  Question Type
                                </label>
                                <select
                                  value={currentQuestion.retake.type}
                                  onChange={(e) => setCurrentQuestion({ 
                                    ...currentQuestion, 
                                    retake: { 
                                      ...currentQuestion.retake, 
                                      type: e.target.value, 
                                      options: e.target.value === 'multiple-choice' ? ['', '', '', ''] : []
                                    }
                                  })}
                                  className="form-select"
                                >
                                  {questionTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                              </div>
                              {currentQuestion.retake.type === 'multiple-choice' && (
                                <>
                                  <div className="form-group">
                                    <label className="form-label">
                                      Options (Select the correct answer)
                                    </label>
                                    {currentQuestion.retake.options.map((option, idx) => (
                                      <div key={idx} className="option-item">
                                        <input
                                          type="radio"
                                          name="retakeCorrectAnswer"
                                          checked={currentQuestion.retake.correctAnswer === option}
                                          onChange={() => setCurrentQuestion({ 
                                            ...currentQuestion, 
                                            retake: { ...currentQuestion.retake, correctAnswer: option }
                                          })}
                                        />
                                        <input
                                          type="text"
                                          value={option}
                                          onChange={(e) => {
                                            const newOptions = [...currentQuestion.retake.options];
                                            const oldValue = newOptions[idx];
                                            newOptions[idx] = e.target.value;
                                            const newCorrectAnswer = currentQuestion.retake.correctAnswer === oldValue 
                                              ? e.target.value 
                                              : currentQuestion.retake.correctAnswer;
                                            setCurrentQuestion({ 
                                              ...currentQuestion, 
                                              retake: { 
                                                ...currentQuestion.retake, 
                                                options: newOptions,
                                                correctAnswer: newCorrectAnswer
                                              }
                                            });
                                          }}
                                          placeholder={`Option ${idx + 1}`}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  {currentQuestion.retake.correctAnswer && (
                                    <div className="correct-answer-badge">
                                      <p>
                                        ✓ Correct Answer: <strong>{currentQuestion.retake.correctAnswer}</strong>
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                              {currentQuestion.retake.type === 'true-false' && (
                                <>
                                  <div className="form-group">
                                    <label className="form-label">
                                      Select Correct Answer
                                    </label>
                                    <div 
                                      className={`option-item ${currentQuestion.retake.correctAnswer === 'True' ? 'checked' : ''}`}
                                      onClick={() => setCurrentQuestion({ 
                                        ...currentQuestion, 
                                        retake: { ...currentQuestion.retake, correctAnswer: 'True' }
                                      })}
                                    >
                                      <input
                                        type="radio"
                                        name="retakeTrueFalse"
                                        checked={currentQuestion.retake.correctAnswer === 'True'}
                                        onChange={() => setCurrentQuestion({ 
                                          ...currentQuestion, 
                                          retake: { ...currentQuestion.retake, correctAnswer: 'True' }
                                        })}
                                      />
                                      <label>True</label>
                                    </div>
                                    <div 
                                      className={`option-item ${currentQuestion.retake.correctAnswer === 'False' ? 'checked' : ''}`}
                                      onClick={() => setCurrentQuestion({ 
                                        ...currentQuestion, 
                                        retake: { ...currentQuestion.retake, correctAnswer: 'False' }
                                      })}
                                    >
                                      <input
                                        type="radio"
                                        name="retakeTrueFalse"
                                        checked={currentQuestion.retake.correctAnswer === 'False'}
                                        onChange={() => setCurrentQuestion({ 
                                          ...currentQuestion, 
                                          retake: { ...currentQuestion.retake, correctAnswer: 'False' }
                                        })}
                                      />
                                      <label>False</label>
                                    </div>
                                  </div>
                                  {currentQuestion.retake.correctAnswer && (
                                    <div className="correct-answer-badge">
                                      <p>
                                        ✓ Correct Answer: <strong>{currentQuestion.retake.correctAnswer}</strong>
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                              {currentQuestion.retake.type === 'fill-in-blank' && (
                                <>
                                  <div className="form-group">
                                    <label className="form-label">
                                      Correct Answer
                                    </label>
                                    <input
                                      type="text"
                                      value={currentQuestion.retake.correctAnswer || ''}
                                      onChange={(e) => setCurrentQuestion({ 
                                        ...currentQuestion, 
                                        retake: { ...currentQuestion.retake, correctAnswer: e.target.value }
                                      })}
                                      className="form-input"
                                      placeholder="Enter the correct answer"
                                    />
                                  </div>
                                  {currentQuestion.retake.correctAnswer && (
                                    <div className="correct-answer-badge">
                                      <p>
                                        ✓ Correct Answer: <strong>{currentQuestion.retake.correctAnswer}</strong>
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                              <div className="form-group">
                                <label className="form-label">
                                  Points
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={currentQuestion.retake.points}
                                  onChange={(e) => setCurrentQuestion({ 
                                    ...currentQuestion, 
                                    retake: { ...currentQuestion.retake, points: parseInt(e.target.value) || 1 }
                                  })}
                                  className="form-input"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                            <button
                              onClick={handleAddQuestion}
                              className="btn-save"
                              style={{ width: '100%' }}
                            >
                              Add Question Pair (First Attempt + Retake)
                            </button>
                          </div>
                        </div>

                        {/* Existing Questions */}
                        {(currentModule.quiz.firstAttemptQuestions?.length > 0 || currentModule.quiz.retakeQuestions?.length > 0) && (
                          <div className="existing-questions">
                            <div className="quiz-section-description">
                              <strong>Quiz Structure:</strong> You have {currentModule.quiz.firstAttemptQuestions?.length || 0} question pair(s).
                              <br />
                              <strong>Note:</strong> If a user fails the retake quiz, they must wait for the cooldown period (set in Basic Info tab) before attempting again.
                            </div>
                            {currentModule.quiz.firstAttemptQuestions?.map((q, idx) => {
                              const retakeQ = currentModule.quiz.retakeQuestions?.[idx];
                              return (
                                <div key={idx} className="question-pair-card">
                                  <div className="question-pair-grid">
                                    {/* First Attempt Question Display */}
                                    <div className="question-display first-attempt">
                                      <div className="question-number first-attempt">
                                        Q{idx + 1} (First Attempt) • {q.points} point{q.points !== 1 ? 's' : ''}
                                      </div>
                                      <p className="question-text">{q.question}</p>
                                      {q.imageUrl && (
                                        <img 
                                          src={q.imageUrl} 
                                          alt="Question" 
                                          style={{ marginTop: '0.5rem', maxWidth: '100%', height: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}
                                        />
                                      )}
                                      {q.type === 'multiple-choice' && q.options && (
                                        <ul className="question-options">
                                          {q.options.map((opt, optIdx) => (
                                            <li key={optIdx} className={opt === q.correctAnswer ? 'correct' : ''}>
                                              {opt === q.correctAnswer ? '✓ ' : '  '}{opt}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                      <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.5rem' }}>
                                        Correct Answer: <strong>{q.correctAnswer}</strong>
                                      </p>
                                    </div>
                                    
                                    {/* Retake Question Display */}
                                    {retakeQ && (
                                      <div className="question-display retake">
                                        <div className="question-number retake">
                                          Q{idx + 1} (Retake) • {retakeQ.points} point{retakeQ.points !== 1 ? 's' : ''}
                                        </div>
                                        <p className="question-text">{retakeQ.question}</p>
                                        {retakeQ.imageUrl && (
                                          <img 
                                            src={retakeQ.imageUrl} 
                                            alt="Question" 
                                            style={{ marginTop: '0.5rem', maxWidth: '100%', height: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}
                                          />
                                        )}
                                        {retakeQ.type === 'multiple-choice' && retakeQ.options && (
                                          <ul className="question-options">
                                            {retakeQ.options.map((opt, optIdx) => (
                                              <li key={optIdx} className={opt === retakeQ.correctAnswer ? 'correct' : ''}>
                                                {opt === retakeQ.correctAnswer ? '✓ ' : '  '}{opt}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                        <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.5rem' }}>
                                          Correct Answer: <strong>{retakeQ.correctAnswer}</strong>
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                      onClick={() => handleRemoveQuestion(idx)}
                                      className="btn-delete"
                                      style={{ fontSize: '0.875rem' }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Remove Question Pair
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleAddModule}
                        className="btn-save"
                        style={{ width: '100%', marginTop: '1.5rem' }}
                      >
                        <Plus className="w-4 h-4" />
                        {editingModuleIndex !== null ? 'Update Module' : 'Add Module'}
                      </button>
                    </div>

                    {/* Existing Modules List */}
                    {formData.modules.length > 0 && (
                      <div className="modules-list">
                        <h4 className="modules-list-title">Course Modules</h4>
                        <div>
                          {formData.modules.map((module, index) => (
                            <div key={index} className="module-item">
                              <div className="module-info">
                                <h5>{module.name}</h5>
                                <p>ID: {module.m_id}</p>
                                <p>Duration: {module.duration} min | Lessons: {module.lessons}</p>
                                <div className="module-badges">
                                  {module.video && (
                                    <span className="module-badge video">
                                      <Video className="w-4 h-4" />
                                      Video uploaded
                                    </span>
                                  )}
                                  {module.quiz && (module.quiz.firstAttemptQuestions?.length > 0 || module.quiz.retakeQuestions?.length > 0) && (
                                    <span className="module-badge quiz">
                                      <FileText className="w-4 h-4" />
                                      {(module.quiz.firstAttemptQuestions?.length || 0) + (module.quiz.retakeQuestions?.length || 0)} questions
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => handleEditModule(index)}
                                  className="btn-edit"
                                  title="Edit module"
                                >
                                  <Edit className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleRemoveModule(index)}
                                  className="btn-delete"
                                  title="Delete module"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Action Buttons */}
              <div className="modal-actions">
                <button
                  onClick={closeModal}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="btn-save"
                >
                  {isLoading ? (
                    <>
                      <div className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Course
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
  );
};

export default CreateCommonCourses;

