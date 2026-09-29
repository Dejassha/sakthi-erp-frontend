import dayjs from "dayjs";

export const toDateString = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  if (dayjs.isDayjs(value)) return value.format("YYYY-MM-DD");
  return null;
};

export const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date <= today;
};

export const getRemainingDaysStatus = (delta, remindBeforeDays = 3) => {
  if (delta === null || delta === undefined) return "none";
  if (delta < 0) return "overdue";
  if (delta === 0) return "due";
  const remind = Number(remindBeforeDays) > 0 ? Number(remindBeforeDays) : 3;
  if (delta <= remind) return "remind";
  return "safe";
};

export const getRemainingDaysColor = (status) => {
  switch (status) {
    case "safe":
      return "#16a34a"; // green
    case "remind":
    case "upcoming":
      return "#eab308"; // yellow / amber
    case "due":
    case "overdue":
      return "#ef4444"; // red
    default:
      return "#6b7280";
  }
};

export const getRemainingDaysLabel = (delta) => {
  if (delta === null || delta === undefined) return "-";
  if (delta < 0) return `Overdue by ${Math.abs(delta)} Days`;
  if (delta === 0) return "Due Today";
  return `${delta} Days`;
};

export const calculateNextMaintenanceDate = (lastDate, intervalDays) => {
  if (!lastDate) return null;
  const parsed = dayjs(lastDate);
  if (!parsed.isValid()) return null;
  return parsed.add(Number(intervalDays || 30), "day");
};
