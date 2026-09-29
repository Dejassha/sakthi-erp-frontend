import React, { useState, useMemo, useEffect, useRef } from "react";
import { Table, DatePicker, InputNumber, Button, Card, Tag, Drawer, Tooltip, message } from "antd";
import {
  Layers,
  Scissors,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  TrendingUp,
  Clock,
  Zap,
  Target,
  ChevronRight,
} from "lucide-react";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useLazyGetOverallDetailsQuery } from "@/store/services/admin.api";
import { parseTimeToMinutes } from "./utils/productsTableUtils";

const { MonthPicker, RangePicker } = DatePicker;

const DEFAULT_BINS = [
  { id: "band1", label: "≤2 mm", min: 0, max: 2 },
  { id: "band2", label: "2.1–4 mm", min: 2, max: 4 },
  { id: "band3", label: "4.1–6 mm", min: 4, max: 6 },
  { id: "band4", label: "6.1–10 mm", min: 6, max: 10 },
  { id: "band5", label: "10.1–16 mm", min: 10, max: 16 },
  { id: "band6", label: "16.1–25 mm", min: 16, max: 25 },
  { id: "band7", label: ">25 mm", min: 25, max: 10000 },
];

const MaterialUsageReport = () => {
  // Filters state
  const [filterMode, setFilterMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [dateRange, setDateRange] = useState(null);

  // Editable thickness bins
  const [bins, setBins] = useState(DEFAULT_BINS);

  // Data state
  const [rawData, setRawData] = useState([]);
  const [selectedBandForDrawer, setSelectedBandForDrawer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const printTableRef = useRef(null);

  // API
  const [triggerGetOverallDetails, { isLoading: isFetchingData }] = useLazyGetOverallDetailsQuery();

  // Construct filters payload for API
  const apiFilters = useMemo(() => {
    const filtersObj = {};

    if (filterMode === "month" && selectedMonth) {
      const startOfMonth = selectedMonth.startOf("month").format("YYYY-MM-DD");
      const endOfMonth = selectedMonth.endOf("month").format("YYYY-MM-DD");
      filtersObj["date"] = {
        filterType: "date",
        type: "inRange",
        dateFrom: startOfMonth,
        dateTo: endOfMonth,
      };
    } else if (filterMode === "range" && dateRange && dateRange[0] && dateRange[1]) {
      filtersObj["date"] = {
        filterType: "date",
        type: "inRange",
        dateFrom: dateRange[0].format("YYYY-MM-DD"),
        dateTo: dateRange[1].format("YYYY-MM-DD"),
      };
    }

    return filtersObj;
  }, [filterMode, selectedMonth, dateRange]);

  // Load manufacturing records
  const loadData = async () => {
    try {
      const filtersStr = Object.keys(apiFilters).length > 0 ? JSON.stringify(apiFilters) : undefined;
      const response = await triggerGetOverallDetails({
        page: 1,
        pageSize: 10000,
        filters: filtersStr,
      }).unwrap();

      setRawData(response.rows || []);
    } catch (err) {
      console.error("Failed to load material usage data:", err);
      message.error("Failed to load material usage data.");
    }
  };

  useEffect(() => {
    loadData();
  }, [apiFilters]);

  // Calculate stats per thickness band
  const materialUsageData = useMemo(() => {
    return bins.map((bin, index) => {
      let jobsCount = 0;
      let sheetsProcessed = 0;
      let cuttingLength = 0;
      let piercingCount = 0;
      let runtimeMinutes = 0;
      let plannedMinutes = 0;
      const bandRows = [];

      rawData.forEach((row) => {
        const thick = Number(row.thick || 0);

        // Fall in bin: if first band, include min (min <= thick <= max), otherwise min < thick <= max
        const isInBin = index === 0 ? thick >= bin.min && thick <= bin.max : thick > bin.min && thick <= bin.max;

        if (isInBin) {
          jobsCount += 1;
          bandRows.push(row);

          // Sheets processed
          const sheets = Number(row.total_no_of_sheets ?? row.number_of_sheets ?? row.processed_quantity ?? row.quantity ?? 0);
          sheetsProcessed += isNaN(sheets) ? 0 : sheets;

          // Cutting length (m)
          const meters = Number(row.total_meters ?? row.cut_length_per_sheet ?? 0);
          cuttingLength += isNaN(meters) ? 0 : meters;

          // Piercing count
          const piercing = Number(row.total_piercing ?? row.pierce_per_sheet ?? 0);
          piercingCount += isNaN(piercing) ? 0 : piercing;

          // Runtime minutes
          const mins = parseTimeToMinutes(row.machine_runtime);
          runtimeMinutes += mins;

          // Planned hours / minutes
          if (row.total_planned_hours) {
            plannedMinutes += parseTimeToMinutes(row.total_planned_hours);
          } else if (row.processed_mins_per_sheet) {
            const minsPerSheet = Number(row.processed_mins_per_sheet || 0);
            plannedMinutes += isNaN(minsPerSheet) ? 0 : minsPerSheet * (sheets || 1);
          }
        }
      });

      const runtimeHours = runtimeMinutes / 60;
      const plannedHours = plannedMinutes / 60;
      const avgCuttingLengthPerHr = runtimeHours > 0 ? cuttingLength / runtimeHours : 0;
      const avgPiercingPerHr = runtimeHours > 0 ? piercingCount / runtimeHours : 0;
      const avgCutLengthPerSheet = sheetsProcessed > 0 ? cuttingLength / sheetsProcessed : 0;

      return {
        key: bin.id,
        id: bin.id,
        bandLabel: bin.label,
        min: bin.min,
        max: bin.max,
        jobsCount,
        sheetsProcessed,
        cuttingLength,
        piercingCount,
        runtimeHours,
        avgCuttingLengthPerHr,
        avgPiercingPerHr,
        avgCutLengthPerSheet,
        plannedHours,
        rawRows: bandRows,
      };
    });
  }, [rawData, bins]);

  // Overall totals across all bins
  const overallTotals = useMemo(() => {
    let totalJobs = 0;
    let totalSheets = 0;
    let totalCuttingLength = 0;
    let totalPiercings = 0;
    let totalRuntimeHours = 0;
    let totalPlannedHours = 0;

    materialUsageData.forEach((r) => {
      totalJobs += r.jobsCount;
      totalSheets += r.sheetsProcessed;
      totalCuttingLength += r.cuttingLength;
      totalPiercings += r.piercingCount;
      totalRuntimeHours += r.runtimeHours;
      totalPlannedHours += r.plannedHours;
    });

    const overallAvgCuttingLengthPerHr = totalRuntimeHours > 0 ? totalCuttingLength / totalRuntimeHours : 0;
    const overallAvgPiercingPerHr = totalRuntimeHours > 0 ? totalPiercings / totalRuntimeHours : 0;
    const overallAvgCutLengthPerSheet = totalSheets > 0 ? totalCuttingLength / totalSheets : 0;

    return {
      totalJobs,
      totalSheets,
      totalCuttingLength,
      totalPiercings,
      totalRuntimeHours,
      overallAvgCuttingLengthPerHr,
      overallAvgPiercingPerHr,
      overallAvgCutLengthPerSheet,
      totalPlannedHours,
    };
  }, [materialUsageData]);

  // Cutting Length Heatmap color styling
  const getCuttingLengthStyle = (meters) => {
    if (meters <= 0) {
      return "bg-[#f8696b]/30 text-rose-900 border-[#f8696b]/50";
    }
    if (meters >= 25000) {
      return "bg-[#57bb8a]/40 text-emerald-950 border-[#57bb8a] font-bold";
    }
    if (meters >= 18000) {
      return "bg-[#a6d96a]/40 text-emerald-900 border-[#a6d96a] font-bold";
    }
    if (meters >= 10000) {
      return "bg-[#fee08b]/50 text-amber-950 border-[#fee08b] font-bold";
    }
    if (meters >= 4000) {
      return "bg-[#fdae61]/40 text-orange-950 border-[#fdae61] font-semibold";
    }
    return "bg-[#f8696b]/30 text-rose-950 border-[#f8696b] font-semibold";
  };

  // Update bin values
  const handleBinChange = (id, field, val) => {
    if (val === null || isNaN(val)) return;
    setBins((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          return { ...b, [field]: val };
        }
        return b;
      })
    );
  };

  // Reset Bins & Filters
  const handleReset = () => {
    setFilterMode("month");
    setSelectedMonth(dayjs());
    setDateRange(null);
    setBins(DEFAULT_BINS);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const monthLabel =
        filterMode === "month" && selectedMonth
          ? selectedMonth.format("MMM-YYYY")
          : dateRange && dateRange[0] && dateRange[1]
          ? `${dateRange[0].format("DD/MM/YYYY")} to ${dateRange[1].format("DD/MM/YYYY")}`
          : "All Time";

      const headers = [
        "Thickness Band",
        "Min (mm)",
        "Max (mm)",
        "Jobs",
        "Sheets Processed",
        "Cutting Length (m)",
        "Piercing Count",
        "Runtime (Hrs)",
        "Avg Cutting Length / Hr",
        "Avg Piercing / Hr",
        "Avg Cut Length / Sheet (m)",
        "Planned Hours",
      ];

      const dataRows = materialUsageData.map((row) => [
        row.bandLabel,
        row.min,
        row.max,
        row.jobsCount,
        Number(row.sheetsProcessed.toFixed(1)),
        Number(row.cuttingLength.toFixed(1)),
        row.piercingCount,
        Number(row.runtimeHours.toFixed(2)),
        Number(row.avgCuttingLengthPerHr.toFixed(1)),
        Number(row.avgPiercingPerHr.toFixed(1)),
        Number(row.avgCutLengthPerSheet.toFixed(2)),
        Number(row.plannedHours.toFixed(1)),
      ]);

      const totalRow = [
        "TOTAL",
        "",
        "",
        overallTotals.totalJobs,
        Number(overallTotals.totalSheets.toFixed(1)),
        Number(overallTotals.totalCuttingLength.toFixed(1)),
        overallTotals.totalPiercings,
        Number(overallTotals.totalRuntimeHours.toFixed(2)),
        Number(overallTotals.overallAvgCuttingLengthPerHr.toFixed(1)),
        Number(overallTotals.overallAvgPiercingPerHr.toFixed(1)),
        Number(overallTotals.overallAvgCutLengthPerSheet.toFixed(2)),
        Number(overallTotals.totalPlannedHours.toFixed(1)),
      ];

      const sheetData = [
        ["MATERIAL USAGE — cutting perimeter & piercing, thickness-wise"],
        [],
        [
          `Report Month: ${monthLabel}`,
          "",
          "",
          "Bins (Min/Max mm) are editable. A job falls in a bin when Min < Thickness <= Max. Average Cutting Length/Hr and Average Piercing/Hr are the speed columns, thickness-wise.",
        ],
        [],
        headers,
        ...dataRows,
        totalRow,
        [],
        [
          'Cutting Length = total perimeter cut (m); Piercing Count = total pierce points. Avg Cutting Length/Hr and Avg Piercing/Hr are the two new speed columns you asked for — both fall as thickness rises, which is expected. ">25 mm" also catches the handful of outlier thickness values flagged in the README.',
        ],
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      worksheet["!cols"] = [
        { wch: 18 }, // Thickness Band
        { wch: 12 }, // Min
        { wch: 12 }, // Max
        { wch: 10 }, // Jobs
        { wch: 18 }, // Sheets Processed
        { wch: 20 }, // Cutting Length
        { wch: 16 }, // Piercing Count
        { wch: 16 }, // Runtime Hours
        { wch: 24 }, // Avg Cutting Length / Hr
        { wch: 20 }, // Avg Piercing / Hr
        { wch: 26 }, // Avg Cut Length / Sheet
        { wch: 16 }, // Planned Hours
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Material Usage");

      const fileName = `Material_Usage_${monthLabel.replace(/[\s/]/g, "_")}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      message.success("Excel report exported successfully!");
    } catch (err) {
      console.error("Export to Excel failed:", err);
      message.error("Failed to export Excel report.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Ant Design Columns Definition
  const columns = [
    {
      title: "Thickness Band",
      dataIndex: "bandLabel",
      key: "bandLabel",
      fixed: "left",
      width: 140,
      render: (text, record) => (
        <div
          onClick={() => {
            setSelectedBandForDrawer(record);
            setIsDrawerOpen(true);
          }}
          className="flex items-center justify-between group cursor-pointer font-bold text-slate-800 hover:text-blue-600 transition-colors"
        >
          <span>{text}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      ),
    },
    {
      title: (
        <Tooltip title="Minimum thickness in mm for this band (exclusive, except for first band).">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Min (mm)
          </span>
        </Tooltip>
      ),
      dataIndex: "min",
      key: "min",
      align: "right",
      width: 110,
      render: (val, record) => (
        <div className="flex justify-end">
          <InputNumber
            min={0}
            max={record.max}
            step={0.5}
            value={val}
            onChange={(newVal) => handleBinChange(record.id, "min", newVal)}
            className="w-16 h-7 text-xs font-bold bg-amber-50/80 border-amber-300"
          />
        </div>
      ),
    },
    {
      title: (
        <Tooltip title="Maximum thickness in mm for this band (inclusive).">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Max (mm)
          </span>
        </Tooltip>
      ),
      dataIndex: "max",
      key: "max",
      align: "right",
      width: 110,
      render: (val, record) => (
        <div className="flex justify-end">
          <InputNumber
            min={record.min}
            max={10000}
            step={0.5}
            value={val}
            onChange={(newVal) => handleBinChange(record.id, "max", newVal)}
            className="w-16 h-7 text-xs font-bold bg-amber-50/80 border-amber-300"
          />
        </div>
      ),
    },
    {
      title: "Jobs",
      dataIndex: "jobsCount",
      key: "jobsCount",
      align: "right",
      width: 90,
      render: (val) => <span className="font-medium text-slate-700">{val.toLocaleString()}</span>,
    },
    {
      title: "Sheets Processed",
      dataIndex: "sheetsProcessed",
      key: "sheetsProcessed",
      align: "right",
      width: 150,
      render: (val) => (
        <span className="font-medium text-slate-700">
          {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Total cut perimeter in meters">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Cutting Length (m)
          </span>
        </Tooltip>
      ),
      dataIndex: "cuttingLength",
      key: "cuttingLength",
      align: "right",
      width: 170,
      render: (val) => {
        const styleClass = getCuttingLengthStyle(val);
        return (
          <div className="flex justify-end">
            <span className={`px-2.5 py-1 rounded border text-xs text-right inline-block min-w-[85px] ${styleClass}`}>
              {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>
        );
      },
    },
    {
      title: "Piercing Count",
      dataIndex: "piercingCount",
      key: "piercingCount",
      align: "right",
      width: 140,
      render: (val) => <span className="font-medium text-slate-700">{val.toLocaleString()}</span>,
    },
    {
      title: "Runtime (Hrs)",
      dataIndex: "runtimeHours",
      key: "runtimeHours",
      align: "right",
      width: 140,
      render: (val) => <span className="font-medium text-slate-700">{val.toFixed(2)}</span>,
    },
    {
      title: (
        <Tooltip title="Cutting Length ÷ Runtime Hours. Speed benchmark for this thickness band.">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Avg Cutting Length / Hr
          </span>
        </Tooltip>
      ),
      dataIndex: "avgCuttingLengthPerHr",
      key: "avgCuttingLengthPerHr",
      align: "right",
      width: 190,
      render: (val) => (
        <span className="font-semibold text-slate-800">{val.toFixed(1)}</span>
      ),
    },
    {
      title: (
        <Tooltip title="Piercing Count ÷ Runtime Hours">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Avg Piercing / Hr
          </span>
        </Tooltip>
      ),
      dataIndex: "avgPiercingPerHr",
      key: "avgPiercingPerHr",
      align: "right",
      width: 160,
      render: (val) => (
        <span className="font-semibold text-slate-800">
          {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Cutting Length ÷ Sheets Processed">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Avg Cut Length / Sheet (m)
          </span>
        </Tooltip>
      ),
      dataIndex: "avgCutLengthPerSheet",
      key: "avgCutLengthPerSheet",
      align: "right",
      width: 190,
      render: (val) => (
        <span className="font-semibold text-slate-800">{val.toFixed(2)}</span>
      ),
    },
    {
      title: (
        <Tooltip title="Programmed / planned cutting duration">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Planned Hours
          </span>
        </Tooltip>
      ),
      dataIndex: "plannedHours",
      key: "plannedHours",
      align: "right",
      width: 140,
      render: (val) => (
        <span className="font-medium text-slate-700">{val.toFixed(1)}</span>
      ),
    },
  ];

  const currentPeriodLabel =
    filterMode === "month" && selectedMonth
      ? selectedMonth.format("MMM-YYYY")
      : dateRange && dateRange[0] && dateRange[1]
      ? `${dateRange[0].format("DD/MM/YYYY")} - ${dateRange[1].format("DD/MM/YYYY")}`
      : "All Dates";

  return (
    <div className="flex flex-col gap-6" ref={printTableRef}>
      {/* 1. Header Banner */}
      <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
        <div className="bg-[#174478] px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-200" />
              <h1 className="text-lg sm:text-xl font-bold tracking-wide uppercase">
                MATERIAL USAGE — cutting perimeter & piercing, thickness-wise
              </h1>
            </div>
            <p className="text-xs text-blue-100/90 mt-1 max-w-4xl leading-relaxed">
              Bins (Min/Max mm) are editable. A job falls in a bin when Min &lt; Thickness &le; Max. Average Cutting Length/Hr
              and Average Piercing/Hr are the speed columns, thickness-wise.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleExportExcel}
              icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              className="bg-white hover:bg-slate-50 text-slate-800 border-none font-medium text-xs h-9"
            >
              Export Excel
            </Button>
            <Button
              onClick={handlePrint}
              icon={<Printer className="w-4 h-4 text-blue-600" />}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium text-xs h-9"
            >
              Print
            </Button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Mode Selector */}
            <div className="flex items-center bg-white rounded-lg border p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setFilterMode("month")}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  filterMode === "month" ? "bg-[#174478] text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Month View
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("range")}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  filterMode === "range" ? "bg-[#174478] text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Date Pickers */}
            {filterMode === "month" ? (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-2xs">
                <span className="text-xs font-bold text-slate-700">Report Month:</span>
                <MonthPicker
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  format="MMM-YYYY"
                  allowClear={false}
                  className="w-36 h-8 text-xs font-semibold"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-2xs">
                <span className="text-xs font-bold text-slate-700">Date Range:</span>
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  format="DD/MM/YYYY"
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleReset}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              className="text-xs h-8 text-slate-600 hover:text-slate-900"
            >
              Reset Bins
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Cut Perimeter */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Cut Perimeter</span>
            <Scissors className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-900">
              {overallTotals.totalCuttingLength.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
              <span className="text-xs font-normal text-slate-500">m</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            ≈ {(overallTotals.totalCuttingLength / 1000).toFixed(2)} km in {currentPeriodLabel}
          </p>
        </Card>

        {/* Total Piercing Count */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Piercing</span>
            <Target className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-900">
              {overallTotals.totalPiercings.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Across {overallTotals.totalJobs} jobs</p>
        </Card>

        {/* Fleet Speed (Cutting Rate) */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Cutting Speed</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-emerald-700">
              {overallTotals.overallAvgCuttingLengthPerHr.toFixed(1)}{" "}
              <span className="text-xs font-normal text-slate-500">m/hr</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Overall fleet cutting rate</p>
        </Card>

        {/* Fleet Piercing Rate */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Piercing Rate</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-amber-800">
              {overallTotals.overallAvgPiercingPerHr.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
              <span className="text-xs font-normal text-slate-500">/hr</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Overall piercing rate</p>
        </Card>

        {/* Total Planned Hours */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Planned Hours</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-900">
              {overallTotals.totalPlannedHours.toFixed(1)}{" "}
              <span className="text-xs font-normal text-slate-500">Hrs</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Programmer estimates</p>
        </Card>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 font-medium">
            <span>Material Usage & Cutting Parameters for <strong>{currentPeriodLabel}</strong></span>
          </div>
          <div className="text-slate-400 text-[11px]">
            Yellow input cells allow custom thickness ranges • Click any row for details
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={materialUsageData}
          loading={isFetchingData}
          pagination={false}
          scroll={{ x: 1600 }}
          rowClassName={(_record, index) =>
            index % 2 === 0 ? "bg-white hover:bg-blue-50/30 transition-colors" : "bg-slate-50/40 hover:bg-blue-50/30 transition-colors"
          }
          summary={() => (
            <Table.Summary fixed="bottom">
              <Table.Summary.Row className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                <Table.Summary.Cell index={0}>
                  <span className="font-extrabold text-slate-900 tracking-wider text-xs uppercase">
                    TOTAL
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <span className="text-slate-400 font-normal text-xs">—</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span className="text-slate-400 font-normal text-xs">—</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <span className="font-bold text-slate-900">{overallTotals.totalJobs.toLocaleString()}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <span className="font-bold text-slate-900">
                    {overallTotals.totalSheets.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <span className="font-bold text-slate-900">
                    {overallTotals.totalCuttingLength.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <span className="font-bold text-slate-900">{overallTotals.totalPiercings.toLocaleString()}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <span className="font-bold text-slate-900">{overallTotals.totalRuntimeHours.toFixed(2)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  <span className="font-bold text-slate-900">{overallTotals.overallAvgCuttingLengthPerHr.toFixed(1)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={9} align="right">
                  <span className="font-bold text-slate-900">
                    {overallTotals.overallAvgPiercingPerHr.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={10} align="right">
                  <span className="font-bold text-slate-900">{overallTotals.overallAvgCutLengthPerSheet.toFixed(2)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={11} align="right">
                  <span className="font-bold text-slate-900">{overallTotals.totalPlannedHours.toFixed(1)}</span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        {/* Footnote Explanation */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 leading-relaxed italic">
          <p>
            <strong>Cutting Length</strong> = total perimeter cut (m); <strong>Piercing Count</strong> = total pierce points.{" "}
            <strong>Avg Cutting Length/Hr</strong> and <strong>Avg Piercing/Hr</strong> are speed measures &mdash; both naturally
            scale with material thickness.
          </p>
        </div>
      </div>

      {/* 4. Drilldown Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <div>
              <span className="text-base font-bold text-slate-800">
                {selectedBandForDrawer?.bandLabel} &mdash; Job Records
              </span>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                {selectedBandForDrawer?.jobsCount} jobs in {currentPeriodLabel}
              </p>
            </div>
          </div>
        }
        placement="right"
        width={750}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
      >
        {selectedBandForDrawer && (
          <div className="flex flex-col gap-5">
            {/* Band mini-summary cards */}
            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Cut Perimeter</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedBandForDrawer.cuttingLength.toFixed(1)} m
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Piercings</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedBandForDrawer.piercingCount.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Cut Speed</div>
                <div className="text-sm font-bold text-emerald-700 mt-0.5">
                  {selectedBandForDrawer.avgCuttingLengthPerHr.toFixed(1)} m/hr
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Planned Time</div>
                <div className="text-sm font-bold text-indigo-700 mt-0.5">
                  {selectedBandForDrawer.plannedHours.toFixed(1)} hrs
                </div>
              </div>
            </div>

            {/* List of individual job records */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Thickness Records ({selectedBandForDrawer.rawRows.length})
              </h3>

              <div className="flex flex-col gap-2.5 max-h-[65vh] overflow-y-auto pr-1">
                {selectedBandForDrawer.rawRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs flex flex-col gap-2 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">
                          {String(row.company_name || "Unknown Company")}
                        </span>
                        {row.inward_slip_number ? (
                          <Tag color="blue" className="text-[10px]">
                            Slip #{String(row.inward_slip_number)}
                          </Tag>
                        ) : null}
                      </div>
                      <span className="text-[11px] text-slate-500">{String(row.date || row.machine_date || "")}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 text-[10px]">Machine:</span>{" "}
                        <span className="font-semibold text-slate-700">{String(row.machine_name || "—")}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Operator:</span>{" "}
                        <span className="font-semibold text-slate-700">{String(row.machine_operator || "—")}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Material:</span>{" "}
                        <span className="font-semibold text-slate-700">
                          {String(row.mat_type || "")} {row.thick ? `${row.thick}mm` : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Cut Length:</span>{" "}
                        <span className="font-semibold text-slate-800">
                          {Number(row.total_meters || 0).toFixed(1)} m
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Piercing:</span>{" "}
                        <span className="font-semibold text-slate-800">{Number(row.total_piercing || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Runtime:</span>{" "}
                        <span className="font-semibold text-slate-800">{String(row.machine_runtime || "00:00")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default MaterialUsageReport;
