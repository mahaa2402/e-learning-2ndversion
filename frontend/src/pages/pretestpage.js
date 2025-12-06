import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PreTestQuiz from '../components/PreTestQuiz';
import { API_ENDPOINTS } from '../config/api';

const PreTestPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preTestDone, setPreTestDone] = useState(false);
  const [preTestStorageKey, setPreTestStorageKey] = useState(null);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_ENDPOINTS.COURSES.GET_COURSE}/${courseId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Course not found');
        const data = await response.json();
        setCourseData(data);
        const employeeEmail = typeof window !== 'undefined' ? localStorage.getItem('employeeEmail') : null;
        const key = employeeEmail && data?._id ? `pretest_done_${employeeEmail}_${data._id}` : null;
        setPreTestStorageKey(key);
        setPreTestDone(key ? localStorage.getItem(key) === 'true' : false);
      } catch (err) {
        console.error('Error getting course for pretest:', err);
        setError(err.message || 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  const submitPreTestToServer = async ({ score, total, answers }) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const payload = {
        courseId: courseData._id || courseId,
        courseName: courseData.title || courseData.name || courseId,
        score,
        total,
        answers,
        passingScore: courseData.preTest?.passingScore
      };

      if (token) {
        try {
          const res = await fetch(API_ENDPOINTS.PRETEST.SUBMIT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            console.warn('Pretest submit returned non-ok:', res.status);
          }
        } catch (err) {
          console.error('Network error submitting pretest:', err);
        }
      }

      // Save local flag
      if (preTestStorageKey) {
        localStorage.setItem(preTestStorageKey, 'true');
      }
      // Save course name/title to navigate back from certificate
      const certCourseTitle = courseData.title || courseData.name || courseId;
      const certCourseId = courseData._id || courseId;
      localStorage.setItem('certificateCourseTitle', certCourseTitle);
      localStorage.setItem('certificateCourseId', certCourseId);
      localStorage.setItem('fromPreTest', 'true');

      setPreTestDone(true);

      navigate('/certificate', {
        state: {
          fromPreTest: true,
          certificateDataOverride: {
            courseTitle: courseData.title || courseData.name || courseId,
            completionDate: new Date().toISOString()
          }
        }
      });
    } catch (err) {
      console.error('Error in submitPreTestToServer:', err);
      // still mark done locally
      if (preTestStorageKey) {
        localStorage.setItem(preTestStorageKey, 'true');
      }
      setPreTestDone(true);
      localStorage.setItem('fromPreTest', 'true');
      navigate('/certificate', {
        state: {
          fromPreTest: true,
          certificateDataOverride: {
            courseTitle: courseData?.title || courseData?.name || courseId,
            completionDate: new Date().toISOString()
          }
        }
      });
    }
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading pretest...</div>;
  }

  if (error) {
    return <div style={{ padding: 40 }}>
      <h3>Error loading pretest</h3>
      <p>{error}</p>
      <button onClick={() => navigate(-1)}>Back</button>
    </div>;
  }

  if (!courseData || !courseData.preTest || !courseData.preTest.enabled) {
    return <div style={{ padding: 40 }}>
      <h3>No pretest configured for this course.</h3>
      <button onClick={() => navigate(-1)}>Back</button>
    </div>;
  }

  if (preTestDone) {
    return <div style={{ padding: 40 }}>
      <h3>You have already completed the pretest for this course.</h3>
      <button onClick={() => navigate(`/coursedetailpage/${courseData.title}`)}>Go to Course</button>
    </div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Pre-test — {courseData.title}</h2>
      <PreTestQuiz courseTitle={courseData.title} questions={courseData.preTest.questions} onCompleted={submitPreTestToServer} />
    </div>
  );
};

export default PreTestPage;
