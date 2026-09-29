import React, { useState, memo, useCallback } from "react";
import { Loader2, X } from "lucide-react";

const ProductsHeader = memo(({
  selectedCount,
  totalCount,
  isSelectingAll,
  isSelectingAllLoading,
  onSelectAll,
  onExport,
  isExporting,
  visibleColumns,
  setVisibleColumns,
  allColumns,
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
    <div className="flex flex-col md:flex-row md:items-center justify-end gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2">
          {/* Select All button */}
          <button
            onClick={onSelectAll}
            disabled={isSelectingAllLoading}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border transition-all ${
              isSelectingAll
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {isSelectingAllLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <input
                type="checkbox"
                readOnly
                checked={isSelectingAll}
                className="w-3 h-3 accent-white pointer-events-none"
              />
            )}
            {isSelectingAll
              ? `Deselect All (${selectedCount})`
              : `Select All (${totalCount})`}
          </button>

          {/* Column Selection */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="btn-cancel text-xs py-1 px-2.5 flex items-center gap-1.5 rounded-md"
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
                      onClick={handleSelectAllCols}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tighter"
                    >
                      All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={handleResetCols}
                      className="text-[10px] font-bold text-gray-500 hover:text-gray-700 uppercase tracking-tighter"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setDropdownOpen(false)}
                      className="ml-2 p-1 hover:bg-gray-100 rounded-lg text-gray-400"
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

          {/* Dynamic Export Button & Selection Badge */}
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-[11px] font-bold border border-blue-200 animate-in zoom-in duration-200">
                {selectedCount} Selected
              </span>
            )}
            <button
              disabled={isExporting || totalCount === 0}
              className={`flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-md font-semibold transition-all ${
                isExporting || totalCount === 0
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                  : selectedCount > 0
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs border border-blue-600"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-emerald-600"
              }`}
              onClick={onExport}
            >
              {isExporting ? (
                <Loader2 className="animate-spin w-3.5 h-3.5" />
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              )}
              <span>
                {isExporting
                  ? "Exporting..."
                  : selectedCount > 0
                    ? `Export Selected (${selectedCount})`
                    : hasFilters
                      ? `Export Filtered (${totalCount})`
                      : `Export All (${totalCount})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

ProductsHeader.displayName = "ProductsHeader";

export default ProductsHeader;
