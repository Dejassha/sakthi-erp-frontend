import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import Loader from "@/components/ReusableComponents/Loader";
import { ROUTES } from "./routes.constants";

const LoginRedirect = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loader />;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD.MAIN} replace />;
  }

  return children;
};

export default LoginRedirect;
