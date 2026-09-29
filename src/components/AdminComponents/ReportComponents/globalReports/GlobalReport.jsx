import React, { useCallback, useEffect, useState, useRef, useMemo, memo } from "react";
import ProductsGrid from "./ProductsGrid";
import ProductsHeader from "./ProductsHeader";
import ReportKPICards from "@/components/ReusableComponents/ReportKPICards";
import { useExportSelectedRowsMutation } from "@/store/services/admin.api";
import {
  formatMinutesToTime,
  parseTimeToMinutes,
} from "@/components/AdminComponents/ReportComponents/utils/productsTableUtils";
import { message } from "antd";

const COLUMN_STORAGE_KEY = "admin_products_visible_columns";

const GlobalReport = memo(() => {
  /* ---------------- State ---------------- */
  const [filters, setFilters] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [allColumns, setAllColumns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totals, setTotals] = useState(null);
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

  /* ---------------- KPI Cards ---------------- */
  const kpiCards = useMemo(() => {
    const totalRecords = totalCount || 0;
    const totalOrderWeight = totals?.total_weight || 0;
    const processedQty = totals?.processed_quantity || 0;
    const plannedMins = parseTimeToMinutes(totals?.total_planned_hours);
    const usedWeight = totals?.total_used_weight || 0;
    const machineRuntimeMins = parseTimeToMinutes(totals?.machine_runtime);

    const plannedHours = Math.floor(plannedMins / 60);
    const plannedRemainingMins = Math.round(plannedMins % 60);
    const plannedStr =
      plannedMins > 0
        ? `${plannedHours}h ${plannedRemainingMins > 0 ? `${plannedRemainingMins}m` : ""}`.trim()
        : "0 hrs";

    const runtimeHours = Math.floor(machineRuntimeMins / 60);
    const runtimeMins = Math.round(machineRuntimeMins % 60);
    const runtimeStr =
      machineRuntimeMins > 0
        ? `${runtimeHours}h ${runtimeMins > 0 ? `${runtimeMins}m` : ""}`.trim()
        : "0 hrs";

    return [
      {
        key: "records",
        label: "Total Records",
        value: totalRecords,
        icon: "lucide:layers",
        color: "slate",
        subText: "Report records",
      },
      {
        key: "orderWeight",
        label: "Total Order Wt",
        value: `${Number(totalOrderWeight).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} kg`,
        icon: "lucide:weight",
        color: "emerald",
        subText: "Inward weight",
        isStringValue: true,
      },
      {
        key: "processedQty",
        label: "Processed Qty",
        value: Number(processedQty).toLocaleString("en-IN"),
        icon: "lucide:check-circle-2",
        color: "blue",
        subText: "Programmed qty",
        isStringValue: true,
      },
      {
        key: "plannedHours",
        label: "Total Planned Hrs",
        value: plannedStr,
        icon: "lucide:clock-3",
        color: "amber",
        subText: "Planned duration",
        isStringValue: true,
      },
      {
        key: "usedWeight",
        label: "Total Used Wt",
        value: `${Number(usedWeight).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} kg`,
        icon: "lucide:layers",
        color: "purple",
        subText: "Material consumed",
        isStringValue: true,
      },
      {
        key: "runtime",
        label: "Machine Runtime",
        value: runtimeStr,
        icon: "lucide:timer",
        color: "teal",
        subText: "Production hours",
        isStringValue: true,
      },
    ];
  }, [totalCount, totals]);

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

  const isTogglingSelectAllRef = useRef(false);

  /* ---------------- Select All Logic (Instant & Zero-Lag) ---------------- */
  const handleSelectAll = useCallback(() => {
    const api = gridApiRef.current;
    if (isSelectingAll) {
      isTogglingSelectAllRef.current = true;
      setIsSelectingAll(false);
      setSelectedRows([]);
      if (api) {
        if (typeof api.deselectAll === "function") {
          api.deselectAll();
        }
        if (typeof api.forEachNode === "function") {
          api.forEachNode((node) => {
            node.setSelected(false);
          });
        }
      }
      setTimeout(() => {
        isTogglingSelectAllRef.current = false;
      }, 100);
    } else {
      isTogglingSelectAllRef.current = true;
      setIsSelectingAll(true);
      if (api) {
        if (typeof api.forEachNode === "function") {
          api.forEachNode((node) => {
            if (node && node.data && node.data.material_id !== -9999 && node.data.sheet_type !== "TOTAL") {
              node.setSelected(true, false);
            }
          });
        }
        const currentSelected = api.getSelectedRows?.() || [];
        setSelectedRows(currentSelected);
      }
      setTimeout(() => {
        isTogglingSelectAllRef.current = false;
      }, 100);
    }
  }, [isSelectingAll]);

  const handleSelectionChange = useCallback((rows) => {
    if (isTogglingSelectAllRef.current) {
      return;
    }
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
      .filter((c) => !!c.field && c.field !== "__checkbox__" && c.field !== "__select__");

    // 2️⃣ Prepare Payload
    const payload = {
      report_title: "Global Report",
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
          obj[c.field] = row[c.field] !== undefined && row[c.field] !== null ? row[c.field] : "";
        });
        return obj;
      });
      payload.rows = cleanedRows;
    } else {
      // Option B: Full filtered mode / Select All mode
      const gridFilters = gridApiRef.current.getFilterModel ? gridApiRef.current.getFilterModel() : {};
      const activeFilters = { ...gridFilters, ...(filters || {}) };
      payload.filters = activeFilters;
      message.info("Exporting records...");
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
    <div className="flex flex-col w-full gap-2.5">
      {/* Top KPI Cards */}
      <ReportKPICards cards={kpiCards} />

      {/* Header Actions & Column Selector */}
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

      <ProductsGrid
        filters={filters}
        onSelectionChange={handleSelectionChange}
        gridApiRef={gridApiRef}
        onColumnsReady={setAllColumns}
        visibleColumns={visibleColumns}
        onTotalsUpdate={setTotals}
        onTotalCountChange={setTotalCount}
        isSelectingAll={isSelectingAll}
      />
    </div>
  );
});

GlobalReport.displayName = "GlobalReport";

export default GlobalReport;
