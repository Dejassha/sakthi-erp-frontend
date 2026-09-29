import React from "react";
import AdminReports from "@/components/AdminComponents/ReportComponents/AdminReports";

const ReportsDashboard = () => {
  return (
    <div className="w-full">
      <AdminReports showHeader={true} title="Report Dashboard" />
    </div>
  );
};

export default ReportsDashboard;
