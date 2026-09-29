import baseQuery from "../baseQuery";
export const accountsApi = baseQuery.injectEndpoints({
  endpoints: (builder) => ({
    // For Adding Account Details
    addAccDetails: builder.mutation({
      query: (body) => ({
        url: "api/add_acc_details/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Account", "Inward"],
    }),
  }),
});
export const { useAddAccDetailsMutation } = accountsApi;
