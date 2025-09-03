import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * A higher-order component that acts as a route guard for authenticated routes.
 * It checks the user's authentication status from the AuthContext. While the
 * authentication status is being determined, it displays a loading indicator.
 * If the user is not authenticated, it redirects them to the login page,
 * preserving the intended destination for a potential redirect after login.
 *
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The component to render if the user is authenticated.
 * @returns {JSX.Element} The child component if authenticated, a loading indicator, or a redirect component.
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;