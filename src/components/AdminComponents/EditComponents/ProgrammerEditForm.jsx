  import React, { useEffect, useState, useMemo } from "react";
import {
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  message,
  Typography,
  Empty,
} from "antd";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { useUpdateProgramerDetailsMutation } from "@/store/services/programer.api";
import { useAuth } from "@/context/useAuth";

import PageHeader from "@/components/ReusableComponents/PageHeader";
import GlobalButton from "@/components/ReusableComponents/Button";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import StyledFormItem, {
  INPUT_CLASS,
  DATE_PICKER_CLASS,
  DISABLE_INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";

const preventInvalidNumberInput = (e) => {
  if (["e", "E", "+", "-"].includes(e.key)) {
    e.preventDefault();
  }
};
const { Title, Text } = Typography;
const ProgrammerEditForm = ({ onBack, initialMaterials }) => {
  const [form] = Form.useForm();
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [confirmValues, setConfirmValues] = useState(null);
  const { user } = useAuth();
  const materials = useMemo(() => {
    if (initialMaterials) return initialMaterials;
    return [];
  }, [initialMaterials]);
  const filteredMaterials = useMemo(() => {
    return materials.filter((mat) => mat.programer_status === "completed");
  }, [materials]);
  // Auto-select if there's only one material available
  useEffect(() => {
    if (filteredMaterials.length === 1 && !selectedMaterialId) {
      setSelectedMaterialId(filteredMaterials[0].id ?? null);
    }
  }, [filteredMaterials, selectedMaterialId]);
  // 2. Extract nested Programmer data for the selected material
  const currentProgData = useMemo(() => {
    if (!selectedMaterialId || !initialMaterials) return null;
    const mat = initialMaterials.find((item) => item.id === selectedMaterialId);
    return mat?.programer_details?.[0] || null;
  }, [initialMaterials, selectedMaterialId]);
  const [updateProgramerDetails, { isLoading: isUpdating }] =
    useUpdateProgramerDetailsMutation();
  // Set form values when data is loaded
  useEffect(() => {
    if (currentProgData) {
      const details = { ...currentProgData };
      // Strip dangling zeros from Django decimal payloads by explicitly converting string numbers to JS Numbers
      Object.keys(details).forEach((key) => {
        if (
          typeof details[key] === "string" &&
          /^\d+\.\d+$/.test(details[key])
        ) {
          details[key] = Number(details[key]);
        }
      });
      form.setFieldsValue({
        ...details,
        program_date: details.program_date ? dayjs(details.program_date) : null,
        total_planned_hours: details.total_planned_hours
          ? dayjs(details.total_planned_hours, ["HH:mm:ss", "HH:mm"])
          : null,
      });
    } else if (selectedMaterialId) {
      // Delay reset slightly to ensure the conditional <Form> component has mounted
      requestAnimationFrame(() => {
        form.resetFields();
      });
    }
  }, [currentProgData, form, selectedMaterialId]);
  const toNum = (v) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };
  const round3 = (v) => Math.round(v * 1e3) / 1e3;
  const validateNonNegative = (_, value) => {
    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      Number(value) <= 0
    ) {
      return Promise.reject(new Error("Cannot be negative and zero"));
    }
    return Promise.resolve();
  };
  const validateProcessedQty = (_, value) => {
    if (
      !selectedMaterialId ||
      value === null ||
      value === undefined ||
      value === ""
    )
      return Promise.resolve();
    const selectedMat = initialMaterials?.find(
      (m) => m.id === selectedMaterialId,
    );
    if (!selectedMat) return Promise.resolve();
    const availableQty = toNum(selectedMat.quantity);
    if (toNum(value) > availableQty) {
      return Promise.reject(
        new Error(`cannot exceed available quantity (${availableQty})`),
      );
    }
    return Promise.resolve();
  };
  const handleValuesChange = (changed, all) => {
    const name = Object.keys(changed)[0];
    if (!selectedMaterialId) return;
    const selectedMat = initialMaterials?.find(
      (m) => m.id === selectedMaterialId,
    );
    if (!selectedMat) return;
    const processedQty = toNum(all.processed_quantity);
    const minsPerSheet = toNum(all.processed_mins_per_sheet);
    const cutLength = toNum(all.cut_length_per_sheet);
    const piercePerSheet = toNum(all.pierce_per_sheet);
    const usedWeight = toNum(all.used_weight);
    const numSheets = toNum(all.number_of_sheets);
    // Totals
    const totalMinutes = Math.round(processedQty * minsPerSheet);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalPlannedHoursStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    const totalPlannedHours = dayjs(totalPlannedHoursStr, "HH:mm");
    const totalMeters = round3(
      processedQty < 1 ? cutLength : processedQty * cutLength,
    );
    const totalPiercing = round3(processedQty * piercePerSheet);
    const totalWeight = round3(processedQty * usedWeight);
    const totalNoSheets = round3(processedQty * numSheets);
    const updates = {
      total_planned_hours: totalPlannedHours,
      total_meters: totalMeters,
      total_piercing: totalPiercing,
      total_used_weight: totalWeight,
      total_no_of_sheets: totalNoSheets,
    };
    if (name === "processed_quantity") {
      const availableQty = toNum(selectedMat.quantity);
      updates.balance_quantity = Math.max(
        0,
        round3(availableQty - processedQty),
      );
    }
    // Dynamic recalculation of remaining dimensions
    const processedW = toNum(all.processed_width);
    const processedL = toNum(all.processed_length);
    const totalW = round3(
      toNum(selectedMat.width) * toNum(selectedMat.quantity),
    );
    updates.remaining_width = Math.max(
      0,
      round3(totalW - processedW * processedQty),
    );
    const totalL = round3(
      toNum(selectedMat.length) * toNum(selectedMat.quantity),
    );
    updates.remaining_length = Math.max(
      0,
      round3(totalL - processedL * processedQty),
    );
    form.setFieldsValue(updates);
  };
  const handleUpdate = async (values) => {
    if (!selectedMaterialId) return;
    try {
      // 1. Sanitize the payload: convert empty numeric strings to 0 or appropriate defaults
      const sanitizedValues = { ...values };
      const numericFields = [
        "processed_quantity",
        "processed_width",
        "processed_length",
        "used_weight",
        "number_of_sheets",
        "cut_length_per_sheet",
        "pierce_per_sheet",
        "processed_mins_per_sheet",
        "balance_quantity",
        "remaining_width",
        "remaining_length",
        "total_used_weight",
        "total_no_of_sheets",
        "total_meters",
        "total_piercing",
      ];
      numericFields.forEach((field) => {
        if (
          sanitizedValues[field] === "" ||
          sanitizedValues[field] === undefined ||
          sanitizedValues[field] === null
        ) {
          sanitizedValues[field] = 0;
        }
      });
      const payload = {
        material_id: selectedMaterialId,
        ...sanitizedValues,
        program_date: values.program_date
          ? dayjs(values.program_date).format("YYYY-MM-DD")
          : null,
        total_planned_hours: values.total_planned_hours
          ? dayjs(values.total_planned_hours).format("HH:mm:ss")
          : null,
        created_by: user?.username,
      };
      await updateProgramerDetails({ body: payload }).unwrap();
      message.success("Programmer details updated successfully");
    } catch (err) {
      console.error("Update failed:", err);
      const errorMsg =
        err?.data?.error ||
        err?.data?.message ||
        "Failed to update programmer details";
      message.error(
        typeof errorMsg === "string"
          ? errorMsg
          : "Check all fields for correct values",
      );
    }
  };
  return (
    <div className="bg-white">
      <div className="">
        <div className="pb-2">
          <PageHeader
            title="Programmer Update"
            actions={
              <div className="flex gap-2">
                <GlobalButton
                  type="button"
                  color="cancel"
                  onClick={onBack}
                  icon="lucide:arrow-left"
                >
                  Back
                </GlobalButton>
                {selectedMaterialId !== null ? (
                  <GlobalButton
                    type="submit"
                    color="blue"
                    disabled={isUpdating}
                    onClick={() => form.submit()}
                    icon="lucide:save"
                  >
                    Update Program
                  </GlobalButton>
                ) : null}
              </div>
            }
          />
        </div>

        <div className="mb-6 bg-gray-50 rounded-lg border border-gray-200 shadow-sm p-3">
          <Text strong className="block mb-2 text-gray-700">
            Select Material to Edit
          </Text>
          <Select
            placeholder="Choose a material from this product"
            className="w-full"
            value={selectedMaterialId}
            onChange={(val) => {
              setSelectedMaterialId(val);
              form.resetFields();
            }}
          >
            {filteredMaterials.map((mat) => (
              <Select.Option key={mat.id} value={mat.id} className="!text-xs">
                {`MT-${mat.mat_type} / G-${mat.mat_grade} / T-${mat.thick} / W-${mat.width} / L-${mat.length} / Qty-${mat.quantity}`}
              </Select.Option>
            ))}
          </Select>
        </div>

        {!selectedMaterialId ? (
          <Empty
            description="Please select a material above to start editing"
            className="my-10"
          />
        ) : (
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
            onFinish={(values) => setConfirmValues(values)}
            className="bg-white space-y-3 xl:space-y-0"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-3 pb-2 border-b border-gray-100">
              <StyledFormItem
                name="program_no"
                label="Program No"
                rules={[{ required: true, message: "Required" }]}
                normalize={(val) =>
                  val ? String(val).toUpperCase().replace(/[^A-Z0-9\-_.,]/g, "") : ""
                }
                className="mb-0"
              >
                <Input
                  placeholder="PRG-NO"
                  className={`${INPUT_CLASS} uppercase font-medium`}
                />
              </StyledFormItem>

              <StyledFormItem
                name="program_date"
                label="Program Date"
                rules={[{ required: true, message: "Required" }]}
                className="mb-0"
              >
                <DatePicker className={DATE_PICKER_CLASS} />
              </StyledFormItem>

              <StyledFormItem
                name="processed_quantity"
                label="Processed Qty"
                rules={[
                  { required: true, message: "Required" },
                  { validator: validateNonNegative },
                  { validator: validateProcessedQty },
                ]}
                className="mb-0"
              >
                <Input
                  type="number"
                  placeholder="0"
                  className={INPUT_CLASS}
                  onKeyDown={preventInvalidNumberInput}
                />
              </StyledFormItem>

              <StyledFormItem
                name="balance_quantity"
                label="Balance Qty"
                className="mb-0"
              >
                <Input readOnly tabIndex={-1} className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`} />
              </StyledFormItem>

              <StyledFormItem
                name="processed_width"
                label="Processed Width"
                rules={[
                  { required: true, message: "Required" },
                  { validator: validateNonNegative },
                ]}
                className="mb-0"
              >
                <Input
                  type="number"
                  placeholder="Width"
                  className={INPUT_CLASS}
                  onKeyDown={preventInvalidNumberInput}
                />
              </StyledFormItem>

              <StyledFormItem
                name="processed_length"
                label="Processed Length"
                rules={[
                  { required: true, message: "Required" },
                  { validator: validateNonNegative },
                ]}
                className="mb-0"
              >
                <Input
                  type="number"
                  placeholder="Length"
                  className={INPUT_CLASS}
                  onKeyDown={preventInvalidNumberInput}
                />
              </StyledFormItem>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-3 pt-2 pb-2 border-b border-gray-100">
              <StyledFormItem
                name="remaining_width"
                label="Remaining Width"
                className="mb-0"
              >
                <Input readOnly tabIndex={-1} className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`} />
              </StyledFormItem>

              <StyledFormItem
                name="remaining_length"
                label="Remaining Length"
                className="mb-0"
              >
                <Input readOnly tabIndex={-1} className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`} />
              </StyledFormItem>

              <StyledFormItem
                name="used_weight"
                label="Used Weight (Kg)"
                rules={[
                  { required: true, message: "Required" },
                  { validator: validateNonNegative },
                ]}
                className="mb-0"
              >
                <Input
                  type="number"
                  placeholder="0"
                  className={INPUT_CLASS}
                  onKeyDown={preventInvalidNumberInput}
                />
              </StyledFormItem>

              <StyledFormItem
                name="total_used_weight"
                label="Total Used Weight"
                className="mb-0"
              >
                <Input readOnly tabIndex={-1} className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`} />
              </StyledFormItem>

              <StyledFormItem
                name="number_of_sheets"
                label="Number Of Sheets"
                rules={[
                  { required: true, message: "Required" },
                  { validator: validateNonNegative },
                ]}
                className="mb-0"
              >
                <Input
                  type="number"
                  placeholder="0"
                  className={INPUT_CLASS}
                  onKeyDown={preventInvalidNumberInput}
                />
              </StyledFormItem>

              <StyledFormItem
                name="total_no_of_sheets"
                label="Total No Of Sheets"
                className="mb-0"
              >
                <Input readOnly tabIndex={-1} className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`} />
              </StyledFormItem>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-3 pt-2 pb-2 border-b border-gray-100">
              <StyledFormItem
                name="cut_length_per_sheet"
                label="Cut Length / Sheet"
                rules={[
                  { required: true, message: "Required" },
                  { validator: validateNonNegative },
                ]}
                className="mb-0"
              >
                <Input
                  type="number"
                  placeholder="0"
                  className={INPUT_CLASS}
                  onKeyDown={preventInvalidNumberInput}
                />
              </StyledFormItem>

              <StyledFormItem
                name="total_meters"
                label="Total Meters"
                className="mb-0"
              >
                <Input readOnly tabIndex={-1} className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`} />
              </StyledFormItem>

              <StyledFormItem
                name="pierce_per_sheet"
                label="Pierce / Sheet"
                rules={[
                  { required: true, message: "Required" },
                  { validator: validateNonNegative },
                ]}
                className="mb-0"
              >
                <Input
                  type="number"
                  placeholder="0"
                  className={INPUT_CLASS}
                  onKeyDown={preventInvalidNumberInput}
                />
              </StyledFormItem>

              <StyledFormItem
                name="total_piercing"
                label="Total Piercing"
                className="mb-0"
              >
                <Input readOnly tabIndex={-1} className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`} />
              </StyledFormItem>

              <StyledFormItem
                name="processed_mins_per_sheet"
                label="Processed Mins / Sheet"
                rules={[
                  { required: true, message: "Required" },
                  { validator: validateNonNegative },
                ]}
                className="mb-0"
              >
                <Input
                  type="number"
                  placeholder="0"
                  className={INPUT_CLASS}
                  onKeyDown={preventInvalidNumberInput}
                />
              </StyledFormItem>

              <StyledFormItem
                name="total_planned_hours"
                label="Total Planned Hours"
                className="mb-0"
              >
                <TimePicker
                  className={`${DATE_PICKER_CLASS} !bg-gray-100 !text-slate-800 font-bold cursor-not-allowed`}
                  format="HH:mm"
                  disabled
                  suffixIcon={null}
                />
              </StyledFormItem>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-3 pt-2">
              <div className="col-span-1 sm:col-span-2">
                <StyledFormItem name="remarks" label="Remarks" className="mb-0">
                  <Input placeholder="Enter optional remarks" className={INPUT_CLASS} />
                </StyledFormItem>
              </div>
            </div>
          </Form>
        )}
      </div>

      <GlobalModal
        open={!!confirmValues}
        title="Confirm Programmer Update"
        description="Are you sure you want to permanently update the Programmer details for this material?"
        onCancel={() => setConfirmValues(null)}
        onConfirm={() => {
          handleUpdate(confirmValues);
          setConfirmValues(null);
        }}
        confirmText="Update Details"
        cancelText="Cancel"
      />
    </div>
  );
};
export default ProgrammerEditForm;
