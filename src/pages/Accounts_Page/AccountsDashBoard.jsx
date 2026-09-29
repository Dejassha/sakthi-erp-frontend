import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import DashboardList from "@/pages/Dashboard_Page/DashboardList";
import { toHybridSlug } from "@/utils/slugUtils";
import { ROUTES } from "@/Routes/routes.constants";

const AccountsDashboard = () => {
  const navigate = useNavigate();

  const handleViewDetail = useCallback(
    (item) => {
      const productSlug = toHybridSlug(
        item?.company_name || item?.inward_slip_number || "acc",
        item?.id,
        "acc",
      );
      navigate(`${ROUTES.DASHBOARD.ACCOUNTS}/details/${productSlug}`);
    },
    [navigate],
  );

  return (
    <div className="w-full">
      <PageHeader title="Accounts Dashboard" />
      <div className="w-full h-full">
        <DashboardList type="accounts" onView={handleViewDetail} />
      </div>
    </div>
  );
};

export default AccountsDashboard;
