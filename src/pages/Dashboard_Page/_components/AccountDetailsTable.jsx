import { useMemo } from "react";
import { Table } from "antd";
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

const AccountDetailsTable = ({
  accountDetails,
  type,
  icon = "lucide:receipt",
  title = "Account Details",
}) => {
  const accountColumns = useMemo(() => {
    const fields = [
      { title: "Invoice No", key: "invoice_no", className: "!whitespace-nowrap" },
      { title: "Transporter No", key: "transporter_no", className: "!whitespace-nowrap" },
      { title: "Payment Terms", key: "payments_terms", className: "!min-w-[140px] !whitespace-normal" },
      { title: "Remarks", key: "remarks", className: "!min-w-[140px] !whitespace-normal" },
      { title: "Created By", key: "created_by", className: "!whitespace-nowrap" },
    ];
    const cols = fields.map((f) => ({
      title: f.title,
      dataIndex: f.key,
      key: f.key,
      className: f.className,
      render: (val) => val || "-",
    }));
    // Insert Status column at index 3
    cols.splice(3, 0, {
      title: "Status",
      dataIndex: "status",
      key: "status",
      className: "!whitespace-nowrap !px-2.5",
      render: (val) => <StatusBadge value={val} />,
    });
    return cols.map((col) => ({
      ...col,
      align: "center",
      className: `!p-1.5 !text-[10px] !font-medium !text-gray-800 border-r border-gray-200 last:border-r-0 ${col.className || ""}`,
    }));
  }, []);

  if (type !== "accounts" && type !== "admin") return null;

  return (
    <section className="mt-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        {icon && <Icon icon={icon} className="w-5 h-5 text-slate-600" />}
        <h3 className="heading-secondary">
          {title}
        </h3>
      </div>
      {(accountDetails?.length ?? 0) > 0 ? (
        <div className="overflow-x-auto rounded-sm border border-gray-200 scrollbar-hide">
          <Table
            dataSource={accountDetails}
            columns={accountColumns}
            pagination={false}
            bordered
            size="small"
            rowKey={(record) => record.id || record.invoice_no}
            className="w-full [&_.ant-table-thead_th]:!bg-gray-200 [&_.ant-table-thead_th]:!text-gray-600 [&_.ant-table-thead_th]:!text-[10px] 2xl:[&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-semibold [&_.ant-table-thead_th]:!text-center [&_.ant-table-thead_th]:!py-1.5 [&_.ant-table-thead_th]:!px-1.5"
          />
        </div>
      ) : (
        <p className="text-gray-500 italic text-xs">
          No account details recorded yet.
        </p>
      )}
    </section>
  );
};

export default AccountDetailsTable;
