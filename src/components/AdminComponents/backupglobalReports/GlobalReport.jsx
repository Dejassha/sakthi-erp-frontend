import React, { useCallback, useEffect, useState, useRef, memo } from "react";
import ProductsGrid from "./ProductsGrid";
import ProductsHeader from "./ProductsHeader";
import { useExportSelectedRowsMutation } from "@/store/services/admin.api";
import { message } from "antd";

const COLUMN_STORAGE_KEY = "admin_products_visible_columns";

const GlobalReport = memo(() => {
  /* ---------------- State ---------------- */
  const [filters, setFilters] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [allColumns, setAllColumns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const stored = localStorage.getItem(COLUMN_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  /* ---------------- Grid API ---------------- */
  const gridApiRef = useRef(null);

  /* ---------------- Fetch & Export ---------------- */
  const [exportSelectedRowsMutation, { isLoading: isExporting }] = useExportSelectedRowsMutation();

  /* ---------------- Effects ---------------- */
  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
    } catch (e) {
      console.error("Failed to store visible columns:", e);
    }
  }, [visibleColumns]);

  // Clean up notifications on unmount
  useEffect(() => {
    return () => {
      message.destroy("selectAll");
    };
  }, []);

  // Reset select-all when filters change
  useEffect(() => {
    setIsSelectingAll(false);
    setSelectedRows([]);
  }, [filters]);

  /* ---------------- Select All Logic (Instant & Zero-Lag) ---------------- */
  const handleSelectAll = useCallback(() => {
    if (isSelectingAll) {
      setIsSelectingAll(false);
      setSelectedRows([]);
      if (gridApiRef.current) {
        if (typeof gridApiRef.current.deselectAll === "function") {
          gridApiRef.current.deselectAll();
        }
        gridApiRef.current.forEachNode((node) => {
          node.setSelected(false);
        });
      }
    } else {
      setIsSelectingAll(true);
      if (gridApiRef.current) {
        gridApiRef.current.forEachNodeAfterFilter((node) => {
          node.setSelected(true);
        });
        const currentSelected = gridApiRef.current.getSelectedRows?.() || [];
        setSelectedRows(currentSelected);
      }
    }
  }, [isSelectingAll]);

  const handleSelectionChange = useCallback((rows) => {
    setSelectedRows(rows);
    // If user manually unselects items while select all was on, turn off select all mode
    if (isSelectingAll && rows.length < totalCount) {
      setIsSelectingAll(false);
    }
  }, [isSelectingAll, totalCount]);

  /* ---------------- Export Logic ---------------- */
  const handleExport = useCallback(async () => {
    if (!gridApiRef.current) return;

    // 1️⃣ Get visible columns from AG Grid
    const visibleCols = gridApiRef.current
      .getAllDisplayedColumns()
      .map((col) => {
        const field = col.getColDef().field;
        const header = col.getColDef().headerName || field;
        return { field, header };
      })
      .filter((c) => !!c.field);

    // 2️⃣ Prepare Payload
    const payload = {
      headers: visibleCols,
      include_totals: true,
    };

    if (selectedRows.length > 0 && !isSelectingAll) {
      // Option A: Specific checkbox selection
      const cleanedRows = selectedRows.map((row) => {
        const obj = {
          material_id: row.material_id, // Always include for totals
        };
        visibleCols.forEach((c) => {
          obj[c.field] = row[c.field];
        });
        return obj;
      });
      payload.rows = cleanedRows;
    } else {
      // Option B: Full filtered mode / Select All mode (Streams directly from DB without downloading 3,000 JSON rows)
      const gridFilters = gridApiRef.current.getFilterModel ? gridApiRef.current.getFilterModel() : {};
      const activeFilters = { ...gridFilters, ...(filters || {}) };
      payload.filters = activeFilters;
      message.info("Exporting all records...");
    }

    try {
      const blob = await exportSelectedRowsMutation(payload).unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Global_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success("Export successful!");
    } catch (err) {
      console.error("Export failed:", err);
      message.error("Failed to export. Please try again.");
    }
  }, [selectedRows, isSelectingAll, filters, exportSelectedRowsMutation]);

  return (
    <div className="flex flex-col h-[75vh] bg-gray-50/50 gap-2">
      <ProductsHeader
        selectedCount={isSelectingAll ? totalCount : selectedRows.length}
        totalCount={totalCount}
        isSelectingAll={isSelectingAll}
        isSelectingAllLoading={false}
        onSelectAll={handleSelectAll}
        onExport={handleExport}
        isExporting={isExporting}
        visibleColumns={visibleColumns}
        setVisibleColumns={setVisibleColumns}
        allColumns={allColumns}
        hasFilters={Boolean(filters && Object.keys(filters).length > 0)}
        onFilterChange={setFilters}
      />

      <div className="flex-1 border shadow-sm rounded-md overflow-hidden bg-white relative">
        <ProductsGrid
          filters={filters}
          onSelectionChange={handleSelectionChange}
          gridApiRef={gridApiRef}
          onColumnsReady={setAllColumns}
          visibleColumns={visibleColumns}
          onTotalCountChange={setTotalCount}
        />
      </div>
    </div>
  );
});

GlobalReport.displayName = "GlobalReport";

export default GlobalReport;
