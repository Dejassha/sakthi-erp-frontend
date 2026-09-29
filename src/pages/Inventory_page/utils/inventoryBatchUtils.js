export const getPartName = (p) =>
  (p?.part_name || p?.item_name || "").trim().toLowerCase();

export const sortPartsByFifo = (partsList) =>
  [...partsList].sort((a, b) => {
    const dateA = a.purchase_date;
    const dateB = b.purchase_date;
    if (dateA && dateB) {
      const comp = dateA.localeCompare(dateB);
      if (comp !== 0) return comp;
    } else if (dateA) {
      return 1;
    } else if (dateB) {
      return -1;
    }
    return a.id - b.id;
  });

export const getMatchedPartBatches = (
  parts,
  selectedPart,
  { includeEditPartId } = {},
) => {
  if (!selectedPart) return [];
  const targetName = getPartName(selectedPart);
  if (!targetName) return [selectedPart];
  return sortPartsByFifo(
    parts.filter(
      (p) =>
        getPartName(p) === targetName &&
        (Number(p.available_quantity) > 0 ||
          (includeEditPartId && p.id === includeEditPartId)),
    ),
  );
};

export const resolveBatchFromStockMode = (matchedParts, useNewQuantity) => {
  if (!matchedParts.length) return null;
  return useNewQuantity
    ? matchedParts[matchedParts.length - 1]
    : matchedParts[0];
};

export const getOldNewBatches = (groupParts) => {
  const sorted = sortPartsByFifo(groupParts || []);
  if (sorted.length === 0) {
    return {
      oldBatch: null,
      newBatch: null,
      hasMultiple: false,
      allBatches: [],
    };
  }

  const oldBatch = sorted[0];
  const newBatch = sorted[sorted.length - 1];

  return {
    oldBatch,
    newBatch,
    hasMultiple: sorted.length > 1,
    allBatches: sorted,
  };
};

const BATCH_COLORS = [
  { text: "text-blue-800", bg: "bg-blue-50", border: "border-blue-200", tag: "blue" },
  { text: "text-purple-800", bg: "bg-purple-50", border: "border-purple-200", tag: "purple" },
  { text: "text-emerald-800", bg: "bg-emerald-50", border: "border-emerald-200", tag: "green" },
  { text: "text-amber-800", bg: "bg-amber-50", border: "border-amber-200", tag: "orange" },
  { text: "text-cyan-800", bg: "bg-cyan-50", border: "border-cyan-200", tag: "cyan" },
];

export const getBatchLabel = (idx, totalCount, batch = null) => {
  if (batch?.batch_number) return `Batch ${batch.batch_number}`;
  if (totalCount <= 1) return "Stock";
  if (idx === 0) return "Old Stock (Batch 1)";
  return `New Stock (Batch ${idx + 1})`;
};

export const getBatchColor = (idx, totalCount) => {
  return BATCH_COLORS[idx % BATCH_COLORS.length];
};

export const formatBatchStockLine = (batch, prefix, unit = "pcs") => {
  if (!batch) return `${prefix}: —`;
  const batchName = batch.batch_number ? `[${batch.batch_number}]` : "";
  const stockQty = Number(batch.stock_quantity || 0);
  const availQty = Number(batch.available_quantity || 0);
  const usedQty = Number(batch.used_quantity || 0);
  const rate = Number(batch.purchase_price || 0);
  const normalizedUnit = (unit || batch.unit || "pcs").toLowerCase();
  const date = batch.purchase_date
    ? batch.purchase_date.split("-").reverse().join("-")
    : "N/A";

  return `${prefix} ${batchName}: ${availQty}/${stockQty} ${normalizedUnit} available (used ${usedQty}) @ ₹${rate.toFixed(2)} (${date})`;
};

export const formatBatchLabel = (batch, prefix) => {
  if (!batch) return `${prefix}: —`;
  const batchName = batch.batch_number ? `[${batch.batch_number}] ` : "";
  const qty = Number(batch.available_quantity || 0);
  const unit = (batch.unit || "pcs").toLowerCase();
  const rate = Number(batch.purchase_price || 0);
  const date = batch.purchase_date
    ? batch.purchase_date.split("-").reverse().join("-")
    : "N/A";
  return `${prefix}: ${batchName}${qty} ${unit} @ ₹${rate.toFixed(2)} (${date})`;
};
