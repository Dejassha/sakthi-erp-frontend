import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { Form, message } from "antd";
import { useAddInwardDetailsMutation } from "@/store/services/inward.api";
import StepHeader from "@/components/ReusableComponents/StepHeader";
import StepNavFooter from "@/components/ReusableComponents/StepNavFooter";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import FormWrapper from "./_components/FormWrapper";
import {
  setStep,
  setFormData,
  resetInwardForm,
} from "@/store/slices/inwardSlice";

const InwardDashboard = () => {
  const steps = ["Add Product", "Material Details", "Summary"];
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  // Antd Form instances for step validation
  const [formStep1] = Form.useForm();
  const [formStep2] = Form.useForm();

  // Redux States
  const { step, formData } = useSelector((state) => state.inward);

  // Modal State
  const [showGlobalModal, setShowGlobalModal] = useState(false);

  // RTK Query
  const [addInwardDetails, { isLoading }] = useAddInwardDetailsMutation();

  // Always start at Step 1 on initial mount / reload and clean up query params
  useEffect(() => {
    dispatch(setStep(1));
    if (searchParams.has("step")) {
      searchParams.delete("step");
      setSearchParams(searchParams, { replace: true });
    }
  }, [dispatch, searchParams, setSearchParams]);

  const changeStep = (targetStep) => {
    dispatch(setStep(targetStep));
  };

  const handleNext = async () => {
    if (step === 1) {
      try {
        await formStep1.validateFields();
        changeStep(2);
      } catch {
        // Antd automatically displays error messages on invalid fields
      }
    } else if (step === 2) {
      try {
        await formStep2.validateFields();
        changeStep(3);
      } catch {
        // Antd automatically displays error messages on invalid fields
      }
    } else if (step < 3) {
      changeStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      changeStep(step - 1);
    }
  };

  const handleReset = () => {
    dispatch(resetInwardForm());
    formStep1.resetFields();
    formStep1.setFieldsValue({
      inward_slip_number: "",
      sheet_type: "jobcard",
      worker_no: "",
      company_name: "",
      customer_name: "",
      customer_dc_no: "",
      contact_no: "",
      job_type: "",
    });
    formStep2.resetFields();
    changeStep(1);
  };

  const handleSubmit = async () => {
    try {
      await addInwardDetails(formData).unwrap();
      message.success("Inward Data has been successfully added!");
      handleReset();
    } catch (err) {
      const errorMessage =
        err?.data?.error ||
        err?.data?.message ||
        "Failed to submit Inward Data";
      message.error(errorMessage);
    } finally {
      setShowGlobalModal(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full mx-auto">
      <div className="w-full">
        {/* Header Section */}
        <StepHeader
          title="Material Inward Form"
          steps={steps}
          currentStep={step}
        />

        {/* Step Components Container */}
        <FormWrapper
          step={step}
          setStep={(val) => changeStep(val)}
          formData={formData}
          setFormData={(val) => dispatch(setFormData(val))}
          formStep1={formStep1}
          formStep2={formStep2}
        />

        {/* Navigation Buttons */}
        <StepNavFooter
          currentStep={step}
          totalSteps={steps.length}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={() => setShowGlobalModal(true)}
          loading={isLoading}
        />
      </div>

      {/* REUSABLE CONFIRMATION DIALOG */}
      <GlobalModal
        open={showGlobalModal}
        title="Confirm Submission"
        description="Are you sure you want to add this product and its materials to Inward?"
        onConfirm={handleSubmit}
        onCancel={() => setShowGlobalModal(false)}
        loading={isLoading}
      />
    </div>
  );
};

export default InwardDashboard;
