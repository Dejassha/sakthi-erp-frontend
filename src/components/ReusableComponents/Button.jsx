import { Icon } from "@iconify/react";

const colorStyles = {
  blue: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md focus:ring-blue-500",
  red: "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md focus:ring-red-500",
  green:
    "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md focus:ring-emerald-500",
  purple:
    "bg-purple-600 hover:bg-purple-700 text-white shadow-sm hover:shadow-md focus:ring-purple-500",
  yellow:
    "bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md focus:ring-amber-500",
  amber:
    "bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md focus:ring-amber-500",
  gray: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 focus:ring-slate-400",
  cancel:
    "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 focus:ring-slate-400",
  // Outline-only styles that fill on hover with micro-animations
  outline:
    "bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 focus:ring-slate-400",
  "outline-blue":
    "bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white focus:ring-blue-500",
  "outline-red":
    "bg-transparent border border-red-600 text-red-600 hover:bg-red-600 hover:text-white focus:ring-red-500",
  "outline-green":
    "bg-transparent border border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white focus:ring-emerald-500",
  "outline-purple":
    "bg-transparent border border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white focus:ring-purple-500",
};

const sizeStyles = {
  xs: "px-2 py-1 text-[10px] gap-1 rounded-md",
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-md",
  md: "px-4 py-2 text-sm gap-2 rounded-lg",
  lg: "px-5 py-2.5 text-base gap-2.5 rounded-xl",
};

const Button = ({
  children,
  icon,
  iconPosition = "left",
  color = "blue",
  size = "xs",
  type = "button",
  disabled = false,
  loading = false,
  onClick,
  className = "",
  ...props
}) => {
  const colorClass = colorStyles[color] || colorStyles.blue;
  const sizeClass = sizeStyles[size] || sizeStyles.xs;
  const iconSizeClass = size === "xs" ? "w-3 h-3" : "w-4 h-4";

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`group inline-flex items-center justify-center font-semibold transition-all duration-200 ease-in-out hover:scale-[1.02] focus:outline-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed ${colorClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Icon
          icon="mdi:loading"
          className={`${iconSizeClass} animate-spin flex-shrink-0`}
        />
      ) : icon && iconPosition === "left" ? (
        <Icon
          icon={icon}
          className={`${iconSizeClass} flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}
        />
      ) : null}

      {children ? <span>{children}</span> : null}

      {!loading && icon && iconPosition === "right" ? (
        <Icon
          icon={icon}
          className={`${iconSizeClass} flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}
        />
      ) : null}
    </button>
  );
};

export default Button;
