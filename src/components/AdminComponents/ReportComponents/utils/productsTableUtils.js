/* ---------------------------------------------------------
   SAFE FORMAT MINUTES → HH:MM
--------------------------------------------------------- */
export const formatMinutesToTime = (minutes) => {
  if (!minutes && minutes !== 0) return "00:00";

  const value = Number(minutes);
  if (isNaN(value) || value < 0) return "00:00";

  const hrs = Math.floor(value / 60);
  const mins = Math.floor(value % 60);

  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

/* ---------------------------------------------------------
   PARSE HH:MM → MINUTES (with full validation)
--------------------------------------------------------- */
export const parseTimeToMinutes = (value) => {
  if (!value) return 0;

  if (typeof value === "string" && value.includes(":")) {
    const [h, m] = value.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  }

  const num = Number(value);
  return isNaN(num) ? 0 : num;
};


/* ---------------------------------------------------------
   FILTER ROWS
--------------------------------------------------------- */
export const filterRows = (
  rows,
  columnFilters,
  fromDate,
  toDate,
) => {
  if (!rows || !rows.length) return [];

  return rows.filter((row) => {
    // Text filters
    const matches = Object.entries(columnFilters || {}).every(([key, value]) => {
      if (!value) return true;

      return String(row[key] ?? "")
        .toLowerCase()
        .includes(value.toLowerCase());
    });

    if (!matches) return false;

    // --- SAFE DATE HANDLING ---
    const rowDate =
      typeof row.date === "string" || typeof row.date === "number" ? new Date(row.date) : null;

    if (fromDate && rowDate && rowDate < new Date(fromDate)) return false;

    if (toDate && rowDate && rowDate > new Date(toDate)) return false;

    return true;
  });
};
