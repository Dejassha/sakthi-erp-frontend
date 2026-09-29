import React, { useMemo } from "react";
import dayjs from "dayjs";
import ReusableTable from "@/components/ReusableComponents/ReusableTable";

const PeriodicMaintenanceTable = ({
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
        headerName: "EVENT / ACTION",
        field: "action",
        flex: 0.7,
        minWidth: 95,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (params) => {
          let val = String(params.value || "SCHEDULED").toUpperCase();
          let badgeStyle = "bg-slate-50 text-slate-700 border-slate-200";

          if (val === "COMPLETED" || val === "APPROVED" || val === "UPDATED") {
            val = "UPDATED";
            badgeStyle = "bg-yellow-50 text-yellow-800 border-yellow-300";
          } else if (val === "CREATED") {
            badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
          } else if (val === "EDITED" || val === "MODIFIED") {
            val = "EDITED";
            badgeStyle = "bg-orange-50 text-orange-700 border-orange-200";
          } else if (val === "DELETED" || val === "CANCELLED") {
            val = "DELETED";
            badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
          }

          return (
            <span
              className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider leading-none whitespace-nowrap border ${badgeStyle}`}
            >
              {val}
            </span>
          );
        },
      },
      {
        headerName: "DATE & TIME",
        field: "timestamp",
        flex: 1.0,
        minWidth: 155,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (p) => {
          if (!p.value || p.value === "-") return <span className="text-slate-400">-</span>;

          let dateStr = "";
          let timeStr = "";

          if (typeof p.value === "string" && (p.value.includes("AM") || p.value.includes("PM"))) {
            const parts = p.value.trim().split(" ");
            if (parts.length >= 3) {
              dateStr = parts[0];
              timeStr = `${parts[1]} ${parts[2]}`;
            } else {
              dateStr = p.value;
            }
          } else {
            const d = dayjs(p.value);
            if (d.isValid()) {
              dateStr = d.format("YYYY-MM-DD");
              timeStr = d.format("hh:mm A");
            } else {
              dateStr = String(p.value);
            }
          }

          return (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-200/80 bg-slate-50/70 shadow-2xs">
              <span className="font-semibold text-slate-700 text-[10px] tracking-tight">
                {dateStr}
              </span>
              {timeStr && (
                <>
                  <span className="w-px h-2.5 bg-slate-300" />
                  <span className="font-medium text-blue-600 text-[9.5px] tracking-tight whitespace-nowrap">
                    {timeStr}
                  </span>
                </>
              )}
            </div>
          );
        },
      },
      {
        headerName: "PERFORMED BY",
        field: "performed_by",
        flex: 0.75,
        minWidth: 100,
        headerClass: "!text-left !justify-start pl-2",
        cellClass: "!text-left !justify-start !pl-1 font-semibold text-slate-700 text-[10px] uppercase py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (p) => (p.value && p.value !== "-" ? p.value : <span className="text-slate-400">-</span>),
      },
      {
        headerName: "MACHINE NAME",
        field: "machine_name",
        flex: 0.9,
        minWidth: 120,
        wrapText: true,
        autoHeight: true,
        headerClass: "!text-left !justify-start pl-2",
        cellClass: "!text-left !justify-start !pl-1 font-semibold text-slate-800 text-[10px] uppercase py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (p) => (
          <span className="whitespace-normal break-words leading-relaxed block">{p.value || "-"}</span>
        ),
      },
      {
        headerName: "SCHEDULE / TASK NAME",
        field: "title",
        flex: 1.2,
        minWidth: 140,
        wrapText: true,
        autoHeight: true,
        headerClass: "!text-left !justify-start pl-2",
        cellClass: "!text-left !justify-start !pl-1 text-slate-700 text-[10px] py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (p) => (
          <span className="whitespace-normal break-words leading-relaxed block">{p.value || "-"}</span>
        ),
      },
      {
        headerName: "SUPERVISED BY",
        field: "supervised_by",
        flex: 0.8,
        minWidth: 100,
        wrapText: true,
        autoHeight: true,
        headerClass: "!text-left !justify-start pl-2",
        cellClass: "!text-left !justify-start !pl-1 font-semibold text-slate-700 text-[10px] uppercase py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (p) => (p.value && p.value !== "-" ? p.value : <span className="text-slate-400">-</span>),
      },
      {
        headerName: "INTERVAL",
        field: "interval_display",
        flex: 0.55,
        minWidth: 75,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center text-slate-700 text-[10px] font-medium",
        cellRenderer: (p) => (p.value && p.value !== "-" ? p.value : <span className="text-slate-400">-</span>),
      },
      {
        headerName: "REMIND BEFORE",
        field: "remind_before_display",
        flex: 0.65,
        minWidth: 95,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center text-slate-700 text-[10px] font-medium",
        cellRenderer: (p) => (p.value && p.value !== "-" ? p.value : <span className="text-slate-400">-</span>),
      },
      {
        headerName: "LAST DATE",
        field: "maintenance_date",
        flex: 0.65,
        minWidth: 85,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center text-slate-600 text-[10px]",
        cellRenderer: (p) => (p.value && p.value !== "-" ? p.value : <span className="text-slate-400">-</span>),
      },
      {
        headerName: "NEXT DUE DATE",
        field: "next_maintenance_date",
        flex: 0.7,
        minWidth: 90,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center text-slate-600 text-[10px]",
        cellRenderer: (p) => (p.value && p.value !== "-" ? p.value : <span className="text-slate-400">-</span>),
      },
      {
        headerName: "REMAINING DAYS",
        field: "remaining_days_display",
        flex: 0.75,
        minWidth: 100,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center text-[10px]",
        cellRenderer: (p) => {
          const val = String(p.value || "");
          if (!val || val === "-") return <span className="text-slate-400">-</span>;
          const status = p.data?.remaining_days_status;
          const isOverdue = val.toLowerCase().includes("overdue") || status === "overdue";
          const isDueToday = val.toLowerCase().includes("today") || status === "due";
          const isRemind =
            status === "remind" ||
            status === "upcoming" ||
            (p.data?.remaining_days != null &&
              Number(p.data.remaining_days) > 0 &&
              Number(p.data.remaining_days) <= Number(p.data?.remind_before_days || 3));

          let colorClass = "text-emerald-600 font-medium";
          if (isOverdue || isDueToday) {
            colorClass = "text-rose-600 font-bold";
          } else if (isRemind) {
            colorClass = "text-amber-500 font-semibold";
          }

          return <span className={colorClass}>{val}</span>;
        },
      },
      {
        headerName: "REMARKS",
        field: "remarks",
        flex: 1.1,
        minWidth: 120,
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
      persistKey="periodic_maintenance_report_grid"
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
      loadingText="Refreshing periodic maintenance..."
      containerClassName="w-full min-w-full h-[70vh] relative rounded-lg overflow-hidden shadow-xs border border-gray-200 bg-white"
      pageSize={20}
      pageSizeSelector={[20, 40, 60, 100]}
      emptyTitle="No Periodic Maintenance Records Found"
      emptyDescription="There are no periodic maintenance records recorded yet."
      getRowId={(params) =>
        params.data?.id?.toString() ||
        params.data?.sno?.toString() ||
        Math.random().toString()
      }
    />
  );
};

export default React.memo(PeriodicMaintenanceTable);
