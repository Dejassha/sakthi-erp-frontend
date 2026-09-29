import { lazy, useMemo, useState, useEffect } from "react";
import { Spin, Tabs } from "antd";
import LoadingState from "@/pages/errorPage/LoadingState";
import ErrorState from "@/pages/errorPage/ErrorState";
import EmptyState from "@/pages/errorPage/EmptyState";
const ProductHeaderEdit = lazy(
  () => import("@/components/AdminComponents/EditComponents/ProductHeaderEdit"),
);
const MaterialListEdit = lazy(
  () => import("@/components/AdminComponents/EditComponents/MaterialListEdit"),
);
const ProgrammerEditForm = lazy(
  () =>
    import("@/components/AdminComponents/EditComponents/ProgrammerEditForm"),
);
const QaEditForm = lazy(
  () => import("@/components/AdminComponents/EditComponents/QaEditForm"),
);
import { useGetDashboardDetailsQuery } from "@/store/services/utility.api";
const AdminEditPage = ({ product: initialProduct, onBack }) => {
  const getTabFromHash = () => {
    const hash = window.location.hash.replace("#", "");
    const tabMap = {
      info: "1",
      materials: "2",
      programmer: "3",
      qa: "4",
    };
    return tabMap[hash] || "1";
  };

  const [activeTab, setActiveTab] = useState(getTabFromHash);

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const productId = initialProduct.product_id || initialProduct.id;
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    isError,
    error,
    refetch,
  } = useGetDashboardDetailsQuery(
    { product_id: Number(productId), type: "admin" },
    { skip: !productId },
  );
  const product = useMemo(
    () => dashboardData?.product || initialProduct,
    [dashboardData, initialProduct],
  );
  const materials = useMemo(
    () => dashboardData?.materials || [],
    [dashboardData],
  );
  const canEditProgrammer = useMemo(
    () =>
      materials.some(
        (mat) => mat.programer_status?.toLowerCase() === "completed",
      ),
    [materials],
  );
  const canEditQa = useMemo(
    () => materials.some((mat) => mat.qa_status?.toLowerCase() === "completed"),
    [materials],
  );
  const handleTabChange = (key) => {
    setActiveTab(key);
    const tabMap = {
      1: "info",
      2: "materials",
      3: "programmer",
      4: "qa",
    };
    window.location.hash = tabMap[key];
  };
  const handleBack = () => {
    window.location.hash = "";
    onBack?.();
  };
  const tabItems = [
    {
      key: "1",
      label: "Info",
      children: (
        <ProductHeaderEdit
          productId={Number(productId)}
          initialProduct={product}
          onBack={handleBack}
        />
      ),
    },
    {
      key: "2",
      label: "Materials",
      children: (
        <MaterialListEdit
          productId={Number(productId)}
          initialProduct={product}
          initialMaterials={materials}
          onBack={handleBack}
        />
      ),
    },
    {
      key: "3",
      label: "Programmer",
      disabled: !canEditProgrammer,
      children: (
        <ProgrammerEditForm onBack={handleBack} initialMaterials={materials} />
      ),
    },
    {
      key: "4",
      label: "QA",
      disabled: !canEditQa,
      children: <QaEditForm onBack={handleBack} initialMaterials={materials} />,
    },
  ];
  if (isDashboardLoading) {
    return (
      <div className="h-[400px] rounded-lg">
        <LoadingState message="Loading dashboard data..." fullPage={false} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-[400px] rounded-lg">
        <ErrorState
          error={error}
          onRetry={refetch}
          fullPage={false}
        />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="h-[400px] rounded-lg">
        <EmptyState
          title="No Dashboard Data"
          description="There are no dashboard records to display for this product."
          fullPage={false}
        />
      </div>
    );
  }
  return (
    <div className="-mt-2 sm:-mt-6">
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="middle"
        className="[&_.ant-tabs-nav]:!mb-2 [&_.ant-tabs-tab]:!text-sm"
      />
    </div>
  );
};
export default AdminEditPage;
