import React from "react";

export const FieldCard = ({ label, value, isStatus }) => {
  const displayValue = value !== null && value !== undefined ? value : "-";
  const statusColor =
    typeof value === "string" && isStatus
      ? value.toLowerCase() === "pending"
        ? "w-24 rounded-full px-3 text-yellow-600 bg-yellow-100 border-yellow-300"
        : "w-28 rounded-full px-3 text-green-600 bg-green-100 border-green-300"
      : "text-gray-800";
  return (
    <div
      className={`px-2 py-2 shadow-sm rounded-lg border ${isStatus ? "border-2" : "border-gray-200"} bg-white hover:shadow-md transition-shadow duration-200`}
    >
      <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className={`text-xs font-bold ${statusColor}`}>
        {displayValue}
      </div>
    </div>
  );
};

export default FieldCard;
