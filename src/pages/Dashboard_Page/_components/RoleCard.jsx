import { colorMap } from "./ColorMap";

const RoleCard = ({ title, description, color, onClick }) => {
  const style = colorMap[color] || colorMap.blue;
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col text-left ${style.bg} ${style.hoverBg} border ${style.border} ${style.hoverBorder} rounded-xl px-4 py-3 shadow-sm hover:shadow-lg cursor-pointer hover:scale-[1.02] -translate-y-0 hover:-translate-y-1 transition-all duration-200 ease-out active:scale-[0.97] relative overflow-hidden h-full`}
    >
      <h3
        className={`mb-0.5 heading-secondary group-hover:${style.text} transition-colors duration-200`}
      >
        {title}
      </h3>
      <p className="description-secondary mb-4 line-clamp-2">
        {description}
      </p>

      <div
        className={`mt-auto flex items-center gap-1.5 text-[11px] font-bold ${style.text} uppercase tracking-wider opacity-90 group-hover:opacity-100 group-hover:scale-105 origin-left transition-all duration-200`}
      >
        Open Module
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5 transform group-hover:translate-x-1.5 transition-transform duration-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </div>
    </button>
  );
};

export default RoleCard;
