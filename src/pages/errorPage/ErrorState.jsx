import React from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";

/**
 * ErrorState Component (Enterprise Standard)
 * Displays a fixed default title while dynamically extracting the backend error message
 * into the description section, along with Retry and Go Home action buttons.
 *
 * @param {Object|string} error - RTK Query error object or error string
 * @param {string} description - Detailed description override
 * @param {string} icon - Iconify icon identifier
 * @param {Function} onRetry - Retry callback function (or refetch)
 * @param {string} retryLabel - Retry button label
 * @param {boolean} showHomeButton - Display Go Home button (default: true)
 * @param {string} homeLabel - Go Home button label
 * @param {string} className - Extra CSS classes
 */
const ErrorState = ({
  error,
  description,
  icon = "mdi:alert-circle-outline",
  onRetry,
  retryLabel = "Retry",
  showHomeButton = true,
  homeLabel = "Go Home",
  className = "",
}) => {
  const navigate = useNavigate();

  const defaultTitle = "Something Went Wrong";

  // Extract error message for description section
  const errorMessage =
    description ||
    error?.data?.detail ||
    error?.data?.message ||
    error?.data?.description ||
    error?.data?.error ||
    (typeof error === "string" ? error : null) ||
    (error?.status
      ? `Server returned status code ${error.status}`
      : "An unexpected error occurred while fetching information from the server.");

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 md:py-16 px-4 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 animate-in fade-in duration-500 ${className}`}
    >
      <div className="size-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4 shadow-sm">
        <Icon icon={icon} className="size-7 text-red-500" />
      </div>

      <h3 className="text-sm font-bold text-gray-900 capitalize tracking-tight max-w-md">
        {defaultTitle}
      </h3>

      {errorMessage && (
        <p className="text-xs text-gray-500 mt-2 max-w-md leading-relaxed font-medium">
          {errorMessage}
        </p>
      )}

      <div className="flex items-center gap-3 mt-6 flex-wrap justify-center">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer flex items-center gap-1.5 px-3 py-2 hover:scale-105 transform transition-all duration-300 bg-primary text-white text-xs font-bold capitalize tracking-wider rounded-lg border border-primary hover:bg-primary/80 active:scale-95"
          >
            <Icon icon="mdi:refresh" className="text-lg" />
            {retryLabel}
          </button>
        )}

        {showHomeButton && (
          <button
            type="button"
            onClick={() => navigate("/")}
            className="cursor-pointer flex items-center gap-1.5 px-3 py-2 hover:scale-105 transform transition-all duration-300 text-xs font-bold capitalize tracking-wider rounded-lg border border-primary text-primary hover:bg-blue-50 transition-all active:scale-95"
          >
            <Icon icon="mdi:home-outline" className="text-lg" />
            {homeLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
