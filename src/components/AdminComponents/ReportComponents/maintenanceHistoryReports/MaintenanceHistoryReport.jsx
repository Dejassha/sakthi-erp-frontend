import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import dayjs from "dayjs";
import {
  useGetPeriodicMaintenanceReportsQuery,
  useExportPeriodicMaintenanceExcelMutation,
} from "@/store/services/admin.api";
import LoadingState from "@/pages/errorPage/LoadingState";
import ErrorState from "@/pages/errorPage/ErrorState";
import { downloadMaintenanceHistoryExcel } from "./exportMaintenanceHistoryExcel";
import MaintenanceHistoryHeader from "./MaintenanceHistoryHeader";
import MaintenanceHistoryTable from "./MaintenanceHistoryTable";

const MaintenanceHistoryReport = () => {
  const gridApiRef = useRef(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [displayedCount, setDisplayedCount] = useState(0);

  const {
    data: response,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetPeriodicMaintenanceReportsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [exportExcelMutation, { isLoading: isExporting }] =
    useExportPeriodicMaintenanceExcelMutation();

  const rawData = useMemo(() => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  }, [response]);

  const memoizedHistory = useMemo(() => {
    return rawData.map((item, idx) => {
      const isPeriodic =
        item.type_key === "periodic" ||
        String(item.maintenance_type).toLowerCase().includes("periodic");

      const intervalDisplay = isPeriodic
        ? item.interval_days
          ? `${item.interval_days} Days`
          : "-"
        : "-";

      const remainingDaysDisplay = isPeriodic
        ? item.remaining_days_display ||
        (item.remaining_days != null ? `${item.remaining_days} Days` : "-")
        : "-";

      const nextMaintenanceDate = isPeriodic
        ? item.next_maintenance_date || "-"
        : "-";

      const downtimeDisplay = item.downtime_display
        ? item.downtime_display
        : item.total_downtime_hours != null && item.total_downtime_hours > 0
          ? `${item.total_downtime_hours} hrs`
          : "-";

      const maintenanceDate =
        item.maintenance_date ||
        item.breakdown_date ||
        item.last_maintenance_date ||
        (item.created_at ? dayjs(item.created_at).format("YYYY-MM-DD") : "-");

      return {
        ...item,
        sno: idx + 1,
        maintenance_type:
          item.maintenance_type ||
          (isPeriodic ? "Periodic Maintenance" : "Breakdown Maintenance"),
        record_number:
          item.record_number ||
          (item.raw_id || item.id
            ? `${isPeriodic ? "PM" : "BM"}-${String(item.raw_id || item.id).padStart(4, "0")}`
            : "-"),
        machine_name: item.machine_name
          ? String(item.machine_name).toUpperCase()
          : "-",
        title:
          item.title ||
          item.maintenance_name ||
          item.problem_description ||
          item.reason ||
          "-",
        status: (item.status || "PENDING").toUpperCase(),
        interval_display: intervalDisplay,
        next_maintenance_date: nextMaintenanceDate,
        remaining_days_display: remainingDaysDisplay,
        downtime_display: downtimeDisplay,
        maintenance_date: maintenanceDate,
        operator_name: item.operator_name || item.user || "-",
        supervised_by: item.supervised_by
          ? String(item.supervised_by).toUpperCase()
          : "-",
        parts_used: item.parts_used || "-",
        remind_before_days: item.remind_before_days || 3,
        remaining_days_status: item.remaining_days_status || null,
        created_by: item.created_by
          ? String(item.created_by).toUpperCase()
          : "-",
        remarks: item.remarks || "-",
      };
    });
  }, [rawData]);

  const syncGridState = useCallback((api) => {
    if (!api) return;
    setDisplayedCount(api.getDisplayedRowCount());
    const filteredSelected = [];
    api.forEachNodeAfterFilter((node) => {
      if (node.isSelected() && node.data) {
        filteredSelected.push(node.data);
      }
    });
    setSelectedRows(filteredSelected);
  }, []);

  useEffect(() => {
    if (gridApiRef.current) {
      syncGridState(gridApiRef.current);
    } else {
      setDisplayedCount(memoizedHistory.length);
    }
  }, [memoizedHistory, syncGridState]);

  const handleExportExcel = async () => {
    let rowsToExport = [];

    if (selectedRows && selectedRows.length > 0) {
      rowsToExport = selectedRows;
    } else if (gridApiRef.current) {
      gridApiRef.current.forEachNodeAfterFilterAndSort((node) => {
        if (node.data) {
          rowsToExport.push(node.data);
        }
      });
    } else {
      rowsToExport = memoizedHistory;
    }

    await downloadMaintenanceHistoryExcel(exportExcelMutation, {
      rows: rowsToExport,
    });
  };

  const handleSelectionChanged = useCallback(() => {
    if (gridApiRef.current) {
      const filteredSelected = [];
      gridApiRef.current.forEachNodeAfterFilter((node) => {
        if (node.isSelected() && node.data) {
          filteredSelected.push(node.data);
        }
      });
      setSelectedRows(filteredSelected);
    }
  }, []);

  const handleFilterChanged = useCallback(
    (params) => {
      if (params?.api) {
        syncGridState(params.api);
      }
    },
    [syncGridState],
  );

  const isAllSelected =
    displayedCount > 0 && selectedRows.length >= displayedCount;

  const handleToggleSelectAll = useCallback(() => {
    if (!gridApiRef.current) return;
    if (isAllSelected) {
      gridApiRef.current.forEachNodeAfterFilter((node) => {
        node.setSelected(false);
      });
      setSelectedRows([]);
    } else {
      gridApiRef.current.forEachNodeAfterFilter((node) => {
        node.setSelected(true);
      });
      const selected = [];
      gridApiRef.current.forEachNodeAfterFilter((node) => {
        if (node.data) selected.push(node.data);
      });
      setSelectedRows(selected);
    }
  }, [isAllSelected]);

  const handleClearSelection = useCallback(() => {
    if (!gridApiRef.current) return;
    if (typeof gridApiRef.current.deselectAll === "function") {
      gridApiRef.current.deselectAll();
    }
    gridApiRef.current.forEachNode((node) => {
      node.setSelected(false);
    });
    setSelectedRows([]);
  }, []);

  if (isLoading) {
    return <LoadingState message="Loading Maintenance History..." />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        description="An error occurred while fetching maintenance history."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <MaintenanceHistoryHeader
        displayedCount={displayedCount}
        selectedRows={selectedRows}
        isAllSelected={isAllSelected}
        isExporting={isExporting}
        rows={memoizedHistory}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={handleClearSelection}
        onExportExcel={handleExportExcel}
      />

      <MaintenanceHistoryTable
        rowData={memoizedHistory}
        loading={isFetching}
        onSelectionChanged={handleSelectionChanged}
        onFilterChanged={handleFilterChanged}
        onGridReady={(params) => {
          gridApiRef.current = params.api;
          setDisplayedCount(params.api.getDisplayedRowCount());
        }}
      />
    </div>
  );
};

export default MaintenanceHistoryReport;
