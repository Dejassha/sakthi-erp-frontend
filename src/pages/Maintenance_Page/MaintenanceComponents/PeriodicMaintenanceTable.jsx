import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Tooltip, Modal, Input, message } from "antd";
import { Icon } from "@iconify/react";
import ReusableTable from "@/components/ReusableComponents/ReusableTable";
import { useDeleteMaintenanceScheduleMutation } from "@/store/services/admin.api";
import { isOverdue, getRemainingDaysColor } from "../utils";

const PeriodicMaintenanceTable = ({
  rowData = [],
  loading = false,
  isAdmin = false,
  onComplete,
  onView,
  onEdit,
  onDeleteSuccess,
  onGridReady,
  persistKey = "periodic_maintenance_grid",
  ...restProps
}) => {
  const [deleteMaintenanceSchedule] = useDeleteMaintenanceScheduleMutation();
  const user = useSelector((state) => state.auth?.user);
  const username =
    user?.username ||
    user?.first_name ||
    user?.email ||
    "Admin";

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [deleteRemarks, setDeleteRemarks] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenDeleteModal = (record) => {
    setScheduleToDelete(record);
    setDeleteRemarks("");
    setDeleteError("");
    setDeleteModalVisible(true);
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setDeleteModalVisible(false);
    setScheduleToDelete(null);
    setDeleteRemarks("");
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    if (!scheduleToDelete?.id) return;
    const trimmed = deleteRemarks.trim();
    if (!trimmed) {
      setDeleteError("Remarks / reason is mandatory to delete this maintenance schedule.");
      return;
    }
    setIsDeleting(true);
    try {
      await deleteMaintenanceSchedule({
        id: scheduleToDelete.id,
        deleted_by: username,
        remarks: trimmed.toUpperCase(),
      }).unwrap();
      message.success("Maintenance schedule deleted successfully");
      handleCloseDeleteModal();
      onDeleteSuccess?.();
    } catch (err) {
      message.error(
        err?.data?.message || err?.data?.error || "Failed to delete maintenance schedule",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columnDefs = useMemo(
    () => [
      {
        headerName: "SL.NO",
        field: "sno",
        flex: 0.25,
        minWidth: 20,
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
        headerName: "MACHINE NAME",
        field: "machine_name",
        flex: 0.85,
        minWidth: 120,
        wrapText: true,
        autoHeight: true,
        headerClass: "!text-left !justify-start pl-2",
        cellClass:
          "!text-left !justify-start !pl-1 font-semibold text-slate-800 text-[10px] uppercase whitespace-normal break-words leading-relaxed",
        cellRenderer: (p) => (
          <span className="whitespace-normal break-words leading-relaxed block">
            {p.value || "-"}
          </span>
        ),
      },
      {
        headerName: "SCHEDULE NAME",
        field: "maintenance_name",
        flex: 1.3,
        minWidth: 140,
        wrapText: true,
        autoHeight: true,
        headerClass: "!text-left !justify-start pl-2",
        cellClass:
          "!text-left !justify-start !pl-1 font-medium text-slate-700 text-[10px] uppercase whitespace-normal break-words leading-relaxed",
        cellRenderer: (p) => (
          <span className="whitespace-normal break-words leading-relaxed block">
            {p.value || "-"}
          </span>
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
        cellClass:
          "!text-left !justify-start !pl-1 font-medium text-slate-700 text-[10px] uppercase whitespace-normal break-words leading-relaxed",
        cellRenderer: (p) => (
          <span className="whitespace-normal break-words leading-relaxed block">
            {p.value || "-"}
          </span>
        ),
      },
      {
        headerName: "INTERVAL",
        field: "interval_days",
        flex: 0.45,
        minWidth: 70,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-700 font-medium text-[10px]",
        cellRenderer: (params) => `${params.value} DAYS`,
      },
      {
        headerName: "LAST MAINTENANCE",
        field: "maintenance_date",
        flex: 0.6,
        minWidth: 90,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-600 text-[10px]",
        cellRenderer: (params) => params.value || "-",
      },
      {
        headerName: "NEXT MAINTENANCE",
        field: "next_maintenance_date",
        flex: 0.6,
        minWidth: 85,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-[10px]",
        cellRenderer: (params) => {
          const date = params.value;
          if (!date) return <span className="text-gray-400">-</span>;
          const overdue = isOverdue(date);
          return (
            <span
              className={`font-semibold ${overdue ? "text-rose-600 font-bold" : "text-slate-800"}`}
            >
              {date}
            </span>
          );
        },
      },
      {
        headerName: "REMAINING DAYS",
        field: "remaining_days_display",
        flex: 0.65,
        minWidth: 100,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-[10px]",
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
        headerName: "CREATED BY",
        field: "created_by",
        flex: 0.55,
        minWidth: 75,
        headerClass: "ag-center-header",
        cellClass:
          "ag-center-cell !flex !items-center !justify-center text-slate-600 text-[10px]",
        cellRenderer: (params) =>
          params.value ? String(params.value).toUpperCase() : "-",
      },
      {
        headerName: "ACTION",
        width: isAdmin ? 105 : 75,
        minWidth: isAdmin ? 105 : 75,
        pinned: "right",
        sortable: false,
        filter: false,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-end !pr-3",
        cellRenderer: (params) => {
          const status = params.data?.remaining_days_status;
          const remDays = params.data?.remaining_days;
          const remindThreshold = Number(params.data?.remind_before_days || 3);
          const canComplete =
            status === "due" ||
            status === "overdue" ||
            status === "remind" ||
            status === "upcoming" ||
            isOverdue(params.data?.next_maintenance_date) ||
            (remDays != null && Number(remDays) <= remindThreshold);

          return (
            <div className="flex items-center justify-center gap-1.5 h-full">
              {canComplete && (
                <Tooltip title="Complete Maintenance">
                  <button
                    type="button"
                    className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer flex items-center justify-center"
                    onClick={() => onComplete?.(params.data)}
                  >
                    <Icon icon="lucide:check-circle-2" className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              )}
              <Tooltip title="View Details">
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer flex items-center justify-center"
                  onClick={() => onView?.(params.data.id)}
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
                      onClick={() => onEdit?.(params.data.id)}
                    >
                      <Icon icon="lucide:pencil" className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <button
                      type="button"
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer flex items-center justify-center p-1"
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
    [onComplete, onView, onEdit, isAdmin],
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
    <>
      <ReusableTable
        persistKey={persistKey}
        columnDefs={columnDefs}
        rowData={rowData}
        rowModelType="clientSide"
        loading={loading}
        loadingText="Loading periodic maintenance schedules..."
        defaultColDef={defaultColDef}
        containerClassName="w-full min-w-full h-[70vh] relative rounded-lg overflow-hidden shadow-xs border border-gray-200 bg-white"
        pageSize={20}
        pageSizeSelector={[20, 40, 60, 100]}
        emptyTitle="No Maintenance Schedules"
        emptyDescription="There are no periodic maintenance schedules to display."
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
            <span className="font-semibold text-xs uppercase tracking-wide">Delete Maintenance Schedule</span>
          </div>
        }
        open={deleteModalVisible}
        onCancel={handleCloseDeleteModal}
        onOk={handleConfirmDelete}
        confirmLoading={isDeleting}
        okText="Delete Schedule"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        destroyOnClose
        centered
        width={460}
      >
        <div className="py-2 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to delete this periodic maintenance schedule? This action cannot be undone.
          </p>

          {scheduleToDelete && (
            <div className="bg-slate-50 border border-slate-200/80 rounded p-2.5 text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Schedule Name:</span>
                <span className="font-bold text-slate-800 uppercase">
                  {scheduleToDelete.maintenance_name || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Machine:</span>
                <span className="font-semibold text-slate-800">
                  {scheduleToDelete.machine_name || scheduleToDelete.machine || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Next Due Date:</span>
                <span className="font-semibold text-slate-800">
                  {scheduleToDelete.next_maintenance_date || "-"}
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
              placeholder="Enter mandatory remarks or reason for deleting this schedule..."
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

export default React.memo(PeriodicMaintenanceTable);
