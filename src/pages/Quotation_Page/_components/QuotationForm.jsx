import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { message, Select, Form, Input } from "antd";
import { useAuth } from "@/context/useAuth";
import {
  useGetNextDocNumberQuery,
  useAddQuotationMutation,
  useUpdateQuotationMutation,
  useGetQuotationDetailsQuery,
  useGetQuotationNoteQuery,
} from "@/store/services/quotation.api";
import Loader from "@/components/ReusableComponents/Loader";
import Button from "@/components/ReusableComponents/Button";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import { validateQuotation } from "../utils/quotationValidation";
import QuotationLayout from "./QuotationLayout";
import { useGetCompaniesQuery } from "@/store/services/utility.api";
import { useAddCompanyMutation } from "@/store/services/admin.api";
import TextArea from "antd/es/input/TextArea";

const QuotationForm = forwardRef(({ onSuccess, quotationId }, ref) => {
  const { user } = useAuth();
  const userName = user?.username;
  const [form] = Form.useForm();
  const [companyForm] = Form.useForm();
  const today = new Date().toISOString().split("T")[0];

  const createEmptyItem = () => ({
    description: "",
    material: "",
    uom: "",
    quantity: null,
    rate: null,
    total: null,
    remarks: "",
  });

  const [quotation, setQuotation] = useState({
    doc_no: "",
    doc_date: today,
    company_name: "",
    customer_name: "",
    email: "",
    contact: "",
    customer_gst_no: "",
    extra_note: "",
    quotation_note: "",
    net_amount: 0,
    gst_amount: 0,
    gst_percentage: 18,
    total_amount: 0,
    payment_terms: "IMMEDIATE",
    material_terms: "YOURS",
    transport_terms: "YOURS",
    validity_terms: "30 days",
    quote_given_by: userName || "",
    approver_name: "KAVIRAJ",
    approver_designation: "MANAGER",
    approver_contact: "7305559199",
    mode_of_submission: "",
    quote_type: "",
    client_remarks: "",
    quote_value: "",
    billed_value: 0,
    remarks: "",
    bank_name: "FEDERAL BANK",
    bank_account_number: "24245500000057",
    bank_ifsc_code: "FDRL0002424",
    items: Array.from({ length: 5 }, createEmptyItem),
  });

  const { data: companyList = [], isLoading: loading } =
    useGetCompaniesQuery(undefined);
  const { data: quotationNoteList = [] } = useGetQuotationNoteQuery(undefined);
  const [addCompany, { isLoading: isAddingCompany }] = useAddCompanyMutation();
  const [isCompanyModalVisible, setIsCompanyModalVisible] = useState(false);
  const { data: docNumData } = useGetNextDocNumberQuery(undefined, {
    skip: !!quotationId,
  });
  const { data: existingQuotation, isLoading: isFetchingDetails } =
    useGetQuotationDetailsQuery({ id: quotationId }, { skip: !quotationId });
  const [addQuotation, { isLoading: isAdding }] = useAddQuotationMutation();
  const [updateQuotation, { isLoading: isUpdating }] =
    useUpdateQuotationMutation();
  const isSubmitting = isAdding || isUpdating;
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const getFinancialYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startYear = month >= 4 ? year : year - 1;
    return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
  };

  useEffect(() => {
    if (quotationId && existingQuotation) {
      setQuotation({
        ...existingQuotation,
        items:
          existingQuotation.items.length > 0
            ? existingQuotation.items.map((item) => ({ ...item }))
            : Array.from({ length: 5 }, createEmptyItem),
      });
    }
  }, [quotationId, existingQuotation]);

  useEffect(() => {
    if (!quotationId && docNumData?.doc_number) {
      const fy = getFinancialYear();
      const running = String(docNumData.doc_number).padStart(3, "0");
      setQuotation((prev) => ({ ...prev, doc_no: `SLT/${fy}/${running}` }));
    }
  }, [docNumData, quotationId]);

  useEffect(() => {
    if (!quotationId && quotationNoteList.length > 0) {
      const templateNote = quotationNoteList.map((n) => n.note).join(" ");
      setQuotation((prev) => {
        if (!prev.quotation_note) {
          return { ...prev, quotation_note: templateNote };
        }
        return prev;
      });
    }
  }, [quotationNoteList, quotationId]);

  const handleChange = useCallback((field, value) => {
    if (field === "doc_no_number") {
      setQuotation((prev) => {
        const parts = (prev.doc_no || "").split("/");
        const prefix = parts.length >= 2 ? `${parts[0]}/${parts[1]}/` : "";
        const cleaned = String(value)
          .toUpperCase()
          .replace(/[^A-Z0-9-]/g, "");
        return { ...prev, doc_no: `${prefix}${cleaned}` };
      });
      return;
    }
    if (field === "contact") {
      const cleaned = String(value)
        .replace(/[^0-9]/g, "")
        .slice(0, 10);
      setQuotation((prev) => ({
        ...prev,
        contact: cleaned,
      }));
      return;
    }
    if (field === "email") {
      const cleaned = String(value)
        .toLowerCase()
        .replace(/[^a-z0-9@._-]/g, "");
      setQuotation((prev) => ({
        ...prev,
        email: cleaned,
      }));
      return;
    }
    setQuotation((prev) => ({
      ...prev,
      [field]:
        typeof value === "string" &&
        field !== "email" &&
        field !== "process" &&
        field !== "extra_note" &&
        field !== "client_remarks"
          ? value.toUpperCase()
          : value,
    }));
  }, []);

  const handleItemChange = (index, field, value) => {
    setQuotation((prev) => {
      if (!prev) return prev;
      const updatedItems = [...prev.items];
      const currentItem = { ...updatedItems[index] };
      if (field === "description") {
        currentItem.description = String(value).toUpperCase();
      } else if (field === "material") {
        currentItem.material = String(value).toUpperCase();
      } else if (field === "uom") {
        currentItem.uom = String(value).toUpperCase();
      } else if (field === "quantity") {
        const cleaned = String(value).replace(/[^\d.]/g, "");
        if (cleaned.endsWith(".") || cleaned === "") {
          currentItem.quantity = cleaned;
        } else {
          currentItem.quantity = Number(cleaned) || 0;
        }
      } else if (field === "rate") {
        const cleaned = String(value).replace(/[^\d.]/g, "");
        if (cleaned.endsWith(".") || cleaned === "") {
          currentItem.rate = cleaned;
        } else {
          currentItem.rate = Number(cleaned) || 0;
        }
      } else {
        currentItem[field] =
          typeof value === "string" ? value.toUpperCase() : String(value);
      }
      currentItem.total =
        Number(currentItem.quantity) * Number(currentItem.rate) || 0;
      updatedItems[index] = currentItem;
      return {
        ...prev,
        items: updatedItems,
      };
    });
  };

  const addRow = () => {
    setQuotation((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
    }));
  };

  const handleDeleteRow = (index) => {
    setQuotation((prev) => {
      if (!prev) return prev;
      const updatedItems = prev.items.filter((_, i) => i !== index);
      return {
        ...prev,
        items: updatedItems.length > 0 ? updatedItems : [createEmptyItem()],
      };
    });
  };

  const handleItemsPaste = (pastedItems) => {
    setQuotation((prev) => {
      if (!prev) return prev;
      const existingItems = prev.items.filter(
        (item) =>
          item.description.trim() !== "" ||
          item.material.trim() !== "" ||
          item.uom.trim() !== "" ||
          (item.quantity !== null && item.quantity !== 0) ||
          (item.rate !== null && item.rate !== 0) ||
          item.remarks.trim() !== "",
      );
      const newItems = [...existingItems, ...pastedItems];
      return {
        ...prev,
        items:
          newItems.length > 0
            ? newItems
            : Array.from({ length: 5 }, createEmptyItem),
      };
    });
  };

  const totals = useMemo(() => {
    const net = quotation.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0),
      0,
    );
    const gst = net * (quotation.gst_percentage / 100);
    const total = net + gst;
    return { net, gst, total };
  }, [quotation.items, quotation.gst_percentage]);

  useEffect(() => {
    setQuotation((prev) => ({
      ...prev,
      net_amount: totals.net,
      gst_amount: totals.gst,
      total_amount: totals.total,
    }));
  }, [totals]);

  const validation = useMemo(
    () => validateQuotation(quotation, quotation.doc_no || ""),
    [quotation],
  );
  const isValid = validation.valid;

  const handleOpenSubmitModal = () => {
    if (!isValid) {
      setShowValidation(true);
      if (validation.message) {
        message.error(validation.message);
      }
      return;
    }
    setQuotation((prev) => ({
      ...prev,
      mode_of_submission: prev.mode_of_submission || "EMAIL",
      quote_type: prev.quote_type || "EXISTING",
    }));
    setShowSubmitModal(true);
  };

  const handleSelectCompany = (value) => {
    const company = companyList.find((c) => c.company_name === value);
    if (!company) return;
    const cleanVal = (val) => (val && val !== "-" ? val.toUpperCase() : "");
    setQuotation((prev) => ({
      ...prev,
      company_name: company.company_name.toUpperCase(),
      customer_name: cleanVal(company.customer_name),
      contact:
        company.contact_no && company.contact_no !== "-"
          ? company.contact_no
          : prev.contact,
    }));
  };

  const handleCompanySearch = (value) => {
    setQuotation((prev) => ({ ...prev, company_name: value.toUpperCase() }));
  };

  const handleSaveNewCompany = async () => {
    try {
      const values = await companyForm.validateFields();
      const companyToSave = {
        company_name: values.company_name?.toUpperCase().trim(),
        customer_name: values.customer_name?.toUpperCase().trim() || "-",
        contact_no: values.contact_no?.trim() || "",
      };
      await addCompany(companyToSave).unwrap();
      message.success("Company added successfully");
      setQuotation((prev) => ({
        ...prev,
        company_name: companyToSave.company_name,
        customer_name: values.customer_name
          ? values.customer_name.toUpperCase()
          : "-",
        contact: values.contact_no,
      }));
      setIsCompanyModalVisible(false);
      companyForm.resetFields();
    } catch (err) {
      const error = err;
      if (error.errorFields) return;
      message.error(
        error?.data?.message || error.message || "Failed to add company",
      );
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      const formatNum = (val) => Number(Number(val || 0).toFixed(2));
      const payload = {
        ...quotation,
        net_amount: formatNum(quotation.net_amount),
        gst_amount: formatNum(quotation.gst_amount),
        total_amount: formatNum(quotation.total_amount),
        items: quotation.items
          .filter((i) => i.description.trim() !== "")
          .map((i) => ({
            ...i,
            quantity: Number(i.quantity),
            rate: Number(i.rate),
            total: formatNum(i.total),
          })),
      };
      let result;
      if (quotationId) {
        result = await updateQuotation({
          id: quotationId,
          data: payload,
        }).unwrap();
      } else {
        result = await addQuotation(payload).unwrap();
      }
      message.success(
        `Quotation ${quotationId ? "updated" : "created"} successfully`,
      );
      setShowValidation(false);
      onSuccess(result);
    } catch (err) {
      const error = err;
      if (
        error?.data &&
        typeof error.data === "object" &&
        !error.data.message
      ) {
        Object.entries(error.data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg) => message.error(`${field}: ${msg}`));
          } else {
            message.error(`${field}: ${messages}`);
          }
        });
      } else {
        message.error(
          error?.data?.message || error.message || "Failed to save quotation",
        );
      }
    }
  };

  const handleFinalSubmit = async () => {
    setShowSubmitModal(false);
    await handleSubmit();
  };

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
    openSubmitModal: handleOpenSubmitModal,
    isValid: () => isValid,
  }));

  if (isFetchingDetails) {
    return <Loader text="Loading quotation for edit..." fullScreen={false} />;
  }

  return (
    <div>
      <QuotationLayout
        data={quotation}
        mode={quotationId ? "edit" : "create"}
        onChange={handleChange}
        onItemChange={handleItemChange}
        onAddRow={addRow}
        onDeleteRow={handleDeleteRow}
        onItemsPaste={handleItemsPaste}
        showValidation={showValidation}
        companyList={companyList}
        isAddingCompany={isAddingCompany}
        isCompanyModalVisible={isCompanyModalVisible}
        setIsCompanyModalVisible={setIsCompanyModalVisible}
        handleSelectCompany={handleSelectCompany}
        handleCompanySearch={handleCompanySearch}
        loadingCompanies={loading}
      />

      <GlobalModal
        open={showSubmitModal}
        title="Before Saving"
        onConfirm={handleFinalSubmit}
        onCancel={() => setShowSubmitModal(false)}
        confirmText={isSubmitting ? "Saving..." : "Confirm & Save"}
        confirmIcon="lucide:check-circle"
        loading={isSubmitting}
        confirmColor="blue"
        cancelColor="cancel"
        width={420}
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium block mb-1">Mode of Submission</label>
            <Select
              value={quotation.mode_of_submission}
              onChange={(val) => handleChange("mode_of_submission", val)}
              className="w-full"
              size="large"
              options={[
                { value: "EMAIL", label: "EMAIL" },
                { value: "WHATSAPP", label: "WHATSAPP" },
                { value: "DIRECT", label: "DIRECT" },
              ]}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Quote Type</label>
            <Select
              value={quotation.quote_type}
              onChange={(val) => handleChange("quote_type", val)}
              className="w-full"
              size="large"
              options={[
                { value: "EXISTING", label: "EXISTING" },
                { value: "NEW", label: "NEW" },
              ]}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Remarks</label>
            <TextArea
              value={quotation.client_remarks}
              onChange={(e) => handleChange("client_remarks", e.target.value)}
              className="w-full"
              size="large"
              placeholder="Client Remarks"
              rows={3}
            />
          </div>
        </div>
      </GlobalModal>

      <GlobalModal
        open={isCompanyModalVisible}
        title="Add New Company"
        onConfirm={handleSaveNewCompany}
        onCancel={() => {
          setIsCompanyModalVisible(false);
          companyForm.resetFields();
        }}
        confirmText="Save Company"
        confirmIcon="lucide:check"
        loading={isAddingCompany}
        confirmColor="blue"
        cancelColor="cancel"
        width={550}
      >
        <div className="pt-2">
          <Form layout="vertical" form={companyForm}>
            <Form.Item
              label="Company Name"
              name="company_name"
              normalize={(value) => (value || "").toUpperCase()}
              rules={[
                { required: true, message: "Company name is required" },
                {
                  pattern: /^[A-Za-z0-9 _-]{2,40}$/,
                  message: "Invalid format",
                },
              ]}
            >
              <Input placeholder="Enter company name" />
            </Form.Item>
            <Form.Item
              label="Customer Name"
              name="customer_name"
              normalize={(value) => (value || "").toUpperCase()}
              rules={[
                {
                  pattern: /^[A-Za-z0-9 _-]{2,40}$/,
                  message: "Invalid format",
                },
              ]}
            >
              <Input placeholder="Enter customer name (optional)" />
            </Form.Item>
            <Form.Item
              label="Contact No."
              name="contact_no"
              rules={[
                { required: true, message: "Contact number is required" },
                { len: 10, message: "Must be exactly 10 digits" },
                { pattern: /^[6-9]/, message: "Must start with 6-9" },
              ]}
            >
              <Input placeholder="Enter contact number" maxLength={10} />
            </Form.Item>
          </Form>
        </div>
      </GlobalModal>
    </div>
  );
});

QuotationForm.displayName = "QuotationForm";
export default QuotationForm;
