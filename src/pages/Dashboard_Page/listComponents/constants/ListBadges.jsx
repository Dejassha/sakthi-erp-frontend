import React from "react";
import Button from "@/components/ReusableComponents/Button";
import { useGetDashboardDetailsQuery } from "@/store/services/utility.api";
import { Icon } from "@iconify/react";
import { Tooltip } from "antd";

// Helper Badges
export const StatusBadge = ({ value }) => {
  const status = value?.toLowerCase();
  const isCompleted = status === "completed" || status === "closed";
  const isCancelled = status === "cancelled";
  const text = (value || "pending").toUpperCase();
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0 rounded-full text-[8px] font-medium leading-tight border select-none whitespace-nowrap ${isCompleted
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : isCancelled
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
        }`}
    >
      {text}
    </span>
  );
};

export const ColorBadge = ({ value }) => {
  const label =
    value === "quotation"
      ? "DEVELOPMENT"
      : value === "jobcard"
        ? "JOB CARD"
        : (value || "-").toUpperCase();
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0 border rounded-full text-[8px] font-medium leading-tight select-none whitespace-nowrap ${value === "quotation"
        ? "bg-slate-50 text-slate-700 border-slate-200"
        : "bg-amber-50 text-amber-800 border-amber-200"
        }`}
    >
      {label}
    </span>
  );
};

export const JobTypeBadge = ({ value }) => {
  if (!value || value === "-") return <span className="text-gray-400">-</span>;
  const isLaser = value === "Laser Cutting & Folding";
  const isFolding = value === "Only Folding";
  const isDev = value === "Development" || value === "quotation";
  const text = (isDev ? "DEVELOPMENT" : value).toUpperCase();
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0 rounded-full text-[8px] font-medium leading-tight border select-none whitespace-nowrap ${isLaser
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : isFolding
          ? "bg-orange-50 text-orange-700 border-orange-200"
          : isDev
            ? "bg-purple-50 text-purple-700 border-purple-200"
            : "bg-slate-50 text-slate-700 border-slate-200"
        }`}
    >
      {text}
    </span>
  );
};

// Programmer Numbers Cell Renderer for QA Dashboard
export const ProgrammerNumbersCellRenderer = (props) => {
  const productId = props.data?.id;
  const { data: detailsData, isLoading } = useGetDashboardDetailsQuery(
    { product_id: productId, type: "qa" },
    { skip: !productId },
  );
  if (isLoading) {
    return <span className="text-gray-400 text-[10px]">Loading...</span>;
  }
  if (!detailsData || !detailsData.materials) {
    return <span>-</span>;
  }
  // Extract program numbers from programmer_details of each material
  const programNos = detailsData.materials
    .flatMap((m) => m.programer_details || [])
    .map((p) => p.program_no)
    .filter((no) => !!no && no.trim() !== "");
  // Get unique ones
  const uniqueProgramNos = Array.from(new Set(programNos));
  if (uniqueProgramNos.length === 0) {
    return <span className="text-gray-400">-</span>;
  }
  // Extract active filter terms for programmer_no column to prioritize matching values in rendering
  const filterModel = props.api?.getFilterModel();
  const filterConfig = filterModel?.programmer_no;
  const filterTerms = [];
  if (filterConfig) {
    if (filterConfig.operator) {
      if (filterConfig.condition1?.filter)
        filterTerms.push(filterConfig.condition1.filter.trim().toLowerCase());
      if (filterConfig.condition2?.filter)
        filterTerms.push(filterConfig.condition2.filter.trim().toLowerCase());
    } else if (filterConfig.filter) {
      filterTerms.push(filterConfig.filter.trim().toLowerCase());
    }
  }
  // Sort matching numbers first
  if (filterTerms.length > 0) {
    uniqueProgramNos.sort((a, b) => {
      const aMatches = filterTerms.some((term) =>
        a.toLowerCase().includes(term),
      );
      const bMatches = filterTerms.some((term) =>
        b.toLowerCase().includes(term),
      );
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });
  }
  const maxVisible = 2;
  const visibleNos = uniqueProgramNos.slice(0, maxVisible);
  const remainingCount = uniqueProgramNos.length - maxVisible;
  const tooltipText = uniqueProgramNos.join(", ");
  return (
    <div
      className="flex items-center justify-center gap-0.5 h-full py-0.5 overflow-hidden select-none"
      title={tooltipText}
    >
      {visibleNos.map((no, idx) => (
        <span
          key={idx}
          className="px-1 py-0.5 bg-blue-50 text-blue-700 rounded text-[8px] font-medium border border-blue-100 whitespace-nowrap leading-none truncate max-w-[70px]"
        >
          {no}
        </span>
      ))}
      {remainingCount > 0 ? (
        <span className="px-1 py-0.5 bg-gray-100 text-gray-600 rounded text-[8px] font-medium border border-gray-200 whitespace-nowrap cursor-help leading-none shrink-0">
          +{remainingCount}
        </span>
      ) : null}
    </div>
  );
};

// Action Icon Component
export const ActionButton = (props) => {
  const handleView = () => {
    const onView = props.onView || props.context?.onView;
    if (props.data && typeof onView === "function") {
      onView(props.data);
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <Tooltip title="View Details">
        <Icon
          icon="lucide:eye"
          onClick={handleView}
          className="w-4 h-4 text-primary hover:scale-110 cursor-pointer transition-all duration-150"
        />
      </Tooltip>
    </div>
  );
};
