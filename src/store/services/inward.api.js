import baseQuery from "../baseQuery";
export const inwardApi = baseQuery.injectEndpoints({
  endpoints: (builder) => ({
    // For Getting Companies
    getCompanies: builder.query({
      query: () => "api/get_companies/",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Inward", id })),
              { type: "Inward", id: "LIST" },
            ]
          : [{ type: "Inward", id: "LIST" }],
    }),
    // For Checking Duplicate Slip Number
    checkSlipNumber: builder.query({
      query: (slip_number) =>
        `api/check_slip_number/?slip_number=${slip_number}`,
      providesTags: (result) =>
        result
          ? [{ type: "Inward", id: "LIST" }]
          : [{ type: "Inward", id: "LIST" }],
    }),
    // For Getting Latest Slip Number
    getLatestSlipNumber: builder.query({
      query: () => `api/get_latest_slip_number/`,
      providesTags: (result) =>
        result
          ? [{ type: "Inward", id: "LIST" }]
          : [{ type: "Inward", id: "LIST" }],
    }),
    // For Getting Inward Details (Single or List with filters)
    getInwardDetails: builder.query({
      query: (product_id) =>
        product_id
          ? `api/get_inward_details/?product_id=${product_id}`
          : "api/get_inward_details/",
      providesTags: (result) =>
        result
          ? [{ type: "Inward", id: "LIST" }]
          : [{ type: "Inward", id: "LIST" }],
    }),
    // For Getting Materials By Product
    getMaterialsByProduct: builder.query({
      query: (product_id) =>
        `api/get_materials_by_product/?product_id=${product_id}`,
      providesTags: (result) =>
        result
          ? [{ type: "Inward", id: "LIST" }]
          : [{ type: "Inward", id: "LIST" }],
    }),
    addCompany: builder.mutation({
      query: (body) => ({
        url: "api/add_company/",
        method: "POST",
        body,
      }),
      invalidatesTags: (result) =>
        result
          ? [{ type: "Inward", id: "LIST" }]
          : [{ type: "Inward", id: "LIST" }],
    }),
    // For Material Type Dropdown
    getMaterialType: builder.query({
      query: () => "api/get_material_type/",
      providesTags: (result) =>
        result
          ? [{ type: "Inward", id: "LIST" }]
          : [{ type: "Inward", id: "LIST" }],
    }),
    // For Adding Inward Details
    addInwardDetails: builder.mutation({
      query: (body) => ({
        url: "api/add_inward_details/",
        method: "POST",
        body,
      }),
      invalidatesTags: (result) =>
        result
          ? [{ type: "Inward", id: "LIST" }]
          : [{ type: "Inward", id: "LIST" }],
    }),
    updateProductDetails: builder.mutation({
      query: ({ product_id, body }) => ({
        url: `api/update_product_details/${product_id}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { product_id }) => [
        { type: "Inward", id: product_id },
        { type: "Inward", id: "LIST" },
      ],
    }),
    addProductMaterial: builder.mutation({
      query: (body) => ({
        url: "api/add_product_material/",
        method: "POST",
        body,
      }),
      invalidatesTags: (result) =>
        result
          ? [{ type: "Inward", id: "LIST" }]
          : [{ type: "Inward", id: "LIST" }],
    }),
    // While Editing Delete Product Material
    deleteProductMaterial: builder.mutation({
      query: (id) => ({
        url: `api/delete_product_material/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: (result) =>
        result
          ? [{ type: "Inward", id: "LIST" }]
          : [{ type: "Inward", id: "LIST" }],
    }),
    getProgramerDetailsByMaterial: builder.query({
      query: ({ product_id, material_id }) =>
        `api/get_programer_Details/?product_id=${product_id}&material_id=${material_id}`,
      providesTags: (result) =>
        result
          ? [{ type: "Inward", id: "LIST" }]
          : [{ type: "Inward", id: "LIST" }],
    }),
  }),
});
export const {
  useGetCompaniesQuery,
  useAddCompanyMutation,
  useCheckSlipNumberQuery,
  useLazyCheckSlipNumberQuery,
  useGetLatestSlipNumberQuery,
  useGetMaterialsByProductQuery,
  useGetMaterialTypeQuery,
  useAddInwardDetailsMutation,
  useUpdateProductDetailsMutation,
  useAddProductMaterialMutation,
  useDeleteProductMaterialMutation,
  useGetProgramerDetailsByMaterialQuery,
  useGetInwardDetailsQuery,
} = inwardApi;
