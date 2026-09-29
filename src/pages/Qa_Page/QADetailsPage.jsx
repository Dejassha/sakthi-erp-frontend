import React, { useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
// Error & State Components
import LoadingState from "@/pages/errorPage/LoadingState";
import ErrorState from "@/pages/errorPage/ErrorState";
import EmptyState from "@/pages/errorPage/EmptyState";
import DashboardDetails from "@/pages/Dashboard_Page/DashboardDetails";
import { useGetDashboardDetailsQuery } from "@/store/services/utility.api";
import { extractIdFromHybridSlug } from "@/utils/slugUtils";
import { ROUTES } from "@/Routes/routes.constants";

const QADetailsPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const productId = useMemo(() => extractIdFromHybridSlug(slug), [slug]);

  // Fetch product details for QA
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

  const handleBackToList = useCallback(() => {
    navigate(ROUTES.DASHBOARD.QA);
  }, [navigate]);

  const handleProceed = useCallback(() => {
    if (slug) {
      navigate(`${ROUTES.DASHBOARD.QA}/form/${slug}`);
    }
  }, [navigate, slug]);

  if (isDetailsLoading) {
    return <LoadingState message="Loading QA production log details..." />;
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
        title="Production Log Details Not Found"
        description="The requested production log details could not be found or have been removed."
        onAction={handleBackToList}
        actionLabel="Back to Dashboard"
        actionIcon="mdi:arrow-left"
        showHomeButton={false}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="w-full h-full">
        <DashboardDetails
          product={selectedProduct}
          onBack={handleBackToList}
          onProceed={handleProceed}
        />
      </div>
    </div>
  );
};

export default QADetailsPage;
