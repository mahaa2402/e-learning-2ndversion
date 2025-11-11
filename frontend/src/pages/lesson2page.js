// frontend/src/Lesson02ISP.js
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./lesson1page.css";
import video2 from "../assets/lesson4video2.mp4";
import { User, ArrowRight, ArrowLeft, Lock, CheckCircle, Home } from "lucide-react";

const Lesson02ISP = () => {
  const navigate = useNavigate();
  const [quizStatus, setQuizStatus] = useState({
    quiz1Passed: localStorage.getItem('quiz1Passed') === 'true',
    quiz2Passed: localStorage.getItem('quiz2Passed') === 'true',
    quiz3Passed: localStorage.getItem('quiz3Passed') === 'true',
    quiz4Passed: localStorage.getItem('quiz4Passed') === 'true',
  });

  // Check access but don't mark as completed yet
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
    // Check if user has access to this lesson
    const lesson1Viewed = localStorage.getItem('lesson1Viewed') === 'true';
    if (!lesson1Viewed) {
      console.log('Redirecting to lesson1 - prerequisite not met');
      navigate('/lesson1', { replace: true });
      return;
    }

    // Optional: Update current level if this is the user's current position
    const currentLevel = parseInt(localStorage.getItem('levelCleared')) || 0;
    if (currentLevel === 1) {
      // User is currently on lesson 2, this is correct
      console.log('User is on correct lesson 2');
    }
  }, [navigate]);

  // Helper function to get lesson styles
  const getLessonStyles = (lessonNumber) => {
    const isCompleted = localStorage.getItem(`lesson${lessonNumber}Viewed`) === 'true';
    const isActive = lessonNumber === 2;
    const isLocked = lessonNumber > 2;

    const baseStyle = {
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '8px',
      transition: 'all 0.3s ease',
      border: '1px solid #dee2e6'
    };

    if (isCompleted && lessonNumber < 2) {
      return {
        ...baseStyle,
        backgroundColor: '#d4edda',
        border: '1px solid #c3e6cb'
      };
    }
    if (isActive) {
      return {
        ...baseStyle,
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107'
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
    // Quiz 1 is always accessible, Quiz 2 is accessible on lesson 2, Quiz 3+ locked until previous quiz passed
    const isLocked = quizNumber >= 3 && !quizStatus[`quiz${quizNumber - 1}Passed`];

    const baseStyle = {
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '8px',
      transition: 'all 0.3s ease',
      border: '1px solid #dee2e6'
    };

    if (isPassed) {
      return {
        ...baseStyle,
        backgroundColor: '#d4edda',
        border: '1px solid #c3e6cb'
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
    const isCompleted = localStorage.getItem(`lesson${lessonNumber}Viewed`) === 'true';
    const isActive = lessonNumber === 2;
    const isLocked = lessonNumber > 2;

    const baseStyle = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      textDecoration: 'none'
    };

    if (isCompleted && lessonNumber < 2) {
      return {
        ...baseStyle,
        color: '#155724'
      };
    }
    if (isActive) {
      return {
        ...baseStyle,
        color: '#856404',
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
    const isPassed = quizStatus[`quiz${quizNumber}Passed`];
    // Quiz 1 is always accessible, Quiz 2 is accessible on lesson 2, Quiz 3+ locked until previous quiz passed
    const isLocked = quizNumber >= 3 && !quizStatus[`quiz${quizNumber - 1}Passed`];

    const baseStyle = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      textDecoration: 'none'
    };

    if (isPassed) {
      return {
        ...baseStyle,
        color: '#155724'
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
          <p>What is an Internet Service Provider (ISP)?</p>
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
          <div className="course-duration">30 mins</div>
        </div>
      </div>

      <div className="course-main">
        {/* Left section with video and content */}
        <div className="course-left">
          <div className="video-preview">
            <video 
              src={video2} 
              controls 
              style={{ height: '480px', objectFit: 'cover', width: '100%' }}
              onError={(e) => {
                console.error('Video failed to load:', e);
              }}
            >
              Your browser does not support the video tag.
            </video>
            <div className="progress-text">25% completed</div>
          </div>

          <div className="course-content">
            <h2>Understanding Internet Service Providers (ISPs)</h2>
            <p>
              An Internet Service Provider (ISP) is a company or organization that provides individuals, businesses, and other organizations with access to the internet and related services. ISPs serve as the bridge between end users and the global internet infrastructure, offering various types of internet connections including broadband, fiber optic, cable, DSL, and wireless services.
            </p>
            
            <p>
              ISPs operate at different levels of the internet hierarchy. Tier 1 ISPs are large networks that form the backbone of the internet, connecting directly to other Tier 1 networks without paying for transit. Tier 2 ISPs are regional or national providers that purchase internet access from Tier 1 providers while also peering with other Tier 2 networks. Tier 3 ISPs are typically local providers that purchase all their internet access from upstream providers.
            </p>

            <h2>Types of ISP Services</h2>
            <p>
              ISPs offer various types of internet connectivity services to meet different user needs and budgets. Dial-up connections, though largely obsolete, were the earliest form of internet access using telephone lines. Digital Subscriber Line (DSL) provides broadband internet over existing telephone infrastructure, offering faster speeds than dial-up while allowing simultaneous voice and data transmission.
            </p>
            
            <p>
              Cable internet utilizes coaxial cable television infrastructure to deliver high-speed internet access, often bundled with TV and phone services. Fiber optic internet represents the most advanced technology, using light signals through glass fibers to provide extremely fast and reliable connections with symmetric upload and download speeds.
            </p>

            <h2>ISP Security Responsibilities</h2>
            <p>
              ISPs have significant security responsibilities including protecting their network infrastructure from cyber attacks, preventing unauthorized access to customer data, and helping combat internet-based crimes. They must implement robust cybersecurity measures to protect against distributed denial-of-service (DDoS) attacks, malware distribution, and other threats that could compromise their networks or customers' security.
            </p>
            
            <p>
              Many ISPs offer security services to their customers, including firewalls, antivirus software, spam filtering, and parental controls. They also play a crucial role in incident response, working with law enforcement and cybersecurity organizations to investigate and mitigate security threats. ISPs must balance security measures with user privacy rights and avoid overreaching surveillance practices.
            </p>

            {/* Navigation Section */}
            <div className="lesson-navigation">
              <div className="nav-buttons">
                <Link to="/lesson1" className="nav-btn prev-btn">
                  <ArrowLeft size={16} />
                  Previous Lesson
                </Link>
                <Link to="/lesson3" className="nav-btn next-btn">
                  Next Lesson
                  <ArrowRight size={16} />
                </Link>
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
                <Link to="/lesson1" style={getLessonLinkStyles(1)}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {localStorage.getItem('lesson1Viewed') === 'true' && (
                      <CheckCircle 
                        size={16} 
                        style={{ 
                          color: '#28a745', 
                          marginRight: '8px', 
                          verticalAlign: 'middle' 
                        }} 
                      />
                    )}
                    Lesson 01: Introduction to DataProtection
                  </span>
                  <span style={{ fontSize: '0.9em', color: '#6c757d' }}>30 min</span>
                </Link>
              </li>
              <li style={getLessonStyles(2)}>
                <Link to="/lesson2" style={getLessonLinkStyles(2)}>
                  <span>Lesson 02: What is ISP ?</span>
                  <span style={{ fontSize: '0.9em', color: '#6c757d' }}>30 mins</span>
                </Link>
              </li>
              <li style={getLessonStyles(3)}>
                <Link to="/lesson3" style={getLessonLinkStyles(3)} onClick={e => {
                  if (localStorage.getItem('lesson2Viewed') !== 'true') {
                    e.preventDefault();
                    alert('You should first complete Lesson 2 before proceeding.');
                  }
                }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {localStorage.getItem('lesson2Viewed') !== 'true' && (
                      <Lock 
                        size={16} 
                        style={{ 
                          color: '#6c757d', 
                          marginRight: '8px', 
                          verticalAlign: 'middle' 
                        }} 
                      />
                    )}
                    Lesson 03: Basics of GDPR
                  </span>
                  <span style={{ fontSize: '0.9em', color: '#6c757d' }}>30 mins</span>
                </Link>
              </li>
              <li style={getLessonStyles(4)}>
                <Link to="/lesson4" style={getLessonLinkStyles(4)} onClick={e => {
                  if (localStorage.getItem('lesson3Viewed') !== 'true') {
                    e.preventDefault();
                    alert('You should first complete Lesson 3 before proceeding.');
                  }
                }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {localStorage.getItem('lesson3Viewed') !== 'true' && (
                      <Lock 
                        size={16} 
                        style={{ 
                          color: '#6c757d', 
                          marginRight: '8px', 
                          verticalAlign: 'middle' 
                        }} 
                      />
                    )}
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
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {quizStatus.quiz1Passed && (
                      <CheckCircle 
                        size={16} 
                        style={{ 
                          color: '#28a745', 
                          marginRight: '8px', 
                          verticalAlign: 'middle' 
                        }} 
                      />
                    )}
                    Lesson 01: Introduction to Data Protection
                  </span>
                </Link>
              </li>
              <li style={getQuizStyles(2)}>
                <Link to="/quiz2" style={getQuizLinkStyles(2)}>
                  <span style={{ display: 'flex', alignItems: 'center', color: '#007bff' }}>
                    {quizStatus.quiz2Passed && (
                      <CheckCircle 
                        size={16} 
                        style={{ 
                          color: '#28a745', 
                          marginRight: '8px', 
                          verticalAlign: 'middle' 
                        }} 
                      />
                    )}
                    Lesson 02: What is ISP ?
                  </span>
                </Link>
              </li>
              <li style={getQuizStyles(3)}>
                <Link to="/quiz3" style={getQuizLinkStyles(3)} onClick={e => {
                  if (!quizStatus.quiz2Passed) {
                    e.preventDefault();
                    alert('Please complete and pass Quiz 2 before attempting Quiz 3.');
                  }
                }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {!quizStatus.quiz2Passed && (
                      <Lock 
                        size={16} 
                        style={{ 
                          color: '#6c757d', 
                          marginRight: '8px', 
                          verticalAlign: 'middle' 
                        }} 
                      />
                    )}
                    {quizStatus.quiz3Passed && (
                      <CheckCircle 
                        size={16} 
                        style={{ 
                          color: '#28a745', 
                          marginRight: '8px', 
                          verticalAlign: 'middle' 
                        }} 
                      />
                    )}
                    Lesson 03: Basics of GDPR
                  </span>
                </Link>
              </li>
              <li style={getQuizStyles(4)}>
                <Link to="/quiz4" style={getQuizLinkStyles(4)} onClick={e => {
                  if (!quizStatus.quiz3Passed) {
                    e.preventDefault();
                    alert('Please complete and pass Quiz 3 before attempting Quiz 4.');
                  }
                }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {!quizStatus.quiz3Passed && (
                      <Lock 
                        size={16} 
                        style={{ 
                          color: '#6c757d', 
                          marginRight: '8px', 
                          verticalAlign: 'middle' 
                        }} 
                      />
                    )}
                    {quizStatus.quiz4Passed && (
                      <CheckCircle 
                        size={16} 
                        style={{ 
                          color: '#28a745', 
                          marginRight: '8px', 
                          verticalAlign: 'middle' 
                        }} 
                      />
                    )}
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

export default Lesson02ISP;
