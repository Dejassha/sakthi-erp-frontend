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

const safeStr = (p) => (p.value == null || p.value === "" ? "—" : String(p.value));

const numFmt0 = (p) => {
  if (p.value === null || p.value === undefined || p.value === "") return "—";
  const n = Number(p.value);
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
};

const numFmt2 = (p) => {
  if (p.value === null || p.value === undefined || p.value === "") return "—";
  const n = Number(p.value);
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const numFmt3 = (p) => {
  if (p.value === null || p.value === undefined || p.value === "") return "—";
  const n = Number(p.value);
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
};

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

const alignLeft = {
  headerClass: "!text-left !justify-start wrap-header leading-tight",
  cellClass: "!text-left !justify-start text-[10px] !pl-1",
};

const alignRight = {
  headerClass: "!text-right !justify-end wrap-header leading-tight",
  cellClass: "!text-right !justify-end !pr-2 text-[10px] font-medium",
};

const alignCenter = {
  headerClass: "!text-center !justify-center wrap-header leading-tight",
  cellClass: "!text-center !justify-center text-[10px]",
};

const DEFAULT_COL_DEF = {
  sortable: true,
  filter: true,
  resizable: true,
  wrapHeaderText: true,
  autoHeaderHeight: true,
  headerClass: "!text-center !justify-center wrap-header leading-tight",
  cellClass: "!text-center !justify-center text-[10px]",
  suppressMovable: true,
  filterParams: {
    filterPlaceholder: "Search....",
  },
};

const STATIC_COLUMN_DEFS = [
  // Basic Info
  { field: "sheet_type", headerName: "Sheet Type", flex: 1, minWidth: 60, valueFormatter: safeStr, ...alignCenter },
  { field: "job_type", headerName: "Job Type", flex: 1, minWidth: 110, valueFormatter: safeStr, ...alignCenter },
  { field: "inward_slip_number", headerName: "Slip No.", flex: 0.9, minWidth: 55, valueFormatter: safeStr, ...alignCenter },
  {
    field: "date",
    headerName: "Inward Date",
    flex: 1,
    minWidth: 70,
    valueFormatter: safeStr,
    filter: "agDateColumnFilter",
    filterParams: dateFilterParams,
    ...alignCenter,
  },
  { field: "company_name", headerName: "Company", flex: 1.8, minWidth: 200, valueFormatter: safeStr, ...alignLeft },
  { field: "customer_name", headerName: "Customer", flex: 1.6, minWidth: 130, valueFormatter: safeStr, ...alignLeft },
  { field: "contact_no", headerName: "Contact No", flex: 1, minWidth: 80, valueFormatter: safeStr, ...alignCenter },
  { field: "customer_dc_no", headerName: "Customer DC No", flex: 1.1, minWidth: 90, valueFormatter: safeStr, ...alignCenter },
  { field: "worker_no", headerName: "Work Order No", flex: 1.2, minWidth: 100, valueFormatter: safeStr, ...alignLeft },
  { field: "inward_created_by", headerName: "Inward Created By", flex: 1.2, minWidth: 90, valueFormatter: safeStr, ...alignCenter },

  // Material Specs
  { field: "uid_no", headerName: "UID No", flex: 0.9, minWidth: 60, valueFormatter: safeStr, ...alignCenter },
  { field: "heat_no", headerName: "Heat No", flex: 0.9, minWidth: 70, valueFormatter: safeStr, ...alignCenter },
  { field: "mat_type", headerName: "Mat Type", flex: 0.9, minWidth: 60, valueFormatter: safeStr, ...alignCenter },
  { field: "mat_grade", headerName: "Grade", flex: 1, minWidth: 70, valueFormatter: safeStr, ...alignCenter },
  { field: "bay", headerName: "Bay", flex: 0.8, minWidth: 60, valueFormatter: safeStr, ...alignCenter },
  { field: "thick", headerName: "Thick (mm)", flex: 0.9, minWidth: 60, valueFormatter: numFmt3, ...alignCenter },
  { field: "width", headerName: "Width (mm)", flex: 0.9, minWidth: 70, valueFormatter: numFmt0, ...alignCenter },
  { field: "length", headerName: "Length (mm)", flex: 0.9, minWidth: 70, valueFormatter: numFmt0, ...alignCenter },
  { field: "quantity", headerName: "Qty", flex: 0.9, minWidth: 55, valueFormatter: numFmt0, ...alignCenter },
  { field: "density", headerName: "Density", flex: 0.9, minWidth: 75, valueFormatter: numFmt3, ...alignCenter },
  { field: "unit_weight", headerName: "Unit Wt (kg)", flex: 1, minWidth: 75, valueFormatter: numFmt3, ...alignCenter },
  { field: "total_weight", headerName: "Total Wt (kg)", flex: 1.1, minWidth: 80, valueFormatter: numFmt3, ...alignCenter },
  { field: "stock_due", headerName: "Stock Due", flex: 0.9, minWidth: 70, valueFormatter: numFmt0, ...alignCenter },
  { field: "programer_status", headerName: "Prog. Status", flex: 1, minWidth: 80, valueFormatter: safeStr, ...alignCenter },
  { field: "qa_status", headerName: "QA Status", flex: 1, minWidth: 75, valueFormatter: safeStr, ...alignCenter },
  { field: "acc_status", headerName: "Material Acc Status", flex: 1.2, minWidth: 90, valueFormatter: safeStr, ...alignCenter },
  { field: "material_created_by", headerName: "Material Created By", flex: 1.2, minWidth: 90, valueFormatter: safeStr, ...alignCenter },

  // Programmer Details
  { field: "program_no", headerName: "Prog No.", flex: 1, minWidth: 90, valueFormatter: safeStr, ...alignCenter },
  {
    field: "program_date",
    headerName: "Program Date",
    flex: 1,
    minWidth: 80,
    valueFormatter: safeStr,
    filter: "agDateColumnFilter",
    filterParams: dateFilterParams,
    ...alignCenter,
  },
  { field: "processed_quantity", headerName: "Proc Qty", flex: 0.9, minWidth: 60, valueFormatter: numFmt0, ...alignCenter },
  { field: "balance_quantity", headerName: "Bal Qty", flex: 0.9, minWidth: 50, valueFormatter: numFmt0, ...alignCenter },
  { field: "processed_width", headerName: "Proc Width (mm)", flex: 1, minWidth: 90, valueFormatter: numFmt0, ...alignCenter },
  { field: "processed_length", headerName: "Proc Length (mm)", flex: 1, minWidth: 100, valueFormatter: numFmt0, ...alignCenter },

  { field: "used_weight", headerName: "Used Wt (kg)", flex: 1.1, minWidth: 70, valueFormatter: numFmt3, ...alignCenter },
  { field: "number_of_sheets", headerName: "No of Sheets", flex: 1, minWidth: 70, valueFormatter: numFmt0, ...alignCenter },
  { field: "cut_length_per_sheet", headerName: "Cut Length Per Sheet", flex: 1.1, minWidth: 90, valueFormatter: numFmt3, ...alignCenter },
  { field: "pierce_per_sheet", headerName: "Pierce Per Sheet", flex: 0.9, minWidth: 80, valueFormatter: numFmt0, ...alignCenter },
  { field: "processed_mins_per_sheet", headerName: "Proc Mins Per Sheet", flex: 1, minWidth: 90, valueFormatter: numFmt0, ...alignCenter },

  { field: "total_no_of_sheets", headerName: "Total Sheets", flex: 1, minWidth: 70, valueFormatter: numFmt0, ...alignCenter },
  { field: "total_meters", headerName: "Total Meters", flex: 1, minWidth: 70, valueFormatter: numFmt3, ...alignCenter },
  { field: "total_piercing", headerName: "Total Piercing", flex: 1, minWidth: 80, valueFormatter: numFmt0, ...alignCenter },
  { field: "total_used_weight", headerName: "Total Used Wt (kg)", flex: 1.2, minWidth: 90, valueFormatter: numFmt3, ...alignCenter },
  { field: "total_planned_hours", headerName: "Total Planned Hrs", flex: 1.1, minWidth: 100, valueFormatter: timeFmt, ...alignCenter },

  { field: "programer_created_by", headerName: "Programmer Created By", flex: 1.2, minWidth: 100, valueFormatter: safeStr, ...alignCenter },

  // QA Details
  {
    field: "qa_processed_date",
    headerName: "QA Date",
    flex: 0.9,
    minWidth: 60,
    valueFormatter: safeStr,
    filter: "agDateColumnFilter",
    filterParams: dateFilterParams,
    ...alignCenter,
  },
  { field: "shift", headerName: "Shift", flex: 0.7, minWidth: 65, valueFormatter: safeStr, ...alignCenter },

  // Machine Details
  { field: "machine_name", headerName: "Machine", flex: 1, minWidth: 80, valueFormatter: safeStr, ...alignCenter },
  {
    field: "machine_date",
    headerName: "Machine Date",
    flex: 1,
    minWidth: 75,
    valueFormatter: safeStr,
    filter: "agDateColumnFilter",
    filterParams: dateFilterParams,
    ...alignCenter,
  },
  { field: "machine_start", headerName: "Start Time", flex: 0.8, minWidth: 60, valueFormatter: safeStr, ...alignCenter },
  { field: "machine_end", headerName: "End Time", flex: 0.8, minWidth: 60, valueFormatter: safeStr, ...alignCenter },
  { field: "machine_runtime", headerName: "Run Time", flex: 0.9, minWidth: 60, valueFormatter: timeFmt, ...alignCenter },
  { field: "machine_operator", headerName: "Operator", flex: 1.1, minWidth: 100, valueFormatter: safeStr, ...alignCenter },
  { field: "machine_gas_type", headerName: "Air/Gas", flex: 0.8, minWidth: 80, valueFormatter: safeStr, ...alignCenter },

  // Status & Invoice
  { field: "invoice_no", headerName: "Invoice No.", flex: 0.9, minWidth: 85, valueFormatter: safeStr, ...alignCenter },
  { field: "payments_terms", headerName: "Payment Terms", flex: 1.1, minWidth: 75, valueFormatter: safeStr, ...alignCenter },
  { field: "status", headerName: "Account Status", flex: 1.1, minWidth: 80, valueFormatter: safeStr, ...alignCenter },
  { field: "acc_remarks", headerName: "Acc Remarks", flex: 1.6, minWidth: 150, valueFormatter: safeStr, ...alignLeft },
];

const ProductsGrid = memo(({
  filters,
  onSelectionChange,
  gridApiRef,
  onColumnsReady,
  visibleColumns,
  onTotalsUpdate,
  onTotalCountChange,
  isSelectingAll = false,
}) => {
  const [_selectedRows, setSelectedRows] = useState([]);
  const [triggerGetDetails] = useLazyGetOverallDetailsQuery();
  const [_totalCount, setTotalCount] = useState(0);

  const createTotalsRowData = useCallback((totals) => {
    return { material_id: TOTAL_ROW_ID, sheet_type: "TOTAL", ...totals };
  }, []);

  const updateTotals = useCallback(
    (totals) => {
      if (!gridApiRef?.current || !totals) return;
      const pinnedRow = createTotalsRowData(totals);
      gridApiRef.current.setGridOption("pinnedBottomRowData", [pinnedRow]);
    },
    [createTotalsRowData, gridApiRef]
  );

  const selectAllLoadedNodes = useCallback(() => {
    if (!gridApiRef?.current) return;
    gridApiRef.current.forEachNode((node) => {
      if (
        node &&
        node.data &&
        node.data.material_id !== TOTAL_ROW_ID &&
        node.data.sheet_type !== "TOTAL" &&
        !node.isSelected()
      ) {
        node.setSelected(true, false);
      }
    });
  }, [gridApiRef]);

  useEffect(() => {
    if (isSelectingAll) {
      selectAllLoadedNodes();
    }
  }, [isSelectingAll, selectAllLoadedNodes]);

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
          if (isSelectingAll) {
            setTimeout(() => {
              selectAllLoadedNodes();
            }, 60);
          }
          return { rows: response.rows || [], count: response.count || 0 };
        }
      } catch (error) {
        console.error("Failed to load rows:", error);
      }
      return { rows: [], count: 0 };
    },
    [triggerGetDetails, filters, updateTotals, onTotalsUpdate, onTotalCountChange, isSelectingAll, selectAllLoadedNodes]
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

  const onSelectionChanged = useCallback(
    (event) => {
      const rows = event.api.getSelectedRows();
      setSelectedRows(rows);
      onSelectionChange?.(rows);
    },
    [onSelectionChange]
  );

  const handleFilterChanged = useCallback(
    (params) => {
      if (params?.api) {
        params.api.deselectAll();
      }
      setSelectedRows([]);
      onSelectionChange?.([]);
    },
    [onSelectionChange]
  );

  const handlePaginationChanged = useCallback(() => {
    if (isSelectingAll) {
      setTimeout(() => {
        selectAllLoadedNodes();
      }, 60);
    }
  }, [isSelectingAll, selectAllLoadedNodes]);

  const handleGridReady = useCallback(
    (params) => {
      if (gridApiRef) gridApiRef.current = params.api;
      const cols = columnDefs
        .filter((c) => !!c.field)
        .map((c) => ({ label: c.headerName, value: c.field }));
      onColumnsReady?.(cols);
      applyColumnVisibility();
      if (isSelectingAll) {
        setTimeout(() => {
          selectAllLoadedNodes();
        }, 60);
      }
    },
    [columnDefs, onColumnsReady, applyColumnVisibility, gridApiRef, isSelectingAll, selectAllLoadedNodes]
  );

  return (
    <div className="w-full">
      <ReusableTable
        persistKey="admin_products"
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        fetchData={fetchData}
        pageSize={100}
        pageSizeSelector={[100, 200, 300, 400, 500]}
        rowSelection={{ mode: "multiRow", headerCheckbox: false }}
        getRowId={(params) =>
          `${params.data.material_id}_${params.data.machine_log_id || params.data.machine_name || "no"}_${params.data.machine_start || "0"}`
        }
        onSelectionChanged={onSelectionChanged}
        onFilterChanged={handleFilterChanged}
        onPaginationChanged={handlePaginationChanged}
        onGridReady={handleGridReady}
        containerClassName="w-full h-[68vh] min-h-[450px] relative rounded-xl overflow-hidden shadow-xs border border-slate-200 bg-white"
      />
    </div>
  );
});

ProductsGrid.displayName = "ProductsGrid";

export default ProductsGrid;
