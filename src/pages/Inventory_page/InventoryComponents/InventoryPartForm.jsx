import React, { useEffect, useState, useMemo } from "react";
import {
  Form,
  Input,
  Select,
  AutoComplete,
  DatePicker,
  Typography,
  Tag,
  Table,
  Popconfirm,
} from "antd";
import dayjs from "dayjs";
import { Icon } from "@iconify/react";
import StyledFormItem, {
  INPUT_CLASS,
  SELECT_CLASS,
  TEXTAREA_CLASS,
  DATE_PICKER_CLASS,
  DISABLE_INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";
import Button from "@/components/ReusableComponents/Button";
import {
  getBatchColor,
  sortPartsByFifo,
} from "../utils/inventoryBatchUtils";

const { Text } = Typography;

const displayViewValue = (value, fallback = "-") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const viewFieldProps = (value) => ({
  value: displayViewValue(value),
  placeholder: "",
});

const STANDARD_UNITS = [
  "PCS",
  "NOS",
  "SET",
  "KG",
  "MTR",
  "LTR",
  "BOX",
  "PKT",
  "ROLL",
  "SHEET",
  "PAIR",
  "HOURS",
];

export const InventoryPartForm = ({
  form,
  mode = "add",
  itemData = null,
  machineOptions = [],
  existingParts = [],
  onDeleteExistingBatch,
  onFinish,
  children,
}) => {
  const currentMode = mode === "add" ? "create" : mode;
  const isView = currentMode === "view";
  const isEdit = currentMode === "edit";
  const isCreate = currentMode === "create";
  const isAddQty = currentMode === "add_qty" || currentMode === "restock";
  const isReadOnlyHeader = isView || isAddQty;

  const [computedTotalStock, setComputedTotalStock] = useState(0);
  const [usedQtyState, setUsedQtyState] = useState(0);
  const [availQtyState, setAvailQtyState] = useState(0);
  const [cleanUnitState, setCleanUnitState] = useState("PCS");

  const allBatches = useMemo(() => {
    const raw = itemData?.group_parts && itemData.group_parts.length > 0
      ? itemData.group_parts
      : (itemData ? [itemData] : []);
    return sortPartsByFifo(raw);
  }, [itemData]);

  const unitOptions = useMemo(() => {
    const fromExisting = (existingParts || [])
      .map((p) => (p.unit || "").trim().toUpperCase())
      .filter(Boolean);
    const combined = Array.from(new Set([...STANDARD_UNITS, ...fromExisting]));
    return combined.map((u) => ({ label: u, value: u }));
  }, [existingParts]);

  const boughtFromOptions = useMemo(() => {
    const suppliers = (existingParts || [])
      .map((p) => (p.bought_from || "").trim().toUpperCase())
      .filter(Boolean);
    return Array.from(new Set(suppliers)).map((s) => ({ label: s, value: s }));
  }, [existingParts]);

  useEffect(() => {
    if (itemData) {
      const currentName = itemData.item_name || itemData.part_name || "";
      const availQty = Math.round(Number(itemData.available_quantity || 0));
      const usedQty = Math.round(Number(itemData.used_quantity || 0));
      const stockQty = Math.round(Number(itemData.stock_quantity ?? availQty));
      const minStockQty = Math.round(Number(itemData.min_stock_quantity || 0));

      const rawUnit = (itemData.unit || "PCS").toUpperCase().trim();
      const cleanUnit = rawUnit || "PCS";

      setComputedTotalStock(availQty + usedQty);
      setUsedQtyState(usedQty);
      setAvailQtyState(availQty);
      setCleanUnitState(cleanUnit);

      const batchValues = {};
      allBatches.forEach((b) => {
        batchValues[`batch_available_${b.id}`] = Math.round(Number(b.available_quantity || 0));
      });

      form.setFieldsValue({
        spare_id: itemData.spare_id || "",
        item_code: itemData.item_code || "",
        part_name: currentName,
        machine: itemData.machine || "common",
        available_quantity: availQty,
        stock_quantity: stockQty,
        min_stock_quantity: minStockQty,
        unit: cleanUnit,
        ...batchValues,
      });

      if (isAddQty) {
        const existingBatchesCount = allBatches.length || 1;
        const nextBatchCode = `BAT-${String(existingBatchesCount + 1).padStart(2, "0")}`;
        const latestPrice = allBatches[allBatches.length - 1]?.purchase_price ?? itemData.purchase_price ?? "";
        const latestSupplier = allBatches[allBatches.length - 1]?.bought_from || itemData.bought_from || "";

        const currentBatches = form.getFieldValue("batches");
        if (!currentBatches || currentBatches.length === 0) {
          form.setFieldsValue({
            batches: [
              {
                batch_number: nextBatchCode,
                stock_quantity: "",
                purchase_price: latestPrice,
                purchase_date: dayjs(),
                bought_from: latestSupplier,
                remarks: "",
              },
            ],
          });
        }
      }
    } else if (isCreate) {
      setComputedTotalStock(0);
      setUsedQtyState(0);
      setAvailQtyState(0);
      setCleanUnitState("PCS");
      const currentBatches = form.getFieldValue("batches");
      if (!currentBatches || currentBatches.length === 0) {
        form.setFieldsValue({
          machine: "common",
          unit: "PCS",
          min_stock_quantity: 5,
          batches: [
            {
              batch_number: "BAT-01",
              stock_quantity: "",
              purchase_price: "",
              purchase_date: dayjs(),
              bought_from: "",
              remarks: "",
            },
          ],
        });
      }
    }
  }, [itemData, form, allBatches, isCreate, isAddQty]);

  const handleBatchQuantityChange = (batchId, newVal) => {
    const numericVal = Math.max(0, Math.round(Number(newVal || 0)));
    let totalAvail = 0;
    allBatches.forEach((b) => {
      if (b.id === batchId) {
        totalAvail += numericVal;
      } else {
        const val = form.getFieldValue(`batch_available_${b.id}`);
        totalAvail += Math.max(0, Math.round(Number(val ?? b.available_quantity ?? 0)));
      }
    });

    const totalUsed = allBatches.reduce(
      (sum, b) => sum + Math.round(Number(b.used_quantity || 0)),
      0,
    );

    setAvailQtyState(totalAvail);
    setComputedTotalStock(totalAvail + totalUsed);
    form.setFieldsValue({
      available_quantity: totalAvail,
      stock_quantity: totalAvail + totalUsed,
    });
  };

  const watchedBatches = Form.useWatch("batches", form) || [];
  const watchedUnit = Form.useWatch("unit", form) || cleanUnitState || "PCS";

  const createTotalStock = useMemo(() => {
    if (!watchedBatches || !Array.isArray(watchedBatches)) return 0;
    return watchedBatches.reduce((acc, b) => {
      const qty = Number(b?.stock_quantity || 0);
      return acc + (isNaN(qty) ? 0 : qty);
    }, 0);
  }, [watchedBatches]);

  const displayTotalInputted = isCreate ? createTotalStock : computedTotalStock;
  const displayTotalUsed = isCreate ? 0 : usedQtyState;
  const displayTotalAvailable = isCreate ? createTotalStock : availQtyState;
  const displayUnit = (watchedUnit || cleanUnitState || "PCS").toUpperCase();

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
      <div className="p-4">
        {/* Top Summary Banner for View & Edit Modes only */}
        {!isCreate && itemData ? (
          <div className="mb-4 px-3.5 py-2 bg-blue-50/80 rounded-sm border border-blue-100 text-[12px] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-gray-500">Total Inward Stock: </span>
                <strong className="text-gray-800 font-semibold text-xs">
                  {computedTotalStock} {cleanUnitState}
                </strong>
              </div>
              <div>
                <span className="text-gray-500">Total Consumed: </span>
                <strong className="text-amber-700 font-semibold text-xs">
                  {usedQtyState} {cleanUnitState}
                </strong>
              </div>
              <div>
                <span className="text-gray-500">Total Available: </span>
                <strong className="text-emerald-700 font-bold text-xs">
                  {availQtyState} {cleanUnitState}
                </strong>
              </div>
            </div>
            {isView && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Status: </span>
                <Tag
                  className="m-0 !text-[10px] px-2 py-0.5 leading-tight font-semibold"
                  color={
                    itemData.status === "out_of_stock"
                      ? "red"
                      : itemData.status === "low_stock"
                        ? "orange"
                        : "green"
                  }
                >
                  {(itemData.status || "IN_STOCK")
                    .replace(/_/g, " ")
                    .toUpperCase()}
                </Tag>
              </div>
            )}
          </div>
        ) : null}

        {/* Master Item Header Form Fields */}
        <div
          className={`grid gap-x-2.5 gap-y-1 ${
            isCreate
              ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
              : isEdit
                ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
                : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
          }`}
        >
          {/* Spare ID */}
          <StyledFormItem
            name="spare_id"
            label="Spare ID"
            rules={[{ required: !isReadOnlyHeader, message: "Please enter Spare ID" }]}
            normalize={(value) =>
              (value || "").toUpperCase().replace(/[^A-Z0-9-]/g, "")
            }
            getValueProps={(value) => (isReadOnlyHeader ? viewFieldProps(value) : { value })}
          >
            <Input
              placeholder={isReadOnlyHeader ? undefined : "Enter Spare ID"}
              disabled={isReadOnlyHeader}
              className={`${INPUT_CLASS} ${isReadOnlyHeader ? DISABLE_INPUT_CLASS : ""}`}
            />
          </StyledFormItem>

          {/* Item Code */}
          <StyledFormItem
            name="item_code"
            label="Item Code"
            normalize={(value) =>
              (value || "").toUpperCase().replace(/[^A-Z0-9-]/g, "")
            }
            getValueProps={(value) => (isReadOnlyHeader ? viewFieldProps(value) : { value })}
            rules={[
              { required: !isReadOnlyHeader, message: "Please enter Item Code" },
              {
                validator: (_, value) => {
                  if (isReadOnlyHeader || !value || !value.trim()) return Promise.resolve();
                  const trimmedCode = value.trim().toLowerCase();
                  const currentPartName =
                    form.getFieldValue("part_name") === "Other"
                      ? form.getFieldValue("custom_part_name")
                      : form.getFieldValue("part_name") ||
                        itemData?.part_name ||
                        "";
                  const normalizedCurrentPartName = (currentPartName || "")
                    .trim()
                    .toLowerCase();
                  const isDuplicate = existingParts.some(
                    (part) =>
                      (part.part_name || "").trim().toLowerCase() !==
                        normalizedCurrentPartName &&
                      part.item_code &&
                      part.item_code.trim().toLowerCase() === trimmedCode,
                  );
                  if (isDuplicate) {
                    return Promise.reject(
                      new Error("Item Code already exists."),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              placeholder={isReadOnlyHeader ? undefined : "Enter Item Code"}
              disabled={isReadOnlyHeader}
              className={`${INPUT_CLASS} ${isReadOnlyHeader ? DISABLE_INPUT_CLASS : ""}`}
            />
          </StyledFormItem>

          {/* Item Name */}
          <StyledFormItem
            name="part_name"
            label="Item Name"
            normalize={(value) =>
              (value || "").toUpperCase().replace(/[^A-Z0-9 _-]/g, "")
            }
            getValueProps={(value) => (isReadOnlyHeader ? viewFieldProps(value) : { value })}
            rules={[
              { required: !isReadOnlyHeader, message: "Please enter an item name" },
              {
                validator: (_, value) => {
                  if (isReadOnlyHeader || !value || !value.trim()) return Promise.resolve();
                  const trimmedName = value.trim().toLowerCase();
                  const currentName = (itemData?.part_name || "")
                    .trim()
                    .toLowerCase();
                  if (isEdit && trimmedName === currentName) {
                    return Promise.resolve();
                  }
                  const isDuplicate = (existingParts || []).some(
                    (part) =>
                      (part.part_name || "").trim().toLowerCase() ===
                      trimmedName,
                  );
                  if (isDuplicate) {
                    return Promise.reject(
                      new Error("Item Name already exists."),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              placeholder={isReadOnlyHeader ? undefined : "Enter Item Name"}
              disabled={isReadOnlyHeader}
              className={`${INPUT_CLASS} ${isReadOnlyHeader ? DISABLE_INPUT_CLASS : ""}`}
            />
          </StyledFormItem>

          {/* Purpose */}
          {isReadOnlyHeader ? (
            <StyledFormItem label="Purpose">
              <Input
                value={
                  itemData?.machine_name || "Others"
                }
                disabled
                className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`}
                style={{ textTransform: "uppercase" }}
              />
            </StyledFormItem>
          ) : (
            <StyledFormItem
              name="machine"
              label="Purpose"
              initialValue="common"
              rules={[
                { required: !isReadOnlyHeader, message: "Please select Purpose" },
              ]}
            >
              <Select
                placeholder="Select Purpose"
                allowClear
                showSearch={{ optionFilterProp: "label" }}
                options={machineOptions}
                disabled={isReadOnlyHeader}
                className={SELECT_CLASS}
              />
            </StyledFormItem>
          )}

          {/* Min Stock Quantity */}
          {isReadOnlyHeader ? (
            <StyledFormItem label="Min Stock Quantity">
              <Input
                value={`${itemData?.min_stock_quantity ?? 0} ${cleanUnitState}`}
                disabled
                className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`}
              />
            </StyledFormItem>
          ) : (
            <StyledFormItem
              name="min_stock_quantity"
              label="Minimum Stock Quantity"
              rules={[
                { required: true, message: "Please enter Minimum Stock Quantity" },
              ]}
              normalize={(value) =>
                value !== undefined && value !== null
                  ? String(value).split(".")[0].replace(/[^0-9]/g, "")
                  : ""
              }
            >
              <Input
                type="number"
                min={0}
                placeholder="0"
                className={INPUT_CLASS}
                onKeyDown={(e) =>
                  ["e", "E", "+", "-", "."].includes(e.key) &&
                  e.preventDefault()
                }
              />
            </StyledFormItem>
          )}

          {/* Unit */}
          <StyledFormItem
            name="unit"
            label="Unit"
            initialValue="PCS"
            rules={[{ required: !isReadOnlyHeader, message: "Please select or enter unit" }]}
            normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
          >
            {isReadOnlyHeader ? (
              <Input value={cleanUnitState} disabled className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`} />
            ) : (
              <AutoComplete
                options={unitOptions}
                placeholder="Select unit"
                disabled={isReadOnlyHeader}
                className={INPUT_CLASS}
                allowClear
                showSearch={{
                  filterOption: (inputValue, option) =>
                    (option?.value || "")
                    .toUpperCase()
                    .includes((inputValue || "").toUpperCase())
                }}
              />
            )}
          </StyledFormItem>

          {/* Created By (View and Restock modes) */}
          {isReadOnlyHeader && (
            <StyledFormItem label="Created By">
              <Input
                value={itemData?.created_by || "Admin"}
                disabled
                className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`}
              />
            </StyledFormItem>
          )}
        </div>

        {/* Single Unified Batch Inventory Table for View, Edit, Restock, and Create */}
        <Form.List name="batches">
          {(fields, { add, remove }) => {
            const isDynamicOnly = isCreate;
            const hasExisting = !isCreate && allBatches.length > 0;
            const totalRowsCount = (hasExisting ? allBatches.length : 0) + (isDynamicOnly ? fields.length : fields.length);

            return (
              <div className="border border-slate-200 rounded-sm bg-white overflow-hidden shadow-2xs mt-2 mb-4">
                {/* Unified Table Header */}
                <div className="bg-slate-50/80 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:layers" className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                      {isView
                        ? "Batch Inventory Breakdown & History"
                        : isAddQty
                        ? "Batch Inventory & Restock"
                        : isEdit
                        ? "Batch Inventory & Inward Batches"
                        : "Batch Inventory Details"}
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                      {totalRowsCount} {totalRowsCount === 1 ? "Batch" : "Batches"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isCreate && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        Combined Available:{" "}
                        <strong className="text-emerald-700 font-bold">
                          {availQtyState} {cleanUnitState}
                        </strong>
                      </span>
                    )}

                    {!isView && (
                      <Button
                        type="button"
                        color="green"
                        size="xs"
                        icon="lucide:plus"
                        onClick={() => {
                          const existingCount = allBatches.length || (itemData ? 1 : 0);
                          const nextNo = `BAT-${String(existingCount + fields.length + 1).padStart(2, "0")}`;
                          const latestPrice = allBatches[allBatches.length - 1]?.purchase_price ?? itemData?.purchase_price ?? "";
                          const latestSupplier = allBatches[allBatches.length - 1]?.bought_from || itemData?.bought_from || "";
                          add({
                            batch_number: nextNo,
                            stock_quantity: "",
                            purchase_price: latestPrice,
                            purchase_date: dayjs(),
                            bought_from: latestSupplier,
                            remarks: "",
                          });
                        }}
                      >
                        Add Row
                      </Button>
                    )}
                  </div>
                </div>

                {/* Unified Table Body */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-semibold text-[10.5px]">
                        <th className="py-2 px-3 text-center w-12">#</th>
                        <th className="py-2 px-3 text-center w-28">
                          Batch No {!isView && <span className="text-red-500">*</span>}
                        </th>
                        <th className="py-2 px-3 text-center w-32">Inward Date</th>
                        <th className="py-2 px-3 text-right w-28">
                          Rate (₹) {!isView && <span className="text-red-500">*</span>}
                        </th>
                        <th className="py-2 px-3 text-center w-28">
                          Qty {!isView && <span className="text-red-500">*</span>}
                        </th>
                        <th className="py-2 px-3 text-center w-24">Used Qty</th>
                        <th className="py-2 px-3 text-center w-28">Available Qty</th>
                        <th className="py-2 px-3 min-w-[150px]">Supplier / Vendor</th>
                        <th className="py-2 px-3 text-center w-24">Status</th>
                        <th className="py-2 px-3 min-w-[140px]">Remarks</th>
                        {!isView && <th className="py-2 px-2 text-center w-12">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {/* 1. Historical / Existing Batches (for View, Edit, Add Qty) */}
                      {hasExisting &&
                        allBatches.map((b, idx) => {
                          const batchNo = b.batch_number || `BAT-${String(idx + 1).padStart(2, "0")}`;
                          const color = getBatchColor(idx, allBatches.length);
                          const initialStock = Math.round(Number(b.stock_quantity || 0));
                          const used = Math.round(Number(b.used_quantity || 0));
                          const avail = Math.round(Number(b.available_quantity || 0));
                          const rate = Number(b.purchase_price || 0);
                          const dateStr = b.purchase_date
                            ? b.purchase_date.split("-").reverse().join("-")
                            : "-";
                          const isExhausted = avail <= 0;
                          const isLow = avail > 0 && avail <= (Number(b.min_stock_quantity) || 5);

                          return (
                            <tr
                              key={b.id || `hist-${idx}`}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                isExhausted ? "bg-slate-50/40 text-slate-400" : ""
                              }`}
                            >
                              <td className="py-2 px-3 text-center font-semibold text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 text-center font-semibold">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${color.bg} ${color.text} border ${color.border}`}
                                >
                                  {batchNo}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center font-medium whitespace-nowrap">
                                {dateStr}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-slate-800">
                                ₹{rate.toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-center font-medium">
                                {initialStock} {cleanUnitState}
                              </td>
                              <td className="py-2 px-3 text-center font-medium text-amber-700">
                                {used} {cleanUnitState}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {isEdit ? (
                                  <StyledFormItem
                                    name={`batch_available_${b.id}`}
                                    className="!mb-0"
                                    grid_form_padding={false}
                                    normalize={(value) =>
                                      value !== undefined && value !== null
                                        ? String(value).split(".")[0].replace(/[^0-9]/g, "")
                                        : ""
                                    }
                                  >
                                    <Input
                                      type="number"
                                      min={0}
                                      placeholder="0"
                                      className="!h-6 !text-[11px] !py-0 !px-1.5 !w-20 !text-center font-bold text-emerald-700 !bg-emerald-50/40 border-emerald-300"
                                      onKeyDown={(e) =>
                                        ["e", "E", "+", "-", "."].includes(e.key) &&
                                        e.preventDefault()
                                      }
                                      onChange={(e) =>
                                        handleBatchQuantityChange(b.id, e.target.value)
                                      }
                                    />
                                  </StyledFormItem>
                                ) : (
                                  <span
                                    className={`font-bold ${
                                      isExhausted
                                        ? "text-rose-600"
                                        : "text-emerald-700"
                                    }`}
                                  >
                                    {avail} {cleanUnitState}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-medium uppercase text-[10px]">
                                {b.bought_from || "-"}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <Tag
                                  className="!m-0 !text-[9px] !px-1.5 !py-0 leading-tight font-semibold uppercase"
                                  color={isExhausted ? "default" : isLow ? "orange" : "green"}
                                >
                                  {isExhausted ? "EXHAUSTED" : isLow ? "LOW STOCK" : "ACTIVE"}
                                </Tag>
                              </td>
                              <td className="py-2 px-3 text-slate-500 text-[10px] max-w-xs truncate">
                                {b.remarks || "-"}
                              </td>
                              {!isView && (
                                <td className="py-2 px-2 text-center">
                                  {isEdit && onDeleteExistingBatch ? (
                                    <Popconfirm
                                      title="Delete this batch?"
                                      description={`Are you sure you want to delete ${batchNo}?`}
                                      okText="Yes, Delete"
                                      cancelText="Cancel"
                                      okButtonProps={{ danger: true, size: "small" }}
                                      cancelButtonProps={{ size: "small" }}
                                      onConfirm={() => onDeleteExistingBatch(b)}
                                      placement="left"
                                    >
                                      <button
                                        type="button"
                                        className="p-1 rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-all inline-flex items-center justify-center"
                                        title={`Delete ${batchNo}`}
                                      >
                                        <Icon icon="lucide:trash-2" className="w-3.5 h-3.5 mx-auto" />
                                      </button>
                                    </Popconfirm>
                                  ) : (
                                    <span className="text-slate-300 text-xs">-</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}

                      {/* 2. Newly Added / Dynamic Batch Rows (for Create, Edit, and Add Qty) */}
                      {!isView &&
                        fields.map(({ key, name, ...restField }, fIdx) => {
                          const rowSNo = (hasExisting ? allBatches.length : 0) + fIdx + 1;
                          const cannotDelete = isCreate && fields.length <= 1;

                          return (
                            <tr key={key} className="bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors">
                              <td className="py-1.5 px-3 text-center font-semibold text-slate-600">
                                {rowSNo}
                              </td>
                              <td className="py-1.5 px-2">
                                <StyledFormItem
                                  grid_form_padding={false}
                                  {...restField}
                                  name={[name, "batch_number"]}
                                  rules={[{ required: true, message: "Required" }]}
                                  normalize={(val) =>
                                    (val || "").toUpperCase().replace(/[^A-Z0-9-]/g, "")
                                  }
                                  className="!mb-0"
                                  noStyle
                                >
                                  <Input
                                    placeholder="BAT-01"
                                    className={`${INPUT_CLASS} !h-7 !text-center !font-bold !text-[11px] !px-1.5`}
                                  />
                                </StyledFormItem>
                              </td>
                              <td className="py-1.5 px-2">
                                <StyledFormItem
                                  grid_form_padding={false}
                                  {...restField}
                                  name={[name, "purchase_date"]}
                                  className="!mb-0"
                                  noStyle
                                >
                                  <DatePicker
                                    format="YYYY-MM-DD"
                                    className={`${DATE_PICKER_CLASS} !h-7 !text-[11px] !w-full`}
                                    allowClear={false}
                                  />
                                </StyledFormItem>
                              </td>
                              <td className="py-1.5 px-2">
                                <StyledFormItem
                                  grid_form_padding={false}
                                  {...restField}
                                  name={[name, "purchase_price"]}
                                  rules={[{ required: true, message: "Required" }]}
                                  normalize={(value) => {
                                    if (value === undefined || value === null) return "";
                                    const s = String(value).replace(/[^0-9.]/g, "");
                                    const parts = s.split(".");
                                    if (parts.length > 2) {
                                      return `${parts[0]}.${parts.slice(1).join("")}`;
                                    }
                                    return s;
                                  }}
                                  className="!mb-0"
                                  noStyle
                                >
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    className={`${INPUT_CLASS} !h-7 !text-right !text-[11px] !px-1.5`}
                                    onKeyDown={(e) =>
                                      ["e", "E", "+", "-"].includes(e.key) &&
                                      e.preventDefault()
                                    }
                                  />
                                </StyledFormItem>
                              </td>
                              <td className="py-1.5 px-2">
                                <StyledFormItem
                                  grid_form_padding={false}
                                  {...restField}
                                  name={[name, "stock_quantity"]}
                                  rules={[
                                    { required: true, message: "Required" },
                                    {
                                      validator: (_, val) =>
                                        Number(val) > 0
                                          ? Promise.resolve()
                                          : Promise.reject(new Error("Qty > 0")),
                                    },
                                  ]}
                                  normalize={(value) =>
                                    value !== undefined && value !== null
                                      ? String(value).split(".")[0].replace(/[^0-9]/g, "")
                                      : ""
                                  }
                                  className="!mb-0"
                                  noStyle
                                >
                                  <Input
                                    type="number"
                                    min={1}
                                    placeholder="0"
                                    className={`${INPUT_CLASS} !h-7 !text-center font-bold text-emerald-700 !text-[11px] !px-1.5`}
                                    onKeyDown={(e) =>
                                      ["e", "E", "+", "-", "."].includes(e.key) &&
                                      e.preventDefault()
                                    }
                                  />
                                </StyledFormItem>
                              </td>
                              <td className="py-1.5 px-2 text-center text-slate-500 font-medium">
                                0 {displayUnit}
                              </td>
                              <td className="py-1.5 px-2 text-center font-bold text-emerald-700">
                                {watchedBatches[fIdx]?.stock_quantity
                                  ? `${watchedBatches[fIdx].stock_quantity} ${displayUnit}`
                                  : `-`}
                              </td>
                              <td className="py-1.5 px-2">
                                <StyledFormItem
                                  grid_form_padding={false}
                                  {...restField}
                                  name={[name, "bought_from"]}
                                  normalize={(val) => (val || "").toUpperCase()}
                                  className="!mb-0"
                                  noStyle
                                >
                                  <AutoComplete
                                    options={boughtFromOptions}
                                    placeholder="Supplier"
                                    className={`${INPUT_CLASS} !h-7 !text-[11px]`}
                                    showSearch={{
                                      filterOption: (inputValue, option) =>
                                        option?.value
                                          ? option.value
                                              .toUpperCase()
                                              .includes(inputValue.toUpperCase())
                                          : false,
                                    }}
                                  />
                                </StyledFormItem>
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                <Tag
                                  className="!m-0 !text-[9px] !px-1.5 !py-0 leading-tight font-semibold uppercase"
                                  color="cyan"
                                >
                                  {isCreate ? "NEW" : "NEW INWARD"}
                                </Tag>
                              </td>
                              <td className="py-1.5 px-2">
                                <StyledFormItem
                                  grid_form_padding={false}
                                  {...restField}
                                  name={[name, "remarks"]}
                                  normalize={(val) => (val || "").toUpperCase()}
                                  className="!mb-0"
                                  noStyle
                                >
                                  <Input
                                    placeholder="Optional note"
                                    className={`${INPUT_CLASS} !h-7 !text-[11px]`}
                                    onKeyDown={(e) => {
                                      if (
                                        e.key === "Tab" &&
                                        !e.shiftKey &&
                                        fIdx === fields.length - 1
                                      ) {
                                        e.preventDefault();
                                        const existingCount = allBatches.length || (itemData ? 1 : 0);
                                        const nextNo = `BAT-${String(existingCount + fields.length + 1).padStart(2, "0")}`;
                                        const latestPrice = allBatches[allBatches.length - 1]?.purchase_price ?? itemData?.purchase_price ?? "";
                                        const latestSupplier = allBatches[allBatches.length - 1]?.bought_from || itemData?.bought_from || "";
                                        add({
                                          batch_number: nextNo,
                                          stock_quantity: "",
                                          purchase_price: latestPrice,
                                          purchase_date: dayjs(),
                                          bought_from: latestSupplier,
                                          remarks: "",
                                        });
                                      }
                                    }}
                                  />
                                </StyledFormItem>
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                <button
                                  type="button"
                                  disabled={cannotDelete}
                                  onClick={() => remove(name)}
                                  className={`p-1 rounded-md transition-all ${
                                    cannotDelete
                                      ? "text-gray-300 cursor-not-allowed"
                                      : "text-red-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                                  }`}
                                  title={cannotDelete ? "Minimum 1 batch row required" : "Remove Row"}
                                >
                                  <Icon icon="lucide:trash-2" className="w-3.5 h-3.5 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>

                    {/* Unified Footer */}
                    <tfoot className="bg-slate-100/90 font-semibold text-slate-800 border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="py-2 px-3 text-right uppercase text-[10px] tracking-wider text-slate-600">
                          Total Summary:
                        </td>
                        <td className="py-2 px-3 text-center text-slate-800">
                          {(isCreate ? createTotalStock : computedTotalStock + createTotalStock)} {displayUnit}
                        </td>
                        <td className="py-2 px-3 text-center text-amber-700 font-bold">
                          {isCreate ? 0 : usedQtyState} {displayUnit}
                        </td>
                        <td className="py-2 px-3 text-center text-emerald-700 font-bold text-xs">
                          {(isCreate ? createTotalStock : availQtyState + createTotalStock)} {displayUnit}
                        </td>
                        <td colSpan={!isView ? 4 : 3} className="py-2 px-3 text-right text-[10px] text-slate-500">
                          {isCreate
                            ? `${fields.length} Batch(es) to Create`
                            : `${allBatches.filter((b) => Number(b.available_quantity || 0) > 0).length + fields.length} Active Batches in Stock`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Error Message Footer */}
                {!isView && (
                  <Form.Item shouldUpdate className="m-0 p-0 px-3 py-1.5 border-t border-slate-100">
                    {() => {
                      const errors = form.getFieldsError();
                      const hasErrors = errors.some(
                        (err) => err.errors.length > 0
                      );
                      return hasErrors ? (
                        <div className="text-red-500 text-[10px] font-semibold flex items-center gap-1">
                          <Icon icon="lucide:alert-circle" className="w-3.5 h-3.5" />
                          Please ensure all required fields in the batch table are filled.
                        </div>
                      ) : null;
                    }}
                  </Form.Item>
                )}
              </div>
            );
          }}
        </Form.List>
      </div>

      {children}
    </Form>
  );
};

export default InventoryPartForm;
