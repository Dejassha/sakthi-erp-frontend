import React from "react";
import { Form, Input } from "antd";
import StyledFormItem, {
  INPUT_CLASS,
  DISABLE_INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";

/**
 * Prevents non-numeric characters (e, E, +, -) from being typed into numeric inputs.
 */
const preventInvalidNumberInput = (e) => {
  if (["e", "E", "+", "-"].includes(e.key)) {
    e.preventDefault();
  }
};

/**
 * ProgramerStep2 Component
 * Renders Step 2 of the Programmer form: Quantities, Weights, Sheet counts, Dimensions, and Timings.
 *
 * @param {Object} props
 * @param {Function} props.validateNonNegative - Custom validator ensuring values > 0.
 * @param {Function} props.validateProcessedQuantity - Custom validator for max quantity.
 * @param {Function} props.validateProcessedWidth - Custom validator for max width.
 * @param {Function} props.validateProcessedLength - Custom validator for max length.
 */
const ProgramerStep2 = ({
  validateNonNegative,
  validateProcessedQuantity,
  validateProcessedWidth,
  validateProcessedLength,
}) => {
  return (
    <div className="bg-white p-4 shadow-sm border border-gray-200 rounded-sm">
      {/* Dynamic Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-2">
        {/* Quantities & Weights */}
        <StyledFormItem
          name="processed_quantity"
          label="Processed Qty"
          rules={[
            { required: true, message: "Required" },
            { validator: validateNonNegative },
            { validator: validateProcessedQuantity },
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
          <Input
            readOnly
            tabIndex={-1}
            className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`}
          />
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
          label="Total Weight (Kg)"
          className="mb-0"
        >
          <Input
            readOnly
            tabIndex={-1}
            className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`}
          />
        </StyledFormItem>

        {/* Conditional Width & Length Fields (Only visible when Balance Qty > 0) */}
        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) =>
            Number(getFieldValue("balance_quantity")) > 0 ? (
              <>
                <StyledFormItem
                  name="processed_width"
                  label="Proc. Width"
                  rules={[
                    { required: true, message: "Required" },
                    { validator: validateProcessedWidth },
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
                  name="remaining_width"
                  label="Rem. Width"
                  className="mb-0"
                >
                  <Input
                    readOnly
                    tabIndex={-1}
                    className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`}
                  />
                </StyledFormItem>

                <StyledFormItem
                  name="processed_length"
                  label="Proc. Length"
                  rules={[
                    { required: true, message: "Required" },
                    { validator: validateProcessedLength },
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

                <StyledFormItem
                  name="remaining_length"
                  label="Rem. Length"
                  className="mb-0"
                >
                  <Input
                    readOnly
                    tabIndex={-1}
                    className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`}
                  />
                </StyledFormItem>
              </>
            ) : null
          }
        </Form.Item>

        {/* Row 2: Sheet Counts, Piercing, Meters & Hours (8 Items) */}
        <StyledFormItem
          name="number_of_sheets"
          label="Comp. / Sheet"
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
          label="Total Comp. / Sheet"
          className="mb-0"
        >
          <Input
            readOnly
            tabIndex={-1}
            className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`}
          />
        </StyledFormItem>

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
          <Input
            readOnly
            tabIndex={-1}
            className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`}
          />
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
          <Input
            readOnly
            tabIndex={-1}
            className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`}
          />
        </StyledFormItem>

        <StyledFormItem
          name="processed_mins_per_sheet"
          label="Mins / Sheet"
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
          label="Total Hours"
          className="mb-0"
        >
          <Input
            readOnly
            tabIndex={-1}
            className={`${INPUT_CLASS} ${DISABLE_INPUT_CLASS}`}
          />
        </StyledFormItem>
      </div>

      {/* Remarks Section */}
      <div className="w-full sm:w-1/2 lg:w-1/3">
        <StyledFormItem
          name="remarks"
          label="Remarks"
          className="mb-0"
        >
          <Input
            placeholder="Enter optional remarks"
            className={INPUT_CLASS}
          />
        </StyledFormItem>
      </div>
    </div>
  );
};

export default React.memo(ProgramerStep2);
