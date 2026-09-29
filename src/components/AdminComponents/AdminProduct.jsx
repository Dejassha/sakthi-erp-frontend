import React from "react";
import { useSearchParams } from "react-router-dom";
import DashboardDetails from "@/pages/Dashboard_Page/DashboardDetails";
import AdminEditPage from "./EditComponents/AdminEditPage";
import DashboardList from "@/pages/Dashboard_Page/DashboardList";
import { toHybridSlug, extractIdFromHybridSlug } from "@/utils/slugUtils";

const AdminProducts = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const viewSlug = searchParams.get("view");
  const editSlug = searchParams.get("edit");

  const viewId = extractIdFromHybridSlug(viewSlug);
  const editId = extractIdFromHybridSlug(editSlug);

  const handleBackToList = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("view");
    newParams.delete("edit");
    setSearchParams(newParams, { replace: true });
  };

  const handleView = (product) => {
    const slug = toHybridSlug(
      product?.company_name || product?.inward_slip_number || "product",
      product?.id || product?.product_id,
      "adm",
    );
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("edit");
    newParams.set("view", slug);
    setSearchParams(newParams);
  };

  const handleEdit = (product) => {
    const productId = product?.id || product?.product_id || viewId || editId;
    const slug = toHybridSlug(
      product?.company_name || product?.inward_slip_number || "product",
      productId,
      "adm",
    );
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("view");
    newParams.set("edit", slug);
    setSearchParams(newParams);
  };

  if (editId) {
    return (
      <div className="p-6">
        <AdminEditPage
          product={{ id: editId, product_id: editId }}
          onBack={() => {
            if (viewSlug) {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete("edit");
              setSearchParams(newParams, { replace: true });
            } else {
              handleBackToList();
            }
          }}
        />
      </div>
    );
  }

  if (viewId) {
    return (
      <div className="p-6">
        <DashboardDetails
          product={{ id: viewId, product_id: viewId }}
          onBack={handleBackToList}
          onEdit={(product) => handleEdit(product)}
        />
      </div>
    );
  }

  return (
    <>
      <DashboardList
        type="admin"
        onView={handleView}
      />
    </>
  );
};

export default AdminProducts;
