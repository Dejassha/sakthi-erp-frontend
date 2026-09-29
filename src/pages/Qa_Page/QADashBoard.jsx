import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import DashboardList from "@/pages/Dashboard_Page/DashboardList";
import { toHybridSlug } from "@/utils/slugUtils";
import { ROUTES } from "@/Routes/routes.constants";

const QADashboard = () => {
  const navigate = useNavigate();

  const handleViewDetail = useCallback(
    (item) => {
      const productSlug = toHybridSlug(
        item?.company_name || item?.inward_slip_number || "qa",
        item?.id,
        "qa",
      );
      navigate(`${ROUTES.DASHBOARD.QA}/details/${productSlug}`);
    },
    [navigate],
  );

  return (
    <div className="w-full">
      <PageHeader title="Production Log Dashboard" />
      <div className="w-full h-full">
        <DashboardList type="qa" onView={handleViewDetail} />
      </div>
    </div>
  );
};

export default QADashboard;
