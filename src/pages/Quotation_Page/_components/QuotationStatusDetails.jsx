import React from "react";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";

const QuotationStatusDetails = ({ isOpen, onClose, quotation }) => {
  if (!quotation) return null;
  const isWon = quotation.status?.toLowerCase() === "won";
  const isLost = quotation.status?.toLowerCase() === "lost";
  return (
    <GlobalModal
      title="Quotation Status Details"
      open={isOpen}
      onCancel={onClose}
      onConfirm={onClose}
      confirmText="Close"
      confirmIcon="lucide:x"
      confirmColor="blue"
      cancelColor="cancel"
      width={500}
    >
      <div className="space-y-6 pt-2 pb-2">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">
            Current Status
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              isWon
                ? "bg-green-100 text-green-700"
                : isLost
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            {quotation.status || "Pending"}
          </span>
        </div>

        {/* Total Amount */}
        <div className="flex items-center justify-between border-t pt-4">
          <span className="text-sm font-medium text-slate-500">
            Estimated Quote Value
          </span>
          <span className="text-base font-bold text-slate-900">
            ₹{" "}
            {Number(quotation.total_amount || 0).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {/* Billed Value (Only for Won) */}
        {isWon ? (
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm font-medium text-slate-500">
              Finalized Quote Value
            </span>
            <span className="text-base font-bold text-green-600">
              ₹{" "}
              {Number(quotation.billed_value || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        ) : null}

        {/* Remarks / Reason */}
        <div className="border-t pt-4 space-y-2">
          <span className="text-sm font-medium text-slate-500 block">
            {isLost ? "Reason for Loss" : "Remarks"}
          </span>
          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 min-h-[60px] whitespace-pre-wrap">
            {quotation.remarks || "No remarks provided."}
          </div>
        </div>
      </div>
    </GlobalModal>
  );
};
export default QuotationStatusDetails;
