import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
// Components & Reusables
import Loader from "@/components/ReusableComponents/Loader";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import Button from "@/components/ReusableComponents/Button";
import InwardDetailTable from "./_components/InwardDetailTable";
import ProductMaterialsTable from "./_components/ProductMaterialsTable";
import ProgramerDetails from "./_components/ProgramerDetails";
import ProductionLogDetails from "./_components/ProductionLogDetails";
import AccountDetailsTable from "./_components/AccountDetailsTable";
// RTK Query
import { useGetDashboardDetailsQuery } from "@/store/services/utility.api";

// Helper Badges
const StatusBadge = ({ value }) => (
  <span
    className={`px-2 py-0.5 rounded-full text-[10px] font-medium leading-none inline-block ${value?.toLowerCase() === "pending"
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

const DashboardDetails = ({
  product: initialProduct,
  onBack,
  onEdit,
  onProceed,
  canProceed: customCanProceed,
}) => {
  const location = useLocation();
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [hasAutoSelectedSingleMaterial, setHasAutoSelectedSingleMaterial] =
    useState(false);
  const lastProductIdRef = useRef(null);

  const type = useMemo(() => {
    const path = location.pathname;
    if (path.includes("qa_dashboard")) return "qa";
    if (path.includes("accounts_dashboard")) return "accounts";
    if (path.includes("programer_dashboard")) return "programer";
    if (path.includes("admin_dashboard")) return "admin";
    return "accounts";
  }, [location.pathname]);

  const { data, isLoading, isError } = useGetDashboardDetailsQuery(
    {
      product_id: initialProduct?.id,
      type,
    },
    {
      skip: !initialProduct?.id,
      refetchOnMountOrArgChange: true,
    },
  );

  useEffect(() => {
    const currentProductId = initialProduct?.id || null;
    if (lastProductIdRef.current !== currentProductId) {
      lastProductIdRef.current = currentProductId;
      setHasAutoSelectedSingleMaterial(false);
      setSelectedMaterialId(null);
    }
    if (
      data?.materials?.length === 1 &&
      !selectedMaterialId &&
      !hasAutoSelectedSingleMaterial
    ) {
      setSelectedMaterialId(data.materials[0].id || null);
      setHasAutoSelectedSingleMaterial(true);
    }
    if (data?.materials?.length !== 1) {
      setHasAutoSelectedSingleMaterial(false);
    }
  }, [
    data,
    selectedMaterialId,
    hasAutoSelectedSingleMaterial,
    initialProduct?.id,
  ]);

  const { product, materials } = data || {};
  const selectedMaterial = materials?.find((m) => m.id === selectedMaterialId);
  const validateEdit = product?.outward_status === "pending";

  const displayStatus =
    selectedMaterial?.acc_status?.toLowerCase() === "cancelled"
      ? "CANCELLED"
      : product?.outward_status;

  const computedCanProceed = useMemo(() => {
    if (customCanProceed !== undefined) return customCanProceed;
    if (!materials || materials.length === 0) return false;
    if (type === "programer") {
      return materials.some(
        (mat) => mat.programer_status?.toLowerCase() === "pending",
      );
    }
    if (type === "qa") {
      return materials.some(
        (mat) =>
          mat.programer_status?.toLowerCase() === "completed" &&
          mat.qa_status?.toLowerCase() === "pending",
      );
    }
    if (type === "accounts") {
      return materials.some(
        (mat) =>
          mat.programer_status?.toLowerCase() === "completed" &&
          mat.acc_status?.toLowerCase() === "pending",
      );
    }
    return false;
  }, [customCanProceed, materials, type]);

  const headerTitle = useMemo(() => {
    if (type === "programer") return "Program Details";
    if (type === "qa") return "Production Log Details";
    if (type === "accounts") return "Accounts Details";
    return "Product Details";
  }, [type]);

  const inwardColumns = useMemo(() => {
    if (!product) return [];
    const cols = [
      {
        title: "Slip No.",
        dataIndex: "inward_slip_number",
        key: "inward_slip_number",
        className: "!whitespace-nowrap",
        render: (val) => val || "—",
      },
      {
        title: "Date",
        dataIndex: "date",
        key: "date",
        className: "!whitespace-nowrap",
        render: (val) => val || "—",
      },
      {
        title: "WO. No.",
        dataIndex: "worker_no",
        key: "worker_no",
        className: "!whitespace-nowrap",
        render: (val) => val || "—",
      },
      {
        title: "Company",
        dataIndex: "company_name",
        key: "company_name",
        className: "!min-w-[160px] !whitespace-normal",
        render: (val) => val || "—",
      },
      {
        title: "Customer",
        dataIndex: "customer_name",
        key: "customer_name",
        className: "!min-w-[100px] !whitespace-normal",
        render: (val) => val || "—",
      },
      {
        title: "DC No.",
        dataIndex: "customer_dc_no",
        key: "customer_dc_no",
        className: "!whitespace-nowrap",
        render: (val) => val || "—",
      },
      {
        title: "Contact",
        dataIndex: "contact_no",
        key: "contact_no",
        className: "!whitespace-nowrap",
        render: (val) => val || "—",
      },
    ];

    if (product.sheet_type === "jobcard") {
      cols.push({
        title: "Job Type",
        dataIndex: "job_type",
        key: "job_type",
        className: "!whitespace-nowrap",
        render: (val) => val || "—",
      });
    }

    cols.push(
      {
        title: "Sheet Type",
        dataIndex: "sheet_type",
        key: "sheet_type",
        className: "!whitespace-nowrap",
        render: (val) =>
          val === "quotation"
            ? "Development"
            : val === "jobcard"
              ? "Job Card"
              : val,
      },
      {
        title: "Prog. Status",
        dataIndex: "programer_status",
        key: "programer_status",
        className: "!whitespace-nowrap !px-2.5",
        render: (val) => <StatusBadge value={val} />,
      },
    );

    if (type === "qa" || type === "accounts" || type === "admin") {
      cols.push({
        title: "QA Status",
        dataIndex: "qa_status",
        key: "qa_status",
        className: "!whitespace-nowrap !px-2.5",
        render: (val) => <StatusBadge value={val} />,
      });
    }

    if (type === "accounts" || type === "admin") {
      cols.push({
        title: "Accounts Status",
        key: "accounts_status",
        className: "!whitespace-nowrap !px-2.5",
        render: () => <StatusBadge value={displayStatus} />,
      });
    }

    cols.push({
      title: "Created By",
      dataIndex: "created_by",
      key: "created_by",
      className: "!whitespace-nowrap",
      render: (val) => val || "—",
    });

    return cols.map((col) => ({
      ...col,
      align: "center",
      className: `!p-1.5 !text-[10px] !font-medium !text-gray-800 border-r border-gray-200 last:border-r-0 ${col.className || ""}`,
    }));
  }, [product, type, displayStatus]);

  const materialColumns = useMemo(() => {
    const cols = [
      "UID No:uid_no",
      "Heat No:heat_no",
      "Bay:bay",
      "Mat. Type:mat_type",
      "Grade:mat_grade",
      "Thick:thick",
      "Width:width",
      "Length:length",
      "Density:density",
    ].map((str) => {
      const [title, key] = str.split(":");
      return {
        title,
        dataIndex: key,
        key,
        render: (val) => ((val ?? "") !== "" ? val : "-"),
      };
    });

    return [
      { title: "S.No", key: "s_no", render: (_, __, idx) => idx + 1 },
      ...cols,
      {
        title: "Unit Wt.",
        dataIndex: "unit_weight",
        key: "unit_weight",
        render: (val) => Number(val || 0).toFixed(2),
      },
      {
        title: "Qty",
        dataIndex: "quantity",
        key: "quantity",
        render: (val) => val ?? "-",
      },
      {
        title: "Total Wt.",
        dataIndex: "total_weight",
        key: "total_weight",
        render: (val) => Number(val || 0).toFixed(2),
      },
      {
        title: "Due",
        dataIndex: "stock_due",
        key: "stock_due",
        render: (val) => val ?? "-",
      },
      {
        title: "Remarks",
        dataIndex: "remarks",
        key: "remarks",
        render: (val) => val || "-",
      },
      {
        title: "Status",
        key: "status",
        render: (_, r) => {
          const status =
            type === "qa"
              ? r.qa_status
              : type === "programer"
                ? r.programer_status
                : r.acc_status;
          return status ? <StatusBadge value={status} /> : "--";
        },
      },
      {
        title: "Action",
        key: "action",
        render: (_, r) => (
          <Button
            size="xs"
            color={selectedMaterialId === r.id ? "cancel" : "blue"}
            onClick={() =>
              r.id &&
              setSelectedMaterialId(selectedMaterialId === r.id ? null : r.id)
            }
          >
            {selectedMaterialId === r.id ? "Hide" : "View"}
          </Button>
        ),
      },
    ].map((col) => ({
      ...col,
      align: "center",
      className:
        "!p-1 border-r border-gray-200 last:border-r-0 text-[11px] text-gray-805",
    }));
  }, [type, selectedMaterialId]);

  if (isLoading) {
    return <Loader text="Fetching product details..." fullScreen={false} />;
  }
  if (isError || !data) {
    return (
      <div className="text-center">
        <p className="text-red-500 text-sm">
          Error loading product details. Please try again.
        </p>
      </div>
    );
  }

  const hasHeaderActions = Boolean(
    onBack ||
    (type === "admin" && onEdit && validateEdit) ||
    (type !== "admin" && onProceed && computedCanProceed),
  );

  return (
    <div className="mx-auto w-full">
      {/* Header with Actions via PageHeader */}
      {hasHeaderActions ? (
        <PageHeader
          title={headerTitle}
          actions={
            <div className="flex items-center gap-2">
              {onBack ? (
                <Button color="cancel" size="xs" icon="lucide:arrow-left" onClick={onBack}>
                  Back
                </Button>
              ) : null}

              {type === "admin" && onEdit && validateEdit ? (
                <Button
                  color="blue"
                  size="xs"
                  icon="lucide:edit"
                  onClick={() => onEdit({ ...product })}
                >
                  Edit Product
                </Button>
              ) : null}

              {type !== "admin" && onProceed && computedCanProceed ? (
                <Button
                  color="blue"
                  size="xs"
                  icon="lucide:check"
                  iconPosition="left"
                  onClick={onProceed}
                >
                  Proceed
                </Button>
              ) : null}
            </div>
          }
        />
      ) : null}

      <InwardDetailTable
        formData={product}
        columns={inwardColumns}
      />

      {materials && materials.length > 0 ? (
        <ProductMaterialsTable
          materials={materials}
          columns={materialColumns}
          className="mt-4"
        />
      ) : null}

      {/* Conditional Rendering of Details */}
      {selectedMaterial ? (
        <div className="mt-4">
          {/* Programer Details (Always shown if material selected) */}
          <ProgramerDetails selectedMaterial={selectedMaterial} />

          {/* QA & Machine Log Details (Conditional) */}
          <ProductionLogDetails
            selectedMaterial={selectedMaterial}
            type={type}
            displayStatus={product?.outward_status}
          />

          {/* Account Details (Conditional) */}
          <AccountDetailsTable
            accountDetails={selectedMaterial.account_details}
            type={type}
          />
        </div>
      ) : null}
    </div>
  );
};

export default DashboardDetails;
