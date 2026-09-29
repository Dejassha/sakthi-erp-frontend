import { message } from "antd";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

export const EXCEL_HEADERS = [
  { field: "sno", header: "SL.NO" },
  { field: "maintenance_type", header: "TYPE" },
  { field: "record_number", header: "RECORD NO." },
  { field: "maintenance_date", header: "DATE" },
  { field: "machine_name", header: "MACHINE NAME" },
  { field: "title", header: "TITLE / ISSUE" },
  { field: "status", header: "STATUS" },
  { field: "interval_display", header: "INTERVAL" },
  { field: "next_maintenance_date", header: "NEXT DUE DATE" },
  { field: "remaining_days_display", header: "REMAINING DAYS" },
  { field: "downtime_display", header: "DOWNTIME" },
  { field: "operator_name", header: "OPERATOR" },
  { field: "supervised_by", header: "SUPERVISED BY" },
  { field: "parts_used", header: "PARTS USED" },
  { field: "created_by", header: "CREATED BY" },
  { field: "remarks", header: "REMARKS" },
];

/**
 * Trigger download of the high-fidelity Maintenance Report History Excel file.
 * Attempts to use the backend XlsxWriter endpoint first, falling back to client-side xlsx export.
 * 
 * @param {Function} exportMutation - RTK Query mutation trigger (exportMaintenanceHistoryExcel)
 * @param {Object} payload - Object containing headers and rows
 * @returns {Promise<boolean>}
 */
export const downloadMaintenanceHistoryExcel = async (exportMutation, payload = {}) => {
  const exportPayload = {
    headers: payload.headers || EXCEL_HEADERS,
    rows: payload.rows || [],
  };

  message.loading({
    content: "Generating Maintenance History Excel report...",
    key: "maintenance_history_export",
    duration: 0,
  });

  const todayStr = dayjs().format("YYYY-MM-DD");
  const fileName = `Maintenance_Report_History_${todayStr}.xlsx`;

  try {
    if (typeof exportMutation === "function") {
      const blob = await exportMutation(exportPayload).unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success({
        content: "Maintenance History Excel report downloaded successfully!",
        key: "maintenance_history_export",
        duration: 3,
      });
      return true;
    }
  } catch (backendError) {
    console.warn("Backend Excel export encountered an issue, falling back to client-side XLSX generator:", backendError);
  }

  // Fallback client-side generation using xlsx library
  try {
    const headers = payload.headers || [];
    const rows = payload.rows || [];

    const sheetData = [];
    // Header row
    sheetData.push(headers.map((h) => h.header || h.field));

    // Data rows
    rows.forEach((row, idx) => {
      const rowData = headers.map((h) => {
        if (h.field === "sno") return idx + 1;
        const val = row[h.field];
        if (val === null || val === undefined || String(val).trim() === "") return "-";
        return String(val);
      });
      sheetData.push(rowData);
    });

    if (rows && rows.length > 1) {
      let periodicCount = 0;
      let breakdownCount = 0;
      let completedCount = 0;
      let pendingCount = 0;
      let totalDowntimeMinutes = 0;

      rows.forEach((r) => {
        const isPeriodic =
          r.type_key === "periodic" ||
          String(r.maintenance_type || "").toLowerCase().includes("periodic");
        if (isPeriodic) periodicCount++;
        else breakdownCount++;

        const st = String(r.status || "").toUpperCase();
        if (st === "COMPLETED" || st === "CLOSED") completedCount++;
        else pendingCount++;

        if (r.total_downtime_hours && !isNaN(Number(r.total_downtime_hours))) {
          totalDowntimeMinutes += Number(r.total_downtime_hours) * 60;
        } else if (r.downtime_hours && !isNaN(Number(r.downtime_hours))) {
          totalDowntimeMinutes += Number(r.downtime_hours) * 60;
        } else if (r.downtime_display && String(r.downtime_display).includes(":")) {
          const parts = String(r.downtime_display).split(":");
          totalDowntimeMinutes += (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10);
        }
      });

      const dtH = Math.floor(totalDowntimeMinutes / 60);
      const dtM = Math.round(totalDowntimeMinutes % 60);
      const totalDtStr = totalDowntimeMinutes > 0 ? `${String(dtH).padStart(2, "0")}:${String(dtM).padStart(2, "0")}` : "-";

      const addSummaryRow = (label, descText, dtVal) => {
        const row = headers.map((h, i) => {
          if (i === 0) return label;
          if (h.field === "machine_name" || h.field === "title") return descText;
          if (h.field === "downtime_display") return dtVal;
          return "";
        });
        sheetData.push(row);
      };

      addSummaryRow("TOTAL PERIODIC", `${periodicCount} Schedules`, "-");
      addSummaryRow("TOTAL BREAKDOWN", `${breakdownCount} Incidents`, totalDtStr);
      addSummaryRow("TOTAL COMPLETED / CLOSED", `${completedCount} Resolved`, "-");
      addSummaryRow("TOTAL PENDING / OPEN", `${pendingCount} Attention Needed`, "-");
      addSummaryRow("TOTAL DOWNTIME", `${breakdownCount} Breakdown Incidents`, totalDtStr);
      addSummaryRow("OVERALL TOTAL", `${rows.length} Records`, totalDtStr);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Auto-fit column widths
    const colWidths = headers.map((h, colIndex) => {
      let maxLen = (h.header || h.field || "").length;
      rows.forEach((r, rIndex) => {
        const val = sheetData[rIndex + 1]?.[colIndex];
        if (val) {
          maxLen = Math.max(maxLen, String(val).length);
        }
      });
      return { wch: Math.min(Math.max(maxLen + 4, 10), 40) };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Maintenance History");
    XLSX.writeFile(workbook, fileName);

    message.success({
      content: "Maintenance History Excel report generated successfully!",
      key: "maintenance_history_export",
      duration: 3,
    });
    return true;
  } catch (clientError) {
    console.error("Client-side export failed:", clientError);
    message.error({
      content: "Failed to export Excel report. Please try again.",
      key: "maintenance_history_export",
      duration: 4,
    });
    return false;
  }
};
