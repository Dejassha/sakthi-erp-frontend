import React, { memo, useMemo } from "react";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import Button from "@/components/ReusableComponents/Button";
import ReportKPICards from "@/components/ReusableComponents/ReportKPICards";

const MaintenanceHistoryHeader = ({
  displayedCount = 0,
  selectedRows = [],
  isAllSelected = false,
  isExporting = false,
  rows = [],
  stats: externalStats,
  onToggleSelectAll,
  onClearSelection,
  onExportExcel,
}) => {
  const stats = useMemo(() => {
    if (externalStats) return externalStats;

    const totalRecords = rows.length;
    let periodicCount = 0;
    let breakdownCount = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let totalDowntimeMinutes = 0;

    rows.forEach((r) => {
      const isPeriodic =
        r.type_key === "periodic" ||
        String(r.maintenance_type).toLowerCase().includes("periodic");

      if (isPeriodic) {
        periodicCount++;
      } else {
        breakdownCount++;
      }

      const st = String(r.status || "").toUpperCase();
      if (st === "COMPLETED" || st === "CLOSED") {
        completedCount++;
      } else {
        pendingCount++;
      }

      if (r.total_downtime_hours && !isNaN(Number(r.total_downtime_hours))) {
        totalDowntimeMinutes += Number(r.total_downtime_hours) * 60;
      } else if (r.downtime_hours && !isNaN(Number(r.downtime_hours))) {
        totalDowntimeMinutes += Number(r.downtime_hours) * 60;
      }
    });

    const dtHours = Math.floor(totalDowntimeMinutes / 60);
    const dtMins = Math.round(totalDowntimeMinutes % 60);
    const totalDowntime =
      totalDowntimeMinutes > 0
        ? `${dtHours}h ${dtMins > 0 ? `${dtMins}m` : ""}`.trim()
        : "0 hrs";

    return {
      totalRecords,
      periodicCount,
      breakdownCount,
      completedCount,
      pendingCount,
      totalDowntime,
    };
  }, [rows, externalStats]);

  const kpiCards = useMemo(
    () => [
      {
        key: "total",
        label: "Total Records",
        value: stats.totalRecords || 0,
        icon: "lucide:cpu",
        color: "slate",
        subText: "All maintenance",
      },
      {
        key: "periodic",
        label: "Periodic Schedules",
        value: stats.periodicCount || 0,
        icon: "lucide:calendar-clock",
        color: "indigo",
        subText: "Schedules",
      },
      {
        key: "breakdown",
        label: "Breakdown Logs",
        value: stats.breakdownCount || 0,
        icon: "lucide:alert-triangle",
        color: "rose",
        subText: "Incidents",
      },
      {
        key: "completed",
        label: "Completed / Closed",
        value: stats.completedCount || 0,
        icon: "lucide:check-circle-2",
        color: "emerald",
        subText: "Resolved",
      },
      {
        key: "pending",
        label: "Pending / Open",
        value: stats.pendingCount || 0,
        icon: "lucide:clock-3",
        color: "amber",
        subText: "Attention needed",
      },
      {
        key: "downtime",
        label: "Total Downtime",
        value: stats.totalDowntime || "0 hrs",
        icon: "lucide:timer",
        color: "purple",
        subText: "Breakdown hours",
        isStringValue: true,
      },
    ],
    [stats]
  );

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Summary KPI Breakdown Cards */}
      <ReportKPICards cards={kpiCards} />

      <PageHeader
        className="!pb-0"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSelectAll}
              disabled={displayedCount === 0}
              className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-md border transition-all duration-200 ease-in-out hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${isAllSelected
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm"
                  : selectedRows.length > 0
                    ? "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
            >
              <input
                type="checkbox"
                readOnly
                checked={selectedRows.length > 0}
                className="w-3 h-3 pointer-events-none accent-blue-600 rounded m-0 p-0"
              />
              <span className="leading-none">
                {isAllSelected
                  ? `Deselect All (${selectedRows.length})`
                  : selectedRows.length > 0
                    ? `Selected (${selectedRows.length}/${displayedCount})`
                    : `Select All (${displayedCount})`}
              </span>
            </button>

            {selectedRows.length > 0 && (
              <Button
                color="cancel"
                size="xs"
                onClick={onClearSelection}
              >
                Clear
              </Button>
            )}

            <Button
              color="green"
              size="xs"
              icon="lucide:file-spreadsheet"
              onClick={onExportExcel}
              loading={isExporting}
              disabled={displayedCount === 0}
            >
              {selectedRows.length > 0
                ? `Export Selected (${selectedRows.length})`
                : stats?.totalRecords && displayedCount < stats.totalRecords
                  ? `Export Filtered (${displayedCount})`
                  : `Export All (${displayedCount})`}
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default memo(MaintenanceHistoryHeader);
