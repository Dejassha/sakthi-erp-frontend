import { useMemo } from "react";
import { Tag } from "antd";
import { Icon } from "@iconify/react";
import ReusableTable from "@/components/ReusableComponents/ReusableTable";
import { formatCurrency, defaultReportColDef } from "./quotationReportUtils";

const MonthlyStatisticsTable = ({ data = [] }) => {
  const columnDefs = useMemo(
    () => [
      {
        headerName: "MONTH/YEAR",
        field: "month",
        flex: 0.9,
        minWidth: 90,
        cellRenderer: (p) => (
          <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-[10px]">
            {p.value}
          </span>
        ),
      },
      {
        headerName: "QUOTES SENT",
        field: "quotes_sent",
        flex: 1,
        minWidth: 100,
        cellRenderer: (p) => (
          <span className="font-semibold text-slate-700 text-[11px]">
            {p.value ?? 0}
          </span>
        ),
      },
      {
        headerName: "ORDERS RECEIVED",
        field: "orders_received",
        flex: 1.1,
        minWidth: 120,
        cellRenderer: (p) => (
          <span className="font-bold text-emerald-700 text-[11px]">
            {p.value ?? 0}
          </span>
        ),
      },
      {
        headerName: "LOST QUOTES",
        field: "lost_quotations",
        flex: 1,
        minWidth: 100,
        cellRenderer: (p) => (
          <span className="font-medium text-rose-600 text-[11px]">
            {p.value ?? 0}
          </span>
        ),
      },
      {
        headerName: "CONVERSION %",
        field: "conversion",
        flex: 1.1,
        minWidth: 110,
        cellRenderer: (p) => {
          const val = Number(p.value) || 0;
          let color = "orange";
          if (val >= 60) color = "green";
          else if (val >= 40) color = "blue";
          else if (val >= 20) color = "gold";

          return (
            <Tag
              color={color}
              className="font-bold !px-2 !py-0.5 !m-0 !text-[10px] leading-tight border"
            >
              {val.toFixed(2)}%
            </Tag>
          );
        },
      },
      {
        headerName: "QUOTE VALUE",
        field: "quote_value",
        flex: 1.3,
        minWidth: 130,
        headerClass: "!text-center !justify-center ",
        cellClass: "!text-center !justify-center font-semibold text-slate-800 text-[10px]",
        cellRenderer: (p) => (
          <span className="font-semibold text-slate-800 text-[10px]">
            {formatCurrency(p.value)}
          </span>
        ),
      },
      {
        headerName: "BILLED VALUE",
        field: "billed_value",
        flex: 1.3,
        minWidth: 130,
        headerClass: "!text-center !justify-center ",
        cellClass: "!text-center !justify-center font-semibold text-slate-800 text-[10px]",
        cellRenderer: (p) => (
          <span className="font-semibold text-slate-800 text-[10px]">
            {formatCurrency(p.value)}
          </span>
        ),
      },
    ],
    []
  );

  // Calculate totals
  const totals = useMemo(() => {
    let sent = 0;
    let orders = 0;
    let lost = 0;
    let quoteVal = 0;
    let billedVal = 0;

    data.forEach((r) => {
      sent += Number(r.quotes_sent) || 0;
      orders += Number(r.orders_received) || 0;
      lost += Number(r.lost_quotations) || 0;
      quoteVal += Number(r.quote_value) || 0;
      billedVal += Number(r.billed_value) || 0;
    });

    const conversion = sent > 0 ? (orders / sent) * 100 : 0;

    return {
      sent,
      orders,
      lost,
      conversion: conversion.toFixed(2),
      quoteVal,
      billedVal,
    };
  }, [data]);

  return (
    <div className="bg-white rounded-md shadow-xs border border-slate-200 overflow-hidden h-auto">
      <div className="!bg-primary text-white px-3 py-2 font-semibold text-xs flex items-center justify-start gap-1.5">
        <Icon icon="lucide:calendar" className="w-4 h-4 text-white shrink-0" />
        <span>MONTH WISE STATISTICS</span>
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

      {/* Summary Total Bar */}
      {data.length > 0 && (
        <div className="bg-slate-100/90 border-t border-slate-300 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase tracking-wide text-[11px]">
            <Icon icon="lucide:trending-up" className="w-3.5 h-3.5 text-primary" />
            <span>Cumulative Period Totals:</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="text-slate-600">
              Quotes: <strong className="text-slate-900 font-bold">{totals.sent}</strong>
            </span>
            <span className="text-slate-600">
              Orders Won: <strong className="text-emerald-700 font-bold">{totals.orders}</strong>
            </span>
            <span className="text-slate-600">
              Lost: <strong className="text-rose-600 font-bold">{totals.lost}</strong>
            </span>
            <span className="text-slate-600">
              Avg Conversion:{" "}
              <strong className="text-blue-800 font-bold bg-blue-100/80 px-2 py-0.5 rounded text-[10px] border border-blue-200">
                {totals.conversion}%
              </strong>
            </span>
            <span className="text-slate-600">
              Total Quote:{" "}
              <strong className="text-slate-900 font-bold">{formatCurrency(totals.quoteVal)}</strong>
            </span>
            <span className="text-slate-600">
              Total Billed:{" "}
              <strong className="text-emerald-800 font-bold">{formatCurrency(totals.billedVal)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyStatisticsTable;
