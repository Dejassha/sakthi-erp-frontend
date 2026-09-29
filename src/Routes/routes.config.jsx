import { lazy } from "react";
import { Navigate } from "react-router-dom";
import LoginRedirect from "./LoginRedirect";
import { ROUTES } from "./routes.constants";

// Lazy Loaded Pages
const Login = lazy(() => import("../pages/Auth_Page/Login"));
const AdminDashboard = lazy(
  () => import("../pages/Admin_Pages/AdminDashboard"),
);
const AccountsDashboard = lazy(
  () => import("../pages/Accounts_Page/AccountsDashBoard"),
);
const AccountsDetailsPage = lazy(
  () => import("../pages/Accounts_Page/AccountsDetailsPage"),
);
const AccountsFormWrapper = lazy(
  () => import("../pages/Accounts_Page/_components/AccountsFormWrapper"),
);
const Dashboard = lazy(() => import("../pages/Dashboard_Page/Dashboard"));
const InwardDashboard = lazy(
  () => import("../pages/Inward_Page/InwardDashboard"),
);
const ProgramerDashboard = lazy(
  () => import("../pages/Programer_Page/ProgramerDashboard"),
);
const ProgramerDetailsPage = lazy(
  () => import("../pages/Programer_Page/ProgramerDetailsPage"),
);
const ProgramerFormWrapper = lazy(
  () => import("../pages/Programer_Page/ProgramerFormWrapper"),
);
const QaDashboard = lazy(() => import("../pages/Qa_Page/QADashBoard"));
const QADetailsPage = lazy(() => import("../pages/Qa_Page/QADetailsPage"));
const QAFormWrapper = lazy(() => import("../pages/Qa_Page/_components/QAFormWrapper"));
const QuotationDashboard = lazy(
  () => import("../pages/Quotation_Page/QuotationDashboard"),
);
const QuotationDetailsPage = lazy(
  () => import("../pages/Quotation_Page/QuotationDetailsPage"),
);
const QuotationFormWrapper = lazy(
  () => import("../pages/Quotation_Page/QuotationFormWrapper"),
);
const InventoryDashboard = lazy(
  () => import("../pages/Inventory_page/InventoryDashboard"),
);
const MaintenanceDashboard = lazy(
  () => import("../pages/Maintenance_Page/MaintenanceDashboard"),
);
const ReportsDashboard = lazy(
  () => import("../pages/Reports_Page/ReportsDashboard"),
);
const NotFound = lazy(() => import("../pages/Auth_Page/NotFound"));
const Unauthorized = lazy(() => import("../pages/Auth_Page/Unauthorized"));

export const publicRoutes = [
  {
    path: ROUTES.PUBLIC.LOGIN,
    element: (
      <LoginRedirect>
        <Login />
      </LoginRedirect>
    ),
  },
  {
    path: "/",
    element: (
      <LoginRedirect>
        <Navigate to={ROUTES.PUBLIC.LOGIN} replace />
      </LoginRedirect>
    ),
  },
  {
    path: ROUTES.PUBLIC.UNAUTHORIZED,
    element: <Unauthorized />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export const protectedRoutes = [
  {
    path: ROUTES.DASHBOARD.MAIN || "/dashboard",
    element: <Dashboard />,
    roles: [
      "admin",
      "qa",
      "programer",
      "accounts",
      "inward",
      "quotation",
      "inventory",
      "maintenance",
      "reports",
    ],
    hidden: true,
  },
  {
    path: ROUTES.DASHBOARD.QUOTATION,
    element: <QuotationDashboard />,
    roles: ["quotation"],
    label: "Quotation Dashboard",
    desc: "Generate and review client cost estimations and quotes.",
    color: "indigo",
  },
  {
    path: `${ROUTES.DASHBOARD.QUOTATION}/details/:slug`,
    element: <QuotationDetailsPage />,
    roles: ["quotation"],
  },
  {
    path: `${ROUTES.DASHBOARD.QUOTATION}/form/:slug`,
    element: <QuotationFormWrapper />,
    roles: ["quotation"],
  },
  {
    path: `${ROUTES.DASHBOARD.QUOTATION}/create`,
    element: <QuotationFormWrapper />,
    roles: ["quotation"],
  },
  {
    path: ROUTES.DASHBOARD.INWARD,
    element: <InwardDashboard />,
    roles: ["inward"],
    label: "Inward Dashboard",
    desc: "Manage incoming materials and inventory tracking.",
    color: "sky",
  },
  {
    path: ROUTES.DASHBOARD.PROGRAMER,
    element: <ProgramerDashboard />,
    roles: ["programer"],
    label: "Programer Dashboard",
    desc: "Access project programming and technical specifications.",
    color: "emerald",
  },
  {
    path: `${ROUTES.DASHBOARD.PROGRAMER}/details/:slug`,
    element: <ProgramerDetailsPage />,
    roles: ["programer"],
  },
  {
    path: `${ROUTES.DASHBOARD.PROGRAMER}/form/:slug`,
    element: <ProgramerFormWrapper />,
    roles: ["programer"],
  },
  {
    path: ROUTES.DASHBOARD.QA,
    element: <QaDashboard />,
    roles: ["qa"],
    label: "Production Log Dashboard",
    desc: "Monitor quality control metrics and generate reports.",
    color: "amber",
  },
  {
    path: `${ROUTES.DASHBOARD.QA}/details/:slug`,
    element: <QADetailsPage />,
    roles: ["qa"],
  },
  {
    path: `${ROUTES.DASHBOARD.QA}/form/:slug`,
    element: <QAFormWrapper />,
    roles: ["qa"],
  },
  {
    path: ROUTES.DASHBOARD.ACCOUNTS,
    element: <AccountsDashboard />,
    roles: ["accounts"],
    label: "Accounts Dashboard",
    desc: "Track invoices, payments and financial summaries.",
    color: "fuchsia",
  },
  {
    path: `${ROUTES.DASHBOARD.ACCOUNTS}/details/:slug`,
    element: <AccountsDetailsPage />,
    roles: ["accounts"],
  },
  {
    path: `${ROUTES.DASHBOARD.ACCOUNTS}/form/:slug`,
    element: <AccountsFormWrapper />,
    roles: ["accounts"],
  },
  {
    path: ROUTES.DASHBOARD.INVENTORY,
    element: <InventoryDashboard />,
    roles: ["inventory", "admin"],
    label: "Inventory Dashboard",
    desc: "Track stock quantities, usage logs and spare parts inventory.",
    color: "cyan",
  },
  {
    path: ROUTES.DASHBOARD.MAINTENANCE,
    element: <MaintenanceDashboard />,
    roles: ["maintenance", "admin"],
    label: "Maintenance Dashboard",
    desc: "Manage periodic machine maintenance schedules and breakdown logs.",
    color: "orange",
  },
  {
    path: ROUTES.DASHBOARD.ADMIN,
    element: <AdminDashboard />,
    roles: ["admin"],
    label: "Admin Dashboard",
    desc: "Core system maintenance and user access management.",
    color: "rose",
  },
  {
    path: ROUTES.DASHBOARD.REPORTS,
    element: <ReportsDashboard />,
    roles: ["reports", "admin"],
    label: "Reports Dashboard",
    desc: "Generate and export system-wide operational reports.",
    color: "purple",
  },
];

/* Explicit role-to-path navigation mapping */
export const rolePaths = {
  quotation: ROUTES.DASHBOARD.QUOTATION,
  inward: ROUTES.DASHBOARD.INWARD,
  programer: ROUTES.DASHBOARD.PROGRAMER,
  qa: ROUTES.DASHBOARD.QA,
  accounts: ROUTES.DASHBOARD.ACCOUNTS,
  inventory: ROUTES.DASHBOARD.INVENTORY,
  maintenance: ROUTES.DASHBOARD.MAINTENANCE,
  admin: ROUTES.DASHBOARD.ADMIN,
  reports: ROUTES.DASHBOARD.REPORTS,
  Dashboard: ROUTES.DASHBOARD.MAIN,
};
