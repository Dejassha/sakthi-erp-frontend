import React from "react";
import { Form, message } from "antd";
import { useAuth } from "@/context/useAuth";
import {
  useAddBreakdownMaintenanceMutation,
  useUpdateBreakdownMaintenanceMutation,
} from "@/store/services/admin.api";
import Button from "@/components/ReusableComponents/Button";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import BreakdownForm from "./BreakdownForm";
import {
  buildBreakdownPayload,
  buildMaintenanceOnlyPayload,
} from "../utils";

const BreakdownMaintenanceFormWrapper = ({
  action,
  item = null,
  machineOptions = [],
  allRecords = [],
  onBack,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const username =
    user?.username ||
    user?.name ||
    user?.user_name ||
    user?.first_name ||
    user?.email ||
    "ADMIN";

  const [addRecord, { isLoading: isAdding }] =
    useAddBreakdownMaintenanceMutation();
  const [updateRecord, { isLoading: isUpdating }] =
    useUpdateBreakdownMaintenanceMutation();

  const isView = action === "view_breakdown";
  const isEdit = action === "edit_breakdown";
  const isMaintenanceOnly = action === "update_maintenance";
  const isLoading = isAdding || isUpdating;

  const mode = isView
    ? "view"
    : isEdit
      ? "edit"
      : isMaintenanceOnly
        ? "maintenance_update"
        : "add";

  const extractError = (err, fallback) => {
    if (err?.data?.message) return err.data.message;
    if (err?.data?.breakdown_complete_date) {
      return Array.isArray(err.data.breakdown_complete_date)
        ? err.data.breakdown_complete_date[0]
        : err.data.breakdown_complete_date;
    }
    if (err?.data && typeof err.data === "object") {
      const firstKey = Object.keys(err.data)[0];
      if (firstKey && err.data[firstKey]) {
        const val = err.data[firstKey];
        return Array.isArray(val) ? val[0] : String(val);
      }
    }
    return fallback;
  };

  const handleAddRecord = async (values) => {
    try {
      await addRecord(buildBreakdownPayload(values, username, "CREATED")).unwrap();
      message.success("Breakdown maintenance record added");
      onSuccess?.();
      onBack?.();
    } catch (err) {
      if (err.errorFields) return;
      message.error(
        extractError(err, "Failed to add breakdown maintenance record"),
      );
    }
  };

  const handleUpdateRecord = async (values) => {
    if (!item?.id) return;
    try {
      await updateRecord({
        id: item.id,
        body: buildBreakdownPayload(values, username, "EDITED"),
      }).unwrap();
      message.success("Breakdown maintenance record updated");
      onSuccess?.();
      onBack?.();
    } catch (err) {
      if (err.errorFields) return;
      message.error(
        extractError(err, "Failed to update breakdown maintenance record"),
      );
    }
  };

  const handleMaintenanceUpdateRecord = async (values) => {
    if (!item?.id) return;
    try {
      await updateRecord({
        id: item.id,
        body: buildMaintenanceOnlyPayload(values, item, username, "UPDATED"),
      }).unwrap();
      message.success("Maintenance details updated");
      onSuccess?.();
      onBack?.();
    } catch (err) {
      if (err.errorFields) return;
      message.error(
        extractError(err, "Failed to update maintenance details"),
      );
    }
  };

  const handleFinish = (values) => {
    if (isMaintenanceOnly) {
      return handleMaintenanceUpdateRecord(values);
    }
    if (isEdit) {
      return handleUpdateRecord(values);
    }
    if (action === "add_breakdown") {
      return handleAddRecord(values);
    }
  };

  const getPageTitle = () => {
    if (isView) return "View Breakdown Record";
    if (isMaintenanceOnly) return "Update Maintenance Details";
    if (isEdit) return "Edit Breakdown Record";
    return "Log Breakdown Maintenance";
  };

  return (
    <div className="w-full">
      <PageHeader
        title={getPageTitle()}
        onBack={onBack}
        actions={
          <div className="flex items-center gap-3">
            <Button color="cancel" onClick={onBack} icon="lucide:arrow-left">
              {isView ? "Close" : "Cancel"}
            </Button>
            {!isView && (
              <Button
                color="blue"
                onClick={() => form.submit()}
                loading={isLoading}
                disabled={isLoading}
                icon={isEdit || isMaintenanceOnly ? "lucide:save" : "lucide:plus"}
              >
                {isMaintenanceOnly
                  ? "Update Maintenance"
                  : isEdit
                    ? "Update Record"
                    : "Save Record"}
              </Button>
            )}
          </div>
        }
      />

      <BreakdownForm
        mode={mode}
        item={item}
        form={form}
        machineOptions={machineOptions}
        allRecords={allRecords}
        onFinish={handleFinish}
      />
    </div>
  );
};

export default React.memo(BreakdownMaintenanceFormWrapper);
