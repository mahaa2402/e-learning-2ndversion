import React, { useEffect, useState } from 'react';
import { Users, Award, BookOpen, Play, ChevronRight, User, Star, CheckCircle, ArrowRight, Download } from 'lucide-react';
import './coursedetailpage.css';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import staticCourseData from './coursedata'; // Renamed to avoid confusion

const CourseDetailPage = () => {
  const [courseData, setCourseData] = useState(null);
  const { title } = useParams();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCoursesDropdown, setShowCoursesDropdown] = useState(false);
  const [commonCourses, setCommonCourses] = useState([]);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const navigate = useNavigate();

  // Helper function to get module description from coursedata.js
  const getModuleDescription = (moduleId, moduleName) => {
    // First try to get description from database
    if (courseData && courseData.modules) {
      const module = courseData.modules.find(m => m.m_id === moduleId);
      if (module && module.description) {
        return module.description;
      }
    }
    
    // If not in database, get from staticCourseData
    for (const [courseId, course] of Object.entries(staticCourseData)) {
      if (course.lessons && course.lessons[moduleId]) {
        const lesson = course.lessons[moduleId];
        // Get first meaningful content line as description
        if (lesson.content && Array.isArray(lesson.content)) {
          // Find first non-empty line that's not a heading (doesn't end with :)
          const description = lesson.content.find(line => 
            line && 
            line.trim() && 
            !line.endsWith(':') && 
            line.length > 20
          );
          if (description) {
            return description;
          }
          // Fallback to first non-empty line
          const firstLine = lesson.content.find(line => line && line.trim());
          if (firstLine) {
            return firstLine;
          }
        }
        // If no content, use title
        if (lesson.title) {
          return lesson.title;
        }
      }
    }
    
    // Final fallback
    return `Learn essential concepts and practical applications in ${moduleName}. This module covers fundamental principles, best practices, and real-world implementation strategies to enhance your professional skills and knowledge.`;
  };

  // Add the same imageMap as landing page
  const imageMap = {
    ISP: "isp.jpeg",
    GDPR: "gdpr.jpg", 
    POSH: "posh.png",
    "Factory Act": "hsi.jpg",
    Welding: "weilding.jpg",
    CNC: "cnc.webp",
    Excel: "excel.png"
  };

  // Fetch common courses for dropdown
  useEffect(() => {
    const fetchCommonCourses = async () => {
      try {
        console.log('Fetching common courses from:', API_ENDPOINTS.COURSES.GET_COURSES);
        const response = await fetch(API_ENDPOINTS.COURSES.GET_COURSES, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          mode: 'cors'
        });
        
        console.log('Response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          setCommonCourses(data);
          console.log('Common courses fetched successfully:', data);
        } else {
          console.error('Failed to fetch common courses:', response.status, response.statusText);
          setCommonCourses([
            { title: 'ISP', _id: '1' },
            { title: 'GDPR', _id: '2' },
            { title: 'POSH', _id: '3' },
            { title: 'Factory Act', _id: '4' },
            { title: 'Welding', _id: '5' },
            { title: 'CNC', _id: '6' }
          ]);
        }
      } catch (error) {
        console.error('Error fetching common courses:', error);
        setCommonCourses([
          { title: 'ISP', _id: '1' },
          { title: 'GDPR', _id: '2' },
          { title: 'POSH', _id: '3' },
          { title: 'Factory Act', _id: '4' },
          { title: 'Welding', _id: '5' },
          { title: 'CNC', _id: '6' }
        ]);
      }
    };

    fetchCommonCourses();
  }, []);

  // Check auth status
  useEffect(() => {
    const checkAuthStatus = () => {
      const authToken = localStorage.getItem('authToken');
      const userSession = localStorage.getItem('userSession');
      
      console.log('Checking auth status:', { authToken, userSession });
      
      if (authToken || userSession) {
        setIsLoggedIn(true);
        console.log('User is logged in');
      } else {
        setIsLoggedIn(false);
        console.log('User is not logged in');
      }
    };

    checkAuthStatus();
    window.addEventListener('storage', checkAuthStatus);
    window.addEventListener('loginSuccess', checkAuthStatus);
    const interval = setInterval(checkAuthStatus, 1000);

    return () => {
      window.removeEventListener('storage', checkAuthStatus);
      window.removeEventListener('loginSuccess', checkAuthStatus);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
  const response = await fetch(API_ENDPOINTS.COURSES.GET_COURSE_DETAIL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title })
        });

        if (!response.ok) throw new Error('Failed to fetch course data');

        const data = await response.json();
        setCourseData(data);
      } catch (err) {
        console.error('Error loading course:', err);
      }
    };

    fetchCourse();
  }, [title]);


  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userSession');
    setIsLoggedIn(false);
  };

  // Handle search functionality
  const handleSearchClick = () => {
    setShowSearchBar(!showSearchBar);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      navigate('/');
      setShowSearchBar(false);
      setSearchQuery('');
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle courses dropdown
  const handleCoursesDropdownToggle = () => {
    console.log('Dropdown toggle clicked. Current state:', showCoursesDropdown);
    console.log('Common courses available:', commonCourses);
    setShowCoursesDropdown(!showCoursesDropdown);
  };

  const handleCourseSelect = (courseTitle) => {
    navigate(`/coursedetailpage/${courseTitle}`);
    setShowCoursesDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCoursesDropdown && !event.target.closest('.dropdown')) {
        setShowCoursesDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCoursesDropdown]);

  // Handle scroll detection for navbar shrinking
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      
      if (scrollPosition > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleStartLesson = () => {
    console.log('Current courseData:', courseData);
    console.log('Looking for title:', title);
    
    // Helper function to normalize strings for comparison
    const normalizeString = (str) => {
      if (!str) return '';
      return str.trim().toLowerCase().replace(/\s+/g, ' ');
    };
    
    // Find the course ID by matching the course name with static course data
    let foundCourseId = null;
    const normalizedTitle = normalizeString(title);
    const normalizedCourseDataTitle = normalizeString(courseData?.title);
    
    for (const [id, course] of Object.entries(staticCourseData)) {
      const normalizedCourseName = normalizeString(course.name);
      console.log(`Checking course ${id}: ${course.name} vs ${title}`);
      
      // Try multiple matching strategies
      if (normalizedCourseName === normalizedTitle || 
          normalizedCourseName === normalizedCourseDataTitle ||
          course.name === title ||
          course.name === courseData?.title) {
        foundCourseId = id;
        break;
      }
    }
    
    if (foundCourseId) {
      // Get the first lesson key from the course data
      const course = staticCourseData[foundCourseId];
      const firstLessonKey = Object.keys(course.lessons)[0];
      console.log("sab",foundCourseId, "First lesson key:", firstLessonKey);
      navigate(`/course/${foundCourseId}/lesson/${firstLessonKey}`);
    } else {
      // If not found in static data, try to use courseData from database
      if (courseData && courseData.modules && courseData.modules.length > 0) {
        // Try to find course ID by matching title in static data (case-insensitive)
        let courseIdFromStatic = null;
        for (const [id, course] of Object.entries(staticCourseData)) {
          const normalizedCourseName = normalizeString(course.name);
          if (normalizedCourseName === normalizedCourseDataTitle || 
              normalizedCourseName === normalizedTitle ||
              course.name === courseData.title ||
              course.name === title) {
            courseIdFromStatic = id;
            break;
          }
        }
        
        if (courseIdFromStatic) {
          const course = staticCourseData[courseIdFromStatic];
          const firstLessonKey = Object.keys(course.lessons)[0];
          navigate(`/course/${courseIdFromStatic}/lesson/${firstLessonKey}`);
        } else {
          // If still not found, try to construct lesson ID from first module's m_id
          const firstModule = courseData.modules[0];
          if (firstModule && firstModule.m_id) {
            navigate(`/course/${courseData._id || title}/lesson/${firstModule.m_id}`);
          } else {
            console.error('Course not found and no valid module data');
            alert('Course not found! Please contact support.');
          }
        }
      } else {
        console.error('Course not found in static data and no courseData available');
        alert('Course not found! Please contact support.');
      }
    }
  };

  // Remove the alternative function since it's not needed
  // const handleStartLessonAlternative = () => { ... }

  if (!courseData) return <div className="loading">Loading course...</div>;

  return (
    <div className="course-detail-page">
      {/* Two-Tier Navigation - Same as Landing Page */}
      <header className="navbar-container">
        {/* Top Navigation Bar - Blue */}
        <div className="top-navbar">
          <div className="top-nav-left">
            <div className="contact-info">
              <span className="phone-info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
                 +1(866) 898-9971
              </span>
              <span className="email-info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                 info@vistaes.com
              </span>
            </div>
          </div>
          <div className="top-nav-right">
            <nav className="top-nav-links">
              <Link to="/">Home</Link>
              <div className="dropdown">
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  handleCoursesDropdownToggle();
                }}>
                  Courses
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </a>
                {showCoursesDropdown && (
                  <div className="dropdown-menu">
                    {commonCourses.length > 0 ? (
                      commonCourses.map((course, index) => (
                        <div
                          key={course._id || index}
                          className="dropdown-item"
                          onClick={() => handleCourseSelect(course.title)}
                        >
                          {course.title}
                        </div>
                      ))
                    ) : (
                      <div className="dropdown-item">No courses available</div>
                    )}
                  </div>
                )}
              </div>
              {isLoggedIn && <Link to="/userdashboard">Dashboard</Link>}
              <a href="/#aboutus" onClick={(e) => {
                e.preventDefault();
                navigate('/');
                setTimeout(() => {
                  document.getElementById('aboutus')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}>
                About
              </a>
              <div className="nav-auth">
                {!isLoggedIn ? (
                  <>
                    <Link to="/login" className="auth-link">Login</Link>
                    <span className="separator">/</span>
                    <Link to="/register" className="auth-link">Register</Link>
                  </>
                ) : (
                  <button className="auth-link logout-btn" onClick={handleLogout}>
                    Logout
                  </button>
                )}
              </div>
            </nav>
          </div>
        </div>

        {/* Bottom Navigation Bar - White */}
        <div className={`bottom-navbar ${isScrolled ? 'scrolled' : ''}`}>
          <div className="logo-section">
            <div className="logo-icon">
              <img src="/logo_new.jpg" className={isScrolled ? 'logo-small' : ''} width="500" height="100" alt="VISTA Logo" />
            </div>
            <div className="logo-text">
              
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Similar to Great Learning */}
      <section className="course-detail-hero">
        <div className="course-detail-hero-container">
          <div className="course-detail-hero-content">
            <div className="course-detail-info">
              
              
              <h1 className="course-detail-title">{courseData.title}</h1>
              
              <div className="course-detail-rating">
               
             
                <span className="duration-badge">{courseData.moduleCount || courseData.modules?.length} learning modules</span>
               
              </div>

              <p className="course-detail-description">
                {courseData.description || 
                 (courseData.title === 'ISP' ? 'This comprehensive Information Security Policy training program provides essential knowledge on data protection, cybersecurity best practices, and organizational security protocols. Learn about threat identification, risk assessment, incident response procedures, and compliance requirements.' :
                  courseData.title === 'GDPR' ? 'Master the General Data Protection Regulation compliance requirements with this detailed training program. Learn about data subject rights, lawful basis for processing, consent management, and privacy impact assessments.' :
                  courseData.title === 'POSH' ? 'Comprehensive Prevention of Sexual Harassment training designed to create safe and respectful workplaces. This program covers legal frameworks, organizational policies, and prevention strategies.' :
                  courseData.title === 'Factory Act' ? 'Essential Factory Act compliance training covering workplace safety regulations, employee welfare provisions, and industrial safety standards.' :
                  courseData.title === 'Welding' ? 'Professional welding techniques and safety training for industrial applications. This comprehensive program covers various welding methods, safety protocols, and equipment operation.' :
                  courseData.title === 'CNC' ? 'Complete Computer Numerical Control machine operation and programming training for modern manufacturing. This program covers CNC programming languages, machine setup procedures, and maintenance protocols.' :
                  'Professional training course designed to enhance workplace skills, improve compliance knowledge, and develop industry-specific competencies.')}
              </p>

             



            </div>

            <div className="course-detail-thumbnail">
              <img 
                src={imageMap[courseData.title] 
                  ? `${process.env.PUBLIC_URL}/${imageMap[courseData.title]}` 
                  : `${process.env.PUBLIC_URL}/course.jpg`} 
                alt={courseData.title} 
              />
              <div className="course-detail-play-overlay">
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Certificate Section */}
   

      {/* Skills Section */}
      <section className="course-detail-skills-section">
        <div className="course-detail-skills-container">
          <h2>Skills you will gain</h2>
          <div className="skills-grid">
            {(() => {
              let skills = [];
              switch(courseData.title) {
                case 'ISP':
                  skills = ['Information Security Fundamentals', 'Risk Assessment', 'Threat Identification', 'Incident Response', 'Compliance Management', 'Security Protocols'];
                  break;
                case 'GDPR':
                  skills = ['Data Protection Laws', 'Privacy Impact Assessment', 'Consent Management', 'Data Subject Rights', 'Breach Notification', 'Compliance Strategies'];
                  break;
                case 'POSH':
                  skills = ['Workplace Safety', 'Legal Frameworks', 'Prevention Strategies', 'Investigation Procedures', 'Employee Rights', 'Inclusive Environments'];
                  break;
                case 'Factory Act':
                  skills = ['Industrial Safety', 'Factory Regulations', 'Employee Welfare', 'Safety Equipment', 'Emergency Procedures', 'Compliance Standards'];
                  break;
                case 'Welding':
                  skills = ['Welding Techniques', 'Safety Protocols', 'Equipment Operation', 'Material Handling', 'Quality Control', 'Industry Standards'];
                  break;
                case 'CNC':
                  skills = ['CNC Programming', 'Machine Operation', 'Tool Selection', 'Quality Control', 'Maintenance', 'Troubleshooting'];
                  break;
                default:
                  skills = ['Professional Skills', 'Compliance Knowledge', 'Industry Competencies', 'Safety Protocols', 'Best Practices', 'Workplace Excellence'];
              }
              return skills.map((skill, index) => (
                <div key={index} className="skill-item">
                  {skill}
                </div>
              ));
            })()}
          </div>
        </div>
      </section>

    

     

      {/* Course Outline */}
      <section className="course-detail-outline-section">
        <div className="course-detail-outline-container">
          <h2>Course outline</h2>
          <div className="course-detail-outline-list">
            {courseData.modules && courseData.modules.map((mod, index) => (
              <div key={mod.m_id} className="course-detail-outline-item">
                <div className="course-detail-outline-header">
                  <div className="course-detail-outline-number">{String(index + 1).padStart(2, '0')}</div>
                  <div className="course-detail-outline-content">
                    <h3 className="course-detail-outline-title">{mod.name}</h3>
                    <p className="course-detail-outline-description">
                      {getModuleDescription(mod.m_id, mod.name)}
                    </p>
                  </div>
                  <div className="course-detail-outline-actions">
                    <button 
                      className="course-detail-btn course-detail-btn-start" 
                      onClick={() => {
                        // Helper function to normalize strings for comparison
                        const normalizeString = (str) => {
                          if (!str) return '';
                          return str.trim().toLowerCase().replace(/\s+/g, ' ');
                        };
                        
                        // Try to find course ID in static data
                        let foundCourseId = null;
                        const normalizedTitle = normalizeString(title);
                        const normalizedCourseDataTitle = normalizeString(courseData?.title);
                        
                        for (const [id, course] of Object.entries(staticCourseData)) {
                          const normalizedCourseName = normalizeString(course.name);
                          if (normalizedCourseName === normalizedTitle || 
                              normalizedCourseName === normalizedCourseDataTitle ||
                              course.name === title ||
                              course.name === courseData?.title) {
                            foundCourseId = id;
                            break;
                          }
                        }
                        
                        if (foundCourseId) {
                          // Course found in static data - find the lesson for this specific module
                          const course = staticCourseData[foundCourseId];
                          // Try to find lesson that matches the module's m_id
                          const moduleLessonKey = Object.keys(course.lessons).find(lessonKey => 
                            lessonKey === mod.m_id || lessonKey.toLowerCase() === mod.m_id?.toLowerCase()
                          );
                          
                          if (moduleLessonKey) {
                            navigate(`/course/${foundCourseId}/lesson/${moduleLessonKey}`);
                          } else {
                            // If no exact match, use the first lesson of the course
                            const firstLessonKey = Object.keys(course.lessons)[0];
                            navigate(`/course/${foundCourseId}/lesson/${firstLessonKey}`);
                          }
                        } else {
                          // Course not in static data - use module's m_id directly
                          if (mod && mod.m_id) {
                            // Try to find course ID by matching title
                            let courseIdFromStatic = null;
                            for (const [id, course] of Object.entries(staticCourseData)) {
                              const normalizedCourseName = normalizeString(course.name);
                              if (normalizedCourseName === normalizedCourseDataTitle || 
                                  normalizedCourseName === normalizedTitle ||
                                  course.name === courseData?.title ||
                                  course.name === title) {
                                courseIdFromStatic = id;
                                break;
                              }
                            }
                            
                            if (courseIdFromStatic) {
                              navigate(`/course/${courseIdFromStatic}/lesson/${mod.m_id}`);
                            } else {
                              // Use courseData._id or title as courseId
                              const courseId = courseData?._id || title;
                              navigate(`/course/${courseId}/lesson/${mod.m_id}`);
                            }
                          } else {
                            alert('Module information not available!');
                          }
                        }
                      }}
                    >
                      Start Module
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
         
        </div>
      </section>

      {/* Final CTA */}
      <section className="course-detail-actions-section">
        <div className="course-detail-actions-container">
          <div className="course-detail-actions-content">
            <div className="course-detail-actions-info">
              <h3>Ready to start your learning journey?</h3>
              <p>Join us to enhance your skills</p>
            </div>
            <div className="course-detail-actions-buttons">
              <button 
                className="course-detail-btn course-detail-btn-primary course-detail-btn-large"
                onClick={handleStartLesson}
              >
                <Play className="course-detail-btn-icon" />
                Start Learning For Free
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CourseDetailPage;
