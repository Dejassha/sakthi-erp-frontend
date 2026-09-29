import React, { useMemo } from "react";
import LoadingState from "@/pages/errorPage/LoadingState";
import ErrorState from "@/pages/errorPage/ErrorState";
import {
  useGetQuotationReportsQuery,
  useExportQuotationReportsExcelMutation,
} from "@/store/services/quotation.api";
import QuotationReportHeader from "./QuotationReportHeader";
import CumulativeSummaryTable from "./CumulativeSummaryTable";
import MonthlyStatisticsTable from "./MonthlyStatisticsTable";
import { calculateReportMetrics } from "./quotationReportUtils";
import { downloadQuotationExcel } from "./exportQuotationExcel";

const CumulativeQuotationReport = () => {
  const { data, error, isLoading, isFetching, refetch } =
    useGetQuotationReportsQuery(undefined, {
      refetchOnMountOrArgChange: true,
    });

  const [exportExcelMutation, { isLoading: isExportingExcel }] =
    useExportQuotationReportsExcelMutation();

  const cumulativeData = useMemo(() => data?.cumulative || [], [data]);
  const monthlyData = useMemo(() => data?.monthly || [], [data]);

  const metrics = useMemo(
    () => calculateReportMetrics(monthlyData, cumulativeData),
    [monthlyData, cumulativeData]
  );

  const handleExportExcel = async () => {
    await downloadQuotationExcel(exportExcelMutation, {
      cumulativeData,
      monthlyData,
    });
  };

  if (isLoading) {
    return <LoadingState message="Loading Cumulative Quotation Report..." />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        description="An error occurred while fetching the quotation metrics from the server."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header with KPI cards and export action buttons */}
      <QuotationReportHeader
        metrics={metrics}
        isExportingExcel={isExportingExcel}
        onExportExcel={handleExportExcel}
      />

      {/* Section 1: Cumulative Summary */}
      <CumulativeSummaryTable data={cumulativeData} />

      {/* Section 2: Month Wise Statistics */}
      <MonthlyStatisticsTable data={monthlyData} />
    </div>
  );
};

export default CumulativeQuotationReport;
