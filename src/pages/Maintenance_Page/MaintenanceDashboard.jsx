import { useSearchParams } from "react-router-dom";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import PeriodicMaintenanceTab from "./tabs/PeriodicMaintenanceTab";
import BreakdownMaintenanceTab from "./tabs/BreakdownMaintenanceTab";
import { MaintenanceTabs } from "./MaintenanceComponents";

const MaintenanceDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "periodic_maintenance";
  const action = searchParams.get("action");

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey }, { replace: true });
  };

  const ActiveTabComponent =
    activeTab === "breakdown" ? BreakdownMaintenanceTab : PeriodicMaintenanceTab;

  const isFormAction =
    action === "add_schedule" ||
    action === "edit_schedule" ||
    action === "view_schedule" ||
    action === "add_breakdown" ||
    action === "edit_breakdown" ||
    action === "view_breakdown" ||
    action === "update_breakdown";

  return (
    <div className="w-full">
      {!isFormAction && (
        <PageHeader
          title="Maintenance Dashboard"
          actions={
            <MaintenanceTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          }
        />
      )}
      <ActiveTabComponent />
    </div>
  );
};

export default MaintenanceDashboard;
