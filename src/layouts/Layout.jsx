import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import Header from "./Header";
import { ROUTES } from "@/Routes/routes.constants";

const Layout = ({ children, className = "" }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const hideHeader = !isAuthenticated || location.pathname === ROUTES.PUBLIC.LOGIN;

  if (hideHeader) {
    return <main className="bg-slate-50">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className={`bg-slate-50 ${className}`}>
        <div className="container mx-auto">{children}</div>
      </main>
    </>
  );
};

export default Layout;
