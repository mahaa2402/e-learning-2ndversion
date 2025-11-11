import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; // Make sure to install react-router-dom
import "./lesson1page.css";
import courseImg from "../assets/course.jpg"; // Replace with your image path
import lesson4Video from "../assets/lesson4video2.mp4";
import { User, ArrowRight, ArrowLeft, Lock, CheckCircle, Home } from "lucide-react";

const CourseDetail = () => {
  const navigate = useNavigate();
  const [videoCompleted, setVideoCompleted] = useState(() => localStorage.getItem('lesson1VideoCompleted') === 'true');
  const [quizStatus, setQuizStatus] = useState({
    quiz1Passed: localStorage.getItem('quiz1Passed') === 'true',
    quiz2Passed: localStorage.getItem('quiz2Passed') === 'true',
    quiz3Passed: localStorage.getItem('quiz3Passed') === 'true',
    quiz4Passed: localStorage.getItem('quiz4Passed') === 'true',
  });
  const videoRef = useRef(null);

  // Mark this lesson as viewed on mount
  useEffect(() => {
    // Fetch user progress from backend
    const fetchProgress = async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const userEmail = localStorage.getItem('employeeEmail');
      const courseName = 'ISP'; // Fixed to match common course name in database
      if (!token || !userEmail) return;
      try {
  const res = await fetch(`/api/progress/get?userEmail=${encodeURIComponent(userEmail)}&courseName=${encodeURIComponent(courseName)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch progress');
        const data = await res.json();
        if (data.progress) {
          // Optionally update local state or localStorage for compatibility
          localStorage.setItem('lastAccessedModule', data.progress.lastAccessedModule);
          // You can use data.progress.completedModules to enforce sequential navigation
        }
      } catch (err) {
        console.error('Error fetching progress:', err);
      }
    };
    fetchProgress();
    localStorage.setItem('lesson1Viewed', 'true');
  }, []);

  const handleVideoEnded = () => {
    setVideoCompleted(true);
    localStorage.setItem('lesson1VideoCompleted', 'true');
  };

  // Helper function to get lesson styles
  const getLessonStyles = (lessonNumber) => {
    const isActive = lessonNumber === 1;
    const isLocked = lessonNumber > 1;

    const baseStyle = {
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '8px',
      transition: 'all 0.3s ease',
      border: '1px solid #dee2e6'
    };

    if (isActive) {
      return {
        ...baseStyle,
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196f3'
      };
    }
    if (isLocked) {
      return {
        ...baseStyle,
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        opacity: 0.6
      };
    }
    return baseStyle;
  };

  // Helper function to get quiz styles
  const getQuizStyles = (quizNumber) => {
    const isPassed = quizStatus[`quiz${quizNumber}Passed`];
    const isActive = quizNumber === 1;
    const isLocked = quizNumber > 1;

    const baseStyle = {
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '8px',
      transition: 'all 0.3s ease',
      border: '1px solid #dee2e6'
    };

    if (isActive) {
      return {
        ...baseStyle,
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196f3'
      };
    }
    if (isLocked) {
      return {
        ...baseStyle,
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        opacity: 0.6
      };
    }
    return baseStyle;
  };

  // Helper function to get lesson link styles
  const getLessonLinkStyles = (lessonNumber) => {
    const isActive = lessonNumber === 1;
    const isLocked = lessonNumber > 1;

    const baseStyle = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      textDecoration: 'none'
    };

    if (isActive) {
      return {
        ...baseStyle,
        color: '#1976d2',
        fontWeight: '600'
      };
    }
    if (isLocked) {
      return {
        ...baseStyle,
        color: '#6c757d',
        cursor: 'not-allowed',
        pointerEvents: 'none'
      };
    }
    return baseStyle;
  };

  // Helper function to get quiz link styles
  const getQuizLinkStyles = (quizNumber) => {
    const isActive = quizNumber === 1;
    const isLocked = quizNumber > 1;

    const baseStyle = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      textDecoration: 'none'
    };

    if (isActive) {
      return {
        ...baseStyle,
        color: '#1976d2',
        fontWeight: '600'
      };
    }
    if (isLocked) {
      return {
        ...baseStyle,
        color: '#6c757d',
        cursor: 'not-allowed',
        pointerEvents: 'none'
      };
    }
    return baseStyle;
  };

  return (
    <div className="course-page">
      {/* Header Section */}
      <div className="course-header">
        <div className="course-header-text">
          <h1>
            Learn about <span className="highlight">ISP, GDPR & Compliance</span>
          </h1>
          <p>Introduction to Data Protection</p>
        </div>
        <div className="course-header-actions">
          <button 
            onClick={() => navigate('/')}
            className="back-to-home-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: '#495057',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#e9ecef';
              e.target.style.borderColor = '#adb5bd';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#f8f9fa';
              e.target.style.borderColor = '#dee2e6';
            }}
          >
            <Home size={16} />
            Back to Home
          </button>
          <div className="course-duration">1 hour</div>
        </div>
      </div>

      <div className="course-main">
        {/* Left section with video and content */}
        <div className="course-left">
          <div className="video-preview">
            <video
              ref={videoRef}
              controls
              style={{ height: '100%', objectFit: 'cover', width: '100%' }}
              poster={courseImg}
              onEnded={handleVideoEnded}
            >
              <source src={lesson4Video} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="progress-text">0% completed</div>
          </div>

          <div className="course-content">
            <h2>Data Protection Fundamentals</h2>
            <p>
              Data protection is a critical discipline that encompasses the practices, policies, and technologies used to safeguard sensitive information from unauthorized access, corruption, or loss. In today's digital landscape, organizations handle vast amounts of personal data, making robust data protection strategies essential for maintaining trust, ensuring compliance, and protecting both individual privacy and business interests.
            </p>
            
            <p>
              The foundation of effective data protection lies in understanding the various types of data your organization processes. Personal data includes any information that can identify an individual, such as names, addresses, email addresses, phone numbers, and identification numbers. Sensitive personal data requires even higher levels of protection and includes information about health, race, religion, political opinions, and financial details.
            </p>

            <h2>Internet Service Providers (ISPs) and Data Responsibilities</h2>
            <p>
              An ISP (Internet Service Provider) is a company or organization that provides access to the internet for individuals, businesses, and organizations. ISPs play a crucial role in the digital ecosystem and have significant responsibilities regarding data protection and user privacy.
            </p>
            
            <p>
              ISPs handle massive amounts of user data daily, including browsing history, connection logs, bandwidth usage, and personal information provided during account registration. This positions them as data controllers under various privacy regulations, requiring them to implement stringent data protection measures. They must ensure secure data transmission, protect user privacy, and comply with legal requirements for data retention and disclosure.
            </p>

            <h2>Compliance and Risk Management</h2>
            <p>
              Compliance with data protection regulations requires a proactive approach that goes beyond mere technical implementation. Organizations must establish comprehensive governance frameworks that include data protection impact assessments, privacy by design principles, and regular compliance monitoring. This involves appointing Data Protection Officers (DPOs) where required, maintaining records of processing activities, and implementing breach notification procedures.
            </p>

            <p>
              Risk management in data protection involves identifying, assessing, and mitigating risks associated with data processing activities. Organizations must conduct regular risk assessments to identify potential vulnerabilities, evaluate the likelihood and impact of data breaches, and implement appropriate safeguards. This includes establishing incident response plans, conducting regular security audits, and maintaining business continuity procedures.
            </p>

            <h2>Best Practices for Data Protection</h2>
            <p>
              Implementing effective data protection requires adopting industry best practices and maintaining a culture of privacy awareness. Organizations should implement privacy by design principles, ensuring that data protection considerations are integrated into all business processes and system designs from the outset. This includes conducting privacy impact assessments for new projects, implementing data minimization principles, and ensuring transparency in data processing activities.
            </p>

            <p>
              Regular training and awareness programs are essential for maintaining effective data protection. All employees should understand their responsibilities regarding data protection, recognize potential security threats, and know how to respond to privacy incidents. Organizations should also establish clear policies and procedures for data handling, access controls, and third-party data sharing agreements.
            </p>

            {/* Navigation Section */}
            <div className="lesson-navigation">
              <div className="nav-buttons">
                <button className="nav-btn prev-btn" disabled>
                  <ArrowLeft size={16} />
                  Previous Lesson
                </button>
                <li>
                  <span
                    className="disabled-lesson-link"
                    style={!videoCompleted ? { opacity: 0.5, cursor: 'not-allowed', display: 'inline-block' } : {}}
                    onClick={e => {
                      if (!videoCompleted) {
                        e.preventDefault();
                        alert('Please watch and complete the video before proceeding to Lesson 2.');
                      }
                    }}
                  >
                    {videoCompleted ? (
                      <Link to="/lesson2">
                        <span>Lesson 02: What is ISP ?</span>
                        <span className="duration">30 mins</span>
                      </Link>
                    ) : (
                      <>
                        <span>Lesson 02: What is ISP ?</span>
                        <span className="duration">30 mins</span>
                      </>
                    )}
                  </span>
                </li>
              </div>
            </div>
          </div>

          <div className="instructor-card">
            <div className="avatar">
              <User size={24} />
            </div>
            <div>
              <h4>Bulkin Simons</h4>
              <p>
                Certified Data Protection Officer with over 10 years of experience in information security and privacy compliance. Specialized in GDPR implementation, risk assessment, and privacy program development across various industries.
              </p>
            </div>
          </div>
        </div>

        {/* Right section with lesson list */}
        <div className="course-right">
          <div className="section">
            <h3>Courses</h3>
            <ul className="lesson-list">
              <li style={getLessonStyles(1)}>
                <Link to="/lesson1" style={getLessonLinkStyles(1)} onClick={() => localStorage.setItem('lesson1Viewed', 'true')}>
                  <span>Lesson 01: Introduction to DataProtection</span>
                  <span style={{ fontSize: '0.9em', color: '#6c757d' }}>30 min</span>
                </Link>
              </li>
              <li style={getLessonStyles(2)}>
                <Link to="/lesson2" style={getLessonLinkStyles(2)} onClick={e => {
                  if (localStorage.getItem('lesson1Viewed') !== 'true' || localStorage.getItem('quiz1Passed') !== 'true') {
                    e.preventDefault();
                    alert('You should first complete Lesson 1 and pass Quiz 1 before proceeding.');
                  }
                }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <Lock 
                      size={16} 
                      style={{ 
                        color: '#6c757d', 
                        marginRight: '8px', 
                        verticalAlign: 'middle' 
                      }} 
                    />
                    Lesson 02: What is ISP ?
                  </span>
                  <span style={{ fontSize: '0.9em', color: '#6c757d' }}>30 mins</span>
                </Link>
              </li>
              <li style={getLessonStyles(3)}>
                <Link to="/lesson3" style={getLessonLinkStyles(3)} onClick={e => {
                  if (localStorage.getItem('lesson2Viewed') !== 'true' || localStorage.getItem('quiz1Passed') !== 'true') {
                    e.preventDefault();
                    alert('You should first complete Lesson 2 and pass Quiz 1 before proceeding.');
                  }
                }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <Lock 
                      size={16} 
                      style={{ 
                        color: '#6c757d', 
                        marginRight: '8px', 
                        verticalAlign: 'middle' 
                      }} 
                    />
                    Lesson 03: Basics of GDPR
                  </span>
                  <span style={{ fontSize: '0.9em', color: '#6c757d' }}>30 mins</span>
                </Link>
              </li>
              <li style={getLessonStyles(4)}>
                <Link to="/lesson4" style={getLessonLinkStyles(4)} onClick={e => {
                  if (localStorage.getItem('lesson3Viewed') !== 'true' || localStorage.getItem('quiz1Passed') !== 'true') {
                    e.preventDefault();
                    alert('You should first complete Lesson 3 and pass Quiz 1 before proceeding.');
                  }
                }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <Lock 
                      size={16} 
                      style={{ 
                        color: '#6c757d', 
                        marginRight: '8px', 
                        verticalAlign: 'middle' 
                      }} 
                    />
                    Lesson 04: Handling Sensitive Information
                  </span>
                  <span style={{ fontSize: '0.9em', color: '#6c757d' }}>30 mins</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="section">
            <h3>PRACTICE QUIZ</h3>
            <ul className="lesson-list">
              <li style={getQuizStyles(1)}>
                <Link to="/quiz" style={getQuizLinkStyles(1)}>
                  <span>Lesson 01: Introduction to Data Protection</span>
                </Link>
              </li>
              <li style={getQuizStyles(2)}>
                <Link to="/quiz2" style={getQuizLinkStyles(2)} onClick={e => {
                  if (localStorage.getItem('quiz1Passed') !== 'true') {
                    e.preventDefault();
                    alert('You must complete and pass Quiz 1 before accessing any quizzes.');
                  }
                }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <Lock 
                      size={16} 
                      style={{ 
                        color: '#6c757d', 
                        marginRight: '8px', 
                        verticalAlign: 'middle' 
                      }} 
                    />
                    Lesson 02: What is ISP ?
                  </span>
                </Link>
              </li>
              <li style={getQuizStyles(3)}>
                <Link to="/quiz3" style={getQuizLinkStyles(3)} onClick={e => {
                  if (localStorage.getItem('quiz1Passed') !== 'true') {
                    e.preventDefault();
                    alert('You must complete and pass Quiz 1 before accessing any quizzes.');
                  }
                }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <Lock 
                      size={16} 
                      style={{ 
                        color: '#6c757d', 
                        marginRight: '8px', 
                        verticalAlign: 'middle' 
                      }} 
                    />
                    Lesson 03: Basics of GDPR
                  </span>
                </Link>
              </li>
              <li style={getQuizStyles(4)}>
                <Link to="/quiz4" style={getQuizLinkStyles(4)} onClick={e => {
                  if (localStorage.getItem('quiz1Passed') !== 'true') {
                    e.preventDefault();
                    alert('You must complete and pass Quiz 1 before accessing any quizzes.');
                  }
                }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <Lock 
                      size={16} 
                      style={{ 
                        color: '#6c757d', 
                        marginRight: '8px', 
                        verticalAlign: 'middle' 
                      }} 
                    />
                    Lesson 04: Handling Sensitive Information
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
