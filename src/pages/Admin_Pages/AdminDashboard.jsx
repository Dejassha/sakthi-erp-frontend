import React, { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuth } from "@/context/useAuth";
import Loader from "@/components/ReusableComponents/Loader";
import PageHeader from "@/components/ReusableComponents/PageHeader";
// components
const AdminCompanies = lazy(
  () => import("@/components/AdminComponents/AdminCompanies"),
);
const AdminMachines = lazy(
  () => import("@/components/AdminComponents/AdminMachines"),
);
const AdminMaterials = lazy(
  () => import("@/components/AdminComponents/AdminMaterials"),
);
const AdminOperators = lazy(
  () => import("@/components/AdminComponents/AdminOperators"),
);
const AdminProducts = lazy(
  () => import("@/components/AdminComponents/AdminProduct"),
);
const AdminQuotationNote = lazy(
  () => import("@/components/AdminComponents/AdminQuotation/AdminQuotationNote"),
);
const AdminUsers = lazy(
  () => import("@/components/AdminComponents/AdminUsers"),
);
const AdminGasDetails = lazy(
  () => import("@/components/AdminComponents/AdminGasDetails"),
);
const AdminDashboardWrapper = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "products";
  const { user } = useAuth();
  const hasUserAccess = user?.has_user_management;

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey }, { replace: true });
  };

  // Memoized Tab Configuration, Prevents unnecessary re-renders
  const tabs = [
    {
      key: "products",
      label: "Products",
      icon: <Icon icon="lucide:package" className="w-4 h-4" />,
      component: AdminProducts,
    },
    {
      key: "quotation",
      label: "Quotation",
      icon: <Icon icon="lucide:file-spreadsheet" className="w-4 h-4" />,
      component: AdminQuotationNote,
    },
    {
      key: "users",
      label: "Users",
      icon: <Icon icon="lucide:users" className="w-4 h-4" />,
      component: AdminUsers,
    },
    {
      key: "machines",
      label: "Machines",
      icon: <Icon icon="lucide:wrench" className="w-4 h-4" />,
      component: AdminMachines,
    },
    {
      key: "companies",
      label: "Companies",
      icon: <Icon icon="lucide:building-2" className="w-4 h-4" />,
      component: AdminCompanies,
    },
    {
      key: "operators",
      label: "Machine Operators",
      icon: <Icon icon="lucide:users" className="w-4 h-4" />,
      component: AdminOperators,
    },
    {
      key: "materials",
      label: "Material Type",
      icon: <Icon icon="lucide:package-check" className="w-4 h-4" />,
      component: AdminMaterials,
    },
    {
      key: "gas",
      label: "Gas Type",
      icon: <Icon icon="lucide:wind" className="w-4 h-4" />,
      component: AdminGasDetails,
    },
  ];
  // Active Tab
  const visibleTabs = hasUserAccess
    ? tabs
    : tabs.filter((tab) => tab.key !== "users");
  const ActiveComponent = visibleTabs.find(
    (tab) => tab.key === activeTab,
  )?.component;
  return (
    <div className="w-full">
      <PageHeader
        title="Admin Dashboard"
        actions={
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100/90 rounded-lg border border-slate-200/80">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 h-7 rounded-md text-[9px] font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200/80 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Content */}
      <div
        className={`bg-white rounded-xl shadow-sm border ${activeTab === "products" ? "p-0" : "p-4"} min-h-[65vh] relative`}
      >
        <Suspense fallback={<Loader fullScreen={false} />}>
          {ActiveComponent ? <ActiveComponent /> : null}
        </Suspense>
      </div>
    </div>
  );
};
export default AdminDashboardWrapper;
