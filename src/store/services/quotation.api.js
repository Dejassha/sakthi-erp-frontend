import baseQuery from "../baseQuery";
export const quotationApi = baseQuery.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getQuotationList: builder.query({
      query: ({ page, page_size, search, filters, sort }) => {
        let url = `api/get_quotation_list/?page=${page}&page_size=${page_size}`;
        if (search) {
          url += `&search=${encodeURIComponent(search)}`;
        }
        if (filters) {
          url += `&filters=${encodeURIComponent(filters)}`;
        }
        if (sort) {
          url += `&sort=${encodeURIComponent(sort)}`;
        }
        return url;
      },
      providesTags: (result) =>
        result
          ? [
            ...result.results.map(({ id }) => ({
              type: "Quotation",
              id,
            })),
            { type: "Quotation", id: "LIST" },
          ]
          : [{ type: "Quotation", id: "LIST" }],
    }),
    getQuotationDetails: builder.query({
      query: ({ id }) => `api/get_quotation_details/?id=${id}`,
      providesTags: (result) =>
        result
          ? [
            ...result.items.map(({ id }) => ({
              type: "Quotation",
              id,
            })),
            { type: "Quotation", id: "LIST" },
          ]
          : [{ type: "Quotation", id: "LIST" }],
    }),
    getNextDocNumber: builder.query({
      query: () => "api/get_next_doc_number/",
      providesTags: (result) =>
        result
          ? [{ type: "Quotation", id: "LIST" }]
          : [{ type: "Quotation", id: "LIST" }],
    }),
    // Quotation Cumulative and Monthly Reports
    getQuotationReports: builder.query({
      query: () => "api/get_quotation_reports/",
      providesTags: (result) =>
        result
          ? [
            ...result.cumulative.map(({ label }) => ({
              type: "Quotation",
              label,
            })),
            { type: "Quotation", id: "LIST" },
          ]
          : [{ type: "Quotation", id: "LIST" }],
    }),
    exportQuotationReportsExcel: builder.mutation({
      query: () => ({
        url: "api/export_quotation_reports_excel/",
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    addQuotation: builder.mutation({
      query: (body) => ({
        url: "api/add_quotation/",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Quotation", id },
        { type: "Quotation", id: "LIST" },
      ],
    }),
    updateQuotation: builder.mutation({
      query: ({ id, data }) => ({
        url: `api/edit_quotation/${id}/`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Quotation", id },
        { type: "Quotation", id: "LIST" },
      ],
    }),
    updateQuotationStatus: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `api/update_quotation/${id}/`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Quotation", id },
        { type: "Quotation", id: "LIST" },
      ],
    }),
    duplicateQuotation: builder.mutation({
      query: (body) => ({
        url: "api/duplicate_quotation/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Quotation", id: "LIST" }],
    }),
    deleteQuotation: builder.mutation({
      query: (id) => ({
        url: `api/delete_quotation/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Quotation", id: "LIST" }],
    }),
    // QuotationNote APIs
    getQuotationNote: builder.query({
      query: () => "api/get_quotation_note/",
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({
              type: "QuotationNote",
              id,
            })),
            { type: "QuotationNote", id: "LIST" },
          ]
          : [{ type: "QuotationNote", id: "LIST" }],
    }),
    addQuotationNote: builder.mutation({
      query: (body) => ({
        url: "api/add_quotation_note/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "QuotationNote", id: "LIST" }],
    }),
    updateQuotationNote: builder.mutation({
      query: ({ pk, ...body }) => ({
        url: `api/update_quotation_note/${pk}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { pk }) => [
        { type: "QuotationNote", id: pk },
        { type: "QuotationNote", id: "LIST" },
      ],
    }),
    deleteQuotationNote: builder.mutation({
      query: (pk) => ({
        url: `api/delete_quotation_note/${pk}/`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, pk) => [
        { type: "QuotationNote", id: pk },
        { type: "QuotationNote", id: "LIST" },
      ],
    }),
  }),
});
export const {
  useGetQuotationListQuery,
  useGetQuotationDetailsQuery,
  useLazyGetQuotationListQuery,
  useLazyGetQuotationDetailsQuery,
  useLazyGetNextDocNumberQuery,
  useGetNextDocNumberQuery,
  useGetQuotationReportsQuery,
  useExportQuotationReportsExcelMutation,
  useAddQuotationMutation,
  useUpdateQuotationMutation,
  useUpdateQuotationStatusMutation,
  useDuplicateQuotationMutation,
  useDeleteQuotationMutation,
  useGetQuotationNoteQuery,
  useAddQuotationNoteMutation,
  useUpdateQuotationNoteMutation,
  useDeleteQuotationNoteMutation,
} = quotationApi;
