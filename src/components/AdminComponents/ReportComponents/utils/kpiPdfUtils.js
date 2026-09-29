import { jsPDF } from "jspdf";
import dayjs from "dayjs";
import { message } from "antd";

const getLogoDataUrl = () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = "/sakthi-logo.png";
  });
};

export const downloadKPIPDF = async (
  configName,
  createdBy,
  createdAt,
  rows
) => {
  // Restriction: Do not download PDF if there are no rows or if no row contains filled data
  if (!rows || rows.length === 0) {
    message.error("Cannot download PDF. At least one row is required.");
    return;
  }

  const hasData = rows.some(
    (r) =>
      (r.kpi_category && String(r.kpi_category).trim()) ||
      (r.kpi_parameter && String(r.kpi_parameter).trim()) ||
      (r.formula && String(r.formula).trim()) ||
      (r.target && String(r.target).trim()) ||
      (r.responsible && String(r.responsible).trim())
  );

  if (!hasData) {
    message.error("Cannot download PDF. At least one row with data is required.");
    return;
  }

  try {
    message.loading({ content: "Generating PDF...", key: "pdf_gen", duration: 0 });

    const doc = new jsPDF("l", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
    const margin = 10;
    const printableWidth = pageWidth - 2 * margin; // 277 mm

    // Load logo if available
    const logoDataUrl = await getLogoDataUrl();

    const drawHeader = (doc, _pageNum) => {
      // Logo
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, "PNG", margin, 4, 12, 12);
        } catch (e) {
          console.warn("Logo addImage failed:", e);
        }
      }

      // Title & Subtitle beside logo
      const textX = logoDataUrl ? margin + 15 : margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(31, 78, 121); // #1F4E79
      doc.text("SAKTHI LASER TECHNOLOGY", textX, 9.5);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(89, 89, 89);
      doc.text("Complete Customized Sheet Metal Job Shop", textX, 14);

      // Date Top Right (e.g. DATE: 20/08/2026)
      const dateFormatted = createdAt
        ? dayjs(createdAt).format("DD/MM/YYYY")
        : dayjs().format("DD/MM/YYYY");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.text(`DATE: ${dateFormatted}`, pageWidth - margin, 9.5, { align: "right" });

      // Blue separator line
      doc.setDrawColor(59, 115, 185); // #3B73B9
      doc.setLineWidth(0.7);
      doc.line(margin, 17.5, pageWidth - margin, 17.5);
    };

    // Draw header on Page 1
    drawHeader(doc, 1);

    // Sub-header Metadata Section (Image 2)
    let startY = 23.5;

    doc.setFontSize(9.5);

    // Left: Configuration Name: <Name>
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Configuration Name: ", margin, startY);
    const nameLabelWidth = doc.getTextWidth("Configuration Name: ");
    doc.setFont("helvetica", "normal");
    doc.text(configName || "KPI Configuration", margin + nameLabelWidth, startY);

    // Right: Created By: <Name>
    if (createdBy) {
      const createdByX = pageWidth - margin - 60;
      doc.setFont("helvetica", "bold");
      doc.text("Created By: ", createdByX, startY);
      const createdByLabelWidth = doc.getTextWidth("Created By: ");
      doc.setFont("helvetica", "normal");
      doc.text(createdBy, createdByX + createdByLabelWidth, startY);
    }

    // Extract any custom columns present in rows
    const STANDARD_KEYS = new Set([
      "id",
      "key",
      "s_no",
      "sno",
      "kpi_category",
      "kpi_parameter",
      "formula",
      "target",
      "achieved",
      "frequency",
      "responsible",
      "remarks",
      "period",
      "name",
      "group_id",
      "created_by",
      "created_at",
      "updated_at",
    ]);

    const customCols = [];
    const foundKeys = new Set();
    rows.forEach((r) => {
      Object.keys(r).forEach((k) => {
        if (!STANDARD_KEYS.has(k) && !foundKeys.has(k)) {
          foundKeys.add(k);
          const header = k
            .replace(/^(col_|custom_)/, "")
            .replace(/_[0-9]+$/, "")
            .replace(/_/g, " ")
            .toUpperCase();
          customCols.push({ key: k, header });
        }
      });
    });

    // Table Header Setup
    startY += 5.5;

    // Base widths: S.NO(12), CATEGORY(28), PARAM(32), FORMULA(40), TARGET(16), ACHIEVED(16), FREQ(18), PERIOD(20), RESP(24), REMARKS(remaining)
    let columns = [];

    if (customCols.length === 0) {
      columns = [
        { header: "S.NO", width: 12, align: "center" },
        { header: "KPI CATEGORY", width: 28, align: "left" },
        { header: "KPI PARAMETER", width: 34, align: "left" },
        { header: "FORMULA / MEASUREMENT", width: 44, align: "left" },
        { header: "TARGET", width: 18, align: "center" },
        { header: "ACHIEVED", width: 18, align: "center" },
        { header: "FREQUENCY", width: 20, align: "center" },
        { header: "PERIOD / DATE", width: 22, align: "center" },
        { header: "RESPONSIBLE", width: 26, align: "left" },
        { header: "REMARKS", width: 55, align: "left" },
      ];
    } else {
      const customColWidth = Math.max(16, Math.min(24, Math.floor(40 / customCols.length)));
      const baseWidths = [
        { header: "S.NO", width: 10, align: "center" },
        { header: "KPI CATEGORY", width: 24, align: "left" },
        { header: "KPI PARAMETER", width: 28, align: "left" },
        { header: "FORMULA / MEASUREMENT", width: 36, align: "left" },
        { header: "TARGET", width: 15, align: "center" },
        { header: "ACHIEVED", width: 15, align: "center" },
        { header: "FREQUENCY", width: 18, align: "center" },
        { header: "PERIOD / DATE", width: 18, align: "center" },
        { header: "RESPONSIBLE", width: 22, align: "left" },
      ];
      const customWidths = customCols.map((c) => ({
        header: c.header,
        width: customColWidth,
        align: "left",
        key: c.key,
      }));

      const usedWidth =
        baseWidths.reduce((sum, c) => sum + c.width, 0) +
        customWidths.reduce((sum, c) => sum + c.width, 0);
      const remarksWidth = Math.max(25, printableWidth - usedWidth);

      columns = [
        ...baseWidths,
        ...customWidths,
        { header: "REMARKS", width: remarksWidth, align: "left" },
      ];
    }

    const drawTableHeader = (y) => {
      doc.setFillColor(79, 129, 189); // #4F81BD
      doc.rect(margin, y, printableWidth, 7.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);

      let currentX = margin;
      columns.forEach((col) => {
        const textX = col.align === "center" ? currentX + col.width / 2 : currentX + 2;
        doc.text(col.header, textX, y + 5, { align: col.align });
        currentX += col.width;
      });

      // White header column separators
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      currentX = margin;
      columns.forEach((col) => {
        currentX += col.width;
        doc.line(currentX, y, currentX, y + 7.5);
      });
    };

    drawTableHeader(startY);
    startY += 7.5;

    // Process Rows: Order rows starting from 1 (S.No 1, 2, 3...)
    const preparedRows = [...rows];
    
    // Sort ascending by s_no
    preparedRows.sort((a, b) => {
      const sA = a.s_no ?? a.sno ?? 0;
      const sB = b.s_no ?? b.sno ?? 0;
      return sA - sB;
    });

    // Default period calculation helper
    const defaultPeriodStr = createdAt
      ? dayjs(createdAt).format("MMMM YYYY")
      : dayjs().format("MMMM YYYY");

    let rowY = startY;

    preparedRows.forEach((row, index) => {
      // Determine display S.No starting from 1
      const sNoDisplay = String(row.s_no ?? row.sno ?? (index + 1));
      
      // Determine period
      let periodVal = row.period || defaultPeriodStr;
      if (periodVal && periodVal.match(/^\d{4}-\d{2}$/)) {
        periodVal = dayjs(periodVal).format("MMMM YYYY");
      }

      const baseCellData = [
        { text: sNoDisplay, align: "center", bold: false, color: [50, 50, 50] },
        { text: row.kpi_category || "—", align: "left", bold: true, color: [30, 30, 30] },
        { text: row.kpi_parameter || "—", align: "left", bold: true, color: [30, 64, 175] }, // #1E40AF
        { text: row.formula || "—", align: "left", italic: true, color: [80, 80, 80] },
        { text: row.target || "—", align: "center", bold: true, color: [30, 30, 30] },
        { text: row.achieved || "0.00%", align: "center", bold: true, color: [0, 85, 204] }, // #0055CC
        { text: row.frequency || "Monthly", align: "center", color: [50, 50, 50] },
        { text: periodVal, align: "center", color: [50, 50, 50] },
        { text: row.responsible || "—", align: "left", color: [50, 50, 50] },
      ];

      const customCellData = customCols.map((c) => ({
        text: row[c.key] || "—",
        align: "left",
        color: [50, 50, 50],
      }));

      const remarksCell = { text: row.remarks || "—", align: "left", color: [50, 50, 50] };

      const cellData = [...baseCellData, ...customCellData, remarksCell];

      // Calculate lines for each cell to handle wrapping
      doc.setFontSize(7);
      const cellLines = cellData.map((cell, cIdx) => {
        const colWidth = columns[cIdx].width;
        if (cell.bold) doc.setFont("helvetica", "bold");
        else if (cell.italic) doc.setFont("helvetica", "italic");
        else doc.setFont("helvetica", "normal");
        return doc.splitTextToSize(cell.text, colWidth - 3);
      });

      const maxLines = Math.max(...cellLines.map((lines) => lines.length), 1);
      const rowHeight = Math.max(7, maxLines * 3.6 + 3);

      // Page break check
      if (rowY + rowHeight > pageHeight - margin) {
        doc.addPage("a4", "l");
        drawHeader(doc, doc.getNumberOfPages());
        rowY = 23.5;
        drawTableHeader(rowY);
        rowY += 7.5;
      }

      // Alternating row fill (#BBDDE4 and #E7F0F9)
      if (index % 2 === 0) {
        doc.setFillColor(187, 221, 228); // #BBDDE4
      } else {
        doc.setFillColor(231, 240, 249); // #E7F0F9
      }
      doc.rect(margin, rowY, printableWidth, rowHeight, "F");

      // Cell borders (white lines)
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.rect(margin, rowY, printableWidth, rowHeight, "S");

      // Draw cell text
      let currentX = margin;
      cellData.forEach((cell, cIdx) => {
        const colWidth = columns[cIdx].width;
        const lines = cellLines[cIdx];
        const textX = cell.align === "center" ? currentX + colWidth / 2 : currentX + 2;

        if (cell.bold) doc.setFont("helvetica", "bold");
        else if (cell.italic) doc.setFont("helvetica", "italic");
        else doc.setFont("helvetica", "normal");

        if (cell.color) doc.setTextColor(cell.color[0], cell.color[1], cell.color[2]);
        else doc.setTextColor(50, 50, 50);

        lines.forEach((lineText, lIdx) => {
          const lineY = rowY + 4.2 + lIdx * 3.5;
          doc.text(lineText, textX, lineY, { align: cell.align });
        });

        currentX += colWidth;
      });

      rowY += rowHeight;
    });

    const filename = `${(configName || "KPI_Configuration").replace(/[^a-zA-Z0-9_\-]/g, "_")}_${dayjs().format("YYYY-MM-DD")}.pdf`;
    doc.save(filename);

    message.success({ content: "PDF downloaded successfully!", key: "pdf_gen", duration: 2 });
  } catch (err) {
    console.error("PDF Export error:", err);
    message.error({ content: "Failed to download PDF.", key: "pdf_gen", duration: 2 });
  }
};
