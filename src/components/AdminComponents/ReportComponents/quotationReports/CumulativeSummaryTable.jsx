import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import ReusableTable from "@/components/ReusableComponents/ReusableTable";
import { formatCurrency, defaultReportColDef } from "./quotationReportUtils";

const CumulativeSummaryTable = ({ data = [] }) => {
  const columnDefs = useMemo(
    () => [
      {
        headerName: "SL.NO",
        flex: 0.2,
        minWidth: 70,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (p) => (
          <span className="font-semibold text-slate-600 text-[10px]">
            {(p.node?.rowIndex ?? 0) + 1}
          </span>
        ),
      },
      {
        headerName: "PARTICULARS",
        field: "label",
        flex: 1.5,
        minWidth: 220,
        wrapText: true,
        autoHeight: true,
        headerClass: "!text-left !justify-start pl-1",
        cellClass: "!text-left !justify-start !pl-1 font-semibold text-slate-800 text-[10px] py-1 whitespace-normal break-words leading-relaxed",
        cellRenderer: (p) => (
          <span className="whitespace-normal break-words leading-relaxed block">
            {p.value}
          </span>
        ),
      },
      {
        headerName: "COUNT",
        field: "count",
        flex: 0.8,
        minWidth: 90,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center",
        cellRenderer: (p) => (
          <span className="inline-block px-1 py-0.5 rounded text-slate-800 font-semibold text-[10px] bg-slate-100 border border-slate-200">
            {p.value ?? "-"}
          </span>
        ),
      },
      {
        headerName: "VALUE",
        field: "value",
        flex: 1.6,
        minWidth: 240,
        autoHeight: true,
        wrapText: true,
        headerClass: "ag-center-header",
        cellClass: "ag-center-cell !flex !items-center !justify-center py-1 whitespace-normal break-words",
        cellRenderer: (p) => {
          if (Array.isArray(p.value)) {
            return (
              <div className="flex flex-col gap-1 py-1 px-1 text-left w-full">
                {p.value.map((c, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center justify-between gap-2 bg-blue-50/80 text-blue-900 border border-blue-200/80 px-2 py-0. rounded text-[10px] font-medium shadow-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon icon="lucide:building-2" className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="font-semibold text-slate-800 break-words">{c.company_name}</span>
                    </div>
                    <span className="font-bold text-blue-800 shrink-0 ml-2">
                      {formatCurrency(c.value)}
                    </span>
                  </div>
                ))}
              </div>
            );
          }
          return (
            <div className="w-full text-center flex justify-center items-center font-bold text-slate-900 text-[10px]">
              {formatCurrency(p.value)}
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="bg-white rounded-md shadow-xs border border-slate-200 overflow-hidden h-auto">
      <div className="!bg-primary text-white px-3 py-2 font-semibold text-xs flex items-center justify-start gap-1.5">
        <Icon icon="lucide:bar-chart-3" className="w-4 h-4 text-white shrink-0" />
        <span>CUMULATIVE SUMMARY</span>
      </div>
      <ReusableTable
        rowData={data}
        columnDefs={columnDefs}
        defaultColDef={defaultReportColDef}
        rowModelType="clientSide"
        pagination={false}
        persistState={false}
        containerClassName="w-full relative overflow-hidden h-auto"
        domLayout="autoHeight"
      />
    </div>
  );
};

export default CumulativeSummaryTable;
