import React, { useState, memo, useCallback } from "react";
import { Loader2, X } from "lucide-react";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import Button from "@/components/ReusableComponents/Button";

const ProductsHeader = memo(({
  selectedCount = 0,
  totalCount = 0,
  isSelectingAll = false,
  isSelectingAllLoading = false,
  onSelectAll,
  onExport,
  isExporting = false,
  visibleColumns = [],
  setVisibleColumns,
  allColumns = [],
  hasFilters = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleColumn = useCallback((col) => {
    setVisibleColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  }, [setVisibleColumns]);

  const handleSelectAllCols = useCallback(() => {
    setVisibleColumns(
      allColumns
        .filter((c) => c.value !== "__checkbox__")
        .map((c) => c.value),
    );
  }, [allColumns, setVisibleColumns]);

  const handleResetCols = useCallback(() => {
    setVisibleColumns([]);
  }, [setVisibleColumns]);

  return (
    <PageHeader
      className="!pb-0"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Select All button */}
          <button
            type="button"
            onClick={onSelectAll}
            disabled={isSelectingAllLoading || totalCount === 0}
            className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-md border transition-all duration-200 ease-in-out hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${
              isSelectingAll
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-xs"
                : selectedCount > 0
                  ? "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            {isSelectingAllLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <input
                type="checkbox"
                readOnly
                checked={isSelectingAll || selectedCount > 0}
                className="w-3 h-3 pointer-events-none accent-blue-600 rounded m-0 p-0"
              />
            )}
            <span className="leading-none">
              {isSelectingAll
                ? `Deselect All (${selectedCount})`
                : selectedCount > 0
                  ? `Selected (${selectedCount}/${totalCount})`
                  : `Select All (${totalCount})`}
            </span>
          </button>

          {/* Column Selection (Existing exact component preserved) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="btn-cancel text-[10px] py-1.5 px-2.5 flex items-center gap-1.5 rounded-md cursor-pointer border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <span>Columns</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-300 ${dropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {dropdownOpen ? (
              <div className="absolute right-0 mt-2 w-64 max-h-[400px] overflow-auto bg-white border border-gray-100 rounded-xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Visible Columns
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllCols}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tighter cursor-pointer"
                    >
                      All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleResetCols}
                      className="text-[10px] font-bold text-gray-500 hover:text-gray-700 uppercase tracking-tighter cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(false)}
                      className="ml-2 p-1 hover:bg-gray-100 rounded-lg text-gray-400 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {allColumns
                    .filter((col) => col.value !== "__checkbox__")
                    .map((col) => (
                      <label
                        key={col.value}
                        className="flex items-center gap-2.5 p-1.5 hover:bg-blue-50/50 rounded-lg cursor-pointer transition-colors group"
                      >
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500/30 border-gray-300 transition-all checked:bg-blue-600"
                          checked={visibleColumns.includes(col.value)}
                          onChange={() => toggleColumn(col.value)}
                        />
                        <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                          {col.label}
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Dynamic Export Button */}
          <Button
            color="green"
            size="xs"
            icon="lucide:file-spreadsheet"
            onClick={onExport}
            loading={isExporting}
            disabled={totalCount === 0}
          >
            {selectedCount > 0
              ? `Export Selected (${selectedCount})`
              : hasFilters
                ? `Export Filtered (${totalCount})`
                : `Export All (${totalCount})`}
          </Button>
        </div>
      }
    />
  );
});

ProductsHeader.displayName = "ProductsHeader";

export default ProductsHeader;
