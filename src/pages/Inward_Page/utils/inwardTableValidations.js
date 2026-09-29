/**
 * Recalculates Unit Weight, Total Weight, Total Dimensions, and Stock Due days
 * based on thickness, width, length, density, and quantity.
 */
export const recalcWeights = (mat) => {
  const { thick, width, length, density, quantity } = mat;

  // Calculate volume
  const volume = Number(thick) * Number(width) * Number(length) || 0;

  // Calculate unit weight (vol * density)
  const unitWeight =
    volume > 0 && Number(density) > 0
      ? parseFloat((volume * Number(density)).toFixed(3))
      : null;

  // Calculate total weight (quantity * unitWeight)
  const totalWeight =
    Number(quantity) > 0 && unitWeight && unitWeight > 0
      ? parseFloat((Number(quantity) * unitWeight).toFixed(3))
      : null;

  // Calculate stock due days based on total weight tier
  let stockDue = "";
  if (totalWeight && totalWeight > 0) {
    if (totalWeight < 50) stockDue = "1";
    else if (totalWeight < 200) stockDue = "3";
    else stockDue = "5";
  }

  // Calculate total dimensions
  const totalWidth =
    Number(width) > 0 && Number(quantity) > 0
      ? parseFloat((Number(width) * Number(quantity)).toFixed(3))
      : null;

  const totalLength =
    Number(length) > 0 && Number(quantity) > 0
      ? parseFloat((Number(length) * Number(quantity)).toFixed(3))
      : null;

  return {
    ...mat,
    unit_weight: unitWeight,
    total_weight: totalWeight,
    stock_due: stockDue,
    total_width: totalWidth,
    total_length: totalLength,
  };
};

/**
 * Validates and updates a material row based on changed form fields.
 */
export const validateMaterialRow = (mat, changedFields, materialDensities = {}) => {
  const updatedMat = { ...mat };

  const parseNum = (val) => {
    if (val === null || val === undefined || val === "") return null;
    const str = String(val).replace(/[^0-9.]/g, "");
    if (str.endsWith(".")) return str; // Preserve trailing dot during typing
    return str === "" ? null : Number(str);
  };

  if (changedFields.quantity !== undefined)
    updatedMat.quantity = parseNum(changedFields.quantity);
  if (changedFields.thick !== undefined)
    updatedMat.thick = parseNum(changedFields.thick);
  if (changedFields.width !== undefined)
    updatedMat.width = parseNum(changedFields.width);
  if (changedFields.length !== undefined)
    updatedMat.length = parseNum(changedFields.length);

  // Auto-assign density when material type (mat_type) changes
  if (changedFields.mat_type !== undefined) {
    updatedMat.density = materialDensities[changedFields.mat_type || ""] || null;
  }

  // Recalculate computed fields if dimensions, density, or quantity change
  if (
    changedFields.mat_type !== undefined ||
    changedFields.quantity !== undefined ||
    changedFields.thick !== undefined ||
    changedFields.width !== undefined ||
    changedFields.length !== undefined
  ) {
    return recalcWeights(updatedMat);
  }

  return updatedMat;
};

/**
 * Formats ISO / Date string to DD/MM/YYYY
 */
export const formatDateDDMMYYYY = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default formatDateDDMMYYYY;
