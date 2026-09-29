import { useMemo, useEffect, useState, useCallback } from "react";
import {
  Form,
  message,
  Input,
  Select,
  Space,
  Popconfirm,
  Button,
  Modal,
} from "antd";
import { Trash2 } from "lucide-react";
import dayjs from "dayjs";
import {
  useGetInwardDetailsQuery,
  useUpdateProductDetailsMutation,
  useGetCompaniesQuery,
  useAddCompanyMutation,
  useGetMaterialTypeQuery,
} from "@/store/services/inward.api";
// --- Internal Helper Functions (Moved from DirectInwardLogic.ts) ---
const calculateMaterialRow = (mat, changedFields, materialDensities) => {
  const updatedMat = { ...mat, ...changedFields };
  if (changedFields.bay !== undefined) {
    updatedMat.bay = String(changedFields.bay).replace(/\D/g, "");
  }
  if (changedFields.quantity !== undefined) {
    updatedMat.quantity =
      Number(String(changedFields.quantity).replace(/[^0-9.]/g, "")) || 0;
  }
  if (changedFields.thick !== undefined) {
    let val = Number(String(changedFields.thick).replace(/[^0-9.]/g, "")) || 0;
    if (val > 25) val = 25;
    updatedMat.thick = val;
  }
  if (changedFields.width !== undefined) {
    updatedMat.width =
      Number(String(changedFields.width).replace(/[^0-9.]/g, "")) || 0;
  }
  if (changedFields.length !== undefined) {
    updatedMat.length =
      Number(String(changedFields.length).replace(/[^0-9.]/g, "")) || 0;
  }
  if (changedFields.mat_type !== undefined) {
    updatedMat.density = materialDensities[changedFields.mat_type] || 0;
  }
  const thick = Number(updatedMat.thick) || 0;
  const width = Number(updatedMat.width) || 0;
  const length = Number(updatedMat.length) || 0;
  const density = Number(updatedMat.density) || 0;
  const quantity = Number(updatedMat.quantity) || 0;
  const volume = thick * width * length;
  const unitWeight =
    volume > 0 && density > 0 ? parseFloat((volume * density).toFixed(3)) : 0;
  const totalWeight =
    quantity > 0 && unitWeight > 0
      ? parseFloat((quantity * unitWeight).toFixed(3))
      : 0;
  let stockDue = "";
  if (totalWeight > 0 && totalWeight < 50) stockDue = "1";
  else if (totalWeight >= 50 && totalWeight < 200) stockDue = "3";
  else if (totalWeight >= 200) stockDue = "5";
  if (!updatedMat.stock_due || stockDue) {
    updatedMat.stock_due = stockDue || updatedMat.stock_due;
  }
  return {
    ...updatedMat,
    unit_weight: unitWeight,
    total_weight: totalWeight,
  };
};
const formatInwardHeaderFields = (changedValues) => {
  const updatedValues = { ...changedValues };
  if (changedValues.company_name)
    updatedValues.company_name = String(
      changedValues.company_name,
    ).toUpperCase();
  if (changedValues.inward_slip_number)
    updatedValues.inward_slip_number = String(
      changedValues.inward_slip_number,
    ).toUpperCase();
  if (changedValues.customer_name)
    updatedValues.customer_name = String(
      changedValues.customer_name,
    ).toUpperCase();
  if (changedValues.customer_dc_no !== undefined)
    updatedValues.customer_dc_no = String(changedValues.customer_dc_no).replace(
      /\D/g,
      "",
    );
  if (changedValues.contact_no !== undefined)
    updatedValues.contact_no = String(changedValues.contact_no)
      .replace(/\D/g, "")
      .slice(0, 10);
  if (changedValues.worker_no !== undefined)
    updatedValues.worker_no = String(changedValues.worker_no).replace(
      /\D/g,
      "",
    );
  return updatedValues;
};
const normalizeInwardInitialValues = (product) => {
  return {
    ...product,
    date: product.date ? dayjs(product.date) : null,
    sheet_type: product.sheet_type || "",
    programer_status: product.programer_status || "pending",
    qa_status: product.qa_status || "pending",
    outward_status: product.outward_status || "pending",
    materials: (product.materials || []).map((m) => ({
      ...m,
      thick: Number(m.thick) || 0,
      width: Number(m.width) || 0,
      length: Number(m.length) || 0,
      quantity: Number(m.quantity) || 0,
      density: Number(m.density) || 0,
      programer_status: m.programer_status || "pending",
      qa_status: m.qa_status || "pending",
      acc_status: m.acc_status || "pending",
    })),
  };
};
export const useInwardEdit = ({
  productId,
  initialProduct,
  initialMaterials,
}) => {
  const [form] = Form.useForm();
  const [companyForm] = Form.useForm();
  const [isSaving, setIsSaving] = useState(false);
  const [isCompanyModalVisible, setIsCompanyModalVisible] = useState(false);
  // 1. API Queries & Mutations
  const {
    data: detailResponse,
    isLoading: isFetching,
    isError: fetchError,
    refetch,
  } = useGetInwardDetailsQuery(productId, {
    skip: !productId || !!initialProduct,
  });
  const { data: companies = [], isLoading: isCompaniesLoading } =
    useGetCompaniesQuery(undefined);
  const [addCompany, { isLoading: isAddingCompany }] = useAddCompanyMutation();
  const [updateProductDetails] = useUpdateProductDetailsMutation();
  const { data: materialTypes = [] } = useGetMaterialTypeQuery(undefined);
  // 2. Data Processing
  const mappedProduct = useMemo(() => {
    if (initialProduct) {
      return {
        ...initialProduct,
        materials: initialMaterials || initialProduct.materials || [],
      };
    }
    if (
      !detailResponse ||
      !Array.isArray(detailResponse) ||
      detailResponse.length === 0
    )
      return null;
    return detailResponse[0];
  }, [detailResponse, initialProduct, initialMaterials]);
  const product = useMemo(() => {
    if (!mappedProduct) return null;
    return {
      ...mappedProduct,
      materials: mappedProduct.materials || [],
    };
  }, [mappedProduct]);
  const materialDensities = useMemo(
    () =>
      materialTypes.reduce((acc, item) => {
        acc[item.material_name] = item.density_value;
        return acc;
      }, {}),
    [materialTypes],
  );
  const materialTypesList = useMemo(
    () => materialTypes.map((d) => d.material_name),
    [materialTypes],
  );
  const calculateMaterialValues = useCallback(
    (mat, changedFields) => {
      return calculateMaterialRow(mat, changedFields, materialDensities);
    },
    [materialDensities],
  );
  const initialValues = useMemo(
    () => (product ? normalizeInwardInitialValues(product) : null),
    [product],
  );
  // 3. Effects
  useEffect(() => {
    if (product && initialValues && !form.isFieldsTouched()) {
      form.setFieldsValue(initialValues);
    }
  }, [initialValues, form, product]);
  // 4. Action Handlers
  const handleUpdate = (values) => {
    Modal.confirm({
      title: "Confirm Update",
      content:
        "Are you sure you want to update this inward product? This will synchronize all material changes as well.",
      okText: "Yes, Update",
      cancelText: "No",
      centered: true,
      onOk: async () => {
        if (!product || isSaving) return;
        setIsSaving(true);
        const key = "update_inward";
        message.loading({ content: "Processing update...", key, duration: 0 });
        try {
          const actualId = product.product_id || product.id;
          const payload = {
            ...values,
            product_id: actualId,
            date: values.date
              ? dayjs(values.date).format("YYYY-MM-DD")
              : undefined,
            materials: (values.materials || []).map((m) => ({
              ...m,
              thick: m.thick ? Number(m.thick) : null,
              width: m.width ? Number(m.width) : null,
              length: m.length ? Number(m.length) : null,
              quantity: m.quantity ? Number(m.quantity) : null,
              density: m.density ? Number(m.density) : null,
              unit_weight: m.unit_weight ? Number(m.unit_weight) : null,
              total_weight: m.total_weight ? Number(m.total_weight) : null,
            })),
          };
          message.loading({
            content: "Synchronizing product and materials...",
            key,
            duration: 0,
          });
          await updateProductDetails({
            product_id: actualId,
            body: payload,
          }).unwrap();
          // Refetch both the local query and rely on tag invalidation for the parent
          await refetch();
          message.success({
            content: "Inward Product synchronized successfully",
            key,
            duration: 2,
          });
        } catch (err) {
          console.error("Update failed:", err);
          const errorMsg =
            err?.data?.message ||
            "Update failed. Please check for duplicate slip numbers or network issues.";
          message.error({
            content: errorMsg,
            key,
            duration: 3,
          });
        } finally {
          setIsSaving(false);
        }
      },
    });
  };
  const handleSaveNewCompany = async () => {
    try {
      const values = await companyForm.validateFields();
      const companyToSave = {
        company_name: values.company_name?.toUpperCase().trim(),
        customer_name: values.customer_name?.toUpperCase().trim() || "-",
        contact_no: values.contact_no?.trim() || "",
        customer_dc_no: values.customer_dc_no?.trim() || "",
      };
      await addCompany(companyToSave).unwrap();
      message.success("Company added successfully");
      form.setFieldsValue({
        company_name: companyToSave.company_name,
        customer_name: values.customer_name,
        contact_no: values.contact_no,
        customer_dc_no: values.customer_dc_no,
      });
      setIsCompanyModalVisible(false);
      companyForm.resetFields();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(
        err?.data?.message || err.message || "Failed to add company",
      );
    }
  };
  const handleDeleteEntry = async (index) => {
    const currentMaterials = form.getFieldValue("materials");
    form.setFieldsValue({
      materials: currentMaterials.filter((_, i) => i !== index),
    });
    message.success("Material row removed (click Update to save changes)");
  };
  const handleHeaderValuesChange = (changed) => {
    // Only process header-level fields — never touch materials from here.
    // onValuesChange fires for every field including material cells, so we must guard.
    const { materials: _mats, ...headerOnly } = changed;
    if (Object.keys(headerOnly).length === 0) return;
    const formatted = formatInwardHeaderFields(headerOnly);
    form.setFieldsValue(formatted);
  };
  // 5. Column Definitions
  const columns = [
    {
      title: "S.No",
      dataIndex: "index",
      key: "index",
      width: 50,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Bay",
      dataIndex: "bay",
      key: "bay",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Form.Item name={[record.name, "bay"]} noStyle>
          <Input className="text-center" />
        </Form.Item>
      ),
    },
    {
      title: "TEC",
      dataIndex: "mat_type",
      key: "mat_type",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Form.Item name={[record.name, "mat_type"]} noStyle>
          <Select
            placeholder="Select"
            onChange={(val) => {
              const density = materialDensities[val] || 0;
              const currentMat = form.getFieldValue(["materials", record.name]);
              const updated = calculateMaterialValues(currentMat, {
                mat_type: val,
                density,
              });
              form.setFieldValue(["materials", record.name], updated);
            }}
          >
            {materialTypesList.map((t) => (
              <Select.Option key={t} value={t}>
                {t}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      ),
    },
    {
      title: "Grade",
      dataIndex: "mat_grade",
      key: "mat_grade",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Form.Item name={[record.name, "mat_grade"]} noStyle>
          <Input className="text-center" />
        </Form.Item>
      ),
    },
    {
      title: "Thick",
      dataIndex: "thick",
      key: "thick",
      width: 70,
      align: "center",
      render: (_, record) => (
        <Form.Item name={[record.name, "thick"]} noStyle>
          <Input
            className="text-center"
            onChange={(e) => {
              const currentMat = form.getFieldValue(["materials", record.name]);
              const updated = calculateMaterialValues(currentMat, {
                thick: e.target.value,
              });
              form.setFieldValue(["materials", record.name], updated);
            }}
          />
        </Form.Item>
      ),
    },
    {
      title: "Width",
      dataIndex: "width",
      key: "width",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Form.Item name={[record.name, "width"]} noStyle>
          <Input
            className="text-center"
            onChange={(e) => {
              const currentMat = form.getFieldValue(["materials", record.name]);
              const updated = calculateMaterialValues(currentMat, {
                width: e.target.value,
              });
              form.setFieldValue(["materials", record.name], updated);
            }}
          />
        </Form.Item>
      ),
    },
    {
      title: "Length",
      dataIndex: "length",
      key: "length",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Form.Item name={[record.name, "length"]} noStyle>
          <Input
            className="text-center"
            onChange={(e) => {
              const currentMat = form.getFieldValue(["materials", record.name]);
              const updated = calculateMaterialValues(currentMat, {
                length: e.target.value,
              });
              form.setFieldValue(["materials", record.name], updated);
            }}
          />
        </Form.Item>
      ),
    },
    {
      title: "Density",
      dataIndex: "density",
      key: "density",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Form.Item name={[record.name, "density"]} noStyle>
          <Input readOnly className="text-center bg-gray-50" />
        </Form.Item>
      ),
    },
    {
      title: "Unit Wt.",
      dataIndex: "unit_weight",
      key: "unit_weight",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Form.Item name={[record.name, "unit_weight"]} noStyle>
          <Input readOnly className="text-center bg-gray-50" />
        </Form.Item>
      ),
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Form.Item name={[record.name, "quantity"]} noStyle>
          <Input
            className="text-center"
            onChange={(e) => {
              const currentMat = form.getFieldValue(["materials", record.name]);
              const updated = calculateMaterialValues(currentMat, {
                quantity: e.target.value,
              });
              form.setFieldValue(["materials", record.name], updated);
            }}
          />
        </Form.Item>
      ),
    },
    {
      title: "Total Wt.",
      dataIndex: "total_weight",
      key: "total_weight",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Form.Item name={[record.name, "total_weight"]} noStyle>
          <Input readOnly className="text-center bg-gray-50" />
        </Form.Item>
      ),
    },
    {
      title: "Stock Due",
      dataIndex: "stock_due",
      key: "stock_due",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Form.Item name={[record.name, "stock_due"]} noStyle>
          <Input className="text-center" />
        </Form.Item>
      ),
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      key: "remarks",
      width: 150,
      align: "center",
      render: (_, record) => (
        <Form.Item name={[record.name, "remarks"]} noStyle>
          <Input />
        </Form.Item>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Space size="middle">
          {record.id ? (
            <Popconfirm
              title="Delete this row?"
              onConfirm={() => handleDeleteEntry(record.name)}
            >
              <Button type="text" danger icon={<Trash2 size={16} />} />
            </Popconfirm>
          ) : (
            <Button
              type="text"
              danger
              icon={<Trash2 size={16} />}
              onClick={() => handleDeleteEntry(record.name)}
            />
          )}
        </Space>
      ),
    },
  ];
  return {
    form,
    companyForm,
    isSaving,
    isFetching,
    fetchError,
    isCompaniesLoading,
    isAddingCompany,
    isCompanyModalVisible,
    companies,
    materialTypesList,
    initialValues,
    product,
    setCompanyModalVisible: setIsCompanyModalVisible,
    handleUpdate,
    handleSaveNewCompany,
    handleDeleteEntry,
    handleHeaderValuesChange,
    calculateMaterialValues,
    materialDensities,
    columns,
  };
};
