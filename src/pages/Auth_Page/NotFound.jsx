import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { ROUTES } from "@/Routes/routes.constants";
import Button from "@/components/ReusableComponents/Button";
import Loader from "@/components/ReusableComponents/Loader";

const NotFound = () => {
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
        <div className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-xl bg-white shadow-md border border-slate-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="absolute -right-3 -top-3 flex h-6 w-10 items-center justify-center rounded-lg bg-orange-500 text-xs font-bold text-white shadow-lg">
            404
          </span>
        </div>

        <div className="max-w-md text-center">
          <h1 className="heading-primary mb-1">Page Not Found</h1>
          <p className="description-primary mb-6">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Please check the URL or return to the dashboard.
          </p>

          {/* Action Buttons - Pure HTML/Tailwind */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="mt-12 w-full flex items-center justify-center ">
          <Link
            to={ROUTES.DASHBOARD.MAIN}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/logoWithName.svg"
              alt="Logo"
              className="h-8 w-auto hover:scale-110 transition-transform cursor-pointer transition-duration-300 "
            />
          </Link>
        </div>
      </div>
    </section>
  );
};
export default NotFound;
