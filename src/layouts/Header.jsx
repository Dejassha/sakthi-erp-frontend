import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { Dropdown } from "antd";
import { useAuth } from "@/context/useAuth";
import { ROUTES } from "@/Routes/routes.constants";
import { rolePaths } from "@/Routes/routes.config";
import HeaderNotifications from "./HeaderNotifications";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";

const formatTitle = (role) => {
  if (role === "qa") return "Production Log";
  if (role === "reports") return "Reports";
  if (role === "inventory") return "Inventory";
  if (role === "maintenance") return "Maintenance";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

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

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Confirm logout modal state
  const [confirmOpen, setConfirmOpen] = useState(false);

  const activeKey = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith(ROUTES.DASHBOARD.QUOTATION)) return "quotation";
    if (path.startsWith(ROUTES.DASHBOARD.INWARD)) return "inward";
    if (path.startsWith(ROUTES.DASHBOARD.PROGRAMER)) return "programer";
    if (path.startsWith(ROUTES.DASHBOARD.QA)) return "qa";
    if (path.startsWith(ROUTES.DASHBOARD.ACCOUNTS)) return "accounts";
    if (path.startsWith(ROUTES.DASHBOARD.INVENTORY)) return "inventory";
    if (path.startsWith(ROUTES.DASHBOARD.MAINTENANCE)) return "maintenance";
    if (path.startsWith(ROUTES.DASHBOARD.ADMIN)) return "admin";
    if (path.startsWith(ROUTES.DASHBOARD.REPORTS)) return "reports";
    if (path.startsWith(ROUTES.DASHBOARD.MAIN)) return "dashboard";
    return "dashboard";
  }, [location.pathname]);

  const roleCards = useMemo(() => {
    if (!user) return [];
    const rolesToShow = user.isAdmin
      ? Object.keys(rolePaths)
      : user.roles || [];

    const filtered = rolesToShow.filter((r) => r !== "Dashboard");
    filtered.sort((a, b) => {
      const indexA = ROLE_ORDER.indexOf(a);
      const indexB = ROLE_ORDER.indexOf(b);
      return (indexA !== -1 ? indexA : 99) - (indexB !== -1 ? indexB : 99);
    });

    return filtered.map((role) => ({
      role,
      title: formatTitle(role),
      path: rolePaths[role],
    }));
  }, [user]);

  return (
    <>
      {/* Sticky Header */}
      <header className="no-print sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="container flex items-center justify-between h-12">
          {/* Logo */}
          <div
            onClick={() => navigate(ROUTES.DASHBOARD.MAIN)}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <img
              src="/logoWithoutName.svg"
              className="h-7 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              alt="Sakthi Laser"
            />
            <div className="hidden sm:flex flex-col">
              <h1 className="text-xs sm:text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors leading-tight">
                Sakthi Laser Technology
              </h1>
              <p className="text-[10px] text-slate-500 leading-tight">
                Enterprise Resource Planning
              </p>
            </div>
          </div>

          {/* ----------- RIGHT SIDE BUTTONS ----------- */}
          <nav className="flex items-center gap-2.5">
            {/* USER DROPDOWN */}
            <Dropdown
              overlayClassName="compact-dropdown-menu"
              menu={{
                className: "compact-dropdown-menu",
                items: [
                  {
                    key: "user-info",
                    label: (
                      <span className="font-semibold text-gray-800 truncate block text-sm">
                        {user?.username}
                      </span>
                    ),
                    disabled: true,
                  },
                  {
                    type: "divider",
                  },
                  {
                    key: "logout",
                    danger: true,
                    icon: <Icon icon="lucide:log-out" className="w-3 h-3" />,
                    label: "Logout",
                    onClick: () => setConfirmOpen(true),
                  },
                ],
              }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <button className="p-1 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition cursor-pointer">
                <Icon icon="lucide:user" className="size-5" />
              </button>
            </Dropdown>

            {/* NOTIFICATIONS */}
            <HeaderNotifications />

            {/* DASHBOARD NAVIGATION DROPDOWN */}
            <Dropdown
              overlayClassName="compact-dropdown-menu"
              menu={{
                className: "compact-dropdown-menu",
                selectedKeys: [activeKey],
                items: [
                  {
                    key: "dashboard",
                    label: (
                      <span
                        className={
                          activeKey === "dashboard"
                            ? "font-semibold text-blue-600 text-xs"
                            : "text-xs"
                        }
                      >
                        Dashboard
                      </span>
                    ),
                    onClick: () => navigate(ROUTES.DASHBOARD.MAIN),
                  },
                  {
                    type: "divider",
                  },
                  ...roleCards
                    .filter((item) => item.role !== "Dashboard" && item.path)
                    .map((item) => {
                      const isActive = activeKey === item.role;
                      return {
                        key: item.role,
                        label: (
                          <span
                            className={
                              isActive ? "font-semibold text-blue-600 text-xs" : "text-xs"
                            }
                          >
                            {item.title}
                          </span>
                        ),
                        onClick: () => navigate(item.path),
                      };
                    }),
                ],
              }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <button className="p-1 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition cursor-pointer">
                <Icon icon="lucide:more-vertical" className="size-5" />
              </button>
            </Dropdown>
          </nav>
        </div>
      </header>

      {/* ---------- LOGOUT CONFIRM MODAL ---------- */}
      <GlobalModal
        open={confirmOpen}
        title="Confirm Logout"
        description="Are you sure you want to logout?"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await logout();
          navigate(ROUTES.PUBLIC.LOGIN, { replace: true });
        }}
        confirmText="Yes, Logout"
        cancelText="Cancel"
        confirmColor="red"
        cancelColor="cancel"
        confirmIcon="lucide:log-out"
        cancelIcon="lucide:x"
      />
    </>
  );
};

export default Header;
