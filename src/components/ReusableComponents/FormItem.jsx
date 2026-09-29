import React from "react";
import { Form } from "antd";

/**
 * Universal Form Label Component
 * Standardizes typography, font size, tracking, and color for all form field labels across the application.
 * Responsive: smaller on small screens (!text-[10px] sm:!text-xs), medium on large screens (lg:!text-[13px] 2xl:!text-sm).
 */
export const FormLabel = ({ label, children, required }) => (
  <span className="!text-[10px] font-bold capitalize tracking-wide text-slate-600 block">
    {children || label}
    {required && <span className="text-red-500 ml-0.5 font-bold">*</span>}
  </span>
);

/**
 * Standard Input, Select, Textarea, and Radio Group CSS classes
 * Standardized 32px height, 100% width, and identical styling across all field types.
 */
export const INPUT_CLASS =
  "!w-full px-1 py-1 rounded-md border border-gray-200 bg-gray-50/50 !text-[10px] font-medium transition-all focus:bg-white placeholder:!text-slate-400 placeholder:!font-normal disabled:!text-slate-600 disabled:!font-semibold disabled:!-webkit-text-fill-color-[unset]";

export const SELECT_CLASS =
  "!w-full !text-[10px] font-medium [&_.ant-select-selector]:!rounded-md [&_.ant-select-selector]:!border-gray-200 [&_.ant-select-selector]:!bg-gray-50/50 [&_.ant-select-selection-item]:!leading-[26px] [&_.ant-select-selection-placeholder]:!text-slate-400 [&_.ant-select-selection-placeholder]:!font-normal [&.ant-select-disabled_.ant-select-selection-item]:!text-slate-600 [&.ant-select-disabled_.ant-select-selection-item]:!font-semibold";

export const TEXTAREA_CLASS =
  "!w-full rounded-md border border-gray-200 bg-gray-50/50 !text-[10px] font-medium transition-all focus:bg-white placeholder:!text-slate-400 placeholder:!font-normal disabled:!text-slate-600 disabled:!font-semibold disabled:!-webkit-text-fill-color-[unset]";

export const RADIO_GROUP_CLASS =
  "flex flex-wrap items-center gap-2 !text-[10px] [&_.ant-radio-wrapper]:!text-[10px] [&_.ant-radio-wrapper]:!font-medium";

export const DATE_PICKER_CLASS =
  "!h-7 !w-full rounded-md border border-gray-200 bg-gray-50/50 !text-[10px] font-medium transition-all focus:bg-white [&_.ant-picker-input_input]:!text-[10px] [&_.ant-picker-input_input]:!font-medium [&_.ant-picker-input_input::placeholder]:!text-slate-400 [&_.ant-picker-input_input::placeholder]:!font-normal [&.ant-picker-disabled_input]:!text-slate-900 [&.ant-picker-disabled_input]:!font-bold [&.ant-picker-disabled_input]:!-webkit-text-fill-color-[unset]";

export const DISABLE_INPUT_CLASS =
  "!bg-gray-100 !text-slate-400 font-medium cursor-not-allowed select-none pointer-events-none";

export const disableInput = DISABLE_INPUT_CLASS;
export const DISABLED_INPUT_CLASS = DISABLE_INPUT_CLASS;

const GRID_FORM_PADDING = "!mb-2";

/**
 * Universal Styled Form Item Component
 * Wraps Ant Design Form.Item with standardized label typography and responsive vertical margin.
 */
export const StyledFormItem = ({
  label,
  children,
  className = "",
  grid_form_padding = true,
  required,
  rules,
  ...props
}) => {
  const isRequired =
    required || (Array.isArray(rules) && rules.some((r) => r && r.required));

  return (
    <Form.Item
      label={
        typeof label === "string" ? (
          <FormLabel label={label} required={isRequired} />
        ) : (
          label
        )
      }
      rules={rules}
      className={`${grid_form_padding ? GRID_FORM_PADDING : ""} [&_.ant-form-item-label]:!pb-0 [&_.ant-form-item-label]:!mb-0 [&_.ant-form-item-label>label]:!h-auto [&_.ant-form-item-label>label]:!leading-tight [&_.ant-form-item-explain-error]:!text-[10px] [&_.ant-form-item-explain-error]:!leading-[12px] [&_.ant-form-item-explain-error]:!mt-0.5 [&_.ant-form-item-required::before]:!hidden ${className}`}
      {...props}
    >
      {children}
    </Form.Item>
  );
};

export default StyledFormItem;
