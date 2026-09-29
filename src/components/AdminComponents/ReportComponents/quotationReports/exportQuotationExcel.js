import { message } from "antd";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

/**
 * Trigger download of the high-fidelity XlsxWriter generated Excel report.
 * Attempts backend export first, falling back to client-side XLSX generation.
 * 
 * @param {Function} exportMutation - RTK Query mutation trigger
 * @param {Object} payload - Object containing cumulativeData and monthlyData
 * @returns {Promise<boolean>}
 */
export const downloadQuotationExcel = async (
  exportMutation,
  { cumulativeData = [], monthlyData = [] } = {}
) => {
  message.loading({
    content: "Generating Cumulative Quotation Excel report...",
    key: "excel_export",
    duration: 0,
  });

  const todayStr = dayjs().format("YYYY-MM-DD");
  const fileName = `Cumulative_Quotation_Report_${todayStr}.xlsx`;

  try {
    if (typeof exportMutation === "function") {
      const blob = await exportMutation().unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success({
        content: "Quotation Excel report exported successfully!",
        key: "excel_export",
        duration: 3,
      });
      return true;
    }
  } catch (backendError) {
    console.warn(
      "Backend Excel export encountered an issue, falling back to client-side XLSX generator:",
      backendError
    );
  }

  // Fallback client-side generation using xlsx library
  try {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Cumulative Summary
    const cumulativeSheetData = [];
    cumulativeSheetData.push(["SL.NO", "PARTICULARS", "COUNT", "VALUE (₹)"]);

    cumulativeData.forEach((item, idx) => {
      const val = item.value;
      if (Array.isArray(val)) {
        cumulativeSheetData.push([
          idx + 1,
          item.label || "-",
          item.count ?? 0,
          `Top ${val.length} Clients`,
        ]);
        val.forEach((client) => {
          cumulativeSheetData.push([
            "",
            `  ↳  ${client.company_name || "-"}`,
            "-",
            Number(client.value || 0),
          ]);
        });
      } else {
        cumulativeSheetData.push([
          idx + 1,
          item.label || "-",
          item.count ?? 0,
          Number(val || 0),
        ]);
      }
    });

    const cumulativeWs = XLSX.utils.aoa_to_sheet(cumulativeSheetData);
    cumulativeWs["!cols"] = [
      { wch: 10 },
      { wch: 35 },
      { wch: 15 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(workbook, cumulativeWs, "Cumulative Summary");

    // Sheet 2: Monthly Statistics
    const monthlySheetData = [];
    monthlySheetData.push([
      "MONTH/YEAR",
      "QUOTES SENT",
      "ORDERS RECEIVED",
      "LOST QUOTES",
      "CONVERSION %",
      "QUOTE VALUE (₹)",
      "BILLED VALUE (₹)",
    ]);

    let totalSent = 0;
    let totalOrders = 0;
    let totalLost = 0;
    let totalQuoteVal = 0;
    let totalBilledVal = 0;

    monthlyData.forEach((row) => {
      const sent = Number(row.quotes_sent) || 0;
      const orders = Number(row.orders_received) || 0;
      const lost = Number(row.lost_quotations) || 0;
      const quoteVal = Number(row.quote_value) || 0;
      const billedVal = Number(row.billed_value) || 0;

      totalSent += sent;
      totalOrders += orders;
      totalLost += lost;
      totalQuoteVal += quoteVal;
      totalBilledVal += billedVal;

      monthlySheetData.push([
        row.month || "-",
        sent,
        orders,
        lost,
        `${(Number(row.conversion) || 0).toFixed(2)}%`,
        quoteVal,
        billedVal,
      ]);
    });

    // Monthly Totals Row
    if (monthlyData.length > 0) {
      const avgConversion = totalSent > 0 ? (totalOrders / totalSent) * 100 : 0;
      monthlySheetData.push([
        "TOTAL",
        totalSent,
        totalOrders,
        totalLost,
        `${avgConversion.toFixed(2)}%`,
        totalQuoteVal,
        totalBilledVal,
      ]);
    }

    const monthlyWs = XLSX.utils.aoa_to_sheet(monthlySheetData);
    monthlyWs["!cols"] = [
      { wch: 15 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 22 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(workbook, monthlyWs, "Monthly Statistics");

    XLSX.writeFile(workbook, fileName);

    message.success({
      content: "Quotation Excel report generated successfully!",
      key: "excel_export",
      duration: 3,
    });
    return true;
  } catch (clientError) {
    console.error("Client-side export failed:", clientError);
    message.error({
      content: "Failed to export Excel report. Please try again.",
      key: "excel_export",
      duration: 4,
    });
    return false;
  }
};
