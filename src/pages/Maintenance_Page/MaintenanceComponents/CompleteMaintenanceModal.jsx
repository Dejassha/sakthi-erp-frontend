import React, { useEffect } from "react";
import { Form, Input, DatePicker, message } from "antd";
import dayjs from "dayjs";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import StyledFormItem, {
  INPUT_CLASS,
  TEXTAREA_CLASS,
  DATE_PICKER_CLASS,
  DISABLE_INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";
import { useAuth } from "@/context/useAuth";
import { useApproveMaintenanceMutation } from "@/store/services/admin.api";

const CompleteMaintenanceModal = ({
  open = false,
  schedule = null,
  onClose,
  onSuccess,
  username,
}) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [approveMaintenance, { isLoading }] = useApproveMaintenanceMutation();
  const activeUsername =
    username ||
    user?.username ||
    user?.name ||
    user?.user_name ||
    user?.first_name ||
    "ADMIN";

  useEffect(() => {
    if (open && schedule) {
      form.setFieldsValue({
        machine_name: schedule.machine_name,
        maintenance_name: schedule.maintenance_name,
        maintenance_date: dayjs(),
        remarks: "",
      });
    } else {
      form.resetFields();
    }
  }, [open, schedule, form]);

  const handleFinish = async (values) => {
    if (!schedule?.id) return;
    const trimmedRemarks = (values.remarks || "").trim().toUpperCase();
    if (!trimmedRemarks) {
      message.error("Remarks are required to complete maintenance.");
      return;
    }

    try {
      await approveMaintenance({
        schedule_id: schedule.id,
        approved_by: activeUsername,
        maintenance_date: dayjs(values.maintenance_date).format("YYYY-MM-DD"),
        remarks: trimmedRemarks,
      }).unwrap();
      message.success("Maintenance marked as completed!");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      message.error(err?.data?.message || "Failed to complete maintenance.");
    }
  };

  return (
    <GlobalModal
      open={open}
      title="Complete Maintenance"
      onCancel={onClose}
      onConfirm={() => form.submit()}
      confirmText="Complete & Set Next"
      cancelText="Cancel"
      confirmColor="blue"
      cancelColor="cancel"
      confirmIcon="lucide:check"
      cancelIcon="lucide:x"
      loading={isLoading}
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        className="space-y-1 py-1"
      >
        <p className="text-[11px] text-gray-500 mb-2">
          Record maintenance completion date and mandatory service notes.
        </p>

        {/* Row 1: Machine Name & Schedule Name (2 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <StyledFormItem label="Machine Name" name="machine_name">
            <Input className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`} disabled />
          </StyledFormItem>

          <StyledFormItem label="Schedule Name" name="maintenance_name">
            <Input className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`} disabled />
          </StyledFormItem>
        </div>

        {/* Row 2: Maintenance Performed Date */}
        <StyledFormItem
          label="Maintenance Performed Date"
          name="maintenance_date"
          required
          rules={[{ required: true, message: "Please select maintenance performed date" }]}
        >
          <DatePicker
            className={DATE_PICKER_CLASS}
            format="YYYY-MM-DD"
            disabledDate={(current) => current && current > dayjs().endOf("day")}
          />
        </StyledFormItem>

        {/* Row 3: Remarks (Mandatory) */}
        <StyledFormItem
          label="Remarks / Completion Notes"
          name="remarks"
          normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
          required
          rules={[
            {
              required: true,
              whitespace: true,
              message: "Please enter completion remarks",
            },
          ]}
        >
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 6 }}
            className={TEXTAREA_CLASS}
            placeholder="Enter maintenance details, actions performed, observations, etc..."
          />
        </StyledFormItem>
      </Form>
    </GlobalModal>
  );
};

export default React.memo(CompleteMaintenanceModal);
