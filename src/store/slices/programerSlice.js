import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  step: 1,
};

export const programerSlice = createSlice({
  name: "programer",
  initialState,
  reducers: {
    setStep: (state, action) => {
      state.step = action.payload;
    },
    nextStep: (state) => {
      if (state.step < 2) {
        state.step += 1;
      }
    },
    prevStep: (state) => {
      if (state.step > 1) {
        state.step -= 1;
      }
    },
    resetProgramerStep: (state) => {
      state.step = 1;
    },
  },
});

export const { setStep, nextStep, prevStep, resetProgramerStep } =
  programerSlice.actions;

export default programerSlice.reducer;
