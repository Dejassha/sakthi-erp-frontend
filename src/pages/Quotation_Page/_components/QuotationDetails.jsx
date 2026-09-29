import React, { useEffect } from "react";
import QuotationLayout from "./QuotationLayout";
import { useGetQuotationDetailsQuery } from "@/store/services/quotation.api";
import LoadingState from "@/pages/errorPage/LoadingState";
import ErrorState from "@/pages/errorPage/ErrorState";
import EmptyState from "@/pages/errorPage/EmptyState";
import "@/styles/quotation-print.css";

const QuotationDetails = ({ quotation, onDataFetched }) => {
  const {
    data: fullQuotation,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetQuotationDetailsQuery(
    { id: quotation?.id },
    { skip: !quotation?.id },
  );

  useEffect(() => {
    if (fullQuotation) {
      onDataFetched?.(fullQuotation);
    }
  }, [fullQuotation, onDataFetched]);

  if (isLoading) {
    return <LoadingState message="Fetching full quotation details..." />;
  }

  if (isError) {
    return (
      <ErrorState
        error={error}
        onRetry={refetch}
        showHomeButton={false}
      />
    );
  }

  if (!fullQuotation) {
    return (
      <EmptyState
        title="Quotation Not Found"
        description="The requested quotation details could not be loaded."
        showHomeButton={false}
      />
    );
  }

  return (
    <div className="pdf-export-parent">
      <QuotationLayout data={fullQuotation} mode="view" />
    </div>
  );
};

export default QuotationDetails;
