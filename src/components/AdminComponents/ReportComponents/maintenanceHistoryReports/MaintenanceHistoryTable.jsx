import React, { useMemo } from "react";
import { Tooltip } from "antd";
import { Icon } from "@iconify/react";
import ReusableTable from "@/components/ReusableComponents/ReusableTable";

const MaintenanceHistoryTable = ({
  rowData = [],
  loading = false,
  onSelectionChanged,
  onFilterChanged,
  onGridReady,
}) => {
  const columnDefs = useMemo(
    () => [
      {
        headerName: "",
        field: "__select__",
        width: 38,
        minWidth: 38,
        maxWidth: 38,
        headerCheckboxSelection: false,
        checkboxSelection: true,
        showDisabledCheckboxes: false,
        resizable: false,
        sortable: false,
        filter: false,
        pinned: "left",
        suppressHeaderMenuButton: true,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !p-0 !text-center flex !items-center !justify-center",
      },
      {
        headerName: "SL.NO",
        field: "sno",
        flex: 0.35,
        minWidth: 50,
        filter: false,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell",
        cellRenderer: (p) => (
          <span className="font-semibold text-slate-600 text-[10px]">
            {p.value}
          </span>
        ),
      },
      {
        headerName: "TYPE",
        field: "maintenance_type",
        flex: 0.75,
        minWidth: 110,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (params) => {
          const isBreakdown =
            params.data?.type_key === "breakdown" ||
            String(params.value || "").toLowerCase().includes("breakdown");
          return (
            <span
              className={`inline-flex items-center justify-center gap-1 px-1 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider leading-none whitespace-nowrap border ${isBreakdown
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
            >
              <Icon
                icon={isBreakdown ? "lucide:alert-triangle" : "lucide:calendar-clock"}
                className="w-3 h-3 shrink-0"
              />
              <span>{isBreakdown ? "Breakdown" : "Periodic"}</span>
            </span>
          );
        },
      },
      {
        headerName: "RECORD NO.",
        field: "record_number",
        flex: 0.7,
        minWidth: 95,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (params) => (
          <span className="font-mono font-semibold text-slate-700 text-[10px]">
            {params.value || "-"}
          </span>
        ),
      },
      {
        headerName: "DATE",
        field: "maintenance_date",
        flex: 0.6,
        minWidth: 85,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center text-slate-600 text-[10px]",
        cellRenderer: (p) => (p.value && p.value !== "-" ? p.value : <span className="text-slate-400">-</span>),
      },
      {
        headerName: "MACHINE NAME",
        field: "machine_name",
        flex: 0.85,
        minWidth: 110,
        wrapText: true,
        autoHeight: true,
        cellClass: "!text-left !justify-start !pl-1 font-semibold text-slate-800 text-[10px] uppercase py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (p) => (
          <span className="whitespace-normal break-words leading-relaxed block">{p.value || "-"}</span>
        ),
      },
      {
        headerName: "TITLE / ISSUE",
        field: "title",
        flex: 1.2,
        minWidth: 140,
        wrapText: true,
        autoHeight: true,
        cellClass: "!text-left !justify-start !pl-1 text-slate-700 text-[10px] py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (p) => (
          <span className="whitespace-normal break-words leading-relaxed block">{p.value || "-"}</span>
        ),
      },
      {
        headerName: "STATUS",
        field: "status",
        flex: 0.6,
        minWidth: 85,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (params) => {
          const val = String(params.value || "PENDING").toUpperCase();
          let badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
          if (val === "COMPLETED" || val === "CLOSED") {
            badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
          } else if (val === "OVERDUE") {
            badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
          } else if (val === "PENDING" || val === "OPEN") {
            badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
          }
          return (
            <span
              className={`inline-flex items-center justify-center px-1 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider leading-none whitespace-nowrap border ${badgeStyle}`}
            >
              {val}
            </span>
          );
        },
      },
      {
        headerName: "INTERVAL",
        field: "interval_display",
        flex: 0.55,
        minWidth: 75,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center text-slate-700 text-[10px]",
        cellRenderer: (p) => (p.value && p.value !== "-" ? p.value : <span className="text-slate-400">-</span>),
      },
      {
        headerName: "NEXT DUE DATE",
        field: "next_maintenance_date",
        flex: 0.65,
        minWidth: 90,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center text-slate-600 text-[10px]",
        cellRenderer: (p) => (p.value && p.value !== "-" ? p.value : <span className="text-slate-400">-</span>),
      },
      {
        headerName: "REMAINING DAYS",
        field: "remaining_days_display",
        flex: 0.7,
        minWidth: 95,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center text-[10px]",
        cellRenderer: (p) => {
          if (!p.value || p.value === "-") return <span className="text-slate-400">-</span>;
          const status = p.data?.remaining_days_status;
          const remDays = p.data?.remaining_days;
          const remindThreshold = p.data?.remind_before_days ?? 3;
          let colorClass = "text-emerald-600 font-medium";

          if (status === "overdue" || (typeof remDays === "number" && remDays < 0)) {
            colorClass = "text-rose-600 font-bold";
          } else if (status === "due_today" || (typeof remDays === "number" && remDays === 0)) {
            colorClass = "text-rose-600 font-bold";
          } else if (
            status === "remind" ||
            (typeof remDays === "number" && remDays > 0 && remDays <= remindThreshold)
          ) {
            colorClass = "text-amber-500 font-semibold";
          }
          return <span className={colorClass}>{p.value}</span>;
        },
      },
      {
        headerName: "DOWNTIME",
        field: "downtime_display",
        flex: 0.6,
        minWidth: 80,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (p) => (
          p.value && p.value !== "-" ? (
            <span className="font-semibold text-amber-700 text-[10px]">{p.value}</span>
          ) : (
            <span className="text-slate-400">-</span>
          )
        ),
      },
      {
        headerName: "OPERATOR",
        field: "operator_name",
        flex: 0.7,
        minWidth: 90,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (p) => (
          p.value && p.value !== "-" ? (
            <span className="whitespace-normal break-words leading-relaxed block">{p.value}</span>
          ) : (
            <span className="text-slate-400">-</span>
          )
        ),
      },
      {
        headerName: "SUPERVISED BY",
        field: "supervised_by",
        flex: 0.7,
        minWidth: 95,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center text-slate-700 text-[10px]",
        cellRenderer: (p) => (
          p.value && p.value !== "-" ? (
            <span className="font-medium text-slate-700">{p.value}</span>
          ) : (
            <span className="text-slate-400">-</span>
          )
        ),
      },
      {
        headerName: "PARTS USED",
        field: "parts_used",
        flex: 1.0,
        minWidth: 120,
        wrapText: true,
        autoHeight: true,
        headerClass: "!text-left !justify-start pl-2",
        cellClass: "!text-left !justify-start !pl-1 text-slate-700 text-[10px] py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (p) => (
          p.value && p.value !== "-" ? (
            <span className="whitespace-normal break-words leading-relaxed block">{p.value}</span>
          ) : (
            <span className="text-slate-400">-</span>
          )
        ),
      },
      {
        headerName: "CREATED BY",
        field: "created_by",
        flex: 0.65,
        minWidth: 85,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (p) => (
          p.value && p.value !== "-" ? (
            <span className="whitespace-normal break-words leading-relaxed block">{p.value}</span>
          ) : (
            <span className="text-slate-400">-</span>
          )
        ),
      },
      {
        headerName: "REMARKS",
        field: "remarks",
        flex: 1.2,
        minWidth: 130,
        wrapText: true,
        autoHeight: true,
        headerClass: "!text-left !justify-start pl-2",
        cellClass: "!text-left !justify-start !pl-1 text-slate-600 text-[10px] py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (p) => (
          p.value && p.value !== "-" ? (
            <span className="whitespace-normal break-words leading-relaxed block">{p.value}</span>
          ) : (
            <span className="text-slate-400">-</span>
          )
        ),
      },
    ],
    [],
  );

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
      minWidth: 80,
    }),
    [],
  );

  return (
    <ReusableTable
      persistKey="maintenance_history_report_grid"
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      rowData={rowData}
      rowModelType="clientSide"
      rowSelection="multiple"
      suppressRowClickSelection={true}
      onSelectionChanged={onSelectionChanged}
      onFilterChanged={onFilterChanged}
      onGridReady={onGridReady}
      loading={loading}
      loadingText="Refreshing maintenance history..."
      containerClassName="w-full min-w-full h-[70vh] relative rounded-lg overflow-hidden shadow-xs border border-gray-200 bg-white"
      pageSize={20}
      pageSizeSelector={[20, 40, 60, 100]}
      emptyTitle="No Maintenance Records Found"
      emptyDescription="There are no maintenance records recorded yet."
      getRowId={(params) =>
        params.data?.id?.toString() ||
        params.data?.sno?.toString() ||
        Math.random().toString()
      }
    />
  );
};

export default React.memo(MaintenanceHistoryTable);
