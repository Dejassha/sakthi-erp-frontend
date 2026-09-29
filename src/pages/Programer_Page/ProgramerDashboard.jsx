import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import DashboardList from "@/pages/Dashboard_Page/DashboardList";
import { toHybridSlug } from "@/utils/slugUtils";
import { ROUTES } from "@/Routes/routes.constants";

const ProgramerDashboard = () => {
  const navigate = useNavigate();

  const handleViewDetail = useCallback(
    (item) => {
      const productSlug = toHybridSlug(
        item?.company_name || item?.inward_slip_number || "program",
        item?.id,
        "prg",
      );
      navigate(`${ROUTES.DASHBOARD.PROGRAMER}/details/${productSlug}`);
    },
    [navigate],
  );

  return (
    <div className="w-full">
      <PageHeader title="Programer Dashboard" />
      <div className="w-full h-full">
        <DashboardList type="programmer" onView={handleViewDetail} />
      </div>
    </div>
  );
};

export default ProgramerDashboard;
