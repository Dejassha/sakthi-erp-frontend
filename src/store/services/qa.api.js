import baseQuery from "../baseQuery";
export const qaApi = baseQuery.injectEndpoints({
  endpoints: (builder) => ({
    // add qa details
    addQaDetails: builder.mutation({
      query: (body) => ({
        url: "api/add_qa_details/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["QA", "Inward"],
    }),
    // get qa details by product
    getQaDetailsByProduct: builder.query({
      query: (product_id) => `api/get_qa_details/?product_id=${product_id}`,
      providesTags: ["QA"],
    }),
    // update qa details
    updateQaDetails: builder.mutation({
      query: ({ body }) => ({
        url: `api/update_qa_details/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["QA", "Inward"],
    }),
  }),
});
export const {
  useAddQaDetailsMutation,
  useGetQaDetailsByProductQuery,
  useUpdateQaDetailsMutation,
} = qaApi;
