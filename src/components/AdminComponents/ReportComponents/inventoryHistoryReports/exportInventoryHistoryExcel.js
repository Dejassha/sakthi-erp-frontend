import { message } from "antd";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

export const EXCEL_HEADERS = [
  { field: "sno", header: "SL.NO" },
  { field: "created_date", header: "DATE" },
  { field: "created_time", header: "TIME" },
  { field: "spare_id", header: "SPARE ID" },
  { field: "item_code", header: "ITEM CODE" },
  { field: "part_name", header: "ITEM NAME" },
  { field: "batch_number", header: "BATCH NO" },
  { field: "action", header: "ACTION" },
  { field: "quantity", header: "QTY" },
  { field: "available_quantity", header: "AVAILABLE QTY" },
  { field: "min_stock_quantity", header: "MIN QTY" },
  { field: "purchase_price", header: "RATE/QTY" },
  { field: "status", header: "STATUS" },
  { field: "machine_name", header: "MACHINE NAME" },
  { field: "user", header: "USER" },
  { field: "remarks", header: "REMARKS" },
];

/**
 * Trigger download of the high-fidelity XlsxWriter generated Inventory History report
 * Attempts backend export first, falling back to client-side XLSX generation.
 * 
 * @param {Function} exportMutation - RTK Query mutation trigger
 * @param {Object} payload - Optional payload containing headers and rows
 * @returns {Promise<boolean>}
 */
export const downloadInventoryHistoryExcel = async (exportMutation, payload = {}) => {
  const exportPayload = {
    headers: payload.headers || EXCEL_HEADERS,
    rows: payload.rows || [],
  };

  message.loading({
    content: "Generating Inventory History Excel report...",
    key: "inventory_history_export",
    duration: 0,
  });

  const todayStr = dayjs().format("YYYY-MM-DD");
  const fileName = `Inventory_History_Report_${todayStr}.xlsx`;

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
        content: "Inventory History Excel report exported successfully!",
        key: "inventory_history_export",
        duration: 3,
      });
      return true;
    }
  } catch (backendError) {
    console.warn("Backend Excel export encountered an issue, falling back to client-side XLSX generator:", backendError);
  }

  // Fallback client-side generation using xlsx library
  try {
    const headers = exportPayload.headers;
    const rows = exportPayload.rows;

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
      let addedQty = 0, addedCount = 0;
      let updatedQty = 0, updatedCount = 0;
      let editedQty = 0, editedCount = 0;
      let usedQty = 0, usedCount = 0;
      let deletedQty = 0, deletedCount = 0;
      let totalQty = 0;

      rows.forEach((r) => {
        const act = String(r.action || "").toLowerCase();
        const qty = Number(r.quantity || 0);
        totalQty += qty;
        if (act.includes("add")) { addedQty += qty; addedCount++; }
        else if (act.includes("use")) { usedQty += qty; usedCount++; }
        else if (act.includes("del")) { deletedQty += qty; deletedCount++; }
        else if (act.includes("update")) { updatedQty += qty; updatedCount++; }
        else if (act.includes("edit")) { editedQty += qty; editedCount++; }
      });

      const addSummaryRow = (label, countText, qtyVal) => {
        const row = headers.map((h, i) => {
          if (i === 0) return label;
          if (h.field === "part_name") return countText;
          if (h.field === "quantity") return qtyVal.toFixed(2);
          return "";
        });
        sheetData.push(row);
      };

      addSummaryRow("TOTAL ADDED QTY", `${addedCount} Records`, addedQty);
      addSummaryRow("TOTAL UPDATED QTY", `${updatedCount} Records`, updatedQty);
      addSummaryRow("TOTAL EDITED QTY", `${editedCount} Records`, editedQty);
      addSummaryRow("TOTAL USED QTY", `${usedCount} Records`, usedQty);
      addSummaryRow("TOTAL DELETED QTY", `${deletedCount} Records`, deletedQty);
      addSummaryRow("OVERALL TOTAL QTY", `${rows.length} Records`, totalQty);
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
      return { wch: Math.min(Math.max(maxLen + 4, 10), 40) };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory History");
    XLSX.writeFile(workbook, fileName);

    message.success({
      content: "Inventory History Excel report generated successfully!",
      key: "inventory_history_export",
      duration: 3,
    });
    return true;
  } catch (clientError) {
    console.error("Client-side export failed:", clientError);
    message.error({
      content: "Failed to export Excel report. Please try again.",
      key: "inventory_history_export",
      duration: 4,
    });
    return false;
  }
};
