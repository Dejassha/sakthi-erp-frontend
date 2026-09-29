/**
 * Parses numeric value from a string (handles percentages, decimals, units)
 */
export const parseKPINumeric = (str) => {
  if (str === undefined || str === null) return null;
  const cleaned = String(str).replace(/[^0-9.-]/g, "").trim();
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

/**
 * Compares an achieved value against a target string (e.g. "90%", ">=85%", "<=2%", "85-90%")
 * Returns structured status result with colors and user-friendly badges.
 */
export const evaluateKPITargetStatus = (
  targetRaw,
  achievedRaw
) => {
  if (
    targetRaw === undefined ||
    targetRaw === null ||
    String(targetRaw).trim() === "" ||
    achievedRaw === undefined ||
    achievedRaw === null ||
    String(achievedRaw).trim() === ""
  ) {
    return {
      status: "neutral",
      label: "Not Set",
      color: "text-slate-500",
      bg: "bg-slate-50",
      border: "border-slate-200",
      badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
      dotColor: "bg-slate-400",
    };
  }

  const achievedVal = parseKPINumeric(achievedRaw);
  if (achievedVal === null) {
    return {
      status: "neutral",
      label: "Recorded",
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      dotColor: "bg-blue-400",
    };
  }

  const targetStr = String(targetRaw).trim();

  // Range Check (e.g. "85-90%" or "85 - 90")
  const rangeMatch = targetStr.match(/([0-9.]+)\s*-\s*([0-9.]+)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (!isNaN(min) && !isNaN(max)) {
      if (achievedVal >= min && achievedVal <= max) {
        return {
          status: "met",
          label: "Target Met",
          color: "text-emerald-700",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dotColor: "bg-emerald-500",
        };
      } else if (achievedVal >= min * 0.9 && achievedVal <= max * 1.1) {
        return {
          status: "warning",
          label: "Near Target",
          color: "text-amber-700",
          bg: "bg-amber-50",
          border: "border-amber-200",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
          dotColor: "bg-amber-500",
        };
      } else {
        return {
          status: "unmet",
          label: achievedVal < min ? "Below Target" : "Above Range",
          color: "text-rose-700",
          bg: "bg-rose-50",
          border: "border-rose-200",
          badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
          dotColor: "bg-rose-500",
        };
      }
    }
  }

  // Less than or equal to check (e.g. "<=2%", "< 5")
  if (targetStr.startsWith("<=") || targetStr.startsWith("<")) {
    const targetVal = parseKPINumeric(targetStr);
    if (targetVal !== null) {
      if (achievedVal <= targetVal) {
        return {
          status: "met",
          label: "Target Met",
          color: "text-emerald-700",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dotColor: "bg-emerald-500",
        };
      } else if (achievedVal <= targetVal * 1.15) {
        return {
          status: "warning",
          label: "Near Limit",
          color: "text-amber-700",
          bg: "bg-amber-50",
          border: "border-amber-200",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
          dotColor: "bg-amber-500",
        };
      } else {
        return {
          status: "unmet",
          label: "Exceeded Target",
          color: "text-rose-700",
          bg: "bg-rose-50",
          border: "border-rose-200",
          badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
          dotColor: "bg-rose-500",
        };
      }
    }
  }

  // Greater than or equal to check (e.g. ">=90%", "> 80", "90%")
  const targetVal = parseKPINumeric(targetStr);
  if (targetVal !== null) {
    if (achievedVal >= targetVal) {
      return {
        status: "met",
        label: "Target Met",
        color: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dotColor: "bg-emerald-500",
      };
    } else if (achievedVal >= targetVal * 0.9) {
      return {
        status: "warning",
        label: "Near Target",
        color: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
        dotColor: "bg-amber-500",
      };
    } else {
      return {
        status: "unmet",
        label: "Below Target",
        color: "text-rose-700",
        bg: "bg-rose-50",
        border: "border-rose-200",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        dotColor: "bg-rose-500",
      };
    }
  }

  return {
    status: "neutral",
    label: "Recorded",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotColor: "bg-blue-400",
  };
};
