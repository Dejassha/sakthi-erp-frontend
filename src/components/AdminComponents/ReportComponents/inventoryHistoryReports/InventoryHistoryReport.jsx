import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import dayjs from "dayjs";
import {
  useGetInventoryHistoryQuery,
  useExportInventoryHistoryExcelMutation,
} from "@/store/services/admin.api";
import LoadingState from "@/pages/errorPage/LoadingState";
import ErrorState from "@/pages/errorPage/ErrorState";
import { downloadInventoryHistoryExcel } from "./exportInventoryHistoryExcel";
import InventoryHistoryHeader from "./InventoryHistoryHeader";
import InventoryHistoryTable from "./InventoryHistoryTable";

const InventoryHistoryReport = () => {
  const gridApiRef = useRef(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [displayedCount, setDisplayedCount] = useState(0);

  const {
    data: response,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetInventoryHistoryQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [exportExcelMutation, { isLoading: isExporting }] =
    useExportInventoryHistoryExcelMutation();

  const history = useMemo(
    () => (Array.isArray(response) ? response : response?.data || []),
    [response],
  );

  const memoizedHistory = useMemo(
    () =>
      Array.isArray(history)
        ? history.map((h, idx) => ({
          ...h,
          sno: idx + 1,
          created_date: h.created_at
            ? dayjs(h.created_at).format("YYYY-MM-DD")
            : "-",
          created_time: h.created_at
            ? dayjs(h.created_at).format("h:mm a")
            : "-",
        }))
        : [],
    [history],
  );

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

    await downloadInventoryHistoryExcel(exportExcelMutation, {
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
    gridApiRef.current.forEachNode((node) => {
      node.setSelected(false);
    });
    setSelectedRows([]);
  }, []);

  if (isLoading) {
    return <LoadingState message="Loading Inventory History..." />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        description="An error occurred while fetching inventory history."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <InventoryHistoryHeader
        displayedCount={displayedCount}
        selectedRows={selectedRows}
        isAllSelected={isAllSelected}
        isExporting={isExporting}
        rows={memoizedHistory}
        stats={response?.totals}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={handleClearSelection}
        onExportExcel={handleExportExcel}
      />

      <InventoryHistoryTable
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

export default InventoryHistoryReport;
