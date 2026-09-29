import baseQuery from "../baseQuery";
export const utilityApi = baseQuery.injectEndpoints({
  endpoints: (builder) => ({
    // For Getting Companies
    getCompanies: builder.query({
      query: () => "api/get_companies/",
      providesTags: ["Inward"],
    }),
    // For Getting Materials By Product
    getMaterialsByProduct: builder.query({
      query: (product_id) =>
        `api/get_materials_by_product/?product_id=${product_id}`,
      providesTags: ["Inward"],
    }),
    // For Getting Dashboard List View For All Roles
    getDashboardList: builder.query({
      query: ({ type, page, page_size, filters, sort }) => {
        let url = `api/get_dashboard_list/?type=${type}&page=${page}&page_size=${page_size}`;
        if (filters) {
          url += `&filters=${encodeURIComponent(filters)}`;
        }
        if (sort) {
          url += `&sort=${encodeURIComponent(sort)}`;
        }
        return url;
      },
      providesTags: ["Inward"],
    }),
    // For Getting Dashboard Details View For All Roles (Optimized Full Product)
    getDashboardDetails: builder.query({
      query: ({ product_id, type }) =>
        `api/get_dashboard_details/?product_id=${product_id}&type=${type}`,
      providesTags: (_result, _error, { product_id }) => [
        { type: "Inward", id: product_id },
        { type: "Inward", id: "LIST" },
      ],
    }),
  }),
});
export const {
  useGetCompaniesQuery,
  useGetDashboardListQuery,
  useLazyGetDashboardListQuery,
  useGetDashboardDetailsQuery,
  useGetMaterialsByProductQuery,
} = utilityApi;
