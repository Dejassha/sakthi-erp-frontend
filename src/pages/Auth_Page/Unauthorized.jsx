import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { ROUTES } from "@/Routes/routes.constants";
import Button from "@/components/ReusableComponents/Button";
import Loader from "@/components/ReusableComponents/Loader";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.PUBLIC.LOGIN} replace />;
  }
  return (
    <section className="bg-primary">
      <div className="flex flex-col items-center justify-center pt-10 2xl:pt-20">
        <div className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 text-red-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="absolute -top-3 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 border-2 border-white shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-red-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        <div className="max-w-md text-center">
          <h1 className="heading-primary mb-1">Restricted Access</h1>
          <p className="description-primary mb-6">
            Your account does not have the necessary permissions to access this
            module. If you believe this is an error, please contact your system
            administrator or IT helpdesk.
          </p>

          {/* Action Buttons - Pure HTML/Tailwind */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-3">
            <Button
              onClick={() => navigate(-1)}
              color="cancel"
              icon="mdi:arrow-left"
            >
              Go Back
            </Button>
            <Button
              onClick={() => navigate(ROUTES.DASHBOARD.MAIN)}
              color="blue"
              icon="mdi:view-dashboard-outline"
            >
              Go to Dashboard
            </Button>
          </div>

          {/* Support Info */}
          <div className="mt-8">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Contact Support
            </p>
            <p className="mt-1 text-sm text-slate-500 font-medium">
              {import.meta.env.VITE_SUPPORT_EMAIL}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Unauthorized;
