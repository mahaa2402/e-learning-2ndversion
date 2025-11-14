import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { API_ENDPOINTS } from '../config/api';
import './createcommoncourses.css';
import { Plus, Edit, Trash2, Video, Save, X, Upload, FileText, Clock, CheckCircle } from "lucide-react";

const CreateCommonCourses = () => {
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
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
    modules: []
  });

  const [currentModule, setCurrentModule] = useState({
    m_id: '',
    name: '',
    duration: 0,
    description: '',
    lessons: 1,
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
    correctAnswer: '', // Changed to string to store the actual answer text
    points: 1,
    imageUrl: null // Added for question images
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      title: '',
      description: '',
      modules: []
    });
    setCurrentModule({
      m_id: '',
      name: '',
      duration: 0,
      description: '',
      lessons: 1,
      video: null,
      quiz: {
        questions: [],
        passingScore: 70
      }
    });
    setCurrentQuestion({
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1,
      imageUrl: null
    });
    setActiveTab('basic');
    setExpandedModules({});
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
        modules: convertedModules
      });
    } else {
      setEditingCourse(null);
      resetForm();
    }
    setShowModal(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        duration: `${newModule.duration || 0}min`
      };
      console.log('✅ Added lessonDetails to new module with video URL:', newModule.video.url);
    }

    setFormData({
      ...formData,
      modules: [...formData.modules, newModule]
    });

    // Reset current module
    setCurrentModule({
      m_id: generateModuleId(),
      name: '',
      duration: 0,
      description: '',
      lessons: 1,
      video: null,
      quiz: {
        questions: [],
        passingScore: 70
      }
    });
    setError(null);
  };

  const handleRemoveModule = (index) => {
    const updatedModules = formData.modules.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      modules: updatedModules
    });
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
    if (!currentQuestion.question) {
      setError("Please provide a question");
      return;
    }

    if (currentQuestion.type === 'multiple-choice') {
      if (currentQuestion.options.some(opt => !opt.trim())) {
      setError("Please fill all options for multiple-choice question");
      return;
      }
      if (!currentQuestion.correctAnswer || !currentQuestion.correctAnswer.trim()) {
        setError("Please select a correct answer");
        return;
      }
    }

    const newQuestion = {
      question: currentQuestion.question,
      type: currentQuestion.type,
      options: currentQuestion.type === 'multiple-choice' ? currentQuestion.options : [],
      correctAnswer: currentQuestion.correctAnswer, // Now stores the actual answer string
      points: currentQuestion.points || 1,
      imageUrl: currentQuestion.imageUrl || null
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
      correctAnswer: '',
      points: 1,
      imageUrl: null
    });
    setError(null);
    
    // Calculate success message
    const totalQuestions = currentModule.quiz.questions.length + 1;
    let message = `Question added! (Total: ${totalQuestions} questions. `;
    if (totalQuestions <= 5) {
      message += 'Add ' + (5 - totalQuestions) + ' more for retake quiz.';
    } else if (totalQuestions <= 10) {
      message += 'Retake quiz ready!';
    } else {
      message += 'More than 10 questions added.';
    }
    message += ')';
    setSuccess(message);
  };

  const handleRemoveQuestion = (questionIndex) => {
    const updatedQuestions = currentModule.quiz.questions.filter((_, i) => i !== questionIndex);
    setCurrentModule({
      ...currentModule,
      quiz: {
        ...currentModule.quiz,
        questions: updatedQuestions
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

      // Step 3: Prepare course data with all video URLs
      const courseData = {
        title: formData.title,
        description: formData.description || '',
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
              videoUrl: module.lessonDetails.videoUrl
            };
            console.log(`✅ Module "${module.name}" has lessonDetails with video URL: ${module.lessonDetails.videoUrl}`);
          } else if (videoUrl) {
            moduleData.lessonDetails = {
              title: module.name,
              videoUrl: videoUrl, // S3 URL from upload or existing from database
              content: module.lessonDetails?.content || [], // Preserve existing content if any
              duration: module.lessonDetails?.duration || `${module.duration || 0}min`
            };
            console.log(`✅ Module "${module.name}" has video URL: ${videoUrl}`);
          } else {
            console.log(`⚠️ Module "${module.name}" has no video URL`);
            // Even if no video, include lessonDetails structure if it exists to preserve other data
            if (module.lessonDetails) {
              moduleData.lessonDetails = {
                ...module.lessonDetails,
                videoUrl: null // Explicitly set to null
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
      if (updatedModules.some(m => m.video || (m.quiz && m.quiz.questions.length > 0))) {
        
        // Save quizzes for each module
        for (const module of updatedModules) {
          if (module.quiz && module.quiz.questions.length > 0) {
            const quizResponse = await fetch(`${API_ENDPOINTS.COURSES.GET_COURSES.replace('/getcourse', '/create-quiz')}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
              },
              body: JSON.stringify({
                courseId: courseId,
                mo_id: module.m_id,
                questions: module.quiz.questions,
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Create Common Courses</h2>
            <button
              onClick={() => openModal()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Course
            </button>
          </div>
        </div>

        <div className="p-6">
          {isLoading && !showModal && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading courses...</p>
            </div>
          )}

          {error && !showModal && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && !showModal && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course._id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {course.modules?.length || 0} Modules
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(course)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(course)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
                    title="Delete course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {courses.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-gray-500">No common courses found. Create your first course!</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto" ref={modalRef}>
            <div className="min-h-screen px-4 py-8">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {editingCourse ? 'Edit Course' : 'Create New Common Course'}
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                    {success}
                  </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                  <button
                    onClick={() => setActiveTab('basic')}
                    className={`px-4 py-2 font-medium ${
                      activeTab === 'basic'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Basic Info
                  </button>
                  <button
                    onClick={() => setActiveTab('modules')}
                    className={`px-4 py-2 font-medium ${
                      activeTab === 'modules'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Modules ({formData.modules.length})
                  </button>
                </div>

                {/* Basic Info Tab */}
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course Title *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., ISP, GDPR, POSH"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="4"
                        placeholder="Course description..."
                      />
                    </div>
                  </div>
                )}

                {/* Modules Tab */}
                {activeTab === 'modules' && (
                  <div className="space-y-6">
                    {/* Add Module Form */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-4">Add New Module</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Module ID (Auto-generated if empty)
                          </label>
                          <input
                            type="text"
                            value={currentModule.m_id}
                            onChange={(e) => setCurrentModule({ ...currentModule, m_id: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Leave empty to auto-generate"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Module Name *
                          </label>
                          <input
                            type="text"
                            value={currentModule.name}
                            onChange={(e) => setCurrentModule({ ...currentModule, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Module name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Duration (minutes)
                          </label>
                          <input
                            type="number"
                            value={currentModule.duration}
                            onChange={(e) => setCurrentModule({ ...currentModule, duration: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Number of Lessons
                          </label>
                          <input
                            type="number"
                            value={currentModule.lessons}
                            onChange={(e) => setCurrentModule({ ...currentModule, lessons: parseInt(e.target.value) || 1 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Module Description
                        </label>
                        <textarea
                          value={currentModule.description}
                          onChange={(e) => setCurrentModule({ ...currentModule, description: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows="2"
                          placeholder="Module description..."
                        />
                      </div>

                      {/* Video Upload */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Video (Optional)
                        </label>
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        {currentModule.video && (
                          <div className="mt-2 flex items-center text-sm text-gray-600">
                            <Video className="w-4 h-4 mr-2" />
                            {currentModule.video.name || currentModule.video.file?.name || 'Video selected'}
                            {currentModule.video.pendingUpload && (
                              <span className="ml-2 text-xs text-orange-600">(Pending upload)</span>
                            )}
                            {currentModule.video.url && (
                              <span className="ml-2 text-xs text-green-600">(Uploaded)</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quiz Section */}
                      <div className="mb-4 border-t pt-4">
                        <h5 className="font-semibold text-gray-900 mb-3">Quiz Questions</h5>
                        
                        {/* Add Question Form */}
                        <div className="bg-white p-3 rounded border border-gray-200 mb-3">
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Question
                            </label>
                            <input
                              type="text"
                              value={currentQuestion.question}
                              onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter question..."
                            />
                          </div>
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Question Type
                            </label>
                            <select
                              value={currentQuestion.type}
                              onChange={(e) => setCurrentQuestion({ ...currentQuestion, type: e.target.value, options: e.target.value === 'multiple-choice' ? ['', '', '', ''] : [] })}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              {questionTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>
                          {currentQuestion.type === 'multiple-choice' && (
                            <>
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Options (Select the correct answer)
                              </label>
                              {currentQuestion.options.map((option, idx) => (
                                <div key={idx} className="flex items-center mb-2">
                                  <input
                                    type="radio"
                                    name="correctAnswer"
                                      checked={currentQuestion.correctAnswer === option}
                                      onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: option })}
                                    className="mr-2"
                                  />
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [...currentQuestion.options];
                                        const oldValue = newOptions[idx];
                                      newOptions[idx] = e.target.value;
                                        // Update correctAnswer if the selected option text changed
                                        const newCorrectAnswer = currentQuestion.correctAnswer === oldValue 
                                          ? e.target.value 
                                          : currentQuestion.correctAnswer;
                                        setCurrentQuestion({ 
                                          ...currentQuestion, 
                                          options: newOptions,
                                          correctAnswer: newCorrectAnswer
                                        });
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                    placeholder={`Option ${idx + 1}`}
                                  />
                                </div>
                              ))}
                              </div>
                              {currentQuestion.correctAnswer && (
                                <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                                  <p className="text-sm text-green-700">
                                    ✓ Correct Answer: <strong>{currentQuestion.correctAnswer}</strong>
                                  </p>
                            </div>
                          )}
                            </>
                          )}
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Question Image (Optional)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  try {
                                    setIsLoading(true);
                                    const courseTitle = formData.title || editingCourse?.title;
                                    if (!courseTitle) {
                                      setError("Please enter course title before uploading question image");
                                      setIsLoading(false);
                                      return;
                                    }

                                    // Upload image to S3 (store in same folder as videos)
                                    const formDataToSend = new FormData();
                                    formDataToSend.append("image", file);
                                    
                                    const courseName = courseTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                                    const moduleNumber = formData.modules.length + 1; // Current module being added
                                    const questionIndex = currentModule.quiz.questions.length + 1;
                                    const uploadUrl = `${API_ENDPOINTS.UPLOAD.QUIZ_IMAGE}/${encodeURIComponent(courseName)}/${moduleNumber}/${questionIndex}`;
                                    
                                    console.log('📤 Uploading quiz image to:', uploadUrl);
                                    console.log('📤 Course name:', courseName);
                                    console.log('📤 Module number:', moduleNumber);
                                    console.log('📤 Question index:', questionIndex);
                                    
                                    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
                                    const uploadResponse = await fetch(uploadUrl, {
                                      method: 'POST',
                                      body: formDataToSend,
                                      headers: {
                                        'Authorization': `Bearer ${token}`
                                      }
                                    });

                                    if (!uploadResponse.ok) {
                                      const errorData = await uploadResponse.json();
                                      throw new Error(errorData.error || 'Failed to upload image');
                                    }

                                    const uploadResult = await uploadResponse.json();
                                    console.log('✅ Image uploaded:', uploadResult.imageUrl);
                                    
                                    setCurrentQuestion({
                                      ...currentQuestion,
                                      imageUrl: uploadResult.imageUrl // S3 URL
                                    });
                                    setSuccess('Image uploaded successfully!');
                                  } catch (err) {
                                    console.error('❌ Image upload failed:', err);
                                    setError(err.message || 'Failed to upload image');
                                  } finally {
                                    setIsLoading(false);
                                  }
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            {currentQuestion.imageUrl && (
                              <div className="mt-2">
                                <img 
                                  src={currentQuestion.imageUrl} 
                                  alt="Question preview" 
                                  className="max-w-xs h-auto border border-gray-300 rounded"
                                />
                                <button
                                  type="button"
                                  onClick={() => setCurrentQuestion({ ...currentQuestion, imageUrl: null })}
                                  className="mt-1 text-sm text-red-600 hover:text-red-800"
                                >
                                  Remove Image
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Points
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={currentQuestion.points}
                              onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 1 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={handleAddQuestion}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            Add Question
                          </button>
                        </div>

                        {/* Existing Questions */}
                        {currentModule.quiz.questions.length > 0 && (
                          <div className="space-y-2">
                            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
                              <p className="text-xs text-blue-700">
                                <strong>Quiz Structure:</strong> Questions 1-5 for first attempt, Questions 6-10 for retake quiz.
                                {currentModule.quiz.questions.length < 5 && ` Add ${5 - currentModule.quiz.questions.length} more for first attempt.`}
                                {currentModule.quiz.questions.length >= 5 && currentModule.quiz.questions.length < 10 && ` Add ${10 - currentModule.quiz.questions.length} more for retake quiz.`}
                                {currentModule.quiz.questions.length >= 10 && ' Both first attempt and retake quiz are ready!'}
                              </p>
                            </div>
                            {currentModule.quiz.questions.map((q, idx) => (
                              <div key={idx} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-gray-500">
                                      Q{idx + 1} {idx < 5 ? '(First Attempt)' : '(Retake Quiz)'}
                                    </span>
                                    <span className="text-xs text-gray-500">• {q.points} point{q.points !== 1 ? 's' : ''}</span>
                                  </div>
                                  <p className="font-medium text-sm">{q.question}</p>
                                  {q.imageUrl && (
                                    <img 
                                      src={q.imageUrl} 
                                      alt="Question" 
                                      className="mt-2 max-w-xs h-auto border border-gray-300 rounded"
                                    />
                                  )}
                                  {q.type === 'multiple-choice' && q.options && (
                                    <ul className="text-xs text-gray-600 mt-1">
                                      {q.options.map((opt, optIdx) => (
                                        <li key={optIdx} className={opt === q.correctAnswer ? 'font-semibold text-green-700' : ''}>
                                          {opt === q.correctAnswer ? '✓ ' : '  '}{opt}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  <p className="text-xs text-green-600 mt-1">
                                    Correct Answer: <strong>{q.correctAnswer}</strong>
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleRemoveQuestion(idx)}
                                  className="ml-2 text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleAddModule}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4 inline mr-2" />
                        Add Module
                      </button>
                    </div>

                    {/* Existing Modules List */}
                    {formData.modules.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Course Modules</h4>
                        <div className="space-y-3">
                          {formData.modules.map((module, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-900">{module.name}</h5>
                                  <p className="text-sm text-gray-600">ID: {module.m_id}</p>
                                  <p className="text-sm text-gray-600">Duration: {module.duration} min | Lessons: {module.lessons}</p>
                                  {module.video && (
                                    <div className="mt-2 flex items-center text-sm text-green-600">
                                      <Video className="w-4 h-4 mr-1" />
                                      Video uploaded
                                    </div>
                                  )}
                                  {module.quiz && module.quiz.questions.length > 0 && (
                                    <div className="mt-2 flex items-center text-sm text-blue-600">
                                      <FileText className="w-4 h-4 mr-1" />
                                      {module.quiz.questions.length} questions
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleRemoveModule(index)}
                                  className="ml-4 text-red-600 hover:text-red-800"
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
                <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
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

