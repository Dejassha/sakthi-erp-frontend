import React, { useEffect, useMemo } from "react";
import { Form, Input, Select, AutoComplete, DatePicker, TimePicker } from "antd";
import dayjs from "dayjs";
import StyledFormItem, {
  INPUT_CLASS,
  SELECT_CLASS,
  DATE_PICKER_CLASS,
  DISABLE_INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";
import {
  useGetOperatorsQuery,
  useGetInventoryPartNamesQuery,
} from "@/store/services/admin.api";
import {
  useBreakdownCalculations,
  parseTimeValue,
  formatDowntime,
} from "../utils";

const SHIFT_OPTIONS = [
  { label: "0", value: "0" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
];

const PREDEFINED_BREAKDOWN_TYPES = [
  "ELECTRICAL",
  "MECHANICAL",
  "GAS PRESSURE",
  "HYDRAULIC",
  "SOFTWARE",
  "PNEUMATIC",
];

const BreakdownForm = ({
  mode = "add", // "add" | "create" | "edit" | "view" | "maintenance_update"
  item = null,
  form,
  machineOptions = [],
  allRecords = [],
  onFinish,
}) => {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isMaintenanceOnly = mode === "maintenance_update";

  const { data: operatorData = [] } = useGetOperatorsQuery(undefined);
  const { data: dbPartNames = [] } = useGetInventoryPartNamesQuery(undefined);

  // AutoComplete Options for Operator / Supervisor
  const operatorOptions = useMemo(() => {
    const set = new Set();
    const opts = [];
    operatorData.forEach((op) => {
      const name = (op.operator_name || "").trim().toUpperCase();
      if (name && !set.has(name)) {
        set.add(name);
        opts.push({ label: name, value: name });
      }
    });
    return opts;
  }, [operatorData]);

  // AutoComplete Options for Equipment
  const equipmentOptions = useMemo(() => {
    const set = new Set();
    const opts = [];
    dbPartNames.forEach((p) => {
      const name = (p.item_name || p.part_name || "").trim().toUpperCase();
      if (name && !set.has(name)) {
        set.add(name);
        opts.push({ label: name, value: name });
      }
    });
    return opts;
  }, [dbPartNames]);

  // AutoComplete Options for Breakdown Type
  const breakdownTypeOptions = useMemo(() => {
    return PREDEFINED_BREAKDOWN_TYPES.map((t) => ({ label: t, value: t }));
  }, []);

  const watchedBreakdownDate = Form.useWatch("breakdown_date", form);

  // Form field calculations & downtime/mean-time derived values
  const {
    totalDowntimeHours,
    maintenanceHours,
    meanTimeDisplay,
    showMaintenanceFields,
  } = useBreakdownCalculations({
    form,
    item,
    allRecords,
    mode,
  });

  useEffect(() => {
    if (item) {
      form.setFieldsValue({
        record_number: item.record_number || "",
        breakdown_date: item.breakdown_date ? dayjs(item.breakdown_date) : null,
        shift: item.shift || undefined,
        machine: item.machine ?? undefined,
        affected_equipment: item.affected_equipment
          ? item.affected_equipment.toUpperCase()
          : undefined,
        operator_name: item.operator_name
          ? item.operator_name.toUpperCase()
          : undefined,
        supervisor: item.supervisor ? item.supervisor.toUpperCase() : undefined,
        breakdown_time: parseTimeValue(item.breakdown_time),
        breakdown_type: item.breakdown_type
          ? item.breakdown_type.toUpperCase()
          : undefined,
        remarks: item.remarks ? item.remarks.toUpperCase() : "",
        maintenance_start_time: parseTimeValue(item.maintenance_start_time),
        maintenance_complete_time: parseTimeValue(item.maintenance_complete_time),
        restart_time: parseTimeValue(item.restart_time),
        breakdown_complete_date: item.breakdown_complete_date
          ? dayjs(item.breakdown_complete_date)
          : null,
        total_downtime_hours: item.total_downtime_hours ?? 0,
      });
    } else {
      form.resetFields();
      let maxNum = 0;
      allRecords.forEach((r) => {
        if (r.id && Number(r.id) > maxNum) maxNum = Number(r.id);
        if (r.record_number) {
          const match = String(r.record_number).match(/BM-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      });
      const nextRecordNumber = `BM-${String(maxNum + 1).padStart(4, "0")}`;

      form.setFieldsValue({
        total_downtime_hours: 0,
        breakdown_date: dayjs(),
        record_number: nextRecordNumber,
        remarks: "",
      });
    }
  }, [item, form, allRecords]);

  const machineSelectOptions = useMemo(
    () => machineOptions.filter((option) => option.value !== null),
    [machineOptions],
  );

  const isFieldDisabled = isMaintenanceOnly || isView;

  return (
    <div className="w-full">
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        {/* Section 1: Breakdown Details (Fields while creating up to Breakdown Type) */}
        <div className="bg-white rounded-sm border border-slate-200/80 shadow-xs p-4 mb-3">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <span className="w-1.5 h-3.5 bg-blue-600 rounded-full" />
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Breakdown Details
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-2">
            {/* Record Number */}
            <StyledFormItem
              name="record_number"
              label="Record Number"
              normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
              rules={[
                { required: true, message: "Enter record number" },
                {
                  validator: (_, val) => {
                    if (!val) return Promise.resolve();
                    const trimmed = String(val).trim().toUpperCase();
                    const isDuplicate = allRecords.some(
                      (rec) =>
                        rec.record_number &&
                        rec.record_number.trim().toUpperCase() === trimmed &&
                        (!item || String(rec.id) !== String(item.id)),
                    );
                    if (isDuplicate) {
                      return Promise.reject(
                        new Error("Record number already exists!"),
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder="Enter Record Number"
                disabled={isFieldDisabled}
                className={`${INPUT_CLASS} ${isFieldDisabled ? DISABLE_INPUT_CLASS : ""}`}
              />
            </StyledFormItem>

            {/* Breakdown Date */}
            <StyledFormItem
              name="breakdown_date"
              label="Breakdown Date"
              rules={[{ required: true, message: "Select breakdown date" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="YYYY-MM-DD"
                disabled={isFieldDisabled}
                className={`${DATE_PICKER_CLASS} ${isFieldDisabled ? DISABLE_INPUT_CLASS : ""}`}
              />
            </StyledFormItem>

            {/* Shift */}
            <StyledFormItem
              name="shift"
              label="Shift"
              rules={[{ required: true, message: "Select shift" }]}
            >
              <Select
                placeholder="Select shift"
                options={SHIFT_OPTIONS}
                disabled={isFieldDisabled}
                className={`${SELECT_CLASS} ${isFieldDisabled ? DISABLE_INPUT_CLASS : ""}`}
              />
            </StyledFormItem>

            {/* Machine Name */}
            <StyledFormItem
              name="machine"
              label="Machine Name"
              rules={[{ required: true, message: "Select machine name" }]}
            >
              <Select
                placeholder="Select machine"
                options={machineSelectOptions}
                showSearch={{ optionFilterProp: "label" }}
                disabled={isFieldDisabled}
                className={`${SELECT_CLASS} ${isFieldDisabled ? DISABLE_INPUT_CLASS : ""}`}
              />
            </StyledFormItem>

            {/* Affected Equipment */}
            <StyledFormItem
              name="affected_equipment"
              label="Affected Equipment"
              normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
              rules={[{ required: true, message: "Select or type affected equipment" }]}
            >
              <AutoComplete
                options={equipmentOptions}
                placeholder="Select or type affected equipment..."
                filterOption={(inputValue, option) =>
                  (option?.value || "")
                    .toUpperCase()
                    .indexOf(inputValue.toUpperCase()) !== -1
                }
                disabled={isFieldDisabled}
                className={`${INPUT_CLASS} ${isFieldDisabled ? DISABLE_INPUT_CLASS : ""}`}
              />
            </StyledFormItem>

            {/* Operator Name */}
            <StyledFormItem
              name="operator_name"
              label="Operator Name"
              normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
              rules={[{ required: true, message: "Enter or select operator name" }]}
            >
              <AutoComplete
                options={operatorOptions}
                placeholder="Enter or select operator name..."
                filterOption={(inputValue, option) =>
                  (option?.value || "")
                    .toUpperCase()
                    .indexOf(inputValue.toUpperCase()) !== -1
                }
                disabled={isFieldDisabled}
                className={`${INPUT_CLASS} ${isFieldDisabled ? DISABLE_INPUT_CLASS : ""}`}
              />
            </StyledFormItem>

            {/* Supervisor */}
            <StyledFormItem
              name="supervisor"
              label="Supervisor"
              normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
              rules={[{ required: true, message: "Enter or select supervisor name" }]}
            >
              <AutoComplete
                options={operatorOptions}
                placeholder="Enter or select supervisor name..."
                filterOption={(inputValue, option) =>
                  (option?.value || "")
                    .toUpperCase()
                    .indexOf(inputValue.toUpperCase()) !== -1
                }
                disabled={isFieldDisabled}
                className={`${INPUT_CLASS} ${isFieldDisabled ? DISABLE_INPUT_CLASS : ""}`}
              />
            </StyledFormItem>

            {/* Breakdown Time */}
            <StyledFormItem
              name="breakdown_time"
              label="Breakdown Time"
              rules={[{ required: true, message: "Select breakdown time" }]}
            >
              <TimePicker
                style={{ width: "100%" }}
                format="hh:mm A"
                use12Hours
                needConfirm={false}
                disabled={isFieldDisabled}
                className={`${DATE_PICKER_CLASS} ${isFieldDisabled ? DISABLE_INPUT_CLASS : ""}`}
              />
            </StyledFormItem>

            {/* Breakdown Type */}
            <StyledFormItem
              name="breakdown_type"
              label="Breakdown Type"
              normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
              rules={[{ required: true, message: "Select or type breakdown type" }]}
            >
              <AutoComplete
                options={breakdownTypeOptions}
                placeholder="Enter or select breakdown type..."
                filterOption={(inputValue, option) =>
                  (option?.value || "")
                    .toUpperCase()
                    .indexOf(inputValue.toUpperCase()) !== -1
                }
                disabled={isView}
                className={`${INPUT_CLASS} ${isView ? DISABLE_INPUT_CLASS : ""}`}
              />
            </StyledFormItem>

            {/* Remarks */}
            <StyledFormItem
              name="remarks"
              label="Remarks"
              normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
              rules={[
                { required: true, message: "Enter remarks" },
                {
                  validator: (_, val) => {
                    if (!val || !val.trim()) {
                      return Promise.reject(new Error("Remarks cannot be empty"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder="Enter remarks..."
                disabled={isView}
                className={`${INPUT_CLASS} ${isView ? DISABLE_INPUT_CLASS : ""}`}
              />
            </StyledFormItem>
          </div>
        </div>

        {/* Section 2: Maintenance & Resolution Details (Fields while updating/viewing) */}
        {showMaintenanceFields && (
          <div className="bg-white rounded-sm border border-slate-200/80 shadow-xs p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <span className="w-1.5 h-3.5 bg-emerald-600 rounded-full" />
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Maintenance & Resolution Details
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-2">
              {/* Maintenance Start Time */}
              <StyledFormItem
                name="maintenance_start_time"
                label="Maintenance Start Time"
                rules={[{ required: isMaintenanceOnly, message: "Select maintenance start time" }]}
              >
                <TimePicker
                  style={{ width: "100%" }}
                  format="hh:mm A"
                  use12Hours
                  needConfirm={false}
                  disabled={isView}
                  className={`${DATE_PICKER_CLASS} ${isView ? DISABLE_INPUT_CLASS : ""}`}
                />
              </StyledFormItem>

              {/* Maintenance Complete Time */}
              <StyledFormItem
                name="maintenance_complete_time"
                label="Maintenance Complete Time"
                rules={[{ required: isMaintenanceOnly, message: "Select maintenance complete time" }]}
              >
                <TimePicker
                  style={{ width: "100%" }}
                  format="hh:mm A"
                  use12Hours
                  needConfirm={false}
                  disabled={isView}
                  className={`${DATE_PICKER_CLASS} ${isView ? DISABLE_INPUT_CLASS : ""}`}
                />
              </StyledFormItem>

              {/* Total Maintenance Time */}
              <StyledFormItem label="Total Maintenance Time">
                <Input
                  value={formatDowntime(maintenanceHours)}
                  disabled
                  className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS} font-semibold`}
                />
              </StyledFormItem>

              {/* Restart Time */}
              <StyledFormItem
                name="restart_time"
                label="Restart Time"
                rules={[{ required: isMaintenanceOnly, message: "Select restart time" }]}
              >
                <TimePicker
                  style={{ width: "100%" }}
                  format="hh:mm A"
                  use12Hours
                  needConfirm={false}
                  disabled={isView}
                  className={`${DATE_PICKER_CLASS} ${isView ? DISABLE_INPUT_CLASS : ""}`}
                />
              </StyledFormItem>

              {/* Breakdown Complete Date */}
              <StyledFormItem
                name="breakdown_complete_date"
                label="Breakdown Complete Date"
                dependencies={["breakdown_date"]}
                rules={[
                  { required: isMaintenanceOnly, message: "Select breakdown complete date" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const bdDate = getFieldValue("breakdown_date");
                      if (!value || !bdDate) {
                        return Promise.resolve();
                      }
                      if (
                        dayjs(value).startOf("day").isBefore(dayjs(bdDate).startOf("day"))
                      ) {
                        return Promise.reject(
                          new Error(
                            "Breakdown completion date cannot be before breakdown date",
                          ),
                        );
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  format="YYYY-MM-DD"
                  disabled={isView}
                  disabledDate={(current) => {
                    const bdDate = form.getFieldValue("breakdown_date") || watchedBreakdownDate;
                    if (!bdDate || !current) return false;
                    return current.startOf("day").isBefore(dayjs(bdDate).startOf("day"));
                  }}
                  className={`${DATE_PICKER_CLASS} ${isView ? DISABLE_INPUT_CLASS : ""}`}
                />
              </StyledFormItem>

              {/* Total Downtime (Hours) */}
              <StyledFormItem label="Total Downtime (Hours)">
                <Input
                  value={formatDowntime(totalDowntimeHours)}
                  disabled
                  className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS} font-semibold`}
                />
              </StyledFormItem>

              {/* Mean Time (Only show in view mode) */}
              {isView && (
                <StyledFormItem label="Mean Time">
                  <Input
                    value={meanTimeDisplay}
                    disabled
                    className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS} font-semibold`}
                  />
                </StyledFormItem>
              )}
            </div>
          </div>
        )}
      </Form>
    </div>
  );
};

export default React.memo(BreakdownForm);
