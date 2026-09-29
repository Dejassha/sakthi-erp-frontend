import React, { useMemo } from "react";
import { Select, Input } from "antd";
import StyledFormItem, {
  INPUT_CLASS,
  SELECT_CLASS,
} from "@/components/ReusableComponents/FormItem";

/**
 * ProgramerStep1 Component
 * Renders Step 1 of the Programmer form: Material selection, Program number, and Program date.
 *
 * @param {Object} props
 * @param {Array} props.materials - List of material objects retrieved for the product.
 */
const ProgramerStep1 = ({ materials = [] }) => {
  // Memoize select options to avoid unnecessary re-calculations on re-render
  const materialOptions = useMemo(() => {
    return materials
      .filter((mat) => mat.programer_status === "pending")
      .map((mat) => ({
        label: `MT- ${mat.mat_type} / T- ${Number(mat.thick || 0)}mm / W- ${Number(mat.width || 0)}mm / L- ${Number(mat.length || 0)}mm / Qty- ${Number(mat.quantity || 0)}`,
        value: mat.id,
      }));
  }, [materials]);

  return (
    <div className="bg-white p-4 shadow-sm border border-gray-200 rounded-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2">
        <StyledFormItem
          name="material_details"
          label="Material Selection"
          rules={[
            {
              required: true,
              message: "Please select a material",
            },
          ]}
        >
          <Select
            placeholder="Select Material"
            className={`w-full ${SELECT_CLASS}`}
            options={materialOptions}
          />
        </StyledFormItem>

        <StyledFormItem
          name="program_no"
          label="Program No"
          normalize={(val) =>
            val
              ? String(val)
                  .toUpperCase()
                  .replace(/[^A-Z0-9\-_.,]/g, "")
              : ""
          }
          rules={[{ required: true, message: "Please enter program number" }]}
        >
          <Input
            placeholder="Enter program number"
            className={`${INPUT_CLASS}`}
          />
        </StyledFormItem>

        <StyledFormItem
          name="program_date"
          label="Program Date"
          rules={[{ required: true, message: "Please select program date" }]}
        >
          <Input type="date" className={INPUT_CLASS} />
        </StyledFormItem>
      </div>
    </div>
  );
};

export default React.memo(ProgramerStep1);
