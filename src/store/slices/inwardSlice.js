import { createSlice } from "@reduxjs/toolkit";

export const initialMaterialRow = {
  uid_no: "",
  heat_no: "",
  mat_type: null,
  mat_grade: "",
  bay: "",
  thick: null,
  width: null,
  length: null,
  density: null,
  unit_weight: null,
  quantity: null,
  total_weight: null,
  stock_due: "",
  remarks: "",
};

export const initialFormData = {
  inward_slip_number: "",
  sheet_type: "jobcard",
  worker_no: "",
  company_name: "",
  customer_name: "",
  customer_dc_no: "",
  contact_no: "",
  job_type: "",
  materials: [{ ...initialMaterialRow }],
};

const initialState = {
  step: 1,
  formData: initialFormData,
};

export const inwardSlice = createSlice({
  name: "inward",
  initialState,
  reducers: {
    setStep: (state, action) => {
      state.step = action.payload;
    },
    nextStep: (state) => {
      if (state.step < 3) {
        state.step += 1;
      }
    },
    prevStep: (state) => {
      if (state.step > 1) {
        state.step -= 1;
      }
    },
    setFormData: (state, action) => {
      if (typeof action.payload === "function") {
        state.formData = action.payload(state.formData);
      } else {
        state.formData = { ...state.formData, ...action.payload };
      }
    },
    updateMaterials: (state, action) => {
      state.formData.materials = action.payload;
    },
    addMaterialRow: (state) => {
      state.formData.materials.push({ ...initialMaterialRow });
    },
    removeMaterialRow: (state, action) => {
      if (state.formData.materials.length > 1) {
        state.formData.materials.splice(action.payload, 1);
      }
    },
    resetInwardForm: (state) => {
      state.step = 1;
      state.formData = {
        inward_slip_number: "",
        sheet_type: "jobcard",
        worker_no: "",
        company_name: "",
        customer_name: "",
        customer_dc_no: "",
        contact_no: "",
        job_type: "",
        materials: [{ ...initialMaterialRow }],
      };
    },
  },
});

export const {
  setStep,
  nextStep,
  prevStep,
  setFormData,
  updateMaterials,
  addMaterialRow,
  removeMaterialRow,
  resetInwardForm,
} = inwardSlice.actions;

export default inwardSlice.reducer;
