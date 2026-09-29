import React, { useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import Button from "@/components/ReusableComponents/Button";
import QuotationForm from "./_components/QuotationForm";
import { extractIdFromHybridSlug, toHybridSlug } from "@/utils/slugUtils";
import { ROUTES } from "@/Routes/routes.constants";

const QuotationFormWrapper = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const quotationFormRef = useRef(null);

  const quotationId = useMemo(() => {
    if (!slug || slug === "create" || slug === "new") return null;
    return extractIdFromHybridSlug(slug);
  }, [slug]);

  const isEdit = !!quotationId;

  const handleBack = useCallback(() => {
    if (isEdit && slug) {
      navigate(`${ROUTES.DASHBOARD.QUOTATION}/details/${slug}`);
    } else {
      navigate(ROUTES.DASHBOARD.QUOTATION);
    }
  }, [navigate, isEdit, slug]);

  const handleSuccess = useCallback(
    (updatedItem) => {
      const targetSlug =
        slug && slug !== "create"
          ? slug
          : toHybridSlug(
              updatedItem?.company_name || updatedItem?.doc_no || "quo",
              updatedItem?.id,
              "quo",
            );
      navigate(`${ROUTES.DASHBOARD.QUOTATION}/details/${targetSlug}`);
    },
    [navigate, slug],
  );

  return (
    <div className="w-full">
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md pb-2 pt-2 border-b border-gray-100 mb-4 no-print">
        <PageHeader
          title={isEdit ? "Edit Quotation" : "Create New Quotation"}
          actions={
            <div className="flex gap-2 items-center">
              <Button
                color="cancel"
                size="xs"
                icon="lucide:arrow-left"
                onClick={handleBack}
              >
                Back
              </Button>
              <Button
                color="blue"
                size="xs"
                icon="lucide:save"
                onClick={() => quotationFormRef.current?.openSubmitModal()}
              >
                {isEdit ? "Update Quotation" : "Save Quotation"}
              </Button>
            </div>
          }
        />
      </div>
      <div className="">
        <QuotationForm
          ref={quotationFormRef}
          quotationId={quotationId}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
};

export default QuotationFormWrapper;
