import React, { useMemo } from "react";
import { Tooltip } from "antd";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import Button from "@/components/ReusableComponents/Button";
import ReportKPICards from "@/components/ReusableComponents/ReportKPICards";
import { formatCurrency, formatPercent } from "./quotationReportUtils";

const QuotationReportHeader = ({
  metrics,
  isExportingExcel,
  onExportExcel,
}) => {
  const kpiCards = useMemo(() => {
    if (!metrics) return [];
    return [
      {
        key: "sent",
        label: "Quotes Sent",
        value: metrics.totalQuotesSent,
        subText: "All inquiries",
        icon: "lucide:send",
        color: "slate",
      },
      {
        key: "won",
        label: "Orders Won",
        value: metrics.totalOrdersReceived,
        subText: "Confirmed POs",
        icon: "lucide:check-circle-2",
        color: "emerald",
      },
      {
        key: "conversion",
        label: "Conversion %",
        value: formatPercent(metrics.overallConversion),
        subText: "Win ratio",
        icon: "lucide:percent",
        color: "blue",
        isStringValue: true,
      },
      {
        key: "quoteValue",
        label: "Total Quote Value",
        value: formatCurrency(metrics.totalQuoteValue, false),
        subText: "Estimated pipeline",
        icon: "lucide:trending-up",
        color: "indigo",
        isStringValue: true,
      },
      {
        key: "billedValue",
        label: "Total Billed Value",
        value: formatCurrency(metrics.totalBilledValue, false),
        subText: "Revenue realized",
        icon: "lucide:receipt",
        color: "teal",
        isStringValue: true,
      },
      {
        key: "lost",
        label: "Tracking / Lost",
        value: `${metrics.totalPendingQuotes ?? 0} / ${metrics.totalLostQuotes ?? 0}`,
        subText: "Pending / Lost",
        icon: "lucide:clock-3",
        color: "amber",
        isStringValue: true,
      },
    ];
  }, [metrics]);

  return (
    <div className="flex flex-col gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
      {/* Top Bar using standard PageHeader */}
      <PageHeader
        title="Cumulative Quotation Performance"
        className="!pb-0"
        actions={
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip title="Download Excel (.xlsx) generated via XlsxWriter">
              <Button
                color="green"
                size="xs"
                icon="lucide:file-spreadsheet"
                onClick={onExportExcel}
                loading={isExportingExcel}
                className="shadow-xs"
              >
                Export Excel
              </Button>
            </Tooltip>
          </div>
        }
      />

      {/* KPI Metric Cards using reusable ReportKPICards */}
      {kpiCards.length > 0 && (
        <div className="border-t border-slate-100 pt-2">
          <ReportKPICards cards={kpiCards} />
        </div>
      )}
    </div>
  );
};

export default QuotationReportHeader;
