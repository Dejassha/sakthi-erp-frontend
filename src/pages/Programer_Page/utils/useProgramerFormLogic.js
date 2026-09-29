import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";

// antd
import { Form, message } from "antd";

// RTK Query
import { useAddProgramerDetailsMutation } from "@/store/services/programer.api";

// Redux Slice
import { setStep, resetProgramerStep } from "@/store/slices/programerSlice";

// Pure Helper Utilities
const getTodayDate = () => new Date().toISOString().split("T")[0];

const toNum = (v) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const round3 = (v) => Math.round(v * 1e3) / 1e3;

/**
 * Calculates aggregate totals for programmer inputs.
 *
 * @param {Object} data - Form field key-value map
 * @returns {Object} Calculated metrics including total hours, meters, piercing, weight, and sheets
 */
const calculateProgrammerTotals = (data) => {
  const processedQty = toNum(data.processed_quantity);
  const minsPerSheet = toNum(data.processed_mins_per_sheet);
  const cutLength = toNum(data.cut_length_per_sheet);
  const piercePerSheet = toNum(data.pierce_per_sheet);
  const usedWeight = toNum(data.used_weight);
  const numSheets = toNum(data.number_of_sheets);

  const totalMinutes = Math.round(processedQty * minsPerSheet);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const totalPlannedHours = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  const totalMeters = round3(
    processedQty < 1 ? cutLength : processedQty * cutLength,
  );
  const totalPiercing = round3(processedQty * piercePerSheet);
  const totalWeight = round3(processedQty * usedWeight);
  const totalNoSheets = round3(processedQty * numSheets);

  return {
    total_planned_hours: totalPlannedHours,
    total_meters: totalMeters,
    total_piercing: totalPiercing,
    total_used_weight: totalWeight,
    total_no_of_sheets: totalNoSheets,
  };
};

/**
 * Custom Hook for Programmer Form Logic and Validation.
 * Manages step navigation, dynamic calculations, field validations, and API mutations.
 *
 * @param {Object} params
 * @param {Object} params.item - Selected product object
 * @param {Array} params.materials - Available materials list
 * @param {Function} params.onBack - Callback triggered on initial step back
 * @param {Function} params.onSuccess - Callback triggered after successful form submission
 */
export const useProgramerFormLogic = ({
  item,
  materials = [],
  onBack,
  onSuccess,
}) => {
  const dispatch = useDispatch();
  const currentStep = useSelector((state) => state.programer.step);
  const [searchParams, setSearchParams] = useSearchParams();

  const [form] = Form.useForm();
  const product_id = item?.id;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addProgramerDetails, { isLoading: isSubmitting }] =
    useAddProgramerDetailsMutation();

  const changeStep = useCallback(
    (targetStep) => {
      dispatch(setStep(targetStep));
      setSearchParams({ step: targetStep }, { replace: true });
    },
    [dispatch, setSearchParams],
  );

  // Synchronize URL query param `?step=N` with Redux step state with Step 1 Guard
  useEffect(() => {
    const rawStep = parseInt(searchParams.get("step"), 10);
    const materialDetails = form.getFieldValue("material_details");
    const programNo = form.getFieldValue("program_no");

    if (rawStep === 2) {
      // Guard: Cannot access Step 2 directly without Step 1 required fields
      if (!materialDetails || !programNo) {
        changeStep(1);
        return;
      }
      if (currentStep !== 2) {
        dispatch(setStep(2));
      }
    } else if (rawStep === 1) {
      if (currentStep !== 1) {
        dispatch(setStep(1));
      }
    } else {
      setSearchParams({ step: currentStep || 1 }, { replace: true });
    }
  }, [dispatch, searchParams, setSearchParams, currentStep, form, changeStep]);

  /**
   * Initializes form fields when a material is selected
   */
  const handleMaterialUpdate = useCallback(
    (materialId) => {
      if (!materialId) return;
      const selectedMat = materials.find((m) => m.id === Number(materialId));
      if (!selectedMat) return;
      const qty = toNum(selectedMat.quantity);
      const totalWidth = round3(toNum(selectedMat.width) * qty);
      const totalLength = round3(toNum(selectedMat.length) * qty);

      form.setFieldsValue({
        material_details: selectedMat.id,
        processed_quantity: null,
        balance_quantity: qty,
        processed_width: null,
        processed_length: null,
        remaining_width: totalWidth,
        remaining_length: totalLength,
        used_weight: null,
        total_used_weight: 0,
        number_of_sheets: null,
        total_no_of_sheets: 0,
        cut_length_per_sheet: null,
        total_meters: 0,
        pierce_per_sheet: null,
        total_piercing: 0,
        processed_mins_per_sheet: null,
        total_planned_hours: "00:00",
      });
    },
    [materials, form],
  );

  // Set default product ID and today's date on load
  useEffect(() => {
    if (product_id) {
      form.setFieldsValue({
        product_details: product_id,
        program_date: getTodayDate(),
      });
    }
  }, [product_id, form]);

  // Auto-select material if only one pending material exists
  useEffect(() => {
    const pendingMaterials = materials.filter(
      (m) => m.programer_status?.toLowerCase() === "pending",
    );
    if (
      pendingMaterials.length === 1 &&
      !form.getFieldValue("material_details")
    ) {
      handleMaterialUpdate(pendingMaterials[0].id);
    }
  }, [materials, form, handleMaterialUpdate]);

  /**
   * Handles real-time form value changes and triggers metric calculations
   */
  const handleChange = (changed, all) => {
    const name = Object.keys(changed)[0];
    const value = changed[name];

    if (name === "material_details") {
      handleMaterialUpdate(value);
      return;
    }

    const materialId = form.getFieldValue("material_details");
    if (!materialId) return;

    if (name === "processed_quantity") {
      const processed = toNum(value);
      const selectedMat = materials.find((m) => m.id === Number(materialId));
      if (selectedMat) {
        const availableQty = toNum(selectedMat.quantity);
        const balance = Math.max(0, round3(availableQty - processed));
        form.setFieldsValue({ balance_quantity: balance });
      }
    }

    const mergedData = { ...all, ...changed };
    const totals = calculateProgrammerTotals(mergedData);

    // Dynamic recalculation of remaining dimensions based on processed width/length and quantity
    const dynamicFields = {};
    const selectedMat = materials.find((m) => m.id === Number(materialId));
    if (selectedMat) {
      const processedQty = toNum(mergedData.processed_quantity);
      const processedW = toNum(mergedData.processed_width);
      const processedL = toNum(mergedData.processed_length);

      // Remaining Width: (Material W * Material Qty) - (Processed W * Processed Qty)
      const totalW = round3(
        toNum(selectedMat.width) * toNum(selectedMat.quantity),
      );
      const actualProcessedW = round3(processedW * processedQty);
      dynamicFields.remaining_width = Math.max(
        0,
        round3(totalW - actualProcessedW),
      );

      // Remaining Length: (Material L * Material Qty) - (Processed L * Processed Qty)
      const totalL = round3(
        toNum(selectedMat.length) * toNum(selectedMat.quantity),
      );
      const actualProcessedL = round3(processedL * processedQty);
      dynamicFields.remaining_length = Math.max(
        0,
        round3(totalL - actualProcessedL),
      );
    }

    form.setFieldsValue({ ...totals, ...dynamicFields });
  };

  /**
   * Validates step 1 fields before advancing
   */
  const handleNext = async () => {
    try {
      await form.validateFields([
        "material_details",
        "program_no",
        "program_date",
      ]);
      changeStep(2);
    } catch {
      message.error("Please fill all required fields in Step 1");
    }
  };

  /**
   * Handles step regression or back-navigation
   */
  const handleBack = () => {
    if (currentStep === 1) {
      dispatch(resetProgramerStep());
      onBack?.(item);
    } else {
      changeStep(1);
    }
  };

  /**
   * Executes API submission payload creation and error handling
   */
  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue(true);

      if (
        !values.material_details ||
        !values.program_no ||
        !values.program_date
      ) {
        message.error("Step 1 details are missing. Redirecting to Step 1.");
        changeStep(1);
        setConfirmOpen(false);
        return;
      }

      const stored = localStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : null;
      const createdBy = user?.username;

      const selectedMat = materials.find(
        (m) => m.id === Number(values.material_details),
      );

      const payload = {
        ...values,
        material_id: values.material_details,
        processed_quantity: toNum(values.processed_quantity),
        balance_quantity: toNum(values.balance_quantity),
        used_weight: toNum(values.used_weight),
        total_used_weight: toNum(values.total_used_weight),
        number_of_sheets: toNum(values.number_of_sheets),
        total_no_of_sheets: toNum(values.total_no_of_sheets),
        processed_width:
          toNum(values.balance_quantity) === 0
            ? toNum(selectedMat?.total_width)
            : toNum(values.processed_width),
        processed_length:
          toNum(values.balance_quantity) === 0
            ? toNum(selectedMat?.total_length)
            : toNum(values.processed_length),
        remaining_width:
          toNum(values.balance_quantity) === 0
            ? 0
            : toNum(values.remaining_width),
        remaining_length:
          toNum(values.balance_quantity) === 0
            ? 0
            : toNum(values.remaining_length),
        cut_length_per_sheet: toNum(values.cut_length_per_sheet),
        total_meters: toNum(values.total_meters),
        pierce_per_sheet: toNum(values.pierce_per_sheet),
        total_piercing: toNum(values.total_piercing),
        processed_mins_per_sheet: toNum(values.processed_mins_per_sheet),
        created_by: createdBy,
      };

      const response = await addProgramerDetails(payload).unwrap();
      message.success("Programer details added successfully");

      dispatch(resetProgramerStep());

      const updatedItem = item
        ? {
          ...item,
          programer_status:
            response.programer_status || item.programer_status,
        }
        : item;

      onSuccess?.(updatedItem);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error("Something went wrong. Please try again.");
      }
    } finally {
      setConfirmOpen(false);
    }
  };

  /**
   * Field Validators
   */
  const validateProcessedQuantity = (_, value) => {
    const materialId = form.getFieldValue("material_details");
    if (!materialId || value === null || value === undefined || value === "")
      return Promise.resolve();
    const selectedMat = materials.find((m) => m.id === Number(materialId));
    if (!selectedMat) return Promise.resolve();

    const available = toNum(selectedMat.quantity);
    if (toNum(value) > available) {
      return Promise.reject(new Error(`Max: ${available}`));
    }
    return Promise.resolve();
  };

  const validateProcessedWidth = (_, value) => {
    const materialId = form.getFieldValue("material_details");
    if (!materialId || value === null || value === undefined || value === "")
      return Promise.resolve();
    const selectedMat = materials.find((m) => m.id === Number(materialId));
    if (!selectedMat) return Promise.resolve();

    const maxW = round3(toNum(selectedMat.width) * toNum(selectedMat.quantity));
    const processedQty = toNum(form.getFieldValue("processed_quantity"));
    const totalAttemptedW = round3(toNum(value) * processedQty);

    if (totalAttemptedW > maxW) {
      return Promise.reject(
        new Error(
          `Total processed width (${totalAttemptedW} = ${toNum(value)} × ${processedQty} Qty) exceeds available width (${maxW})`,
        ),
      );
    }
    return Promise.resolve();
  };

  const validateProcessedLength = (_, value) => {
    const materialId = form.getFieldValue("material_details");
    if (!materialId || value === null || value === undefined || value === "")
      return Promise.resolve();
    const selectedMat = materials.find((m) => m.id === Number(materialId));
    if (!selectedMat) return Promise.resolve();

    const maxL = round3(
      toNum(selectedMat.length) * toNum(selectedMat.quantity),
    );
    const processedQty = toNum(form.getFieldValue("processed_quantity"));
    const totalAttemptedL = round3(toNum(value) * processedQty);

    if (totalAttemptedL > maxL) {
      return Promise.reject(
        new Error(
          `Total processed length (${totalAttemptedL} = ${toNum(value)} × ${processedQty} Qty) exceeds available length (${maxL})`,
        ),
      );
    }
    return Promise.resolve();
  };

  const validateNonNegative = (_, value) => {
    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      Number(value) <= 0
    ) {
      return Promise.reject(new Error("Must be greater than 0"));
    }
    return Promise.resolve();
  };

  return {
    currentStep,
    changeStep,
    form,
    confirmOpen,
    setConfirmOpen,
    isSubmitting,
    handleChange,
    handleNext,
    handleBack,
    handleSubmit,
    validateProcessedQuantity,
    validateProcessedWidth,
    validateProcessedLength,
    validateNonNegative,
  };
};