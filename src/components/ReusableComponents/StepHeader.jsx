import StepProgressBar from "./StepProgressBar";

const StepHeader = ({
  title = "",
  steps = [],
  currentStep = 1,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col lg:flex-row justify-between items-center w-full gap-6 mb-4 ${className}`}
    >
      <h1 className="heading-primary text-center lg:text-left w-full">
        {title}
      </h1>
      {steps && steps.length > 0 ? (
        <div className="w-full">
          <StepProgressBar steps={steps} currentStep={currentStep} />
        </div>
      ) : null}
    </div>
  );
};

export default StepHeader;
