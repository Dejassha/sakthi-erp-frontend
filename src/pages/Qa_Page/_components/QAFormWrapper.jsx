import React, { useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message } from "antd";

// Error & State Components
import LoadingState from "@/pages/errorPage/LoadingState";
import ErrorState from "@/pages/errorPage/ErrorState";
import EmptyState from "@/pages/errorPage/EmptyState";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import StepNavFooter from "@/components/ReusableComponents/StepNavFooter";
import QaForm from "./QAForm";
import { useGetDashboardDetailsQuery } from "@/store/services/utility.api";
import { extractIdFromHybridSlug } from "@/utils/slugUtils";
import { ROUTES } from "@/Routes/routes.constants";

/**
 * QA Form Wrapper Component (Route Level Container)
 */
const QAFormWrapper = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const formRef = useRef(null);

  const productId = useMemo(() => extractIdFromHybridSlug(slug), [slug]);

  // Fetch product details for QA Form
  const {
    data: detailsData,
    isLoading: isDetailsLoading,
    isError: isDetailsError,
    error: detailsError,
    refetch,
  } = useGetDashboardDetailsQuery(
    { product_id: productId, type: "qa" },
    { skip: !productId, refetchOnMountOrArgChange: true },
  );

  const selectedProduct =
    detailsData?.product || (productId ? { id: productId } : null);

  const handleBackToDetail = useCallback(() => {
    if (slug) {
      navigate(`${ROUTES.DASHBOARD.QA}/details/${slug}`);
    } else {
      navigate(ROUTES.DASHBOARD.QA);
    }
  }, [navigate, slug]);

  const handleSuccess = useCallback(() => {
    handleBackToDetail();
    message.success("QA details have been successfully updated.");
  }, [handleBackToDetail]);

  if (isDetailsLoading) {
    return <LoadingState message="Loading QA production form..." />;
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
        title="Production Log Data Not Found"
        description="Product data could not be found for the QA production form."
        onAction={handleBackToDetail}
        actionLabel="Back to Details"
        actionIcon="mdi:arrow-left"
        showHomeButton={false}
      />
    );
  }

  return (
    <div className="w-full">
      <PageHeader title="Production Log Form" />
      <div>
        <QaForm
          ref={formRef}
          product={selectedProduct}
          onBack={handleBackToDetail}
          onSuccess={handleSuccess}
        />
        <StepNavFooter
          currentStep={1}
          totalSteps={1}
          showBackOnFirstStep={true}
          onBack={handleBackToDetail}
          onSubmit={() => formRef.current?.submit()}
          submitLabel="Submit QA"
        />
      </div>
    </div>
  );
};

export default QAFormWrapper;
