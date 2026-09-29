import React, { useState, useMemo, useEffect, useRef } from "react";
import { Table, DatePicker, InputNumber, Button, Card, Tag, Drawer, Tooltip, message } from "antd";
import {
  Flame,
  Wind,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  TrendingUp,
  Clock,
  Layers,
  IndianRupee,
  Activity,
} from "lucide-react";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useLazyGetOverallDetailsQuery } from "@/store/services/admin.api";
import { parseTimeToMinutes } from "./utils/productsTableUtils";

const { MonthPicker, RangePicker } = DatePicker;

const STANDARD_GASES = ["OXYGEN", "NITROGEN", "AIR"];

// Thickness bands definition
const THICKNESS_BANDS = [
  { label: "≤2 mm", min: 0, max: 2 },
  { label: "2.1–4 mm", min: 2.0001, max: 4 },
  { label: "4.1–6 mm", min: 4.0001, max: 6 },
  { label: "6.1–10 mm", min: 6.0001, max: 10 },
  { label: "10.1–16 mm", min: 10.0001, max: 16 },
  { label: "16.1–25 mm", min: 16.0001, max: 25 },
  { label: ">25 mm", min: 25.0001, max: 999999 },
];

const normalizeGas = (rawGas) => {
  const g = String(rawGas || "").trim().toUpperCase();
  if (g.includes("OXY") || g.includes("O2")) return "OXYGEN";
  if (g.includes("NITRO") || g.includes("N2")) return "NITROGEN";
  if (g.includes("AIR")) return "AIR";
  return "OXYGEN"; // default fallback for laser cutting
};

const GasUsageReport = () => {
  // Filters state
  const [filterMode, setFilterMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [dateRange, setDateRange] = useState(null);

  // Assumptions state (editable by user)
  const [flowRates, setFlowRates] = useState({
    OXYGEN: 1,
    NITROGEN: 5,
    AIR: 3,
  });

  const [costsPerUnit, setCostsPerUnit] = useState({
    OXYGEN: 42,
    NITROGEN: 55,
    AIR: 8,
  });

  // Data state
  const [rawData, setRawData] = useState([]);
  const [selectedDrawerData, setSelectedDrawerData] = useState(null);
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
      console.error("Failed to load gas usage data:", err);
      message.error("Failed to load gas usage data.");
    }
  };

  useEffect(() => {
    loadData();
  }, [apiFilters]);

  // 1. Process Section 1: Gas Usage Summary Table
  const gasUsageData = useMemo(() => {
    const gasMap = {
      OXYGEN: { jobs: 0, runtimeMinutes: 0, totalThickness: 0, rawRows: [] },
      NITROGEN: { jobs: 0, runtimeMinutes: 0, totalThickness: 0, rawRows: [] },
      AIR: { jobs: 0, runtimeMinutes: 0, totalThickness: 0, rawRows: [] },
    };

    rawData.forEach((row) => {
      const gas = normalizeGas(row.machine_gas_type);
      const entry = gasMap[gas];
      entry.jobs += 1;
      entry.rawRows.push(row);

      const mins = parseTimeToMinutes(row.machine_runtime);
      entry.runtimeMinutes += mins;

      const thick = Number(row.thick || 0);
      if (!isNaN(thick) && thick > 0) {
        entry.totalThickness += thick;
      }
    });

    return STANDARD_GASES.map((gas) => {
      const entry = gasMap[gas];
      const runtimeHours = entry.runtimeMinutes / 60;
      const flow = flowRates[gas] ?? 1;
      const costUnit = costsPerUnit[gas] ?? 1;
      const estConsumption = runtimeHours * flow;
      const estCost = estConsumption * costUnit;
      const avgThickness = entry.jobs > 0 ? entry.totalThickness / entry.jobs : 0;

      return {
        key: gas,
        gasType: gas,
        jobsCount: entry.jobs,
        runtimeHours,
        flowRate: flow,
        estConsumption,
        costPerUnit: costUnit,
        estCost,
        avgThickness,
        rawRows: entry.rawRows,
      };
    });
  }, [rawData, flowRates, costsPerUnit]);

  // Totals for Gas Usage Table
  const gasUsageTotals = useMemo(() => {
    let totalJobs = 0;
    let totalRuntimeHours = 0;
    let totalConsumption = 0;
    let totalCost = 0;

    gasUsageData.forEach((row) => {
      totalJobs += row.jobsCount;
      totalRuntimeHours += row.runtimeHours;
      totalConsumption += row.estConsumption;
      totalCost += row.estCost;
    });

    return {
      totalJobs,
      totalRuntimeHours,
      totalConsumption,
      totalCost,
    };
  }, [gasUsageData]);

  // 2. Process Section 2: Thickness Band x Gas Type Matrix Table
  const thicknessBandData = useMemo(() => {
    return THICKNESS_BANDS.map((band) => {
      let oxygenMins = 0;
      let nitrogenMins = 0;
      let airMins = 0;
      let totalCuttingLength = 0;
      let totalPiercing = 0;
      const bandRows = [];

      rawData.forEach((row) => {
        const thick = Number(row.thick || 0);
        if (thick >= band.min && thick <= band.max) {
          bandRows.push(row);
          const gas = normalizeGas(row.machine_gas_type);
          const mins = parseTimeToMinutes(row.machine_runtime);

          if (gas === "OXYGEN") oxygenMins += mins;
          else if (gas === "NITROGEN") nitrogenMins += mins;
          else if (gas === "AIR") airMins += mins;

          const meters = Number(row.total_meters ?? row.cut_length_per_sheet ?? 0);
          totalCuttingLength += isNaN(meters) ? 0 : meters;

          const pierce = Number(row.total_piercing ?? row.pierce_per_sheet ?? 0);
          totalPiercing += isNaN(pierce) ? 0 : pierce;
        }
      });

      const oxygenHours = oxygenMins / 60;
      const nitrogenHours = nitrogenMins / 60;
      const airHours = airMins / 60;
      const totalRunningHours = oxygenHours + nitrogenHours + airHours;

      return {
        key: band.label,
        bandLabel: band.label,
        oxygenHours,
        nitrogenHours,
        airHours,
        totalRunningHours,
        totalCuttingLength,
        totalPiercing,
        rawRows: bandRows,
      };
    });
  }, [rawData]);

  // Totals for Thickness Band Table
  const thicknessBandTotals = useMemo(() => {
    let sumOxygen = 0;
    let sumNitrogen = 0;
    let sumAir = 0;
    let sumRunningHours = 0;
    let sumCuttingLength = 0;
    let sumPiercing = 0;

    thicknessBandData.forEach((r) => {
      sumOxygen += r.oxygenHours;
      sumNitrogen += r.nitrogenHours;
      sumAir += r.airHours;
      sumRunningHours += r.totalRunningHours;
      sumCuttingLength += r.totalCuttingLength;
      sumPiercing += r.totalPiercing;
    });

    return {
      sumOxygen,
      sumNitrogen,
      sumAir,
      sumRunningHours,
      sumCuttingLength,
      sumPiercing,
    };
  }, [thicknessBandData]);

  // Cell heatmap style matching the spreadsheet
  const getMatrixCellBadgeStyle = (hrs) => {
    if (hrs <= 0) {
      return "bg-[#f8696b]/30 text-rose-900 border-[#f8696b]/50";
    }
    if (hrs >= 30) {
      return "bg-[#57bb8a]/40 text-emerald-950 border-[#57bb8a] font-bold";
    }
    if (hrs >= 15) {
      return "bg-[#a6d96a]/40 text-emerald-900 border-[#a6d96a] font-bold";
    }
    if (hrs >= 5) {
      return "bg-[#fee08b]/45 text-amber-950 border-[#fee08b] font-semibold";
    }
    return "bg-[#fdae61]/35 text-orange-950 border-[#fdae61] font-medium";
  };

  const getGasCostBadgeStyle = (cost) => {
    if (cost <= 0) {
      return "bg-[#f8696b]/30 text-rose-900 border-[#f8696b]/50";
    }
    if (cost >= 5000) {
      return "bg-[#57bb8a]/40 text-emerald-950 border-[#57bb8a] font-bold";
    }
    if (cost >= 1000) {
      return "bg-[#fee08b]/50 text-amber-950 border-[#fee08b] font-bold";
    }
    return "bg-[#f8696b]/30 text-rose-950 border-[#f8696b] font-bold";
  };

  // Reset Filters & Assumptions
  const handleReset = () => {
    setFilterMode("month");
    setSelectedMonth(dayjs());
    setDateRange(null);
    setFlowRates({
      OXYGEN: 1,
      NITROGEN: 5,
      AIR: 3,
    });
    setCostsPerUnit({
      OXYGEN: 42,
      NITROGEN: 55,
      AIR: 8,
    });
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

      const sheetData = [
        ["GAS USAGE — Oxygen / Nitrogen / Air consumption and cost"],
        [],
        [
          `Report Month: ${monthLabel}`,
          "",
          "",
          "Consumption is estimated as Runtime Hours x Flow Rate (your job tracker logs cutting time and gas type per job, not a flow-meter reading). Edit the yellow Flow Rate / Cost cells to match your cylinders / plant meters.",
        ],
        [],
        // Section 1 Headers
        [
          "Gas Type",
          "Jobs",
          "Runtime (Hrs)",
          "Flow Rate (unit/hr)",
          "Est. Consumption (units)",
          "Cost / Unit (INR)",
          "Est. Cost (INR)",
          "Avg Thickness Cut (mm)",
        ],
      ];

      // Section 1 Rows
      gasUsageData.forEach((row) => {
        sheetData.push([
          row.gasType,
          row.jobsCount,
          Number(row.runtimeHours.toFixed(2)),
          row.flowRate,
          Number(row.estConsumption.toFixed(1)),
          row.costPerUnit,
          Math.round(row.estCost),
          Number(row.avgThickness.toFixed(1)),
        ]);
      });

      // Section 1 Total Row
      sheetData.push([
        "TOTAL",
        gasUsageTotals.totalJobs,
        Number(gasUsageTotals.totalRuntimeHours.toFixed(2)),
        "",
        Number(gasUsageTotals.totalConsumption.toFixed(1)),
        "",
        Math.round(gasUsageTotals.totalCost),
        "",
      ]);

      // Section 1 Note
      sheetData.push([]);
      sheetData.push([
        "Flow Rate and Cost/Unit are placeholder figures — replace with your supplier's cylinder consumption rate (or flow-meter Nm3/hr) and your actual gas cost per unit.",
      ]);
      sheetData.push([]);

      // Section 2 Headers
      sheetData.push(["RUNNING TIME (Hrs) BY THICKNESS BAND x GAS TYPE"]);
      sheetData.push([
        "Thickness Band",
        "OXYGEN",
        "NITROGEN",
        "AIR",
        "Total Running Time (Hrs)",
        "Total Cutting Length (m)",
        "Total Piercing",
      ]);

      // Section 2 Rows
      thicknessBandData.forEach((r) => {
        sheetData.push([
          r.bandLabel,
          Number(r.oxygenHours.toFixed(2)),
          Number(r.nitrogenHours.toFixed(2)),
          Number(r.airHours.toFixed(2)),
          Number(r.totalRunningHours.toFixed(2)),
          Number(r.totalCuttingLength.toFixed(1)),
          r.totalPiercing,
        ]);
      });

      // Section 2 Total Row
      sheetData.push([
        "TOTAL",
        Number(thicknessBandTotals.sumOxygen.toFixed(2)),
        Number(thicknessBandTotals.sumNitrogen.toFixed(2)),
        Number(thicknessBandTotals.sumAir.toFixed(2)),
        Number(thicknessBandTotals.sumRunningHours.toFixed(2)),
        Number(thicknessBandTotals.sumCuttingLength.toFixed(1)),
        thicknessBandTotals.sumPiercing,
      ]);

      // Section 2 Footnote
      sheetData.push([]);
      sheetData.push([
        "Shows which thickness band is driving each gas's running time — e.g. thicker material typically needs more Oxygen minutes per sheet. Use alongside Sheet 6 for the full thickness-wise picture.",
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      worksheet["!cols"] = [
        { wch: 22 }, // Gas / Band
        { wch: 14 }, // Jobs / O2
        { wch: 16 }, // Runtime / N2
        { wch: 20 }, // Flow Rate / Air
        { wch: 24 }, // Est Consumption / Total Run
        { wch: 18 }, // Cost per Unit / Cut Length
        { wch: 18 }, // Est Cost / Piercing
        { wch: 22 }, // Avg Thickness
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Gas Usage");

      const fileName = `Gas_Usage_${monthLabel.replace(/[\s/]/g, "_")}.xlsx`;
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

  // Columns for Section 1: Gas Usage Summary
  const gasUsageColumns = [
    {
      title: "Gas Type",
      dataIndex: "gasType",
      key: "gasType",
      width: 150,
      render: (text, record) => (
        <div
          onClick={() => {
            setSelectedDrawerData({
              title: `${text} — Job Orders History`,
              subtitle: `${record.jobsCount} jobs using ${text}`,
              rows: record.rawRows,
            });
            setIsDrawerOpen(true);
          }}
          className="cursor-pointer font-bold text-slate-800 hover:text-blue-600 flex items-center gap-2"
        >
          {text === "OXYGEN" ? (
            <Flame className="w-4 h-4 text-orange-500" />
          ) : text === "NITROGEN" ? (
            <Wind className="w-4 h-4 text-cyan-500" />
          ) : (
            <Activity className="w-4 h-4 text-slate-500" />
          )}
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: "Jobs",
      dataIndex: "jobsCount",
      key: "jobsCount",
      align: "right",
      width: 100,
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
        <Tooltip title="Flow rate assumption (Nm3 or units per hour). Editable.">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Flow Rate (unit/hr)
          </span>
        </Tooltip>
      ),
      dataIndex: "flowRate",
      key: "flowRate",
      align: "right",
      width: 160,
      render: (val, record) => (
        <div className="flex justify-end">
          <InputNumber
            min={0.1}
            max={100}
            step={0.5}
            value={val}
            onChange={(newVal) => {
              if (newVal !== null && newVal > 0) {
                setFlowRates((prev) => ({ ...prev, [record.gasType]: newVal }));
              }
            }}
            className="w-20 h-7 text-xs font-bold bg-amber-50 border-amber-300"
          />
        </div>
      ),
    },
    {
      title: (
        <Tooltip title="Runtime (Hrs) × Flow Rate">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Est. Consumption (units)
          </span>
        </Tooltip>
      ),
      dataIndex: "estConsumption",
      key: "estConsumption",
      align: "right",
      width: 180,
      render: (val) => (
        <span className="font-bold text-slate-800">{val.toFixed(1)}</span>
      ),
    },
    {
      title: (
        <Tooltip title="Cost per unit in INR (cylinder or supply cost). Editable.">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Cost / Unit (INR)
          </span>
        </Tooltip>
      ),
      dataIndex: "costPerUnit",
      key: "costPerUnit",
      align: "right",
      width: 160,
      render: (val, record) => (
        <div className="flex justify-end">
          <InputNumber
            min={1}
            max={10000}
            step={1}
            value={val}
            onChange={(newVal) => {
              if (newVal !== null && newVal > 0) {
                setCostsPerUnit((prev) => ({ ...prev, [record.gasType]: newVal }));
              }
            }}
            className="w-20 h-7 text-xs font-bold bg-amber-50 border-amber-300"
          />
        </div>
      ),
    },
    {
      title: (
        <Tooltip title="Est. Consumption × Cost / Unit">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Est. Cost (INR)
          </span>
        </Tooltip>
      ),
      dataIndex: "estCost",
      key: "estCost",
      align: "right",
      width: 150,
      render: (val) => {
        const badgeClass = getGasCostBadgeStyle(val);
        return (
          <div className="flex justify-end">
            <span className={`px-2.5 py-1 rounded border text-xs text-right inline-block min-w-[75px] ${badgeClass}`}>
              ₹{Math.round(val).toLocaleString()}
            </span>
          </div>
        );
      },
    },
    {
      title: "Avg Thickness Cut (mm)",
      dataIndex: "avgThickness",
      key: "avgThickness",
      align: "right",
      width: 180,
      render: (val) => (
        <span className="font-medium text-slate-700">{val.toFixed(1)}</span>
      ),
    },
  ];

  // Columns for Section 2: Thickness Band Matrix
  const thicknessBandColumns = [
    {
      title: "Thickness Band",
      dataIndex: "bandLabel",
      key: "bandLabel",
      width: 160,
      render: (text) => <span className="font-bold text-slate-800 text-xs">{text}</span>,
    },
    {
      title: "OXYGEN",
      dataIndex: "oxygenHours",
      key: "oxygenHours",
      align: "right",
      width: 130,
      render: (val, record) => {
        const badgeClass = getMatrixCellBadgeStyle(val);
        const matching = record.rawRows.filter((r) => normalizeGas(r.machine_gas_type) === "OXYGEN");
        return (
          <div
            onClick={() => {
              if (matching.length > 0) {
                setSelectedDrawerData({
                  title: `OXYGEN at ${record.bandLabel}`,
                  subtitle: `${matching.length} jobs cut with Oxygen`,
                  rows: matching,
                });
                setIsDrawerOpen(true);
              }
            }}
            className={`flex justify-end ${matching.length > 0 ? "cursor-pointer hover:opacity-80" : ""}`}
          >
            <span className={`px-2.5 py-1 rounded border text-xs text-right inline-block min-w-[65px] ${badgeClass}`}>
              {val.toFixed(2)}
            </span>
          </div>
        );
      },
    },
    {
      title: "NITROGEN",
      dataIndex: "nitrogenHours",
      key: "nitrogenHours",
      align: "right",
      width: 130,
      render: (val, record) => {
        const badgeClass = getMatrixCellBadgeStyle(val);
        const matching = record.rawRows.filter((r) => normalizeGas(r.machine_gas_type) === "NITROGEN");
        return (
          <div
            onClick={() => {
              if (matching.length > 0) {
                setSelectedDrawerData({
                  title: `NITROGEN at ${record.bandLabel}`,
                  subtitle: `${matching.length} jobs cut with Nitrogen`,
                  rows: matching,
                });
                setIsDrawerOpen(true);
              }
            }}
            className={`flex justify-end ${matching.length > 0 ? "cursor-pointer hover:opacity-80" : ""}`}
          >
            <span className={`px-2.5 py-1 rounded border text-xs text-right inline-block min-w-[65px] ${badgeClass}`}>
              {val.toFixed(2)}
            </span>
          </div>
        );
      },
    },
    {
      title: "AIR",
      dataIndex: "airHours",
      key: "airHours",
      align: "right",
      width: 130,
      render: (val, record) => {
        const badgeClass = getMatrixCellBadgeStyle(val);
        const matching = record.rawRows.filter((r) => normalizeGas(r.machine_gas_type) === "AIR");
        return (
          <div
            onClick={() => {
              if (matching.length > 0) {
                setSelectedDrawerData({
                  title: `AIR at ${record.bandLabel}`,
                  subtitle: `${matching.length} jobs cut with Compressed Air`,
                  rows: matching,
                });
                setIsDrawerOpen(true);
              }
            }}
            className={`flex justify-end ${matching.length > 0 ? "cursor-pointer hover:opacity-80" : ""}`}
          >
            <span className={`px-2.5 py-1 rounded border text-xs text-right inline-block min-w-[65px] ${badgeClass}`}>
              {val.toFixed(2)}
            </span>
          </div>
        );
      },
    },
    {
      title: "Total Running Time (Hrs)",
      dataIndex: "totalRunningHours",
      key: "totalRunningHours",
      align: "right",
      width: 180,
      render: (val) => (
        <span className="font-bold text-slate-800 text-xs">{val.toFixed(2)}</span>
      ),
    },
    {
      title: "Total Cutting Length (m)",
      dataIndex: "totalCuttingLength",
      key: "totalCuttingLength",
      align: "right",
      width: 180,
      render: (val) => (
        <span className="font-semibold text-slate-800 text-xs">
          {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      title: "Total Piercing",
      dataIndex: "totalPiercing",
      key: "totalPiercing",
      align: "right",
      width: 140,
      render: (val) => (
        <span className="font-medium text-slate-700 text-xs">{val.toLocaleString()}</span>
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
              <Flame className="w-6 h-6 text-orange-300" />
              <h1 className="text-lg sm:text-xl font-bold tracking-wide uppercase">
                GAS USAGE — Oxygen / Nitrogen / Air consumption and cost
              </h1>
            </div>
            <p className="text-xs text-blue-100/90 mt-1 max-w-4xl leading-relaxed">
              Consumption is estimated as Runtime Hours x Flow Rate (your job tracker logs cutting time and gas type per job,
              not a flow-meter reading). Edit the yellow Flow Rate / Cost cells to match your cylinders / plant meters.
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
              Reset Assumptions
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Estimated Cost */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Est. Total Gas Cost</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-900">
              ₹{Math.round(gasUsageTotals.totalCost).toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Across {gasUsageTotals.totalJobs} jobs</p>
        </Card>

        {/* Total Gas Runtime */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Gas Runtime</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-900">
              {gasUsageTotals.totalRuntimeHours.toFixed(2)}{" "}
              <span className="text-xs font-normal text-slate-500">Hrs</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Cutting torch active duration</p>
        </Card>

        {/* Primary Gas Driver */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Primary Gas Type</span>
            <TrendingUp className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-900">
              OXYGEN{" "}
              <span className="text-xs font-normal text-slate-500">
                ({gasUsageTotals.totalRuntimeHours > 0 ? ((gasUsageData.find((g) => g.gasType === "OXYGEN")?.runtimeHours || 0) / gasUsageTotals.totalRuntimeHours * 100).toFixed(1) : 0}%)
              </span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Highest cutting duration share</p>
        </Card>

        {/* Total Estimated Consumption */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Units Consumed</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-900">
              {gasUsageTotals.totalConsumption.toFixed(1)}{" "}
              <span className="text-xs font-normal text-slate-500">units</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Runtime × Flow Rate</p>
        </Card>
      </div>

      {/* 3. Section 1: GAS USAGE TABLE */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        <div className="bg-[#1f5592] px-5 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-200" />
            <h2 className="text-sm font-bold tracking-wide uppercase">
              GAS CONSUMPTION & ESTIMATED COST
            </h2>
          </div>
          <span className="text-xs text-blue-100 font-normal">
            Period: {currentPeriodLabel}
          </span>
        </div>

        <Table
          columns={gasUsageColumns}
          dataSource={gasUsageData}
          loading={isFetchingData}
          pagination={false}
          scroll={{ x: 1000 }}
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
                  <span className="font-bold text-slate-900">{gasUsageTotals.totalJobs.toLocaleString()}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span className="font-bold text-slate-900">{gasUsageTotals.totalRuntimeHours.toFixed(2)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <span className="text-slate-400 font-normal text-xs">—</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <span className="font-extrabold text-slate-900">{gasUsageTotals.totalConsumption.toFixed(1)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <span className="text-slate-400 font-normal text-xs">—</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <div className="flex justify-end">
                    <span className="px-2.5 py-1 rounded bg-slate-200 border border-slate-300 font-extrabold text-slate-900 text-xs">
                      ₹{Math.round(gasUsageTotals.totalCost).toLocaleString()}
                    </span>
                  </div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <span className="text-slate-400 font-normal text-xs">—</span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        {/* Section 1 Footnote */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 italic">
          <p>
            <strong>Flow Rate</strong> and <strong>Cost/Unit</strong> are editable parameters &mdash; replace with your supplier's
            cylinder consumption rate (or flow-meter Nm3/hr) and actual gas cost per unit to calculate precise expenditures.
          </p>
        </div>
      </div>

      {/* 4. Section 2: RUNNING TIME BY THICKNESS BAND x GAS TYPE */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        <div className="bg-[#1f5592] px-5 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-200" />
            <h2 className="text-sm font-bold tracking-wide uppercase">
              RUNNING TIME (Hrs) BY THICKNESS BAND x GAS TYPE
            </h2>
          </div>
          <span className="text-xs text-blue-100 font-normal">
            Period: {currentPeriodLabel}
          </span>
        </div>

        <Table
          columns={thicknessBandColumns}
          dataSource={thicknessBandData}
          loading={isFetchingData}
          pagination={false}
          scroll={{ x: 1000 }}
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
                  <span className="font-bold text-slate-900">{thicknessBandTotals.sumOxygen.toFixed(2)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span className="font-bold text-slate-900">{thicknessBandTotals.sumNitrogen.toFixed(2)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <span className="font-bold text-slate-900">{thicknessBandTotals.sumAir.toFixed(2)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <span className="font-extrabold text-slate-900">{thicknessBandTotals.sumRunningHours.toFixed(2)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <span className="font-bold text-slate-900">
                    {thicknessBandTotals.sumCuttingLength.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <span className="font-bold text-slate-900">{thicknessBandTotals.sumPiercing.toLocaleString()}</span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        {/* Section 2 Footnote */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 italic">
          <p>
            Shows which thickness band is driving each gas's running time &mdash; thicker material typically needs more Oxygen minutes per sheet.
          </p>
        </div>
      </div>

      {/* 5. Job Details Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <div>
              <span className="text-base font-bold text-slate-800">{selectedDrawerData?.title}</span>
              <p className="text-xs text-slate-500 font-normal mt-0.5">{selectedDrawerData?.subtitle}</p>
            </div>
          </div>
        }
        placement="right"
        width={750}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
      >
        {selectedDrawerData && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Manufacturing Job Records ({selectedDrawerData.rows.length})
            </h3>

            <div className="flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto pr-1">
              {selectedDrawerData.rows.map((row, idx) => (
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
                      <span className="text-slate-400 text-[10px]">Gas Type:</span>{" "}
                      <Tag color="orange" className="text-[10px] font-bold">
                        {String(row.machine_gas_type || "OXYGEN")}
                      </Tag>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Thickness:</span>{" "}
                      <span className="font-semibold text-slate-700">{row.thick ? `${row.thick}mm` : "—"}</span>
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
        )}
      </Drawer>
    </div>
  );
};

export default GasUsageReport;
