import { useCallback } from "react";
import ReusableTable from "@/components/ReusableComponents/ReusableTable";
import { useLazyGetDashboardListQuery } from "@/store/services/utility.api";
import { useListColumnDefs } from "./listComponents/constants/useListColumnDefs";

const DashboardList = ({ onView, type }) => {
  const [trigger, { isLoading, isFetching, error: queryError }] =
    useLazyGetDashboardListQuery();
  const loading = isLoading || isFetching;
  const columnDefs = useListColumnDefs(type, onView);

  const fetchData = useCallback(
    async ({ page, pageSize, filters, sort }) => {
      const res = await trigger({
        type,
        page,
        page_size: pageSize,
        filters,
        sort,
      }).unwrap();
      return { rows: res.results, count: res.count };
    },
    [type, trigger],
  );

  const handleRowClick = useCallback(
    (event) => {
      if (event?.data && typeof onView === "function") {
        onView(event.data);
      }
    },
    [onView],
  );

  return (
    <ReusableTable
      persistKey={`dashboard_${type}`}
      columnDefs={columnDefs}
      fetchData={fetchData}
      loading={loading}
      loadingText="Loading dashboard data..."
      error={queryError}
      emptyTitle="No Records Found"
      emptyDescription="There are no items to display for this dashboard."
      onRowClicked={handleRowClick}
      rowClass="cursor-pointer hover:bg-blue-50/40"
      rowHeight={20}
    />
  );
};

export default DashboardList;
