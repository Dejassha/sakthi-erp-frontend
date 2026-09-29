import React from "react";
import {
  getOldNewBatches,
  getBatchLabel,
  getBatchColor,
} from "../utils/inventoryBatchUtils";

export const StockBatchSummary = ({
  batches = [],
  unit = "pcs",
  totalAvailable,
  totalStock,
  totalUsed,
  variant = "banner",
  className = "",
}) => {
  const { hasMultiple, allBatches } = getOldNewBatches(batches);
  const normalizedUnit = (unit || "pcs").toLowerCase();

  if (!hasMultiple) {
    const batch = allBatches[0];
    if (variant === "compact") {
      return (
        <span className={`text-[10px] text-gray-700 ${className}`}>
          {Number(totalAvailable ?? batch?.available_quantity ?? 0)}{" "}
          {normalizedUnit}
        </span>
      );
    }
    return null;
  }

  const computedTotalAvail = allBatches.reduce(
    (sum, b) => sum + Number(b.available_quantity || 0),
    0,
  );

  if (variant === "compact") {
    return (
      <div className={`leading-tight ${className}`}>
        {allBatches.map((batch, idx) => {
          const label = getBatchLabel(idx, allBatches.length, batch);
          const color = getBatchColor(idx, allBatches.length);
          const avail = Number(batch.available_quantity || 0);
          const stock = Number(batch.stock_quantity || 0);
          return (
            <div key={batch.id || idx} className={`text-[9px] font-semibold ${color.text}`}>
              {label.replace(" Stock", "")}: {avail}/{stock} {normalizedUnit}
            </div>
          );
        })}
        <div className="text-[8px] text-gray-500 mt-0.5">
          Total: {Number(totalAvailable ?? computedTotalAvail)}{" "}
          {normalizedUnit}
        </div>
      </div>
    );
  }

  if (variant === "modal") {
    return (
      <div
        className={`mb-3 px-3 py-1.5 bg-emerald-50/70 rounded-sm border border-emerald-100 flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px] ${className}`}
      >
        {allBatches.map((batch, idx) => {
          const label = getBatchLabel(idx, allBatches.length, batch);
          const color = getBatchColor(idx, allBatches.length);
          const avail = Number(batch.available_quantity || 0);
          const rate = Number(batch.purchase_price || 0);
          return (
            <div key={batch.id || idx}>
              <span className="text-gray-500">{label}: </span>
              <strong className={`${color.text} font-semibold`}>
                {avail} {normalizedUnit} @ ₹{rate.toFixed(2)}
              </strong>
            </div>
          );
        })}
        <div>
          <span className="text-gray-500">Total Available: </span>
          <strong className="text-emerald-700 font-semibold">
            {Number(totalAvailable ?? computedTotalAvail)} {normalizedUnit}
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px] ${className}`}
    >
      {allBatches.map((batch, idx) => {
        const label = getBatchLabel(idx, allBatches.length, batch);
        const color = getBatchColor(idx, allBatches.length);
        const avail = Number(batch.available_quantity || 0);
        const stock = Number(batch.stock_quantity || 0);
        const rate = Number(batch.purchase_price || 0);
        return (
          <div key={batch.id || idx}>
            <span className="text-gray-500">{label}: </span>
            <strong className={`${color.text} font-semibold`}>
              {avail}/{stock} {normalizedUnit} @ ₹{rate.toFixed(2)}
            </strong>
          </div>
        );
      })}
      {totalAvailable !== undefined && (
        <div>
          <span className="text-gray-500">Combined Available: </span>
          <strong className="text-emerald-700 font-semibold">
            {Number(totalAvailable)} {normalizedUnit}
          </strong>
        </div>
      )}
    </div>
  );
};

export default StockBatchSummary;
