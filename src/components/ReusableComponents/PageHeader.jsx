const PageHeader = ({
  title,
  highlight,
  description,
  actions,
  className = "",
}) => {
  return (
    <div
      className={`pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 md:gap-4 ${className}`}
    >
      <div>
        <h1 className="heading-primary flex items-center gap-1.5 flex-wrap">
          {title}{" "}
          {highlight && <span className="text-primary">{highlight}</span>}
        </h1>
        {description && <p className="description-primary">{description}</p>}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>
      )}
    </div>
  );
};

export default PageHeader;
