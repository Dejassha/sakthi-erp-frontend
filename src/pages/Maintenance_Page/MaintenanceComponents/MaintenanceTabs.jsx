import React from "react";
import { Icon } from "@iconify/react";

const MAINTENANCE_TABS = [
  {
    key: "periodic_maintenance",
    label: "Periodic Maintenance",
    icon: <Icon icon="lucide:calendar-range" className="h-3.5 w-3.5" />,
  },
  {
    key: "breakdown",
    label: "Breakdown Maintenance",
    icon: <Icon icon="lucide:alert-triangle" className="h-3.5 w-3.5" />,
  },
];

export const MaintenanceTabs = ({ activeTab, onTabChange }) => {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/80">
      {MAINTENANCE_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer ${
              isActive
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MaintenanceTabs;
