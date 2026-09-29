import React from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";

/**
 * EmptyState Component (Enterprise Standard)
 * Modern, responsive empty state display with icon micro-animations and flexible action buttons.
 *
 * @param {string} title - Heading title
 * @param {string} description - Subtitle or explanation
 * @param {string|React.ReactNode} icon - Iconify identifier string or custom React element
 * @param {React.ReactNode} action - Custom action JSX element
 * @param {Function} onAction - Click handler for primary action button
 * @param {string} actionLabel - Primary action button label
 * @param {string} actionIcon - Iconify icon for primary action button
 * @param {Function} onReset - Click handler for reset/clear filters button
 * @param {string} resetLabel - Label for reset button
 * @param {boolean} showHomeButton - Display Go Home button
 * @param {string} className - CSS container overrides
 */
export default function EmptyState({
  title = "No Records Found",
  description = "There are no items to display at the moment.",
  icon,
  action,
  onAction,
  actionLabel = "Add Item",
  actionIcon,
  onReset,
  resetLabel = "Reset Filters",
  showHomeButton = false,
  className = "",
}) {
  const navigate = useNavigate();

  return (
    <div
      className={`py-12 md:py-16 px-4 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 animate-in fade-in zoom-in-95 duration-500 my-2 ${className}`}
    >
      <div className="size-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-4 group hover:scale-110 hover:shadow-md transition-all duration-300">
        {typeof icon === "string" ? (
          <Icon
            icon={icon}
            className="size-7 text-gray-400 group-hover:text-primary transition-colors"
          />
        ) : (
          icon || (
            <Icon
              icon="mdi:folder-open-outline"
              className="size-7 text-gray-400 group-hover:text-primary transition-colors"
            />
          )
        )}
      </div>

      <h3 className="text-sm font-bold text-gray-800 capitalize tracking-tight max-w-sm mx-auto">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-gray-500 mt-1.5 font-medium max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
      )}

      {(action || onAction || onReset || showHomeButton) && (
        <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
          {onAction && (
            <button
              type="button"
              onClick={onAction}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-2 hover:scale-105 transform transition-all duration-300 bg-primary text-white text-xs font-bold capitalize tracking-wider rounded-lg border border-primary hover:bg-primary/80 active:scale-95 shadow-sm"
            >
              {actionIcon && <Icon icon={actionIcon} className="text-lg" />}
              {actionLabel}
            </button>
          )}

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-2 hover:scale-105 transform transition-all duration-300 text-xs font-bold capitalize tracking-wider rounded-lg border border-primary text-primary hover:bg-blue-50 transition-all active:scale-95"
            >
              <Icon icon="mdi:refresh" className="text-lg" />
              {resetLabel}
            </button>
          )}

          {showHomeButton && (
            <button
              type="button"
              onClick={() => navigate("/")}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-2 hover:scale-105 transform transition-all duration-300 text-xs font-bold capitalize tracking-wider rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-all active:scale-95"
            >
              <Icon icon="mdi:home-outline" className="text-lg" />
              Go Home
            </button>
          )}

          {action}
        </div>
      )}
    </div>
  );
}
