import { Table } from "antd";
import { FieldCard } from "../utils/fieldCardUtils";
import { Icon } from "@iconify/react";

const StatusBadge = ({ value }) => (
  <span
    className={`px-3 py-1 rounded-full text-xs font-medium ${
      value?.toLowerCase() === "pending"
        ? "bg-yellow-100 text-yellow-700"
        : value?.toLowerCase() === "completed" ||
            value?.toLowerCase() === "closed"
          ? "bg-green-100 text-green-700"
          : value?.toLowerCase() === "cancelled"
            ? "bg-red-100 text-red-700"
            : "bg-gray-100 text-gray-500"
    }`}
  >
    {value || "—"}
  </span>
);

const ProductionLogDetails = ({ selectedMaterial, type, icon = "lucide:clipboard-check", title = "Production Log Details", machineIcon = "lucide:wrench" }) => {
  if (!selectedMaterial) return null;

  // QA Details (Conditional)
  if (type !== "qa" && type !== "accounts" && type !== "admin") return null;

  return (
    <section>
      <div className="flex items-center gap-1.5 mb-2.5 mt-4">
        {icon && <Icon icon={icon} className="w-5 h-5 text-slate-600" />}
        <h3 className="heading-secondary">
          Production Log Details
        </h3>
      </div>
      {(selectedMaterial.qa_details?.length ?? 0) > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            {selectedMaterial.qa_details?.[0]
              ? Object.entries(selectedMaterial.qa_details[0]).map(
                  ([key, value]) => {
                    if (
                      [
                        "id",
                        "product_details",
                        "material_details",
                        "product_details_id",
                        "material_details_id",
                        "created_by_id",
                        "machines_used",
                        "machine_logs",
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
          {/* Machine Details Table Section */}
          {(() => {
            const qaDetail = selectedMaterial.qa_details?.[0];
            const machinesLogs =
              qaDetail?.machine_logs || qaDetail?.machines_used || [];
            if (machinesLogs.length === 0) return null;

            const formatTime = (val) => {
              if (val !== null && val !== "" && val !== undefined) {
                const parts = String(val).split(":");
                if (parts.length >= 2) {
                  const hour = parseInt(parts[0], 10);
                  return `${hour % 12 || 12}:${parts[1]} ${hour >= 12 ? "PM" : "AM"}`;
                }
              }
              return "-";
            };

            const columns = [
              {
                title: "S.No",
                key: "s_no",
                className: "!whitespace-nowrap",
                render: (_, __, idx) => idx + 1,
              },
              {
                title: "Machine Name",
                key: "machine_name",
                className: "!min-w-[120px] !whitespace-normal",
                render: (_, r) => r.machine_name || r.machine || "-",
              },
              {
                title: "Date",
                dataIndex: "date",
                key: "date",
                className: "!whitespace-nowrap",
                render: (val) => val || "-",
              },
              {
                title: "Start Time",
                key: "start_time",
                className: "!whitespace-nowrap",
                render: (_, r) =>
                  formatTime(
                    r.start_time !== undefined ? r.start_time : r.start,
                  ),
              },
              {
                title: "End Time",
                key: "end_time",
                className: "!whitespace-nowrap",
                render: (_, r) =>
                  formatTime(r.end_time !== undefined ? r.end_time : r.end),
              },
              {
                title: "Runtime",
                dataIndex: "runtime",
                key: "runtime",
                className: "!whitespace-nowrap",
                render: (val) => {
                  if (val !== null && val !== "" && val !== undefined) {
                    const parts = String(val).split(":");
                    return parts.length >= 2
                      ? `${parts[0]}:${parts[1]}`
                      : String(val);
                  }
                  return "-";
                },
              },
              {
                title: "Operator",
                key: "operator",
                className: "!whitespace-nowrap",
                render: (_, r) => r.operator_name || r.operator || "-",
              },
              {
                title: "Air/Gas",
                key: "air_gas",
                className: "!whitespace-nowrap",
                render: (_, r) => r.gas_type || r.air_gas || "-",
              },
            ].map((col) => ({
              ...col,
              align: "center",
              className: `!p-1.5 !text-[10px] !font-medium !text-gray-800 border-r border-gray-200 last:border-r-0 ${col.className || ""}`,
            }));
            return (
              <div className="mt-4 space-y-4 mb-6">
                <div className="flex items-center gap-1.5 mb-2.5">
                  {machineIcon && <Icon icon={machineIcon} className="w-5 h-5 text-slate-600" />}
                  <h4 className="heading-secondary">
                    Machine & Operator Details
                  </h4>
                </div>
                <div className="overflow-x-auto rounded-sm border border-gray-200 scrollbar-hide">
                  <Table
                    dataSource={machinesLogs}
                    columns={columns}
                    pagination={false}
                    bordered
                    size="small"
                    rowKey={(_, index) => index}
                    className="w-full [&_.ant-table-thead_th]:!bg-gray-200 [&_.ant-table-thead_th]:!text-gray-600 [&_.ant-table-thead_th]:!text-[10px] 2xl:[&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-semibold [&_.ant-table-thead_th]:!text-center [&_.ant-table-thead_th]:!py-1.5 [&_.ant-table-thead_th]:!px-1.5"
                  />
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        <p className="text-gray-500 italic">No QA details recorded yet.</p>
      )}
    </section>
  );
};

export default ProductionLogDetails;
