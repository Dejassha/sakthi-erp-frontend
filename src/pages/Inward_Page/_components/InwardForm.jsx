import { useState, useEffect, useCallback, useRef } from "react";
// ant design components
import {
  Form,
  Input,
  Radio,
  AutoComplete,
  Divider,
  Space,
  message,
} from "antd";
import { Icon } from "@iconify/react";
// rtk query
import {
  useLazyCheckSlipNumberQuery,
  useGetLatestSlipNumberQuery,
} from "@/store/services/inward.api";
import {
  useGetCompaniesQuery,
  useAddCompanyMutation,
} from "@/store/services/admin.api";
// reusable components
import StyledFormItem, { INPUT_CLASS, RADIO_GROUP_CLASS } from "@/components/ReusableComponents/FormItem";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import Button from "@/components/ReusableComponents/Button";

const InwardForm = ({ form: propForm, formData, setFormData, onNextStep }) => {
  // ant design form instance
  const [createdForm] = Form.useForm();
  const form = propForm || createdForm;

  // RTK Query Hooks with explicit Data, Loading, and Error states
  const {
    data: companyList = [],
    isLoading: isCompaniesLoading,
    isError: isCompaniesError,
  } = useGetCompaniesQuery(undefined);

  const {
    data: latestSlipData,
    isLoading: isSlipLoading,
    isError: isSlipError,
    refetch: refetchLatestSlip,
  } = useGetLatestSlipNumberQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  // Explicitly refetch the latest slip number whenever InwardForm mounts
  useEffect(() => {
    refetchLatestSlip();
  }, [refetchLatestSlip]);

  const [addCompany, { isLoading: isAddingCompany }] = useAddCompanyMutation();
  const [checkSlipNumber] = useLazyCheckSlipNumberQuery();

  // Local Modal & Dropdown UI states
  const [isCompanyModalVisible, setIsCompanyModalVisible] = useState(false);
  const [companyForm] = Form.useForm();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Auto-populate next slip number when latestSlipData loads or when empty (initial load / reset)
  useEffect(() => {
    if (latestSlipData) {
      const defaultType =
        formData.sheet_type || form.getFieldValue("sheet_type") || "jobcard";
      const newSlip =
        defaultType === "jobcard"
          ? `J-${latestSlipData.next_jobcard_number}`
          : `Q-${latestSlipData.next_quotation_number}`;

      const currentSlip = formData.inward_slip_number;

      // Only auto-fill if inward_slip_number is not set yet in state
      if (!currentSlip) {
        const initialData = {
          sheet_type: defaultType,
          inward_slip_number: newSlip,
        };
        form.setFieldsValue(initialData);
        setFormData(initialData);
      }
    }
  }, [latestSlipData, form, setFormData, formData.sheet_type, formData.inward_slip_number]);

  // Antd Form onValuesChange Handler
  const handleChange = (changedValues, allValues) => {
    const updatedValues = { ...changedValues };

    // Automatically recalculate slip number when user toggles sheet type
    if (changedValues.sheet_type) {
      if (latestSlipData) {
        if (changedValues.sheet_type === "jobcard") {
          updatedValues.inward_slip_number = `J-${latestSlipData.next_jobcard_number}`;
        } else if (changedValues.sheet_type === "quotation") {
          updatedValues.inward_slip_number = `Q-${latestSlipData.next_quotation_number}`;
          updatedValues.job_type = "";
        }
      } else {
        const type = changedValues.sheet_type === "jobcard" ? "J" : "Q";
        const currentNum = allValues.inward_slip_number?.split("-")[1] || "";
        updatedValues.inward_slip_number = currentNum ? `${type}-${currentNum}` : `${type}-`;
      }
    }

    form.setFieldsValue(updatedValues);
    setFormData({ ...allValues, ...updatedValues });
  };

  // Select company from autocomplete
  const handleSelectCompany = (value) => {
    const company = companyList.find(
      (c) => c.company_name?.toLowerCase() === value?.toLowerCase()
    );
    if (!company) return;

    const cleanVal = (val) => (val && val !== "-" ? val.toUpperCase() : "");
    const cleanPhone = (val) => (val && val !== "-" ? val : "");

    const newValues = {
      company_name: company.company_name.toUpperCase(),
      customer_name: cleanVal(company.customer_name),
      contact_no: cleanPhone(company.contact_no),
    };

    form.setFieldsValue(newValues);
    setFormData(newValues);
  };

  // Debounced company search handler using useRef & inline useCallback
  const companySearchTimerRef = useRef(null);

  const handleCompanySearch = useCallback(
    (value) => {
      if (companySearchTimerRef.current) {
        clearTimeout(companySearchTimerRef.current);
      }
      companySearchTimerRef.current = setTimeout(() => {
        setFormData({ company_name: (value || "").toUpperCase() });
      }, 300);
    },
    [setFormData]
  );

  // Add Company Modal Action
  const handleSaveNewCompany = async () => {
    try {
      const values = await companyForm.validateFields();
      const companyToSave = {
        company_name: values.company_name?.trim(),
        customer_name: values.customer_name?.trim() || "-",
        contact_no: values.contact_no?.trim() || "",
      };
      await addCompany(companyToSave).unwrap();
      message.success("Company added successfully");
      form.setFieldsValue(companyToSave);
      setFormData(companyToSave);
      setIsCompanyModalVisible(false);
      companyForm.resetFields();
    } catch (err) {
      if (err.errorFields) return;
      message.error(
        err?.data?.error ||
        err?.data?.message ||
        err.message ||
        "Failed to add company"
      );
    }
  };

  // Custom Antd Validator for Duplicate Slip Number (triggered onBlur)
  const validateDuplicateSlip = async (_, value) => {
    if (!value) return Promise.resolve();
    const slipToCheck = value.trim();

    // Guard: Only query API if format matches J-xxx or Q-xxx to avoid wasteful invalid requests
    if (!/^(J|Q)-\d+$/.test(slipToCheck)) {
      return Promise.resolve();
    }

    try {
      const response = await checkSlipNumber(slipToCheck).unwrap();
      if (response?.exists) {
        return Promise.reject(new Error("Slip number already exists"));
      }
      return Promise.resolve();
    } catch {
      return Promise.resolve();
    }
  };

  const onFinish = () => {
    if (onNextStep) onNextStep();
  };

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        initialValues={formData}
        onValuesChange={handleChange}
        onFinish={onFinish}
        requiredMark={true}
        validateTrigger={["onChange", "onBlur"]}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-2 md:gap-x-4"
      >
        {/* 1. Sheet Type */}
        <StyledFormItem
          name="sheet_type"
          label="Select Sheet Type"
          rules={[{ required: true, message: "Sheet type is required" }]}
        >
          <Radio.Group className={RADIO_GROUP_CLASS}>
            <Radio value="jobcard">Job Card</Radio>
            <Radio value="quotation">Development</Radio>
          </Radio.Group>
        </StyledFormItem>

        {/* 2. Job Type (Conditional) */}
        {(formData.sheet_type || form.getFieldValue("sheet_type")) === "jobcard" ? (
          <StyledFormItem
            name="job_type"
            label="Job Type"
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

        {/* 3. Inward Slip Number */}
        <StyledFormItem
          name="inward_slip_number"
          label="Slip No."
          validateTrigger="onBlur"
          normalize={(value) => (value || "").toUpperCase().trim()}
          rules={[
            { required: true, message: "Slip number is required" },
            {
              pattern: /^(J|Q)-\d+$/,
              message: "Must start with J- or Q- followed by a number",
            },
            { validator: validateDuplicateSlip },
          ]}
        >
          <Input
            placeholder={
              isSlipLoading
                ? "Loading slip number..."
                : isSlipError
                  ? "Enter slip number (e.g. J-101)"
                  : "J- or Q- followed by number"
            }
            className={INPUT_CLASS}
          />
        </StyledFormItem>

        {/* 4. Company Name */}
        <StyledFormItem
          name="company_name"
          label="Company Name"
          normalize={(value) => (value || "").toUpperCase().trimStart()}
          rules={[{ required: true, message: "Company name is required" }]}
        >
          <AutoComplete
            open={isDropdownOpen}
            getPopupContainer={(triggerNode) => triggerNode.parentNode}
            options={companyList.map((c) => ({
              label: c.company_name,
              value: c.company_name,
            }))}
            onSelect={handleSelectCompany}
            onChange={handleCompanySearch}
            onOpenChange={(open) => {
              if (!isCompanyModalVisible) {
                setIsDropdownOpen(open);
              }
            }}
            showSearch={{
              filterOption: (inputValue, option) =>
                option?.value
                  ? option.value
                    .toUpperCase()
                    .includes(inputValue.toUpperCase())
                  : false,
            }}
            popupRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: "8px 0" }} />
                <Space style={{ padding: "0 8px 4px" }}>
                  <Button
                    size="xs"
                    color="outline-blue"
                    icon="lucide:plus"
                    onClick={() => {
                      setIsCompanyModalVisible(true);
                      setIsDropdownOpen(false);
                    }}
                  >
                    Add new company
                  </Button>
                </Space>
              </>
            )}
            notFoundContent={
              isCompaniesLoading ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  Loading companies list...
                </div>
              ) : isCompaniesError ? (
                <div className="p-3 text-center text-xs text-red-500 font-medium">
                  Failed to load companies list
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-slate-500 font-medium">
                  No matching company found.
                </div>
              )
            }
          >
            <Input
              disabled={isCompaniesLoading}
              placeholder={
                isCompaniesLoading
                  ? "Loading companies..."
                  : isCompaniesError
                    ? "Error loading companies"
                    : "Search or enter company name"
              }
              className={INPUT_CLASS}
            />
          </AutoComplete>
        </StyledFormItem>

        {/* 5. Contact No */}
        <StyledFormItem
          name="contact_no"
          label="Contact Person Mobile No."
          normalize={(val) => (val || "").trim().replace(/\D/g, "")}
          rules={[
            { required: true, message: "Mobile number is required" },
            { len: 10, message: "Must be exactly 10 digits" },
            { pattern: /^[6-9]\d{9}$/, message: "Must start with 6, 7, 8, or 9" },
          ]}
        >
          <Input
            maxLength={10}
            placeholder="Enter Customer Mobile No."
            className={INPUT_CLASS}
          />
        </StyledFormItem>

        {/* 6. Customer Document No */}
        <StyledFormItem
          name="customer_dc_no"
          label="Customer Document No."
          normalize={(value) => (value || "").toUpperCase().trimStart()}
        >
          <Input
            placeholder="Enter Document number"
            className={INPUT_CLASS}
          />
        </StyledFormItem>

        {/* 7. Customer Name */}
        <StyledFormItem
          name="customer_name"
          label="Contact Person Name"
          normalize={(value) => (value || "").toUpperCase().trimStart()}
        >
          <Input
            placeholder="Enter Contact Customer name"
            className={INPUT_CLASS}
          />
        </StyledFormItem>

        {/* 8. Worker No */}
        <StyledFormItem
          name="worker_no"
          label="Work Order No."
          normalize={(value) => (value || "").toUpperCase().trimStart()}
        >
          <Input
            placeholder="Enter Your Worker No."
            className={INPUT_CLASS}
          />
        </StyledFormItem>
      </Form>

      {/* Add Company GlobalModal */}
      <GlobalModal
        open={isCompanyModalVisible}
        title="Add New Company"
        onCancel={() => {
          setIsCompanyModalVisible(false);
          companyForm.resetFields();
        }}
        onConfirm={handleSaveNewCompany}
        confirmText="Save Company"
        cancelText="Cancel"
        confirmIcon="lucide:plus"
        cancelIcon="lucide:x"
        loading={isAddingCompany}
        confirmColor="blue"
        cancelColor="cancel"
        width={750}
      >
        <Form
          layout="vertical"
          form={companyForm}
          validateTrigger={["onChange", "onBlur"]}
          className="pt-1 grid grid-cols-3 gap-4"
        >
          <StyledFormItem
            label="Company Name"
            name="company_name"
            normalize={(value) => (value || "").toUpperCase().trimStart()}
            rules={[
              { required: true, message: "Company name is required" },
              { pattern: /^[A-Za-z0-9 _-]{2,40}$/, message: "Invalid format" },
            ]}
          >
            <Input placeholder="Enter company name" className={INPUT_CLASS} />
          </StyledFormItem>
          <StyledFormItem
            label="Customer Name"
            name="customer_name"
            normalize={(value) => (value || "").toUpperCase().trimStart()}
            rules={[
              { pattern: /^[A-Za-z0-9 _-]{2,40}$/, message: "Invalid format" },
            ]}
          >
            <Input placeholder="Enter customer name (optional)" className={INPUT_CLASS} />
          </StyledFormItem>
          <StyledFormItem
            label="Contact No."
            name="contact_no"
            normalize={(val) => (val || "").trim().replace(/\D/g, "")}
            rules={[
              { required: true, message: "Contact number is required" },
              { len: 10, message: "Must be exactly 10 digits" },
              { pattern: /^[6-9]\d{9}$/, message: "Must start with 6, 7, 8, or 9" },
            ]}
          >
            <Input placeholder="Enter contact number" maxLength={10} className={INPUT_CLASS} />
          </StyledFormItem>
        </Form>
      </GlobalModal>
    </>
  );
};

export default InwardForm;
