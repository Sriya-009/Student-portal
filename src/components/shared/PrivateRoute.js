import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function PrivateRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default PrivateRoute;
