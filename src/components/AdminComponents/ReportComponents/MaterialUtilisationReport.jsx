import React, { useState, useMemo, useEffect, useRef } from "react";
import { Table, DatePicker, Select, Button, Card, Tag, Drawer, Tooltip, message } from "antd";
import {
  PieChart,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Scale,
  Percent,
  Layers,
  ChevronRight,
  TrendingUp,
  Building2,
  Trash2,
} from "lucide-react";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useLazyGetOverallDetailsQuery, useGetCompaniesQuery } from "@/store/services/admin.api";

const { MonthPicker, RangePicker } = DatePicker;

const STANDARD_MATERIAL_TYPES = ["MS", "SS", "AL", "GI", "CU", "BR", "CHQ"];

const normalizeMaterialType = (rawMat) => {
  const m = String(rawMat || "").trim().toUpperCase();
  if (!m) return "MS";
  if (m === "MS" || m.includes("MILD")) return "MS";
  if (m === "SS" || m.includes("STAINLESS")) return "SS";
  if (m === "AL" || m.includes("ALUMIN")) return "AL";
  if (m === "GI" || m.includes("GALV")) return "GI";
  if (m === "CU" || m.includes("COPPER")) return "CU";
  if (m === "BR" || m.includes("BRASS")) return "BR";
  if (m === "CHQ" || m.includes("CHEQ")) return "CHQ";
  return m;
};

const MaterialUtilisationReport = () => {
  // Filters state
  const [filterMode, setFilterMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [dateRange, setDateRange] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState("ALL");

  // Data state
  const [rawData, setRawData] = useState([]);
  const [selectedRowForDrawer, setSelectedRowForDrawer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const printTableRef = useRef(null);

  // APIs
  const [triggerGetOverallDetails, { isLoading: isFetchingData }] = useLazyGetOverallDetailsQuery();
  const { data: registeredCompanies = [] } = useGetCompaniesQuery(undefined);

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
      console.error("Failed to load material utilisation data:", err);
      message.error("Failed to load material utilisation data.");
    }
  };

  useEffect(() => {
    loadData();
  }, [apiFilters]);

  // Available Companies for Customer Filter Dropdown
  const companyOptions = useMemo(() => {
    const compSet = new Set();
    registeredCompanies.forEach((c) => {
      if (c.company_name) compSet.add(c.company_name.trim().toUpperCase());
    });
    rawData.forEach((r) => {
      if (r.company_name) compSet.add(String(r.company_name).trim().toUpperCase());
    });

    const sorted = Array.from(compSet).sort();
    return [{ label: "ALL Customers", value: "ALL" }, ...sorted.map((c) => ({ label: c, value: c }))];
  }, [registeredCompanies, rawData]);

  // Filter raw data by selected customer
  const filteredRawData = useMemo(() => {
    if (selectedCustomer === "ALL") return rawData;
    return rawData.filter((r) => String(r.company_name || "").trim().toUpperCase() === selectedCustomer);
  }, [rawData, selectedCustomer]);

  // Calculate material utilisation per material type (standard 7 types + extras if any)
  const materialUtilisationData = useMemo(() => {
    const matMap = new Map();

    // Initialize standard 7 types
    STANDARD_MATERIAL_TYPES.forEach((type) => {
      matMap.set(type, {
        matType: type,
        jobsCount: 0,
        stockWeight: 0,
        usedWeight: 0,
        rawRows: [],
      });
    });

    // Populate with filtered job records
    filteredRawData.forEach((row) => {
      const mat = normalizeMaterialType(row.mat_type);

      if (!matMap.has(mat)) {
        matMap.set(mat, {
          matType: mat,
          jobsCount: 0,
          stockWeight: 0,
          usedWeight: 0,
          rawRows: [],
        });
      }

      const entry = matMap.get(mat);
      entry.jobsCount += 1;
      entry.rawRows.push(row);

      // Used Weight (actual consumed weight)
      const used = Number(row.total_used_weight ?? row.used_weight ?? row.part_weight ?? row.total_weight ?? 0);
      entry.usedWeight += isNaN(used) ? 0 : used;

      // Stock Weight (full weight of stock sheet)
      const stock = Number(row.stock_weight ?? row.total_stock_weight ?? row.sheet_weight ?? 0);
      if (!isNaN(stock) && stock > 0) {
        entry.stockWeight += stock;
      } else {
        // Fallback: If stock_weight is not separately logged, stock is at least equal to used weight
        entry.stockWeight += isNaN(used) ? 0 : used;
      }
    });

    // Convert map to list and compute utilisation % and remnant %
    const list = Array.from(matMap.values()).map((entry) => {
      const remnantScrapWeight = Math.max(0, entry.stockWeight - entry.usedWeight);
      const utilisationPercent = entry.stockWeight > 0 ? (entry.usedWeight / entry.stockWeight) * 100 : 0;
      const remnantPercent = entry.stockWeight > 0 ? (remnantScrapWeight / entry.stockWeight) * 100 : 0;

      return {
        key: entry.matType,
        matType: entry.matType,
        jobsCount: entry.jobsCount,
        stockWeight: entry.stockWeight,
        usedWeight: entry.usedWeight,
        remnantScrapWeight,
        utilisationPercent,
        remnantPercent,
        rawRows: entry.rawRows,
      };
    });

    // Keep standard 7 order first, followed by others
    return list.sort((a, b) => {
      const idxA = STANDARD_MATERIAL_TYPES.indexOf(a.matType);
      const idxB = STANDARD_MATERIAL_TYPES.indexOf(b.matType);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.matType.localeCompare(b.matType);
    });
  }, [filteredRawData]);

  // Summary row totals
  const overallTotals = useMemo(() => {
    let totalJobs = 0;
    let totalStockWeight = 0;
    let totalUsedWeight = 0;

    materialUtilisationData.forEach((r) => {
      totalJobs += r.jobsCount;
      totalStockWeight += r.stockWeight;
      totalUsedWeight += r.usedWeight;
    });

    const totalRemnantScrap = Math.max(0, totalStockWeight - totalUsedWeight);
    const overallUtilisation = totalStockWeight > 0 ? (totalUsedWeight / totalStockWeight) * 100 : 0;
    const overallRemnantPercent = totalStockWeight > 0 ? (totalRemnantScrap / totalStockWeight) * 100 : 0;

    return {
      totalJobs,
      totalStockWeight,
      totalUsedWeight,
      totalRemnantScrap,
      overallUtilisation,
      overallRemnantPercent,
    };
  }, [materialUtilisationData]);

  // Heatmap badge styling for Utilisation % matching Excel layout
  const getUtilisationBadgeStyle = (pct) => {
    if (pct <= 0) {
      return "bg-[#f8696b]/30 text-rose-900 border-[#f8696b]/50 font-bold";
    }
    if (pct >= 50) {
      return "bg-[#57bb8a]/40 text-emerald-950 border-[#57bb8a] font-bold";
    }
    if (pct >= 20) {
      return "bg-[#a6d96a]/40 text-emerald-900 border-[#a6d96a] font-bold";
    }
    if (pct >= 5) {
      return "bg-[#fee08b]/50 text-amber-950 border-[#fee08b] font-bold";
    }
    return "bg-[#a6d96a]/40 text-emerald-900 border-[#a6d96a] font-bold";
  };

  // Reset Filters
  const handleReset = () => {
    setFilterMode("month");
    setSelectedMonth(dayjs());
    setDateRange(null);
    setSelectedCustomer("ALL");
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
        "Material Type",
        "Jobs",
        "Stock Weight (kg)",
        "Used Weight (kg)",
        "Remnant / Scrap (kg)",
        "Utilisation %",
        "Remnant %",
      ];

      const dataRows = materialUtilisationData.map((row) => [
        row.matType,
        row.jobsCount,
        Number(row.stockWeight.toFixed(1)),
        Number(row.usedWeight.toFixed(1)),
        Number(row.remnantScrapWeight.toFixed(1)),
        `${row.utilisationPercent.toFixed(1)}%`,
        `${row.remnantPercent.toFixed(1)}%`,
      ]);

      const totalRow = [
        "TOTAL / OVERALL",
        overallTotals.totalJobs,
        Number(overallTotals.totalStockWeight.toFixed(1)),
        Number(overallTotals.totalUsedWeight.toFixed(1)),
        Number(overallTotals.totalRemnantScrap.toFixed(1)),
        `${overallTotals.overallUtilisation.toFixed(1)}%`,
        `${overallTotals.overallRemnantPercent.toFixed(1)}%`,
      ];

      const sheetData = [
        ["MATERIAL UTILISATION — stock weight vs. used (consumed) weight"],
        [],
        [
          `Report Month: ${monthLabel}`,
          "",
          `"Stock Weight" is the full weight of the stock sheet a job was cut from; "Used Weight" is what that job actually consumed. Company-wide the gap is large because sheets are shared across jobs.`,
        ],
        [
          `Customer Filter: ${selectedCustomer}`,
          "",
          `Type a Company name exactly as it appears in Raw_Data's Company column (or leave "ALL") to see that one customer's material type mix.`,
        ],
        [],
        headers,
        ...dataRows,
        totalRow,
        [],
        [
          "7 material types shown — MS/SS/AL/GI/CU/BR/CHQ, matching your Mat Type field. Combine the Customer Filter with Report Month to slice by both at once — e.g. one customer's Aluminium usage in June.",
        ],
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      worksheet["!cols"] = [
        { wch: 18 }, // Material Type
        { wch: 10 }, // Jobs
        { wch: 20 }, // Stock Weight
        { wch: 20 }, // Used Weight
        { wch: 24 }, // Remnant / Scrap
        { wch: 16 }, // Utilisation %
        { wch: 16 }, // Remnant %
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Material Utilisation");

      const fileName = `Material_Utilisation_${monthLabel.replace(/[\s/]/g, "_")}.xlsx`;
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
      title: "Material Type",
      dataIndex: "matType",
      key: "matType",
      fixed: "left",
      width: 150,
      render: (text, record) => (
        <div
          onClick={() => {
            setSelectedRowForDrawer(record);
            setIsDrawerOpen(true);
          }}
          className="flex items-center justify-between group cursor-pointer font-bold text-slate-800 hover:text-blue-600 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-xs">
              {text}
            </span>
            <span>{text}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
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
      title: (
        <Tooltip title="Full weight of the stock sheets loaded onto the machine (in kg)">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Stock Weight (kg)
          </span>
        </Tooltip>
      ),
      dataIndex: "stockWeight",
      key: "stockWeight",
      align: "right",
      width: 180,
      render: (val) => (
        <span className="font-semibold text-slate-800">
          {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Actual material weight consumed for finished parts (in kg)">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Used Weight (kg)
          </span>
        </Tooltip>
      ),
      dataIndex: "usedWeight",
      key: "usedWeight",
      align: "right",
      width: 180,
      render: (val) => (
        <span className="font-semibold text-slate-800">
          {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Stock Weight minus Used Weight (in kg)">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Remnant / Scrap (kg)
          </span>
        </Tooltip>
      ),
      dataIndex: "remnantScrapWeight",
      key: "remnantScrapWeight",
      align: "right",
      width: 190,
      render: (val) => (
        <span className="font-medium text-slate-700">
          {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="(Used Weight ÷ Stock Weight) × 100%">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Utilisation %
          </span>
        </Tooltip>
      ),
      dataIndex: "utilisationPercent",
      key: "utilisationPercent",
      align: "right",
      width: 150,
      render: (val) => {
        const badgeClass = getUtilisationBadgeStyle(val);
        return (
          <div className="flex justify-end">
            <span className={`px-2.5 py-1 rounded border text-xs text-right inline-block min-w-[65px] ${badgeClass}`}>
              {val.toFixed(1)}%
            </span>
          </div>
        );
      },
    },
    {
      title: (
        <Tooltip title="(Remnant Weight ÷ Stock Weight) × 100%">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Remnant %
          </span>
        </Tooltip>
      ),
      dataIndex: "remnantPercent",
      key: "remnantPercent",
      align: "right",
      width: 140,
      render: (val) => (
        <span className="font-semibold text-slate-700">{val.toFixed(1)}%</span>
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
              <PieChart className="w-6 h-6 text-blue-200" />
              <h1 className="text-lg sm:text-xl font-bold tracking-wide uppercase">
                MATERIAL UTILISATION — stock weight vs. used (consumed) weight
              </h1>
            </div>
            <p className="text-xs text-blue-100/90 mt-1 max-w-4xl leading-relaxed">
              "Stock Weight" is the full weight of the stock sheet a job was cut from; "Used Weight" is what that job actually
              consumed. Company-wide the gap is large because sheets are shared across jobs.
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

            {/* Customer Filter Dropdown */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-2xs">
              <span className="text-xs font-bold text-slate-700">Customer Filter:</span>
              <Select
                value={selectedCustomer}
                onChange={setSelectedCustomer}
                showSearch
                className="w-64 h-7 text-xs"
                options={companyOptions}
                filterOption={(input, option) =>
                  (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleReset}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              className="text-xs h-8 text-slate-600 hover:text-slate-900"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Stock Weight */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Stock Weight</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-900">
              {overallTotals.totalStockWeight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
              <span className="text-xs font-normal text-slate-500">kg</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            ≈ {(overallTotals.totalStockWeight / 1000).toFixed(1)} tonnes loaded
          </p>
        </Card>

        {/* Total Used Weight */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Used Weight</span>
            <Scale className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-emerald-800">
              {overallTotals.totalUsedWeight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
              <span className="text-xs font-normal text-slate-500">kg</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Finished parts material</p>
        </Card>

        {/* Remnant / Scrap */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Remnant / Scrap</span>
            <Trash2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-900">
              {overallTotals.totalRemnantScrap.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
              <span className="text-xs font-normal text-slate-500">kg</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Available for next nesting</p>
        </Card>

        {/* Overall Utilisation % */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overall Utilisation</span>
            <Percent className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-emerald-700">
              {overallTotals.overallUtilisation.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Used ÷ Stock ratio</p>
        </Card>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 font-medium">
            <span>
              Material Utilisation Analysis for <strong>{currentPeriodLabel}</strong>
              {selectedCustomer !== "ALL" ? ` • Customer: ${selectedCustomer}` : " • All Customers"}
            </span>
          </div>
          <div className="text-slate-400 text-[11px]">
            7 Material types shown (MS/SS/AL/GI/CU/BR/CHQ) • Click any row for orders breakdown
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={materialUtilisationData}
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
                  <span className="font-bold text-slate-900">{overallTotals.totalJobs.toLocaleString()}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span className="font-bold text-slate-900">
                    {overallTotals.totalStockWeight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <span className="font-bold text-slate-900">
                    {overallTotals.totalUsedWeight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <span className="font-bold text-slate-900">
                    {overallTotals.totalRemnantScrap.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <div className="flex justify-end">
                    <span className="px-2.5 py-1 rounded bg-slate-200 border border-slate-300 font-extrabold text-slate-900 text-xs">
                      {overallTotals.overallUtilisation.toFixed(1)}%
                    </span>
                  </div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <span className="font-bold text-slate-900">{overallTotals.overallRemnantPercent.toFixed(1)}%</span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        {/* Footnote Explanation */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 leading-relaxed italic">
          <p>
            7 material types shown &mdash; <strong>MS/SS/AL/GI/CU/BR/CHQ</strong>, matching your Mat Type field. Combine the
            Customer Filter with Report Month to slice by both at once &mdash; e.g. one customer's Aluminium usage in June.
          </p>
        </div>
      </div>

      {/* 4. Drilldown Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-600" />
            <div>
              <span className="text-base font-bold text-slate-800">
                {selectedRowForDrawer?.matType} &mdash; Job Records Breakdown
              </span>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                {selectedRowForDrawer?.jobsCount} jobs in {currentPeriodLabel}
              </p>
            </div>
          </div>
        }
        placement="right"
        width={750}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
      >
        {selectedRowForDrawer && (
          <div className="flex flex-col gap-5">
            {/* Mini-summary cards */}
            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Stock Weight</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedRowForDrawer.stockWeight.toFixed(1)} kg
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Used Weight</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedRowForDrawer.usedWeight.toFixed(1)} kg
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Remnant</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedRowForDrawer.remnantScrapWeight.toFixed(1)} kg
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Utilisation %</div>
                <div className="text-sm font-bold text-emerald-700 mt-0.5">
                  {selectedRowForDrawer.utilisationPercent.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* List of individual job records */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Manufacturing Job Records ({selectedRowForDrawer.rawRows.length})
              </h3>

              <div className="flex flex-col gap-2.5 max-h-[65vh] overflow-y-auto pr-1">
                {selectedRowForDrawer.rawRows.map((row, idx) => (
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
                        <span className="text-slate-400 text-[10px]">Material:</span>{" "}
                        <span className="font-semibold text-slate-700">
                          {String(row.mat_type || "")} {row.thick ? `${row.thick}mm` : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Operator:</span>{" "}
                        <span className="font-semibold text-slate-700">{String(row.machine_operator || "—")}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Used Wt:</span>{" "}
                        <span className="font-semibold text-slate-800">
                          {Number(row.total_used_weight || row.total_weight || 0).toFixed(1)} kg
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Cut Length:</span>{" "}
                        <span className="font-semibold text-slate-800">
                          {Number(row.total_meters || 0).toFixed(1)} m
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Piercings:</span>{" "}
                        <span className="font-semibold text-slate-800">{Number(row.total_piercing || 0)}</span>
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

export default MaterialUtilisationReport;
