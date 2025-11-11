import React from 'react';
import { Link, useParams } from 'react-router-dom';
import courseData from './coursedata';

function Sidebar() {
  const { courseId } = useParams();
  const selectedCourse = courseData[courseId];

  return (
    <div style={{ width: "250px", padding: "1rem", borderRight: "1px solid #ddd" }}>
      <h3>Practice Quiz</h3>
      {selectedCourse ? (
        Object.entries(selectedCourse.lessons).map(([lessonId, lesson]) => (
          <Link
            key={lessonId}
            to={`/course/${courseId}/lesson/${lessonId}`}
            style={{
              display: "block",
              padding: "10px",
              marginBottom: "5px",
              textDecoration: "none",
              backgroundColor: "#f0f0f0",
              borderRadius: "5px"
            }}
          >
            {`Lesson ${lessonId}: ${lesson.title}`}
          </Link>
        ))
      ) : (
        <p>No lessons available</p>
      )}
    </div>
  );
}

export default Sidebar;
