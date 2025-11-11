import React from "react";
import { Link, useNavigate } from "react-router-dom";
import courseImg from "../assets/course.jpg";
import { User, ArrowRight, ArrowLeft, Home } from "lucide-react";

const Lesson03GDPR = () => {
  const navigate = useNavigate();
  const currentLessonNumber = 3;
  const lessons = [
    { id: 1, title: "Lesson 01: Introduction to Data Protection", path: "/contentpage" },
    { id: 2, title: "Lesson 02: What is ISP ?", path: "/lesson2" },
    { id: 3, title: "Lesson 03: Basics of GDPR", path: "/lesson3" },
    { id: 4, title: "Lesson 04: Handling Sensitive Information", path: "/lesson4" },
  ];

  const quizzes = [
    { id: 1, title: "Lesson 01: Introduction to Data Protection", path: "/quiz" },
    { id: 2, title: "Lesson 02: What is ISP ?", path: "/quiz2" },
    { id: 3, title: "Lesson 03: Basics of GDPR", path: "/quiz3" },
    { id: 4, title: "Lesson 04: Handling Sensitive Information", path: "/quiz4" },
  ];

  const styles = {
    completed: {
      backgroundColor: "#f0f9f0",
      borderLeft: "4px solid #22c55e",
      borderRadius: "4px",
      padding: "8px 12px",
      marginBottom: "8px",
      position: "relative",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    },
    completedLink: {
      color: "#16a34a",
      textDecoration: "none",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      marginLeft: "20px"
    },
    completedDuration: {
      color: "#16a34a"
    },
    checkmark: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#22c55e",
      fontWeight: "bold"
    },
    active: {
      backgroundColor: "#ffa726",
      borderLeft: "5px solid #fb8c00",
      fontWeight: "600",
      color: "white",
      padding: "10px 12px",
      borderRadius: "6px",
      marginBottom: "8px",
      textDecoration: "none",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    },
    locked: {
      backgroundColor: "#f0f0f0",
      color: "#aaa",
      padding: "10px 12px",
      borderRadius: "6px",
      marginBottom: "8px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      pointerEvents: "none",
      opacity: 0.6,
      cursor: "not-allowed"
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      {/* Header Section */}
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>
            Learn about <span style={{ color: "#4caf50" }}>ISP, GDPR & Compliance</span>
          </h1>
          <p>Basics of General Data Protection Regulation (GDPR)</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button 
            onClick={() => navigate('/')}
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
          <div style={{ fontWeight: "bold" }}>30 mins</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "30px" }}>
        {/* Left section */}
        <div style={{ flex: 2 }}>
          <div style={{ marginBottom: "20px" }}>
            <img src={courseImg} alt="Course" style={{ width: "100%", borderRadius: "10px" }} />
            <div style={{ marginTop: "10px", color: "green" }}>50% completed</div>
          </div>

          <div>
            <h2>Introduction to GDPR</h2>
            <p>The General Data Protection Regulation (GDPR)...</p>
            <h2>Key Principles of GDPR</h2>
            <p>GDPR establishes seven fundamental principles...</p>
            <h2>Individual Rights Under GDPR</h2>
            <p>GDPR significantly strengthens individual rights...</p>
            <h2>Enforcement and Penalties</h2>
            <p>GDPR enforcement is carried out by supervisory authorities...</p>

            {/* Navigation Section */}
            <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
              <Link to="/lesson2" style={{ textDecoration: "none", color: "#007bff" }}>
                <ArrowLeft size={16} /> Previous Lesson
              </Link>
              <Link to="/lesson4" style={{ textDecoration: "none", color: "#007bff", marginLeft: "auto" }}>
                Next Lesson <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Instructor */}
          <div style={{ marginTop: "40px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px", display: "flex", gap: "15px", alignItems: "center" }}>
            <User size={24} />
            <div>
              <h4>Bulkin Simons</h4>
              <p>Certified Data Protection Officer with over 10 years of experience...</p>
            </div>
          </div>
        </div>

        {/* Right section */}
        <div style={{ flex: 1 }}>
          <div>
            <h3>Courses</h3>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {lessons.map((lesson) => {
                if (lesson.id < currentLessonNumber) {
                  // Completed lessons - green style
                  return (
                    <li key={lesson.id} style={styles.completed}>
                      <span style={styles.checkmark}>✓</span>
                      <Link to={lesson.path} style={styles.completedLink}>
                        <span>{lesson.title}</span>
                        <span style={styles.completedDuration}>30 mins</span>
                      </Link>
                    </li>
                  );
                } else if (lesson.id === currentLessonNumber) {
                  // Current lesson - active style
                  return (
                    <li key={lesson.id}>
                      <Link to={lesson.path} style={styles.active}>
                        <span>{lesson.title}</span>
                        <span>30 mins</span>
                      </Link>
                    </li>
                  );
                } else {
                  // Future lessons - locked style
                  return (
                    <li key={lesson.id}>
                      <div style={styles.locked}>
                        <span>{lesson.title}</span>
                        <span>🔒</span>
                      </div>
                    </li>
                  );
                }
              })}
            </ul>
          </div>

          <div style={{ marginTop: "30px" }}>
            <h3>PRACTICE QUIZ</h3>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {quizzes.map((quiz) => {
                if (quiz.id < currentLessonNumber) {
                  // Completed quizzes - green style
                  return (
                    <li key={quiz.id} style={styles.completed}>
                      <span style={styles.checkmark}>✓</span>
                      <Link to={quiz.path} style={styles.completedLink}>
                        <span>{quiz.title}</span>
                      </Link>
                    </li>
                  );
                } else if (quiz.id === currentLessonNumber) {
                  // Current quiz - available
                  return (
                    <li key={quiz.id} style={{ marginBottom: "8px" }}>
                      <Link to={quiz.path} style={{ textDecoration: "none", color: "#007bff" }}>
                        {quiz.title}
                      </Link>
                    </li>
                  );
                } else {
                  // Future quizzes - locked
                  return (
                    <li key={quiz.id} style={{ marginBottom: "8px", color: "#aaa", pointerEvents: "none" }}>
                      {quiz.title} 🔒
                    </li>
                  );
                }
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lesson03GDPR;
