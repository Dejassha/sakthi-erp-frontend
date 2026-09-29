import React from "react";
import { Form, message } from "antd";
import dayjs from "dayjs";
import { useAuth } from "@/context/useAuth";
import {
  useAddMaintenanceScheduleMutation,
  useUpdateMaintenanceScheduleMutation,
} from "@/store/services/admin.api";
import Button from "@/components/ReusableComponents/Button";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import PeriodicMaintenanceForm from "./PeriodicMaintenanceForm";

const PeriodicMaintenanceFormWrapper = ({
  action,
  item = null,
  machines = [],
  onBack,
  onSuccess,
  onOpenEdit,
  isAdmin = false,
}) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [addMaintenanceSchedule, { isLoading: isAdding }] =
    useAddMaintenanceScheduleMutation();
  const [updateMaintenanceSchedule, { isLoading: isUpdating }] =
    useUpdateMaintenanceScheduleMutation();

  const isView = action === "view_schedule";
  const isEdit = action === "edit_schedule";
  const isAdd = action === "add_schedule";
  const isLoading = isAdding || isUpdating;

  const handleSaveSchedule = async (values) => {
    try {
      if (isAdd) {
        if (!values.machineId) {
          message.error("Please select a machine");
          return;
        }
        await addMaintenanceSchedule({
          machine_id: values.machineId,
          maintenance_name: values.maintenanceName,
          supervised_by: values.supervisedBy || undefined,
          maintenance_needs: values.maintenanceNeeds,
          interval_days: values.intervalDays,
          remind_before_days: Number(values.remindBeforeDays || 3),
          last_maintenance_date: values.lastDate
            ? dayjs(values.lastDate).format("YYYY-MM-DD")
            : undefined,
          next_maintenance_date: values.nextDate
            ? dayjs(values.nextDate).format("YYYY-MM-DD")
            : undefined,
          created_by:
            user?.username ||
            user?.name ||
            user?.user_name ||
            user?.first_name ||
            user?.email ||
            "ADMIN",
        }).unwrap();
        message.success("Maintenance schedule created successfully");
      } else if (isEdit && item?.id) {
        await updateMaintenanceSchedule({
          id: item.id,
          body: {
            machine_id: values.machineId,
            maintenance_name: values.maintenanceName,
            supervised_by: values.supervisedBy || null,
            maintenance_needs: values.maintenanceNeeds,
            interval_days: values.intervalDays,
            remind_before_days: Number(values.remindBeforeDays || 3),
            last_maintenance_date: values.lastDate
              ? dayjs(values.lastDate).format("YYYY-MM-DD")
              : null,
            next_maintenance_date: values.nextDate
              ? dayjs(values.nextDate).format("YYYY-MM-DD")
              : null,
            updated_by:
              user?.username ||
              user?.name ||
              user?.user_name ||
              user?.first_name ||
              user?.email ||
              "ADMIN",
          },
        }).unwrap();
        message.success("Maintenance schedule updated");
      }
      await onSuccess?.();
      onBack?.();
    } catch {
      message.error("Failed to save maintenance schedule.");
    }
  };

  const mode = isView ? "view" : isEdit ? "edit" : "add";

  return (
    <div className="w-full">
      <PageHeader
        title={
          isView
            ? "View Maintenance Schedule"
            : isEdit
              ? "Edit Maintenance Schedule"
              : "Add Maintenance Schedule"
        }
        onBack={onBack}
        actions={
          <div className="flex items-center gap-3">
            <Button color="cancel" onClick={onBack} icon="lucide:arrow-left">
              {isView ? "Close" : "Cancel"}
            </Button>
            {isView && isAdmin && item?.id && onOpenEdit && (
              <Button
                color="blue"
                onClick={() => onOpenEdit(item.id)}
                icon="lucide:pencil"
              >
                Edit Schedule
              </Button>
            )}
            {!isView && (
              <Button
                color="blue"
                onClick={() => form.submit()}
                loading={isLoading}
                icon={isEdit ? "lucide:save" : "lucide:plus"}
              >
                {isEdit ? "Update Schedule" : "Save Schedule"}
              </Button>
            )}
          </div>
        }
      />

      <PeriodicMaintenanceForm
        mode={mode}
        item={item}
        form={form}
        machines={machines}
        onFinish={handleSaveSchedule}
      />
    </div>
  );
};

export default React.memo(PeriodicMaintenanceFormWrapper);
