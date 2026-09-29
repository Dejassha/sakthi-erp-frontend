import { message } from "antd";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

export const EXCEL_HEADERS = [
  { field: "sno", header: "SL.NO" },
  { field: "action", header: "EVENT / ACTION" },
  { field: "timestamp", header: "DATE & TIME" },
  { field: "performed_by", header: "PERFORMED BY" },
  { field: "record_number", header: "RECORD NO." },
  { field: "machine_name", header: "MACHINE NAME" },
  { field: "shift", header: "SHIFT" },
  { field: "operator_name", header: "OPERATOR NAME" },
  { field: "supervisor", header: "SUPERVISOR" },
  { field: "breakdown_type", header: "BREAKDOWN TYPE" },
  { field: "affected_equipment", header: "AFFECTED EQUIPMENT" },
  { field: "breakdown_date", header: "BREAKDOWN DATE" },
  { field: "breakdown_time", header: "BREAKDOWN TIME" },
  { field: "maintenance_start_time", header: "MAINTENANCE START TIME" },
  { field: "maintenance_complete_time", header: "MAINTENANCE COMPLETE TIME" },
  { field: "restart_time", header: "RESTART TIME" },
  { field: "breakdown_complete_date", header: "COMPLETION DATE" },
  { field: "downtime_display", header: "DOWNTIME (HH:MM)" },
  { field: "status", header: "STATUS" },
  { field: "remarks", header: "REMARKS" },
];

/**
 * Trigger download of the Breakdown Maintenance Report Excel file.
 */
export const downloadBreakdownMaintenanceExcel = async (exportMutation, payload = {}) => {
  const exportPayload = {
    report_title: "Breakdown Maintenance Report",
    headers: payload.headers || EXCEL_HEADERS,
    rows: payload.rows || [],
  };

  message.loading({
    content: "Generating Breakdown Maintenance Excel report...",
    key: "breakdown_maintenance_export",
    duration: 0,
  });

  const todayStr = dayjs().format("YYYY-MM-DD");
  const fileName = `Breakdown_Maintenance_Report_${todayStr}.xlsx`;

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
        content: "Breakdown Maintenance Excel report downloaded successfully!",
        key: "breakdown_maintenance_export",
        duration: 3,
      });
      return true;
    }
  } catch (backendError) {
    console.warn("Backend Excel export fallback to client-side XLSX:", backendError);
  }

  // Fallback client-side generation
  try {
    const headers = payload.headers || EXCEL_HEADERS;
    const rows = payload.rows || [];

    const sheetData = [];
    sheetData.push(headers.map((h) => h.header || h.field));

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
    }

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    const colWidths = headers.map((h, colIndex) => {
      let maxLen = (h.header || h.field || "").length;
      rows.forEach((r, rIndex) => {
        const val = sheetData[rIndex + 1]?.[colIndex];
        if (val) {
          maxLen = Math.max(maxLen, String(val).length);
        }
      });
      return { wch: Math.min(Math.max(maxLen + 4, 12), 40) };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Breakdown Maintenance");
    XLSX.writeFile(workbook, fileName);

    message.success({
      content: "Breakdown Maintenance Excel report generated successfully!",
      key: "breakdown_maintenance_export",
      duration: 3,
    });
    return true;
  } catch (clientError) {
    console.error("Client-side export failed:", clientError);
    message.error({
      content: "Failed to export Excel report. Please try again.",
      key: "breakdown_maintenance_export",
      duration: 4,
    });
    return false;
  }
};
