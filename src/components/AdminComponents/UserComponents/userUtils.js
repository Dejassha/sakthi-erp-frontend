export const getRoleStyle = (role = "") => {
  const map = {
    inward: { bg: "#dbeafe", text: "#1e40af" },
    programer: { bg: "#fef3c7", text: "#92400e" },
    qa: { bg: "#f3e8ff", text: "#6b21a8" },
    accounts: { bg: "#ffedd5", text: "#9a3412" },
    quotation: { bg: "#dcfce7", text: "#166534" },
    admin: { bg: "#fee2e2", text: "#991b1b" },
    inventory: { bg: "#ccfbf1", text: "#0f766e" },
    maintenance: { bg: "#d1fae5", text: "#065f46" },
    reports: { bg: "#e0e7ff", text: "#3730a3" },
  };
  return map[role?.toLowerCase()] || { bg: "#f3f4f6", text: "#374151" };
};

export const validatePassword = (_, value, isRequired = false) => {
  if (!value) {
    if (isRequired) {
      return Promise.reject(new Error("Password required"));
    }
    return Promise.resolve();
  }
  if (value.length < 8) {
    return Promise.reject(new Error("Min 8 characters required."));
  }
  if (!/[A-Z]/.test(value)) {
    return Promise.reject(new Error("Must contain at least 1 uppercase letter."));
  }
  if (!/[a-z]/.test(value)) {
    return Promise.reject(new Error("Must contain at least 1 lowercase letter."));
  }
  if (!/[0-9]/.test(value)) {
    return Promise.reject(new Error("Must contain at least 1 number."));
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    return Promise.reject(new Error("Must contain at least 1 special character."));
  }
  return Promise.resolve();
};
