/**
 * Quotation Report Utilities & Helpers
 */

/**
 * Format numeric value to Indian Currency Format (₹ #,##,###.##)
 * @param {number|string} val
 * @param {boolean} showDecimals
 * @returns {string}
 */
export const formatCurrency = (val, showDecimals = true) => {
  const num = Number(val || 0);
  if (isNaN(num)) return "₹ 0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(num);
};

/**
 * Format percentage
 * @param {number|string} val
 * @returns {string}
 */
export const formatPercent = (val) => {
  const num = Number(val || 0);
  return `${num.toFixed(2)}%`;
};

/**
 * Calculate KPI summary totals from monthly statistics
 * @param {Array} monthlyData
 * @param {Array} cumulativeData
 * @returns {Object}
 */
export const calculateReportMetrics = (monthlyData = [], cumulativeData = []) => {
  // Aggregate from monthlyData if available
  let totalQuotesSent = monthlyData.reduce((acc, row) => acc + (Number(row.quotes_sent) || 0), 0);
  let totalOrdersReceived = monthlyData.reduce((acc, row) => acc + (Number(row.orders_received) || 0), 0);
  let totalLostQuotes = monthlyData.reduce((acc, row) => acc + (Number(row.lost_quotations) || 0), 0);
  let totalPendingQuotes = monthlyData.reduce((acc, row) => acc + (Number(row.pending) || 0), 0);
  let totalQuoteValue = monthlyData.reduce((acc, row) => acc + (Number(row.quote_value) || 0), 0);
  let totalBilledValue = monthlyData.reduce((acc, row) => acc + (Number(row.billed_value) || 0), 0);

  // Cross-reference with cumulativeData if monthlyData is sparse
  if (cumulativeData && cumulativeData.length > 0) {
    cumulativeData.forEach((item) => {
      const label = String(item.label || "").toLowerCase();
      const count = Number(item.count) || 0;
      const val = typeof item.value === "number" ? item.value : 0;

      if (label.includes("quotations sent") && totalQuotesSent === 0) {
        totalQuotesSent = count;
        if (totalQuoteValue === 0) totalQuoteValue = val;
      } else if (label.includes("orders won") && totalOrdersReceived === 0) {
        totalOrdersReceived = count;
      } else if (label.includes("lost") && totalLostQuotes === 0) {
        totalLostQuotes = count;
      } else if (label.includes("tracking") || label.includes("pending")) {
        if (totalPendingQuotes === 0) totalPendingQuotes = count;
      }
    });
  }

  const overallConversion = totalQuotesSent > 0
    ? (totalOrdersReceived / totalQuotesSent) * 100
    : 0;

  return {
    totalQuotesSent,
    totalOrdersReceived,
    totalLostQuotes,
    totalPendingQuotes,
    totalQuoteValue,
    totalBilledValue,
    overallConversion: overallConversion.toFixed(2),
  };
};

/**
 * Common AG-Grid default column definition for crisp, corporate styling
 */
export const defaultReportColDef = {
  cellClass: "ag-center-cell text-[11px] font-medium text-slate-800",
  headerClass: "ag-center-header text-[11px] font-bold text-slate-700 uppercase tracking-wider",
  resizable: true,
  sortable: false,
  filter: false,
  suppressMenu: true,
  floatingFilter: false,
};

