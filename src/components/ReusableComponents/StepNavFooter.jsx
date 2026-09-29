import React from "react";
import Button from "./Button";

const StepNavFooter = ({
  currentStep = 1,
  totalSteps = 3,
  onBack,
  onNext,
  onSubmit,
  nextLabel,
  submitLabel = "Confirm & Save",
  backIcon = "mdi:arrow-left",
  nextIcon = "mdi:arrow-right",
  submitIcon = "mdi:check-circle",
  loading = false,
  disabled = false,
  showBackOnFirstStep = false,
  className = "",
}) => {
  const isFirstStep = currentStep <= 1;
  const isLastStep = currentStep >= totalSteps;
  const shouldShowBack = onBack && (!isFirstStep || showBackOnFirstStep);

  const resolvedNextLabel = nextLabel || "Next";

  return (
    <div
      className={`sticky bottom-0 left-0 right-0 z-20 mt-4 w-full pb-4 ${className}`}
    >
      <div className="flex items-center justify-between sm:justify-end gap-3 max-w-full mx-auto">
        <div className="flex items-center gap-2">
          {shouldShowBack && (
            <Button
              color="cancel"
              size="sm"
              icon={backIcon}
              iconPosition="left"
              onClick={onBack}
            >
              Back
            </Button>
          )}
        </div>

        {!isLastStep ? (
          <Button
            color="blue"
            size="sm"
            icon={nextIcon}
            iconPosition="right"
            disabled={disabled}
            onClick={onNext}
          >
            {resolvedNextLabel}
          </Button>
        ) : (
          <Button
            color="blue"
            size="sm"
            icon={submitIcon}
            iconPosition="right"
            loading={loading}
            disabled={disabled}
            onClick={onSubmit}
          >
            {loading ? "Saving..." : submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default StepNavFooter;
