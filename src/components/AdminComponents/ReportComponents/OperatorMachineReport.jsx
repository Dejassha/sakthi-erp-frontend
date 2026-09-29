import React, { useState, useMemo, useEffect, useRef } from "react";
import { Table, DatePicker, Input, Button, Card, Tag, Drawer, Tooltip, message } from "antd";
import {
  Search,
  Users,
  Gauge,
  Scissors,
  Layers,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Award,
  Zap,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useLazyGetOverallDetailsQuery, useGetMachinesQuery, useGetOperatorsQuery } from "@/store/services/admin.api";
import { parseTimeToMinutes } from "./utils/productsTableUtils";

const { MonthPicker, RangePicker } = DatePicker;

// Known standard machines to ensure they appear in proper sections
const KNOWN_LASER_MACHINES = ["BLAZE", "MERIT", "MAHA"];
const KNOWN_FOLDING_MACHINES = ["PROBEND", "DARLEY", "AAA", "SUKRIT"];

const OperatorMachineReport = () => {
  // Filters state
  const [filterMode, setFilterMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [dateRange, setDateRange] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Data state
  const [rawData, setRawData] = useState([]);
  const [selectedCellForDrawer, setSelectedCellForDrawer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const printTableRef = useRef(null);

  // APIs
  const [triggerGetOverallDetails, { isLoading: isFetchingData }] = useLazyGetOverallDetailsQuery();
  const { data: registeredMachines = [] } = useGetMachinesQuery(undefined);
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
      console.error("Failed to load operator x machine data:", err);
      message.error("Failed to load operator x machine data.");
    }
  };

  useEffect(() => {
    loadData();
  }, [apiFilters]);

  // Strict fields as specified in the spreadsheet layout
  const laserMachines = useMemo(() => ["BLAZE", "MERIT", "MAHA"], []);
  const foldingMachines = useMemo(() => ["PROBEND", "DARLEY", "AAA", "SUKRIT"], []);

  // Master Operators List
  const allOperators = useMemo(() => {
    const opSet = new Set();

    registeredOperators.forEach((op) => {
      const name = (op.operator_name || "").trim().toUpperCase();
      if (name) opSet.add(name);
    });

    rawData.forEach((row) => {
      const name = (String(row.machine_operator || "").trim() || "Unassigned").toUpperCase();
      if (name) opSet.add(name);
    });

    return Array.from(opSet).sort((a, b) => a.localeCompare(b));
  }, [registeredOperators, rawData]);

  // 1. Process Laser Cutting Matrix Data
  const laserMatrixData = useMemo(() => {
    return allOperators.map((operator) => {
      const machineRates = {};
      const machineRuntimes = {};
      const machineJobCounts = {};
      const opRows = [];

      laserMachines.forEach((machine) => {
        const matchingRows = rawData.filter((r) => {
          const rOp = (String(r.machine_operator || "").trim() || "Unassigned").toUpperCase();
          const rMac = String(r.machine_name || "").trim().toUpperCase();
          return rOp === operator && rMac === machine;
        });

        opRows.push(...matchingRows);

        let totalMeters = 0;
        let totalRuntimeMinutes = 0;

        matchingRows.forEach((r) => {
          const meters = Number(r.total_meters ?? r.cut_length_per_sheet ?? 0);
          totalMeters += isNaN(meters) ? 0 : meters;
          totalRuntimeMinutes += parseTimeToMinutes(r.machine_runtime);
        });

        const runtimeHours = totalRuntimeMinutes / 60;
        const rate = runtimeHours > 0 ? totalMeters / runtimeHours : 0;

        machineRates[machine] = rate;
        machineRuntimes[machine] = runtimeHours;
        machineJobCounts[machine] = matchingRows.length;
      });

      // Determine best machine & peak output rate
      let bestMachine = "—";
      let peakRate = 0;

      laserMachines.forEach((machine) => {
        const rate = machineRates[machine] || 0;
        if (rate > peakRate) {
          peakRate = rate;
          bestMachine = machine;
        }
      });

      return {
        key: operator,
        operator,
        machineRates,
        machineRuntimes,
        machineJobCounts,
        bestMachine,
        peakRate,
        rawRows: opRows,
      };
    });
  }, [allOperators, laserMachines, rawData]);

  // 2. Process Folding Matrix Data
  const foldingMatrixData = useMemo(() => {
    return allOperators.map((operator) => {
      const machineRates = {};
      const machineRuntimes = {};
      const machineJobCounts = {};
      const opRows = [];

      foldingMachines.forEach((machine) => {
        const matchingRows = rawData.filter((r) => {
          const rOp = (String(r.machine_operator || "").trim() || "Unassigned").toUpperCase();
          const rMac = String(r.machine_name || "").trim().toUpperCase();
          return rOp === operator && rMac === machine;
        });

        opRows.push(...matchingRows);

        let totalWeight = 0;
        let totalRuntimeMinutes = 0;

        matchingRows.forEach((r) => {
          const wt = Number(r.total_used_weight ?? r.total_weight ?? r.used_weight ?? 0);
          totalWeight += isNaN(wt) ? 0 : wt;
          totalRuntimeMinutes += parseTimeToMinutes(r.machine_runtime);
        });

        const runtimeHours = totalRuntimeMinutes / 60;
        const rate = runtimeHours > 0 ? totalWeight / runtimeHours : 0;

        machineRates[machine] = rate;
        machineRuntimes[machine] = runtimeHours;
        machineJobCounts[machine] = matchingRows.length;
      });

      // Determine best machine & peak weight rate
      let bestMachine = "—";
      let peakRate = 0;

      foldingMachines.forEach((machine) => {
        const rate = machineRates[machine] || 0;
        if (rate > peakRate) {
          peakRate = rate;
          bestMachine = machine;
        }
      });

      return {
        key: operator,
        operator,
        machineRates,
        machineRuntimes,
        machineJobCounts,
        bestMachine,
        peakRate,
        rawRows: opRows,
      };
    });
  }, [allOperators, foldingMachines, rawData]);

  // Best Operator per Machine calculations
  const bestLaserOperatorPerMachine = useMemo(() => {
    const result = {};

    laserMachines.forEach((m) => {
      let maxRate = 0;
      let topOp = "—";

      laserMatrixData.forEach((row) => {
        const rate = row.machineRates[m] || 0;
        if (rate > maxRate) {
          maxRate = rate;
          topOp = row.operator;
        }
      });

      result[m] = { operator: topOp, rate: maxRate };
    });

    return result;
  }, [laserMachines, laserMatrixData]);

  const bestFoldingOperatorPerMachine = useMemo(() => {
    const result = {};

    foldingMachines.forEach((m) => {
      let maxRate = 0;
      let topOp = "—";

      foldingMatrixData.forEach((row) => {
        const rate = row.machineRates[m] || 0;
        if (rate > maxRate) {
          maxRate = rate;
          topOp = row.operator;
        }
      });

      result[m] = { operator: topOp, rate: maxRate };
    });

    return result;
  }, [foldingMachines, foldingMatrixData]);

  // Filter by Search Query
  const filteredLaserRows = useMemo(() => {
    if (!searchQuery.trim()) return laserMatrixData;
    const q = searchQuery.toLowerCase().trim();
    return laserMatrixData.filter((r) => r.operator.toLowerCase().includes(q));
  }, [laserMatrixData, searchQuery]);

  const filteredFoldingRows = useMemo(() => {
    if (!searchQuery.trim()) return foldingMatrixData;
    const q = searchQuery.toLowerCase().trim();
    return foldingMatrixData.filter((r) => r.operator.toLowerCase().includes(q));
  }, [foldingMatrixData, searchQuery]);

  // Overall Top Metrics
  const topLaserPerformer = useMemo(() => {
    let top = { operator: "—", machine: "—", rate: 0 };
    laserMatrixData.forEach((r) => {
      if (r.peakRate > top.rate) {
        top = { operator: r.operator, machine: r.bestMachine, rate: r.peakRate };
      }
    });
    return top;
  }, [laserMatrixData]);

  const topFoldingPerformer = useMemo(() => {
    let top = { operator: "—", machine: "—", rate: 0 };
    foldingMatrixData.forEach((r) => {
      if (r.peakRate > top.rate) {
        top = { operator: r.operator, machine: r.bestMachine, rate: r.peakRate };
      }
    });
    return top;
  }, [foldingMatrixData]);

  // Cell Rate Color Stylers matching the Spreadsheet Heatmap
  const getLaserRateStyle = (rate) => {
    if (rate <= 0) {
      return "bg-[#f8696b]/30 text-rose-900 border-[#f8696b]/50";
    }
    if (rate >= 500) {
      return "bg-[#57bb8a]/40 text-emerald-950 border-[#57bb8a] font-bold";
    }
    if (rate >= 200) {
      return "bg-[#a6d96a]/40 text-emerald-900 border-[#a6d96a] font-bold";
    }
    if (rate >= 100) {
      return "bg-[#fee08b]/50 text-amber-950 border-[#fee08b] font-bold";
    }
    if (rate >= 50) {
      return "bg-[#fee08b]/35 text-amber-900 border-[#fee08b] font-semibold";
    }
    return "bg-[#fee08b]/30 text-amber-900 border-[#fee08b] font-medium";
  };

  const getFoldingRateStyle = (rate) => {
    if (rate <= 0) {
      return "bg-[#f8696b]/30 text-rose-900 border-[#f8696b]/50";
    }
    return "bg-[#a6d96a]/40 text-emerald-950 border-[#a6d96a] font-bold";
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilterMode("month");
    setSelectedMonth(dayjs());
    setDateRange(null);
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

      // 1. Header block
      const sheetData = [
        ["OPERATOR x MACHINE — best output per operator per machine"],
        [],
        [
          `Report Month: ${monthLabel}`,
          "",
          "",
          "Laser machines are scored on Output Rate (m/hr) — cutting length ÷ runtime. Folding machines don't cut or pierce, so they are scored on Weight Processed (kg/hr) instead. Darker green = faster/higher.",
        ],
        [],
        ["LASER CUTTING MACHINES — Output Rate (m/hr)"],
      ];

      // 2. Laser Table Headers
      const laserHeaders = ["Operator \\ Machine", ...laserMachines, "Best Machine", "Peak Output (m/hr)"];
      sheetData.push(laserHeaders);

      // 3. Laser Table Rows
      filteredLaserRows.forEach((r) => {
        const row = [
          r.operator,
          ...laserMachines.map((m) => Number((r.machineRates[m] || 0).toFixed(1))),
          r.bestMachine,
          Number(r.peakRate.toFixed(1)),
        ];
        sheetData.push(row);
      });

      // 4. Best Laser Operator per Machine row
      sheetData.push([]);
      sheetData.push(["Best Operator per Machine:"]);
      const bestLaserRow = [
        "Operator:",
        ...laserMachines.map((m) => bestLaserOperatorPerMachine[m]?.operator || "—"),
        "",
        "",
      ];
      sheetData.push(bestLaserRow);

      // 5. Blank spacing
      sheetData.push([]);
      sheetData.push(["FOLDING MACHINES — Weight Processed (kg/hr)"]);

      // 6. Folding Table Headers
      const foldingHeaders = ["Operator \\ Machine", ...foldingMachines, "Best Machine", "Peak Wt (kg/hr)"];
      sheetData.push(foldingHeaders);

      // 7. Folding Table Rows
      filteredFoldingRows.forEach((r) => {
        const row = [
          r.operator,
          ...foldingMachines.map((m) => Number((r.machineRates[m] || 0).toFixed(1))),
          r.bestMachine,
          Number(r.peakRate.toFixed(1)),
        ];
        sheetData.push(row);
      });

      // 8. Best Folding Operator per Machine row
      sheetData.push([]);
      sheetData.push(["Best Operator per Machine:"]);
      const bestFoldingRow = [
        "Operator:",
        ...foldingMachines.map((m) => bestFoldingOperatorPerMachine[m]?.operator || "—"),
        "",
        "",
      ];
      sheetData.push(bestFoldingRow);

      // 9. Footnote
      sheetData.push([]);
      sheetData.push([
        'Best Machine / Peak Output picks out, for each operator, the machine where their rate is highest. "Best Operator per Machine" reads each matrix column-wise. Folding volume is currently low, so its matrix will fill in as more folding jobs are logged.',
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Column widths
      worksheet["!cols"] = [
        { wch: 22 }, // Operator
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 20 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Operator x Machine");

      const fileName = `Operator_x_Machine_${monthLabel.replace(/[\s/]/g, "_")}.xlsx`;
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

  // Columns for Laser Table
  const laserColumns = [
    {
      title: "Operator \\ Machine",
      dataIndex: "operator",
      key: "operator",
      fixed: "left",
      width: 180,
      sorter: (a, b) => a.operator.localeCompare(b.operator),
      render: (text) => (
        <span className="font-bold text-slate-800 text-xs">{text}</span>
      ),
    },
    ...laserMachines.map((m) => ({
      title: m,
      dataIndex: m,
      key: m,
      align: "right",
      width: 130,
      sorter: (a, b) => (a.machineRates[m] || 0) - (b.machineRates[m] || 0),
      render: (_, record) => {
        const rate = record.machineRates[m] || 0;
        const styleClass = getLaserRateStyle(rate);
        const matchingRows = record.rawRows.filter(
          (r) => String(r.machine_name || "").trim().toUpperCase() === m
        );

        return (
          <div
            onClick={() => {
              if (matchingRows.length > 0) {
                setSelectedCellForDrawer({
                  operator: record.operator,
                  machine: m,
                  rate,
                  metricType: "laser",
                  rows: matchingRows,
                });
                setIsDrawerOpen(true);
              }
            }}
            className={`cursor-pointer flex justify-end ${matchingRows.length > 0 ? "hover:opacity-80" : ""}`}
          >
            <span
              className={`px-3 py-1 rounded border text-xs text-right inline-block min-w-[70px] ${styleClass}`}
            >
              {rate.toFixed(1)}
            </span>
          </div>
        );
      },
    })),
    {
      title: "Best Machine",
      dataIndex: "bestMachine",
      key: "bestMachine",
      width: 140,
      align: "center",
      sorter: (a, b) => a.bestMachine.localeCompare(b.bestMachine),
      render: (val) => (
        <span className={`font-semibold text-xs ${val !== "—" ? "text-slate-800" : "text-slate-400"}`}>
          {val}
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Highest cutting throughput achieved by this operator on any laser machine">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Peak Output (m/hr)
          </span>
        </Tooltip>
      ),
      dataIndex: "peakRate",
      key: "peakRate",
      width: 160,
      align: "right",
      sorter: (a, b) => a.peakRate - b.peakRate,
      render: (val) => (
        <span className="font-extrabold text-slate-900 text-xs">{val.toFixed(1)}</span>
      ),
    },
  ];

  // Columns for Folding Table
  const foldingColumns = [
    {
      title: "Operator \\ Machine",
      dataIndex: "operator",
      key: "operator",
      fixed: "left",
      width: 180,
      sorter: (a, b) => a.operator.localeCompare(b.operator),
      render: (text) => (
        <span className="font-bold text-slate-800 text-xs">{text}</span>
      ),
    },
    ...foldingMachines.map((m) => ({
      title: m,
      dataIndex: m,
      key: m,
      align: "right",
      width: 130,
      sorter: (a, b) => (a.machineRates[m] || 0) - (b.machineRates[m] || 0),
      render: (_, record) => {
        const rate = record.machineRates[m] || 0;
        const styleClass = getFoldingRateStyle(rate);
        const matchingRows = record.rawRows.filter(
          (r) => String(r.machine_name || "").trim().toUpperCase() === m
        );

        return (
          <div
            onClick={() => {
              if (matchingRows.length > 0) {
                setSelectedCellForDrawer({
                  operator: record.operator,
                  machine: m,
                  rate,
                  metricType: "folding",
                  rows: matchingRows,
                });
                setIsDrawerOpen(true);
              }
            }}
            className={`cursor-pointer flex justify-end ${matchingRows.length > 0 ? "hover:opacity-80" : ""}`}
          >
            <span
              className={`px-3 py-1 rounded border text-xs text-right inline-block min-w-[70px] ${styleClass}`}
            >
              {rate.toFixed(1)}
            </span>
          </div>
        );
      },
    })),
    {
      title: "Best Machine",
      dataIndex: "bestMachine",
      key: "bestMachine",
      width: 140,
      align: "center",
      sorter: (a, b) => a.bestMachine.localeCompare(b.bestMachine),
      render: (val) => (
        <span className={`font-semibold text-xs ${val !== "—" ? "text-slate-800" : "text-slate-400"}`}>
          {val}
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Highest weight processed rate achieved by this operator on any folding machine">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Peak Wt (kg/hr)
          </span>
        </Tooltip>
      ),
      dataIndex: "peakRate",
      key: "peakRate",
      width: 160,
      align: "right",
      sorter: (a, b) => a.peakRate - b.peakRate,
      render: (val) => (
        <span className="font-extrabold text-slate-900 text-xs">{val.toFixed(1)}</span>
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
              <Gauge className="w-6 h-6 text-blue-200" />
              <h1 className="text-lg sm:text-xl font-bold tracking-wide uppercase">
                OPERATOR x MACHINE — best output per operator per machine
              </h1>
            </div>
            <p className="text-xs text-blue-100/90 mt-1 max-w-4xl leading-relaxed">
              Laser machines are scored on Output Rate (m/hr) — cutting length ÷ runtime. Folding machines don't
              cut or pierce, so they are scored on Weight Processed (kg/hr) instead. Darker green = faster/higher.
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

            {/* Operator Search */}
            <div className="w-56">
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

      {/* 2. Top Performer Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Top Laser Operator */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Top Laser Performer</span>
            <Scissors className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-800 truncate" title={topLaserPerformer.operator}>
              {topLaserPerformer.operator}
            </span>
            {topLaserPerformer.rate > 0 && (
              <span className="text-xs font-bold text-emerald-600">
                {topLaserPerformer.rate.toFixed(1)} m/hr
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            On machine <strong>{topLaserPerformer.machine}</strong>
          </p>
        </Card>

        {/* Top Folding Operator */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Top Folding Performer</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-800 truncate" title={topFoldingPerformer.operator}>
              {topFoldingPerformer.operator}
            </span>
            {topFoldingPerformer.rate > 0 && (
              <span className="text-xs font-bold text-purple-600">
                {topFoldingPerformer.rate.toFixed(1)} kg/hr
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            On machine <strong>{topFoldingPerformer.machine}</strong>
          </p>
        </Card>

        {/* Laser Fleet Machines */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Laser Fleet</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-800">
              {laserMachines.length}{" "}
              <span className="text-xs font-normal text-slate-500">Machines ({laserMachines.join(", ")})</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Tracked for cutting output</p>
        </Card>

        {/* Folding Fleet Machines */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Folding Fleet</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-800">
              {foldingMachines.length}{" "}
              <span className="text-xs font-normal text-slate-500">Machines ({foldingMachines.join(", ")})</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Tracked for weight throughput</p>
        </Card>
      </div>

      {/* 3. Section 1: LASER CUTTING MACHINES */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        {/* Section Header */}
        <div className="bg-[#1f5592] px-5 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-blue-200" />
            <h2 className="text-sm font-bold tracking-wide uppercase">
              LASER CUTTING MACHINES — Output Rate (m/hr)
            </h2>
          </div>
          <span className="text-xs text-blue-100 font-normal">
            Period: {currentPeriodLabel}
          </span>
        </div>

        <Table
          columns={laserColumns}
          dataSource={filteredLaserRows}
          loading={isFetchingData}
          pagination={false}
          scroll={{ x: 800 }}
          rowClassName={(_record, index) =>
            index % 2 === 0 ? "bg-white hover:bg-blue-50/30 transition-colors" : "bg-slate-50/40 hover:bg-blue-50/30 transition-colors"
          }
        />

        {/* Best Operator per Machine Row */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider shrink-0">
            Best Operator per Machine:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Operator:</span>
            {laserMachines.map((m) => {
              const best = bestLaserOperatorPerMachine[m];
              return (
                <div
                  key={m}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded border border-slate-300 shadow-2xs text-xs"
                >
                  <span className="text-slate-500 font-medium">{m}:</span>
                  <span className={`font-bold ${best?.operator !== "—" ? "text-blue-900" : "text-slate-400"}`}>
                    {best?.operator || "—"}
                  </span>
                  {best && best.rate > 0 ? (
                    <span className="text-[10px] text-emerald-700 font-semibold">({best.rate.toFixed(1)})</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Section 2: FOLDING MACHINES */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        {/* Section Header */}
        <div className="bg-[#1f5592] px-5 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-200" />
            <h2 className="text-sm font-bold tracking-wide uppercase">
              FOLDING MACHINES — Weight Processed (kg/hr)
            </h2>
          </div>
          <span className="text-xs text-blue-100 font-normal">
            Period: {currentPeriodLabel}
          </span>
        </div>

        <Table
          columns={foldingColumns}
          dataSource={filteredFoldingRows}
          loading={isFetchingData}
          pagination={false}
          scroll={{ x: 900 }}
          rowClassName={(_record, index) =>
            index % 2 === 0 ? "bg-white hover:bg-blue-50/30 transition-colors" : "bg-slate-50/40 hover:bg-blue-50/30 transition-colors"
          }
        />

        {/* Best Operator per Machine Row */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider shrink-0">
            Best Operator per Machine:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Operator:</span>
            {foldingMachines.map((m) => {
              const best = bestFoldingOperatorPerMachine[m];
              return (
                <div
                  key={m}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded border border-slate-300 shadow-2xs text-xs"
                >
                  <span className="text-slate-500 font-medium">{m}:</span>
                  <span className={`font-bold ${best?.operator !== "—" ? "text-blue-900" : "text-slate-400"}`}>
                    {best?.operator || "—"}
                  </span>
                  {best && best.rate > 0 ? (
                    <span className="text-[10px] text-purple-700 font-semibold">({best.rate.toFixed(1)})</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Footnote Explanations */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed italic">
        <p>
          <strong>Best Machine / Peak Output</strong> picks out, for each operator, the machine where their rate is
          highest. <strong>"Best Operator per Machine"</strong> reads each matrix column-wise. Folding volume is currently
          low, so its matrix will fill in as more folding jobs are logged.
        </p>
      </div>

      {/* 6. Drilldown Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <span className="text-base font-bold text-slate-800">
                {selectedCellForDrawer?.operator} on {selectedCellForDrawer?.machine}
              </span>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                {selectedCellForDrawer?.rows.length} jobs run in {currentPeriodLabel}
              </p>
            </div>
          </div>
        }
        placement="right"
        width={750}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
      >
        {selectedCellForDrawer && (
          <div className="flex flex-col gap-5">
            {/* Summary mini-cards */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Operator</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedCellForDrawer.operator}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Machine</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedCellForDrawer.machine}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">
                  {selectedCellForDrawer.metricType === "laser" ? "Output Rate" : "Weight Rate"}
                </div>
                <div className="text-sm font-bold text-emerald-700 mt-0.5">
                  {selectedCellForDrawer.rate.toFixed(1)}{" "}
                  {selectedCellForDrawer.metricType === "laser" ? "m/hr" : "kg/hr"}
                </div>
              </div>
            </div>

            {/* List of individual job records */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Production Records ({selectedCellForDrawer.rows.length})
              </h3>

              <div className="flex flex-col gap-2.5 max-h-[65vh] overflow-y-auto pr-1">
                {selectedCellForDrawer.rows.map((row, idx) => (
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
                        <span className="text-slate-400 text-[10px]">Weight:</span>{" "}
                        <span className="font-semibold text-slate-800">
                          {Number(row.total_used_weight || row.total_weight || 0).toFixed(1)} kg
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

export default OperatorMachineReport;
