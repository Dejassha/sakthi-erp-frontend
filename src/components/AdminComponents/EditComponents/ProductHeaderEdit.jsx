import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  AutoComplete,
  Button,
  DatePicker,
  Radio,
  Space,
  Divider,
  Typography,
  message,
  Modal,
} from "antd";
import { Save, Plus, ArrowLeft } from "lucide-react";
import dayjs from "dayjs";
import {
  useGetCompaniesQuery,
  useAddCompanyMutation,
  useUpdateProductDetailsMutation,
  useLazyCheckSlipNumberQuery,
} from "@/store/services/inward.api";
import LoadingState from "@/pages/errorPage/LoadingState";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import GlobalButton from "@/components/ReusableComponents/Button";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import StyledFormItem, {
  INPUT_CLASS,
  DATE_PICKER_CLASS,
  RADIO_GROUP_CLASS,
} from "@/components/ReusableComponents/FormItem";

const { Title } = Typography;
const ProductHeaderEdit = ({ productId, initialProduct, onBack }) => {
  const [form] = Form.useForm();
  const [companyForm] = Form.useForm();
  const [isCompanyModalVisible, setIsCompanyModalVisible] = useState(false);
  const [confirmValues, setConfirmValues] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const { data: companies = [] } = useGetCompaniesQuery(undefined);
  const [addCompany, { isLoading: isAddingCompany }] = useAddCompanyMutation();
  const [updateProductDetails] = useUpdateProductDetailsMutation();
  const [checkSlipNumber] = useLazyCheckSlipNumberQuery();
  const sheetType = Form.useWatch("sheet_type", form);
  useEffect(() => {
    if (initialProduct) {
      form.setFieldsValue({
        ...initialProduct,
        date: initialProduct.date ? dayjs(initialProduct.date) : null,
      });
    }
  }, [initialProduct, form]);
  const handleUpdate = async (values) => {
    setIsSaving(true);
    const key = "update_product_header";
    message.loading({
      content: "Updating product details...",
      key,
      duration: 0,
    });
    try {
      // Validate slip number if it was changed
      if (values.inward_slip_number !== initialProduct.inward_slip_number) {
        const validation = await checkSlipNumber(
          String(values.inward_slip_number),
        ).unwrap();
        if (validation.exists) {
          message.error({
            content:
              "This Slip Number already exists. Please enter a rare one.",
            key,
            duration: 3,
          });
          setIsSaving(false);
          return;
        }
      }
      const payload = {
        ...values,
        date: values.date ? dayjs(values.date).format("YYYY-MM-DD") : null,
      };
      // Note: We are NOT sending the 'materials' key here.
      // The backend 'update_product_details' has been updated to only sync materials if the key is present.
      await updateProductDetails({
        product_id: productId,
        body: payload,
      }).unwrap();
      message.success({
        content: "Product details updated successfully",
        key,
        duration: 2,
      });
    } catch (err) {
      console.error("Update failed:", err);
      message.error({
        content: "Failed to update product details",
        key,
        duration: 3,
      });
    } finally {
      setIsSaving(false);
    }
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
      console.error("Add company failed:", err);
      message.error("Failed to add company");
    }
  };
  return (
    <div className="bg-white">
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => setConfirmValues(values)}
        className="bg-white rounded-3xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-x-8 md:gap-y-0"
      >
        <div className="col-span-full border-b pb-4 mb-2">
          <PageHeader
            title="Edit Product Information"
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
                  Save Changes
                </GlobalButton>
              </div>
            }
          />
        </div>

        <StyledFormItem
          label="Select Sheet Type"
          name="sheet_type"
          rules={[{ required: true }]}
        >
          <Radio.Group className={RADIO_GROUP_CLASS}>
            <Radio value="jobcard">Job Card</Radio>
            <Radio value="quotation">Development</Radio>
          </Radio.Group>
        </StyledFormItem>

        <StyledFormItem
          label="Slip No."
          name="inward_slip_number"
          rules={[{ required: true }]}
          normalize={(value) => (value || "").toUpperCase()}
        >
          <Input
            placeholder="Enter Slip No."
            className={INPUT_CLASS}
          />
        </StyledFormItem>

        {sheetType === "jobcard" ? (
          <StyledFormItem
            label="Job Type"
            name="job_type"
            rules={[{ required: true, message: "Job type is required" }]}
          >
            <Radio.Group className={RADIO_GROUP_CLASS}>
              <Radio value="Laser Cutting & Folding">
                Laser Cutting & Folding
              </Radio>
              <Radio value="Only Folding">Only Folding</Radio>
            </Radio.Group>
          </StyledFormItem>
        ) : null}

        <StyledFormItem
          label="Date"
          name="date"
          rules={[{ required: true }]}
        >
          <DatePicker
            className={DATE_PICKER_CLASS}
            format="YYYY-MM-DD"
          />
        </StyledFormItem>

        <StyledFormItem
          label="Company Name"
          name="company_name"
          rules={[{ required: true }]}
          normalize={(value) => (value || "").toUpperCase()}
        >
          <AutoComplete
            placeholder="Search or enter company name"
            options={companies.map((c) => ({
              label: c.company_name,
              value: c.company_name,
            }))}
            onSelect={(val) => {
              const selected = companies.find((c) => c.company_name === val);
              if (selected) {
                form.setFieldsValue({
                  customer_name:
                    selected.customer_name !== "-"
                      ? selected.customer_name
                      : "",
                  contact_no: selected.contact_no,
                  customer_dc_no: selected.customer_dc_no,
                });
              }
            }}
            filterOption={(inputValue, option) =>
              option
                ? option.value
                    .toUpperCase()
                    .indexOf(inputValue.toUpperCase()) !== -1
                : false
            }
            dropdownRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: "8px 0" }} />
                <Space style={{ padding: "0 8px 4px" }}>
                  <Button
                    type="text"
                    icon={<Plus size={14} />}
                    onClick={() => setIsCompanyModalVisible(true)}
                  >
                    Add new company
                  </Button>
                </Space>
              </>
            )}
          >
            <Input className={INPUT_CLASS} />
          </AutoComplete>
        </StyledFormItem>

        <StyledFormItem
          label="Contact Person Name"
          name="customer_name"
          normalize={(value) => (value || "").toUpperCase()}
        >
          <Input
            placeholder="Customer Name"
            className={INPUT_CLASS}
          />
        </StyledFormItem>

        <StyledFormItem
          label="Contact Person Mobile No."
          name="contact_no"
          rules={[
            { required: true, message: "Mobile number is required" },
            { len: 10, message: "Must be exactly 10 digits" },
            { pattern: /^[6-9]/, message: "Must start with 6-9" },
          ]}
        >
          <Input
            maxLength={10}
            placeholder="Contact number"
            className={INPUT_CLASS}
          />
        </StyledFormItem>

        <StyledFormItem
          label="Customer Document No."
          name="customer_dc_no"
          normalize={(value) => (value || "").toUpperCase()}
        >
          <Input
            placeholder="Document No."
            className={INPUT_CLASS}
          />
        </StyledFormItem>

        <StyledFormItem
          label="Work Order No."
          name="worker_no"
          normalize={(value) => (value || "").toUpperCase()}
        >
          <Input
            placeholder="Enter Worker No."
            className={INPUT_CLASS}
          />
        </StyledFormItem>
      </Form>

      {/* Add Company Modal */}
      <Modal
        title="Add New Company"
        open={isCompanyModalVisible}
        onCancel={() => setIsCompanyModalVisible(false)}
        onOk={handleSaveNewCompany}
        confirmLoading={isAddingCompany}
      >
        <Form layout="vertical" form={companyForm} className="space-y-4 pt-4">
          <StyledFormItem
            label="Company Name"
            name="company_name"
            rules={[{ required: true }]}
          >
            <Input className={INPUT_CLASS} />
          </StyledFormItem>
          <StyledFormItem label="Customer Name" name="customer_name">
            <Input className={INPUT_CLASS} />
          </StyledFormItem>
          <StyledFormItem
            label="Contact No."
            name="contact_no"
            rules={[{ required: true }]}
          >
            <Input maxLength={10} className={INPUT_CLASS} />
          </StyledFormItem>
          <StyledFormItem
            label="DC No."
            name="customer_dc_no"
            rules={[{ required: true }]}
          >
            <Input className={INPUT_CLASS} />
          </StyledFormItem>
        </Form>
      </Modal>

      {/* Saving Overlay */}
      <GlobalModal
        open={!!confirmValues}
        title="Confirm Product Update"
        description="Are you sure you want to officially update this product's header information?"
        onCancel={() => setConfirmValues(null)}
        onConfirm={() => {
          handleUpdate(confirmValues);
          setConfirmValues(null);
        }}
        confirmText="Save Changes"
        cancelText="Cancel"
      />

      {isSaving ? (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <LoadingState message="Saving changes..." fullPage={false} />
        </div>
      ) : null}
    </div>
  );
};
export default ProductHeaderEdit;
