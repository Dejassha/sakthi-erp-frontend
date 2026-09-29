import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import baseQuery from "./baseQuery";
import inwardReducer from "./slices/inwardSlice";
import programerReducer from "./slices/programerSlice";

export const store = configureStore({
  reducer: {
    // Add the generated reducer as a specific top-level slice
    [baseQuery.reducerPath]: baseQuery.reducer,
    inward: inwardReducer,
    programer: programerReducer,
  },
  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of `rtk-query`.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseQuery.middleware),
});
// optional, but required for refetchOnFocus/refetchOnReconnect behaviors
// see `setupListeners` docs - takes an optional callback as the 2nd arg for customization
setupListeners(store.dispatch);
