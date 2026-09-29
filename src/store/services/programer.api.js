import baseQuery from "../baseQuery";
export const inwardApi = baseQuery.injectEndpoints({
  endpoints: (builder) => ({
    // For Getting Programer Details
    getProgramerDetails: builder.query({
      query: () => "api/get_programer_Details/",
      providesTags: ["Programer"],
    }),
    // For Adding Programer Details
    addProgramerDetails: builder.mutation({
      query: (body) => ({
        url: "api/add_programer_Details/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Programer", "Inward"],
    }),
    // For Creating Pending Material
    createPendingMaterial: builder.mutation({
      query: (body) => ({
        url: "api/create_pending_material/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Programer", "Inward"],
    }),
    getProgramerDetailsByMaterial: builder.query({
      query: ({ material_id }) =>
        `api/get_programer_Details/?material_id=${material_id}`,
      providesTags: ["Programer"],
    }),
    updateProgramerDetails: builder.mutation({
      query: ({ body }) => ({
        url: `api/update_programer_details/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Inward"],
    }),
  }),
});
export const {
  useGetProgramerDetailsQuery,
  useAddProgramerDetailsMutation,
  useCreatePendingMaterialMutation,
  useGetProgramerDetailsByMaterialQuery,
  useUpdateProgramerDetailsMutation,
} = inwardApi;
