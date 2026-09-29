import React, { useCallback, useEffect, useMemo, useState, memo } from "react";
import ReusableTable from "@/components/ReusableComponents/ReusableTable";
import { useLazyGetOverallDetailsQuery } from "@/store/services/admin.api";
import {
  formatMinutesToTime,
  parseTimeToMinutes,
} from "@/components/AdminComponents/ReportComponents/utils/productsTableUtils";

const SELECTION_STORAGE_KEY = "admin_products_selected_rows";
const TOTAL_ROW_ID = -9999;

/* -------------------- Format Helpers -------------------- */

const displayTime = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const mins = parseTimeToMinutes(value);
  const stringVal = typeof value === "string" ? value : undefined;
  const numberVal = typeof value === "number" ? value : undefined;

  if (mins === 0 && (stringVal === "0" || numberVal === 0 || stringVal === "00:00")) {
    return formatMinutesToTime(0);
  }
  return formatMinutesToTime(mins);
};

const displayNumber = (value, decimals) => {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  if (decimals !== undefined) return n.toFixed(decimals);
  return String(n);
};

const safeStr = (p) => (p.value == null || p.value === "" ? "—" : String(p.value));
const numFmt0 = (p) => displayNumber(p.value, 0);
const numFmt3 = (p) => displayNumber(p.value, 3);
const timeFmt = (p) => displayTime(p.value);

const dateFilterParams = {
  browserDatePicker: true,
  maxNumConditions: 2,
  comparator: (filterLocalDateAtMidnight, cellValue) => {
    if (cellValue == null) return -1;
    const cellDate = new Date(cellValue);
    const cellDateAtMidnight = new Date(
      cellDate.getFullYear(),
      cellDate.getMonth(),
      cellDate.getDate()
    );

    if (filterLocalDateAtMidnight.getTime() === cellDateAtMidnight.getTime())
      return 0;
    if (cellDateAtMidnight < filterLocalDateAtMidnight) return -1;
    return 1;
  },
};

const DEFAULT_COL_DEF = {
  sortable: true,
  filter: true,
  resizable: true,
  headerClass: "ag-center-header",
  cellClass: "ag-center-cell text-sm",
  suppressMovable: true,
  cellStyle: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  filterParams: {
    filterPlaceholder: "Search....",
  },
};

const STATIC_COLUMN_DEFS = [
  // Basic Info
  { field: "sheet_type", headerName: "Sheet Type", width: 150, valueFormatter: safeStr },
  { field: "job_type", headerName: "Job Type", width: 150, valueFormatter: safeStr },
  { field: "inward_slip_number", headerName: "Slip No.", width: 130, valueFormatter: safeStr },
  {
    field: "date", headerName: "Inward Date", width: 130, valueFormatter: safeStr, filter: "agDateColumnFilter",
    filterParams: dateFilterParams,
  },
  { field: "company_name", headerName: "Company", width: 220, valueFormatter: safeStr },
  { field: "customer_name", headerName: "Customer", width: 200, valueFormatter: safeStr },
  { field: "contact_no", headerName: "Contact No", width: 180, valueFormatter: safeStr },
  { field: "customer_dc_no", headerName: "Customer DC No", width: 180, valueFormatter: safeStr },
  { field: "worker_no", headerName: "Work Order No", width: 180, valueFormatter: safeStr },
  { field: "inward_created_by", headerName: "Inward Created By", width: 180, valueFormatter: safeStr },

  // Material Specs
  { field: "uid_no", headerName: "UID No", width: 120, valueFormatter: safeStr },
  { field: "heat_no", headerName: "Heat No", width: 120, valueFormatter: safeStr },
  { field: "mat_type", headerName: "Mat Type", width: 120, valueFormatter: safeStr },
  { field: "mat_grade", headerName: "Grade", width: 130, valueFormatter: safeStr },
  { field: "bay", headerName: "Bay", width: 140, valueFormatter: safeStr },
  { field: "thick", headerName: "Thick", width: 120, valueFormatter: numFmt3 },
  { field: "width", headerName: "Width", width: 120, valueFormatter: numFmt0 },
  { field: "length", headerName: "Length", width: 120, valueFormatter: numFmt0 },
  { field: "quantity", headerName: "Order Qty", width: 140, valueFormatter: numFmt0 },
  { field: "density", headerName: "Density", width: 140, valueFormatter: numFmt3 },
  { field: "unit_weight", headerName: "Unit Wt", width: 140, valueFormatter: numFmt3 },
  { field: "total_weight", headerName: "Total Wt", width: 140, valueFormatter: numFmt3 },
  { field: "stock_due", headerName: "Stock Due", width: 140, valueFormatter: numFmt0 },
  { field: "programer_status", headerName: "Prog. Status", width: 140, valueFormatter: safeStr },
  { field: "qa_status", headerName: "QA Status", width: 140, valueFormatter: safeStr },
  { field: "acc_status", headerName: "Material Acc Status", width: 140, valueFormatter: safeStr },
  { field: "material_created_by", headerName: "Material Created By", width: 180, valueFormatter: safeStr },

  // Programmer Details
  { field: "program_no", headerName: "Prog No.", width: 140, valueFormatter: safeStr },
  { field: "program_date", headerName: "Program Date", width: 180, valueFormatter: safeStr, filter: "agDateColumnFilter", filterParams: dateFilterParams },
  { field: "processed_quantity", headerName: "Proc Qty", width: 140, valueFormatter: numFmt0 },
  { field: "balance_quantity", headerName: "Bal Qty", width: 140, valueFormatter: numFmt0 },
  { field: "processed_width", headerName: "Proc Width", width: 140, valueFormatter: numFmt0 },
  { field: "processed_length", headerName: "Proc Length", width: 140, valueFormatter: numFmt0 },

  { field: "used_weight", headerName: "Used Weight (P)", width: 150, valueFormatter: numFmt3 },
  { field: "number_of_sheets", headerName: "No of Sheets (P)", width: 150, valueFormatter: numFmt0 },
  { field: "cut_length_per_sheet", headerName: "Cut Length/Sheet", width: 160, valueFormatter: numFmt3 },
  { field: "pierce_per_sheet", headerName: "Pierce/Sheet", width: 140, valueFormatter: numFmt0 },
  { field: "processed_mins_per_sheet", headerName: "Proc Mins/Sheet", width: 160, valueFormatter: numFmt0 },

  { field: "total_no_of_sheets", headerName: "Total No of Sheets", width: 180, valueFormatter: numFmt0 },
  { field: "total_meters", headerName: "Total Meters", width: 150, valueFormatter: numFmt3 },
  { field: "total_piercing", headerName: "Total Piercing", width: 150, valueFormatter: numFmt0 },
  { field: "total_used_weight", headerName: "Total Used Weight", width: 150, valueFormatter: numFmt3 },
  { field: "total_planned_hours", headerName: "Total Planned Hrs", width: 160, valueFormatter: safeStr },

  { field: "programer_created_by", headerName: "Programmer Created By", width: 180, valueFormatter: safeStr },

  // QA Details
  { field: "qa_processed_date", headerName: "QA Date", width: 120, valueFormatter: safeStr, filter: "agDateColumnFilter", filterParams: dateFilterParams },
  { field: "shift", headerName: "Shift", width: 90, valueFormatter: safeStr },

  // Machine Details
  { field: "machine_name", headerName: "Machine", width: 130, valueFormatter: safeStr },
  { field: "machine_date", headerName: "Machine Date", width: 130, valueFormatter: safeStr, filter: "agDateColumnFilter", filterParams: dateFilterParams },
  { field: "machine_start", headerName: "Start Time", width: 100, valueFormatter: safeStr },
  { field: "machine_end", headerName: "End Time", width: 100, valueFormatter: safeStr },
  { field: "machine_runtime", headerName: "Runtime", width: 110, valueFormatter: timeFmt },
  { field: "machine_operator", headerName: "Operator", width: 130, valueFormatter: safeStr },
  { field: "machine_gas_type", headerName: "Air/Gas", width: 100, valueFormatter: safeStr },

  // Status & Invoice
  { field: "invoice_no", headerName: "Invoice", width: 130, valueFormatter: safeStr },
  { field: "payments_terms", headerName: "Payment Terms", width: 150, valueFormatter: safeStr },
  { field: "status", headerName: "Final Account Status", width: 160, valueFormatter: safeStr },
  { field: "acc_remarks", headerName: "Acc Remarks", width: 200, valueFormatter: safeStr },
];

const ProductsGrid = memo(({
  filters,
  onSelectionChange,
  gridApiRef,
  onColumnsReady,
  visibleColumns,
  onTotalsUpdate,
  onTotalCountChange,
}) => {
  const [_selectedRows, setSelectedRows] = useState([]);
  const [triggerGetDetails] = useLazyGetOverallDetailsQuery();
  const [_totalCount, setTotalCount] = useState(0);

  const createTotalsRowData = useCallback((totals) => {
    return { material_id: TOTAL_ROW_ID, ...totals };
  }, []);

  const updateTotals = useCallback(
    (totals) => {
      if (!gridApiRef?.current || !totals) return;
      const pinnedRow = createTotalsRowData(totals);
      gridApiRef.current.setGridOption("pinnedBottomRowData", [pinnedRow]);
    },
    [createTotalsRowData, gridApiRef]
  );

  // Fetch function passed to ReusableTable
  const fetchData = useCallback(
    async ({ page, pageSize, filters: gridFiltersStr, sort }) => {
      let gridFilters = {};
      if (gridFiltersStr) {
        try {
          gridFilters = typeof gridFiltersStr === "string" ? JSON.parse(gridFiltersStr) : gridFiltersStr;
        } catch {
          gridFilters = {};
        }
      }

      const filterModel = { ...gridFilters, ...(filters || {}) };
      const filtersStr =
        Object.keys(filterModel).length > 0 ? JSON.stringify(filterModel) : undefined;

      try {
        const response = await triggerGetDetails({
          page,
          pageSize,
          filters: filtersStr,
          sort,
        }).unwrap();

        if (response) {
          setTotalCount(response.count);
          onTotalCountChange?.(response.count);
          if (response.totals) {
            updateTotals(response.totals);
            onTotalsUpdate?.(response.totals);
          }
          return { rows: response.rows || [], count: response.count || 0 };
        }
      } catch (error) {
        console.error("Failed to load rows:", error);
      }
      return { rows: [], count: 0 };
    },
    [triggerGetDetails, filters, updateTotals, onTotalsUpdate, onTotalCountChange]
  );

  const columnDefs = useMemo(() => STATIC_COLUMN_DEFS, []);
  const defaultColDef = useMemo(() => DEFAULT_COL_DEF, []);

  const applyColumnVisibility = useCallback(() => {
    if (!gridApiRef?.current) return;
    const api = gridApiRef.current;
    api.applyColumnState({
      state: columnDefs
        .filter((c) => !!c.field)
        .map((col) => ({
          colId: col.field || "",
          hide: visibleColumns?.length ? !visibleColumns.includes(col.field || "") : false,
        })),
      applyOrder: false,
    });
  }, [visibleColumns, columnDefs, gridApiRef]);

  useEffect(() => {
    applyColumnVisibility();
  }, [applyColumnVisibility]);

  const saveSelection = useCallback((rows) => {
    const ids = rows.map((row) => `${row.material_id}_${row.machine_start || 0}`);
    localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const restoreSelection = useCallback(() => {
    if (!gridApiRef?.current) return;
    const stored = localStorage.getItem(SELECTION_STORAGE_KEY);
    if (!stored) return;
    const ids = JSON.parse(stored);
    gridApiRef.current.forEachNode((node) => {
      const data = node.data;
      if (!data) return;
      const id = `${data.material_id}_${data.machine_start || 0}`;
      if (ids.includes(id)) node.setSelected(true);
    });
  }, [gridApiRef]);

  const onSelectionChanged = useCallback(
    (event) => {
      const rows = event.api.getSelectedRows();
      setSelectedRows(rows);
      saveSelection(rows);
      onSelectionChange?.(rows);
    },
    [saveSelection, onSelectionChange]
  );

  const handleGridReady = useCallback(
    (params) => {
      if (gridApiRef) gridApiRef.current = params.api;
      const cols = columnDefs
        .filter((c) => !!c.field)
        .map((c) => ({ label: c.headerName, value: c.field }));
      onColumnsReady?.(cols);
      applyColumnVisibility();
      restoreSelection();
    },
    [columnDefs, onColumnsReady, applyColumnVisibility, restoreSelection, gridApiRef]
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 min-h-0 relative">
        <ReusableTable
          persistKey="admin_products"
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          fetchData={fetchData}
          pageSize={100}
          cacheBlockSize={100}
          headerHeight={22}
          rowHeight={20}
          rowSelection={{ mode: "multiRow", headerCheckbox: false }}
          getRowId={(params) =>
            `${params.data.material_id}_${params.data.machine_name || "no"}_${params.data.machine_start || "0"}`
          }
          onSelectionChanged={onSelectionChanged}
          onGridReady={handleGridReady}
          containerClassName="w-full h-full relative"
        />
      </div>
    </div>
  );
});

ProductsGrid.displayName = "ProductsGrid";

export default ProductsGrid;
