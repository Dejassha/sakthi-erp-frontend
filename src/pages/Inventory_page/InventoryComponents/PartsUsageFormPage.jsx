import React, { useMemo, useEffect } from "react";
import { Form, Input, Select, AutoComplete, DatePicker, TimePicker, Table, Tag } from "antd";
import dayjs from "dayjs";
import { Icon } from "@iconify/react";
import GlobalButton from "@/components/ReusableComponents/Button";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import {
  StyledFormItem,
  INPUT_CLASS,
  SELECT_CLASS,
  TEXTAREA_CLASS,
  DATE_PICKER_CLASS,
} from "@/components/ReusableComponents/FormItem";
import { useGetOperatorsQuery } from "@/store/services/admin.api";
import {
  getMatchedPartBatches,
  getBatchColor,
} from "../utils/inventoryBatchUtils";

export const PartsUsageFormPage = ({
  mode = "use_parts", // "use_parts" | "edit_usage" | "view_usage"
  item = null,
  form,
  parts = [],
  machineOptions = [],
  onBack,
  onFinish,
  isLoading = false,
}) => {
  const isView = mode === "view_usage";
  const isEdit = mode === "edit_usage";

  const selectedPartId = Form.useWatch("part", form);
  const usedByVal = Form.useWatch("used_by", form);
  const selectedPart = parts.find((p) => p.id === selectedPartId);

  const { data: operatorData = [] } = useGetOperatorsQuery(undefined);

  const operatorOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    operatorData.forEach((op) => {
      const name = (op.operator_name || "").trim().toUpperCase();
      if (!name) return;
      seen.add(name.toLowerCase());
      opts.push({ label: name, value: name });
    });
    if (usedByVal) {
      const normalized = usedByVal.trim().toUpperCase();
      if (!seen.has(normalized.toLowerCase())) {
        seen.add(normalized.toLowerCase());
        opts.push({ label: normalized, value: normalized });
      }
    }
    return opts;
  }, [operatorData, usedByVal]);

  const matchedParts = useMemo(
    () =>
      getMatchedPartBatches(parts, selectedPart, {
        includeEditPartId: isEdit ? item?.part : undefined,
      }),
    [selectedPart, parts, isEdit, item],
  );

  const totalAvailableQty = useMemo(() => {
    if (!selectedPart) return 0;
    return matchedParts.reduce(
      (sum, p) => sum + Number(p.available_quantity || 0),
      0,
    );
  }, [selectedPart, matchedParts]);

  const unitStr = (selectedPart?.unit || "PCS").toUpperCase();

  // Watch batch allocations dictionary
  const watchedAllocations = Form.useWatch("batch_allocations", form) || {};

  // Compute total quantity to deduct from batch allocations
  const totalAllocatedQty = useMemo(() => {
    if (!watchedAllocations || typeof watchedAllocations !== "object") return 0;
    return Object.values(watchedAllocations).reduce((sum, val) => {
      const num = Number(val || 0);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [watchedAllocations]);

  // Sync totalAllocatedQty into form's used_quantity field
  useEffect(() => {
    if (matchedParts.length > 0) {
      form.setFieldValue("used_quantity", totalAllocatedQty || undefined);
    }
  }, [totalAllocatedQty, form, matchedParts.length]);

  const getItemPurposeValue = (part) => {
    if (!part) return "common";
    if (part.machine) {
      const targetId = typeof part.machine === "object" ? part.machine.id : part.machine;
      const matchedOpt = machineOptions.find((opt) => String(opt.value) === String(targetId));
      if (matchedOpt) return matchedOpt.value;
    }
    if (part.machine_name && part.machine_name !== "Others" && part.machine_name !== "common") {
      const matchedByName = machineOptions.find(
        (opt) => (opt.label || "").trim().toLowerCase() === (part.machine_name || "").trim().toLowerCase()
      );
      if (matchedByName) return matchedByName.value;
    }
    return "common";
  };

  // Initialize batch allocations & auto-set Purpose when item is selected
  useEffect(() => {
    if (selectedPart && !isEdit && !isView) {
      const purposeVal = getItemPurposeValue(selectedPart);
      form.setFieldValue("machine", purposeVal);

      if (matchedParts.length > 0) {
        const currentAllocations = form.getFieldValue("batch_allocations") || {};
        const newAllocations = { ...currentAllocations };
        matchedParts.forEach((b) => {
          if (newAllocations[b.id] === undefined) {
            newAllocations[b.id] = "";
          }
        });
        form.setFieldValue("batch_allocations", newAllocations);
      }
    }
  }, [selectedPart, matchedParts, isEdit, isView, form, machineOptions]);

  const availablePartOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    parts
      .filter(
        (p) =>
          Number(p.available_quantity) > 0 ||
          (isEdit && p.id === item?.part),
      )
      .forEach((p) => {
        const name = (p.item_name || p.part_name || "").trim().toUpperCase();
        const normalized = name.toLowerCase();
        if (seen.has(normalized)) return;
        seen.add(normalized);
        opts.push({
          label: name,
          value: p.id,
        });
      });
    return opts;
  }, [parts, isEdit, item]);

  const handleSubmit = (values) => {
    onFinish(values);
  };

  const pageTitle = isView
    ? "View Parts Usage"
    : isEdit
      ? "Edit Spare Part Usage"
      : "Log Spare Part Usage";

  const batchColumns = [
    {
      title: "S.No",
      key: "s_no",
      width: 45,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[11px] font-medium text-gray-700",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Batch Number",
      key: "batch_number",
      dataIndex: "batch_number",
      width: 130,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[11px] font-medium text-gray-700",
      render: (val, record, idx) => {
        const batchNo = val || record?.batch_number || `BAT-${String(idx + 1).padStart(2, "0")}`;
        const color = getBatchColor(idx, matchedParts.length);
        return (
          <span
            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${color.bg} ${color.text} border ${color.border}`}
          >
            {batchNo}
          </span>
        );
      },
    },
    {
      title: "Inward Date",
      key: "purchase_date",
      dataIndex: "purchase_date",
      width: 110,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[11px] font-medium text-gray-700",
      render: (val, record) => {
        const dateVal = val || record?.purchase_date;
        if (!dateVal || typeof dateVal !== "string") return "-";
        return dateVal.split("-").reverse().join("-");
      },
    },
    {
      title: "Rate / Unit",
      key: "purchase_price",
      dataIndex: "purchase_price",
      width: 100,
      align: "right",
      className: "!p-1 border-r border-gray-200 !text-[11px] font-semibold text-gray-800",
      render: (val, record) => {
        const raw = val ?? record?.purchase_price;
        const num = Number(raw);
        return !isNaN(num) && num > 0 ? `₹${num.toFixed(2)}` : "-";
      },
    },
    {
      title: "Available Stock",
      key: "available_quantity",
      dataIndex: "available_quantity",
      width: 120,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[11px] font-bold text-emerald-700",
      render: (val, record) => {
        const raw = val ?? record?.available_quantity;
        const num = Number(raw);
        return !isNaN(num) ? `${Math.round(num)} ${unitStr}` : `0 ${unitStr}`;
      },
    },
    {
      title: (
        <span className="text-amber-800 font-bold">
          Quantity to Use <span className="text-red-500">*</span>
        </span>
      ),
      key: "qty_to_use",
      width: 150,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[11px] font-medium text-gray-700 !bg-amber-50/20",
      render: (_, record) => {
        const avail = Math.round(Number(record.available_quantity || 0));
        const isExhausted = avail <= 0;

        return (
          <div className="flex items-center justify-center gap-1">
            <StyledFormItem
              name={["batch_allocations", record.id]}
              normalize={(value) =>
                value !== undefined && value !== null
                  ? String(value).split(".")[0].replace(/[^0-9]/g, "")
                  : ""
              }
              rules={[
                {
                  validator: (_, value) => {
                    const num = Number(value || 0);
                    if (num < 0) {
                      return Promise.reject(new Error("Cannot be negative"));
                    }
                    if (num > avail) {
                      return Promise.reject(new Error(`Max is ${avail}`));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
              noStyle
            >
              <Input
                type="number"
                min={0}
                max={avail}
                placeholder="0"
                disabled={isView || isExhausted}
                className={`${INPUT_CLASS} !text-center !font-bold text-amber-800 !h-6.5 !w-18 !px-1`}
                onKeyDown={(e) =>
                  ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()
                }
              />
            </StyledFormItem>

            {!isView && !isExhausted && (
              <button
                type="button"
                onClick={() => {
                  const current = form.getFieldValue("batch_allocations") || {};
                  form.setFieldValue("batch_allocations", {
                    ...current,
                    [record.id]: avail,
                  });
                }}
                className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-semibold cursor-pointer border border-emerald-300 transition-colors leading-tight"
                title={`Allocate full available quantity (${avail} ${unitStr})`}
              >
                Max
              </button>
            )}
          </div>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      width: 90,
      align: "center",
      className: "!p-1",
      render: (_, record) => {
        const avail = Number(record.available_quantity || 0);
        const isExhausted = avail <= 0;
        const isLow = avail > 0 && avail <= (Number(record.min_stock_quantity) || 5);
        return (
          <Tag
            className="!m-0 !text-[8.5px] !px-1.5 !py-0 leading-tight font-semibold uppercase"
            color={isExhausted ? "default" : isLow ? "orange" : "green"}
          >
            {isExhausted ? "EXHAUSTED" : isLow ? "LOW STOCK" : "ACTIVE"}
          </Tag>
        );
      },
    },
  ];

  return (
    <div className="w-full">
      <PageHeader
        title={pageTitle}
        actions={
          <div className="flex items-center gap-2">
            <GlobalButton
              color="cancel"
              size="xs"
              onClick={onBack}
              icon="lucide:arrow-left"
              disabled={isLoading}
            >
              {isView ? "Back to List" : "Cancel"}
            </GlobalButton>
            {!isView && (
              <GlobalButton
                color="blue"
                size="xs"
                onClick={() => form.submit()}
                loading={isLoading}
                icon="lucide:check"
              >
                {isEdit ? "Update Usage" : "Save Usage"}
              </GlobalButton>
            )}
          </div>
        }
      />

      <div className="bg-white rounded-sm shadow-xs border border-gray-200 p-3">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
        >
          {/* Main Info Header Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-2.5 gap-y-1">
            {/* Item Name */}
            <StyledFormItem
              name="part"
              label="Item Name"
              rules={[{ required: true, message: "Select an item" }]}
            >
              <Select
                placeholder="Select item"
                showSearch={{ optionFilterProp: "label" }}
                options={availablePartOptions}
                onChange={(val) => {
                  const selected = parts.find((p) => p.id === val);
                  if (selected) {
                    const batches = getMatchedPartBatches(parts, selected, {
                      includeEditPartId: isEdit ? item?.part : undefined,
                    });
                    const initialAllocations = {};
                    batches.forEach((b) => {
                      initialAllocations[b.id] = 0;
                    });
                    form.setFieldValue("batch_allocations", initialAllocations);
                    form.setFieldValue("used_quantity", undefined);
                    const purposeVal = getItemPurposeValue(selected);
                    form.setFieldValue("machine", purposeVal);
                  }
                }}
                disabled={isEdit || isView}
                className={SELECT_CLASS}
              />
            </StyledFormItem>

            {/* Purpose */}
            <StyledFormItem
              name="machine"
              label="Purpose"
              initialValue="common"
              rules={[{ required: true, message: "Select purpose" }]}
            >
              <Select
                placeholder="Select Purpose"
                allowClear
                showSearch={{ optionFilterProp: "label" }}
                options={machineOptions}
                disabled={isView}
                className={SELECT_CLASS}
              />
            </StyledFormItem>

            {/* Used By */}
            <StyledFormItem
              name="used_by"
              label="Used By"
              normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
              rules={[{ required: true, message: "Enter operator name" }]}
            >
              <AutoComplete
                options={operatorOptions}
                placeholder="Select operator"
                showSearch={{
                  filterOption: (inputValue, option) =>
                    (option?.value || "")
                      .toUpperCase()
                      .indexOf(inputValue.toUpperCase()) !== -1,
                }}
                disabled={isView}
                className={INPUT_CLASS}
              />
            </StyledFormItem>

            {/* Used Date */}
            <StyledFormItem
              name="used_date"
              label="Used Date"
              rules={[{ required: true, message: "Select used date" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="YYYY-MM-DD"
                disabled={isView}
                className={DATE_PICKER_CLASS}
              />
            </StyledFormItem>

            {/* Total Used Duration */}
            <StyledFormItem
              name="used_hours"
              label="Total Used Duration"
              rules={[{ required: true, message: "Select duration" }]}
              getValueProps={(value) => {
                if (!value) return { value: undefined };
                if (dayjs.isDayjs(value)) return { value };
                if (typeof value === "string") {
                  if (value.includes(":")) {
                    const d = dayjs(value, "HH:mm");
                    if (d.isValid()) return { value: d };
                  }
                  const num = parseFloat(value);
                  if (!isNaN(num)) {
                    const hrs = Math.floor(num);
                    const mins = Math.round((num - hrs) * 60);
                    const str = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
                    return { value: dayjs(str, "HH:mm") };
                  }
                }
                return { value: undefined };
              }}
              getValueFromEvent={(val) => {
                if (!val) return "";
                return dayjs.isDayjs(val) ? val.format("HH:mm") : val;
              }}
            >
              <TimePicker
                format="HH:mm"
                placeholder="HH:mm"
                disabled={isView}
                className={DATE_PICKER_CLASS}
                style={{ width: "100%" }}
                showNow={false}
              />
            </StyledFormItem>

            {/* Remarks */}
            <StyledFormItem
              name="remarks"
              label="Remarks / Usage Details"
              normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
              className="col-span-2 md:col-span-3 lg:col-span-5"
            >
              <Input.TextArea
                rows={1}
                placeholder="Enter additional notes or maintenance context..."
                disabled={isView}
                className={TEXTAREA_CLASS}
              />
            </StyledFormItem>
          </div>

          {/* Hidden used_quantity validation field */}
          <Form.Item
            name="used_quantity"
            noStyle
            rules={[
              {
                validator: (_, value) => {
                  const num = Number(value || totalAllocatedQty || 0);
                  if (num <= 0) {
                    return Promise.reject(
                      new Error("Please enter a quantity to use for at least 1 batch"),
                    );
                  }
                  if (num > totalAvailableQty) {
                    return Promise.reject(
                      new Error(
                        `Total quantity to use (${num}) exceeds total available stock (${totalAvailableQty} ${unitStr})`,
                      ),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input type="hidden" />
          </Form.Item>

          {/* Multi-Batch Selection & Allocation Table */}
          {selectedPart && matchedParts.length > 0 && (
            <div className="mt-2 border border-slate-200 rounded-sm bg-white overflow-hidden shadow-2xs">
              <div className="bg-slate-50/90 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon icon="lucide:layers" className="w-3.5 h-3.5 text-slate-700" />
                  <span className="text-[11px] font-bold text-slate-800 tracking-wide uppercase">
                    Batch Stock Selection ({matchedParts.length} {matchedParts.length === 1 ? "Batch" : "Batches"} Available)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table
                  dataSource={matchedParts}
                  columns={batchColumns}
                  pagination={false}
                  bordered
                  size="small"
                  rowKey={(record) => record.id}
                  className="[&_.ant-table-thead_th]:!bg-slate-100 [&_.ant-table-thead_th]:!text-slate-700 [&_.ant-table-thead_th]:!text-[10px] 2xl:[&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!text-center [&_.ant-table-thead_th]:!py-1 [&_.ant-table-thead_th]:!px-1.5"
                />
              </div>

              {/* Table Footer Summary */}
              <div className="bg-slate-50/90 px-3 py-1.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs">
                <div className="text-slate-600 font-medium text-[11px]">
                  Total Available in Stock:{" "}
                  <strong className="text-slate-800 font-bold">
                    {totalAvailableQty} {unitStr}
                  </strong>
                </div>

                <div className="text-slate-700 font-medium text-[11px] flex items-center gap-1.5">
                  <span>Total Selected to Deduct:</span>
                  <strong
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                      totalAllocatedQty > 0
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-slate-100 text-slate-500 border-slate-300"
                    }`}
                  >
                    {totalAllocatedQty} {unitStr}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </Form>
      </div>
    </div>
  );
};

export default PartsUsageFormPage;
