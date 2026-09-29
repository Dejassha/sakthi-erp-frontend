import React, { memo, useMemo } from "react";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import Button from "@/components/ReusableComponents/Button";
import ReportKPICards from "@/components/ReusableComponents/ReportKPICards";

const InventoryHistoryHeader = ({
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
    let addedQty = 0;
    let addedCount = 0;
    let usedQty = 0;
    let usedCount = 0;

    rows.forEach((r) => {
      const act = String(r.action || "").toLowerCase();
      const qty = Number(r.quantity || 0);

      if (act.includes("add") || act.includes("restock")) {
        addedQty += qty;
        addedCount++;
      } else if (act.includes("use")) {
        usedQty += qty;
        usedCount++;
      }
    });

    const totalQty = rows.reduce((acc, r) => acc + Number(r.quantity || 0), 0);
    const totalCount = rows.length;

    return {
      addedQty,
      addedCount,
      usedQty,
      usedCount,
      totalQty,
      totalCount,
    };
  }, [rows]);

  const kpiCards = useMemo(
    () => [
      {
        key: "added",
        label: "Total Added Qty",
        value: (stats.addedQty || 0).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        count: stats.addedCount || 0,
        icon: "lucide:package-plus",
        color: "emerald",
        subText: `${stats.addedCount || 0} Records`,
        isStringValue: true,
      },
      {
        key: "used",
        label: "Total Used Qty",
        value: (stats.usedQty || 0).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        count: stats.usedCount || 0,
        icon: "lucide:package-minus",
        color: "orange",
        subText: `${stats.usedCount || 0} Records`,
        isStringValue: true,
      },
      {
        key: "overall",
        label: "Overall Total Qty",
        value: (stats.totalQty || 0).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        count: stats.totalCount || 0,
        icon: "lucide:boxes",
        color: "slate",
        subText: `${stats.totalCount || 0} Records`,
        isStringValue: true,
      },
    ],
    [stats]
  );

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Summary KPI Breakdown Cards (3 Columns) */}
      <ReportKPICards cards={kpiCards} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" />

      <PageHeader
        // title={title}
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
                : stats?.totalCount && displayedCount < stats.totalCount
                  ? `Export Filtered (${displayedCount})`
                  : `Export All (${displayedCount})`}
            </Button>
          </div>
        }
      />

    </div>
  );
};

export default memo(InventoryHistoryHeader);
