import React from "react";
import { Plus, Save, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useInwardEdit } from "./hooks/useInwardEdit";
import {
  Alert,
  Spin,
  Form,
  Input,
  Select,
  Button,
  Table,
  Divider,
  DatePicker,
  Typography,
  Modal,
  Radio,
  Space,
} from "antd";
const { Title } = Typography;
const InwardEditForm = (props) => {
  const { onBack } = props;
  const {
    form,
    companyForm,
    isSaving,
    isFetching,
    fetchError,
    isCompaniesLoading,
    isAddingCompany,
    isCompanyModalVisible,
    companies,
    initialValues,
    product,
    setCompanyModalVisible,
    handleUpdate,
    handleSaveNewCompany,
    handleHeaderValuesChange,
    columns,
  } = useInwardEdit(props);
  // Watch materials so the table re-renders whenever setFieldValue updates computed cols
  const watchedMaterials = Form.useWatch("materials", form) || [];
  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white">
        <Spin
          indicator={<Loader2 className="h-8 w-8 animate-spin text-primary" />}
        />
        <Typography.Text className="mt-4" type="secondary">
          Fetching full product data...
        </Typography.Text>
      </div>
    );
  }
  if (fetchError || !product) {
    return (
      <div className="p-4">
        <Alert
          message="Error"
          description="Failed to load product details. Please try again later."
          type="error"
          showIcon
          icon={<AlertCircle />}
        />
        <Button onClick={() => onBack()} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }
  return (
    <div className="bg-white transition-all p-4">
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues || {}}
        onValuesChange={handleHeaderValuesChange}
        onFinish={handleUpdate}
      >
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <Title level={4} className="!mb-0">
            Edit Inward Product Details
          </Title>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-cancel flex items-center gap-2"
              onClick={() => onBack()}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-blue flex items-center gap-2"
            >
              <Save size={16} />
              Update Inward
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-200">
          <Form.Item
            label={<span className="text-gray-600 font-medium">Slip No.</span>}
            name="inward_slip_number"
            className="mb-0"
          >
            <Input placeholder="Enter Slip No." className="h-10 rounded-lg" />
          </Form.Item>

          <Form.Item
            label={<span className="text-gray-600 font-medium">Date</span>}
            name="date"
            className="mb-0"
          >
            <DatePicker
              className="w-full h-10 rounded-lg"
              format="YYYY-MM-DD"
            />
          </Form.Item>

          <Form.Item
            label={
              <span className="text-gray-600 font-medium">Work Order No.</span>
            }
            name="worker_no"
            className="mb-0"
          >
            <Input placeholder="Enter Worker No." className="h-10 rounded-lg" />
          </Form.Item>

          <Form.Item
            label={<span className="text-gray-600 font-medium">Company</span>}
            name="company_name"
            className="mb-0"
          >
            <Select
              showSearch
              placeholder="Select Company"
              loading={isCompaniesLoading}
              className="h-10"
              classNames={{ popup: { root: "rounded-lg" } }}
              options={companies.map((c) => ({
                label: c.company_name,
                value: c.company_name,
              }))}
              popupRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "8px 0" }} />
                  <Space style={{ padding: "0 8px 4px" }}>
                    <Button
                      type="text"
                      icon={<Plus size={14} />}
                      onClick={() => setCompanyModalVisible(true)}
                    >
                      Add new company
                    </Button>
                  </Space>
                </>
              )}
              onChange={(val) => {
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
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-gray-600 font-medium">Customer</span>}
            name="customer_name"
            className="mb-0"
          >
            <Input placeholder="Customer Name" className="h-10 rounded-lg" />
          </Form.Item>

          <Form.Item
            label={<span className="text-gray-600 font-medium">DC No.</span>}
            name="customer_dc_no"
            className="mb-0"
          >
            <Input placeholder="Document No." className="h-10 rounded-lg" />
          </Form.Item>

          <Form.Item
            label={<span className="text-gray-600 font-medium">Mobile</span>}
            name="contact_no"
            className="mb-0"
          >
            <Input
              maxLength={10}
              placeholder="Contact number"
              className="h-10 rounded-lg"
            />
          </Form.Item>

          <Form.Item
            label={
              <span className="text-gray-600 font-medium">Sheet Type</span>
            }
            name="sheet_type"
            className="mb-0"
          >
            <Radio.Group className="flex items-center gap-2 mt-2">
              <Radio value="jobcard">Job Card</Radio>
              <Radio value="quotation">Quotation</Radio>
            </Radio.Group>
          </Form.Item>
        </div>

        <h3 className="text-lg font-semibold mb-4">Product Materials</h3>

        <Form.List name="materials">
          {(fields, { add }) => (
            <>
              <Table
                dataSource={fields.map((field, index) => ({
                  ...(watchedMaterials[index] || {}),
                  ...field,
                }))}
                columns={columns}
                pagination={false}
                bordered
                size="small"
                rowKey={(record, index) => record?.id || `new-${index}`}
                className="mb-4"
                footer={() => (
                  <Button
                    type="dashed"
                    onClick={() => add({})}
                    block
                    icon={<Plus size={16} />}
                  >
                    Add Material
                  </Button>
                )}
              />
            </>
          )}
        </Form.List>
      </Form>

      {/* Interaction blocker during saving */}
      <Modal
        open={isSaving}
        footer={null}
        closable={false}
        centered
        width={300}
      >
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Spin size="large" tip="Saving changes..." />
          <div className="mt-4 text-gray-500">
            Please wait while we secure your data.
          </div>
        </div>
      </Modal>

      {/* Add Company Modal */}
      <Modal
        title="Add New Company"
        open={isCompanyModalVisible}
        onCancel={() => {
          setCompanyModalVisible(false);
          companyForm.resetFields();
        }}
        onOk={handleSaveNewCompany}
        confirmLoading={isAddingCompany}
        okText="Save Company"
      >
        <Form layout="vertical" form={companyForm}>
          <Form.Item
            label="Company Name"
            name="company_name"
            rules={[{ required: true, message: "Please enter company name" }]}
          >
            <Input placeholder="Enter company name" />
          </Form.Item>
          <Form.Item label="Customer Name" name="customer_name">
            <Input placeholder="Enter customer name (optional)" />
          </Form.Item>
          <Form.Item
            label="Contact No."
            name="contact_no"
            rules={[{ required: true, message: "Please enter contact number" }]}
          >
            <Input placeholder="Enter contact number" maxLength={10} />
          </Form.Item>
          <Form.Item
            label="DC No."
            name="customer_dc_no"
            rules={[{ required: true, message: "Please enter DC number" }]}
          >
            <Input placeholder="Enter DC number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
export default InwardEditForm;
