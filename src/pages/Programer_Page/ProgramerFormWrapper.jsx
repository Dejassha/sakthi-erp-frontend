import React, { useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

// antd
import { message, Form } from "antd";

// RTK Query
import {
  useGetDashboardDetailsQuery,
  useGetMaterialsByProductQuery,
} from "@/store/services/utility.api";

// Reusable Components, Error States & Utils
import LoadingState from "@/pages/errorPage/LoadingState";
import ErrorState from "@/pages/errorPage/ErrorState";
import EmptyState from "@/pages/errorPage/EmptyState";
import StepHeader from "@/components/ReusableComponents/StepHeader";
import StepNavFooter from "@/components/ReusableComponents/StepNavFooter";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import { extractIdFromHybridSlug } from "@/utils/slugUtils";
import { ROUTES } from "@/Routes/routes.constants";

// Form Subcomponents & Hooks
import ProgramerStep1 from "./_components/ProgramerStep1";
import ProgramerStep2 from "./_components/ProgramerStep2";
import { useProgramerFormLogic } from "./utils/useProgramerFormLogic";

/**
 * Programer Form Inner Component
 */
const ProgramerForm = ({ item, onBack, onSuccess }) => {
  const product_id = item?.id;
  const { data: materials = [] } = useGetMaterialsByProductQuery(
    product_id || 0,
    {
      skip: !product_id,
    },
  );

  const {
    currentStep,
    changeStep,
    form,
    confirmOpen,
    setConfirmOpen,
    isSubmitting,
    handleChange,
    handleNext,
    handleBack,
    handleSubmit,
    validateProcessedQuantity,
    validateProcessedWidth,
    validateProcessedLength,
    validateNonNegative,
  } = useProgramerFormLogic({
    item,
    materials,
    onBack,
    onSuccess,
  });

  return (
    <>
      <GlobalModal
        open={confirmOpen}
        title="Confirm Submission"
        description="Are you sure you want to submit this programmer data?"
        onConfirm={handleSubmit}
        onCancel={() => setConfirmOpen(false)}
        confirmText="Submit"
        cancelText="Cancel"
        loading={isSubmitting}
        confirmColor="blue"
        cancelColor="cancel"
      />

      <div className="w-full flex flex-col">
        {/* Header Section */}
        <StepHeader
          title="Programer Form"
          steps={["Programer Details", "Program Data"]}
          currentStep={currentStep}
        />

        <div className="w-full">
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleChange}
            requiredMark={false}
            preserve={true}
          >
            {currentStep === 1 && <ProgramerStep1 materials={materials} />}

            {currentStep === 2 && (
              <ProgramerStep2
                validateNonNegative={validateNonNegative}
                validateProcessedQuantity={validateProcessedQuantity}
                validateProcessedWidth={validateProcessedWidth}
                validateProcessedLength={validateProcessedLength}
              />
            )}

            <StepNavFooter
              currentStep={currentStep}
              totalSteps={2}
              showBackOnFirstStep={true}
              onBack={handleBack}
              onNext={handleNext}
              onSubmit={() => {
                form
                  .validateFields()
                  .then(() => setConfirmOpen(true))
                  .catch((err) => {
                    const errorFields =
                      err?.errorFields?.map((f) => f.name[0]) || [];
                    const step1Fields = [
                      "material_details",
                      "program_no",
                      "program_date",
                    ];
                    const hasStep1Error = errorFields.some((f) =>
                      step1Fields.includes(f),
                    );

                    if (hasStep1Error) {
                      changeStep(1);
                      message.error(
                        "Please complete required fields in Step 1 first",
                      );
                    } else {
                      message.error("Please fill all required fields");
                    }
                  });
              }}
              submitLabel="Submit"
              loading={isSubmitting}
            />
          </Form>
        </div>
      </div>
    </>
  );
};

/**
 * Programer Form Wrapper (Route Level Container)
 */
const ProgramerFormWrapper = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const productId = useMemo(() => extractIdFromHybridSlug(slug), [slug]);

  // Fetch product details for the form
  const {
    data: detailsData,
    isLoading: isDetailsLoading,
    isError: isDetailsError,
    error: detailsError,
    refetch,
  } = useGetDashboardDetailsQuery(
    { product_id: productId, type: "programer" },
    { skip: !productId, refetchOnMountOrArgChange: true },
  );

  const selectedProduct =
    detailsData?.product || (productId ? { id: productId } : null);

  const handleBackToDetail = useCallback(() => {
    if (slug) {
      navigate(`${ROUTES.DASHBOARD.PROGRAMER}/details/${slug}`);
    } else {
      navigate(ROUTES.DASHBOARD.PROGRAMER);
    }
  }, [navigate, slug]);

  const handleSuccess = useCallback(() => {
    handleBackToDetail();
    message.success("Program details have been successfully updated.");
  }, [handleBackToDetail]);

  if (isDetailsLoading) {
    return <LoadingState message="Loading program form..." />;
  }

  if (isDetailsError) {
    return (
      <ErrorState
        error={detailsError}
        onRetry={refetch}
        showHomeButton={false}
      />
    );
  }

  if (!selectedProduct) {
    return (
      <EmptyState
        title="Program Data Not Found"
        description="Product data could not be found for the programmer form."
        onAction={handleBackToDetail}
        actionLabel="Back to Details"
        actionIcon="mdi:arrow-left"
        showHomeButton={false}
      />
    );
  }

  return (
    <div className="w-full">
      <ProgramerForm
        item={selectedProduct}
        onBack={handleBackToDetail}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default ProgramerFormWrapper;
