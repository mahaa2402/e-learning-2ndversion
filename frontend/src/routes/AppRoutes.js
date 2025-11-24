import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';


// Auth pages
import Login from '../pages/login';
import Register from '../pages/register';
import VRUQuizPage from '../pages/VRUquizpage';

// Public page
import LandingPage from '../pages/landingpage';
import AdminDashboard from '../pages/admindashboard';
import AdminCourses from '../pages/admincourses';
import Sidebar from '../pages/sidebar';
import AssignTask from '../pages/assigntask';
import EmployeeTracking from '../pages/employeetracking';
import UserDashboard from '../pages/userdashboard';
import Lesson1 from '../pages/lesson1page';
import CourseDetailPage from '../pages/coursedetailpage';
import CourseModules from '../pages/coursemodule';
import Lesson2 from '../pages/lesson2page';
import Lesson3 from '../pages/lesson3page';
import Lesson4 from '../pages/lesson4page';
import Quiz from '../pages/quiz';
import TaskDetailPage from '../pages/taskdetailpage';
import TaskModulePage from '../pages/taskmodulepage';
import AssignedQuizPage from '../pages/assignedquizpage';
import CertificatePage from '../pages/certificate';
import CertificateDetails from '../pages/certificatedetail';
import CreateCommonCourses from '../pages/createcommoncourses';

import LessonPage from "../pages/lessonpage";
import CourseAccess from "../pages/CourseAccess";






function AppRoutes() {
  // Small URL sanitizer: some email clients or link generators may append
  // an extra quote (`"`) or `%22` at the end of the href. When that
  // happens React Router may not match the expected route (e.g. 
  // `/course-access?token=..."`). We detect that and replace the URL
  // with a cleaned version before the router mounts.
  useEffect(() => {
    try {
      const href = window.location.href;
      // If URL contains an unencoded double quote or %22 at the end
      if (href.includes('"') || href.endsWith('%22')) {
        const cleaned = href.replace(/\"/g, '').replace(/%22/g, '');
        // Replace current history entry so back button behaves normally
        window.history.replaceState(null, '', cleaned);
        console.log('🔧 Cleaned stray quote from URL, new URL:', cleaned);
      }
    } catch (err) {
      console.warn('⚠️ URL sanitizer failed:', err);
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Course access route - placed early to ensure it's matched before other routes */}
        <Route path="/course-access" element={<CourseAccess />} />
        <Route path="/admindashboard" element={<AdminDashboard />} />
        <Route path="/admincourses" element={<AdminCourses />} />
        <Route path="/createcommoncourses" element={<CreateCommonCourses />} />
        <Route path="/sidebar" element={<Sidebar />} />
        <Route path="/assigntask" element={<AssignTask />} />
        <Route path="/employeetracking" element={<EmployeeTracking />} />
         <Route path="/userdashboard" element={<UserDashboard />} />
         <Route path="/lesson1" element={<Lesson1 />} />
        <Route path="/coursedetailpage/:title" element={<CourseDetailPage />} />
        <Route path="/certificate" element={<CertificatePage />} />
         <Route path="/vru-quiz" element={<VRUQuizPage />} />
         <Route path="/coursemodules" element={<CourseModules />} />
        <Route path="/lesson2" element={<Lesson2 />} />
        <Route path="/lesson3" element={<Lesson3 />} />
        <Route path="/lesson4" element={<Lesson4 />} /> 
        <Route path="/quiz/:courseId/:mo_id" element={<Quiz />} />
        <Route path="/taskdetailpage" element={<TaskDetailPage />} />
        <Route path="/taskmodulepage" element={<TaskModulePage />} />
     
         <Route path="/course/:courseId/module/:moduleId" element={<TaskModulePage />} />
        <Route path="/assignedquizpage" element={<AssignedQuizPage />} />
        <Route path="/certificatedetail/:id" element={<CertificateDetails />} />
         <Route path="/course/:courseId/lesson/:lessonId" element={<LessonPage />} />
        {/* Add more routes as needed */}
          


        
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
