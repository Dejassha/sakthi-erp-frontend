import React from "react";
import { Form, Input, Alert } from "antd";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import {
  StyledFormItem,
  TEXTAREA_CLASS,
} from "@/components/ReusableComponents/FormItem";

export const DeletePartModal = ({
  isOpen,
  item,
  form,
  onCancel,
  onConfirm,
  isLoading = false,
}) => {
  const itemName = item?.item_name || item?.part_name || "";

  return (
    <GlobalModal
      open={isOpen}
      title="Delete Inventory Item"
      onCancel={onCancel}
      onConfirm={() => form.submit()}
      confirmText="Delete Item"
      confirmIcon="lucide:trash-2"
      confirmColor="red"
      loading={isLoading}
      width={550}
    >
      {item ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={onConfirm}
          requiredMark={false}
          className="space-y-3"
        >


          <StyledFormItem
            name="remarks"
            label="Reason / Remarks for Deletion"
            rules={[
              {
                required: true,
                message:
                  "Please provide a mandatory remark for deleting this item.",
              },
            ]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Enter deletion reason (e.g., Scrapped, Damaged during operation, Duplicate record...)"
              className={TEXTAREA_CLASS}
            />
          </StyledFormItem>
        </Form>
      ) : null}
    </GlobalModal>
  );
};
