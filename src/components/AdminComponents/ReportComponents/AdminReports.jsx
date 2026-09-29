import React, { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import GlobalReport from "./globalReports";
import IndividualReport from "./IndividualReport";
import {
  Globe,
  User,
  TrendingUp,
  Cpu,
  Users,
  HardDrive,
  UserCheck,
  Star,
  Flame,
  Layers,
  PieChart,
  Calculator,
  History,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
import KPIReport from "./KPIReport";
import OperatorProductivityReport from "./OperatorProductivityReport";
import MachineOccupancyReport from "./MachineOccupancyReport";
import OperatorMachineReport from "./OperatorMachineReport";
import CustomerReviewReport from "./CustomerReviewReport";
import GasUsageReport from "./GasUsageReport";
import MaterialUsageReport from "./MaterialUsageReport";
import MaterialUtilisationReport from "./MaterialUtilisationReport";
import CumulativeQuotationReport from "./quotationReports";
import InventoryHistoryReport from "./inventoryHistoryReports";
import PeriodicMaintenanceReport from "./periodicMaintenanceReports";
import BreakdownMaintenanceReport from "./breakdownMaintenanceReports";

const AdminReports = ({
  showHeader = true,
  title = "Report Dashboard",
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const reportTab = tabFromUrl || "global";

  const handleTabChange = useCallback(
    (tabId) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tabId === "global") {
            next.delete("tab");
          } else {
            next.set("tab", tabId);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const tabsList = useMemo(() => {
    return [
      { id: "global", label: "Global Report", icon: Globe },
      // { id: "individual", label: "Individual Report", icon: User },
      // { id: "kpi", label: "KPI Report", icon: TrendingUp },
      { id: "inventory-history", label: "Inventory History", icon: History },
      { id: "periodic-maintenance", label: "Periodic Maintenance", icon: CalendarClock },
      { id: "breakdown-maintenance", label: "Breakdown Maintenance", icon: AlertTriangle },
      // { id: "productivity", label: "Operator Productivity", icon: Users },
      // { id: "occupancy", label: "Machine Occupancy", icon: HardDrive },
      // { id: "operator-machine", label: "Operator x Machine", icon: UserCheck },
      // { id: "customer-review", label: "Customer Review", icon: Star },
      // { id: "gas-usage", label: "Gas Usage", icon: Flame },
      // { id: "material-usage", label: "Material Usage", icon: Layers },
      // { id: "material-utilisation", label: "Material Utilisation", icon: PieChart },
      { id: "cumulative-quotation", label: "Cumulative Quotation", icon: Calculator },
    ];
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Header with Title and Pill Sub-tab Navigation */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        {showHeader && (
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight whitespace-nowrap">
            {title}
          </h1>
        )}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100/90 p-1 rounded-lg border border-slate-200/80 shadow-inner">
          {tabsList.map((tab) => {
            const IconComp = tab.icon;
            const isActive = reportTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[9px] font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-white text-blue-900 shadow-xs border border-slate-200/80 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <IconComp className={`w-3 h-3 ${isActive ? "text-blue-700" : "text-slate-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab View Routing */}
      {reportTab === "global" ? (
        <GlobalReport />
      ) : reportTab === "cumulative-quotation" ? (
        <CumulativeQuotationReport />
      ) : reportTab === "individual" ? (
        <IndividualReport />
      ) : reportTab === "kpi" ? (
        <KPIReport />
      ) : reportTab === "inventory-history" ? (
        <InventoryHistoryReport />
      ) : reportTab === "periodic-maintenance" ? (
        <PeriodicMaintenanceReport />
      ) : reportTab === "breakdown-maintenance" ? (
        <BreakdownMaintenanceReport />
      ) : reportTab === "machine-history" ? (
        <PeriodicMaintenanceReport />
      ) : reportTab === "productivity" ? (
        <OperatorProductivityReport />
      ) : reportTab === "occupancy" ? (
        <MachineOccupancyReport />
      ) : reportTab === "operator-machine" ? (
        <OperatorMachineReport />
      ) : reportTab === "customer-review" ? (
        <CustomerReviewReport />
      ) : reportTab === "gas-usage" ? (
        <GasUsageReport />
      ) : reportTab === "material-usage" ? (
        <MaterialUsageReport />
      ) : reportTab === "material-utilisation" ? (
        <MaterialUtilisationReport />
      ) : (
        <GlobalReport />
      )}
    </div>
  );
};

export default AdminReports;
