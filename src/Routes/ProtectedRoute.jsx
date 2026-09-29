import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import Loader from "@/components/ReusableComponents/Loader";
import { ROUTES } from "./routes.constants";

const ProtectedRoute = ({ children, roles }) => {
  const {
    user,
    isAuthenticated,
    isLoading,
    // refreshUserSession
  } = useAuth();
  const location = useLocation();

  // Sync latest user roles from backend when accessing a protected route
  // useEffect(() => {
  //   if (isAuthenticated && user?.username) {
  //     refreshUserSession();
  //   }
  // }, [location.pathname, isAuthenticated, user?.username, refreshUserSession]);

  // Show premium loading screen while checking session
  if (isLoading) {
    return <Loader />;
  }

  // If not logged in, redirect to login page
  // We save the current location in state so we can redirect back after login
  if (!isAuthenticated || !user) {
    return (
      <Navigate to={ROUTES.PUBLIC.LOGIN} state={{ from: location }} replace />
    );
  }

  // Admin bypass: Admins can access everything
  if (user.isAdmin) {
    return <>{children}</>;
  }

  // Check role-based access
  if (roles && !roles.some((role) => user.roles.includes(role))) {
    return <Navigate to={ROUTES.PUBLIC.UNAUTHORIZED} replace />;
  }
  // Access granted
  return <>{children}</>;
};
export default ProtectedRoute;
