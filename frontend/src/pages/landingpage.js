
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import './landingpage.css';

function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showScrollPopup, setShowScrollPopup] = useState(false);
  const [scrollAttempted, setScrollAttempted] = useState(false);
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]); // Initialize as empty array
  const [loading, setLoading] = useState(false); // Add loading state
  const [error, setError] = useState(null); // Add error state
  const [searchQuery, setSearchQuery] = useState('');
  const [showCoursesDropdown, setShowCoursesDropdown] = useState(false);
  const [commonCourses, setCommonCourses] = useState([]);
  const [isScrolled, setIsScrolled] = useState(false);

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
          // Fallback courses for demo
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
        // Fallback courses for demo
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

  // Fetch courses when user is logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    setError(null);

  fetch(API_ENDPOINTS.COURSES.GET_COURSES, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    })
      .then(response => {
        if (!response.ok) {
          console.error('Response not OK:', response.status, response.statusText);
          throw new Error(`Failed to fetch courses: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Fetched courses:', data);
        
        // Handle different response structures
        if (data && Array.isArray(data)) {
          setCourses(data);
        } else if (data && data.courses && Array.isArray(data.courses)) {
          setCourses(data.courses);
        } else {
          console.warn('Unexpected data structure:', data);
          setCourses([]); // Fallback to empty array
        }
      })
      .catch(error => {
        console.error('Error fetching courses:', error);
        
        // If it's a network error (backend not running), show a helpful message
        if (error.message.includes('Failed to fetch') || error.message.includes('Unexpected token')) {
          setError('Backend server is not running. Please start the backend server to view courses.');
          // Provide fallback courses for demo purposes
          setCourses([
            { title: 'ISP', description: 'Information Security Policy', modules: [] },
            { title: 'GDPR', description: 'General Data Protection Regulation', modules: [] },
            { title: 'POSH', description: 'Prevention of Sexual Harassment', modules: [] },
            { title: 'Factory Act', description: 'Factory Safety Regulations', modules: [] },
            { title: 'Welding', description: 'Welding Safety Training', modules: [] },
            { title: 'CNC', description: 'CNC Machine Operation', modules: [] }
          ]);
        } else {
          setError(error.message);
          setCourses([]); // Ensure courses is always an array
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isLoggedIn]); // Add isLoggedIn as dependency

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

 const imageMap = {
  ISP: "isp.jpeg",
  GDPR: "gdpr.jpg", 
  POSH: "posh.png",
  "Factory Act": "hsi.jpg",
  Welding: "course.jpg",
  CNC: "courseimg.jpeg"
};


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

  // Handle scroll detection for non-logged-in users
  useEffect(() => {
    if (isLoggedIn) {
      document.body.style.overflow = 'auto';
      return;
    }

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      
      if (scrollPosition > 50 && !scrollAttempted) {
        setShowScrollPopup(true);
        setScrollAttempted(true);
        document.body.style.overflow = 'hidden';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: false });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoggedIn, scrollAttempted]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userSession');
    setIsLoggedIn(false);
    setShowScrollPopup(false);
    setScrollAttempted(false);
    setCourses([]); // Clear courses on logout
    document.body.style.overflow = 'auto';
  };

  // Handle scroll to top when Home button is clicked
  const handleHomeClick = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle search functionality

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && commonCourses.length > 0) {
      // Find matching course
      const matchingCourse = commonCourses.find(course => 
        course.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (matchingCourse) {
        navigate(`/coursedetailpage/${matchingCourse.title}`);
        setSearchQuery('');
      } else {
        // Scroll to courses section if no match
        document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
        setSearchQuery('');
      }
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchResultClick = (courseTitle) => {
    navigate(`/coursedetailpage/${courseTitle}`);
    setSearchQuery('');
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

  return (
    <div className="landing-page">
      {/* Two-Tier Navigation */}
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
              <a href="#" onClick={handleHomeClick}>Home</a>
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
              <a href="#aboutus" onClick={(e) => {
                e.preventDefault();
                document.getElementById('aboutus')?.scrollIntoView({ behavior: 'smooth' });
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
              <img src="/logo_new.jpg" className={isScrolled ? 'logo-small' : ''} width="500" height="100" />
            </div>
            <div className="logo-text">
              
            </div>
          </div>
          <div className="bottom-navbar-right">
            <div className="search-sidebar">
                <form onSubmit={handleSearchSubmit} className="search-sidebar-form">
                  <input
                    type="text"
                    placeholder="Search.."
                    className="search-sidebar-input"
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                  <button type="submit" className="search-sidebar-submit">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                  </button>
                </form>
                {searchQuery.trim() !== '' && (
                  <div className="search-results-dropdown">
                    {commonCourses
                      .filter(course => 
                        course.title.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((course, index) => (
                        <div
                          key={course._id || index}
                          className="search-result-item"
                          onClick={() => handleSearchResultClick(course.title)}
                        >
                          {course.title}
                        </div>
                      ))}
                    {commonCourses.filter(course => 
                      course.title.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="search-result-item no-results">
                        No courses found for "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div
        className="hero-section hero-bg"
        style={{
          backgroundImage: `url('/bg.jpg')`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '100vh',
        }}
      >
        <div className="hero-content">
          <h1>
            <span className="highlight">Empowering</span> Workforce <br />
            Through Smart Learning
          </h1>
          <div className="hero-buttons">
            {isLoggedIn ? (
              <>
                <a href="#courses" className="btn explore-btn" onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
                }}>Explore Courses</a>
              
              </>
            ) : (
              <>
                <Link to="/login" className="btn explore-btn">Login to Explore Courses</Link>
               
              </>
            )}
          </div>
        </div>
        <div className="hero-bg-overlay" />
      </div>

      {/* Our Courses Section - Always visible when logged in */}
      {isLoggedIn && (
        <section className="courses-section" id="courses">
          <div className="container">
            <h2 style={{ textAlign: "center" }} className="section-title2">Our Courses</h2>
            
            {loading && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p>Loading courses...</p>
              </div>
            )}
            
            {error && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
                <p>Error loading courses: {error}</p>
              </div>
            )}
            
            {!loading && !error && (
              <div className="courses-grid">
                {courses && courses.length > 0 ? (
                  courses.map((course, index) => (
                    <div key={course.id || course._id || index} className="course-card">
                 <div 
  className="course-image" 
  style={{
    backgroundImage: imageMap[course.title] 
      ? `url(${process.env.PUBLIC_URL}/${imageMap[course.title]})` 
      : `url(${process.env.PUBLIC_URL}/course.jpg)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  }}
>
                  {console.log('Course title:', course.title, 'Image path:', imageMap[course.title] ? `${process.env.PUBLIC_URL}/${imageMap[course.title]}` : `${process.env.PUBLIC_URL}/course.jpg`)}


                      
                        <div className="course-badges">
                          <span className="course-modules-badge">{course.modules ? course.modules.length : 0} Modules</span>
                          <span className={`course-level-badge ${(course.level || 'beginner').toLowerCase()}`}>{course.level || 'Beginner'}</span>
                        </div>
                      </div>
                      <div className="course-content">
                        <h3 className="course-title">{course.title || 'Untitled Course'}</h3>
                        <p className="course-description">
                          {course.description || 
                           (course.title === 'ISP' ? 'This comprehensive Information Security Policy training program provides essential knowledge on data protection, cybersecurity best practices, and organizational security protocols. Learn about threat identification, risk assessment, incident response procedures, and compliance requirements. Covers essential security topics including access controls, data encryption, network security, and employee responsibilities for maintaining information security standards.' :
                            course.title === 'GDPR' ? 'Master the General Data Protection Regulation compliance requirements with this detailed training program. Learn about data subject rights, lawful basis for processing, consent management, data breach notification procedures, and privacy impact assessments. This course covers essential GDPR principles, organizational responsibilities, and practical implementation strategies to ensure full compliance with European data protection laws.' :
                            course.title === 'POSH' ? 'Comprehensive Prevention of Sexual Harassment training designed to create safe and respectful workplaces. This program covers legal frameworks, organizational policies, complaint procedures, investigation processes, and prevention strategies. Learn about employee rights, employer responsibilities, bystander intervention techniques, and creating inclusive work environments that promote dignity and respect for all employees.' :
                            course.title === 'Factory Act' ? 'Essential Factory Act compliance training covering workplace safety regulations, employee welfare provisions, and industrial safety standards. Learn about factory inspections, safety equipment requirements, working hour regulations, health and hygiene standards, and emergency procedures. This course provides comprehensive knowledge of industrial safety laws and practical implementation strategies for manufacturing environments.' :
                            course.title === 'Welding' ? 'Professional welding techniques and safety training for industrial applications. This comprehensive program covers various welding methods, safety protocols, equipment operation, material handling, and quality control procedures. Learn about personal protective equipment, fire safety measures, ventilation requirements, and industry best practices for safe and effective welding operations in industrial settings.' :
                            course.title === 'CNC' ? 'Complete Computer Numerical Control machine operation and programming training for modern manufacturing. This program covers CNC programming languages, machine setup procedures, tool selection, quality control methods, and maintenance protocols. Learn about G-code programming, machine safety procedures, precision measurement techniques, and troubleshooting common operational issues in automated manufacturing environments.' :
                            'Professional training course designed to enhance workplace skills, improve compliance knowledge, and develop industry-specific competencies. This comprehensive program covers essential workplace topics, regulatory requirements, safety protocols, and best practices to ensure professional development and organizational excellence.')}
                        </p>
                        <Link to={`/coursedetailpage/${course.title || 'untitled'}`} className="btn course-btn">View Course</Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p>No courses available at the moment.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* About Us Section - Always visible when logged in */}
      {isLoggedIn && (
        <section className="about-section" id="aboutus">
          <div className="container">
            <div className="about-content">
              <div className="about-text">
                <h2 className="section-title">About VISTA</h2>
                <div className="about-description">
                  <p>
                    At VISTA Innovation@work, we believe that continuous learning is the foundation of professional growth and organizational success. Our platform is designed to bridge the gap between traditional training methods and modern workforce requirements, delivering comprehensive learning solutions that empower individuals and transform businesses.
                  </p>
                  <p>
                    Founded with the vision of making quality professional education accessible to everyone, we specialize in compliance training, technical skills development, and workplace safety education. Our courses are meticulously crafted by industry experts and are designed to meet the evolving needs of today's dynamic workplace environment.
                  </p>
                </div>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-number">100+</div>
                    <div className="stat-label">Learners Trained</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">5+</div>
                    <div className="stat-label">Courses</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">98%</div>
                    <div className="stat-label">Completion Rate</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">10+</div>
                    <div className="stat-label">Quizes</div>
                  </div>
                </div>
              </div>
              <div className="about-features">
                <h3>Why Choose VISTA?</h3>
                <div className="features-list">
                  <div className="feature-item">
                    <div className="feature-icon">🎯</div>
                    <div className="feature-content">
                      <h4>Industry-Relevant Content</h4>
                      <p>Our courses are designed by industry professionals and updated regularly to reflect current best practices and regulatory requirements.</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">📱</div>
                    <div className="feature-content">
                      <h4>Flexible Learning</h4>
                      <p>Learn at your own pace with our mobile-friendly platform that allows you to access content anytime, anywhere.</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">🏆</div>
                    <div className="feature-content">
                      <h4>Recognized Certifications</h4>
                      <p>Earn certificates that are recognized by industry leaders and add real value to your professional profile.</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">🤝</div>
                    <div className="feature-content">
                      <h4>Personalized Support</h4>
                      <p>Get dedicated support from our learning specialists who are committed to your success throughout your learning journey.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer Section */}
      <footer className="footer">
        <div className="footer-content">
          <div className="container">
            <div className="footer-grid">
             
              <div className="footer-section">
                <h4 className="footer-title">Quick Links</h4>
                <ul className="footer-links">
                  <li><a href="#" onClick={handleHomeClick}>Home</a></li>
                  <li><a href="#courses" onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
                  }}>Courses</a></li>
                  <li><Link to="/userdashboard">Certificates</Link></li>
                  <li><a href="#aboutus" onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('aboutus')?.scrollIntoView({ behavior: 'smooth' });
                  }}>About Us</a></li>
                </ul>
              </div>
              <div className="footer-section">
                <h4 className="footer-title">Course Categories</h4>
                <ul className="footer-links">
                  {commonCourses.length > 0 ? (
                    commonCourses.map((course, index) => (
                      <li key={course._id || course.title || index}>
                        <Link to={`/coursedetailpage/${course.title}`}>
                          {course.title}
                        </Link>
                      </li>
                    ))
                  ) : (
                    <>
                      <li><Link to="/coursedetailpage/ISP">ISP</Link></li>
                      <li><Link to="/coursedetailpage/GDPR">GDPR</Link></li>
                      <li><Link to="/coursedetailpage/POSH">POSH</Link></li>
                      <li><Link to="/coursedetailpage/Factory Act">Factory Act</Link></li>
                      <li><Link to="/coursedetailpage/Welding">Welding</Link></li>
                      <li><Link to="/coursedetailpage/CNC">CNC</Link></li>
                    </>
                  )}
                </ul>
              </div>
              <div className="footer-section">
                <h4 className="footer-title">Contact Info</h4>
                <div className="contact-info">
                  <div className="contact-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span>Coimbatore, Tamil Nadu, India</span>
                  </div>
                  <div className="contact-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                    <span>+91 95858 88855</span>
                  </div>
                  <div className="contact-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                    <span>info@vistainnovation.com</span>
                  </div>
                  <div className="contact-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>Mon - Fri: 9:00 AM - 6:00 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
