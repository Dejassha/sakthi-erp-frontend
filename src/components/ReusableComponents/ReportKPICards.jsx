import React, { memo } from "react";
import { Icon } from "@iconify/react";

const COLOR_PRESETS = {
  slate: {
    cardBg: "bg-slate-50 border-slate-200/90",
    iconBg: "bg-slate-700",
    labelColor: "text-slate-700",
    valueColor: "text-slate-900",
    subColor: "text-slate-500",
  },
  emerald: {
    cardBg: "bg-emerald-50/60 border-emerald-200/80",
    iconBg: "bg-emerald-600",
    labelColor: "text-emerald-800",
    valueColor: "text-emerald-950",
    subColor: "text-emerald-600",
  },
  green: {
    cardBg: "bg-emerald-50/60 border-emerald-200/80",
    iconBg: "bg-emerald-600",
    labelColor: "text-emerald-800",
    valueColor: "text-emerald-950",
    subColor: "text-emerald-600",
  },
  blue: {
    cardBg: "bg-blue-50/60 border-blue-200/80",
    iconBg: "bg-blue-600",
    labelColor: "text-blue-800",
    valueColor: "text-blue-950",
    subColor: "text-blue-600",
  },
  indigo: {
    cardBg: "bg-indigo-50/60 border-indigo-200/80",
    iconBg: "bg-indigo-600",
    labelColor: "text-indigo-800",
    valueColor: "text-indigo-950",
    subColor: "text-indigo-600",
  },
  purple: {
    cardBg: "bg-purple-50/60 border-purple-200/80",
    iconBg: "bg-purple-600",
    labelColor: "text-purple-800",
    valueColor: "text-purple-950",
    subColor: "text-purple-600",
  },
  orange: {
    cardBg: "bg-orange-50/60 border-orange-200/80",
    iconBg: "bg-orange-600",
    labelColor: "text-orange-800",
    valueColor: "text-orange-950",
    subColor: "text-orange-600",
  },
  amber: {
    cardBg: "bg-amber-50/60 border-amber-200/80",
    iconBg: "bg-amber-600",
    labelColor: "text-amber-800",
    valueColor: "text-amber-950",
    subColor: "text-amber-600",
  },
  rose: {
    cardBg: "bg-rose-50/60 border-rose-200/80",
    iconBg: "bg-rose-600",
    labelColor: "text-rose-800",
    valueColor: "text-rose-950",
    subColor: "text-rose-600",
  },
  red: {
    cardBg: "bg-rose-50/60 border-rose-200/80",
    iconBg: "bg-rose-600",
    labelColor: "text-rose-800",
    valueColor: "text-rose-950",
    subColor: "text-rose-600",
  },
  teal: {
    cardBg: "bg-teal-50/60 border-teal-200/80",
    iconBg: "bg-teal-600",
    labelColor: "text-teal-800",
    valueColor: "text-teal-950",
    subColor: "text-teal-600",
  },
};

/**
 * Single KPI Metric Card
 */
export const KPICard = memo(({
  icon = "lucide:activity",
  label = "",
  value = 0,
  subText = "",
  color = "slate",
  cardBg,
  iconBg,
  labelColor,
  valueColor,
  subColor,
  className = "",
  formatter,
  isStringValue = false,
}) => {
  const preset = COLOR_PRESETS[color] || COLOR_PRESETS.slate;

  const effectiveCardBg = cardBg || preset.cardBg;
  const effectiveIconBg = iconBg || preset.iconBg;
  const effectiveLabelColor = labelColor || preset.labelColor;
  const effectiveValueColor = valueColor || preset.valueColor;
  const effectiveSubColor = subColor || preset.subColor;

  let displayValue = value;
  if (formatter && typeof formatter === "function") {
    displayValue = formatter(value);
  } else if (!isStringValue && typeof value === "number") {
    displayValue = value.toLocaleString("en-IN");
  }

  return (
    <div
      className={`flex items-center gap-2.5 p-2 ${effectiveCardBg} border rounded-lg shadow-xs transition-all hover:shadow-sm ${className}`}
    >
      <div
        className={`w-7 h-7 rounded-md ${effectiveIconBg} text-white flex items-center justify-center shrink-0 shadow-xs`}
      >
        <Icon icon={icon} className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <p className={`text-[9px] font-bold ${effectiveLabelColor} uppercase tracking-wider`}>
          {label}
        </p>
        <p className={`text-xs font-bold ${effectiveValueColor} leading-tight`}>
          {displayValue}
        </p>
        {subText ? (
          <p className={`text-[9px] ${effectiveSubColor} font-medium leading-none`}>
            {subText}
          </p>
        ) : null}
      </div>
    </div>
  );
});

KPICard.displayName = "KPICard";

/**
 * Group / Grid of KPI Metric Cards
 */
export const ReportKPICards = memo(({
  cards = [],
  className = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5",
}) => {
  if (!cards || cards.length === 0) return null;

  return (
    <div className={className}>
      {cards.map((card, idx) => (
        <KPICard key={card.key || idx} {...card} />
      ))}
    </div>
  );
});

ReportKPICards.displayName = "ReportKPICards";

export default ReportKPICards;
