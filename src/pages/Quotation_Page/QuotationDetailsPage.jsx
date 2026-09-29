import React, { useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";

// Error & State Components
import LoadingState from "@/pages/errorPage/LoadingState";
import ErrorState from "@/pages/errorPage/ErrorState";
import EmptyState from "@/pages/errorPage/EmptyState";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import Button from "@/components/ReusableComponents/Button";
import QuotationDetails from "./_components/QuotationDetails";
import UpdateQuotationPopup from "./_components/UpdateQuotation";
import QuotationStatusDetails from "./_components/QuotationStatusDetails";
import { useGetQuotationDetailsQuery } from "@/store/services/quotation.api";
import { extractIdFromHybridSlug } from "@/utils/slugUtils";
import { ROUTES } from "@/Routes/routes.constants";

const QuotationDetailsPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const contentRef = useRef(null);

  const quotationId = useMemo(() => extractIdFromHybridSlug(slug), [slug]);

  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [isUpdatePopupOpen, setIsUpdatePopupOpen] = useState(false);
  const [quotationToUpdate, setQuotationToUpdate] = useState(null);
  const [showStatusDetails, setShowStatusDetails] = useState(false);

  const {
    data: fullQuotation,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetQuotationDetailsQuery(
    { id: quotationId },
    { skip: !quotationId, refetchOnMountOrArgChange: true },
  );

  const activeQuotation = selectedQuotation || fullQuotation;

  // Sync document title for printing
  React.useEffect(() => {
    if (activeQuotation) {
      const today = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
      const displayDocNo = activeQuotation.doc_no?.split("/").pop() || "001";
      document.title = `${activeQuotation.company_name || "Client"} - ${displayDocNo} - ${today}`;
    } else {
      document.title = "Quotation Details - Sakthi Laser Technology";
    }
    return () => {
      document.title = "Sakthi Laser Technology";
    };
  }, [activeQuotation]);

  const handleBackToList = useCallback(() => {
    navigate(ROUTES.DASHBOARD.QUOTATION);
  }, [navigate]);

  const handleEdit = useCallback(() => {
    if (slug) {
      navigate(`${ROUTES.DASHBOARD.QUOTATION}/form/${slug}`);
    }
  }, [navigate, slug]);

  const handleUpdateClick = (item) => {
    setQuotationToUpdate(item);
    setIsUpdatePopupOpen(true);
  };

  const handleUpdatePopupClose = () => {
    setIsUpdatePopupOpen(false);
    setQuotationToUpdate(null);
  };

  const handleUpdateSuccess = (updatedData) => {
    setSelectedQuotation((prev) => (prev ? { ...prev, ...updatedData } : updatedData));
    setIsUpdatePopupOpen(false);
    setQuotationToUpdate(null);
    refetch();
  };

  const today = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
  const handlePrintTrigger = useReactToPrint({
    contentRef,
    documentTitle: activeQuotation
      ? `${activeQuotation.company_name || "Client"} - ${activeQuotation.doc_no?.split("/").pop() || "000"} - ${today}`
      : "Quotation",
  });

  const handleNativePrint = async () => {
    if (!activeQuotation) return;
    const displayDocNo = activeQuotation.doc_no?.split("/").pop() || "000";
    const filename = `${activeQuotation.company_name || "Client"} - ${displayDocNo} - ${today}`;
    try {
      await navigator.clipboard.writeText(filename);
    } catch (err) {
      console.error("Clipboard error:", err);
    }
    handlePrintTrigger();
  };

  const isFinalStatus = ["won", "lost"].includes(activeQuotation?.status ?? "");
  const canUpdateStatus = !!activeQuotation && !isFinalStatus;

  if (isLoading) {
    return <LoadingState message="Loading quotation details..." />;
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

  if (!quotationId || (!activeQuotation && !isLoading)) {
    return (
      <EmptyState
        title="Quotation Details Not Found"
        description="The requested quotation could not be found or has been removed."
        onAction={handleBackToList}
        actionLabel="Back to Dashboard"
        actionIcon="mdi:arrow-left"
        showHomeButton={false}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md pb-2 pt-2 border-b border-gray-100 mb-4 no-print">
        <PageHeader
          title="Quotation Details"
          actions={
            <div className="flex gap-2 flex-wrap items-center">
              <Button
                color="cancel"
                size="xs"
                icon="lucide:arrow-left"
                onClick={handleBackToList}
              >
                Back
              </Button>

              <Button
                color="red"
                size="xs"
                icon="lucide:pencil"
                onClick={handleEdit}
              >
                Edit
              </Button>

              {canUpdateStatus ? (
                <Button
                  color="blue"
                  size="xs"
                  icon="lucide:pencil"
                  onClick={() => handleUpdateClick(activeQuotation)}
                >
                  Update Status
                </Button>
              ) : null}

              {isFinalStatus ? (
                <Button
                  color="blue"
                  size="xs"
                  icon="lucide:pencil"
                  onClick={() => setShowStatusDetails(true)}
                >
                  Status Details
                </Button>
              ) : null}

              <Button
                color="green"
                size="xs"
                icon="lucide:download"
                onClick={handleNativePrint}
              >
                Download PDF
              </Button>
            </div>
          }
        />
      </div>

      <div className="p-4 sm:p-6 print:p-0">
        <div ref={contentRef}>
          <QuotationDetails
            quotation={{ id: quotationId }}
            onDataFetched={(data) => setSelectedQuotation(data)}
          />
        </div>
      </div>

      <UpdateQuotationPopup
        isOpen={isUpdatePopupOpen}
        onClose={handleUpdatePopupClose}
        quotation={quotationToUpdate}
        onUpdate={handleUpdateSuccess}
      />

      <QuotationStatusDetails
        isOpen={showStatusDetails}
        onClose={() => setShowStatusDetails(false)}
        quotation={activeQuotation}
      />
    </div>
  );
};

export default QuotationDetailsPage;
