import React, { useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import {
  useGetBreakdownMaintenanceQuery,
  useGetMachinesQuery,
} from "@/store/services/admin.api";
import GlobalButton from "@/components/ReusableComponents/Button";
import {
  BreakdownMaintenanceFormWrapper,
  BreakdownMaintenanceTable,
} from "../MaintenanceComponents";

const BreakdownMaintenanceTab = () => {
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

  const {
    data: records = [],
    isLoading,
    refetch,
  } = useGetBreakdownMaintenanceQuery(undefined);
  const { data: machines = [] } = useGetMachinesQuery(undefined);

  const machineOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    machines.forEach((m) => {
      const name = m.machine_name;
      if (!name || seen.has(name)) return;
      seen.add(name);
      opts.push({ label: name, value: m.id });
    });
    return opts;
  }, [machines]);

  const memoizedRecords = useMemo(() => {
    const seen = new Set();
    const unique = [];
    records.forEach((record) => {
      const key = record.id ? `id-${record.id}` : record.record_number ? `rn-${record.record_number}` : null;
      if (key && seen.has(key)) return;
      if (key) seen.add(key);
      unique.push(record);
    });
    return unique.map((record, idx) => ({ ...record, sno: idx + 1 }));
  }, [records]);

  const activeRecord = useMemo(() => {
    if (!recordId) return null;
    return records.find((r) => String(r.id) === String(recordId)) || null;
  }, [records, recordId]);

  const handleBackToList = useCallback(() => {
    setSearchParams({ tab: "breakdown" }, { replace: true });
  }, [setSearchParams]);

  const openAddForm = () => {
    setSearchParams({ tab: "breakdown", action: "add_breakdown" });
  };

  const openEditForm = useCallback(
    (item) => {
      setSearchParams({ tab: "breakdown", action: "edit_breakdown", id: item.id });
    },
    [setSearchParams],
  );

  const openViewForm = useCallback(
    (item) => {
      setSearchParams({ tab: "breakdown", action: "view_breakdown", id: item.id });
    },
    [setSearchParams],
  );

  const openMaintenanceUpdateForm = useCallback(
    (item) => {
      setSearchParams({
        tab: "breakdown",
        action: "update_maintenance",
        id: item.id,
      });
    },
    [setSearchParams],
  );

  // Full-page form view
  if (action) {
    return (
      <BreakdownMaintenanceFormWrapper
        action={action}
        item={activeRecord}
        machineOptions={machineOptions}
        allRecords={records}
        onBack={handleBackToList}
        onSuccess={refetch}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-3">
        <GlobalButton
          onClick={openAddForm}
          icon="lucide:plus"
          color="blue"
          size="xs"
        >
          Add Breakdown Record
        </GlobalButton>
      </div>

      <BreakdownMaintenanceTable
        rowData={memoizedRecords}
        loading={isLoading}
        isAdmin={isAdmin}
        onUpdateMaintenance={openMaintenanceUpdateForm}
        onView={openViewForm}
        onEdit={openEditForm}
        onDeleteSuccess={refetch}
      />
    </>
  );
};

export default BreakdownMaintenanceTab;
