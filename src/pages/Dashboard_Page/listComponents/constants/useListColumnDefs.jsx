import React, { useMemo } from "react";
import formatDateDDMMYYYY from "@/pages/Inward_Page/utils/inwardTableValidations";
import {
  StatusBadge,
  ColorBadge,
  JobTypeBadge,
  ProgrammerNumbersCellRenderer,
  ActionButton,
} from "./ListBadges";

// Custom Hook to return AG Grid Column Definitions
export const useListColumnDefs = (type, onView) => {
  return useMemo(() => {
    const cols = [];
    // First column: PROGRAMMER NO. only for qa
    if (type === "qa") {
      cols.push({
        headerName: "PROGRAMMER NO.",
        field: "programmer_no",
        filter: "agTextColumnFilter",
        sortable: false,
        flex: 0.5,
        minWidth: 80,
        cellRenderer: ProgrammerNumbersCellRenderer,
      });
    }
    // Common columns: SLIP NO., DATE, COMPANY NAME
    cols.push(
      {
        headerName: "SLIP NO.",
        field: "inward_slip_number",
        filter: "agTextColumnFilter",
        flex: 0.2,
        minWidth: 55,
      },
      {
        headerName: "DATE",
        field: "date",
        filter: "agDateColumnFilter",
        filterParams: {
          browserDatePicker: true,
          maxNumConditions: 2,
          comparator: (filterLocalDateAtMidnight, cellValue) => {
            if (cellValue == null) return -1;
            const cellDate = new Date(cellValue);
            const cellDateAtMidnight = new Date(
              cellDate.getFullYear(),
              cellDate.getMonth(),
              cellDate.getDate(),
            );
            if (
              filterLocalDateAtMidnight.getTime() ===
              cellDateAtMidnight.getTime()
            )
              return 0;
            if (cellDateAtMidnight < filterLocalDateAtMidnight) return -1;
            return 1;
          },
        },
        flex: 0.2,
        minWidth: 60,
        valueFormatter: (params) => formatDateDDMMYYYY(params.value),
      },
      {
        headerName: "COMPANY NAME",
        field: "company_name",
        filter: "agTextColumnFilter",
        cellClass: "text-left !p-0 !px-1.5 font-medium",
        flex: 1,
        minWidth: 180,
      },
      {
        headerName: "SHEET TYPE",
        field: "sheet_type",
        filter: "agTextColumnFilter",
        cellRenderer: ColorBadge,
        flex: 0.3,
        minWidth: 70,
      },
      {
        headerName: "JOB TYPE",
        field: "job_type",
        filter: "agTextColumnFilter",
        cellRenderer: (params) => {
          const val =
            params.value ||
            (params.data?.sheet_type === "quotation" ? "Development" : "-");
          return <JobTypeBadge value={val} />;
        },
        flex: 0.4,
        minWidth: 125,
      },
    );
    // Add dashboard-specific status columns
    if (type === "programmer") {
      cols.push({
        headerName: "PRGM STATUS",
        field: "programer_status",
        filter: "agTextColumnFilter",
        flex: 0.3,
        minWidth: 80,
        cellRenderer: (props) => <StatusBadge value={props.value} />,
      });
    }
    if (type === "qa") {
      cols.push({
        headerName: "PRGM STATUS",
        field: "programer_status",
        filter: "agTextColumnFilter",
        flex: 0.3,
        minWidth: 85,
        cellRenderer: (props) => <StatusBadge value={props.value} />,
      });
      cols.push({
        headerName: "QA STATUS",
        field: "qa_status",
        filter: "agTextColumnFilter",
        flex: 0.3,
        minWidth: 85,
        cellRenderer: (props) => <StatusBadge value={props.value} />,
      });
    }
    if (type === "accounts" || type === "admin") {
      cols.push({
        headerName: "PRGM STATUS",
        field: "programer_status",
        filter: "agTextColumnFilter",
        flex: 0.3,
        minWidth: 85,
        cellRenderer: (props) => <StatusBadge value={props.value} />,
      });
      cols.push({
        headerName: "QA STATUS",
        field: "qa_status",
        filter: "agTextColumnFilter",
        flex: 0.3,
        minWidth: 85,
        cellRenderer: (props) => <StatusBadge value={props.value} />,
      });
      cols.push({
        headerName: "ACC STATUS",
        field: "outward_status",
        filter: "agTextColumnFilter",
        flex: 0.3,
        minWidth: 85,
        cellRenderer: (props) => <StatusBadge value={props.value} />,
      });
    }
    cols.push({
      headerName: "CREATED BY",
      field: "created_by",
      filter: "agTextColumnFilter",
      flex: 0.3,
      minWidth: 70,
    });
    cols.push({
      headerName: "ACTION",
      cellRenderer: ActionButton,
      cellRendererParams: {
        onView: onView,
      },
      sortable: false,
      filter: false,
      pinned: "right",
      flex: 0.8,
      width: 60,
    });
    return cols;
  }, [type, onView]);
};

// Default Column Definitions
export const defaultColDef = {
  sortable: true,
  resizable: true,
  filter: true,
  wrapText: true,
  autoHeight: true,
  headerClass: "ag-center-header text-gray-800 font-semibold",
  cellClass: "ag-center-cell text-[10px] text-gray-800 font-normal",
  suppressMovable: true,
};
