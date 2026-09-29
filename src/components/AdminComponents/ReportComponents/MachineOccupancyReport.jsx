import React, { useState, useMemo, useEffect, useRef } from "react";
import { Table, DatePicker, Select, InputNumber, Input, Button, Card, Tag, Drawer, Tooltip, message } from "antd";
import {
  Search,
  Cpu,
  Clock,
  Timer,
  Activity,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  RotateCcw,
  Zap,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useLazyGetOverallDetailsQuery, useGetMachinesQuery, useGetOperatorsQuery } from "@/store/services/admin.api";
import { parseTimeToMinutes } from "./utils/productsTableUtils";

const { MonthPicker, RangePicker } = DatePicker;

const MachineOccupancyReport = () => {
  // Assumptions state (editable by user)
  const [workingDays, setWorkingDays] = useState(26);
  const [shiftHoursPerDay, setShiftHoursPerDay] = useState(8);
  const [machineAvailOverrides, setMachineAvailOverrides] = useState({});

  // Filter state
  const [filterMode, setFilterMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [dateRange, setDateRange] = useState(null);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Data state
  const [rawData, setRawData] = useState([]);
  const [selectedMachineForDrawer, setSelectedMachineForDrawer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const printTableRef = useRef(null);

  // APIs
  const [triggerGetOverallDetails, { isLoading: isFetchingData }] = useLazyGetOverallDetailsQuery();
  const { data: registeredMachines = [] } = useGetMachinesQuery(undefined);
  const { data: operatorsList = [] } = useGetOperatorsQuery(undefined);

  // Standard Available Hours from assumptions
  const stdAvailableHours = useMemo(() => {
    return Number(((workingDays || 0) * (shiftHoursPerDay || 0)).toFixed(1));
  }, [workingDays, shiftHoursPerDay]);

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

    if (selectedOperator) {
      filtersObj["machine_operator"] = {
        filterType: "text",
        type: "equals",
        filter: selectedOperator,
      };
    }

    return filtersObj;
  }, [filterMode, selectedMonth, dateRange, selectedOperator]);

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
      console.error("Failed to load machine occupancy data:", err);
      message.error("Failed to load machine occupancy data.");
    }
  };

  useEffect(() => {
    loadData();
  }, [apiFilters]);

  // Calculate statistics per machine
  const machineStats = useMemo(() => {
    const machineMap = new Map();

    // Group rows by machine
    rawData.forEach((row) => {
      const mName = (String(row.machine_name || "").trim() || "Unassigned").toUpperCase();

      if (!machineMap.has(mName)) {
        machineMap.set(mName, {
          machine: mName,
          jobsRun: 0,
          piercingCount: 0,
          runtimeMinutes: 0,
          rawRows: [],
        });
      }

      const entry = machineMap.get(mName);
      entry.jobsRun += 1;
      entry.rawRows.push(row);

      const piercing = Number(row.total_piercing ?? row.pierce_per_sheet ?? 0);
      entry.piercingCount += isNaN(piercing) ? 0 : piercing;

      const mins = parseTimeToMinutes(row.machine_runtime);
      entry.runtimeMinutes += mins;
    });

    // Ensure all registered machines appear even if 0 jobs
    if (!selectedOperator && registeredMachines.length > 0) {
      registeredMachines.forEach((m) => {
        const name = (m.machine_name || "").trim().toUpperCase();
        if (name && !machineMap.has(name)) {
          machineMap.set(name, {
            machine: name,
            jobsRun: 0,
            piercingCount: 0,
            runtimeMinutes: 0,
            rawRows: [],
          });
        }
      });
    }

    // Convert map to list and compute utilisation
    const list = Array.from(machineMap.values()).map((entry) => {
      const availableHours = machineAvailOverrides[entry.machine] !== undefined
        ? machineAvailOverrides[entry.machine]
        : stdAvailableHours;

      const runtimeHours = entry.runtimeMinutes / 60;
      const idleHours = Math.max(0, availableHours - runtimeHours);
      const utilisationPercent = availableHours > 0 ? (runtimeHours / availableHours) * 100 : 0;
      const piercingPerHour = runtimeHours > 0 ? entry.piercingCount / runtimeHours : 0;
      const avgJobDurationMin = entry.jobsRun > 0 ? entry.runtimeMinutes / entry.jobsRun : 0;

      return {
        key: entry.machine,
        machine: entry.machine,
        availableHours,
        runtimeHours,
        idleHours,
        utilisationPercent,
        piercingCount: entry.piercingCount,
        piercingPerHour,
        jobsRun: entry.jobsRun,
        avgJobDurationMin,
        rawRows: entry.rawRows,
      };
    });

    // Sort by runtimeHours descending
    return list.sort((a, b) => b.runtimeHours - a.runtimeHours);
  }, [rawData, registeredMachines, selectedOperator, stdAvailableHours, machineAvailOverrides]);

  // Filtered by Search query
  const filteredMachineStats = useMemo(() => {
    if (!searchQuery.trim()) return machineStats;
    const q = searchQuery.toLowerCase().trim();
    return machineStats.filter((m) => m.machine.toLowerCase().includes(q));
  }, [machineStats, searchQuery]);

  // Overall totals
  const overallTotals = useMemo(() => {
    let totalAvailable = 0;
    let totalRuntime = 0;
    let totalJobs = 0;
    let totalPiercings = 0;
    let totalRuntimeMins = 0;

    machineStats.forEach((m) => {
      totalAvailable += m.availableHours;
      totalRuntime += m.runtimeHours;
      totalJobs += m.jobsRun;
      totalPiercings += m.piercingCount;
      totalRuntimeMins += m.runtimeHours * 60;
    });

    const totalIdle = Math.max(0, totalAvailable - totalRuntime);
    const overallUtilisation = totalAvailable > 0 ? (totalRuntime / totalAvailable) * 100 : 0;
    const overallPiercingPerHour = totalRuntime > 0 ? totalPiercings / totalRuntime : 0;
    const overallAvgJobDuration = totalJobs > 0 ? totalRuntimeMins / totalJobs : 0;

    return {
      totalAvailable,
      totalRuntime,
      totalIdle,
      overallUtilisation,
      totalPiercings,
      overallPiercingPerHour,
      totalJobs,
      overallAvgJobDuration,
    };
  }, [machineStats]);

  // Most active machine
  const topMachine = useMemo(() => {
    if (!machineStats.length) return null;
    return machineStats.reduce((prev, current) =>
      current.utilisationPercent > prev.utilisationPercent ? current : prev
    , machineStats[0]);
  }, [machineStats]);

  // Utilisation Color Styling matching Excel heat map
  const getUtilisationBadgeStyle = (percent, allMachines) => {
    if (percent <= 0) {
      return "bg-slate-100 text-slate-600 border-slate-200";
    }
    const maxVal = Math.max(...allMachines.map((m) => m.utilisationPercent), 1);
    const minVal = Math.min(...allMachines.filter((m) => m.utilisationPercent > 0).map((m) => m.utilisationPercent), 0);

    if (percent >= maxVal * 0.85) {
      return "bg-[#a6d96a]/40 text-emerald-900 border-[#a6d96a] font-bold";
    }
    if (percent >= (maxVal + minVal) / 2) {
      return "bg-[#fee08b]/50 text-amber-900 border-[#fee08b] font-bold";
    }
    return "bg-[#f46d43]/30 text-rose-900 border-[#f46d43] font-bold";
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilterMode("month");
    setSelectedMonth(dayjs());
    setDateRange(null);
    setSelectedOperator(null);
    setSearchQuery("");
    setWorkingDays(26);
    setShiftHoursPerDay(8);
    setMachineAvailOverrides({});
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
        "Machine",
        "Available Hours",
        "Runtime (Hrs)",
        "Idle (Hrs)",
        "Utilisation %",
        "Piercing / Hr",
        "Jobs Run",
        "Avg Job Duration (min)",
      ];

      const dataRows = filteredMachineStats.map((row) => [
        row.machine,
        Number(row.availableHours.toFixed(1)),
        Number(row.runtimeHours.toFixed(2)),
        Number(row.idleHours.toFixed(1)),
        `${row.utilisationPercent.toFixed(1)}%`,
        Number(row.piercingPerHour.toFixed(1)),
        row.jobsRun,
        Number(row.avgJobDurationMin.toFixed(1)),
      ]);

      const totalRow = [
        "TOTAL / OVERALL",
        Number(overallTotals.totalAvailable.toFixed(1)),
        Number(overallTotals.totalRuntime.toFixed(2)),
        Number(overallTotals.totalIdle.toFixed(1)),
        `${overallTotals.overallUtilisation.toFixed(1)}%`,
        Number(overallTotals.overallPiercingPerHour.toFixed(1)),
        overallTotals.totalJobs,
        Number(overallTotals.overallAvgJobDuration.toFixed(1)),
      ];

      const sheetData = [
        ["MACHINE OCCUPANCY — utilisation per machine"],
        [],
        [
          `Report Month: ${monthLabel}`,
          "",
          "",
          "Utilisation % = Runtime Hours ÷ Available Hours. Edit the yellow assumption cells to match your actual working days / shift pattern before relying on the %",
        ],
        [],
        [
          "Assumptions:",
          "Working Days",
          workingDays,
          "Shift Hrs/Day",
          shiftHoursPerDay,
          "Std Avail Hrs",
          stdAvailableHours,
        ],
        [],
        headers,
        ...dataRows,
        totalRow,
        [],
        [
          'Available Hours defaults to Working Days × Shift Hours for every machine — overtype a machine\'s cell if it runs a different shift pattern or had planned downtime. Utilisation % is a single-month metric: if Report Month is set to "ALL", Runtime Hours adds up across every month pasted in but Available Hours does not, so % will read low — pick one month for a true utilisation figure.',
        ],
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      worksheet["!cols"] = [
        { wch: 20 }, // Machine
        { wch: 18 }, // Available Hours
        { wch: 16 }, // Runtime Hours
        { wch: 16 }, // Idle Hours
        { wch: 16 }, // Utilisation %
        { wch: 16 }, // Piercing / Hr
        { wch: 14 }, // Jobs Run
        { wch: 24 }, // Avg Job Duration
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Machine Occupancy");

      const fileName = `Machine_Occupancy_${monthLabel.replace(/[\s/]/g, "_")}.xlsx`;
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

  // Columns definition
  const columns = [
    {
      title: "Machine",
      dataIndex: "machine",
      key: "machine",
      fixed: "left",
      width: 180,
      sorter: (a, b) => a.machine.localeCompare(b.machine),
      render: (text, record) => (
        <div
          onClick={() => {
            setSelectedMachineForDrawer(record);
            setIsDrawerOpen(true);
          }}
          className="flex items-center justify-between group cursor-pointer font-bold text-slate-800 hover:text-blue-600 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-800 flex items-center justify-center font-bold text-xs">
              <Cpu className="w-4 h-4" />
            </div>
            <span>{text}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      ),
    },
    {
      title: (
        <Tooltip title="Working Days × Shift Hours (or custom per machine).">
          <span className="cursor-help inline-flex items-center gap-1">Available Hours</span>
        </Tooltip>
      ),
      dataIndex: "availableHours",
      key: "availableHours",
      align: "right",
      width: 150,
      sorter: (a, b) => a.availableHours - b.availableHours,
      render: (val) => (
        <span className="font-semibold text-slate-800">{val.toFixed(1)}</span>
      ),
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
        <Tooltip title="Available Hours minus Runtime Hours">
          <span className="cursor-help inline-flex items-center gap-1">Idle (Hrs)</span>
        </Tooltip>
      ),
      dataIndex: "idleHours",
      key: "idleHours",
      align: "right",
      width: 140,
      sorter: (a, b) => a.idleHours - b.idleHours,
      render: (val) => (
        <span className="font-medium text-slate-700">{val.toFixed(1)}</span>
      ),
    },
    {
      title: (
        <Tooltip title="Runtime Hours ÷ Available Hours. Higher is better.">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Utilisation %
          </span>
        </Tooltip>
      ),
      dataIndex: "utilisationPercent",
      key: "utilisationPercent",
      align: "right",
      width: 150,
      sorter: (a, b) => a.utilisationPercent - b.utilisationPercent,
      render: (val) => {
        const badgeClass = getUtilisationBadgeStyle(val, filteredMachineStats);
        return (
          <div className="flex justify-end">
            <span className={`px-2.5 py-1 rounded-md border text-xs text-right inline-block min-w-[70px] ${badgeClass}`}>
              {val.toFixed(1)}%
            </span>
          </div>
        );
      },
    },
    {
      title: (
        <Tooltip title="Piercing Count ÷ Runtime Hours. Piercing speed per hour of machine operation.">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Piercing / Hr
          </span>
        </Tooltip>
      ),
      dataIndex: "piercingPerHour",
      key: "piercingPerHour",
      align: "right",
      width: 140,
      sorter: (a, b) => a.piercingPerHour - b.piercingPerHour,
      render: (val) => (
        <span className="font-medium text-slate-700">
          {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      title: "Jobs Run",
      dataIndex: "jobsRun",
      key: "jobsRun",
      align: "right",
      width: 120,
      sorter: (a, b) => a.jobsRun - b.jobsRun,
      render: (val) => <span className="font-medium text-slate-700">{val.toLocaleString()}</span>,
    },
    {
      title: (
        <Tooltip title="Average duration per manufacturing run in minutes">
          <span className="cursor-help inline-flex items-center gap-1">Avg Job Duration (min)</span>
        </Tooltip>
      ),
      dataIndex: "avgJobDurationMin",
      key: "avgJobDurationMin",
      align: "right",
      width: 180,
      sorter: (a, b) => a.avgJobDurationMin - b.avgJobDurationMin,
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
      {/* 1. Header Banner & Assumptions Section */}
      <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
        {/* Banner */}
        <div className="bg-[#174478] px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-200" />
              <h1 className="text-lg sm:text-xl font-bold tracking-wide uppercase">
                MACHINE OCCUPANCY — utilisation per machine
              </h1>
            </div>
            <p className="text-xs text-blue-100/90 mt-1 max-w-4xl leading-relaxed">
              Utilisation % = Runtime Hours &divide; Available Hours. Edit the yellow assumption cells to match your
              actual working days / shift pattern before relying on the %
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

        {/* Assumptions Bar styled with yellow highlight matching the spreadsheet */}
        <div className="px-6 py-3 bg-amber-50/70 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-amber-950 uppercase tracking-wider text-[11px]">
                Assumptions:
              </span>
            </div>

            {/* Working Days */}
            <div className="flex items-center gap-2 bg-amber-100/70 px-3 py-1.5 rounded-md border border-amber-300">
              <span className="font-bold text-amber-900">Working Days:</span>
              <InputNumber
                min={1}
                max={31}
                value={workingDays}
                onChange={(val) => setWorkingDays(val || 26)}
                className="w-16 h-7 text-xs font-bold"
              />
            </div>

            {/* Shift Hours / Day */}
            <div className="flex items-center gap-2 bg-amber-100/70 px-3 py-1.5 rounded-md border border-amber-300">
              <span className="font-bold text-amber-900">Shift Hrs/Day:</span>
              <InputNumber
                min={1}
                max={24}
                value={shiftHoursPerDay}
                onChange={(val) => setShiftHoursPerDay(val || 8)}
                className="w-16 h-7 text-xs font-bold"
              />
            </div>

            {/* Calculated Std Avail Hours */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-amber-300 shadow-2xs">
              <span className="font-bold text-slate-700">Std Avail Hr:</span>
              <span className="font-extrabold text-blue-900 text-sm">{stdAvailableHours.toFixed(1)}</span>
              <span className="text-[10px] text-slate-500 font-normal">Hrs / machine</span>
            </div>
          </div>

          <div className="text-[11px] text-amber-800/80 italic">
            Calculated as Working Days &times; Shift Hours
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
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

            {/* Operator Filter */}
            <div className="w-48">
              <Select
                placeholder="All Operators"
                value={selectedOperator}
                onChange={setSelectedOperator}
                allowClear
                className="w-full h-8 text-xs"
                options={operatorsList.map((o) => ({
                  label: o.operator_name,
                  value: o.operator_name,
                }))}
              />
            </div>

            {/* Machine Search */}
            <div className="w-52">
              <Input
                placeholder="Search machine..."
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

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Fleet Utilisation */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fleet Utilisation</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-bold text-slate-800">
              {overallTotals.overallUtilisation.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400">of available hrs</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Fleet occupancy rate</p>
        </Card>

        {/* Total Runtime */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Runtime</span>
            <Timer className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-800">
              {overallTotals.totalRuntime.toFixed(2)}{" "}
              <span className="text-xs font-normal text-slate-500">Hrs</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Active cutting time</p>
        </Card>

        {/* Total Idle Time */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Idle Time</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-800">
              {overallTotals.totalIdle.toFixed(1)}{" "}
              <span className="text-xs font-normal text-slate-500">Hrs</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Available minus runtime</p>
        </Card>

        {/* Most Utilised Machine */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Top Machine</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-800 truncate" title={topMachine?.machine || "—"}>
              {topMachine?.machine || "—"}
            </span>
            {topMachine && (
              <span className="text-xs font-bold text-emerald-600">
                {topMachine.utilisationPercent.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Highest utilisation</p>
        </Card>

        {/* Total Jobs Run */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Jobs Run</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-800">
              {overallTotals.totalJobs.toLocaleString()}{" "}
              <span className="text-xs font-normal text-slate-500">
                ({overallTotals.overallAvgJobDuration.toFixed(1)} min/job)
              </span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Across {machineStats.length} machines</p>
        </Card>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        {/* Table info bar */}
        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 font-medium">
            <span>Machine Occupancy Summary for <strong>{currentPeriodLabel}</strong></span>
          </div>
          <div className="text-slate-400 text-[11px]">
            Showing {filteredMachineStats.length} machines • Click any row for job history
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filteredMachineStats}
          loading={isFetchingData}
          pagination={false}
          scroll={{ x: 1100 }}
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
                  <span className="font-bold text-slate-900">{overallTotals.totalAvailable.toFixed(1)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span className="font-bold text-slate-900">{overallTotals.totalRuntime.toFixed(2)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <span className="font-bold text-slate-900">{overallTotals.totalIdle.toFixed(1)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <div className="flex justify-end">
                    <span className="px-2.5 py-1 rounded bg-slate-200 border border-slate-300 font-extrabold text-slate-900 text-xs">
                      {overallTotals.overallUtilisation.toFixed(1)}%
                    </span>
                  </div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <span className="font-bold text-slate-900">
                    {overallTotals.overallPiercingPerHour.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <span className="font-bold text-slate-900">{overallTotals.totalJobs.toLocaleString()}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <span className="font-bold text-slate-900">{overallTotals.overallAvgJobDuration.toFixed(1)}</span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        {/* Footer Notes Formula Explanation */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 italic">
          <p>
            <strong>Available Hours</strong> defaults to Working Days &times; Shift Hours for every machine &mdash;
            overtype a machine's cell if it runs a different shift pattern or had planned downtime.{" "}
            <strong>Utilisation %</strong> is a single-month metric: if Report Month is set to "ALL", Runtime Hours
            adds up across every month pasted in but Available Hours does not, so % will read low &mdash; pick one month
            for a true utilisation figure.
          </p>
        </div>
      </div>

      {/* 4. Machine Job Drilldown Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            <div>
              <span className="text-base font-bold text-slate-800">
                {selectedMachineForDrawer?.machine} &mdash; Job Details
              </span>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                {selectedMachineForDrawer?.jobsRun} jobs run in {currentPeriodLabel}
              </p>
            </div>
          </div>
        }
        placement="right"
        width={750}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
      >
        {selectedMachineForDrawer && (
          <div className="flex flex-col gap-5">
            {/* Machine mini-summary cards */}
            <div className="grid grid-cols-5 gap-3 bg-slate-50 p-3 rounded-lg border">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Available Hrs</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedMachineForDrawer.availableHours.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Runtime Hrs</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedMachineForDrawer.runtimeHours.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Idle Hrs</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedMachineForDrawer.idleHours.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Utilisation %</div>
                <div className="text-sm font-bold text-emerald-700 mt-0.5">
                  {selectedMachineForDrawer.utilisationPercent.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Piercing / Hr</div>
                <div className="text-sm font-bold text-blue-700 mt-0.5">
                  {selectedMachineForDrawer.piercingPerHour.toFixed(1)}
                </div>
              </div>
            </div>

            {/* List of individual job records */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Machine Operations History ({selectedMachineForDrawer.rawRows.length} Records)
              </h3>

              <div className="flex flex-col gap-2.5 max-h-[65vh] overflow-y-auto pr-1">
                {selectedMachineForDrawer.rawRows.map((row, idx) => (
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
                        <span className="text-slate-400 text-[10px]">Operator:</span>{" "}
                        <span className="font-semibold text-slate-700">
                          {String(row.machine_operator || "—")}
                        </span>
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

export default MachineOccupancyReport;
