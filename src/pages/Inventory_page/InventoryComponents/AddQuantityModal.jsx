import React, { useState, useEffect } from "react";
import { Form, Input, Typography, Checkbox, Select, DatePicker } from "antd";
import dayjs from "dayjs";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import {
  StyledFormItem,
  INPUT_CLASS,
  SELECT_CLASS,
  TEXTAREA_CLASS,
  DATE_PICKER_CLASS,
} from "@/components/ReusableComponents/FormItem";
import StockBatchSummary from "./StockBatchSummary";

const { Text } = Typography;

export const AddQuantityModal = ({
  isOpen,
  item,
  form,
  onCancel,
  onConfirm,
  isLoading = false,
}) => {
  const [rateType, setRateType] = useState("previous");

  useEffect(() => {
    if (isOpen && item) {
      setRateType("current");
      const existingBatchesCount = item.group_parts?.length || 1;
      const nextBatchCode = `BAT-${String(existingBatchesCount + 1).padStart(2, "0")}`;

      form.setFieldsValue({
        batch_number: nextBatchCode,
        purchase_date: dayjs(),
        bought_from: item.bought_from || "",
        rate_type: "current",
        selected_rate: item.purchase_price || 0,
        new_rate: undefined,
        add_quantity: undefined,
        remarks: undefined,
      });
    }
  }, [isOpen, item, form]);

  if (!item) return null;

  const itemName = item.item_name || item.part_name || "";

  return (
    <GlobalModal
      open={isOpen}
      title={`Restock Batch / Add Quantity - ${itemName}`}
      onCancel={onCancel}
      onConfirm={() => form.submit()}
      confirmText="Restock Batch"
      confirmIcon="lucide:plus-circle"
      confirmColor="emerald"
      loading={isLoading}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onConfirm}
        requiredMark={false}
      >
        <div className="mb-3 px-3 py-1.5 bg-emerald-50/70 rounded-sm border border-emerald-100 flex flex-wrap items-center justify-between gap-4 text-[12px]">
          <div>
            <span className="text-gray-500">Current Total: </span>
            <strong className="text-gray-800 font-semibold">
              {item.stock_quantity} {item.unit || "pcs"}
            </strong>
          </div>
          <div>
            <span className="text-gray-500">Used: </span>
            <strong className="text-amber-700 font-semibold">
              {item.used_quantity || 0} {item.unit || "pcs"}
            </strong>
          </div>
          <div>
            <span className="text-gray-500">Currently Available: </span>
            <strong className="text-emerald-700 font-semibold">
              {item.available_quantity} {item.unit || "pcs"}
            </strong>
          </div>
        </div>

        <StockBatchSummary
          batches={item.group_parts || []}
          unit={item.unit || "pcs"}
          totalAvailable={item.available_quantity}
          variant="modal"
          className="mb-3"
        />

        <Form.Item name="rate_type" noStyle>
          <Input type="hidden" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <StyledFormItem
            name="batch_number"
            label="Restock Batch Number"
            rules={[{ required: true, message: "Please enter batch number" }]}
            className="mb-0"
            normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
          >
            <Input
              placeholder="e.g. BAT-02 or LOT-9821"
              className={INPUT_CLASS}
            />
          </StyledFormItem>

          <StyledFormItem
            name="purchase_date"
            label="Inward / Purchase Date"
            rules={[{ required: true, message: "Please select inward date" }]}
            className="mb-0"
          >
            <DatePicker
              format="YYYY-MM-DD"
              className={DATE_PICKER_CLASS}
              style={{ width: "100%" }}
            />
          </StyledFormItem>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-3">
          <StyledFormItem label="Rate Option" className="mb-0">
            <div className="flex gap-2 items-center pt-1">
              <Checkbox
                checked={rateType === "current"}
                onChange={(e) => {
                  if (e.target.checked) {
                    setRateType("current");
                    form.setFieldValue("rate_type", "current");
                  }
                }}
                className="!inline-flex !items-center"
              >
                <span className="text-xs font-medium text-gray-700">Current Rate</span>
              </Checkbox>
              <Checkbox
                checked={rateType === "new"}
                onChange={(e) => {
                  if (e.target.checked) {
                    setRateType("new");
                    form.setFieldValue("rate_type", "new");
                  }
                }}
                className="!inline-flex !items-center"
              >
                <span className="text-xs font-medium text-gray-700">New Rate</span>
              </Checkbox>
            </div>
          </StyledFormItem>

          {rateType === "current" ? (
            <StyledFormItem
              name="selected_rate"
              label="Current Rate per Quantity (₹)"
              rules={[
                {
                  required: true,
                  message: "Please select rate",
                },
              ]}
              className="mb-0"
            >
              <Select
                placeholder="Select rate"
                className={SELECT_CLASS}
                options={Array.from(
                  new Set(
                    (item.rate_history && item.rate_history.length > 0
                      ? item.rate_history
                      : [item.purchase_price || 0]
                    )
                      .map((r) => Number(r))
                      .filter((r) => !isNaN(r) && r !== null && r !== undefined),
                  ),
                ).map((r) => ({
                  label: `₹${r}`,
                  value: r,
                }))}
              />
            </StyledFormItem>
          ) : (
            <StyledFormItem
              name="new_rate"
              label="New Rate per Quantity (₹)"
              normalize={(value) =>
                value !== undefined && value !== null
                  ? String(value)
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./g, "$1")
                  : ""
              }
              rules={[
                { required: true, message: "Please enter new rate" },
                {
                  validator: (_, value) =>
                    value !== undefined && Number(value) >= 0
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error("Rate must be greater than or equal to 0"),
                        ),
                },
              ]}
              className="mb-0"
            >
              <Input
                type="number"
                min={0}
                placeholder="Enter new rate (e.g. 150)"
                className={INPUT_CLASS}
              />
            </StyledFormItem>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-3">
          <StyledFormItem
            name="add_quantity"
            label={`Quantity to Add (${item.unit || "PCS"})`}
            normalize={(value) =>
              value !== undefined && value !== null
                ? String(value).split(".")[0].replace(/[^0-9]/g, "")
                : ""
            }
            rules={[
              { required: true, message: "Please enter quantity to add" },
              {
                validator: (_, value) =>
                  value && Number(value) > 0
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error("Quantity to add must be greater than 0"),
                      ),
              },
            ]}
            className="mb-0"
          >
            <Input
              type="number"
              min={1}
              placeholder="Enter quantity (e.g. 50)"
              className={INPUT_CLASS}
              onKeyDown={(e) =>
                ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()
              }
            />
          </StyledFormItem>

          <StyledFormItem
            name="bought_from"
            label="Bought From / Vendor"
            className="mb-0"
            normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
          >
            <Input
              placeholder="e.g. Acme Spares Ltd"
              className={INPUT_CLASS}
            />
          </StyledFormItem>
        </div>

        <div className="mt-3">
          <StyledFormItem
            name="remarks"
            label="Remarks / Note"
            className="mb-0"
            normalize={(val) => (typeof val === "string" ? val.toUpperCase() : val)}
          >
            <Input
              placeholder="e.g. Restocked batch from vendor"
              className={INPUT_CLASS}
            />
          </StyledFormItem>
        </div>
      </Form>
    </GlobalModal>
  );
};
