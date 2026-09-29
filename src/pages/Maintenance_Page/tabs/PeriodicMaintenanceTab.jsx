import { useMemo, useEffect, useState, useCallback } from "react";
import { message } from "antd";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import Button from "@/components/ReusableComponents/Button";
import { useGetMachinesQuery } from "@/store/services/admin.api";
import {
  PeriodicMaintenanceFormWrapper,
  PeriodicMaintenanceTable,
  CompleteMaintenanceModal,
} from "../MaintenanceComponents";

const PeriodicMaintenanceTab = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const action = searchParams.get("action");
  const recordId = searchParams.get("id");

  const { user } = useAuth();
  const isAdmin =
    user?.isAdmin ||
    user?.is_admin ||
    user?.is_superuser ||
    user?.role === "admin" ||
    (Array.isArray(user?.roles) && user.roles.includes("admin"));

  const username =
    user?.username ||
    user?.name ||
    user?.user_name ||
    user?.first_name ||
    user?.email ||
    "ADMIN";

  const [messageApi, contextHolder] = message.useMessage();

  const {
    data: machines = [],
    isLoading: loadingMachines,
    isFetching: fetchingMachines,
    isError: machineError,
    refetch,
  } = useGetMachinesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const handleOpenCompleteModal = useCallback((row) => {
    setSelectedSchedule(row);
    setCompleteModalOpen(true);
  }, []);

  const handleCloseCompleteModal = useCallback(() => {
    setCompleteModalOpen(false);
    if (action === "complete_schedule") {
      setSearchParams({}, { replace: true });
    }
  }, [action, setSearchParams]);

  const handleCompleteSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!action) {
      refetch();
    }
  }, [action, refetch]);

  useEffect(() => {
    if (machineError)
      messageApi.error("Failed to load machine maintenance details.");
  }, [machineError, messageApi]);

  const rowData = useMemo(() => {
    const rawRows = [];
    machines.forEach((machine) => {
      const schedules = machine.maintenance_schedules || [];
      schedules.forEach((schedule) => {
        rawRows.push({
          id: schedule.id,
          machineId: machine.id,
          machine_name: machine.machine_name,
          maintenance_name: schedule.maintenance_name,
          maintenance_needs: schedule.maintenance_needs,
          supervised_by: schedule.supervised_by,
          interval_days: schedule.interval_days,
          remind_before_days: schedule.remind_before_days ?? 3,
          maintenance_date: schedule.last_maintenance_date,
          next_maintenance_date: schedule.next_maintenance_date,
          remaining_days: schedule.remaining_days,
          remaining_days_display: schedule.remaining_days_display,
          remaining_days_status: schedule.remaining_days_status,
          status: schedule.status,
          created_by: schedule.created_by || machine.created_by,
          created_at: schedule.created_at,
        });
      });
    });

    // Sort by id descending (newly created schedules appear on top)
    rawRows.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

    return rawRows.map((row, idx) => ({
      ...row,
      sno: idx + 1,
    }));
  }, [machines]);

  const loading = loadingMachines || fetchingMachines;

  const activeRow = useMemo(() => {
    if (!recordId) return null;
    return rowData.find((r) => String(r.id) === String(recordId)) || null;
  }, [rowData, recordId]);

  useEffect(() => {
    if (action === "complete_schedule" && recordId && rowData.length > 0) {
      const match = rowData.find((r) => String(r.id) === String(recordId));
      if (match) {
        handleOpenCompleteModal(match);
      }
    }
  }, [action, recordId, rowData, handleOpenCompleteModal]);

  const handleBackToList = () => {
    setSearchParams({}, { replace: true });
  };

  const handleOpenAddForm = () => {
    setSearchParams({ action: "add_schedule" });
  };

  const handleOpenEditForm = useCallback(
    (rowId) => {
      setSearchParams({ action: "edit_schedule", id: String(rowId) });
    },
    [setSearchParams],
  );

  const handleOpenViewForm = useCallback(
    (rowId) => {
      setSearchParams({ action: "view_schedule", id: String(rowId) });
    },
    [setSearchParams],
  );

  const isFormAction =
    action === "add_schedule" ||
    action === "edit_schedule" ||
    action === "view_schedule";

  if (isFormAction) {
    return (
      <PeriodicMaintenanceFormWrapper
        action={action}
        item={activeRow}
        machines={machines}
        onBack={handleBackToList}
        onSuccess={refetch}
        onOpenEdit={handleOpenEditForm}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="">
      {contextHolder}

      <div className="flex justify-end gap-2 mb-3">
        <Button
          onClick={handleOpenAddForm}
          icon="lucide:plus"
          color="blue"
          size="xs"
        >
          Add Schedule
        </Button>
      </div>

      <PeriodicMaintenanceTable
        rowData={rowData}
        loading={loading}
        isAdmin={isAdmin}
        onComplete={handleOpenCompleteModal}
        onView={handleOpenViewForm}
        onEdit={handleOpenEditForm}
        onDeleteSuccess={refetch}
      />

      {/* COMPLETE MAINTENANCE GLOBAL MODAL */}
      <CompleteMaintenanceModal
        open={completeModalOpen}
        schedule={selectedSchedule}
        onClose={handleCloseCompleteModal}
        onSuccess={handleCompleteSuccess}
        username={username}
      />
    </div>
  );
};

export default PeriodicMaintenanceTab;
