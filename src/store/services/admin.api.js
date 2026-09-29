import baseQuery from "../baseQuery";
export const adminApi = baseQuery.injectEndpoints({
  endpoints: (builder) => ({
    // Material Type APIs
    getMaterialTypes: builder.query({
      query: () => "api/get_material_type/",
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({
              type: "AdminMaterials",
              id,
            })),
            { type: "AdminMaterials", id: "LIST" },
          ]
          : [{ type: "AdminMaterials", id: "LIST" }],
    }),
    addMaterialType: builder.mutation({
      query: (body) => ({
        url: "api/add_material_type/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "AdminMaterials", id: "LIST" }],
    }),
    updateMaterialType: builder.mutation({
      query: ({ id, body }) => ({
        url: `api/update_material_type/${id}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminMaterials", id },
        { type: "AdminMaterials", id: "LIST" },
      ],
    }),
    deleteMaterialType: builder.mutation({
      query: (id) => ({
        url: `api/delete_material_type/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "AdminMaterials", id },
        { type: "AdminMaterials", id: "LIST" },
      ],
    }),
    // Operator APIs
    getOperators: builder.query({
      query: () => "api/get_operator/",
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({
              type: "AdminOperators",
              id,
            })),
            { type: "AdminOperators", id: "LIST" },
          ]
          : [{ type: "AdminOperators", id: "LIST" }],
    }),
    addOperator: builder.mutation({
      query: (body) => ({
        url: "api/add_operator/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "AdminOperators", id: "LIST" }],
    }),
    updateOperator: builder.mutation({
      query: ({ id, body }) => ({
        url: `api/update_operator/${id}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminOperators", id },
        { type: "AdminOperators", id: "LIST" },
      ],
    }),
    deleteOperator: builder.mutation({
      query: (id) => ({
        url: `api/delete_operator/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "AdminOperators", id },
        { type: "AdminOperators", id: "LIST" },
      ],
    }),
    // Company APIs
    getCompanies: builder.query({
      query: () => "api/get_companies/",
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({
              type: "AdminCompanies",
              id,
            })),
            { type: "AdminCompanies", id: "LIST" },
          ]
          : [{ type: "AdminCompanies", id: "LIST" }],
    }),
    addCompany: builder.mutation({
      query: (body) => ({
        url: "api/add_company/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "AdminCompanies", id: "LIST" }],
    }),
    updateCompany: builder.mutation({
      query: ({ id, body }) => ({
        url: `api/update_company/${id}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminCompanies", id },
        { type: "AdminCompanies", id: "LIST" },
      ],
    }),
    deleteCompany: builder.mutation({
      query: (id) => ({
        url: `api/delete_company/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "AdminCompanies", id },
        { type: "AdminCompanies", id: "LIST" },
      ],
    }),
    // Machine APIs
    getMachines: builder.query({
      query: () => "api/get_machines/",
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({
              type: "AdminMachines",
              id,
            })),
            { type: "AdminMachines", id: "LIST" },
          ]
          : [{ type: "AdminMachines", id: "LIST" }],
    }),
    addMachine: builder.mutation({
      query: (body) => ({
        url: "api/add_machine/",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "AdminMachines", id: "LIST" },
        { type: "AdminMachines", id: "HISTORY" },
      ],
    }),
    updateMachine: builder.mutation({
      query: ({ id, body }) => ({
        url: `api/update_machine/${id}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminMachines", id },
        { type: "AdminMachines", id: "LIST" },
        { type: "AdminMachines", id: "HISTORY" },
      ],
    }),
    deleteMachine: builder.mutation({
      query: (id) => ({
        url: `api/delete_machine/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "AdminMachines", id },
        { type: "AdminMachines", id: "LIST" },
      ],
    }),
    // Machine Maintenance APIs
    getMaintenanceHistory: builder.query({
      query: () => "api/get_maintenance_history/",
      transformResponse: (response) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.results)) return response.results;
        if (Array.isArray(response?.data)) return response.data;
        return [];
      },
      providesTags: [{ type: "AdminMachines", id: "HISTORY" }],
    }),
    approveMaintenance: builder.mutation({
      query: (body) => ({
        url: "api/approve_maintenance/",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { machine_id }) => [
        { type: "AdminMachines", id: machine_id },
        { type: "AdminMachines", id: "LIST" },
        { type: "AdminMachines", id: "HISTORY" },
        { type: "AdminInventory", id: "HISTORY" },
        { type: "AdminInventory", id: "LIST" },
      ],
    }),
    addMaintenanceSchedule: builder.mutation({
      query: (body) => ({
        url: "api/add_maintenance_schedule/",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, body) => [
        { type: "AdminMachines", id: body?.machine_id },
        { type: "AdminMachines", id: "LIST" },
        { type: "AdminMachines", id: "HISTORY" },
      ],
    }),
    updateMaintenanceSchedule: builder.mutation({
      query: ({ id, body }) => ({
        url: `api/update_maintenance_schedule/${id}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { body }) => [
        { type: "AdminMachines", id: body?.machine_id },
        { type: "AdminMachines", id: "LIST" },
        { type: "AdminMachines", id: "HISTORY" },
      ],
    }),
    deleteMaintenanceSchedule: builder.mutation({
      query: (arg) => {
        const id = typeof arg === "object" && arg !== null ? arg.id : arg;
        const body = typeof arg === "object" && arg !== null ? arg : undefined;
        return {
          url: `api/delete_maintenance_schedule/${id}/`,
          method: "DELETE",
          body,
        };
      },
      invalidatesTags: [
        { type: "AdminMachines", id: "LIST" },
        { type: "AdminMachines", id: "HISTORY" },
      ],
    }),
    // User APIs
    getRoles: builder.query({
      query: () => "api/get_role_list/",
      providesTags: (result) =>
        result
          ? [
            ...result.roles.map(({ id }) => ({
              type: "AdminRoles",
              id,
            })),
            { type: "AdminRoles", id: "LIST" },
          ]
          : [{ type: "AdminRoles", id: "LIST" }],
    }),
    getUsers: builder.query({
      query: () => "api/get_all_users/",
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: "AdminUsers", id })),
            { type: "AdminUsers", id: "LIST" },
          ]
          : [{ type: "AdminUsers", id: "LIST" }],
      transformResponse: (response) => {
        // Handle the strange backend structure where each user is an array inside an object keyed by ID
        return Object.entries(response)
          .filter(([key]) => key !== "total_users")
          .map(([id, value]) => {
            const u = value[0];
            return {
              id: Number(id),
              username: u.username,
              email: u.email,
              roles: u.roles || [],
              isAdmin: !!u.isAdmin,
              has_user_management: !!u.has_user_management,
            };
          });
      },
    }),
    createUser: builder.mutation({
      query: (body) => ({
        url: "api/create_user/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "AdminUsers", id: "LIST" }],
    }),
    updateUser: builder.mutation({
      query: ({ id, body }) => ({
        url: `api/update_user/${id}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminUsers", id },
        { type: "AdminUsers", id: "LIST" },
      ],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `api/delete_user/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "AdminUsers", id },
        { type: "AdminUsers", id: "LIST" },
      ],
    }),
    // Reports APIs
    getOverallDetails: builder.query({
      query: ({ page = 1, pageSize = 100, filters, sort }) => {
        let url = `api/get_overall_details/?page=${page}&page_size=${pageSize}`;
        if (filters) url += `&filters=${encodeURIComponent(filters)}`;
        if (sort) url += `&sort=${encodeURIComponent(sort)}`;
        return url;
      },
      providesTags: (result) =>
        result?.rows
          ? [
            ...result.rows.map(({ material_id }) => ({
              type: "AdminReports",
              id: material_id,
            })),
            { type: "AdminReports", id: "LIST" },
          ]
          : [{ type: "AdminReports", id: "LIST" }],
    }),
    exportSelectedRows: builder.mutation({
      query: (body) => ({
        url: "api/export_selected_rows/",
        method: "POST",
        body,
        responseHandler: (response) => response.blob(),
      }),
    }),
    exportInventoryHistoryExcel: builder.mutation({
      query: (body) => ({
        url: "api/export_inventory_history_excel/",
        method: "POST",
        body,
        responseHandler: (response) => response.blob(),
      }),
    }),
    getPeriodicMaintenanceReports: builder.query({
      query: (params) => ({
        url: "api/get_periodic_maintenance_reports/",
        params,
      }),
      keepUnusedDataFor: 180,
      transformResponse: (response) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.results)) return response.results;
        if (Array.isArray(response?.data)) return response.data;
        return [];
      },
      providesTags: [
        { type: "AdminMachines", id: "HISTORY" },
        { type: "AdminMachines", id: "LIST" },
      ],
    }),
    getBreakdownMaintenanceReports: builder.query({
      query: (params) => ({
        url: "api/get_breakdown_maintenance_reports/",
        params,
      }),
      keepUnusedDataFor: 180,
      transformResponse: (response) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.results)) return response.results;
        if (Array.isArray(response?.data)) return response.data;
        return [];
      },
      providesTags: [
        { type: "AdminMachines", id: "HISTORY" },
        { type: "AdminMachines", id: "LIST" },
        { type: "AdminInventory", id: "BREAKDOWN" },
      ],
    }),
    exportPeriodicMaintenanceExcel: builder.mutation({
      query: (body) => ({
        url: "api/export_periodic_maintenance_excel/",
        method: "POST",
        body,
        responseHandler: (response) => response.blob(),
      }),
    }),
    exportBreakdownMaintenanceExcel: builder.mutation({
      query: (body) => ({
        url: "api/export_breakdown_maintenance_excel/",
        method: "POST",
        body,
        responseHandler: (response) => response.blob(),
      }),
    }),
    // GasDetails APIs
    getGasDetails: builder.query({
      query: () => "api/get_gas_details/",
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: "AdminGas", id })),
            { type: "AdminGas", id: "LIST" },
          ]
          : [{ type: "AdminGas", id: "LIST" }],
    }),
    addGasDetails: builder.mutation({
      query: (body) => ({
        url: "api/add_gas_details/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "AdminGas", id: "LIST" }],
    }),
    updateGasDetails: builder.mutation({
      query: ({ pk, ...body }) => ({
        url: `api/update_gas_details/${pk}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { pk }) => [
        { type: "AdminGas", id: pk },
        { type: "AdminGas", id: "LIST" },
      ],
    }),
    deleteGasDetails: builder.mutation({
      query: (pk) => ({
        url: `api/delete_gas_details/${pk}/`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, pk) => [
        { type: "AdminGas", id: pk },
        { type: "AdminGas", id: "LIST" },
      ],
    }),
    // Inventory APIs
    getInventoryPartNames: builder.query({
      query: () => "api/get_inventory_part_names/",
      providesTags: [{ type: "AdminInventory", id: "PART_NAMES" }],
    }),
    addInventoryPartName: builder.mutation({
      query: (body) => ({
        url: "api/add_inventory_part_name/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "AdminInventory", id: "PART_NAMES" }],
    }),
    deleteInventoryPartName: builder.mutation({
      query: (id) => ({
        url: `api/delete_inventory_part_name/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "AdminInventory", id: "PART_NAMES" }],
    }),
    getInventoryUsageTypes: builder.query({
      query: () => "api/get_inventory_usage_types/",
      providesTags: [{ type: "AdminInventory", id: "USAGE_TYPES" }],
    }),
    addInventoryUsageType: builder.mutation({
      query: (body) => ({
        url: "api/add_inventory_usage_type/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "AdminInventory", id: "USAGE_TYPES" }],
    }),
    deleteInventoryUsageType: builder.mutation({
      query: (id) => ({
        url: `api/delete_inventory_usage_type/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "AdminInventory", id: "USAGE_TYPES" }],
    }),
    getInventoryParts: builder.query({
      query: () => "api/get_inventory_parts/",
      providesTags: [{ type: "AdminInventory", id: "LIST" }],
    }),
    addInventoryPart: builder.mutation({
      query: (body) => ({
        url: "api/add_inventory_part/",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "AdminInventory", id: "LIST" },
        { type: "AdminInventory", id: "HISTORY" },
      ],
    }),
    updateInventoryPart: builder.mutation({
      query: ({ id, body }) => ({
        url: `api/update_inventory_part/${id}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [
        { type: "AdminInventory", id: "LIST" },
        { type: "AdminInventory", id: "HISTORY" },
      ],
    }),
    deleteInventoryPart: builder.mutation({
      query: ({ id, remarks, user }) => ({
        url: `api/delete_inventory_part/${id}/`,
        method: "DELETE",
        body: { remarks, user },
      }),
      invalidatesTags: [
        { type: "AdminInventory", id: "LIST" },
        { type: "AdminInventory", id: "HISTORY" },
      ],
    }),
    getInventoryUsage: builder.query({
      query: () => "api/get_inventory_usage/",
      providesTags: [{ type: "AdminInventory", id: "USAGE" }],
    }),
    addInventoryUsage: builder.mutation({
      query: (body) => ({
        url: "api/add_inventory_usage/",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "AdminInventory", id: "USAGE" },
        { type: "AdminInventory", id: "LIST" },
        { type: "AdminInventory", id: "HISTORY" },
      ],
    }),
    updateInventoryUsage: builder.mutation({
      query: ({ id, body }) => ({
        url: `api/update_inventory_usage/${id}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [
        { type: "AdminInventory", id: "USAGE" },
        { type: "AdminInventory", id: "LIST" },
        { type: "AdminInventory", id: "HISTORY" },
      ],
    }),
    deleteInventoryUsage: builder.mutation({
      query: (id) => ({
        url: `api/delete_inventory_usage/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "AdminInventory", id: "USAGE" },
        { type: "AdminInventory", id: "LIST" },
        { type: "AdminInventory", id: "HISTORY" },
      ],
    }),
    getPendingMaterials: builder.query({
      query: () => "api/get_pending_materials/",
      providesTags: [{ type: "AdminInventory", id: "PENDING" }],
    }),
    updatePendingMaterial: builder.mutation({
      query: ({ id, body }) => ({
        url: `api/update_pending_material/${id}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "AdminInventory", id: "PENDING" }],
    }),
    getInventoryHistory: builder.query({
      query: () => "api/get_inventory_history/",
      keepUnusedDataFor: 180,
      providesTags: [{ type: "AdminInventory", id: "HISTORY" }],
    }),
    getBreakdownMaintenance: builder.query({
      query: () => "api/get_breakdown_maintenance/",
      keepUnusedDataFor: 180,
      providesTags: [{ type: "AdminInventory", id: "BREAKDOWN" }],
    }),
    addBreakdownMaintenance: builder.mutation({
      query: (body) => ({
        url: "api/add_breakdown_maintenance/",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "AdminInventory", id: "BREAKDOWN" },
        { type: "AdminMachines", id: "HISTORY" },
      ],
    }),
    updateBreakdownMaintenance: builder.mutation({
      query: ({ id, body }) => ({
        url: `api/update_breakdown_maintenance/${id}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [
        { type: "AdminInventory", id: "BREAKDOWN" },
        { type: "AdminMachines", id: "HISTORY" },
      ],
    }),
    deleteBreakdownMaintenance: builder.mutation({
      query: (arg) => {
        const id = typeof arg === "object" && arg !== null ? arg.id : arg;
        const body = typeof arg === "object" && arg !== null ? arg : undefined;
        return {
          url: `api/delete_breakdown_maintenance/${id}/`,
          method: "DELETE",
          body,
        };
      },
      invalidatesTags: [
        { type: "AdminInventory", id: "BREAKDOWN" },
        { type: "AdminMachines", id: "HISTORY" },
      ],
    }),
    getKPIRecords: builder.query({
      query: ({ queries }) => {
        let url = "api/get_kpis/";
        if (queries) url += `?queries=${encodeURIComponent(queries)}`;
        return url;
      },
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: "KPIRecords", id })),
            { type: "KPIRecords", id: "LIST" },
          ]
          : [{ type: "KPIRecords", id: "LIST" }],
    }),
    updateKPIRecord: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `api/update_kpi/${id}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "KPIRecords", id },
        { type: "KPIRecords", id: "LIST" },
      ],
    }),
    saveKPIRecords: builder.mutation({
      query: (body) => ({
        url: "api/save_kpis/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "KPIRecords", id: "LIST" }],
    }),
    deleteKPIGroup: builder.mutation({
      query: (groupId) => ({
        url: `api/delete_kpi_group/${groupId}/`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "KPIRecords", id: "LIST" }],
    }),
    getKPIDefaults: builder.query({
      query: () => "api/get_kpi_defaults/",
    }),
  }),
});
export const {
  useGetMaterialTypesQuery,
  useAddMaterialTypeMutation,
  useUpdateMaterialTypeMutation,
  useDeleteMaterialTypeMutation,
  useGetOperatorsQuery,
  useAddOperatorMutation,
  useUpdateOperatorMutation,
  useDeleteOperatorMutation,
  useGetCompaniesQuery,
  useLazyGetCompaniesQuery,
  useAddCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
  useGetMachinesQuery,
  useAddMachineMutation,
  useUpdateMachineMutation,
  useDeleteMachineMutation,
  useAddMaintenanceScheduleMutation,
  useUpdateMaintenanceScheduleMutation,
  useDeleteMaintenanceScheduleMutation,
  useApproveMaintenanceMutation,
  useGetMaintenanceHistoryQuery,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useGetOverallDetailsQuery,
  useLazyGetOverallDetailsQuery,
  useExportSelectedRowsMutation,
  useGetGasDetailsQuery,
  useAddGasDetailsMutation,
  useUpdateGasDetailsMutation,
  useDeleteGasDetailsMutation,
  useGetInventoryPartNamesQuery,
  useAddInventoryPartNameMutation,
  useDeleteInventoryPartNameMutation,
  useGetInventoryUsageTypesQuery,
  useAddInventoryUsageTypeMutation,
  useDeleteInventoryUsageTypeMutation,
  useGetInventoryPartsQuery,
  useAddInventoryPartMutation,
  useUpdateInventoryPartMutation,
  useDeleteInventoryPartMutation,
  useGetInventoryUsageQuery,
  useAddInventoryUsageMutation,
  useUpdateInventoryUsageMutation,
  useDeleteInventoryUsageMutation,
  useGetPendingMaterialsQuery,
  useUpdatePendingMaterialMutation,
  useGetInventoryHistoryQuery,
  useExportInventoryHistoryExcelMutation,
  useGetPeriodicMaintenanceReportsQuery,
  useLazyGetPeriodicMaintenanceReportsQuery,
  useGetBreakdownMaintenanceReportsQuery,
  useLazyGetBreakdownMaintenanceReportsQuery,
  useExportPeriodicMaintenanceExcelMutation,
  useExportBreakdownMaintenanceExcelMutation,
  useGetBreakdownMaintenanceQuery,
  useAddBreakdownMaintenanceMutation,
  useUpdateBreakdownMaintenanceMutation,
  useDeleteBreakdownMaintenanceMutation,
  useGetKPIRecordsQuery,
  useUpdateKPIRecordMutation,
  useSaveKPIRecordsMutation,
  useDeleteKPIGroupMutation,
  useGetKPIDefaultsQuery,
} = adminApi;
