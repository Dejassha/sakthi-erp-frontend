import React, { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import Button from "@/components/ReusableComponents/Button";
import QuotationList from "./_components/QuotationList";
import { toHybridSlug } from "@/utils/slugUtils";
import { ROUTES } from "@/Routes/routes.constants";

const QuotationDashboard = () => {
  const navigate = useNavigate();
  const tableRef = useRef(null);

  const handleViewDetail = useCallback(
    (item) => {
      const productSlug = toHybridSlug(
        item?.company_name || item?.doc_no || "quo",
        item?.id,
        "quo",
      );
      navigate(`${ROUTES.DASHBOARD.QUOTATION}/details/${productSlug}`);
    },
    [navigate],
  );

  const handleEditQuotation = useCallback(
    (item) => {
      const productSlug = toHybridSlug(
        item?.company_name || item?.doc_no || "quo",
        item?.id,
        "quo",
      );
      navigate(`${ROUTES.DASHBOARD.QUOTATION}/form/${productSlug}`);
    },
    [navigate],
  );

  const handleCreateNew = useCallback(() => {
    navigate(`${ROUTES.DASHBOARD.QUOTATION}/create`);
  }, [navigate]);

  return (
    <div className="w-full">
      <PageHeader
        title="Quotation Dashboard"
        actions={
          <Button
            color="blue"
            size="xs"
            icon="lucide:plus"
            onClick={handleCreateNew}
          >
            Add Quotation
          </Button>
        }
      />
      <div className="w-full h-full">
        <QuotationList
          ref={tableRef}
          onViewDetail={handleViewDetail}
          onEdit={handleEditQuotation}
        />
      </div>
    </div>
  );
};

export default QuotationDashboard;
