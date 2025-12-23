import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import './Navbar.css';

const Navbar = ({ showSearch = true }) => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showCoursesDropdown, setShowCoursesDropdown] = useState(false);
  const [commonCourses, setCommonCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuthStatus = () => {
      const authToken = localStorage.getItem('authToken');
      const userSession = localStorage.getItem('userSession');
      
      if (authToken || userSession) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
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

  // Handle scroll detection for navbar shrinking with throttling and hysteresis to prevent flickering
  useEffect(() => {
    let ticking = false;
    let lastScrollY = window.scrollY;
    let currentScrolledState = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPosition = window.scrollY;
          
          // Use hysteresis: different thresholds for scrolling down vs up to prevent flickering
          // Scroll down threshold: 50px (activate scrolled state)
          // Scroll up threshold: 30px (deactivate scrolled state)
          // This creates a "dead zone" that prevents rapid toggling
          if (scrollPosition > 50 && !currentScrolledState) {
            setIsScrolled(true);
            currentScrolledState = true;
          } else if (scrollPosition < 30 && currentScrolledState) {
            setIsScrolled(false);
            currentScrolledState = false;
          }
          
          lastScrollY = scrollPosition;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch common courses for dropdown (filtered by user role)
  useEffect(() => {
    const fetchCommonCourses = async () => {
      try {
        const token = localStorage.getItem("token");
        
        // Get user role from localStorage
        const userSession = localStorage.getItem('userSession');
        let userRole = null;
        if (userSession) {
          try {
            const user = JSON.parse(userSession);
            userRole = user.role;
          } catch (e) {
            console.error('Error parsing user session:', e);
          }
        }

        // If user is an employee, fetch only assigned courses
        if (userRole === 'employee' && token) {
          console.log('👤 Employee detected - fetching assigned courses for Navbar dropdown');
          
          try {
            // First, fetch assigned courses
            const assignedResponse = await fetch(API_ENDPOINTS.ASSIGNED_COURSES.GET_ASSIGNED_COURSES, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              mode: 'cors'
            });

            if (assignedResponse.ok) {
              const assignedData = await assignedResponse.json();
              console.log('📋 Assigned courses data for Navbar dropdown:', assignedData);
              
              // Extract course names from assigned courses
              const assignedCourseNames = assignedData.assignedCourses 
                ? assignedData.assignedCourses.map(assignment => assignment.courseName)
                : [];
              
              if (assignedCourseNames.length === 0) {
                console.log('ℹ️ No assigned courses found for employee Navbar dropdown');
                setCommonCourses([]);
                return;
              }
              
              // Now fetch all courses and filter to only show assigned ones
              const allCoursesResponse = await fetch(API_ENDPOINTS.COURSES.GET_COURSES, {
          method: 'GET',
          headers: {
                  'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
                },
                mode: 'cors'
              });

              if (allCoursesResponse.ok) {
                const allCoursesData = await allCoursesResponse.json();
                
                // Handle different response structures
                let allCourses = [];
                if (allCoursesData && Array.isArray(allCoursesData)) {
                  allCourses = allCoursesData;
                } else if (allCoursesData && allCoursesData.courses && Array.isArray(allCoursesData.courses)) {
                  allCourses = allCoursesData.courses;
                }
                
                // Filter courses to only include assigned ones
                const filteredCourses = allCourses.filter(course => 
                  assignedCourseNames.includes(course.title)
                );
                
                console.log(`✅ Filtered ${filteredCourses.length} assigned course(s) for Navbar dropdown from ${allCourses.length} total course(s)`);
                setCommonCourses(filteredCourses);
              } else {
                throw new Error('Failed to fetch all courses for filtering');
              }
            } else {
              throw new Error('Failed to fetch assigned courses');
            }
          } catch (error) {
            console.error('❌ Error fetching assigned courses for Navbar dropdown:', error);
            setCommonCourses([]);
          }
        } else {
          // For admin or non-logged-in users, fetch all courses
          console.log('👤 Admin or guest - fetching all courses for Navbar dropdown');
          const response = await fetch(API_ENDPOINTS.COURSES.GET_COURSES, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            mode: 'cors'
        });

        if (response.ok) {
          const data = await response.json();
          setCommonCourses(data);
          } else {
            console.error('Error fetching common courses:', response.status);
            setCommonCourses([]);
          }
        }
      } catch (error) {
        console.error('Error fetching common courses:', error);
        setCommonCourses([]);
      }
    };

    fetchCommonCourses();
  }, [isLoggedIn]); // Add isLoggedIn as dependency to refetch when login status changes

  // Handle courses dropdown
  const handleCoursesDropdownToggle = () => {
    setShowCoursesDropdown(!showCoursesDropdown);
  };

  const handleCourseSelect = (courseTitle) => {
    navigate(`/coursedetailpage/${courseTitle}`);
    setShowCoursesDropdown(false);
  };

  // Handle search functionality
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    // Filter courses based on search query
    const filtered = commonCourses.filter(course => 
      course.title.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
    setShowSearchResults(true);
  };


  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && searchResults.length > 0) {
      navigate(`/coursedetailpage/${searchResults[0].title}`);
      setSearchQuery('');
      setShowSearchResults(false);
    }
  };

  const handleSearchResultClick = (courseTitle) => {
    navigate(`/coursedetailpage/${courseTitle}`);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userSession');
    setIsLoggedIn(false);
    navigate('/');
  };

  // Handle home click
  const handleHomeClick = (e) => {
    e.preventDefault();
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            {isLoggedIn && (
              <div className="dropdown">
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  handleCoursesDropdownToggle();
                }}>
                  Courses
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '4px' }}>
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
            )}
            {isLoggedIn && <Link to="/userdashboard">Dashboard</Link>}
            {isLoggedIn && (
              <a href="#aboutus" onClick={(e) => {
                e.preventDefault();
                const aboutSection = document.getElementById('aboutus');
                if (aboutSection) {
                  aboutSection.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate('/');
                }
              }}>
                About
              </a>
            )}
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
            <img 
              src="/logo_new.jpg" 
              className={isScrolled ? 'logo-small' : ''} 
              width="500" 
              height="100" 
              alt="VISTA Logo"
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer' }}
              onError={(e) => {
                console.error('❌ Failed to load logo:', e.target.src);
                e.target.style.display = 'none';
              }}
              onLoad={() => console.log('✅ Logo loaded successfully:', '/logo_new.jpg')}
            />
          </div>
        </div>
        <div className="bottom-navbar-right">
          {isLoggedIn && showSearch && (
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
              {showSearchResults && searchResults.length > 0 && (
                <div className="search-results-dropdown">
                  {searchResults.map((course, index) => (
                    <div
                      key={course._id || index}
                      className="search-result-item"
                      onClick={() => handleSearchResultClick(course.title)}
                    >
                      {course.title}
                    </div>
                  ))}
                </div>
              )}
              {showSearchResults && searchResults.length === 0 && searchQuery.trim() !== '' && (
                <div className="search-results-dropdown">
                  <div className="search-result-item no-results">
                    No courses found for "{searchQuery}"
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

