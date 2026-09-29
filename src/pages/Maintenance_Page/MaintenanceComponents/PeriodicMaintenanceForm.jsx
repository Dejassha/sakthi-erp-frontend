import React, { useEffect, useMemo } from "react";
import { Form, Input, Select, DatePicker, AutoComplete } from "antd";
import dayjs from "dayjs";
import StyledFormItem, {
  INPUT_CLASS,
  SELECT_CLASS,
  DATE_PICKER_CLASS,
  TEXTAREA_CLASS,
  DISABLE_INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";
import { useGetUsersQuery } from "@/store/services/admin.api";
import { calculateNextMaintenanceDate } from "../utils";

const PeriodicMaintenanceForm = ({
  mode = "add", // "add" | "create" | "edit" | "view"
  item = null,
  form,
  machines = [],
  onFinish,
}) => {
  const isView = mode === "view";
  const { data: users = [] } = useGetUsersQuery(undefined);

  const uniqueMachineOptions = useMemo(() => {
    return machines
      .filter(
        (machine, index, self) =>
          index ===
          self.findIndex(
            (m) =>
              (m.machine_name || "").trim().toLowerCase() ===
              (machine.machine_name || "").trim().toLowerCase(),
          ),
      )
      .map((machine) => ({
        label: machine.machine_name,
        value: machine.id,
      }));
  }, [machines]);

  const userOptions = useMemo(() => {
    if (!Array.isArray(users)) return [];
    return users
      .map((u) => {
        const name = (u.username || u.name || "").trim();
        return name ? { label: name.toUpperCase(), value: name.toUpperCase() } : null;
      })
      .filter(Boolean);
  }, [users]);

  const lastDate = Form.useWatch("lastDate", form);
  const intervalDays = Form.useWatch("intervalDays", form);

  useEffect(() => {
    if (lastDate && intervalDays) {
      const calculatedNext = calculateNextMaintenanceDate(lastDate, intervalDays);
      if (calculatedNext) {
        form.setFieldValue("nextDate", calculatedNext);
      }
    }
  }, [lastDate, intervalDays, form]);

  useEffect(() => {
    if (item) {
      form.setFieldsValue({
        machineId: item.machineId,
        maintenanceName: item.maintenance_name
          ? item.maintenance_name.toUpperCase()
          : "GENERAL MAINTENANCE",
        supervisedBy: item.supervised_by ? item.supervised_by.toUpperCase() : "",
        maintenanceNeeds: item.maintenance_needs
          ? item.maintenance_needs.toUpperCase()
          : "",
        intervalDays: item.interval_days || 30,
        remindBeforeDays: item.remind_before_days ?? 3,
        lastDate: item.maintenance_date ? dayjs(item.maintenance_date) : null,
        nextDate: item.next_maintenance_date ? dayjs(item.next_maintenance_date) : null,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        maintenanceName: "GENERAL MAINTENANCE",
        intervalDays: 30,
        remindBeforeDays: 3,
        lastDate: dayjs(),
      });
    }
  }, [item, form]);

  return (
    <div className="w-full">
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <div className="bg-white rounded-sm border border-slate-200/80 shadow-xs p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-x-2">
            {/* Machine Name */}
            <StyledFormItem
              name="machineId"
              label="Machine Name"
              rules={[{ required: true, message: "Select machine name" }]}
            >
              <Select
                placeholder="Select a Machine"
                options={uniqueMachineOptions}
                showSearch={{ optionFilterProp: "label" }}
                disabled={isView}
                className={`${SELECT_CLASS} ${isView ? DISABLE_INPUT_CLASS : ""}`}
                style={{ width: "100%" }}
              />
            </StyledFormItem>

            {/* Schedule Name */}
            <StyledFormItem
              name="maintenanceName"
              label="Schedule Name"
              normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
              rules={[{ required: true, message: "Enter schedule name" }]}
            >
              <Input
                placeholder="Enter Schedule Name"
                disabled={isView}
                className={`${INPUT_CLASS} ${isView ? DISABLE_INPUT_CLASS : ""}`}
              />
            </StyledFormItem>

            {/* Supervised By */}
            <StyledFormItem
              name="supervisedBy"
              label="Supervised By"
              normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
            >
              <AutoComplete
                placeholder="Select or enter supervisor"
                options={userOptions}
                filterOption={(inputValue, option) =>
                  (option?.value || "").toUpperCase().indexOf((inputValue || "").toUpperCase()) !== -1
                }
                disabled={isView}
                className={`${INPUT_CLASS} ${isView ? DISABLE_INPUT_CLASS : ""}`}
              />
            </StyledFormItem>

            {/* Interval (Days) */}
            <StyledFormItem
              name="intervalDays"
              label="Interval (Days)"
              normalize={(value) =>
                value !== undefined && value !== null
                  ? String(value).replace(/[^0-9]/g, "")
                  : ""
              }
              rules={[{ required: true, message: "Enter interval in days" }]}
            >
              <Input
                type="number"
                min={1}
                placeholder="30"
                suffix={<span className="text-gray-400 text-[10px] font-medium select-none">Days</span>}
                disabled={isView}
                className={`${INPUT_CLASS} ${isView ? DISABLE_INPUT_CLASS : ""}`}
                onKeyDown={(e) =>
                  ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()
                }
              />
            </StyledFormItem>

            {/* Remind Before (Days) */}
            <StyledFormItem
              name="remindBeforeDays"
              label="Remind Before (Days)"
              normalize={(value) =>
                value !== undefined && value !== null
                  ? String(value).replace(/[^0-9]/g, "")
                  : ""
              }
              rules={[{ required: true, message: "Enter reminder days" }]}
            >
              <Input
                type="number"
                min={1}
                placeholder="3"
                suffix={<span className="text-gray-400 text-[10px] font-medium select-none">Days</span>}
                disabled={isView}
                className={`${INPUT_CLASS} ${isView ? DISABLE_INPUT_CLASS : ""}`}
                onKeyDown={(e) =>
                  ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()
                }
              />
            </StyledFormItem>

            {/* Last Maintenance Date */}
            <StyledFormItem
              name="lastDate"
              label="Last Maintenance Date"
              rules={[{ required: true, message: "Select last maintenance date" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="YYYY-MM-DD"
                disabled={isView}
                className={`${DATE_PICKER_CLASS} ${isView ? DISABLE_INPUT_CLASS : ""}`}
              />
            </StyledFormItem>

            {/* Next Maintenance Date */}
            <StyledFormItem
              name="nextDate"
              label="Next Maintenance Date"
              rules={[{ required: true, message: "Next maintenance date is required" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="YYYY-MM-DD"
                disabled
                className={`${DATE_PICKER_CLASS} ${DISABLE_INPUT_CLASS}`}
              />
            </StyledFormItem>

            {/* Remarks / Maintenance Notes (Mandatory) */}
            <StyledFormItem
              name="maintenanceNeeds"
              label="Remarks / Maintenance Notes"
              normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
              className="col-span-full"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Please enter remarks / maintenance notes",
                },
              ]}
            >
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 8 }}
                placeholder="Enter remarks or maintenance details..."
                disabled={isView}
                className={`${TEXTAREA_CLASS} ${isView ? DISABLE_INPUT_CLASS : ""}`}
              />
            </StyledFormItem>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default React.memo(PeriodicMaintenanceForm);
