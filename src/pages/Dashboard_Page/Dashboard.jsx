import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { protectedRoutes } from "@/Routes/routes.config";

import PageHeader from "@/components/ReusableComponents/PageHeader";
import EmptyState from "@/pages/errorPage/EmptyState";
import ErrorState from "@/pages/errorPage/ErrorState";
import LoadingState from "../errorPage/LoadingState";
import RoleCard from "./_components/RoleCard";

const ROLE_ORDER = [
  "quotation",
  "inward",
  "programer",
  "qa",
  "accounts",
  "inventory",
  "maintenance",
  "admin",
  "reports",
];

const Dashboard = () => {
  const { user, isLoading, error, isError, refetch } = useAuth();
  const navigate = useNavigate();
  const roleCardData = useMemo(() => {
    if (isLoading || !user) return [];

    const available = protectedRoutes.filter((route) => {
      if (route.hidden) return false;
      if (!route.label) return false;
      if (!route.roles || route.roles.length === 0) return false;
      if (user.isAdmin) return true;
      return route.roles.some((role) => user.roles?.includes(role));
    });

    return available.sort((a, b) => {
      const getRoleKey = (r) => {
        if (r.path.includes("quotation")) return "quotation";
        if (r.path.includes("inward")) return "inward";
        if (r.path.includes("programer")) return "programer";
        if (r.path.includes("qa")) return "qa";
        if (r.path.includes("accounts")) return "accounts";
        if (r.path.includes("inventory")) return "inventory";
        if (r.path.includes("maintenance")) return "maintenance";
        if (r.path.includes("admin")) return "admin";
        if (r.path.includes("reports")) return "reports";
        return "";
      };
      const indexA = ROLE_ORDER.indexOf(getRoleKey(a));
      const indexB = ROLE_ORDER.indexOf(getRoleKey(b));
      return (indexA !== -1 ? indexA : 99) - (indexB !== -1 ? indexB : 99);
    });
  }, [user, isLoading]);

  if (isError || error) {
    return (
      <div className="pt-8">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  if (!user) return null;
  return (
    <div className="flex flex-col justify-between">
      <div>
        {/* Header Section */}
        <PageHeader
          title="Welcome,"
          highlight={user.username}
          description="Select a module to begin your workspace overview."
          actions={
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm text-xs">
              <div className="size-2 rounded-full !bg-primary animate-pulse" />
              <span className="font-semibold text-slate-500 tracking-wide">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          }
        />

        {/* Quick Access Grid */}
        <div className="">
          <div className="flex items-center gap-1.5 mb-4">
            <div className="h-5 w-0.5 !bg-primary" />
            <h2 className="text-sm font-semibold tracking-wide">
              Available Modules ({roleCardData.length || 0})
            </h2>
          </div>

          {roleCardData.length === 0 ? (
            <EmptyState
              title="Access Restricted"
              description="Your account currently has no assigned roles. Please contact an administrator for access."
              icon="mdi:lock-outline"
            />
          ) : isLoading ? (
            <LoadingState message="Preparing Environment..." fullPage={false} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {roleCardData.map((card) => (
                <RoleCard
                  key={card.path}
                  title={card.label}
                  description={card.desc}
                  color={card.color}
                  onClick={() => navigate(card.path)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subtle branding footer */}
      <footer className="pt-4 mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 opacity-60 transition-opacity hover:opacity-100 group text-xs">
        <img src="/logoWithName.svg" alt="Logo" className="h-6 w-auto" />
        <div>
          <span>© {new Date().getFullYear()} All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
};
export default Dashboard;
