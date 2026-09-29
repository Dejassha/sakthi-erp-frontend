import { useEffect, useMemo, useCallback } from "react";
// Antd
import { Form, Input, Select, Table } from "antd";
// Iconify
import { Icon } from "@iconify/react";
// RTK Query
import { useGetMaterialTypeQuery } from "@/store/services/inward.api";
// Redux Slice
import { initialMaterialRow } from "@/store/slices/inwardSlice";
// Reusable components
import StyledFormItem, {
  INPUT_CLASS,
  SELECT_CLASS,
  DISABLE_INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";
import Button from "@/components/ReusableComponents/Button";
// Utils
import { validateMaterialRow } from "../utils/inwardTableValidations";

const InwardTable = ({ form: propForm, formData, setFormData, onNextStep }) => {
  // Ant design form instance
  const [createdForm] = Form.useForm();
  const form = propForm || createdForm;

  // Watch materials so the table updates dynamically on calculated field changes
  const watchedMaterials = Form.useWatch("materials", form) || [];

  // RTK Query hook with explicit state handling
  const {
    data: items = [],
    isLoading: isMaterialTypeLoading,
    isError: isMaterialTypeError,
  } = useGetMaterialTypeQuery(undefined);

  // Memoized material densities mapping
  const materialDensities = useMemo(() => {
    return items.reduce((acc, item) => {
      acc[item.material_name] = item.density_value;
      return acc;
    }, {});
  }, [items]);

  // Memoized material type / TEC dropdown options list
  const materialOptions = useMemo(
    () => items.map((item) => ({ label: item.material_name, value: item.material_name })),
    [items]
  );

  // Sync Redux global state materials into the AntD form instance
  useEffect(() => {
    if (formData?.materials?.length) {
      const sanitizedMaterials = formData.materials.map((m) => ({
        ...m,
        mat_type: m.mat_type || undefined,
      }));
      form.setFieldsValue({ materials: sanitizedMaterials });
    }
  }, [form, formData.materials]);

  // Antd Form onValuesChange Handler wrapped in useCallback
  const handleChange = useCallback(
    (changedValues, allValues) => {
      if (changedValues?.materials && allValues?.materials) {
        const updatedMaterials = [...allValues.materials];
        const changedIndex = changedValues.materials.findIndex(
          (m) => m !== undefined
        );

        if (changedIndex !== -1) {
          const mat = updatedMaterials[changedIndex];
          const changedFields = changedValues.materials[changedIndex];
          updatedMaterials[changedIndex] = validateMaterialRow(
            mat,
            changedFields,
            materialDensities
          );
          form.setFieldsValue({ materials: updatedMaterials });
          setFormData({ materials: updatedMaterials });
        }
      }
    },
    [form, materialDensities, setFormData]
  );

  const onFinish = () => {
    if (onNextStep) {
      onNextStep();
    }
  };

  // Build Antd Table Columns
  const getColumns = (fieldsLength, add, remove) => [
    {
      title: "S.No",
      key: "s_no",
      flex: 0.1,
      minWidth: 20,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[10px] font-medium text-gray-700",
      render: (_, __, index) => index + 1,
    },
    {
      title: "UID No",
      key: "uid_no",
      flex: 0.2,
      minWidth: 70,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[10px] font-medium text-gray-700",
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
            className={`${INPUT_CLASS} !text-center !px-1`}
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Heat No",
      key: "heat_no",
      flex: 0.2,
      minWidth: 70,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[10px] font-medium text-gray-700",
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
            className={`${INPUT_CLASS} !text-center !px-1`}
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Bay",
      key: "bay",
      flex: 0.2,
      minWidth: 70,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[10px] font-medium text-gray-700",
      render: (_, record) => (
        <StyledFormItem
          grid_form_padding={false}
          {...record.restField}
          name={[record.name, "bay"]}
          normalize={(val) => (val || "").toUpperCase().trimStart()}
          noStyle
        >
          <Input
            placeholder="Bay"
            className={`${INPUT_CLASS} !text-center !px-1`}
          />
        </StyledFormItem>
      ),
    },
    {
      title: "TEC",
      key: "mat_type",
      flex: 0.3,
      minWidth: 70,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[10px] font-medium text-gray-700",
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
            loading={isMaterialTypeLoading}
            disabled={isMaterialTypeLoading}
            placeholder={
              isMaterialTypeLoading
                ? "Loading..."
                : isMaterialTypeError
                  ? "Error"
                  : "Select Mat"
            }
            options={materialOptions}
            className={SELECT_CLASS}
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Grade",
      key: "mat_grade",
      flex: 0.2,
      minWidth: 70,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[10px] font-medium text-gray-700",
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
            className={`${INPUT_CLASS} !text-center !px-1`}
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Thick x Width X Length X Density = Unit Weight",
      key: "dimensions",
      flex: 0.5,
      minWidth: 200,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[10px] font-medium text-gray-700",
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
              noStyle
            >
              <Input
                inputMode="decimal"
                placeholder="Thick"
                className={`${INPUT_CLASS} !min-w-10 !text-center !px-1`}
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
              noStyle
            >
              <Input
                inputMode="decimal"
                placeholder="Width"
                className={`${INPUT_CLASS} !min-w-11 !text-center !px-1`}
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
              noStyle
            >
              <Input
                inputMode="decimal"
                placeholder="Length"
                className={`${INPUT_CLASS} !min-w-11 !text-center !px-1`}
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
              className={`${INPUT_CLASS} !min-w-18 !text-center !px-1 ${DISABLE_INPUT_CLASS}`}
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
              className={`${INPUT_CLASS} !min-w-16 !text-center !px-1 ${DISABLE_INPUT_CLASS}`}
            />
          </StyledFormItem>
        </div>
      ),
    },
    {
      title: "Qty",
      key: "quantity",
      flex: 0.3,
      minWidth: 50,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[10px] font-medium text-gray-700",
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
            className={`${INPUT_CLASS} !text-center !px-1`}
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Total Weight",
      key: "total_weight",
      flex: 0.4,
      minWidth: 70,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[10px] font-medium text-gray-700",
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
            className={`${INPUT_CLASS} !text-center !px-1 ${DISABLE_INPUT_CLASS}`}
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Stock Due",
      key: "stock_due",
      flex: 0.3,
      minWidth: 55,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[10px] font-medium text-gray-700",
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
            className={`${INPUT_CLASS} !text-center !px-1`}
          />
        </StyledFormItem>
      ),
    },
    {
      title: "Remarks",
      key: "remarks",
      flex: 0.5,
      minWidth: 150,
      align: "center",
      className: "!p-1 border-r border-gray-200 !text-[10px] font-medium text-gray-700",
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
            className={INPUT_CLASS}
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
              const updatedMaterials = form.getFieldValue("materials");
              setFormData({ materials: updatedMaterials });
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
    <div>
      <Form
        form={form}
        name="material_form"
        onValuesChange={handleChange}
        onFinish={onFinish}
        autoComplete="off"
        validateTrigger={["onChange", "onBlur"]}
        className="w-full"
      >
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
                {/* Top Right Action Header */}
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                    <Icon icon="lucide:layers" className="w-4 h-4 text-slate-600" />
                    <span>Material Items ({fields.length})</span>
                  </div>

                  <Button
                    type="button"
                    color="green"
                    size="xs"
                    icon="lucide:plus"
                    onClick={() => {
                      add(initialMaterialRow);
                      setTimeout(() => {
                        setFormData({
                          materials: form.getFieldValue("materials"),
                        });
                      }, 50);
                    }}
                  >
                    Add Row
                  </Button>
                </div>

                {/* Antd Table Container */}
                <div className="overflow-x-auto rounded-sm border border-gray-200 scrollbar-hide shadow-xs">
                  <Table
                    // tableLayout="fixed"
                    //   scroll={{ x: "max-content" }}
                    dataSource={tableData}
                    columns={getColumns(fields.length, add, remove)}
                    pagination={false}
                    bordered
                    size="small"
                    rowKey={(record) => record.key}
                    className="[&_.ant-table-thead_th]:!bg-gray-200 [&_.ant-table-thead_th]:!text-gray-600 [&_.ant-table-thead_th]:!text-[10px] 2xl:[&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-semibold [&_.ant-table-thead_th]:!text-center [&_.ant-table-thead_th]:!py-1 [&_.ant-table-thead_th]:!px-1.5"
                  />
                </div>

                {/* Error Message Footer */}
                <Form.Item shouldUpdate className="m-0 p-0 mt-2">
                  {() => {
                    const errors = form.getFieldsError();
                    const hasErrors = errors.some(
                      (err) => err.errors.length > 0
                    );
                    return hasErrors ? (
                      <div className="text-red-500 text-[10px] font-semibold flex items-center gap-1">
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
    </div>
  );
};

export default InwardTable;
