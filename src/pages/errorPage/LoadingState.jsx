import React from "react";

/**
 * LoadingState Component (Enterprise Standard)
 * Supports fullPage and inline container modes with flexible size and message props.
 *
 * @param {string} message - Subtitle status message
 * @param {string} title - Optional heading title (defaults to "Please Wait")
 * @param {boolean} fullPage - Renders full-screen vs container mode (default: false)
 * @param {string} size - Spinner size ("sm" | "md" | "lg", default: "md")
 * @param {string} className - Additional CSS container classes
 */
const LoadingState = ({
  message,
  text,
  title = "Please Wait",
  fullPage = false,
  size = "md",
  className = "",
}) => {
  const displayMessage = message || text || "Loading information...";
  // Size variations
  const spinnerSizeClass =
    size === "sm"
      ? "size-12 border-3"
      : size === "lg"
        ? "size-24 sm:size-32 border-4"
        : "size-16 sm:size-20 border-4";

  const logoSizeClass =
    size === "sm"
      ? "size-6"
      : size === "lg"
        ? "size-14 sm:size-18"
        : "size-9 sm:size-12";

  const containerClass = fullPage
    ? `h-screen w-full flex flex-col items-center justify-center bg-white p-6 text-center animate-in fade-in duration-500 ${className}`
    : `py-12 md:py-16 w-full flex flex-col items-center justify-center text-center animate-in fade-in duration-500 ${className}`;

  return (
    <div className={containerClass}>
      <div className="relative flex items-center justify-center">
        {/* Main Outer Spinner */}
        <div
          className={`${spinnerSizeClass} border-blue-50 rounded-full animate-spin border-t-primary shadow-sm`}
        />

        {/* Inner Brand Logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/logoWithoutName.svg"
            alt="Sakthi Laser ERP"
            className={`${logoSizeClass} object-contain opacity-90`}
          />
        </div>
      </div>

      <div className="mt-5">
        {title && (
          <p className="text-xs md:text-sm font-extrabold text-slate-700 uppercase tracking-widest mb-1">
            {title}
          </p>
        )}
        {displayMessage && (
          <p className="text-xs font-medium text-slate-500 tracking-wider animate-pulse">
            {displayMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingState;
