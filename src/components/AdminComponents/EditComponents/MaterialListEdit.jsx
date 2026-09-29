import React, { useMemo, useState, useEffect } from "react";
import {
  Form,
  Input,
  Select,
  Modal,
  Typography,
  message,
  Popconfirm,
  Table,
} from "antd";
import { Icon } from "@iconify/react";
import { Save, Trash2, ArrowLeft } from "lucide-react";
import {
  useUpdateProductDetailsMutation,
  useGetMaterialTypeQuery,
} from "@/store/services/inward.api";
import LoadingState from "@/pages/errorPage/LoadingState";
import { validateMaterialRow } from "@/pages/Inward_Page/utils/inwardTableValidations";
import { initialMaterialRow } from "@/store/slices/inwardSlice";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import GlobalButton from "@/components/ReusableComponents/Button";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import StyledFormItem, {
  INPUT_CLASS,
  DISABLE_INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";

const { Title } = Typography;
const MaterialListEdit = ({ productId, initialMaterials, onBack }) => {
  const [form] = Form.useForm();
  const [isSaving, setIsSaving] = useState(false);
  const [confirmValues, setConfirmValues] = useState(null);
  const { data: materialTypes = [] } = useGetMaterialTypeQuery(undefined);
  const [updateProductDetails] = useUpdateProductDetailsMutation();
  const MaterialDensities = useMemo(
    () =>
      materialTypes.reduce((acc, item) => {
        acc[item.material_name] = item.density_value;
        return acc;
      }, {}),
    [materialTypes],
  );
  const Tec = useMemo(
    () => materialTypes.map((d) => d.material_name),
    [materialTypes],
  );
  useEffect(() => {
    if (initialMaterials) {
      form.setFieldsValue({ materials: initialMaterials });
    }
  }, [initialMaterials, form]);
  const handleChange = (changedValues, allValues) => {
    if (changedValues.materials) {
      const updatedMaterials = [...allValues.materials];
      const changedIndex = changedValues.materials.findIndex(
        (m) => m !== undefined,
      );
      if (changedIndex !== -1) {
        const mat = updatedMaterials[changedIndex];
        const changedFields = changedValues.materials[changedIndex];
        updatedMaterials[changedIndex] = validateMaterialRow(
          mat,
          changedFields,
          MaterialDensities,
        );
        form.setFieldsValue({ materials: updatedMaterials });
      }
    }
  };
  const handleUpdate = async (values) => {
    setIsSaving(true);
    const key = "update_materials";
    message.loading({ content: "Syncing materials...", key, duration: 0 });
    try {
      // Harden the payload: Merge form values with initial material objects to preserve IDs and nested data
      const hardenedMaterials = values.materials.map((m) => {
        // Find if this is an existing material
        const originalMat = initialMaterials.find(
          (orig) => orig.id !== undefined && orig.id === m.id,
        );
        return {
          ...originalMat, // Start with ALL original fields (including IDs, status, and nested details)
          ...m, // Overwrite with current form values
          // Explicitly cast numeric fields to ensure backend compatibility
          thick: Number(m.thick),
          width: Number(m.width),
          length: Number(m.length),
          quantity: Number(m.quantity),
          density: Number(m.density),
          unit_weight: Number(m.unit_weight),
          total_weight: Number(m.total_weight),
          total_length: Number(m.total_length),
          total_width: Number(m.total_width),
          remarks: m.remarks || "",
        };
      });
      const payload = {
        materials: hardenedMaterials,
      };
      console.log("Syncing Materials Payload:", payload);
      await updateProductDetails({
        product_id: productId,
        body: payload,
      }).unwrap();
      message.success({
        content: "Materials updated successfully",
        key,
        duration: 2,
      });
    } catch (err) {
      console.error("Update failed:", err);
      message.error({
        content: "Failed to update materials",
        key,
        duration: 3,
      });
    } finally {
      setIsSaving(false);
    }
  };
  const watchedMaterials = Form.useWatch("materials", form) || [];

  const getColumns = (fieldsLength, add, remove) => [
    {
      title: "S.No",
      key: "s_no",
      width: 40,
      align: "center",
      className: "!p-1 border-r border-gray-200 text-[11px] font-medium text-gray-700",
      render: (_, __, index) => index + 1,
    },
    {
      title: "UID No",
      key: "uid_no",
      width: 80,
      align: "center",
      className: "!p-1 border-r border-gray-200",
      render: (_, record) => (
        <StyledFormItem
          grid_form_padding={false}
          {...record.restField}
          name={[record.name, "uid_no"]}
          normalize={(val) =>
            val
              ? String(val)
                  .toUpperCase()
                  .trim()
                  .replace(/[^A-Z0-9]/g, "")
              : ""
          }
          noStyle
        >
          <Input
            placeholder="UID"
            className="w-full !text-[10px] text-center uppercase font-medium border-gray-200 rounded-md py-1 !px-1 focus:bg-white"
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Heat No",
      key: "heat_no",
      width: 80,
      align: "center",
      className: "!p-1 border-r border-gray-200",
      render: (_, record) => (
        <StyledFormItem
          grid_form_padding={false}
          {...record.restField}
          name={[record.name, "heat_no"]}
          normalize={(val) =>
            val
              ? String(val)
                  .toUpperCase()
                  .trim()
                  .replace(/[^A-Z0-9]/g, "")
              : ""
          }
          noStyle
        >
          <Input
            placeholder="Heat"
            className="w-full !text-[10px] text-center uppercase font-medium border-gray-200 rounded-md py-1 !px-1 focus:bg-white"
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Bay",
      key: "bay",
      width: 70,
      align: "center",
      className: "!p-1 border-r border-gray-200",
      render: (_, record) => (
        <StyledFormItem
          grid_form_padding={false}
          {...record.restField}
          name={[record.name, "bay"]}
          normalize={(val) => (val || "").toUpperCase().trimStart()}
          noStyle
        >
          {/* Hidden fields needed for Edit mode */}
          <Form.Item {...record.restField} name={[record.name, "id"]} hidden><Input /></Form.Item>
          <Form.Item {...record.restField} name={[record.name, "programer_status"]} hidden><Input /></Form.Item>
          <Form.Item {...record.restField} name={[record.name, "qa_status"]} hidden><Input /></Form.Item>
          <Form.Item {...record.restField} name={[record.name, "acc_status"]} hidden><Input /></Form.Item>
          <Form.Item {...record.restField} name={[record.name, "created_at"]} hidden><Input /></Form.Item>
          <Form.Item {...record.restField} name={[record.name, "created_by"]} hidden><Input /></Form.Item>
          <Form.Item {...record.restField} name={[record.name, "total_length"]} hidden><Input /></Form.Item>
          <Form.Item {...record.restField} name={[record.name, "total_width"]} hidden><Input /></Form.Item>
          
          <Input
            placeholder="Bay"
            className="w-full !text-[10px] text-center uppercase border-gray-200 rounded-md py-1 !px-1 focus:bg-white"
          />
        </StyledFormItem>
      ),
    },
    {
      title: "TEC",
      key: "mat_type",
      width: 70,
      align: "center",
      className: "!p-1 border-r border-gray-200",
      render: (_, record) => (
        <StyledFormItem
          grid_form_padding={false}
          {...record.restField}
          name={[record.name, "mat_type"]}
          normalize={(val) => val || undefined}
          rules={[{ required: true, message: "" }]}
          className="m-0"
          style={{ marginBottom: 0 }}
        >
          <Select
            placeholder="Select Mat"
            options={Tec.map((type) => ({ label: type, value: type }))}
            className="w-full !text-[10px] text-center"
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Grade",
      key: "mat_grade",
      width: 80,
      align: "center",
      className: "!p-1 border-r border-gray-200",
      render: (_, record) => (
        <StyledFormItem
          grid_form_padding={false}
          {...record.restField}
          name={[record.name, "mat_grade"]}
          normalize={(val) => (val || "").toUpperCase().trimStart()}
          noStyle
        >
          <Input
            placeholder="Grade"
            className="w-full !text-[10px] text-center uppercase border-gray-200 rounded-md py-1 !px-1 focus:bg-white"
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Thick x Width X Length X Density = Unit Weight",
      key: "dimensions",
      width: 420,
      align: "center",
      className: "!p-1 border-r border-gray-200",
      render: (_, record) => (
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-0.5 px-0.5 py-0.5 w-full">
          <div className="flex items-center">
            <StyledFormItem
              grid_form_padding={false}
              {...record.restField}
              name={[record.name, "thick"]}
              rules={[
                { required: true, message: "" },
                {
                  validator: (_, value) =>
                    Number(value) > 0
                      ? Promise.resolve()
                      : Promise.reject(new Error("")),
                },
              ]}
              style={{ marginBottom: 0 }}
            >
              <Input
                inputMode="decimal"
                placeholder="Thick"
                className="!min-w-12 border border-gray-200 rounded-md !text-[10px] text-center py-1 !px-1 focus:bg-white"
              />
            </StyledFormItem>
            <span className="ml-0.5 font-semibold text-slate-400 text-[10px]">
              ×
            </span>
          </div>

          <div className="flex items-center">
            <StyledFormItem
              grid_form_padding={false}
              {...record.restField}
              name={[record.name, "width"]}
              rules={[
                { required: true, message: "" },
                {
                  validator: (_, value) =>
                    Number(value) > 0
                      ? Promise.resolve()
                      : Promise.reject(new Error("")),
                },
              ]}
              style={{ marginBottom: 0 }}
            >
              <Input
                inputMode="decimal"
                placeholder="Width"
                className="!min-w-14 border border-gray-200 rounded-md !text-[10px] text-center py-1 !px-1 focus:bg-white"
              />
            </StyledFormItem>
            <span className="ml-0.5 font-semibold text-slate-400 text-[10px]">
              ×
            </span>
          </div>

          <div className="flex items-center">
            <StyledFormItem
              grid_form_padding={false}
              {...record.restField}
              name={[record.name, "length"]}
              normalize={(val) =>
                val ? String(val).trim().replace(/[^0-9.]/g, "") : ""
              }
              rules={[
                { required: true, message: "" },
                {
                  validator: (_, value) =>
                    Number(value) > 0
                      ? Promise.resolve()
                      : Promise.reject(new Error("")),
                },
              ]}
              style={{ marginBottom: 0 }}
            >
              <Input
                inputMode="decimal"
                placeholder="Length"
                className="!min-w-14 border border-gray-200 rounded-md !text-[10px] text-center py-1 !px-1 focus:bg-white"
              />
            </StyledFormItem>
          </div>

          <span className="mx-0.5 text-slate-400 font-semibold text-[10px]">
            ×
          </span>

          <StyledFormItem
            grid_form_padding={false}
            {...record.restField}
            name={[record.name, "density"]}
            noStyle
          >
            <Input
              readOnly
              disabled
              tabIndex={-1}
              placeholder="Density"
              className={`${INPUT_CLASS} !w-32 !text-center ${DISABLE_INPUT_CLASS}`}
            />
          </StyledFormItem>

          <span className="mx-0.5 text-slate-400 font-semibold text-[10px]">
            =
          </span>

          <StyledFormItem
            grid_form_padding={false}
            {...record.restField}
            name={[record.name, "unit_weight"]}
            noStyle
          >
            <Input
              readOnly
              disabled
              tabIndex={-1}
              placeholder="Unit Wt."
              className={`${INPUT_CLASS} !w-32 !text-center !text-gray-900 !font-bold ${DISABLE_INPUT_CLASS}`}
            />
          </StyledFormItem>
        </div>
      ),
    },
    {
      title: "Qty",
      key: "quantity",
      width: 65,
      align: "center",
      className: "!p-1 border-r border-gray-200",
      render: (_, record) => (
        <StyledFormItem
          grid_form_padding={false}
          {...record.restField}
          name={[record.name, "quantity"]}
          normalize={(val) =>
            val ? String(val).trim().replace(/[^0-9.]/g, "") : ""
          }
          rules={[
            { required: true, message: "" },
            {
              validator: (_, value) =>
                Number(value) > 0
                  ? Promise.resolve()
                  : Promise.reject(new Error("")),
            },
          ]}
          noStyle
        >
          <Input
            placeholder="0"
            className={`${INPUT_CLASS} !text-center`}
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Total Weight",
      key: "total_weight",
      width: 95,
      align: "center",
      className: "!p-1 border-r border-gray-200",
      render: (_, record) => (
        <StyledFormItem
          grid_form_padding={false}
          {...record.restField}
          name={[record.name, "total_weight"]}
          noStyle
        >
          <Input
            readOnly
            disabled
            tabIndex={-1}
            placeholder="Total Wt"
            className={`${INPUT_CLASS} !text-center !font-semibold !text-gray-600 ${DISABLE_INPUT_CLASS}`}
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Stock Due",
      key: "stock_due",
      width: 75,
      align: "center",
      className: "!p-1 border-r border-gray-200",
      render: (_, record) => (
        <StyledFormItem
          grid_form_padding={false}
          {...record.restField}
          name={[record.name, "stock_due"]}
          normalize={(val) => (val ? String(val).trim().replace(/\D/g, "") : "")}
          rules={[{ required: true, message: "" }]}
          noStyle
        >
          <Input
            placeholder="Days"
            className="w-full !text-[10px] text-center border-gray-200 rounded-md py-1 !px-1 focus:bg-white"
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Remarks",
      key: "remarks",
      width: 140,
      align: "center",
      className: "!p-1 border-r border-gray-200",
      render: (_, record, index) => (
        <StyledFormItem
          grid_form_padding={false}
          {...record.restField}
          name={[record.name, "remarks"]}
          normalize={(val) => (val || "").trimStart()}
          noStyle
        >
          <Input
            placeholder="Optional"
            className="w-full !text-[10px] border-gray-200 rounded-md py-1 !px-1 focus:bg-white"
            onKeyDown={(e) => {
              if (
                e.key === "Tab" &&
                !e.shiftKey &&
                index === fieldsLength - 1
              ) {
                e.preventDefault();
                add(initialMaterialRow);
              }
            }}
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 50,
      align: "center",
      fixed: "right",
      className: "!p-1",
      render: (_, record) => (
        <button
          type="button"
          disabled={fieldsLength <= 1}
          onClick={() => {
            if (fieldsLength > 1) {
              remove(record.name);
            }
          }}
          className={`p-1 rounded-md transition-all ${fieldsLength <= 1
            ? "text-gray-300 cursor-not-allowed"
            : "text-red-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
            }`}
          title={fieldsLength <= 1 ? "Minimum 1 row required" : "Remove Row"}
        >
          <Icon icon="lucide:trash-2" className="w-3 h-3 mx-auto" />
        </button>
      ),
    },
  ];

  return (
    <div className="bg-white">
      <Form
        form={form}
        name="material_form_edit"
        onValuesChange={handleChange}
        onFinish={(values) => setConfirmValues(values)}
        autoComplete="off"
        className="w-full"
      >
        <div className="pb-4">
          <PageHeader
            title="Manage Product Materials"
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
                <GlobalButton
                  type="submit"
                  color="blue"
                  disabled={isSaving}
                  icon="lucide:save"
                >
                  Save Materials
                </GlobalButton>
              </div>
            }
          />
        </div>

        <Form.List name="materials">
          {(fields, { add, remove }) => {
            const tableData = fields.map(({ key, name, ...restField }, index) => ({
              key,
              name,
              restField,
              ...(watchedMaterials[index] || {}),
            }));

            return (
              <>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                    <Icon icon="lucide:layers" className="w-4 h-4 text-slate-600" />
                    <span>Material Items ({fields.length})</span>
                  </div>

                  <GlobalButton
                    type="button"
                    color="green"
                    size="xs"
                    icon="lucide:plus"
                    onClick={() => add(initialMaterialRow)}
                  >
                    Add Row
                  </GlobalButton>
                </div>

                <div className="overflow-x-auto rounded-sm border border-gray-200 scrollbar-hide shadow-xs">
                  <Table
                    dataSource={tableData}
                    columns={getColumns(fields.length, add, remove)}
                    pagination={false}
                    bordered
                    size="small"
                    rowKey={(record) => record.key}
                    className="[&_.ant-table-thead_th]:!bg-gray-200 [&_.ant-table-thead_th]:!text-gray-600 [&_.ant-table-thead_th]:!text-[10px] 2xl:[&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-semibold [&_.ant-table-thead_th]:!text-center [&_.ant-table-thead_th]:!py-1 [&_.ant-table-thead_th]:!px-1.5"
                  />
                </div>

                <Form.Item shouldUpdate className="m-0 p-0 mt-2">
                  {() => {
                    const errors = form.getFieldsError();
                    const hasErrors = errors.some(
                      (err) => err.errors.length > 0
                    );
                    return hasErrors ? (
                      <div className="text-red-500 text-[11px] font-semibold flex items-center gap-1">
                        <Icon icon="lucide:alert-circle" className="w-3.5 h-3.5" />
                        Please ensure all required fields are filled with values greater than 0.
                      </div>
                    ) : null;
                  }}
                </Form.Item>
              </>
            );
          }}
        </Form.List>
      </Form>

      <GlobalModal
        open={!!confirmValues}
        title="Confirm Materials Sync"
        description="Are you sure you want to permanently update the material line items for this product?"
        onCancel={() => setConfirmValues(null)}
        onConfirm={() => {
          handleUpdate(confirmValues);
          setConfirmValues(null);
        }}
        confirmText="Save Materials"
        cancelText="Cancel"
      />

      {isSaving ? (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <LoadingState message="Syncing materials..." fullPage={false} />
        </div>
      ) : null}
    </div>
  );
};
export default MaterialListEdit;
