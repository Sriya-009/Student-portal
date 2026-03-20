import { Navigate, Route, Routes } from 'react-router-dom';
import PrivateRoute from './components/shared/PrivateRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';
import FacultyProfile from './pages/FacultyProfile';
import AdminProfile from './pages/AdminProfile';
import AssignTasks from './pages/AssignTasks';
import UploadFiles from './pages/UploadFiles';
import Progress from './pages/Progress';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<PrivateRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
      </Route>

      <Route element={<PrivateRoute allowedRoles={['faculty']} />}>
        <Route path="/faculty" element={<FacultyDashboard />} />
        <Route path="/teacher" element={<Navigate to="/faculty" replace />} />
      </Route>

      <Route element={<PrivateRoute allowedRoles={['student']} />}>
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/profile" element={<StudentProfile />} />
      </Route>

      <Route element={<PrivateRoute allowedRoles={['faculty']} />}>
        <Route path="/faculty/profile" element={<FacultyProfile />} />
        <Route path="/assign-tasks" element={<AssignTasks />} />
        <Route path="/upload-files" element={<UploadFiles />} />
      </Route>

      <Route element={<PrivateRoute allowedRoles={['admin', 'faculty', 'student']} />}>
        <Route path="/progress" element={<Progress />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;
