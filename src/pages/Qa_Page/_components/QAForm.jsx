import React, { useMemo, forwardRef, useImperativeHandle } from "react";
import dayjs from "dayjs";
// antd
import { Form, Select, DatePicker, message } from "antd";
// Logic Hook & RTK Query
import { useQaFormLogic } from "@/pages/Qa_Page/utils/qaFormLogic";
import { useGetGasDetailsQuery } from "@/store/services/admin.api";
// Reusable Components
import StyledFormItem, {
  SELECT_CLASS,
  DATE_PICKER_CLASS,
} from "@/components/ReusableComponents/FormItem";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import QAMachineSection from "./QAMachineSection";

const QaForm = forwardRef(({ product, onBack, onSuccess }, ref) => {
  const {
    form,
    companyName,
    machineTimes,
    formErrors,
    showConfirm,
    setShowConfirm,
    isSubmitting,
    machines,
    operators,
    pendingMaterials,
    toggleMachine,
    updateMachineField,
    handleSubmit,
    validateForm,
  } = useQaFormLogic(product, onBack, onSuccess);

  useImperativeHandle(ref, () => ({
    submit: () => {
      const machineError = validateForm();
      if (machineError) {
        message.error(machineError);
      } else {
        setShowConfirm(true);
      }
    },
    isSubmitting,
  }));

  const { data: gasList = [] } = useGetGasDetailsQuery(undefined);
  const gasOptions = useMemo(() => {
    return gasList.length > 0
      ? gasList.map((g) => ({ label: g.name, value: g.name }))
      : [{ label: "Air", value: "Air" }];
  }, [gasList]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-200">
      <GlobalModal
        open={showConfirm}
        title="Confirm Submission"
        description={`Are you sure you want to submit QA details for ${companyName}?`}
        onConfirm={handleSubmit}
        onCancel={() => setShowConfirm(false)}
        confirmText="Confirm"
        cancelText="Cancel"
        loading={isSubmitting}
        confirmColor="blue"
        cancelColor="cancel"
      />

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          processed_date: dayjs(),
        }}
      >
        {/* RESPONSIVE TOP FORM GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2 sm:gap-x-4">
          <StyledFormItem
            name="material_details"
            label="Material Selection"
            rules={[{ required: true, message: "Please select a material" }]}
            className="mb-0"
          >
            <Select
              placeholder="Select Material"
              className={SELECT_CLASS}
              options={pendingMaterials.map((mat) => ({
                key: mat.id,
                value: mat.id?.toString(),
                label: `MT- ${mat.mat_type} / T- ${Number(mat.thick || 0)}mm / W- ${Number(mat.width || 0)}mm / L- ${Number(mat.length || 0)}mm / Qty- ${Number(mat.quantity || 0)}`,
              }))}
            />
          </StyledFormItem>

          <StyledFormItem
            name="processed_date"
            label="Processed Date"
            rules={[{ required: true, message: "Please select a date" }]}
            className="mb-0"
          >
            <DatePicker
              className={DATE_PICKER_CLASS}
              allowClear={false}
              format="DD-MM-YYYY"
            />
          </StyledFormItem>

          <StyledFormItem
            name="shift"
            label="Shift"
            rules={[{ required: true, message: "Please select a shift" }]}
            className="mb-0"
          >
            <Select
              placeholder="Select Shift"
              className={SELECT_CLASS}
              options={[
                { label: "0", value: "0" },
                { label: "1", value: "1" },
                { label: "2", value: "2" },
              ]}
            />
          </StyledFormItem>
        </div>

        {/* STANDALONE MACHINE SELECTION & LOGS SECTION */}
        <QAMachineSection
          machines={machines}
          machineTimes={machineTimes}
          operators={operators}
          gasOptions={gasOptions}
          formErrors={formErrors}
          toggleMachine={toggleMachine}
          updateMachineField={updateMachineField}
        />
      </Form>
    </div>
  );
});

QaForm.displayName = "QaForm";

export default QaForm;
