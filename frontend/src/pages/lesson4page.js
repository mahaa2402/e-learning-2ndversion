import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./lesson1page.css";
import hsiImg from "../assets/hsi.jpg";
import { User, ArrowRight, ArrowLeft, Home } from "lucide-react";

const Lesson04SensitiveInfo = () => {
  const navigate = useNavigate();
  
  return (
    <div className="course-page">
      {/* Header Section */}
      <div className="course-header">
        <div className="course-header-text">
          <h1>
            Learn about <span className="highlight">ISP, GDPR & Compliance</span>
          </h1>
          <p>Handling Sensitive Information</p>
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
            <video controls style={{ height: '100%', objectFit: 'cover', width: '100%' }} poster={hsiImg}>
              <source src={require('../assets/lesson4video2.mp4')} type="video/mp4" /> 
              Your browser does not support the video tag.
            </video>
            <div className="progress-text">75% completed</div>
          </div>

          <div className="course-content">
            <h2>Understanding Sensitive Personal Data</h2>
            <p>
              Sensitive personal data, also known as special categories of personal data under GDPR, requires enhanced protection due to its particularly sensitive nature and the potential for significant harm if mishandled. This category includes information about racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, genetic data, biometric data, health data, and data concerning a person's sex life or sexual orientation.
            </p>
            
            <p>
              The distinction between regular personal data and sensitive personal data is crucial for compliance, as sensitive data is subject to additional restrictions and requires more stringent protection measures. Organizations must understand these categories to properly classify data and implement appropriate safeguards throughout the data lifecycle.
            </p>

            <h2>Legal Framework for Processing Sensitive Data</h2>
            <p>
              Under GDPR, processing of sensitive personal data is generally prohibited unless specific conditions are met. Article 9 establishes limited exceptions that allow processing of sensitive data, including explicit consent from the data subject, processing necessary to carry out obligations and rights in employment law, protection of vital interests when consent cannot be obtained, and processing by foundations or non-profit organizations with a political, philosophical, religious, or trade union aim.
            </p>
            
            <p>
              Additional exceptions include processing necessary for establishing, exercising, or defending legal claims, processing for reasons of substantial public interest, processing for preventive or occupational medicine purposes, and processing for public health purposes or historical research. Each exception has specific requirements and limitations that organizations must carefully evaluate before processing sensitive data.
            </p>

            <h2>Enhanced Security Measures</h2>
            <p>
              Sensitive personal data requires enhanced technical and organizational security measures beyond those applied to regular personal data. Technical measures include advanced encryption both at rest and in transit, multi-factor authentication, access controls based on the principle of least privilege, data loss prevention systems, and regular security monitoring and auditing.
            </p>
            
            <p>
              Organizational measures include comprehensive staff training on handling sensitive data, clear policies and procedures for data access and sharing, regular security assessments and penetration testing, incident response plans specifically addressing sensitive data breaches, and vendor management programs that ensure third parties meet enhanced security standards.
            </p>

            <h2>Healthcare and Medical Data</h2>
            <p>
              Healthcare data represents one of the most sensitive categories of personal information, requiring specialized handling procedures and additional regulatory compliance considerations. Healthcare organizations must comply with sector-specific regulations such as HIPAA in the United States, along with general data protection laws like GDPR.
            </p>
            
            <p>
              Medical data processing requires explicit consent or other specific legal bases, implementation of clinical data governance frameworks, secure electronic health record systems, and specialized staff training on healthcare privacy requirements. Organizations must also consider the unique challenges of medical research, genetic data processing, and cross-border health data transfers.
            </p>

            <h2>Training and Awareness Programs</h2>
            <p>
              Effective handling of sensitive personal data requires comprehensive training programs that go beyond general data protection awareness. These programs should include specific guidance on identifying sensitive data, understanding legal requirements for different categories of sensitive data, implementing appropriate security measures, and responding to incidents involving sensitive data.
            </p>
            
            <p>
              Training should be role-specific, with different levels of detail for different job functions, and should include regular refresher training to keep pace with evolving regulations and threats. Organizations should also implement awareness campaigns that help create a culture of privacy and security around sensitive data handling.
            </p>

            {/* Navigation Section */}
            <div className="lesson-navigation">
              <div className="nav-buttons">
                <Link to="/lesson3" className="nav-btn prev-btn">
                  <ArrowLeft size={16} />
                  Previous Lesson
                </Link>
                <button className="nav-btn next-btn" disabled>
                  Course Complete
                  <ArrowRight size={16} />
                </button>
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
              <li style={{
                backgroundColor: '#f0f9f0',
                borderLeft: '4px solid #22c55e',
                borderRadius: '4px',
                padding: '8px 12px',
                marginBottom: '8px',
                position: 'relative'
              }}>
                <Link to="/contentpage" style={{ color: '#16a34a', textDecoration: 'none' }}>
                  <span style={{ marginLeft: '20px' }}>Lesson 01: Introduction to DataProtection</span>
                  <span className="duration" style={{ color: '#16a34a' }}>30 min</span>
                </Link>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#22c55e',
                  fontWeight: 'bold'
                }}>✓</span>
              </li>
              <li style={{
                backgroundColor: '#f0f9f0',
                borderLeft: '4px solid #22c55e',
                borderRadius: '4px',
                padding: '8px 12px',
                marginBottom: '8px',
                position: 'relative'
              }}>
                <Link to="/lesson2" style={{ color: '#16a34a', textDecoration: 'none' }}>
                  <span style={{ marginLeft: '20px' }}>Lesson 02: What is ISP ?</span>
                  <span className="duration" style={{ color: '#16a34a' }}>30 mins</span>
                </Link>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#22c55e',
                  fontWeight: 'bold'
                }}>✓</span>
              </li>
              <li style={{
                backgroundColor: '#f0f9f0',
                borderLeft: '4px solid #22c55e',
                borderRadius: '4px',
                padding: '8px 12px',
                marginBottom: '8px',
                position: 'relative'
              }}>
                <Link to="/lesson3" style={{ color: '#16a34a', textDecoration: 'none' }}>
                  <span style={{ marginLeft: '20px' }}>Lesson 03: Basics of GDPR</span>
                  <span className="duration" style={{ color: '#16a34a' }}>30 mins</span>
                </Link>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#22c55e',
                  fontWeight: 'bold'
                }}>✓</span>
              </li>
              <li className="active">
                <Link to="/lesson4">
                  <span>Lesson 04: Handling Sensitive Information</span>
                  <span className="duration">30 mins</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="section">
            <h3>PRACTICE QUIZ</h3>
            <ul className="lesson-list">
              <li style={{
                backgroundColor: '#f0f9f0',
                borderLeft: '4px solid #22c55e',
                borderRadius: '4px',
                padding: '8px 12px',
                marginBottom: '8px',
                position: 'relative'
              }}>
                <Link to="/quiz" style={{ color: '#16a34a', textDecoration: 'none' }}>
                  <span style={{ marginLeft: '20px' }}>Lesson 01: Introduction to Data Protection</span>
                </Link>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#22c55e',
                  fontWeight: 'bold'
                }}>✓</span>
              </li>
              <li style={{
                backgroundColor: '#f0f9f0',
                borderLeft: '4px solid #22c55e',
                borderRadius: '4px',
                padding: '8px 12px',
                marginBottom: '8px',
                position: 'relative'
              }}>
                {/* Quiz 2 link is disabled until quiz 1 is passed */}
                {localStorage.getItem('quiz1Passed') === 'true' ? (
                  <Link to="/quiz2" style={{ color: '#16a34a', textDecoration: 'none' }}>
                    <span style={{ marginLeft: '20px' }}>Lesson 02: What is ISP ?</span>
                  </Link>
                ) : (
                  <span className="disabled-quiz" title="Complete and pass Quiz 1 first" style={{ marginLeft: '20px' }}>Lesson 02: What is ISP ? (Locked)</span>
                )}
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#22c55e',
                  fontWeight: 'bold'
                }}>✓</span>
              </li>
              <li style={{
                backgroundColor: '#f0f9f0',
                borderLeft: '4px solid #22c55e',
                borderRadius: '4px',
                padding: '8px 12px',
                marginBottom: '8px',
                position: 'relative'
              }}>
                {/* Quiz 3 link is disabled until quiz 1 is passed */}
                {localStorage.getItem('quiz1Passed') === 'true' ? (
                  <Link to="/quiz3" style={{ color: '#16a34a', textDecoration: 'none' }}>
                    <span style={{ marginLeft: '20px' }}>Lesson 03: Basics of GDPR</span>
                  </Link>
                ) : (
                  <span className="disabled-quiz" title="Complete and pass Quiz 1 first" style={{ marginLeft: '20px' }}>Lesson 03: Basics of GDPR (Locked)</span>
                )}
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#22c55e',
                  fontWeight: 'bold'
                }}>✓</span>
              </li>
              <li>
                {/* Quiz 4 link is disabled until quiz 1 is passed */}
              
                  <Link to="/quiz4">
                    <span>Lesson 04: Handling Sensitive Information</span>
                  </Link>
                
                
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lesson04SensitiveInfo;
