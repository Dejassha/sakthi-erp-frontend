import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Tooltip, Modal, Input, message } from "antd";
import { Icon } from "@iconify/react";
import ReusableTable from "@/components/ReusableComponents/ReusableTable";
import { useDeleteBreakdownMaintenanceMutation } from "@/store/services/admin.api";
import { formatDisplayDate, formatDowntime, calculateMeanTime } from "../utils";

const BreakdownMaintenanceTable = ({
  rowData = [],
  loading = false,
  isAdmin = false,
  onUpdateMaintenance,
  onView,
  onEdit,
  onDeleteSuccess,
  onGridReady,
  persistKey = "breakdown_maintenance_grid",
  ...restProps
}) => {
  const [deleteRecord] = useDeleteBreakdownMaintenanceMutation();
  const user = useSelector((state) => state.auth?.user);
  const username =
    user?.username ||
    user?.first_name ||
    user?.email ||
    "Admin";

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteRemarks, setDeleteRemarks] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenDeleteModal = (record) => {
    setRecordToDelete(record);
    setDeleteRemarks("");
    setDeleteError("");
    setDeleteModalVisible(true);
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setDeleteModalVisible(false);
    setRecordToDelete(null);
    setDeleteRemarks("");
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete?.id) return;
    const trimmed = deleteRemarks.trim();
    if (!trimmed) {
      setDeleteError("Remarks / reason is mandatory to delete this record.");
      return;
    }
    setIsDeleting(true);
    try {
      await deleteRecord({
        id: recordToDelete.id,
        deleted_by: username,
        remarks: trimmed,
      }).unwrap();
      message.success("Breakdown maintenance record deleted successfully");
      handleCloseDeleteModal();
      onDeleteSuccess?.();
    } catch (err) {
      message.error(
        err?.data?.message || "Failed to delete breakdown maintenance record",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
      minWidth: 80,
    }),
    [],
  );

  const columnDefs = useMemo(
    () => [
      {
        headerName: "SL.NO",
        field: "sno",
        flex: 0.35,
        minWidth: 40,
        filter: false,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center !text-center",
        cellRenderer: (p) => (
          <span className="font-semibold text-slate-600 text-[10px]">
            {p.value}
          </span>
        ),
      },
      {
        headerName: "RECORD NUMBER",
        field: "record_number",
        flex: 0.7,
        minWidth: 70,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-700 font-medium text-[10px]",
        cellRenderer: (params) => {
          const val =
            params.value ||
            (params.data?.id
              ? `BM-${String(params.data.id).padStart(4, "0")}`
              : "-");
          return (
            <span className="font-mono font-semibold text-slate-700">
              {val}
            </span>
          );
        },
      },
      {
        headerName: "BREAKDOWN DATE",
        field: "breakdown_date",
        flex: 0.6,
        minWidth: 80,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-600 text-[10px]",
        valueFormatter: (params) => formatDisplayDate(params.value),
      },
      {
        headerName: "MACHINE NAME",
        field: "machine_name",
        flex: 0.8,
        minWidth: 100,
        wrapText: true,
        autoHeight: true,
        headerClass: "!text-left !justify-start pl-1",
        cellClass:
          "!text-left !justify-start !pl-1 font-semibold text-slate-800 text-[10px] uppercase py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (params) => (
          <span className="whitespace-normal break-words leading-relaxed block">
            {params.value || "-"}
          </span>
        ),
      },
      {
        headerName: "OPERATOR NAME",
        field: "operator_name",
        flex: 1.0,
        minWidth: 110,
        wrapText: true,
        autoHeight: true,
        headerClass: "!text-left !justify-start pl-1",
        cellClass:
          "!text-left !justify-start !pl-1 font-medium text-slate-700 text-[10px] uppercase py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (params) => (
          <span className="whitespace-normal break-words leading-relaxed block">
            {params.value || "-"}
          </span>
        ),
      },
      {
        headerName: "TOTAL DOWNTIME",
        field: "total_downtime_hours",
        flex: 0.7,
        minWidth: 70,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-amber-700 text-[10px] font-semibold",
        cellRenderer: (params) => {
          const formatted = formatDowntime(params.value);
          return (
            <span className="font-semibold text-amber-700">{formatted}</span>
          );
        },
      },
      {
        headerName: "MEAN TIME",
        field: "mean_time",
        flex: 0.5,
        minWidth: 150,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-700 text-[10px] font-medium",
        cellRenderer: (params) => {
          const val =
            params.value ||
            (params.data ? calculateMeanTime(params.data, rowData) : "0");
          return (
            <span className="font-medium text-slate-700">
              {val || "0"}
            </span>
          );
        },
      },
      {
        headerName: "STATUS",
        field: "status",
        flex: 0.6,
        minWidth: 60,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (params) => {
          const isClosed = Boolean(
            params.data?.status === "CLOSED" ||
            params.data?.status === "COMPLETED" ||
            params.data?.restart_time ||
            params.data?.maintenance_complete_time,
          );
          const badgeStyle = isClosed
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-amber-50 text-amber-700 border-amber-200";
          return (
            <span
              className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider leading-none whitespace-nowrap border ${badgeStyle}`}
            >
              {isClosed ? "CLOSED" : "OPEN"}
            </span>
          );
        },
      },
      {
        headerName: "CREATED BY",
        field: "created_by",
        flex: 0.65,
        minWidth: 80,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (params) => (
          <span className="whitespace-normal break-words leading-relaxed text-center text-slate-600 text-[10px]">
            {params.value ? String(params.value).toUpperCase() : "-"}
          </span>
        ),
      },
      {
        headerName: "REMARKS",
        field: "remarks",
        flex: 1.0,
        minWidth: 100,
        wrapText: true,
        autoHeight: true,
        headerClass: "!text-left !justify-start pl-2",
        cellClass:
          "!text-left !justify-start !pl-2 text-slate-700 text-[10px] py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (params) => (
          <span className="whitespace-normal break-words leading-relaxed block">
            {params.value || "-"}
          </span>
        ),
      },
      {
        headerName: "ACTION",
        width: isAdmin ? 90 : 75,
        minWidth: isAdmin ? 90 : 75,
        sortable: false,
        filter: false,
        pinned: "right",
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-end",
        cellRenderer: (params) => {
          const isClosed = Boolean(
            params.data?.status === "CLOSED" ||
            params.data?.status === "COMPLETED" ||
            params.data?.restart_time ||
            params.data?.maintenance_complete_time,
          );
          return (
            <div className="flex items-center justify-center gap-1.5 h-full pr-2">
              {!isClosed && (
                <Tooltip title="Update Maintenance">
                  <button
                    type="button"
                    className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer flex items-center justify-center"
                    onClick={() => onUpdateMaintenance?.(params.data)}
                  >
                    <Icon icon="lucide:wrench" className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              )}
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
                      onClick={() => handleOpenDeleteModal(params.data)}
                    >
                      <Icon icon="lucide:trash-2" className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [isAdmin, onUpdateMaintenance, onView, onEdit, rowData],
  );

  return (
    <>
      <ReusableTable
        persistKey={persistKey}
        columnDefs={columnDefs}
        rowData={rowData}
        rowModelType="clientSide"
        loading={loading}
        loadingText="Loading breakdown maintenance data..."
        defaultColDef={defaultColDef}
        containerClassName="w-full min-w-full h-[70vh] relative rounded-lg overflow-hidden shadow-xs border border-gray-200 bg-white"
        pageSize={20}
        pageSizeSelector={[20, 40, 60, 100]}
        emptyTitle="No Breakdown Records"
        emptyDescription="There are no breakdown maintenance records to display."
        onGridReady={onGridReady}
        getRowId={(params) =>
          params.data?.id?.toString() ||
          params.data?.sno?.toString() ||
          Math.random().toString()
        }
        {...restProps}
      />

      <Modal
        title={
          <div className="flex items-center gap-2 text-rose-600">
            <Icon icon="lucide:alert-triangle" className="w-4 h-4 text-rose-500" />
            <span className="font-semibold text-xs uppercase tracking-wide">Delete Breakdown Record</span>
          </div>
        }
        open={deleteModalVisible}
        onCancel={handleCloseDeleteModal}
        onOk={handleConfirmDelete}
        confirmLoading={isDeleting}
        okText="Delete Record"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        destroyOnClose
        centered
        width={460}
      >
        <div className="py-2 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to delete this breakdown maintenance record? This action cannot be undone.
          </p>

          {recordToDelete && (
            <div className="bg-slate-50 border border-slate-200/80 rounded p-2.5 text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Record Number:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {recordToDelete.record_number || `BM-${recordToDelete.id}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Machine:</span>
                <span className="font-semibold text-slate-800">
                  {recordToDelete.machine_name || recordToDelete.machine || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Breakdown Date:</span>
                <span className="font-semibold text-slate-800">
                  {formatDisplayDate(recordToDelete.breakdown_date)}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Remarks for Deletion <span className="text-rose-500 font-bold">*</span>
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Enter mandatory remarks or reason for deleting this record..."
              value={deleteRemarks}
              onChange={(e) => {
                const upperVal = (e.target.value || "").toUpperCase();
                setDeleteRemarks(upperVal);
                if (deleteError && upperVal.trim()) {
                  setDeleteError("");
                }
              }}
              status={deleteError ? "error" : ""}
              className="!text-xs"
            />
            {deleteError && (
              <p className="text-[11px] text-rose-500 mt-1 font-medium">{deleteError}</p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default React.memo(BreakdownMaintenanceTable);
