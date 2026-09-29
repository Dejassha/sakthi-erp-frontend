import { FieldCard } from "../utils/fieldCardUtils";
import { Icon } from "@iconify/react";

const ProgramerDetails = ({ selectedMaterial, icon = "mdi:code-brackets", title = "Programer Details" }) => {
  if (!selectedMaterial) return null;
  return (
    <section>
      <div className="flex items-center gap-1.5 mb-2">
        {icon && <Icon icon={icon} className="w-5 h-5 text-slate-600" />}
        <h3 className="heading-secondary">
          {title}
        </h3>
      </div>
      {(selectedMaterial.programer_details?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-2">
          {selectedMaterial.programer_details?.[0]
            ? Object.entries(selectedMaterial.programer_details[0]).map(
              ([key, value]) => {
                if (
                  [
                    "id",
                    "product_details",
                    "material_details",
                  ].includes(key)
                )
                  return null;
                return (
                  <FieldCard
                    key={key}
                    label={key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                    value={value || "-"}
                  />
                );
              },
            )
            : null}
        </div>
      ) : (
        <p className="text-gray-500 italic">
          No programer details recorded yet.
        </p>
      )}
    </section>
  );
};

export default ProgramerDetails;
