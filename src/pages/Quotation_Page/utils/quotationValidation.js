/* ---------------- ITEM VALIDATION ---------------- */
export const hasValidItems = (items) => {
  return items.some(
    (item) =>
      item.description.trim() &&
      item.material.trim() &&
      item.uom.trim() &&
      item.quantity !== null &&
      item.quantity > 0 &&
      item.rate !== null &&
      item.rate > 0,
  );
};
/* ---------------- MAIN QUOTATION VALIDATION ---------------- */
export const validateQuotation = (quotation, docRunningNo) => {
  if (!quotation.doc_no.trim()) {
    return { valid: false, message: "Document number is required" };
  }
  if (!docRunningNo.trim()) {
    return { valid: false, message: "Running number is required" };
  }
  if (!quotation.company_name.trim()) {
    return { valid: false, message: "Company name is required" };
  }
  if (!quotation.customer_name.trim()) {
    return { valid: false, message: "Customer name is required" };
  }
  if (!quotation.contact || !/^\d{10}$/.test(String(quotation.contact))) {
    return { valid: false, message: "Contact must be exactly 10 digits" };
  }
  if (
    quotation.email &&
    quotation.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quotation.email)
  ) {
    return { valid: false, message: "Invalid email format" };
  }
  if (!quotation.approver_name.trim()) {
    return { valid: false, message: "Approver name is required" };
  }
  if (!quotation.payment_terms.trim()) {
    return { valid: false, message: "Payment Field is required" };
  }
  if (!quotation.material_terms.trim()) {
    return { valid: false, message: "Material Field is required" };
  }
  if (!quotation.transport_terms.trim()) {
    return { valid: false, message: "Transport Field is required" };
  }
  if (!quotation.validity_terms.trim()) {
    return { valid: false, message: "Validity Field is required" };
  }
  if (!quotation.approver_designation.trim()) {
    return { valid: false, message: "Approver designation is required" };
  }
  if (!quotation.approver_contact.trim()) {
    return { valid: false, message: "Approver contact is required" };
  }
  if (!hasValidItems(quotation.items)) {
    return { valid: false, message: "Add at least one valid item" };
  }
  return { valid: true };
};
