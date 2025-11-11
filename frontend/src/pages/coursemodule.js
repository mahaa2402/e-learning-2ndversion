import React, { useState } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Phone, Mail, Facebook, Twitter, Linkedin } from 'lucide-react';
import './coursemodule.css'; // Import the external CSS file

const VistaCourseModules = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const courses = [
    {
      id: 1,
      title: "ISP, GDPR & Compliance",
      description: "Understand the basics of data protection, information security, and regulatory compliance. Learn how to implement GDPR principles responsibly and safeguard digital assets at work.",
      image: "/api/placeholder/300/200",
      category: "Compliance",
      status: "Active"
    },
    {
      id: 2,
      title: "ISP, GDPR & Compliance",
      description: "Understand the basics of data protection, information security, and regulatory compliance. Learn how to implement GDPR principles responsibly and safeguard digital assets at work.",
      image: "/api/placeholder/300/200",
      category: "Compliance",
      status: "Active"
    },
    {
      id: 3,
      title: "ISP, GDPR & Compliance",
      description: "Understand the basics of data protection, information security, and regulatory compliance. Learn how to implement GDPR principles responsibly and safeguard digital assets at work.",
      image: "/api/placeholder/300/200",
      category: "Compliance",
      status: "Active"
    }
  ];

  const recommendedCourses = [
    {
      id: 1,
      title: "Factory Act & Regulations",
      instructor: "Master the basics of essential office software like Microsoft Office, Google Workspace, and email practices using the latest innovations.",
      image: "/api/placeholder/150/150",
      rating: 4.8
    },
    {
      id: 2,
      title: "Wireframing, CNC, Fitting Skilling",
      instructor: "Learn about various provisions of the Factories Act. Learn about various provisions of the Factories Act throughout safety regulations.",
      image: "/api/placeholder/150/150",
      rating: 4.9
    },
    {
      id: 3,
      title: "Factory Act & Regulations",
      instructor: "Master the basics of essential office software like Microsoft Office, Google Workspace, and email practices using the latest innovations.",
      image: "/api/placeholder/150/150",
      rating: 4.8
    },
    {
      id: 4,
      title: "Wireframing, CNC, Fitting Skilling",
      instructor: "Learn about various provisions of the Factories Act. Learn about various provisions of the Factories Act throughout safety regulations.",
      image: "/api/placeholder/150/150",
      rating: 4.9
    }
  ];

  const categories = ['All', 'Compliance', 'Technical', 'Safety', 'Management'];
  const statuses = ['All', 'Active', 'Pending', 'Completed'];

  return (
    <div className="vista-container">
      {/* Header */}
      <header className="vista-header">
        <div className="vista-header-content">
          <div className="vista-header-inner">
            <div className="vista-logo-nav">
              <div className="vista-logo">
                <span>VISTA</span>
              </div>
              <nav className="vista-nav">
                <a href="#" className="vista-nav-link">Home</a>
                <a href="#" className="vista-nav-link active">Courses</a>
                <a href="#" className="vista-nav-link">Certifications</a>
                <a href="#" className="vista-nav-link">About</a>
              </nav>
            </div>
            <div className="vista-header-buttons">
              <button className="vista-btn vista-btn-primary">
                Get Started
              </button>
              <button className="vista-btn vista-btn-secondary">
                Login
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="vista-hero">
        <div className="vista-hero-overlay"></div>
        <div 
          className="vista-hero-content"
style={{
  backgroundImage: `url('/uploads/course.jpg')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}}
          
        >
          <div className="vista-hero-inner">
            <div className="vista-hero-text">
              <h1 className="vista-hero-title">Course Modules Page</h1>
              <p className="vista-hero-subtitle">Explore our comprehensive learning modules</p>
              
              {/* Search and Filters */}
              <div className="vista-search-container">
                <div className="vista-search-form">
                  <div className="vista-search-input-container">
                    <Search className="vista-search-icon" />
                    <input
                      type="text"
                      placeholder="Search your favourite course..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="vista-search-input"
                    />
                  </div>
                  
                  <div className="vista-filters">
                    <div className="vista-select-container">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="vista-select"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <ChevronDown className="vista-select-icon" />
                    </div>
                    
                    <div className="vista-select-container">
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="vista-select"
                      >
                        {statuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                      <ChevronDown className="vista-select-icon" />
                    </div>
                  </div>
                  
                  <button className="vista-search-btn">
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="vista-main">
        {/* Related Courses Section */}
        <section className="vista-section">
          <h2 className="vista-section-title">Related Courses</h2>
          <div className="vista-courses-grid">
            {courses.map((course) => (
              <div key={course.id} className="vista-course-card">
                <div className="vista-course-image">
                  <img
                    src={require('../assets/courseimg.jpeg')}
                    alt={course.title}
                    className="course-image"
                  />
                </div>
                <div className="vista-course-content">
                  <h3 className="vista-course-title">{course.title}</h3>
                  <p className="vista-course-description">{course.description}</p>
                  <div className="vista-course-meta">
                    <span className="vista-course-category">{course.category}</span>
                    <span className="vista-course-status">{course.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          <div className="vista-pagination">
            <div className="vista-pagination-container">
              <button className="vista-pagination-btn">
                <ChevronLeft />
              </button>
              <a href="#" className="vista-pagination-number active">1</a>
              <a href="#" className="vista-pagination-number">2</a>
              <button className="vista-pagination-btn">
                <ChevronRight />
              </button>
            </div>
          </div>
        </section>

        {/* Recommended Courses Section */}
        <section className="vista-recommended">
          <div className="vista-recommended-header">
            <h2 className="vista-section-title">Recommended Courses for you</h2>
            <div className="vista-recommended-nav">
              <button className="vista-nav-btn">
                <ChevronLeft />
              </button>
              <button className="vista-nav-btn">
                <ChevronRight />
              </button>
            </div>
          </div>
          
          <div className="vista-recommended-grid">
            {recommendedCourses.map((course) => (
              <div key={course.id} className="vista-recommended-card">
                <div className="vista-recommended-image">
                  <img
                    src={require('../assets/course.jpg')}
                    alt={course.title}
                    className="course-image"
                  />
                </div>
                <div className="vista-recommended-content">
                  <h3 className="vista-recommended-title">{course.title}</h3>
                  <p className="vista-recommended-instructor">{course.instructor}</p>
                  <div className="vista-rating">
                    <span className="vista-stars">★★★★★</span>
                    <span className="vista-rating-number">{course.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="vista-footer">
        <div className="vista-footer-content">
          <div className="vista-footer-grid">
            <div className="vista-footer-section">
              <h3>VISTA</h3>
              <div className="vista-footer-contact">
                <div className="vista-footer-contact-item">
                  <Phone />
                  <span>+91 9033 33 2509</span>
                </div>
                <div className="vista-footer-contact-item">
                  <Mail />
                  <span>support@vista.com</span>
                </div>
              </div>
            </div>
            
            <div className="vista-footer-section">
              <h4>Quick Links</h4>
              <div className="vista-footer-links">
                <a href="#" className="vista-footer-link">Home</a>
                <a href="#" className="vista-footer-link">Courses</a>
                <a href="#" className="vista-footer-link">Certifications</a>
                <a href="#" className="vista-footer-link">Our FAQ</a>
              </div>
            </div>
            
            <div className="vista-footer-section">
              <h4>About Us</h4>
              <div className="vista-footer-links">
                <a href="#" className="vista-footer-link">Company</a>
                <a href="#" className="vista-footer-link">Achievements</a>
                <a href="#" className="vista-footer-link">Our Goals</a>
              </div>
            </div>
            
            <div className="vista-footer-section">
              <h4>Social Profiles</h4>
              <div className="vista-social-links">
                <a href="#" className="vista-social-link">
                  <Facebook />
                </a>
                <a href="#" className="vista-social-link">
                  <Twitter />
                </a>
                <a href="#" className="vista-social-link">
                  <Linkedin />
                </a>
              </div>
            </div>
          </div>
          
          <div className="vista-footer-bottom">
            <p>&copy; 2024 VISTA. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VistaCourseModules;
