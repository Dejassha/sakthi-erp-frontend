import React, { useState } from "react";
import GlobalButton from "@/components/ReusableComponents/Button";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import { useAuth } from "@/context/useAuth";
import InventoryPartForm from "./InventoryPartForm";

export const InventoryFormPage = ({
  mode: propMode = "add",
  item = null,
  editItem = null,
  form,
  machineOptions = [],
  existingParts = [],
  onBack,
  onEdit,
  onDeleteExistingBatch,
  onFinish,
  isLoading = false,
}) => {
  const { user } = useAuth();
  const isAdmin =
    user?.isAdmin ||
    user?.is_admin ||
    user?.is_superuser ||
    user?.role === "admin" ||
    (Array.isArray(user?.roles) && user.roles.includes("admin"));

  const itemData = editItem || item;
  const [internalMode, setInternalMode] = useState(null);

  const activeMode = internalMode || propMode;
  const isView = activeMode === "view";
  const isEdit = activeMode === "edit";
  const isAddQty = activeMode === "add_qty" || activeMode === "restock";

  const handleBack = onBack || (() => {});
  const handleSubmit = onFinish || (() => {});

  const itemName = itemData?.item_name || itemData?.part_name || "";

  const pageTitle = isView
    ? "View Inventory Item"
    : isAddQty
      ? `Restock Batch / Add Quantity - ${itemName}`
      : isEdit
        ? "Edit Inventory Item"
        : "Add New Inventory Item";

  return (
    <div className="w-full">
      <PageHeader
        title={pageTitle}
        actions={
          <div className="flex items-center gap-2.5">
            <GlobalButton
              color="cancel"
              size="xs"
              onClick={handleBack}
              icon="lucide:arrow-left"
              disabled={isLoading}
            >
              {isView ? "Back to List" : "Cancel"}
            </GlobalButton>
            {isView && isAdmin && (
              <GlobalButton
                color="blue"
                size="xs"
                onClick={() => {
                  if (onEdit) {
                    onEdit(itemData);
                  } else {
                    setInternalMode("edit");
                  }
                }}
                icon="lucide:pencil"
              >
                Edit Item
              </GlobalButton>
            )}
            {!isView && (
              <GlobalButton
                color={isAddQty ? "emerald" : "blue"}
                size="xs"
                onClick={() => form.submit()}
                loading={isLoading}
                icon={isAddQty ? "lucide:plus-circle" : isEdit ? "lucide:save" : "lucide:plus"}
              >
                {isAddQty ? "Restock Batch" : isEdit ? "Update Item" : "Save Item"}
              </GlobalButton>
            )}
          </div>
        }
      />

      {/* Form Card */}
      <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
        <InventoryPartForm
          form={form}
          mode={activeMode}
          itemData={itemData}
          machineOptions={machineOptions}
          existingParts={existingParts}
          onDeleteExistingBatch={onDeleteExistingBatch}
          onFinish={handleSubmit}
        />
      </div>
    </div>
  );
};

export default InventoryFormPage;
