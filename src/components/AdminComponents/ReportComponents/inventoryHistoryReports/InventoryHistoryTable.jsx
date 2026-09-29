import React, { useMemo } from "react";
import ReusableTable from "@/components/ReusableComponents/ReusableTable";

const InventoryHistoryTable = ({
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
        cellClass:
          "ag-center-cell !p-0 !text-center flex !items-center !justify-center",
      },
      {
        headerName: "SL.NO",
        field: "sno",
        flex: 0.35,
        minWidth: 50,
        filter: false,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (p) => (
          <span className="font-semibold text-slate-600 text-[10px]">
            {p.value}
          </span>
        ),
      },
      {
        headerName: "DATE",
        field: "created_date",
        flex: 0.6,
        minWidth: 85,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-600 text-[10px]",
      },
      {
        headerName: "TIME",
        field: "created_time",
        flex: 0.55,
        minWidth: 75,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-600 text-[10px]",
      },
      {
        headerName: "SPARE ID",
        field: "spare_id",
        flex: 0.5,
        minWidth: 85,
        wrapText: true,
        autoHeight: true,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-700 font-medium text-[10px] !px-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (params) => {
          const val =
            params.value ||
            (params.data?.part_id
              ? `SP-${String(params.data.part_id).padStart(3, "0")}`
              : "-");
          return (
            <span className="whitespace-normal break-words leading-relaxed text-center">
              {val}
            </span>
          );
        },
      },
      {
        headerName: "ITEM CODE",
        field: "item_code",
        flex: 0.5,
        minWidth: 85,
        wrapText: true,
        autoHeight: true,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-700 font-medium text-[10px] !px-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (params) => (
          <span className="whitespace-normal break-words leading-relaxed text-center">
            {params.value || "-"}
          </span>
        ),
      },
      {
        headerName: "ITEM NAME",
        field: "part_name",
        flex: 1.5,
        minWidth: 160,
        wrapText: true,
        autoHeight: true,
        headerClass: "!text-left !justify-start pl-2",
        cellClass:
          "!text-left !justify-start !px-1 font-semibold text-slate-800 text-[10px] py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (p) => (
          <span className="whitespace-normal break-words leading-relaxed block">
            {p.value || "-"}
          </span>
        ),
      },
      {
        headerName: "BATCH NO",
        field: "batch_number",
        flex: 0.8,
        minWidth: 100,
        wrapText: true,
        autoHeight: true,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-[10px] font-mono",
        cellRenderer: (p) => {
          const val = p.value || "-";
          if (!p.value || p.value === "-") {
            return <span className="text-slate-400">-</span>;
          }
          return (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[8px] font-semibold tracking-wider leading-none whitespace-nowrap border bg-blue-50 text-blue-700 border-blue-200">
              {val}
            </span>
          );
        },
      },
      {
        headerName: "ACTION",
        field: "action",
        flex: 0.75,
        minWidth: 90,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (params) => {
          const val = String(params.value || "").toUpperCase();
          let badgeStyle = "bg-slate-50 text-slate-700 border-slate-200";
          if (val.includes("ADD")) {
            badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
          } else if (val.includes("USE")) {
            badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
          } else if (val.includes("DEL")) {
            badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
          } else if (val.includes("UPDATE")) {
            badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
          } else if (val.includes("EDIT")) {
            badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
          }
          return (
            <span
              className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider leading-none whitespace-nowrap border ${badgeStyle}`}
            >
              {val || "-"}
            </span>
          );
        },
      },
      {
        headerName: "QTY",
        field: "quantity",
        flex: 0.6,
        minWidth: 80,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-800 text-[10px] font-semibold",
        valueFormatter: (params) =>
          params.value != null
            ? Number(params.value).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
      },
      {
        headerName: "AVAILABLE QTY",
        field: "available_quantity",
        flex: 0.6,
        minWidth: 85,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-800 text-[10px] font-semibold",
        cellRenderer: (params) => {
          if (params.value == null && params.data?.available_quantity == null)
            return "-";
          const qty = params.value ?? params.data?.available_quantity ?? 0;
          const unit = (params.data?.unit || "pcs").toLowerCase();
          return `${qty} ${unit}`;
        },
      },
      {
        headerName: "MIN QTY",
        field: "min_stock_quantity",
        flex: 0.45,
        minWidth: 65,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-600 text-[10px] font-medium",
        cellRenderer: (params) =>
          params.value != null ? params.value : "-",
      },
      {
        headerName: "RATE/QTY",
        field: "purchase_price",
        flex: 0.75,
        minWidth: 85,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-700 text-[10px]",
        valueFormatter: (params) =>
          params.value != null && params.value !== ""
            ? `₹${Number(params.value).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            : "N/A",
      },
      {
        headerName: "STATUS",
        field: "status",
        flex: 0.6,
        minWidth: 85,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (params) => {
          const val = String(
            params.value || params.data?.status || "",
          ).toLowerCase();
          if (!val || val === "-")
            return <span className="text-slate-400">-</span>;
          let badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
          let label = "IN STOCK";
          if (val === "out_of_stock") {
            badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
            label = "OUT OF STOCK";
          } else if (val === "low_stock") {
            badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
            label = "LOW STOCK";
          }
          return (
            <span
              className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider leading-none whitespace-nowrap border ${badgeStyle}`}
            >
              {label}
            </span>
          );
        },
      },
      {
        headerName: "MACHINE NAME",
        field: "machine_name",
        flex: 1,
        minWidth: 110,
        wrapText: true,
        autoHeight: true,
        headerClass: "!text-left !justify-start pl-2",
        cellClass:
          "!text-left !justify-start !px-1 font-medium text-slate-700 text-[10px] uppercase py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (params) => (
          <span className="whitespace-normal break-words leading-relaxed block">
            {params.value || "Others"}
          </span>
        ),
      },
      {
        headerName: "USER",
        field: "user",
        flex: 0.65,
        minWidth: 80,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (p) => (
          <span className="whitespace-normal break-words leading-relaxed text-center">
            {p.value || "-"}
          </span>
        ),
      },
      {
        headerName: "REMARKS",
        field: "remarks",
        flex: 1.4,
        minWidth: 150,
        wrapText: true,
        autoHeight: true,
        headerClass: "!text-left !justify-start pl-2",
        cellClass:
          "!text-left !justify-start !px-1 text-slate-600 text-[10px] py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (p) =>
          p.value && p.value !== "-" ? (
            <span className="whitespace-normal break-words leading-relaxed block">
              {p.value}
            </span>
          ) : (
            <span className="text-slate-400">-</span>
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
      persistKey="inventory_history_report_grid"
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
      loadingText="Refreshing inventory history..."
      containerClassName="w-full min-w-full h-[70vh] relative rounded-lg overflow-hidden shadow-xs border border-gray-200 bg-white"
      pageSize={20}
      pageSizeSelector={[20, 40, 60, 100]}
      emptyTitle="No Inventory Records Found"
      emptyDescription="There are no inventory history items recorded yet."
      getRowId={(params) =>
        params.data?.id?.toString() ||
        params.data?.sno?.toString() ||
        Math.random().toString()
      }
    />
  );
};

export default React.memo(InventoryHistoryTable);
