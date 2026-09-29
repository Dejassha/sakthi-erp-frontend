import { useState, useEffect, useMemo } from "react";
import { Form, message } from "antd";
import dayjs from "dayjs";
// RTK Query
import { useGetMaterialsByProductQuery } from "@/store/services/utility.api";
import { useAddQaDetailsMutation } from "@/store/services/qa.api";
import {
  useGetMachinesQuery,
  useGetOperatorsQuery,
} from "@/store/services/admin.api";

/**
 * Helper to convert minutes into HH:MM formatted string
 */
const formatToHoursMinutes = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

/**
 * Calculates runtime difference between start and end HH:mm strings
 */
const calculateRuntime = (start, end) => {
  if (!start || !end) return "";
  const startTime = dayjs(start, "HH:mm");
  const endTime = dayjs(end, "HH:mm");
  if (!startTime.isValid() || !endTime.isValid()) return "";
  let diff = endTime.diff(startTime, "minute");
  if (diff < 0) diff += 24 * 60; // Handle midnight crossover
  return formatToHoursMinutes(diff);
};

/**
 * Custom Hook for QA Form logic, machine logs, validation, and API mutation.
 */
export const useQaFormLogic = (product, initialData, onBack, onSuccess) => {
  const [form] = Form.useForm();
  const productId = product?.id ?? 0;
  const companyName = product?.company_name || "";

  // Support 3 or 4 parameter signatures seamlessly
  const callbackOnSuccess = typeof initialData === "function" ? initialData : onSuccess;

  const [machineTimes, setMachineTimes] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);

  // RTK Query
  const { data: machineData = [] } = useGetMachinesQuery(undefined);
  const { data: operatorData = [] } = useGetOperatorsQuery(undefined);
  const { data: materials = [], refetch: refetchMaterials } =
    useGetMaterialsByProductQuery(productId, { skip: !productId });
  const [addQaDetails, { isLoading: isSubmitting }] = useAddQaDetailsMutation();

  const operators = useMemo(
    () => operatorData.map((op) => op.operator_name),
    [operatorData],
  );

  const machines = useMemo(() => {
    const seen = new Set();
    return machineData.filter((m) => {
      const name = String(m.machine_name || "")
        .trim()
        .toLowerCase();
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [machineData]);

  const pendingMaterials = useMemo(() => {
    return materials.filter(
      (m) =>
        String(m.programer_status).toLowerCase() === "completed" &&
        String(m.qa_status).toLowerCase() === "pending",
    );
  }, [materials]);

  // Auto-select material if only one pending material exists
  useEffect(() => {
    if (pendingMaterials.length === 1) {
      const matId = pendingMaterials[0]?.id;
      if (matId && !form.getFieldValue("material_details")) {
        form.setFieldValue("material_details", matId.toString());
      }
    }
  }, [pendingMaterials, form]);

  const toggleMachine = (machineName, checked) => {
    const machineInfo = machines.find((m) => m.machine_name === machineName);
    const requiresAir = machineInfo?.does_need_gas ?? false;

    if (checked) {
      setMachineTimes((prev) => [
        ...prev,
        {
          machine_name: machineName,
          date: dayjs().format("YYYY-MM-DD"),
          start: "",
          end: "",
          runtime: "",
          gas_type: requiresAir ? "Air" : undefined,
          operator_name: "",
        },
      ]);
    } else {
      setMachineTimes((prev) =>
        prev.filter((m) => m.machine_name !== machineName),
      );
    }
    setFormErrors((prev) => ({ ...prev, machines: "" }));
  };

  const updateMachineField = (machineName, field, value) => {
    setMachineTimes((prev) =>
      prev.map((m) => {
        if (m.machine_name !== machineName) return m;
        const updated = { ...m, [field]: value };
        if (
          (field === "start" || field === "end") &&
          updated.start &&
          updated.end
        ) {
          updated.runtime = calculateRuntime(updated.start, updated.end);
        }
        return updated;
      }),
    );
  };

  const validateForm = () => {
    const newErr = {};
    let errorMsg = null;

    if (machineTimes.length === 0) {
      errorMsg = "Select at least one machine";
      newErr.machines = errorMsg;
    } else {
      const incomplete = machineTimes.some(
        (m) => !m.date || !m.operator_name || !m.runtime,
      );
      if (incomplete) {
        errorMsg = "Please complete all details for selected machines";
        newErr.machines = errorMsg;
      }
    }
    setFormErrors(newErr);
    return errorMsg;
  };

  const handleSubmit = async () => {
    try {
      const machineError = validateForm();
      if (machineError) {
        message.error(machineError);
        return;
      }

      await form.validateFields();
      const values = form.getFieldsValue();
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const payload = {
        material_id: Number(values.material_details),
        processed_date: values.processed_date?.format("YYYY-MM-DD"),
        shift: values.shift,
        machines_used: machineTimes,
        created_by: user?.username,
      };

      await addQaDetails(payload).unwrap();
      message.success("QA details saved successfully.");
      refetchMaterials();
      callbackOnSuccess?.(product);
    } catch (err) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      message.error(
        err?.data?.message || err?.message || "Submission Failed",
      );
    } finally {
      setShowConfirm(false);
    }
  };

  return {
    form,
    companyName,
    machineTimes,
    formErrors,
    showConfirm,
    setShowConfirm,
    isSubmitting,
    machines,
    operators,
    pendingMaterials,
    toggleMachine,
    updateMachineField,
    handleSubmit,
    validateForm,
  };
};
