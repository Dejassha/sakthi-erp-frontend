import React, { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
// AG-Grid imports
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
// Styles
import "@/styles/aggrid.css";
// Components
import LoadingState from "@/pages/errorPage/LoadingState";
import ErrorState from "@/pages/errorPage/ErrorState";
import EmptyState from "@/pages/errorPage/EmptyState";

// Register AG Grid modules globally
ModuleRegistry.registerModules([AllCommunityModule]);

// Internal Default Column Definitions
const DEFAULT_TABLE_COL_DEF = {
  sortable: true,
  resizable: true,
  filter: true,
  wrapText: false,
  autoHeight: false,
  headerClass: "ag-center-header text-slate-600 font-semibold",
  cellClass: "ag-center-cell text-[11px] text-slate-700 font-normal",
  suppressMovable: true,
};

/**
 * ReusableTable Component
 * Universal AG Grid table wrapper that handles grid setup, loading overlays,
 * error states, empty state rendering, state persistence (search/filters across reload),
 * and automatic infinite row datasource management.
 */
const ReusableTable = ({
  columnDefs = [],
  defaultColDef = {},
  fetchData = null, // Async function: ({ page, pageSize, filters, sort }) => ({ rows, count })
  loading = false,
  loadingText = "Loading table data...",
  error = null,
  onRetry = null,
  emptyTitle = "No Records Found",
  emptyDescription = "There are no items to display.",
  emptyIcon = undefined,
  noRowsOverlayComponent = EmptyState,
  noRowsOverlayComponentParams = {},
  onGridReady: externalOnGridReady,
  onFilterChanged: externalOnFilterChanged,
  onSortChanged: externalOnSortChanged,
  persistState = true,
  persistKey = "table_state",
  rowModelType = "infinite",
  pagination = true,
  defaultPageSize = 20,
  pageSize = 20,
  pageSizeSelector = [20, 40, 60, 100, 250, 500],
  onPaginationChanged: externalOnPaginationChanged,
  cacheBlockSize,
  headerHeight = 22,
  rowHeight = 24,
  animateRows = true,
  domLayout,
  containerClassName = "w-full h-[75vh] relative rounded-lg overflow-hidden shadow-xs border border-gray-200",
  ...restProps
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPageSize = pageSize || defaultPageSize;
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);
  const [gridApi, setGridApi] = useState(null);
  const [totalCount, setTotalCount] = useState(null);
  const [isFetchingRows, setIsFetchingRows] = useState(false);

  // Combine global default column definitions with custom prop overrides
  const mergedDefaultColDef = {
    ...DEFAULT_TABLE_COL_DEF,
    ...defaultColDef,
  };

  // Combine empty state params
  const mergedEmptyParams = {
    title: emptyTitle,
    description: emptyDescription,
    icon: emptyIcon,
    showHomeButton: false,
    ...noRowsOverlayComponentParams,
  };

  // Internal grid ready handler with Filter & Sort Restoration
  const handleGridReady = useCallback(
    (params) => {
      setGridApi(params.api);

      if (persistState) {
        try {
          const urlFilters = searchParams.get("filters");
          const urlSort = searchParams.get("sort");
          const storageKey = `ag_grid_${persistKey}`;

          let filterModel = null;
          let sortModel = null;

          const safeJsonParse = (str) => {
            if (!str) return null;
            try {
              return JSON.parse(str);
            } catch {
              try {
                return JSON.parse(decodeURIComponent(str));
              } catch {
                return null;
              }
            }
          };

          if (urlFilters) {
            filterModel = safeJsonParse(urlFilters);
          } else {
            const saved = sessionStorage.getItem(storageKey);
            if (saved) {
              const parsed = safeJsonParse(saved);
              if (parsed) {
                filterModel = parsed.filterModel;
                sortModel = parsed.sortModel;
              }
            }
          }

          if (urlSort && !sortModel) {
            sortModel = safeJsonParse(urlSort);
          }

          if (filterModel && Object.keys(filterModel).length > 0) {
            params.api.setFilterModel(filterModel);
          }

          if (sortModel && sortModel.length > 0) {
            params.api.applyColumnState({
              state: sortModel,
              defaultState: { sort: null },
            });
          }
        } catch (e) {
          console.warn("Could not restore table filter/sort state:", e);
        }
      }

      if (typeof externalOnGridReady === "function") {
        externalOnGridReady(params);
      }
    },
    [externalOnGridReady, searchParams, persistState, persistKey],
  );

  // Internal filter changed handler with State Persistence
  const handleFilterChanged = useCallback(
    (params) => {
      if (persistState) {
        try {
          const filterModel = params.api.getFilterModel();
          const hasFilters =
            filterModel && Object.keys(filterModel).length > 0;
          const storageKey = `ag_grid_${persistKey}`;

          const existingStr = sessionStorage.getItem(storageKey);
          const existing = existingStr ? JSON.parse(existingStr) : {};
          existing.filterModel = filterModel;
          sessionStorage.setItem(storageKey, JSON.stringify(existing));

          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              if (hasFilters) {
                next.set("filters", JSON.stringify(filterModel));
              } else {
                next.delete("filters");
              }
              return next;
            },
            { replace: true },
          );
        } catch (e) {
          console.warn("Could not persist table filter state:", e);
        }
      }

      if (typeof externalOnFilterChanged === "function") {
        externalOnFilterChanged(params);
      }
    },
    [persistState, persistKey, setSearchParams, externalOnFilterChanged],
  );

  // Internal sort changed handler with State Persistence
  const handleSortChanged = useCallback(
    (params) => {
      if (persistState) {
        try {
          const columnState = params.api.getColumnState();
          const sortModel = columnState.filter((c) => !!c.sort);
          const hasSort = sortModel.length > 0;
          const storageKey = `ag_grid_${persistKey}`;

          const existingStr = sessionStorage.getItem(storageKey);
          const existing = existingStr ? JSON.parse(existingStr) : {};
          existing.sortModel = sortModel;
          sessionStorage.setItem(storageKey, JSON.stringify(existing));

          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              if (hasSort) {
                next.set("sort", JSON.stringify(sortModel));
              } else {
                next.delete("sort");
              }
              return next;
            },
            { replace: true },
          );
        } catch (e) {
          console.warn("Could not persist table sort state:", e);
        }
      }

      if (typeof externalOnSortChanged === "function") {
        externalOnSortChanged(params);
      }
    },
    [persistState, persistKey, setSearchParams, externalOnSortChanged],
  );

  // Internal pagination changed handler
  const handlePaginationChanged = useCallback(
    (params) => {
      const newSize = params.api.paginationGetPageSize();
      if (newSize && newSize !== internalPageSize) {
        setInternalPageSize(newSize);
      }
      if (typeof externalOnPaginationChanged === "function") {
        externalOnPaginationChanged(params);
      }
    },
    [internalPageSize, externalOnPaginationChanged],
  );

  // Automatic Data Source Binding if fetchData prop is provided
  const updateDatasource = useCallback(() => {
    if (!gridApi || !fetchData || rowModelType !== "infinite") return;

    const datasource = {
      getRows: async (getRowParams) => {
        setIsFetchingRows(true);
        const pageNum =
          Math.floor(getRowParams.startRow / internalPageSize) + 1;
        const filterModel = getRowParams.filterModel;
        const sortModel = getRowParams.sortModel;
        const filtersStr =
          filterModel && Object.keys(filterModel).length > 0
            ? JSON.stringify(filterModel)
            : undefined;
        const sortStr =
          sortModel && sortModel.length > 0
            ? JSON.stringify(sortModel)
            : undefined;

        try {
          const res = await fetchData({
            page: pageNum,
            pageSize: internalPageSize,
            filters: filtersStr,
            sort: sortStr,
          });
          const rows = res.rows || res.results || [];
          const count = res.count ?? res.totalCount ?? 0;
          setTotalCount(count);
          getRowParams.successCallback(rows, count);
        } catch {
          getRowParams.failCallback();
        } finally {
          setIsFetchingRows(false);
        }
      },
    };

    gridApi.setGridOption("datasource", datasource);
  }, [gridApi, fetchData, rowModelType, internalPageSize]);

  useEffect(() => {
    updateDatasource();
  }, [updateDatasource]);

  // Handle Retry Action
  const handleRetry = useCallback(() => {
    if (typeof onRetry === "function") {
      onRetry();
    } else {
      updateDatasource();
    }
  }, [onRetry, updateDatasource]);

  // Handle Error State
  if (error) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center p-4">
        <ErrorState
          error={error}
          onRetry={handleRetry}
          showHomeButton={false}
        />
      </div>
    );
  }

  const effectiveRowModelType =
    rowModelType === "client" || rowModelType === "clientSide"
      ? "clientSide"
      : restProps.rowData !== undefined
      ? "clientSide"
      : rowModelType || "infinite";

  const effectiveTotalCount =
    totalCount !== null
      ? totalCount
      : restProps.rowData
      ? restProps.rowData.length
      : null;

  const shouldSuppressPagination =
    restProps.suppressPaginationPanel !== undefined
      ? restProps.suppressPaginationPanel
      : pagination === false || (effectiveTotalCount !== null && effectiveTotalCount <= internalPageSize);

  const isAutoHeight = domLayout === "autoHeight" || restProps.domLayout === "autoHeight";
  const effectiveContainerClass = isAutoHeight
    ? `${containerClassName.replace(/\bh-\[[^\]]+\]\b/g, "").replace(/\bh-full\b/g, "")} h-auto`.trim()
    : containerClassName;

  return (
    <div className={effectiveContainerClass}>
      {(loading || isFetchingRows) && (
        <div className="absolute inset-0 z-20 bg-white/75 backdrop-blur-[1px] flex items-center justify-center transition-all duration-200">
          <LoadingState message={loadingText} fullPage={false} />
        </div>
      )}
      <AgGridReact
        columnDefs={columnDefs}
        defaultColDef={mergedDefaultColDef}
        rowModelType={effectiveRowModelType}
        domLayout={domLayout}
        pagination={pagination}
        paginationPageSize={internalPageSize}
        paginationPageSizeSelector={pageSizeSelector}
        suppressPaginationPanel={shouldSuppressPagination}
        onGridReady={handleGridReady}
        onFilterChanged={handleFilterChanged}
        onSortChanged={handleSortChanged}
        onPaginationChanged={handlePaginationChanged}
        cacheBlockSize={cacheBlockSize || internalPageSize}
        animateRows={animateRows}
        headerHeight={headerHeight}
        rowHeight={rowHeight}
        noRowsOverlayComponent={noRowsOverlayComponent}
        noRowsOverlayComponentParams={mergedEmptyParams}
        {...restProps}
      />
    </div>
  );
};

export default ReusableTable;
