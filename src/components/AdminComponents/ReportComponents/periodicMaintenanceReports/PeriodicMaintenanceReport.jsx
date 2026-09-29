import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import dayjs from "dayjs";
import {
  useGetPeriodicMaintenanceReportsQuery,
  useExportPeriodicMaintenanceExcelMutation,
} from "@/store/services/admin.api";
import LoadingState from "@/pages/errorPage/LoadingState";
import ErrorState from "@/pages/errorPage/ErrorState";
import { downloadPeriodicMaintenanceExcel, EXCEL_HEADERS } from "./exportPeriodicMaintenanceExcel";
import PeriodicMaintenanceHeader from "./PeriodicMaintenanceHeader";
import PeriodicMaintenanceTable from "./PeriodicMaintenanceTable";

const PeriodicMaintenanceReport = () => {
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

  const memoizedPeriodicHistory = useMemo(() => {
    const periodicOnly = rawData.filter((item) => {
      const typeKey = String(item.type_key || "").toLowerCase();
      const mainType = String(item.maintenance_type || "").toLowerCase();
      return typeKey === "periodic" || mainType.includes("periodic") || (!typeKey.includes("breakdown") && !mainType.includes("breakdown"));
    });

    return periodicOnly.map((item, idx) => {
      const intervalDisplay = item.interval_days
        ? `${item.interval_days} Days`
        : (item.interval || "-");

      const remindBeforeDisplay = item.remind_before_days != null
        ? `${item.remind_before_days} Days`
        : (item.remind_before_display || "-");

      const remainingDaysDisplay = item.remaining_days_display ||
        (item.remaining_days != null ? `${item.remaining_days} Days` : "-");

      const nextMaintenanceDate = item.next_maintenance_date || "-";

      const maintenanceDate =
        item.maintenance_date ||
        item.last_maintenance_date ||
        (item.created_at ? dayjs(item.created_at).format("YYYY-MM-DD") : "-");

      return {
        ...item,
        sno: idx + 1,
        type_key: "periodic",
        maintenance_type: "Periodic Maintenance",
        record_number:
          item.record_number ||
          item.schedule_number ||
          (item.raw_id || item.id
            ? `PM-${String(item.raw_id || item.id).padStart(4, "0")}`
            : "-"),
        machine_name: item.machine_name
          ? String(item.machine_name).toUpperCase()
          : "-",
        title:
          item.title ||
          item.maintenance_name ||
          item.task_name ||
          "-",
        supervised_by: item.supervised_by ? String(item.supervised_by).toUpperCase() : "-",
        remind_before_days: item.remind_before_days ?? 3,
        remind_before_display: remindBeforeDisplay,
        status: (item.status || "PENDING").toUpperCase(),
        interval_display: intervalDisplay,
        next_maintenance_date: nextMaintenanceDate,
        remaining_days_display: remainingDaysDisplay,
        remaining_days_status: item.remaining_days_status,
        maintenance_date: maintenanceDate,
        operator_name: item.operator_name || item.assigned_to || item.user || "-",
        parts_used: item.parts_used || "-",
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
      setDisplayedCount(memoizedPeriodicHistory.length);
    }
  }, [memoizedPeriodicHistory, syncGridState]);

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
      rowsToExport = memoizedPeriodicHistory;
    }

    await downloadPeriodicMaintenanceExcel(exportExcelMutation, {
      headers: EXCEL_HEADERS,
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

  const handleFilterChanged = useCallback(() => {
    if (gridApiRef.current) {
      syncGridState(gridApiRef.current);
    }
  }, [syncGridState]);

  const handleGridReady = useCallback(
    (params) => {
      gridApiRef.current = params.api;
      syncGridState(params.api);
    },
    [syncGridState]
  );

  const isAllSelected = useMemo(() => {
    return (
      displayedCount > 0 &&
      selectedRows.length > 0 &&
      selectedRows.length === displayedCount
    );
  }, [displayedCount, selectedRows.length]);

  const handleToggleSelectAll = useCallback(() => {
    if (!gridApiRef.current) return;
    const api = gridApiRef.current;

    if (isAllSelected) {
      api.forEachNodeAfterFilter((node) => {
        node.setSelected(false);
      });
      setSelectedRows([]);
    } else {
      api.forEachNodeAfterFilter((node) => {
        node.setSelected(true);
      });
      const allFiltered = [];
      api.forEachNodeAfterFilter((node) => {
        if (node.data) allFiltered.push(node.data);
      });
      setSelectedRows(allFiltered);
    }
  }, [isAllSelected]);

  const handleClearSelection = useCallback(() => {
    if (!gridApiRef.current) return;
    gridApiRef.current.deselectAll();
    setSelectedRows([]);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <LoadingState message="Loading Periodic Maintenance records..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4">
        <ErrorState
          error={error}
          onRetry={refetch}
          message="Failed to load Periodic Maintenance Report."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <PeriodicMaintenanceHeader
        displayedCount={displayedCount}
        selectedRows={selectedRows}
        isAllSelected={isAllSelected}
        isExporting={isExporting}
        rows={memoizedPeriodicHistory}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={handleClearSelection}
        onExportExcel={handleExportExcel}
      />

      <PeriodicMaintenanceTable
        rowData={memoizedPeriodicHistory}
        loading={isFetching}
        onSelectionChanged={handleSelectionChanged}
        onFilterChanged={handleFilterChanged}
        onGridReady={handleGridReady}
      />
    </div>
  );
};

export default React.memo(PeriodicMaintenanceReport);
