
export const StepProgressBar = ({
  steps = [],
  currentStep = 1,
  activeColor = "!bg-primary",
  inactiveColor = "bg-gray-300",
}) => {
  return (
    <div className="flex items-start w-full">
      {steps.map((label, index) => {
        const stepIndex = index + 1;
        const isActive = currentStep >= stepIndex;
        const isCompleted = currentStep > stepIndex;
        const isLast = index === steps.length - 1;

        return (
          <div
            key={index}
            className={`flex items-start ${!isLast ? "flex-1" : ""}`}
          >
            {/* Step Node: Circle + Label */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`size-7 flex items-center justify-center rounded-full text-white text-xs font-bold transition-all duration-300 z-10 ${isActive ? `${activeColor} scale-105 shadow-sm` : inactiveColor
                  }`}
              >
                {stepIndex}
              </div>
              <p
                className={`mt-1 text-[10px] font-medium text-center whitespace-nowrap ${isActive ? "text-primary font-semibold" : "text-gray-400"
                  }`}
              >
                {label}
              </p>
            </div>

            {/* Responsive Connector Line */}
            {!isLast && (
              <div className="flex-1 h-0.5 bg-gray-200 mt-3.5 relative overflow-hidden">
                <div
                  className={`h-full ${activeColor} transition-all duration-500`}
                  style={{ width: isCompleted ? "120%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepProgressBar;
