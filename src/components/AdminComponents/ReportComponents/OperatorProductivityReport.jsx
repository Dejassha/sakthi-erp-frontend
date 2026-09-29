import React, { useState, useMemo, useEffect, useRef } from "react";
import { Table, DatePicker, Select, Input, Button, Card, Tag, Drawer, Tooltip, message } from "antd";
import {
  Search,
  Users,
  Gauge,
  Scissors,
  Timer,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  TrendingUp,
  Award,
  RotateCcw,
} from "lucide-react";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useLazyGetOverallDetailsQuery, useGetMachinesQuery, useGetOperatorsQuery } from "@/store/services/admin.api";
import { parseTimeToMinutes } from "./utils/productsTableUtils";

const { MonthPicker, RangePicker } = DatePicker;

const OperatorProductivityReport = () => {
  // Filters state
  const [filterMode, setFilterMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [dateRange, setDateRange] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Data state
  const [rawData, setRawData] = useState([]);
  const [selectedOperatorForDrawer, setSelectedOperatorForDrawer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const printTableRef = useRef(null);

  // APIs
  const [triggerGetOverallDetails, { isLoading: isFetchingData }] = useLazyGetOverallDetailsQuery();
  const { data: machinesList = [] } = useGetMachinesQuery(undefined);
  const { data: registeredOperators = [] } = useGetOperatorsQuery(undefined);

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

    if (selectedMachine) {
      filtersObj["machine_name"] = {
        filterType: "text",
        type: "equals",
        filter: selectedMachine,
      };
    }

    return filtersObj;
  }, [filterMode, selectedMonth, dateRange, selectedMachine]);

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
      console.error("Failed to load operator productivity data:", err);
      message.error("Failed to load operator productivity data.");
    }
  };

  useEffect(() => {
    loadData();
  }, [apiFilters]);

  // Group and calculate statistics per operator
  const operatorStats = useMemo(() => {
    const operatorMap = new Map();

    // Group rows by operator
    rawData.forEach((row) => {
      const opName = (String(row.machine_operator || "").trim() || "Unassigned").toUpperCase();

      if (!operatorMap.has(opName)) {
        operatorMap.set(opName, {
          operator: opName,
          jobsCount: 0,
          sheetsProcessed: 0,
          cuttingLength: 0,
          piercingCount: 0,
          runtimeMinutes: 0,
          qaRejections: 0,
          rawRows: [],
        });
      }

      const entry = operatorMap.get(opName);
      entry.jobsCount += 1;
      entry.rawRows.push(row);

      // Sheets processed
      const sheets = Number(row.total_no_of_sheets ?? row.number_of_sheets ?? row.processed_quantity ?? row.quantity ?? 0);
      entry.sheetsProcessed += isNaN(sheets) ? 0 : sheets;

      // Cutting length (meters)
      const meters = Number(row.total_meters ?? row.cut_length_per_sheet ?? 0);
      entry.cuttingLength += isNaN(meters) ? 0 : meters;

      // Piercing count
      const piercing = Number(row.total_piercing ?? row.pierce_per_sheet ?? 0);
      entry.piercingCount += isNaN(piercing) ? 0 : piercing;

      // Runtime in minutes
      const mins = parseTimeToMinutes(row.machine_runtime);
      entry.runtimeMinutes += mins;

      // QA Rejection: QA status is not "completed" (or pending/rejected/rework)
      const qaStatus = String(row.qa_status || "").trim().toLowerCase();
      if (qaStatus && qaStatus !== "completed" && qaStatus !== "pass" && qaStatus !== "passed" && qaStatus !== "approved") {
        entry.qaRejections += 1;
      }
    });

    // Also ensure all registered operators appear even if they have 0 jobs (if no specific machine filter)
    if (!selectedMachine && registeredOperators.length > 0) {
      registeredOperators.forEach((op) => {
        const name = (op.operator_name || "").trim().toUpperCase();
        if (name && !operatorMap.has(name)) {
          operatorMap.set(name, {
            operator: name,
            jobsCount: 0,
            sheetsProcessed: 0,
            cuttingLength: 0,
            piercingCount: 0,
            runtimeMinutes: 0,
            qaRejections: 0,
            rawRows: [],
          });
        }
      });
    }

    // Calculate grand total cutting length for percentage share calculation
    let grandTotalCuttingLength = 0;
    operatorMap.forEach((entry) => {
      grandTotalCuttingLength += entry.cuttingLength;
    });

    // Convert map to list and compute rates
    const list = Array.from(operatorMap.values()).map((entry) => {
      const runtimeHours = entry.runtimeMinutes / 60;
      const outputRate = runtimeHours > 0 ? entry.cuttingLength / runtimeHours : 0;
      const piercingPerHour = runtimeHours > 0 ? entry.piercingCount / runtimeHours : 0;
      const shareOfCuttingLength = grandTotalCuttingLength > 0 ? (entry.cuttingLength / grandTotalCuttingLength) * 100 : 0;

      return {
        key: entry.operator,
        operator: entry.operator,
        jobsCount: entry.jobsCount,
        sheetsProcessed: entry.sheetsProcessed,
        cuttingLength: entry.cuttingLength,
        piercingCount: entry.piercingCount,
        runtimeHours,
        outputRate,
        piercingPerHour,
        shareOfCuttingLength,
        qaRejections: entry.qaRejections,
        rawRows: entry.rawRows,
      };
    });

    // Sort by cuttingLength descending
    return list.sort((a, b) => b.cuttingLength - a.cuttingLength);
  }, [rawData, registeredOperators, selectedMachine]);

  // Filtered by Search query
  const filteredOperatorStats = useMemo(() => {
    if (!searchQuery.trim()) return operatorStats;
    const q = searchQuery.toLowerCase().trim();
    return operatorStats.filter((op) => op.operator.toLowerCase().includes(q));
  }, [operatorStats, searchQuery]);

  // Overall totals
  const overallTotals = useMemo(() => {
    let totalJobs = 0;
    let totalSheets = 0;
    let totalCuttingLength = 0;
    let totalPiercings = 0;
    let totalRuntimeHours = 0;
    let totalQARejections = 0;

    operatorStats.forEach((op) => {
      totalJobs += op.jobsCount;
      totalSheets += op.sheetsProcessed;
      totalCuttingLength += op.cuttingLength;
      totalPiercings += op.piercingCount;
      totalRuntimeHours += op.runtimeHours;
      totalQARejections += op.qaRejections;
    });

    const overallOutputRate = totalRuntimeHours > 0 ? totalCuttingLength / totalRuntimeHours : 0;
    const overallPiercingPerHour = totalRuntimeHours > 0 ? totalPiercings / totalRuntimeHours : 0;

    return {
      totalJobs,
      totalSheets,
      totalCuttingLength,
      totalPiercings,
      totalRuntimeHours,
      overallOutputRate,
      overallPiercingPerHour,
      totalQARejections,
    };
  }, [operatorStats]);

  // Top performing operator
  const topOperator = useMemo(() => {
    const activeOps = operatorStats.filter((op) => op.runtimeHours > 0.5 && op.jobsCount > 0);
    if (!activeOps.length) return null;
    return activeOps.reduce((prev, current) => (current.outputRate > prev.outputRate ? current : prev), activeOps[0]);
  }, [operatorStats]);

  // Rate Color Helper matching the spreadsheet Heatmap styling
  const getRateBadgeStyle = (rate) => {
    if (rate <= 0) {
      return {
        bgClass: "bg-[#f8696b]/30 text-rose-900 border-[#f8696b]/50 font-bold",
      };
    }
    if (rate >= 500) {
      return {
        bgClass: "bg-[#57bb8a]/35 text-emerald-950 border-[#57bb8a] font-bold",
      };
    }
    if (rate >= 200) {
      return {
        bgClass: "bg-[#a6d96a]/35 text-emerald-900 border-[#a6d96a] font-bold",
      };
    }
    if (rate >= 140) {
      return {
        bgClass: "bg-[#fee08b]/50 text-amber-950 border-[#fee08b] font-bold",
      };
    }
    if (rate >= 100) {
      return {
        bgClass: "bg-[#fee08b]/35 text-amber-900 border-[#fee08b] font-bold",
      };
    }
    if (rate >= 50) {
      return {
        bgClass: "bg-[#fdae61]/35 text-orange-950 border-[#fdae61] font-bold",
      };
    }
    return {
      bgClass: "bg-[#f46d43]/35 text-rose-950 border-[#f46d43] font-bold",
    };
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilterMode("month");
    setSelectedMonth(dayjs());
    setDateRange(null);
    setSelectedMachine(null);
    setSearchQuery("");
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
        "Operator",
        "Jobs (records)",
        "Sheets Processed",
        "Cutting Length (m)",
        "Piercing Count",
        "Runtime (Hrs)",
        "Output Rate (m/hr)",
        "Piercing / Hr",
        "Share of Cutting Length %",
        "QA Rejections",
      ];

      const dataRows = filteredOperatorStats.map((row) => [
        row.operator,
        row.jobsCount,
        Number(row.sheetsProcessed.toFixed(1)),
        Number(row.cuttingLength.toFixed(1)),
        row.piercingCount,
        Number(row.runtimeHours.toFixed(2)),
        Number(row.outputRate.toFixed(1)),
        Number(row.piercingPerHour.toFixed(1)),
        `${row.shareOfCuttingLength.toFixed(1)}%`,
        row.qaRejections,
      ]);

      const totalRow = [
        "TOTAL / OVERALL",
        overallTotals.totalJobs,
        Number(overallTotals.totalSheets.toFixed(1)),
        Number(overallTotals.totalCuttingLength.toFixed(1)),
        overallTotals.totalPiercings,
        Number(overallTotals.totalRuntimeHours.toFixed(2)),
        Number(overallTotals.overallOutputRate.toFixed(1)),
        Number(overallTotals.overallPiercingPerHour.toFixed(1)),
        "100.0%",
        overallTotals.totalQARejections,
      ];

      const sheetData = [
        ["OPERATOR PRODUCTIVITY — monthly output per operator"],
        [],
        [
          `Report Month: ${monthLabel}`,
          "",
          "",
          "Output Rate and Piercing/Hr are the two speed measures; Share of Cutting Length % shows how much of the month's total output each operator contributed. QA Rejections flags rework quality.",
        ],
        [],
        headers,
        ...dataRows,
        totalRow,
        [],
        [
          'Output Rate (m/hr) = Cutting Length ÷ Runtime Hours. Piercing/Hr = Piercing Count ÷ Runtime Hours. QA Rejections counts records where QA Status is not "completed".',
        ],
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Column widths
      worksheet["!cols"] = [
        { wch: 22 },
        { wch: 16 },
        { wch: 18 },
        { wch: 20 },
        { wch: 16 },
        { wch: 16 },
        { wch: 20 },
        { wch: 16 },
        { wch: 24 },
        { wch: 16 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Operator Productivity");

      const fileName = `Operator_Productivity_${monthLabel.replace(/[\s/]/g, "_")}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      message.success("Excel report exported successfully!");
    } catch (err) {
      console.error("Export to Excel failed:", err);
      message.error("Failed to export Excel report.");
    }
  };

  // Print Table
  const handlePrint = () => {
    window.print();
  };

  // Ant Design Columns Definition
  const columns = [
    {
      title: "Operator",
      dataIndex: "operator",
      key: "operator",
      fixed: "left",
      width: 180,
      sorter: (a, b) => a.operator.localeCompare(b.operator),
      render: (text, record) => (
        <div
          onClick={() => {
            setSelectedOperatorForDrawer(record);
            setIsDrawerOpen(true);
          }}
          className="flex items-center justify-between group cursor-pointer font-bold text-slate-800 hover:text-blue-600 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-808 flex items-center justify-center font-bold text-xs">
              {text.charAt(0)}
            </div>
            <span>{text}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      ),
    },
    {
      title: "Jobs (records)",
      dataIndex: "jobsCount",
      key: "jobsCount",
      align: "right",
      width: 130,
      sorter: (a, b) => a.jobsCount - b.jobsCount,
      render: (val) => <span className="font-medium text-slate-700">{val.toLocaleString()}</span>,
    },
    {
      title: "Sheets Processed",
      dataIndex: "sheetsProcessed",
      key: "sheetsProcessed",
      align: "right",
      width: 150,
      sorter: (a, b) => a.sheetsProcessed - b.sheetsProcessed,
      render: (val) => (
        <span className="font-medium text-slate-700">
          {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      title: "Cutting Length (m)",
      dataIndex: "cuttingLength",
      key: "cuttingLength",
      align: "right",
      width: 160,
      sorter: (a, b) => a.cuttingLength - b.cuttingLength,
      render: (val) => (
        <span className="font-semibold text-slate-800">
          {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      title: "Piercing Count",
      dataIndex: "piercingCount",
      key: "piercingCount",
      align: "right",
      width: 140,
      sorter: (a, b) => a.piercingCount - b.piercingCount,
      render: (val) => <span className="font-medium text-slate-700">{val.toLocaleString()}</span>,
    },
    {
      title: "Runtime (Hrs)",
      dataIndex: "runtimeHours",
      key: "runtimeHours",
      align: "right",
      width: 140,
      sorter: (a, b) => a.runtimeHours - b.runtimeHours,
      render: (val) => <span className="font-medium text-slate-700">{val.toFixed(2)}</span>,
    },
    {
      title: (
        <Tooltip title="Cutting Length ÷ Runtime Hours. Higher rate indicates faster cutting throughput.">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Output Rate (m/hr)
          </span>
        </Tooltip>
      ),
      dataIndex: "outputRate",
      key: "outputRate",
      align: "right",
      width: 160,
      sorter: (a, b) => a.outputRate - b.outputRate,
      render: (val) => {
        const style = getRateBadgeStyle(val);
        return (
          <div className="flex justify-end">
            <span className={`px-2.5 py-1 rounded-md border text-xs text-right inline-block min-w-[70px] ${style.bgClass}`}>
              {val > 0 ? val.toFixed(1) : "0.0"}
            </span>
          </div>
        );
      },
    },
    {
      title: (
        <Tooltip title="Piercing Count ÷ Runtime Hours. Indicates piercing frequency per hour of machine operation.">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Piercing / Hr
          </span>
        </Tooltip>
      ),
      dataIndex: "piercingPerHour",
      key: "piercingPerHour",
      align: "right",
      width: 150,
      sorter: (a, b) => a.piercingPerHour - b.piercingPerHour,
      render: (val) => (
        <span className="font-medium text-slate-700">
          {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Percentage share of total cutting length contributed by operator across selected period.">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Share of Cutting Length %
          </span>
        </Tooltip>
      ),
      dataIndex: "shareOfCuttingLength",
      key: "shareOfCuttingLength",
      align: "right",
      width: 180,
      sorter: (a, b) => a.shareOfCuttingLength - b.shareOfCuttingLength,
      render: (val) => (
        <span className="font-semibold text-slate-800">
          {val.toFixed(1)}%
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Count of job records where QA Status is not 'Completed'. Flags rework or pending inspections.">
          <span className="cursor-help inline-flex items-center gap-1">
            QA Rejections
          </span>
        </Tooltip>
      ),
      dataIndex: "qaRejections",
      key: "qaRejections",
      align: "right",
      width: 140,
      sorter: (a, b) => a.qaRejections - b.qaRejections,
      render: (val) => (
        <span
          className={`font-semibold px-2 py-0.5 rounded text-xs ${
            val > 0 ? "bg-red-50 text-red-600 border border-red-200" : "text-slate-500"
          }`}
        >
          {val}
        </span>
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
      {/* 1. Header Banner styled like spreadsheet */}
      <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
        <div className="bg-[#174478] px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="w-6 h-6 text-blue-200" />
              <h1 className="text-lg sm:text-xl font-bold tracking-wide uppercase">
                OPERATOR PRODUCTIVITY — monthly output per operator
              </h1>
            </div>
            <p className="text-xs text-blue-100/90 mt-1 max-w-4xl leading-relaxed">
              Output Rate and Piercing/Hr are the two speed measures; Share of Cutting Length % shows how much of
              the month's total output each operator contributed. QA Rejections flags rework quality.
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

        {/* Filters Controls Toolbar */}
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

            {/* Machine Filter */}
            <div className="w-48">
              <Select
                placeholder="All Machines"
                value={selectedMachine}
                onChange={setSelectedMachine}
                allowClear
                className="w-full h-8 text-xs"
                options={machinesList.map((m) => ({
                  label: m.machine_name,
                  value: m.machine_name,
                }))}
              />
            </div>

            {/* Operator Search */}
            <div className="w-52">
              <Input
                placeholder="Search operator..."
                prefix={<Search className="w-3.5 h-3.5 text-slate-400" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleResetFilters}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              className="text-xs h-8 text-slate-600 hover:text-slate-900"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Stat Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Top Performer Card */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Top Performer</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-800 truncate" title={topOperator?.operator || "N/A"}>
              {topOperator?.operator || "—"}
            </span>
            {topOperator && (
              <span className="text-xs font-bold text-emerald-600">
                {topOperator.outputRate.toFixed(1)} m/hr
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Highest cutting throughput</p>
        </Card>

        {/* Total Cutting Length */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Cut Length</span>
            <Scissors className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-800">
              {overallTotals.totalCuttingLength.toLocaleString(undefined, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{" "}
              <span className="text-xs font-normal text-slate-500">m</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            ≈ {(overallTotals.totalCuttingLength / 1000).toFixed(2)} km in {currentPeriodLabel}
          </p>
        </Card>

        {/* Total Machine Runtime */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Runtime</span>
            <Timer className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-800">
              {overallTotals.totalRuntimeHours.toFixed(2)}{" "}
              <span className="text-xs font-normal text-slate-500">Hrs</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Across {operatorStats.length} active operators</p>
        </Card>

        {/* Fleet Speed (Output Rate) */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fleet Output Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-800">
              {overallTotals.overallOutputRate.toFixed(1)}{" "}
              <span className="text-xs font-normal text-slate-500">m/hr</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Average cutting speed</p>
        </Card>

        {/* QA Rejections */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">QA Rejections</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-1">
            <span className={`text-base font-bold ${overallTotals.totalQARejections > 0 ? "text-rose-600" : "text-slate-800"}`}>
              {overallTotals.totalQARejections}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Non-completed QA inspections</p>
        </Card>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        {/* Speed Legend */}
        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span>Speed Benchmark (Output Rate):</span>
            <div className="flex items-center gap-3 ml-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#57bb8a] border border-emerald-700/40"></span>
                <span>&ge; 500 m/hr (Peak)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#a6d96a] border border-emerald-600/40"></span>
                <span>200 - 500 m/hr (High)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#fee08b] border border-amber-600/40"></span>
                <span>100 - 200 m/hr (Normal)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#fdae61] border border-orange-600/40"></span>
                <span>50 - 100 m/hr (Low)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#f8696b] border border-rose-600/40"></span>
                <span>&lt; 50 m/hr / 0.0</span>
              </span>
            </div>
          </div>
          <div className="text-slate-400 text-[11px]">
            Showing {filteredOperatorStats.length} operators • Click any row for job history
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filteredOperatorStats}
          loading={isFetchingData}
          pagination={false}
          scroll={{ x: 1200 }}
          rowClassName={(_record, index) =>
            index % 2 === 0 ? "bg-white hover:bg-blue-50/30 transition-colors" : "bg-slate-50/40 hover:bg-blue-50/30 transition-colors"
          }
          summary={() => (
            <Table.Summary fixed="bottom">
              <Table.Summary.Row className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                <Table.Summary.Cell index={0}>
                  <span className="font-extrabold text-slate-900 tracking-wider text-xs uppercase">
                    TOTAL / OVERALL
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <span className="font-bold text-slate-900">{overallTotals.totalJobs.toLocaleString()}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span className="font-bold text-slate-900">
                    {overallTotals.totalSheets.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <span className="font-bold text-slate-900">
                    {overallTotals.totalCuttingLength.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <span className="font-bold text-slate-900">{overallTotals.totalPiercings.toLocaleString()}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <span className="font-bold text-slate-900">{overallTotals.totalRuntimeHours.toFixed(2)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <div className="flex justify-end">
                    <span className="px-2.5 py-1 rounded bg-slate-200 border border-slate-300 font-extrabold text-slate-900 text-xs">
                      {overallTotals.overallOutputRate.toFixed(1)}
                    </span>
                  </div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <span className="font-bold text-slate-900">
                    {overallTotals.overallPiercingPerHour.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  <span className="font-bold text-slate-900">100.0%</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={9} align="right">
                  <span className="font-bold text-rose-700">{overallTotals.totalQARejections}</span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        {/* Footer Notes Formula Explanation */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 italic">
          <p>
            <strong>Output Rate (m/hr)</strong> = Cutting Length &divide; Runtime Hours. <strong>Piercing/Hr</strong> = Piercing Count &divide; Runtime Hours. <strong>Share of Cutting Length %</strong> shows how much of the month's total output each operator contributed. <strong>QA Rejections</strong> counts records where QA Status is not "completed".
          </p>
        </div>
      </div>

      {/* 4. Operator Job Drilldown Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <span className="text-base font-bold text-slate-800">
                {selectedOperatorForDrawer?.operator} &mdash; Job Details
              </span>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                {selectedOperatorForDrawer?.jobsCount} job records in {currentPeriodLabel}
              </p>
            </div>
          </div>
        }
        placement="right"
        width={750}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
      >
        {selectedOperatorForDrawer && (
          <div className="flex flex-col gap-5">
            {/* Operator Stat summary mini-cards */}
            <div className="grid grid-cols-5 gap-3 bg-slate-50 p-3 rounded-lg border">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Cut Length</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedOperatorForDrawer.cuttingLength.toFixed(1)} m
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Runtime</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedOperatorForDrawer.runtimeHours.toFixed(2)} hrs
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Output Rate</div>
                <div className="text-sm font-bold text-emerald-700 mt-0.5">
                  {selectedOperatorForDrawer.outputRate.toFixed(1)} m/hr
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Piercing / Hr</div>
                <div className="text-sm font-bold text-blue-700 mt-0.5">
                  {selectedOperatorForDrawer.piercingPerHour.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">QA Flags</div>
                <div className="text-sm font-bold text-rose-600 mt-0.5">
                  {selectedOperatorForDrawer.qaRejections}
                </div>
              </div>
            </div>

            {/* List of individual job records */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Production Job Records ({selectedOperatorForDrawer.rawRows.length})
              </h3>

              <div className="flex flex-col gap-2.5 max-h-[65vh] overflow-y-auto pr-1">
                {selectedOperatorForDrawer.rawRows.map((row, idx) => (
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
                      <span className="text-[11px] text-slate-500">
                        {String(row.date || row.machine_date || "")}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 text-[10px]">Machine:</span>{" "}
                        <span className="font-semibold text-slate-700">{String(row.machine_name || "—")}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Material:</span>{" "}
                        <span className="font-semibold text-slate-700">
                          {String(row.mat_type || "")} {row.thick ? `${row.thick}mm` : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Program No:</span>{" "}
                        <span className="font-semibold text-slate-700">{String(row.program_no || "—")}</span>
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

                    <div className="flex items-center justify-between pt-1 border-t text-[11px]">
                      <div>
                        <span className="text-slate-400">QA Status:</span>{" "}
                        <Tag
                          color={
                            String(row.qa_status || "").toLowerCase() === "completed"
                              ? "green"
                              : String(row.qa_status || "").toLowerCase().includes("reject")
                              ? "red"
                              : "orange"
                          }
                          className="text-[10px]"
                        >
                          {String(row.qa_status || "Pending")}
                        </Tag>
                      </div>
                      <div className="text-slate-400 text-[10px]">
                        Gas: {String(row.machine_gas_type || "N/A")} | Shift: {String(row.shift || "—")}
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

export default OperatorProductivityReport;
