import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import dayjs from "dayjs";
import {
  useGetBreakdownMaintenanceReportsQuery,
  useExportBreakdownMaintenanceExcelMutation,
} from "@/store/services/admin.api";
import LoadingState from "@/pages/errorPage/LoadingState";
import ErrorState from "@/pages/errorPage/ErrorState";
import { downloadBreakdownMaintenanceExcel, EXCEL_HEADERS } from "./exportBreakdownMaintenanceExcel";
import BreakdownMaintenanceHeader from "./BreakdownMaintenanceHeader";
import BreakdownMaintenanceTable from "./BreakdownMaintenanceTable";

const BreakdownMaintenanceReport = () => {
  const gridApiRef = useRef(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [displayedCount, setDisplayedCount] = useState(0);

  const {
    data: response,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetBreakdownMaintenanceReportsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [exportExcelMutation, { isLoading: isExporting }] =
    useExportBreakdownMaintenanceExcelMutation();

  const rawData = useMemo(() => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  }, [response]);

  const memoizedBreakdownHistory = useMemo(() => {
    const breakdownOnly = rawData.filter((item) => {
      const typeKey = String(item.type_key || "").toLowerCase();
      const mainType = String(item.maintenance_type || "").toLowerCase();
      return typeKey === "breakdown" || mainType.includes("breakdown");
    });

    return breakdownOnly.map((item, idx) => {
      const downtimeDisplay = item.downtime_display
        ? item.downtime_display
        : item.total_downtime_hours != null && item.total_downtime_hours > 0
          ? `${item.total_downtime_hours} hrs`
          : "-";

      const maintenanceDate =
        item.maintenance_date ||
        item.breakdown_date ||
        (item.created_at ? dayjs(item.created_at).format("YYYY-MM-DD") : "-");

      const completionDate = item.completion_date || item.next_maintenance_date || "-";

      const actionVal = String(
        item.action || (item.status === "CLOSED" || item.status === "UPDATED" ? "UPDATED" : "CREATED")
      ).toUpperCase();

      const timestampVal =
        item.timestamp ||
        (item.created_at ? dayjs(item.created_at).format("YYYY-MM-DD hh:mm A") : "-");

      const performedByVal =
        item.performed_by ||
        item.operator_name ||
        item.user ||
        item.created_by ||
        "-";

      return {
        ...item,
        sno: idx + 1,
        type_key: "breakdown",
        maintenance_type: "Breakdown Maintenance",
        action: actionVal,
        timestamp: timestampVal,
        performed_by: performedByVal,
        record_number:
          item.record_number ||
          item.breakdown_number ||
          (item.raw_id || item.id
            ? `BM-${String(item.raw_id || item.id).padStart(4, "0")}`
            : "-"),
        machine_name: item.machine_name
          ? String(item.machine_name).toUpperCase()
          : "-",
        title:
          item.title ||
          item.problem_description ||
          item.breakdown_type ||
          item.problem ||
          item.reason ||
          "-",
        breakdown_type:
          item.breakdown_type ||
          item.title ||
          "-",
        affected_equipment: item.affected_equipment
          ? String(item.affected_equipment).toUpperCase()
          : "-",
        shift: item.shift || "-",
        breakdown_date: item.breakdown_date || maintenanceDate,
        breakdown_time: item.breakdown_time || "-",
        maintenance_start_time: item.maintenance_start_time || "-",
        maintenance_complete_time: item.maintenance_complete_time || "-",
        restart_time: item.restart_time || "-",
        breakdown_complete_date: item.breakdown_complete_date || completionDate,
        action_taken: item.action_taken || item.solution || "-",
        status: (item.status || (actionVal === "DELETED" ? "DELETED" : (actionVal === "UPDATED" ? "CLOSED" : "OPEN"))).toUpperCase(),
        completion_date: completionDate,
        downtime_display: downtimeDisplay,
        maintenance_date: maintenanceDate,
        operator_name: item.operator_name || item.assigned_to || item.user || "-",
        supervisor: item.supervisor || item.supervised_by || "-",
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
      setDisplayedCount(memoizedBreakdownHistory.length);
    }
  }, [memoizedBreakdownHistory, syncGridState]);

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
      rowsToExport = memoizedBreakdownHistory;
    }

    await downloadBreakdownMaintenanceExcel(exportExcelMutation, {
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
        <LoadingState message="Loading Breakdown Maintenance records..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4">
        <ErrorState
          error={error}
          onRetry={refetch}
          message="Failed to load Breakdown Maintenance Report."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <BreakdownMaintenanceHeader
        displayedCount={displayedCount}
        selectedRows={selectedRows}
        isAllSelected={isAllSelected}
        isExporting={isExporting}
        rows={memoizedBreakdownHistory}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={handleClearSelection}
        onExportExcel={handleExportExcel}
      />

      <BreakdownMaintenanceTable
        rowData={memoizedBreakdownHistory}
        loading={isFetching}
        onSelectionChanged={handleSelectionChanged}
        onFilterChanged={handleFilterChanged}
        onGridReady={handleGridReady}
      />
    </div>
  );
};

export default React.memo(BreakdownMaintenanceReport);
