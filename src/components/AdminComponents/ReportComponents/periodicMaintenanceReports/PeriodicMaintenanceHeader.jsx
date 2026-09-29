import React, { memo } from "react";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import Button from "@/components/ReusableComponents/Button";

const PeriodicMaintenanceHeader = ({
  displayedCount = 0,
  selectedRows = [],
  isAllSelected = false,
  isExporting = false,
  rows = [],
  onToggleSelectAll,
  onClearSelection,
  onExportExcel,
}) => {
  const totalCount = rows?.length || displayedCount;
  const selectedCount = selectedRows?.length || 0;
  const hasFilters = displayedCount < totalCount;

  return (
    <div className="flex flex-col w-full">
      <PageHeader
        className="!pb-0"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSelectAll}
              disabled={displayedCount === 0}
              className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-md border transition-all duration-200 ease-in-out hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${
                isAllSelected
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-xs"
                  : selectedCount > 0
                    ? "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400"
              }`}
              title={
                isAllSelected
                  ? `Deselect all (${selectedCount})`
                  : `Select all ${displayedCount} filtered rows`
              }
            >
              <input
                type="checkbox"
                readOnly
                checked={isAllSelected || selectedCount > 0}
                className="w-3 h-3 pointer-events-none accent-blue-600 rounded m-0 p-0"
              />
              <span className="leading-none">
                {isAllSelected
                  ? `Deselect All (${selectedCount})`
                  : selectedCount > 0
                    ? `Selected (${selectedCount}/${displayedCount})`
                    : `Select All (${displayedCount})`}
              </span>
            </button>

            {selectedCount > 0 && (
              <button
                type="button"
                onClick={onClearSelection}
                className="inline-flex items-center justify-center px-2 py-1.5 text-[10px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}

            <Button
              color="green"
              size="xs"
              icon="lucide:file-spreadsheet"
              onClick={onExportExcel}
              loading={isExporting}
              disabled={displayedCount === 0 || isExporting}
            >
              {selectedCount > 0
                ? `Export Selected (${selectedCount})`
                : hasFilters
                  ? `Export Filtered (${displayedCount})`
                  : `Export All (${displayedCount})`}
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default memo(PeriodicMaintenanceHeader);

