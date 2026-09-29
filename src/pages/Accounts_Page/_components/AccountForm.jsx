import React, { useMemo, useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
// antd
import { message, Form, Input, Select, Checkbox } from "antd";
// RTK Query
import { useGetMaterialsByProductQuery } from "@/store/services/inward.api";
import { useAddAccDetailsMutation } from "@/store/services/accounts.api";
// Reusable Components
import StyledFormItem, {
  INPUT_CLASS,
  SELECT_CLASS,
  TEXTAREA_CLASS,
  DISABLE_INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import EmptyState from "@/pages/errorPage/EmptyState";

const { TextArea } = Input;

const AccountForm = forwardRef(({ product, onBack, onSuccess }, ref) => {
  const [form] = Form.useForm();
  const productId = product?.id;
  const companyName = product?.company_name;
  const [showConfirm, setShowConfirm] = useState(false);
  const prevStatusRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user?.username;

  // Fetch Materials
  const { data: materials = [], refetch: refetchMaterials } =
    useGetMaterialsByProductQuery(productId, {
      skip: !productId,
    });

  // Mutation for submission
  const [addAccDetails, { isLoading: isSubmitting }] =
    useAddAccDetailsMutation();

  useImperativeHandle(ref, () => ({
    submit: () => {
      form
        .validateFields()
        .then(() => setShowConfirm(true))
        .catch(() => {
          message.error("Please fill all required fields");
        });
    },
    isSubmitting,
  }));

  const availableMaterials = useMemo(() => {
    return materials.filter(
      (mat) =>
        mat.id !== undefined &&
        mat.acc_status === "pending" &&
        mat.programer_status === "completed",
    );
  }, [materials]);

  // Auto-select materials if pending materials exist
  useEffect(() => {
    if (availableMaterials.length > 0) {
      const current = form.getFieldValue("material_details");
      if (!current || current.length === 0) {
        form.setFieldsValue({
          material_details: availableMaterials.map((mat) => mat.id),
        });
      }
    }
  }, [availableMaterials, form]);

  const handleValuesChange = (changedValues) => {
    if (!changedValues.status) return;

    const status = changedValues.status;
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === "cancelled") {
      form.setFieldsValue({
        invoice_no: "CANCELLED",
        transporter_no: "CANCELLED",
        payments_terms: "CANCELLED",
        remarks: "",
      });
      return;
    }

    if (prevStatus === "cancelled") {
      form.setFieldsValue({
        invoice_no: "",
        transporter_no: "",
        payments_terms: undefined,
        remarks: status === "closed" ? "Bill Closed" : "",
      });
      return;
    }

    if (status === "open") {
      form.setFieldsValue({ remarks: "" });
    } else if (status === "closed") {
      form.setFieldsValue({ remarks: "Bill Closed" });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const isCancelled = values.status === "cancelled";
      await addAccDetails({
        product_details: productId,
        material_id: values.material_details[0],
        material_details: values.material_details,
        transporter_no: isCancelled ? "CANCELLED" : values.transporter_no,
        payments_terms: isCancelled ? "CANCELLED" : values.payments_terms,
        invoice_no: isCancelled ? "CANCELLED" : values.invoice_no,
        status: values.status,
        remarks: values.remarks,
        created_by: userName,
      }).unwrap();
      message.success("Account details saved.");
      refetchMaterials();
      onSuccess(product);
    } catch (err) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      const errorData = err?.data;
      message.error(errorData?.message || "Submission failed");
    } finally {
      setShowConfirm(false);
    }
  };

  if (availableMaterials.length === 0) {
    return (
      <EmptyState
        title="No Pending Materials"
        description="There are no pending materials available for accounting on this product."
        onAction={() => onBack(product)}
        actionLabel="Back to Details"
        actionIcon="mdi:arrow-left"
        showHomeButton={false}
      />
    );
  }

  return (
    <div className="bg-white p-4 rounded-sm shadow-xs border border-gray-200">
      <GlobalModal
        open={showConfirm}
        title="Confirm Submission"
        description={`Are you sure you want to submit account details for ${companyName}?`}
        onConfirm={handleSubmit}
        onCancel={() => setShowConfirm(false)}
        confirmText="Confirm"
        cancelText="Cancel"
        loading={isSubmitting}
        confirmColor="blue"
        cancelColor="cancel"
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          material_details: [],
          remarks: "",
          invoice_no: "",
          transporter_no: "",
        }}
        onValuesChange={handleValuesChange}
        onFinish={() => setShowConfirm(true)}
      >
        {/* MATERIAL SELECTION */}
        <StyledFormItem
          name="material_details"
          label="Select Materials"
          rules={[{ required: true, message: "Select at least one material" }]}
        >
          <Checkbox.Group className="w-full">
            <div className="flex flex-wrap gap-2 mt-1">
              {availableMaterials.map((mat) => (
                <Form.Item noStyle shouldUpdate key={mat.id}>
                  {({ getFieldValue }) => {
                    const selectedIds = getFieldValue("material_details") || [];
                    const isChecked = selectedIds.includes(mat.id);
                    return (
                      <div
                        className={`inline-flex items-center justify-center px-1.5 py-1 rounded-sm border transition-all cursor-pointer select-none ${isChecked
                            ? "bg-blue-50/70 border-blue-500 shadow-xs"
                            : "bg-white border-gray-200 hover:border-blue-400"
                          }`}
                      >
                        <Checkbox value={mat.id} className="!inline-flex !items-center">
                          <span className="text-[9px] font-medium text-gray-600 uppercase leading-none inline-block">
                            MT- {mat.mat_type} / T- {mat.thick}mm / W-{" "}
                            {mat.width}mm / L- {mat.length}mm / Qty:{" "}
                            {mat.quantity}
                          </span>
                        </Checkbox>
                      </div>
                    );
                  }}
                </Form.Item>
              ))}
            </div>
          </Checkbox.Group>
        </StyledFormItem>

        {/* RESPONSIVE FORM FIELDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-2">
          {/* INVOICE NO */}
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
            {({ getFieldValue }) => {
              const isCancelled = getFieldValue("status") === "cancelled";
              return (
                <StyledFormItem
                  name="invoice_no"
                  label="Invoice No."
                  rules={[{ required: true, message: "Required" }]}
                  className="mb-0"
                  normalize={(value) => {
                    if (isCancelled) return "CANCELLED";
                    return (value || "").replace(/[^0-9,\s]/g, "");
                  }}
                >
                  <Input
                    placeholder="Enter Invoice No."
                    className={`${INPUT_CLASS} ${isCancelled ? DISABLE_INPUT_CLASS : ""}`}
                    readOnly={isCancelled}
                  />
                </StyledFormItem>
              );
            }}
          </Form.Item>

          {/* TRANSPORTER NO */}
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
            {({ getFieldValue }) => {
              const isCancelled = getFieldValue("status") === "cancelled";
              return (
                <StyledFormItem
                  name="transporter_no"
                  label="E-way Bill No."
                  className="mb-0"
                >
                  <Input
                    placeholder="Enter E-way Bill No."
                    className={`${INPUT_CLASS} ${isCancelled ? DISABLE_INPUT_CLASS : ""}`}
                    readOnly={isCancelled}
                  />
                </StyledFormItem>
              );
            }}
          </Form.Item>

          {/* PAYMENT TERMS */}
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
            {({ getFieldValue }) => {
              const isCancelled = getFieldValue("status") === "cancelled";
              return (
                <StyledFormItem
                  name="payments_terms"
                  label="Payment Terms"
                  className="mb-0"
                >
                  <Select
                    placeholder="Select Payment Terms"
                    className={SELECT_CLASS}
                    disabled={isCancelled}
                    options={[
                      { label: "Credit", value: "credit" },
                      { label: "Immediate", value: "immediate" },
                      ...(isCancelled ? [{ label: "CANCELLED", value: "CANCELLED" }] : []),
                    ]}
                  />
                </StyledFormItem>
              );
            }}
          </Form.Item>

          {/* STATUS */}
          <StyledFormItem
            name="status"
            label="Status"
            rules={[{ required: true, message: "Required" }]}
            className="mb-0"
          >
            <Select
              placeholder="Select Status"
              className={SELECT_CLASS}
              options={[
                { label: "OPEN", value: "open" },
                { label: "CLOSED", value: "closed" },
                { label: "CANCELLED", value: "cancelled" },
              ]}
            />
          </StyledFormItem>
        </div>

        {/* REMARKS */}
        <StyledFormItem
          name="remarks"
          label="Remarks"
          className="mb-0"
          rules={[
            { required: true, message: "Required" },
            { min: 3, message: "Minimum 3 characters" },
          ]}
        >
          <TextArea
            rows={2}
            placeholder="Enter remarks..."
            className={TEXTAREA_CLASS}
          />
        </StyledFormItem>
      </Form>
    </div>
  );
});

AccountForm.displayName = "AccountForm";

export default AccountForm;
