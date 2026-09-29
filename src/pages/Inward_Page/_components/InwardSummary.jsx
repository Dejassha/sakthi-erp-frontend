import { useMemo } from "react";
import InwardDetailTable from "@/pages/Dashboard_Page/_components/InwardDetailTable";
import ProductMaterialsTable from "@/pages/Dashboard_Page/_components/ProductMaterialsTable";

const InwardSummary = ({ formData = {} }) => {
  // Column definitions for Inward Basic Information
  const basicColumns = useMemo(() => {
    const cols = [
      {
        title: "Slip No.",
        dataIndex: "inward_slip_number",
        key: "inward_slip_number",
        align: "center",
        className:
          "!p-1.5 border-r border-gray-200 !text-[10px] font-medium text-gray-800",
        render: (val) => val || "—",
      },
      {
        title: "Sheet Type",
        dataIndex: "sheet_type",
        key: "sheet_type",
        align: "center",
        className:
          "!p-1.5 border-r border-gray-200 !text-[10px] font-medium text-gray-800 uppercase",
        render: (val) => val || "—",
      },
    ];

    if (formData.sheet_type === "jobcard") {
      cols.push({
        title: "Job Type",
        dataIndex: "job_type",
        key: "job_type",
        align: "center",
        className:
          "!p-1.5 border-r border-gray-200 !text-[10px] font-medium text-gray-800 uppercase",
        render: (val) => val || "—",
      });
    }

    cols.push(
      {
        title: "Company Name",
        dataIndex: "company_name",
        key: "company_name",
        align: "center",
        className:
          "!p-1.5 border-r border-gray-200 !text-[10px] font-medium text-gray-800",
        render: (val) => val || "—",
      },
      {
        title: "Customer Name",
        dataIndex: "customer_name",
        key: "customer_name",
        align: "center",
        className:
          "!p-1.5 border-r border-gray-200 !text-[10px] font-medium text-gray-800",
        render: (val) => val || "—",
      },
      {
        title: "Customer DC No.",
        dataIndex: "customer_dc_no",
        key: "customer_dc_no",
        align: "center",
        className:
          "!p-1.5 border-r border-gray-200 !text-[10px] font-medium text-gray-800",
        render: (val) => val || "—",
      },
      {
        title: "Work Order No.",
        dataIndex: "worker_no",
        key: "worker_no",
        align: "center",
        className:
          "!p-1.5 border-r border-gray-200 !text-[10px] font-medium text-gray-800",
        render: (val) => val || "—",
      },
      {
        title: "Mobile No.",
        dataIndex: "contact_no",
        key: "contact_no",
        align: "center",
        className: "!p-1.5 !text-[10px] font-medium text-gray-800",
        render: (val) => val || "—",
      },
    );

    return cols;
  }, [formData.sheet_type]);

  // Column definitions for Material Items (aligned with InwardTable)
  const materialColumns = useMemo(
    () => [
      {
        title: "S.No",
        key: "s_no",
        width: 40,
        align: "center",
        className:
          "!p-1 border-r border-gray-200 !text-[10px] font-medium text-gray-700",
        render: (_, __, index) => index + 1,
      },
      {
        title: "UID No",
        dataIndex: "uid_no",
        key: "uid_no",
        width: 80,
        align: "center",
        className:
          "!p-1 border-r border-gray-200 !text-[10px] uppercase font-medium text-gray-800",
        render: (val) => val || "—",
      },
      {
        title: "Heat No",
        dataIndex: "heat_no",
        key: "heat_no",
        width: 80,
        align: "center",
        className:
          "!p-1 border-r border-gray-200 !text-[10px] uppercase font-medium text-gray-800",
        render: (val) => val || "—",
      },
      {
        title: "Bay",
        dataIndex: "bay",
        key: "bay",
        width: 70,
        align: "center",
        className:
          "!p-1 border-r border-gray-200 !text-[10px] uppercase text-gray-800",
        render: (val) => val || "—",
      },
      {
        title: "TEC",
        dataIndex: "mat_type",
        key: "mat_type",
        width: 70,
        align: "center",
        className:
          "!p-1 border-r border-gray-200 !text-[10px] font-medium text-gray-800",
        render: (val) => val || "—",
      },
      {
        title: "Grade",
        dataIndex: "mat_grade",
        key: "mat_grade",
        width: 70,
        align: "center",
        className:
          "!p-1 border-r border-gray-200 !text-[10px] uppercase text-gray-800",
        render: (val) => val || "—",
      },
      {
        title: "Thick × Width × Length x Density",
        key: "dimensions",
        align: "center",
        className: "!p-1 border-r border-gray-200 !text-[10px] text-gray-800",
        render: (_, record) => (
          <span className="font-mono !text-[10px]">
            {record.thick || 0} × {record.width || 0} × {record.length || 0} x{" "}
            {record.density}
          </span>
        ),
      },
      {
        title: "Unit Wt.",
        dataIndex: "unit_weight",
        key: "unit_weight",
        width: 80,
        align: "center",
        className:
          "!p-1 border-r border-gray-200 !text-[10px] font-semibold text-slate-700 bg-slate-50/50",
        render: (val) => (val !== null && val !== undefined ? val : "—"),
      },
      {
        title: "Qty",
        dataIndex: "quantity",
        key: "quantity",
        width: 60,
        align: "center",
        className:
          "!p-1 border-r border-gray-200 !text-[10px] font-semibold text-gray-800",
        render: (val) => val || 0,
      },
      {
        title: "Total Wt.",
        dataIndex: "total_weight",
        key: "total_weight",
        width: 90,
        align: "center",
        className:
          "!p-1 border-r border-gray-200 !text-[10px] font-semibold text-slate-800 bg-slate-50/50",
        render: (val) => (val !== null && val !== undefined ? val : "—"),
      },
      {
        title: "Stock Due",
        dataIndex: "stock_due",
        key: "stock_due",
        width: 75,
        align: "center",
        className: "!p-1 border-r border-gray-200 !text-[10px] text-gray-800",
        render: (val) => (val ? `${val} Days` : "—"),
      },
      {
        title: "Remarks",
        dataIndex: "remarks",
        key: "remarks",
        width: 130,
        align: "center",
        className: "!p-1 !text-[10px] text-gray-600 italic",
        render: (val) => val || "—",
      },
    ],
    [],
  );

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 w-full shadow-xs space-y-5">
      {/* Section 1: Inward Details */}
      <InwardDetailTable formData={formData} columns={basicColumns} />

      {/* Section 2: Material Details */}
      <ProductMaterialsTable materials={formData?.materials} columns={materialColumns} />
    </div>
  );
};

export default InwardSummary;
