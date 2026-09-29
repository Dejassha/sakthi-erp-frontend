import { Eye } from "lucide-react";
export const StatusBadge = ({ value, getStatusColor }) => {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(value)}`}
    >
      {value}
    </span>
  );
};
export const ColorBadge = ({ value }) => {
  const label =
    value === "quotation"
      ? "Quotation"
      : value === "jobcard"
        ? "Job Card"
        : value || "-";
  return (
    <span
      className={`px-4 py-1 border rounded-full text-sm shadow-sm ${value === "quotation" ? "bg-white" : "bg-yellow-100"}`}
    >
      {label}
    </span>
  );
};
export const ActionButton = (props) => {
  return (
    <button
      onClick={() => props.context.onView(props.data)}
      className="bg-blue-800 text-white px-3 py-1 rounded-lg hover:bg-blue-700 flex items-center gap-1 mx-auto"
    >
      <Eye className="h-4 w-4" />
      View
    </button>
  );
};
export const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
};
