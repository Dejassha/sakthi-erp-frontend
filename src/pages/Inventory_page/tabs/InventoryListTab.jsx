import React, { useMemo, useState, useEffect } from "react";
import { Form, message } from "antd";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import {
  useGetInventoryPartsQuery,
  useAddInventoryPartMutation,
  useUpdateInventoryPartMutation,
  useDeleteInventoryPartMutation,
  useGetInventoryPartNamesQuery,
  useGetMachinesQuery,
  useGetInventoryUsageTypesQuery,
  useAddInventoryUsageMutation,
  useAddInventoryUsageTypeMutation,
} from "@/store/services/admin.api";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import Button from "@/components/ReusableComponents/Button";
import {
  InventoryGrid,
  InventoryFormPage,
  DeletePartModal,
  AddQuantityModal,
  PartsUsageFormPage,
} from "../InventoryComponents";
import {
  getMatchedPartBatches,
  resolveBatchFromStockMode,
  sortPartsByFifo,
} from "../utils/inventoryBatchUtils";
const presetPartNames = [
  "Laser Nozzle",
  "Ceramic Ring",
  "Protective Lens",
  "Protective Glass",
  "Filter",
  "Sensor",
];
const presetUsageTypes = [
  "Breakdown Maintenance",
  "Preventive Maintenance",
  "Routine Replacement",
  "Testing & Calibration",
];

const formatDateValue = (val) => {
  if (!val) return undefined;
  if (typeof val?.format === "function") return val.format("YYYY-MM-DD");
  if (typeof val === "string" && val.trim()) return val.trim().slice(0, 10);
  return undefined;
};

const getErrorMessage = (err, fallback = "Operation failed") => {
  if (err?.data) {
    if (typeof err.data === "string") return err.data;
    if (err.data.message) return err.data.message;
    if (err.data.error) return err.data.error;
    if (err.data.detail) return err.data.detail;
    if (err.data.msg) return err.data.msg;
    const firstKey = Object.keys(err.data)[0];
    if (firstKey && Array.isArray(err.data[firstKey])) {
      return `${firstKey}: ${err.data[firstKey][0]}`;
    }
    if (firstKey && typeof err.data[firstKey] === "string") {
      return `${firstKey}: ${err.data[firstKey]}`;
    }
  }
  if (err?.message) return err.message;
  return fallback;
};

const InventoryListTab = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [formMode, setFormMode] = useState(null); // null | "add" | "edit" | "view"
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [addQtyItem, setAddQtyItem] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddQtyModalOpen, setIsAddQtyModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [customUsageTypeVisible, setCustomUsageTypeVisible] = useState(false);
  const [partForm] = Form.useForm();
  const [deleteForm] = Form.useForm();
  const [addQtyForm] = Form.useForm();
  const [usageForm] = Form.useForm();
  const { user } = useAuth();
  const username = user?.username || "Admin";
  const { data: dbUsageTypes = [] } = useGetInventoryUsageTypesQuery(undefined);
  const [addUsageType] = useAddInventoryUsageTypeMutation();
  const [addUsage] = useAddInventoryUsageMutation();
  const isAdmin =
    user?.isAdmin ||
    user?.is_admin ||
    user?.is_superuser ||
    user?.role === "admin" ||
    (Array.isArray(user?.roles) && user.roles.includes("admin"));
  const { data: dbPartNames = [] } = useGetInventoryPartNamesQuery(undefined);
  const {
    data: parts = [],
    isLoading,
    refetch: refetchParts,
  } = useGetInventoryPartsQuery(undefined);
  const [addPart] = useAddInventoryPartMutation();
  const [updatePart] = useUpdateInventoryPartMutation();
  const [deletePart] = useDeleteInventoryPartMutation();
  const { data: machines = [] } = useGetMachinesQuery(undefined);
  // Build machine options
  const machineOptions = useMemo(() => {
    const seen = new Set();
    const opts = [{ label: "Others", value: "common" }];
    machines.forEach((m) => {
      const name = m.machine_name;
      if (!name || seen.has(name)) return;
      seen.add(name);
      opts.push({ label: name, value: m.id });
    });
    return opts;
  }, [machines]);
  const memoizedParts = useMemo(() => {
    const groups = {};
    parts.forEach((p) => {
      const name = (p.item_name || p.part_name || "").trim();
      const key = name.toLowerCase();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(p);
    });
    const aggregated = [];
    let sno = 1;
    Object.keys(groups).forEach((key) => {
      const group = groups[key];
      if (group.length === 0) return;
      // Sort group by ID desc (highest ID is newest batch), so the first item is always the latest batch
      const sortedGroup = [...group].sort((a, b) => b.id - a.id);
      const latestPart = sortedGroup[0];
      // Sum quantities
      const stock_quantity = group.reduce(
        (sum, p) => sum + Number(p.stock_quantity || 0),
        0,
      );
      const available_quantity = group.reduce(
        (sum, p) => sum + Number(p.available_quantity || 0),
        0,
      );
      const used_quantity = group.reduce(
        (sum, p) => sum + Number(p.used_quantity || 0),
        0,
      );
      const min_stock_quantity = Number(latestPart.min_stock_quantity || 0);
      // Collect all unique spare IDs
      const uniqueSpareIds = Array.from(
        new Set(
          group
            .map(
              (p) =>
                p.spare_id ||
                (p.id ? `SP-${String(p.id).padStart(3, "0")}` : ""),
            )
            .filter(Boolean),
        ),
      );
      const spare_id = uniqueSpareIds.join(", ") || "-";
      // Collect all unique item codes
      const uniqueItemCodes = Array.from(
        new Set(group.map((p) => p.item_code).filter(Boolean)),
      );
      const item_code = uniqueItemCodes.join(", ") || "-";
      // Determine aggregated status
      let status = "in_stock";
      if (available_quantity <= 0) {
        status = "out_of_stock";
      } else if (
        min_stock_quantity > 0 &&
        available_quantity <= min_stock_quantity
      ) {
        status = "low_stock";
      }
      // Combine rate history from all parts
      const rawRates = group
        .flatMap((p) => p.rate_history || [])
        .concat(group.map((p) => p.purchase_price || 0));

      const combinedRateHistory = Array.from(
        new Set(
          rawRates
            .map((r) => Number(r))
            .filter((r) => !isNaN(r) && r !== null && r !== undefined),
        ),
      );
      aggregated.push({
        ...latestPart,
        sno: sno++,
        spare_id,
        item_code,
        stock_quantity,
        available_quantity,
        used_quantity,
        min_stock_quantity,
        status,
        rate_history: combinedRateHistory,
        group_parts: sortedGroup,
      });
    });
    return aggregated;
  }, [parts]);
  const resetModal = () => {
    setSearchParams({}, { replace: true });
    setFormMode(null);
    setEditItem(null);
    setViewItem(null);
    partForm.resetFields();
    usageForm.resetFields();
  };
  const openAddModal = () => {
    setSearchParams({ action: "add" });
    setEditItem(null);
    setViewItem(null);
    partForm.resetFields();
    partForm.setFieldsValue({
      machine: "common",
      unit: "PCS",
      min_stock_quantity: 5,
      batches: [
        {
          batch_number: "BAT-01",
          stock_quantity: "",
          purchase_price: "",
          purchase_date: dayjs(),
          bought_from: "",
          remarks: "",
        },
      ],
    });
    setFormMode("add");
  };
  const openEditModal = (item) => {
    if (!item) return;
    const latestPart = item.group_parts ? item.group_parts[0] : item;
    const itemId = latestPart.id || item.id || item.spare_id;
    if (itemId) {
      setSearchParams({ action: "edit", id: String(itemId) });
    }
    setEditItem(item);
    setViewItem(null);
    const itemName = latestPart.item_name || latestPart.part_name || "";
    const STANDARD_UNITS = [
      "PCS",
      "NOS",
      "SET",
      "KG",
      "MTR",
      "LTR",
      "BOX",
      "PKT",
      "ROLL",
      "SHEET",
      "PAIR",
      "HOURS",
    ];
    const rawUnit = (latestPart.unit || "PCS").toUpperCase().trim();
    const cleanUnit = rawUnit || "PCS";
    const availQty = Math.round(Number(item.available_quantity || 0));
    const stockQty = Math.round(Number(item.stock_quantity ?? availQty));
    const minStockQty = Math.round(Number(item.min_stock_quantity || 0));

    const batchValues = {};
    if (item.group_parts && item.group_parts.length > 0) {
      item.group_parts.forEach((p) => {
        batchValues[`batch_available_${p.id}`] = Math.round(Number(p.available_quantity || 0));
      });
    }

    partForm.resetFields();
    partForm.setFieldsValue({
      spare_id: latestPart.spare_id || "",
      item_code: latestPart.item_code || "",
      part_name: itemName,
      machine: latestPart.machine ?? "common",
      min_stock_quantity: minStockQty,
      unit: cleanUnit,
      ...batchValues,
    });
    setFormMode("edit");
  };
  const openAddQtyPage = (item) => {
    if (!item) return;
    const latestPart = item.group_parts ? item.group_parts[0] : item;
    const itemId = latestPart.id || item.id || item.spare_id;
    if (itemId) {
      setSearchParams({ action: "add_qty", id: String(itemId) });
    }
    setEditItem(item);
    setViewItem(null);
    setFormMode("add_qty");
  };
  const openViewModal = (item) => {
    if (!item) return;
    const latestPart = item.group_parts ? item.group_parts[0] : item;
    const itemId = latestPart.id || item.id || item.spare_id;
    if (itemId) {
      setSearchParams({ action: "view", id: String(itemId) });
    }
    setViewItem(item);
    setEditItem(null);
    setFormMode("view");
  };

  useEffect(() => {
    const action = searchParams.get("action");
    const id = searchParams.get("id");

    if (!action) {
      if (formMode !== null) {
        setFormMode(null);
        setEditItem(null);
        setViewItem(null);
      }
      return;
    }

    if (action === "use_parts") {
      if (formMode !== "use_parts") {
        setEditItem(null);
        setViewItem(null);
        usageForm.resetFields();
        usageForm.setFieldValue("used_date", dayjs());
        usageForm.setFieldValue("use_new_quantity", "auto");
        setCustomUsageTypeVisible(false);
        setFormMode("use_parts");
      }
      return;
    }

    if (action === "add") {
      if (formMode !== "add") {
        setEditItem(null);
        setViewItem(null);
        partForm.resetFields();
        partForm.setFieldsValue({
          machine: "common",
          unit: "PCS",
          min_stock_quantity: 5,
          batches: [
            {
              batch_number: "BAT-01",
              stock_quantity: "",
              purchase_price: "",
              purchase_date: dayjs(),
              bought_from: "",
              remarks: "",
            },
          ],
        });
        setFormMode("add");
      }
    } else if ((action === "edit" || action === "view" || action === "add_qty" || action === "restock") && id) {
      const itemToSelect =
        memoizedParts.find(
          (p) =>
            String(p.id) === String(id) ||
            (p.group_parts &&
              p.group_parts.some((gp) => String(gp.id) === String(id))) ||
            String(p.spare_id) === String(id) ||
            String(p.item_code) === String(id) ||
            (p.part_name && p.part_name.toLowerCase() === id.toLowerCase()),
        ) || parts.find((p) => String(p.id) === String(id));
      if (itemToSelect) {
        if (
          action === "edit" &&
          (formMode !== "edit" || editItem?.id !== itemToSelect.id)
        ) {
          openEditModal(itemToSelect);
        } else if (
          action === "view" &&
          (formMode !== "view" || viewItem?.id !== itemToSelect.id)
        ) {
          openViewModal(itemToSelect);
        } else if (
          (action === "add_qty" || action === "restock") &&
          (formMode !== "add_qty" || editItem?.id !== itemToSelect.id)
        ) {
          openAddQtyPage(itemToSelect);
        }
      }
    }
  }, [searchParams, memoizedParts, parts]);
  const handleAddPart = async () => {
    try {
      const values = await partForm.validateFields();
      const partName = values.part_name;
      const minStockQty = Math.round(Number(values.min_stock_quantity || 0));
      const machineVal =
        values.machine && values.machine !== "common" ? values.machine : null;
      const spareId = values.spare_id || undefined;
      const itemCode = values.item_code || undefined;
      const unitVal = values.unit || "PCS";

      const batches =
        values.batches && values.batches.length > 0
          ? values.batches
          : [
              {
                batch_number: "BAT-01",
                stock_quantity: values.stock_quantity || 0,
                purchase_price: values.purchase_price || 0,
                purchase_date: values.purchase_date,
                bought_from: values.bought_from,
                remarks: values.remarks,
              },
            ];

      for (let i = 0; i < batches.length; i++) {
        const b = batches[i];
        const stockQty = Math.round(Number(b.stock_quantity || 0));
        const rate = Number(b.purchase_price || 0);
        const purchaseDate = formatDateValue(b.purchase_date);
        const batchNo =
          b.batch_number || `BAT-${String(i + 1).padStart(2, "0")}`;

        await addPart({
          spare_id: spareId,
          item_code: itemCode,
          part_name: partName,
          batch_number: batchNo,
          machine: machineVal,
          stock_quantity: stockQty,
          available_quantity: stockQty,
          used_quantity: 0,
          min_stock_quantity: minStockQty,
          unit: unitVal,
          purchase_date: purchaseDate,
          bought_from: b.bought_from || "",
          purchase_price: rate,
          remarks: b.remarks || values.remarks || "",
          created_by: username,
        }).unwrap();
      }

      message.success(
        `Inventory item added with ${batches.length} batch${batches.length > 1 ? "es" : ""}`
      );
      resetModal();
      refetchParts();
    } catch (err) {
      if (err.errorFields) return;
      message.error(getErrorMessage(err, "Failed to add inventory item"));
    }
  };
  const handleUpdatePart = async () => {
    if (!editItem?.id) return;
    try {
      const values = await partForm.validateFields();
      const partName = values.part_name;
      const allBatches = editItem.group_parts && editItem.group_parts.length > 0
        ? [...editItem.group_parts]
        : [editItem];
      const sortedBatches = sortPartsByFifo(allBatches);
      const latestPart = sortedBatches[sortedBatches.length - 1] || editItem;

      const rateToUse =
        values.purchase_price !== undefined && values.purchase_price !== null && values.purchase_price !== ""
          ? Number(values.purchase_price)
          : Number(latestPart.purchase_price || 0);
      const updatedUnit = values.unit || "PCS";
      const updatedMinStock = Math.round(
        Number(values.min_stock_quantity || 0),
      );

      if (sortedBatches.length > 1) {
        // Multi-batch update: Save each batch's specific edited available quantity and preserve its used quantity
        for (const p of sortedBatches) {
          const batchAvailKey = `batch_available_${p.id}`;
          const newAvailP = values[batchAvailKey] !== undefined
            ? Math.max(0, Math.round(Number(values[batchAvailKey])))
            : Math.round(Number(p.available_quantity || 0));
          const usedP = Math.round(Number(p.used_quantity || 0));
          const newStockP = newAvailP + usedP;

          await updatePart({
            id: p.id,
            body: {
              spare_id: values.spare_id || undefined,
              item_code: values.item_code || undefined,
              part_name: partName,
              machine: values.machine && values.machine !== "common" ? values.machine : null,
              stock_quantity: newStockP,
              available_quantity: newAvailP,
              used_quantity: usedP,
              min_stock_quantity: updatedMinStock,
              unit: updatedUnit,
              created_by: username,
              action: "Edited",
            },
          }).unwrap();
        }
      } else {
        // Single batch update
        const newAvail = Math.max(0, Math.round(Number(values.available_quantity || latestPart.available_quantity || 0)));
        const usedP = Math.round(Number(latestPart.used_quantity || 0));
        const newStock = newAvail + usedP;

        await updatePart({
          id: latestPart.id || editItem.id,
          body: {
            spare_id: values.spare_id || undefined,
            item_code: values.item_code || undefined,
            part_name: partName,
            machine: values.machine && values.machine !== "common" ? values.machine : null,
            stock_quantity: newStock,
            available_quantity: newAvail,
            used_quantity: usedP,
            min_stock_quantity: updatedMinStock,
            unit: updatedUnit,
            created_by: username,
            action: "Edited",
          },
        }).unwrap();
      }

      // If any new batches were added in the batch table while editing, save them
      if (values.batches && values.batches.length > 0) {
        for (let i = 0; i < values.batches.length; i++) {
          const b = values.batches[i];
          const qtyToAdd = Math.round(Number(b.stock_quantity || 0));
          if (qtyToAdd > 0) {
            const rate = Number(b.purchase_price || 0);
            const purchaseDate = formatDateValue(b.purchase_date) || dayjs().format("YYYY-MM-DD");
            const defaultBatchNo = `BAT-${String(allBatches.length + i + 1).padStart(2, "0")}`;
            const batchNumber = (b.batch_number || "").trim() || defaultBatchNo;

            // Check if a batch with the exact same batch_number already exists for this item
            const existingSameBatch = allBatches.find(
              (eb) => (eb.batch_number || "").trim().toLowerCase() === batchNumber.toLowerCase()
            );

            if (existingSameBatch) {
              const currentStock = Number(existingSameBatch.stock_quantity || 0);
              const currentAvail = Number(existingSameBatch.available_quantity || 0);
              const currentUsed = Number(existingSameBatch.used_quantity || 0);

              await updatePart({
                id: existingSameBatch.id,
                body: {
                  spare_id: values.spare_id || existingSameBatch.spare_id || undefined,
                  item_code: values.item_code || existingSameBatch.item_code || undefined,
                  part_name: partName,
                  batch_number: batchNumber,
                  machine: values.machine && values.machine !== "common" ? values.machine : null,
                  stock_quantity: currentStock + qtyToAdd,
                  available_quantity: currentAvail + qtyToAdd,
                  used_quantity: currentUsed,
                  min_stock_quantity: updatedMinStock,
                  unit: updatedUnit,
                  purchase_date: purchaseDate,
                  bought_from: b.bought_from || existingSameBatch.bought_from || "",
                  purchase_price: rate || Number(existingSameBatch.purchase_price || 0),
                  remarks: b.remarks || existingSameBatch.remarks || `Restocked +${qtyToAdd} into ${batchNumber}`,
                  action: "Restocked",
                  created_by: username,
                },
              }).unwrap();
            } else {
              await addPart({
                spare_id: values.spare_id || latestPart.spare_id || (latestPart.id ? `SP-${String(latestPart.id).padStart(3, "0")}` : "SP-001"),
                item_code: values.item_code || latestPart.item_code || values.spare_id || "ITEM-001",
                part_name: partName,
                batch_number: batchNumber,
                machine: values.machine && values.machine !== "common" ? values.machine : null,
                stock_quantity: qtyToAdd,
                available_quantity: qtyToAdd,
                used_quantity: 0,
                min_stock_quantity: updatedMinStock,
                unit: updatedUnit,
                purchase_date: purchaseDate,
                bought_from: b.bought_from || "",
                purchase_price: rate,
                remarks: b.remarks || `Added batch ${batchNumber} (+${qtyToAdd} ${updatedUnit})`,
                created_by: username,
                action: "Restocked",
              }).unwrap();
            }
          }
        }
      }

      message.success("Inventory item updated successfully");
      resetModal();
      refetchParts();
    } catch (err) {
      if (err.errorFields) return;
      message.error(getErrorMessage(err, "Failed to update inventory item"));
    }
  };
  const handleSaveAddQty = async () => {
    if (!editItem) return;
    try {
      const values = await partForm.validateFields();
      const allExisting = sortPartsByFifo(editItem.group_parts || [editItem]);
      const basePart = allExisting[0] || editItem;
      const itemName = editItem.item_name || editItem.part_name || values.part_name;
      const unitVal = basePart.unit || values.unit || "PCS";
      const minStockQty = Math.round(Number(basePart.min_stock_quantity || values.min_stock_quantity || 0));
      const machineVal = basePart.machine && basePart.machine !== "common" ? basePart.machine : (values.machine && values.machine !== "common" ? values.machine : null);
      const spareId = basePart.spare_id || values.spare_id || (basePart.id ? `SP-${String(basePart.id).padStart(3, "0")}` : "SP-001");
      const itemCode = basePart.item_code || values.item_code || spareId || "ITEM-001";

      const batches = values.batches && values.batches.length > 0 ? values.batches : [];
      if (batches.length === 0) {
        message.error("Please provide batch details to add quantity");
        return;
      }

      let totalAdded = 0;
      for (let i = 0; i < batches.length; i++) {
        const b = batches[i];
        const qtyToAdd = Math.round(Number(b.stock_quantity || 0));
        if (qtyToAdd <= 0) {
          message.error("Please enter a valid quantity greater than 0");
          return;
        }
        const rate = Number(b.purchase_price || 0);
        const purchaseDate = formatDateValue(b.purchase_date) || dayjs().format("YYYY-MM-DD");
        const defaultBatchNo = `BAT-${String(allExisting.length + i + 1).padStart(2, "0")}`;
        const batchNumber = (b.batch_number || "").trim() || defaultBatchNo;

        // Check if a batch with the exact same batch_number already exists for this item
        const existingSameBatch = allExisting.find(
          (eb) => (eb.batch_number || "").trim().toLowerCase() === batchNumber.toLowerCase()
        );

        if (existingSameBatch) {
          const currentStock = Number(existingSameBatch.stock_quantity || 0);
          const currentAvail = Number(existingSameBatch.available_quantity || 0);
          const currentUsed = Number(existingSameBatch.used_quantity || 0);

          await updatePart({
            id: existingSameBatch.id,
            body: {
              spare_id: existingSameBatch.spare_id || spareId,
              item_code: existingSameBatch.item_code || itemCode,
              part_name: itemName,
              batch_number: batchNumber,
              machine: machineVal,
              stock_quantity: currentStock + qtyToAdd,
              available_quantity: currentAvail + qtyToAdd,
              used_quantity: currentUsed,
              min_stock_quantity: minStockQty,
              unit: unitVal,
              purchase_date: purchaseDate,
              bought_from: b.bought_from || existingSameBatch.bought_from || "",
              purchase_price: rate || Number(existingSameBatch.purchase_price || 0),
              remarks: b.remarks || existingSameBatch.remarks || `Restocked +${qtyToAdd} into ${batchNumber}`,
              action: "Restocked",
              created_by: username,
            },
          }).unwrap();
        } else {
          await addPart({
            spare_id: spareId,
            item_code: itemCode,
            part_name: itemName,
            batch_number: batchNumber,
            machine: machineVal,
            stock_quantity: qtyToAdd,
            available_quantity: qtyToAdd,
            used_quantity: 0,
            min_stock_quantity: minStockQty,
            unit: unitVal,
            purchase_date: purchaseDate,
            bought_from: b.bought_from || "",
            purchase_price: rate,
            remarks: b.remarks || `Restocked batch ${batchNumber} +${qtyToAdd} ${unitVal}`,
            created_by: username,
            action: "Restocked",
          }).unwrap();
        }
        totalAdded += qtyToAdd;
      }

      message.success(`Restocked ${totalAdded} ${unitVal} for "${itemName}" successfully`);
      resetModal();
      refetchParts();
    } catch (err) {
      if (err.errorFields) return;
      message.error(getErrorMessage(err, "Failed to restock inventory item"));
    }
  };
  const openDeleteModal = (item) => {
    setDeleteItem(item);
    deleteForm.resetFields();
    setIsDeleteModalOpen(true);
  };
  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    try {
      const values = await deleteForm.validateFields();
      const itemName = deleteItem.item_name || deleteItem.part_name;
      const partsToDelete = deleteItem.group_parts || [deleteItem];
      for (const p of partsToDelete) {
        await deletePart({
          id: p.id,
          remarks: values.remarks,
          user: username,
        }).unwrap();
      }
      message.success(`Item "${itemName}" deleted and recorded in history`);
      setIsDeleteModalOpen(false);
      setDeleteItem(null);
      deleteForm.resetFields();
      refetchParts();
    } catch (err) {
      if (err.errorFields) return;
      message.error(getErrorMessage(err, "Delete failed"));
    }
  };

  const handleDeleteExistingBatch = async (batch) => {
    if (!batch?.id) return;
    const batchNo = batch.batch_number || `BAT-${batch.id}`;
    const itemName = batch.part_name || editItem?.item_name || editItem?.part_name || "Item";
    try {
      await deletePart({
        id: batch.id,
        remarks: `Deleted batch ${batchNo} from ${itemName} via Edit form`,
        user: username,
      }).unwrap();
      message.success(`Batch "${batchNo}" deleted successfully`);

      const currentGroup = editItem?.group_parts && editItem.group_parts.length > 0
        ? editItem.group_parts
        : editItem ? [editItem] : [];
      const remainingBatches = currentGroup.filter((b) => b.id !== batch.id);

      if (remainingBatches.length === 0) {
        resetModal();
      } else {
        const updatedEditItem = {
          ...editItem,
          ...remainingBatches[0],
          group_parts: remainingBatches,
          available_quantity: remainingBatches.reduce((acc, b) => acc + Number(b.available_quantity || 0), 0),
          stock_quantity: remainingBatches.reduce((acc, b) => acc + Number(b.stock_quantity || 0), 0),
          used_quantity: remainingBatches.reduce((acc, b) => acc + Number(b.used_quantity || 0), 0),
        };
        setEditItem(updatedEditItem);
      }
      refetchParts();
    } catch (err) {
      message.error(getErrorMessage(err, `Failed to delete batch ${batchNo}`));
    }
  };

  const openAddQtyModal = (item) => {
    setAddQtyItem(item);
    addQtyForm.resetFields();
    setIsAddQtyModalOpen(true);
  };
  const handleConfirmAddQuantity = async () => {
    if (!addQtyItem) return;
    try {
      const values = await addQtyForm.validateFields();
      const qtyToAdd = Number(values.add_quantity || 0);
      const allExisting = sortPartsByFifo(addQtyItem.group_parts || [addQtyItem]);
      const basePart = allExisting[0] || addQtyItem;
      const itemName = addQtyItem.item_name || addQtyItem.part_name;
      const rateToUse =
        values.rate_type === "new" ||
          (values.new_rate !== undefined &&
            values.new_rate !== null &&
            values.new_rate !== "")
          ? Number(values.new_rate)
          : Number(values.selected_rate ?? basePart.purchase_price ?? 0);

      const existingBatchesCount = allExisting.length || 1;
      const batchNumber = (values.batch_number || "").trim() || `BAT-${String(existingBatchesCount + 1).padStart(2, "0")}`;
      const inwardDate = formatDateValue(values.purchase_date) || dayjs().format("YYYY-MM-DD");

      // Check if a batch with the exact same batch_number already exists for this item
      const existingSameBatch = allExisting.find(
        (b) => (b.batch_number || "").trim().toLowerCase() === batchNumber.toLowerCase()
      );

      if (existingSameBatch) {
        // Add quantity to existing batch
        const currentStock = Number(existingSameBatch.stock_quantity || 0);
        const currentAvail = Number(existingSameBatch.available_quantity || 0);
        const currentUsed = Number(existingSameBatch.used_quantity || 0);

        await updatePart({
          id: existingSameBatch.id,
          body: {
            spare_id: existingSameBatch.spare_id || undefined,
            item_code: existingSameBatch.item_code || undefined,
            part_name: itemName,
            batch_number: batchNumber,
            machine: existingSameBatch.machine && existingSameBatch.machine !== "common" ? existingSameBatch.machine : null,
            stock_quantity: currentStock + qtyToAdd,
            available_quantity: currentAvail + qtyToAdd,
            used_quantity: currentUsed,
            min_stock_quantity: existingSameBatch.min_stock_quantity ? Number(existingSameBatch.min_stock_quantity) : 0,
            unit: existingSameBatch.unit || "PCS",
            purchase_date: inwardDate,
            bought_from: values.bought_from || existingSameBatch.bought_from || "",
            purchase_price: rateToUse,
            remarks: values.remarks || `Restocked +${qtyToAdd} into ${batchNumber}`,
            action: "Restocked",
            created_by: username,
          },
        }).unwrap();
      } else {
        // Create new batch record
        await addPart({
          spare_id: basePart.spare_id || (basePart.id ? `SP-${String(basePart.id).padStart(3, "0")}` : "SP-001"),
          item_code: basePart.item_code || basePart.spare_id || "ITEM-001",
          part_name: itemName,
          batch_number: batchNumber,
          machine: basePart.machine && basePart.machine !== "common" ? basePart.machine : null,
          stock_quantity: qtyToAdd,
          available_quantity: qtyToAdd,
          used_quantity: 0,
          min_stock_quantity: basePart.min_stock_quantity
            ? Number(basePart.min_stock_quantity)
            : 0,
          unit: basePart.unit || "PCS",
          purchase_date: inwardDate,
          bought_from: values.bought_from || basePart.bought_from || "",
          purchase_price: rateToUse,
          remarks:
            values.remarks ||
            `Restocked batch ${batchNumber} +${qtyToAdd} ${basePart.unit || "PCS"}`,
          created_by: username,
          action: "Restocked",
        }).unwrap();
      }

      message.success(
        `Restocked ${qtyToAdd} ${basePart.unit || "PCS"} (${batchNumber}) for "${itemName}"`,
      );
      setIsAddQtyModalOpen(false);
      setAddQtyItem(null);
      addQtyForm.resetFields();
      await refetchParts();
    } catch (err) {
      if (err.errorFields) return;
      message.error(getErrorMessage(err, "Failed to add stock quantity"));
    }
  };

  const usageTypeOptions = useMemo(() => {
    const fromDb = dbUsageTypes
      .map((u) => u.name)
      .filter((name) => name && name !== "Other");
    const combined = Array.from(new Set([...presetUsageTypes, ...fromDb]));
    return [...combined, "Other"];
  }, [dbUsageTypes]);

  const openUsageModal = () => {
    setSearchParams({ action: "use_parts" });
    usageForm.resetFields();
    usageForm.setFieldValue("used_date", dayjs());
    usageForm.setFieldValue("use_new_quantity", "auto");
    setCustomUsageTypeVisible(false);
    setFormMode("use_parts");
  };

  const handleSaveUsage = async () => {
    try {
      const values = await usageForm.validateFields();
      const selectedPart = parts.find((p) => p.id === values.part);
      if (!selectedPart) return;

      const matchedParts = getMatchedPartBatches(parts, selectedPart);
      const selectedMachine = machines.find((m) => m.id === values.machine);
      const machineVal =
        values.machine && values.machine !== "common" ? values.machine : null;
      const machineNameVal = selectedMachine
        ? selectedMachine.machine_name
        : "Others";

      const formattedUsedDate = values.used_date
        ? values.used_date.format("YYYY-MM-DD")
        : dayjs().format("YYYY-MM-DD");

      const formattedUsedHours = values.used_hours
        ? typeof values.used_hours === "string"
          ? values.used_hours
          : values.used_hours.format("HH:mm")
        : "00:00";

      // Check for multi-batch allocation inputs
      const batchAllocations = values.batch_allocations || {};
      const activeAllocations = Object.entries(batchAllocations)
        .map(([bId, qty]) => ({
          batchId: Number(bId),
          qty: Math.round(Number(qty || 0)),
        }))
        .filter((a) => a.qty > 0);

      if (activeAllocations.length > 0) {
        // Validate each allocation against individual batch stock
        for (const alloc of activeAllocations) {
          const batch = matchedParts.find((b) => b.id === alloc.batchId);
          if (!batch) continue;
          const avail = Number(batch.available_quantity || 0);
          if (alloc.qty > avail) {
            const batchNo = batch.batch_number || `BAT-${batch.id}`;
            message.error(
              `Cannot deduct ${alloc.qty}. Only ${avail} available in Batch ${batchNo}.`,
            );
            return;
          }
        }

        // Submit usage deduction for each allocated batch
        for (const alloc of activeAllocations) {
          const batch = matchedParts.find((b) => b.id === alloc.batchId);
          const payload = {
            part: alloc.batchId,
            batch_id: alloc.batchId,
            machine: machineVal,
            machine_name: machineNameVal,
            used_quantity: alloc.qty,
            used_by: values.used_by || username,
            used_hours: formattedUsedHours,
            used_date: formattedUsedDate,
            remarks: values.remarks,
            use_new_quantity: false,
            is_exact_batch: true,
            created_by: username,
          };
          await addUsage(payload).unwrap();
        }

        message.success(
          `Parts usage logged across ${activeAllocations.length} batch${activeAllocations.length > 1 ? "es" : ""}`,
        );
        resetModal();
        refetchParts();
        return;
      }

      // Single batch or auto FIFO fallback
      const requestedQty = Number(values.used_quantity || 0);
      if (requestedQty <= 0) {
        message.error("Please enter a quantity to use");
        return;
      }

      const isAuto =
        values.use_new_quantity === "auto" ||
        values.use_new_quantity === undefined;
      const isExactBatch = !isAuto;

      let batchPart = matchedParts[0] || selectedPart;
      if (!isAuto) {
        if (
          typeof values.use_new_quantity === "number" ||
          (typeof values.use_new_quantity === "string" &&
            !isNaN(Number(values.use_new_quantity)))
        ) {
          batchPart =
            matchedParts.find((b) => b.id === Number(values.use_new_quantity)) ||
            batchPart;
        } else if (values.use_new_quantity === true) {
          batchPart = matchedParts[matchedParts.length - 1] || batchPart;
        }
      }

      if (isAuto) {
        const totalAvailable = matchedParts.reduce(
          (sum, p) => sum + Number(p.available_quantity || 0),
          0,
        );
        if (requestedQty > totalAvailable) {
          message.error(
            `Cannot log usage of ${requestedQty}. Only ${totalAvailable} ${selectedPart.unit || "pcs"} available in total stock.`,
          );
          return;
        }
      } else {
        const availableQty = Number(batchPart.available_quantity || 0);
        if (requestedQty > availableQty) {
          const batchLabel = batchPart.batch_number
            ? `Batch ${batchPart.batch_number}`
            : "selected batch";
          message.error(
            `Cannot log usage of ${requestedQty}. Only ${availableQty} ${batchPart.unit || "pcs"} available in ${batchLabel}.`,
          );
          return;
        }
      }

      const payload = {
        part: batchPart.id,
        batch_id: isExactBatch ? batchPart.id : undefined,
        machine: machineVal,
        machine_name: machineNameVal,
        used_quantity: requestedQty,
        used_by: values.used_by || username,
        used_hours: formattedUsedHours,
        used_date: formattedUsedDate,
        remarks: values.remarks,
        use_new_quantity: isAuto ? false : !values.use_new_quantity,
        is_exact_batch: isExactBatch,
        created_by: username,
      };

      await addUsage(payload).unwrap();
      message.success("Parts usage logged successfully");
      resetModal();
      refetchParts();
    } catch (err) {
      if (err.errorFields) return;
      message.error(getErrorMessage(err, "Failed to save parts usage record"));
    }
  };

  if (
    formMode === "use_parts" ||
    formMode === "edit_usage" ||
    formMode === "view_usage"
  ) {
    return (
      <PartsUsageFormPage
        mode={formMode}
        item={editItem || viewItem}
        form={usageForm}
        parts={parts}
        machineOptions={machineOptions}
        onBack={resetModal}
        onFinish={handleSaveUsage}
      />
    );
  }

  if (formMode) {
    return (
      <InventoryFormPage
        mode={formMode}
        item={formMode === "view" ? viewItem : editItem}
        editItem={editItem}
        form={partForm}
        machineOptions={machineOptions}
        existingParts={parts}
        onBack={resetModal}
        onEdit={(item) => openEditModal(item || viewItem)}
        onDeleteExistingBatch={handleDeleteExistingBatch}
        onFinish={formMode === "add_qty" ? handleSaveAddQty : formMode === "edit" ? handleUpdatePart : handleAddPart}
      />
    );
  }

  return (
    <div className="flex flex-col w-full gap-2.5">
      <PageHeader
        title="Inventory Dashboard"
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={openUsageModal}
              icon="lucide:wrench"
              color="amber"
              size="xs"
            >
              Use Parts
            </Button>
            <Button
              onClick={openAddModal}
              icon="lucide:plus"
              color="blue"
              size="xs"
            >
              Add Inventory
            </Button>
          </div>
        }
      />

      <InventoryGrid
        rowData={memoizedParts}
        isLoading={isLoading}
        isAdmin={isAdmin}
        onAddQty={openAddQtyPage}
        onView={openViewModal}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      />

      <DeletePartModal
        isOpen={isDeleteModalOpen}
        item={deleteItem}
        form={deleteForm}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeleteItem(null);
          deleteForm.resetFields();
        }}
        onConfirm={handleConfirmDelete}
      />

      <AddQuantityModal
        isOpen={isAddQtyModalOpen}
        item={addQtyItem}
        form={addQtyForm}
        onCancel={() => {
          setIsAddQtyModalOpen(false);
          setAddQtyItem(null);
          addQtyForm.resetFields();
        }}
        onConfirm={handleConfirmAddQuantity}
      />
    </div>
  );
};
export default InventoryListTab;
