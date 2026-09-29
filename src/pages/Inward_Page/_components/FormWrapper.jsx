import React, { Suspense, lazy } from "react";
import Loader from "@/components/ReusableComponents/Loader";

// Lazy-loaded Step Components
const InwardForm = lazy(() => import("./InwardForm"));
const MaterialTable = lazy(() => import("./InwardTable"));
const InspectionDetails = lazy(() => import("./InwardSummary"));

const FormWrapper = ({
  step,
  setStep,
  formData,
  setFormData,
  formStep1,
  formStep2,
}) => {
  return (
    <div
      className={`w-full ${step === 1
        ? "bg-white rounded-xl shadow-sm border border-gray-100 p-4"
        : ""
        }`}
    >
      <Suspense fallback={<Loader fullScreen={false} />}>
        {step === 1 ? (
          <InwardForm
            form={formStep1}
            formData={formData}
            setFormData={setFormData}
            onNextStep={() => setStep(2)}
          />
        ) : null}
        {step === 2 ? (
          <MaterialTable
            form={formStep2}
            formData={formData}
            setFormData={setFormData}
            onNextStep={() => setStep(3)}
          />
        ) : null}
        {step === 3 ? (
          <InspectionDetails
            formData={formData}
            setFormData={setFormData}
          />
        ) : null}
      </Suspense>
    </div>
  );
};

export default FormWrapper;
