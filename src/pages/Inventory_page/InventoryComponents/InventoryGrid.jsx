import React, { useMemo } from "react";
import { Tooltip } from "antd";
import { Icon } from "@iconify/react";
import ReusableTable from "@/components/ReusableComponents/ReusableTable";

export const InventoryGrid = ({
  rowData = [],
  isLoading = false,
  persistKey = "inventory_grid",
  isAdmin = false,
  onAddQty,
  onView,
  onEdit,
  onDelete,
  ...restProps
}) => {
  const columnDefs = useMemo(
    () => [
      {
        headerName: "S.NO",
        field: "sno",
        flex: 0.35,
        minWidth: 35,
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
            (params.data?.id
              ? `SP-${String(params.data.id).padStart(3, "0")}`
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
        cellRenderer: (params) => {
          const val =
            params.data?.item_name ||
            params.data?.part_name ||
            params.value ||
            "";
          return (
            <span className="whitespace-normal break-words leading-relaxed block">
              {val || "-"}
            </span>
          );
        },
      },
      {
        headerName: "AVAILABLE QTY",
        field: "available_quantity",
        flex: 0.55,
        minWidth: 75,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-800 text-[10px] font-semibold",
        cellRenderer: (params) => {
          const qty = params.value ?? 0;
          const unit = (params.data?.unit || "pcs").toLowerCase();
          return (
            <span className="font-bold text-slate-800">
              {qty} {unit}
            </span>
          );
        },
      },
      {
        headerName: "BATCHES",
        field: "batches",
        flex: 0.65,
        minWidth: 85,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-center",
        cellRenderer: (params) => {
          const allBatches =
            params.data?.group_parts && params.data.group_parts.length > 0
              ? params.data.group_parts
              : params.data
              ? [params.data]
              : [];
          const count = allBatches.length;
          if (count === 0) return <span className="text-slate-400 text-[10px]">-</span>;

          const tooltipContent = (
            <div className="text-[11px] p-1 max-w-xs">
              <div className="font-bold border-b border-slate-600 pb-1 mb-1 text-slate-200">
                {count} {count === 1 ? "Batch" : "Batches"} Breakdown:
              </div>
              {allBatches.map((b, idx) => (
                <div key={b.id || idx} className="flex justify-between gap-3 py-0.5">
                  <span className="font-semibold text-blue-300">
                    {b.batch_number || `BAT-${String(idx + 1).padStart(2, "0")}`}:
                  </span>
                  <span>
                    {b.available_quantity ?? 0} / {b.stock_quantity ?? 0} {params.data?.unit || "PCS"}
                  </span>
                </div>
              ))}
            </div>
          );

          return (
            <Tooltip title={tooltipContent} placement="top">
              <div className="flex items-center justify-center gap-1 flex-wrap cursor-pointer">
                {allBatches.slice(0, 2).map((b, idx) => (
                  <span
                    key={b.id || idx}
                    className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap"
                  >
                    {b.batch_number || `BAT-${String(idx + 1).padStart(2, "0")}`}
                  </span>
                ))}
                {count > 2 && (
                  <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    +{count - 2}
                  </span>
                )}
              </div>
            </Tooltip>
          );
        },
      },
      {
        headerName: "MIN QTY",
        field: "min_stock_quantity",
        flex: 0.45,
        minWidth: 45,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-600 text-[10px] font-medium",
        cellRenderer: (params) => params.value ?? 0,
      },
      {
        headerName: "RATE/QTY",
        field: "purchase_price",
        flex: 0.6,
        minWidth: 70,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-700 text-[10px] font-medium",
        cellRenderer: (params) => {
          const rate = Number(params.value || 0);
          return rate
            ? `₹${rate.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
            : "N/A";
        },
      },
      {
        headerName: "STATUS",
        field: "status",
        flex: 0.6,
        minWidth: 85,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (params) => {
          const val = String(params.value || "").toLowerCase();
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
        headerName: "ACTION",
        flex: 0.6,
        width: 95,
        minWidth: 95,
        sortable: false,
        filter: false,
        pinned: "right",
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (params) => (
          <div className="flex items-center justify-center gap-1.5 h-full">
            <Tooltip title="Add Quantity">
              <button
                type="button"
                className=" text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer flex items-center justify-center"
                onClick={() => onAddQty?.(params.data)}
              >
                <Icon icon="lucide:plus-circle" className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip title="View Details">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer flex items-center justify-center"
                onClick={() => onView?.(params.data)}
              >
                <Icon icon="lucide:eye" className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            {isAdmin && (
              <>
                <Tooltip title="Edit">
                  <button
                    type="button"
                    className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer flex items-center justify-center"
                    onClick={() => onEdit?.(params.data)}
                  >
                    <Icon icon="lucide:pencil" className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                <Tooltip title="Delete">
                  <button
                    type="button"
                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer flex items-center justify-center"
                    onClick={() => onDelete?.(params.data)}
                  >
                    <Icon icon="lucide:trash-2" className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        ),
      },
    ],
    [isAdmin, onAddQty, onView, onEdit, onDelete],
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
      persistKey={persistKey}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      rowData={rowData}
      rowModelType="clientSide"
      loading={isLoading}
      loadingText="Loading inventory data..."
      containerClassName="w-full min-w-full h-[70vh] relative rounded-lg overflow-hidden shadow-xs border border-gray-200 bg-white"
      pageSize={20}
      pageSizeSelector={[20, 40, 60, 100]}
      emptyTitle="No Records Found"
      emptyDescription="There are no inventory items to display."
      getRowId={(params) =>
        params.data?.id?.toString() ||
        params.data?.sno?.toString() ||
        Math.random().toString()
      }
      {...restProps}
    />
  );
};

export default React.memo(InventoryGrid);

