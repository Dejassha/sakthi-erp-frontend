import React, { useState, useMemo, useEffect, useRef } from "react";
import { Table, DatePicker, Input, Button, Card, Tag, Drawer, Tooltip, Select, message } from "antd";
import {
  Search,
  Building2,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Award,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Scale,
  CheckCircle2,
} from "lucide-react";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useLazyGetOverallDetailsQuery, useGetCompaniesQuery } from "@/store/services/admin.api";
import { parseTimeToMinutes } from "./utils/productsTableUtils";

const { MonthPicker, RangePicker } = DatePicker;

const CustomerReviewReport = () => {
  // Filters state
  const [filterMode, setFilterMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [dateRange, setDateRange] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [topLimit, setTopLimit] = useState(25);

  // Data state
  const [rawData, setRawData] = useState([]);
  const [selectedCustomerForDrawer, setSelectedCustomerForDrawer] = useState(null);
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
      console.error("Failed to load customer review data:", err);
      message.error("Failed to load customer review data.");
    }
  };

  useEffect(() => {
    loadData();
  }, [apiFilters]);

  // Grand totals across ALL customers in this period (to compute % shares)
  const grandTotalsAcrossAll = useMemo(() => {
    let grandWeight = 0;
    let grandCutLength = 0;
    let grandPiercings = 0;

    rawData.forEach((row) => {
      const wt = Number(row.total_used_weight ?? row.total_weight ?? row.used_weight ?? 0);
      grandWeight += isNaN(wt) ? 0 : wt;

      const meters = Number(row.total_meters ?? row.cut_length_per_sheet ?? 0);
      grandCutLength += isNaN(meters) ? 0 : meters;

      const piercing = Number(row.total_piercing ?? row.pierce_per_sheet ?? 0);
      grandPiercings += isNaN(piercing) ? 0 : piercing;
    });

    return { grandWeight, grandCutLength, grandPiercings };
  }, [rawData]);

  // Group and calculate statistics per company
  const allCustomerStats = useMemo(() => {
    const companyMap = new Map();

    // Group rows by company
    rawData.forEach((row) => {
      const compName = (String(row.company_name || "").trim() || "Unassigned").toUpperCase();

      if (!companyMap.has(compName)) {
        companyMap.set(compName, {
          company: compName,
          jobsCount: 0,
          sheetQty: 0,
          weightDelivered: 0,
          cuttingLength: 0,
          piercingCount: 0,
          runtimeMinutes: 0,
          qaRejections: 0,
          completedJobs: 0,
          rawRows: [],
        });
      }

      const entry = companyMap.get(compName);
      entry.jobsCount += 1;
      entry.rawRows.push(row);

      // Sheet Qty
      const sheets = Number(row.total_no_of_sheets ?? row.number_of_sheets ?? row.processed_quantity ?? row.quantity ?? 0);
      entry.sheetQty += isNaN(sheets) ? 0 : sheets;

      // Weight delivered (kg)
      const wt = Number(row.total_used_weight ?? row.total_weight ?? row.used_weight ?? 0);
      entry.weightDelivered += isNaN(wt) ? 0 : wt;

      // Cutting length (m)
      const meters = Number(row.total_meters ?? row.cut_length_per_sheet ?? 0);
      entry.cuttingLength += isNaN(meters) ? 0 : meters;

      // Piercing count
      const piercing = Number(row.total_piercing ?? row.pierce_per_sheet ?? 0);
      entry.piercingCount += isNaN(piercing) ? 0 : piercing;

      // Runtime minutes
      const mins = parseTimeToMinutes(row.machine_runtime);
      entry.runtimeMinutes += mins;

      // QA Rejection: QA status is not "completed"
      const qaStatus = String(row.qa_status || "").trim().toLowerCase();
      if (qaStatus && qaStatus !== "completed" && qaStatus !== "pass" && qaStatus !== "passed" && qaStatus !== "approved") {
        entry.qaRejections += 1;
      }

      // On-time proxy: Prog Status / Account Status / Programmer Status = "completed"
      const progStatus = String(row.programer_status || row.status || "").trim().toLowerCase();
      if (progStatus === "completed" || progStatus === "complete" || progStatus === "done" || progStatus === "inward_created") {
        entry.completedJobs += 1;
      }
    });

    // Also include registered companies that have 0 jobs
    registeredCompanies.forEach((c) => {
      const name = (c.company_name || "").trim().toUpperCase();
      if (name && !companyMap.has(name)) {
        companyMap.set(name, {
          company: name,
          jobsCount: 0,
          sheetQty: 0,
          weightDelivered: 0,
          cuttingLength: 0,
          piercingCount: 0,
          runtimeMinutes: 0,
          qaRejections: 0,
          completedJobs: 0,
          rawRows: [],
        });
      }
    });

    const { grandWeight, grandCutLength, grandPiercings } = grandTotalsAcrossAll;

    // Convert map to list and compute rates & shares
    const list = Array.from(companyMap.values()).map((entry) => {
      const runningTimeHours = entry.runtimeMinutes / 60;
      const onTimeJobsPercent = entry.jobsCount > 0 ? (entry.completedJobs / entry.jobsCount) * 100 : 0;
      const shareOfWeight = grandWeight > 0 ? (entry.weightDelivered / grandWeight) * 100 : 0;
      const shareOfCuttingLength = grandCutLength > 0 ? (entry.cuttingLength / grandCutLength) * 100 : 0;
      const shareOfPiercing = grandPiercings > 0 ? (entry.piercingCount / grandPiercings) * 100 : 0;

      return {
        key: entry.company,
        company: entry.company,
        jobsCount: entry.jobsCount,
        sheetQty: entry.sheetQty,
        weightDelivered: entry.weightDelivered,
        cuttingLength: entry.cuttingLength,
        piercingCount: entry.piercingCount,
        runningTimeHours,
        qaRejections: entry.qaRejections,
        onTimeJobsPercent,
        shareOfWeight,
        shareOfCuttingLength,
        shareOfPiercing,
        rawRows: entry.rawRows,
      };
    });

    // Sort descending by Weight Delivered (matching top customer by volume)
    return list.sort((a, b) => b.weightDelivered - a.weightDelivered);
  }, [rawData, registeredCompanies, grandTotalsAcrossAll]);

  // Filtered by Search & Top Limit
  const displayedCustomerStats = useMemo(() => {
    let list = allCustomerStats;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => c.company.toLowerCase().includes(q));
    }
    if (topLimit !== "all") {
      list = list.slice(0, topLimit);
    }
    return list;
  }, [allCustomerStats, searchQuery, topLimit]);

  // Overall totals for displayed records
  const displayedTotals = useMemo(() => {
    let totalJobs = 0;
    let totalSheets = 0;
    let totalWeight = 0;
    let totalCuttingLength = 0;
    let totalPiercing = 0;
    let totalRunningHours = 0;
    let totalQARejections = 0;
    let totalCompletedJobs = 0;
    let sumShareWeight = 0;
    let sumShareCuttingLength = 0;
    let sumSharePiercing = 0;

    displayedCustomerStats.forEach((c) => {
      totalJobs += c.jobsCount;
      totalSheets += c.sheetQty;
      totalWeight += c.weightDelivered;
      totalCuttingLength += c.cuttingLength;
      totalPiercing += c.piercingCount;
      totalRunningHours += c.runningTimeHours;
      totalQARejections += c.qaRejections;
      totalCompletedJobs += (c.onTimeJobsPercent / 100) * c.jobsCount;
      sumShareWeight += c.shareOfWeight;
      sumShareCuttingLength += c.shareOfCuttingLength;
      sumSharePiercing += c.shareOfPiercing;
    });

    const overallOnTime = totalJobs > 0 ? (totalCompletedJobs / totalJobs) * 100 : 0;

    return {
      totalJobs,
      totalSheets,
      totalWeight,
      totalCuttingLength,
      totalPiercing,
      totalRunningHours,
      totalQARejections,
      overallOnTime,
      sumShareWeight,
      sumShareCuttingLength,
      sumSharePiercing,
    };
  }, [displayedCustomerStats]);

  // Top Customer
  const topCustomer = useMemo(() => {
    if (!allCustomerStats.length || allCustomerStats[0].weightDelivered === 0) return null;
    return allCustomerStats[0];
  }, [allCustomerStats]);

  // Share Color Styler matching Excel heat map
  const getShareBadgeStyle = (val) => {
    if (val <= 0) {
      return "bg-[#f8696b]/30 text-rose-900 border-[#f8696b]/50";
    }
    if (val >= 20) {
      return "bg-[#57bb8a]/40 text-emerald-950 border-[#57bb8a] font-bold";
    }
    if (val >= 5) {
      return "bg-[#a6d96a]/40 text-emerald-900 border-[#a6d96a] font-bold";
    }
    if (val >= 1) {
      return "bg-[#fee08b]/45 text-amber-950 border-[#fee08b] font-semibold";
    }
    return "bg-[#fdae61]/35 text-orange-950 border-[#fdae61] font-medium";
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilterMode("month");
    setSelectedMonth(dayjs());
    setDateRange(null);
    setSearchQuery("");
    setTopLimit(25);
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
        "Company",
        "Jobs",
        "Sheet Qty",
        "Weight Delivered (kg)",
        "Cutting Length (m)",
        "Piercing Count",
        "Running Time (Hrs)",
        "QA Rejection",
        "On-Time Jobs %",
        "Share of Weight %",
        "Share of Cutting Length %",
        "Share of Piercing %",
      ];

      const dataRows = displayedCustomerStats.map((row) => [
        row.company,
        row.jobsCount,
        Number(row.sheetQty.toFixed(1)),
        Number(row.weightDelivered.toFixed(1)),
        Number(row.cuttingLength.toFixed(1)),
        row.piercingCount,
        Number(row.runningTimeHours.toFixed(2)),
        row.qaRejections,
        `${row.onTimeJobsPercent.toFixed(1)}%`,
        `${row.shareOfWeight.toFixed(1)}%`,
        `${row.shareOfCuttingLength.toFixed(1)}%`,
        `${row.shareOfPiercing.toFixed(1)}%`,
      ]);

      const totalRowLabel = topLimit === "all" ? "TOTAL / OVERALL" : `TOTAL / TOP ${topLimit}`;
      const totalRow = [
        totalRowLabel,
        displayedTotals.totalJobs,
        Number(displayedTotals.totalSheets.toFixed(1)),
        Number(displayedTotals.totalWeight.toFixed(1)),
        Number(displayedTotals.totalCuttingLength.toFixed(1)),
        displayedTotals.totalPiercing,
        Number(displayedTotals.totalRunningHours.toFixed(2)),
        displayedTotals.totalQARejections,
        `${displayedTotals.overallOnTime.toFixed(1)}%`,
        `${displayedTotals.sumShareWeight.toFixed(1)}%`,
        `${displayedTotals.sumShareCuttingLength.toFixed(1)}%`,
        `${displayedTotals.sumSharePiercing.toFixed(1)}%`,
      ];

      const sheetData = [
        [`CUSTOMER REVIEW — orders, quality and on-time performance per customer (${topLimit === "all" ? "All Customers" : `Top ${topLimit} by volume`})`],
        [],
        [
          `Report Month: ${monthLabel}`,
          "",
          "",
          "Grouped by Company only (the Customer contact-name column has been dropped, per your note). Share % columns show each customer's slice of the whole month's weight, cutting length and piercing.",
        ],
        [],
        headers,
        ...dataRows,
        totalRow,
        [],
        [
          `Showing the ${topLimit === "all" ? "all" : `top ${topLimit}`} customers by total weight across the whole export — add rows (copy the formula pattern across) to cover more. Share % columns are each customer's slice of the WHOLE month's total (all customers, not just these rows), so the rows will not sum to 100%. On-Time Jobs % uses Prog Status = "completed" as a proxy; swap in a due-date comparison if you track one.`,
        ],
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      worksheet["!cols"] = [
        { wch: 28 }, // Company
        { wch: 10 }, // Jobs
        { wch: 14 }, // Sheet Qty
        { wch: 22 }, // Weight Delivered
        { wch: 18 }, // Cutting Length
        { wch: 16 }, // Piercing Count
        { wch: 18 }, // Running Time
        { wch: 14 }, // QA Rejection
        { wch: 16 }, // On-Time Jobs %
        { wch: 18 }, // Share of Weight %
        { wch: 22 }, // Share of Cutting Length %
        { wch: 18 }, // Share of Piercing %
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Customer Review");

      const fileName = `Customer_Review_${monthLabel.replace(/[\s/]/g, "_")}.xlsx`;
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
      title: "Company",
      dataIndex: "company",
      key: "company",
      fixed: "left",
      width: 220,
      sorter: (a, b) => a.company.localeCompare(b.company),
      render: (text, record) => (
        <div
          onClick={() => {
            setSelectedCustomerForDrawer(record);
            setIsDrawerOpen(true);
          }}
          className="flex items-center justify-between group cursor-pointer font-bold text-slate-800 hover:text-blue-600 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="truncate max-w-[160px]" title={text}>{text}</span>
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
      sorter: (a, b) => a.jobsCount - b.jobsCount,
      render: (val) => <span className="font-medium text-slate-700">{val.toLocaleString()}</span>,
    },
    {
      title: "Sheet Qty",
      dataIndex: "sheetQty",
      key: "sheetQty",
      align: "right",
      width: 120,
      sorter: (a, b) => a.sheetQty - b.sheetQty,
      render: (val) => (
        <span className="font-medium text-slate-700">
          {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Total weight delivered across all job orders for this customer (in kg)">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Weight Delivered (kg)
          </span>
        </Tooltip>
      ),
      dataIndex: "weightDelivered",
      key: "weightDelivered",
      align: "right",
      width: 170,
      sorter: (a, b) => a.weightDelivered - b.weightDelivered,
      render: (val) => (
        <span className="font-semibold text-slate-800">
          {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      title: "Cutting Length (m)",
      dataIndex: "cuttingLength",
      key: "cuttingLength",
      align: "right",
      width: 150,
      sorter: (a, b) => a.cuttingLength - b.cuttingLength,
      render: (val) => (
        <span className="font-medium text-slate-700">
          {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      title: "Piercing Count",
      dataIndex: "piercingCount",
      key: "piercingCount",
      align: "right",
      width: 130,
      sorter: (a, b) => a.piercingCount - b.piercingCount,
      render: (val) => <span className="font-medium text-slate-700">{val.toLocaleString()}</span>,
    },
    {
      title: "Running Time (Hrs)",
      dataIndex: "runningTimeHours",
      key: "runningTimeHours",
      align: "right",
      width: 150,
      sorter: (a, b) => a.runningTimeHours - b.runningTimeHours,
      render: (val) => <span className="font-medium text-slate-700">{val.toFixed(2)}</span>,
    },
    {
      title: "QA Rejection",
      dataIndex: "qaRejections",
      key: "qaRejections",
      align: "right",
      width: 120,
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
    {
      title: (
        <Tooltip title="Percentage of jobs with completed status">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            On-Time Jobs %
          </span>
        </Tooltip>
      ),
      dataIndex: "onTimeJobsPercent",
      key: "onTimeJobsPercent",
      align: "right",
      width: 140,
      sorter: (a, b) => a.onTimeJobsPercent - b.onTimeJobsPercent,
      render: (val) => (
        <span className={`font-semibold ${val >= 80 ? "text-emerald-700" : val > 0 ? "text-amber-700" : "text-slate-400"}`}>
          {val.toFixed(1)}%
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Customer's slice of the month's total delivered weight">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Share of Weight %
          </span>
        </Tooltip>
      ),
      dataIndex: "shareOfWeight",
      key: "shareOfWeight",
      align: "right",
      width: 150,
      sorter: (a, b) => a.shareOfWeight - b.shareOfWeight,
      render: (val) => {
        const badgeClass = getShareBadgeStyle(val);
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
        <Tooltip title="Customer's slice of the month's total cutting length">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Share of Cutting Length %
          </span>
        </Tooltip>
      ),
      dataIndex: "shareOfCuttingLength",
      key: "shareOfCuttingLength",
      align: "right",
      width: 170,
      sorter: (a, b) => a.shareOfCuttingLength - b.shareOfCuttingLength,
      render: (val) => (
        <span className="font-semibold text-slate-800">{val.toFixed(1)}%</span>
      ),
    },
    {
      title: (
        <Tooltip title="Customer's slice of the month's total piercings">
          <span className="cursor-help inline-flex items-center gap-1 font-bold">
            Share of Piercing %
          </span>
        </Tooltip>
      ),
      dataIndex: "shareOfPiercing",
      key: "shareOfPiercing",
      align: "right",
      width: 150,
      sorter: (a, b) => a.shareOfPiercing - b.shareOfPiercing,
      render: (val) => (
        <span className="font-semibold text-slate-800">{val.toFixed(1)}%</span>
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
              <Building2 className="w-6 h-6 text-blue-200" />
              <h1 className="text-lg sm:text-xl font-bold tracking-wide uppercase">
                CUSTOMER REVIEW — orders, quality and on-time performance per customer ({topLimit === "all" ? "All Customers" : `Top ${topLimit} by volume`})
              </h1>
            </div>
            <p className="text-xs text-blue-100/90 mt-1 max-w-4xl leading-relaxed">
              Grouped by Company only (the Customer contact-name column has been dropped, per your note). Share % columns show
              each customer's slice of the whole month's weight, cutting length and piercing.
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

            {/* Top Limit Selector */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-2xs">
              <span className="text-xs font-bold text-slate-700">Show:</span>
              <Select
                value={topLimit}
                onChange={setTopLimit}
                className="w-28 h-7 text-xs"
                options={[
                  { label: "Top 25", value: 25 },
                  { label: "Top 50", value: 50 },
                  { label: "Top 100", value: 100 },
                  { label: "All Customers", value: "all" },
                ]}
              />
            </div>

            {/* Company Search */}
            <div className="w-56">
              <Input
                placeholder="Search company..."
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

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Top Volume Customer */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Top Volume Client</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-800 truncate max-w-[120px]" title={topCustomer?.company || "—"}>
              {topCustomer?.company || "—"}
            </span>
            {topCustomer && (
              <span className="text-xs font-bold text-emerald-600">
                {topCustomer.shareOfWeight.toFixed(1)}% wt
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Highest delivered weight</p>
        </Card>

        {/* Total Weight Delivered */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Delivered Wt</span>
            <Scale className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-800">
              {displayedTotals.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
              <span className="text-xs font-normal text-slate-500">kg</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            ≈ {(displayedTotals.totalWeight / 1000).toFixed(1)} tonnes delivered
          </p>
        </Card>

        {/* Total Cutting Length */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Cut Length</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-800">
              {displayedTotals.totalCuttingLength.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
              <span className="text-xs font-normal text-slate-500">m</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Across {displayedCustomerStats.length} companies</p>
        </Card>

        {/* On-Time Performance */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">On-Time Performance</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-emerald-700">
              {displayedTotals.overallOnTime.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Completed workflow jobs</p>
        </Card>

        {/* QA Rejection Flags */}
        <Card className="shadow-2xs border-slate-200" bodyStyle={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">QA Rejections</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-1">
            <span className={`text-base font-bold ${displayedTotals.totalQARejections > 0 ? "text-rose-600" : "text-slate-800"}`}>
              {displayedTotals.totalQARejections}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Pending / reworked orders</p>
        </Card>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        {/* Table info header */}
        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 font-medium">
            <span>Customer Review Analysis for <strong>{currentPeriodLabel}</strong></span>
          </div>
          <div className="text-slate-400 text-[11px]">
            Showing {displayedCustomerStats.length} of {allCustomerStats.length} companies • Click any row for orders history
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={displayedCustomerStats}
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
                    {topLimit === "all" ? "TOTAL / OVERALL" : `TOTAL / TOP ${topLimit}`}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <span className="font-bold text-slate-900">{displayedTotals.totalJobs.toLocaleString()}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span className="font-bold text-slate-900">
                    {displayedTotals.totalSheets.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <span className="font-bold text-slate-900">
                    {displayedTotals.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <span className="font-bold text-slate-900">
                    {displayedTotals.totalCuttingLength.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <span className="font-bold text-slate-900">{displayedTotals.totalPiercing.toLocaleString()}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <span className="font-bold text-slate-900">{displayedTotals.totalRunningHours.toFixed(2)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <span className="font-bold text-rose-700">{displayedTotals.totalQARejections}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  <span className="font-bold text-emerald-800">{displayedTotals.overallOnTime.toFixed(1)}%</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={9} align="right">
                  <div className="flex justify-end">
                    <span className="px-2.5 py-1 rounded bg-slate-200 border border-slate-300 font-extrabold text-slate-900 text-xs">
                      {displayedTotals.sumShareWeight.toFixed(1)}%
                    </span>
                  </div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={10} align="right">
                  <span className="font-bold text-slate-900">{displayedTotals.sumShareCuttingLength.toFixed(1)}%</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={11} align="right">
                  <span className="font-bold text-slate-900">{displayedTotals.sumSharePiercing.toFixed(1)}%</span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        {/* Footer Notes Formula Explanation */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 leading-relaxed italic">
          <p>
            Showing the {topLimit === "all" ? "all" : `top ${topLimit}`} customers by total weight across the whole export &mdash;
            Share % columns are each customer's slice of the WHOLE month's total (all customers, not just these rows), so the
            rows will not sum to 100%. <strong>On-Time Jobs %</strong> uses Prog Status = "completed" as a proxy; swap in a due-date
            comparison if you track one.
          </p>
        </div>
      </div>

      {/* 4. Customer Orders History Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <div>
              <span className="text-base font-bold text-slate-800">
                {selectedCustomerForDrawer?.company} &mdash; Orders Overview
              </span>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                {selectedCustomerForDrawer?.jobsCount} job records in {currentPeriodLabel}
              </p>
            </div>
          </div>
        }
        placement="right"
        width={780}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
      >
        {selectedCustomerForDrawer && (
          <div className="flex flex-col gap-5">
            {/* Customer mini-summary cards */}
            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Delivered Wt</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedCustomerForDrawer.weightDelivered.toFixed(1)} kg
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Cut Length</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedCustomerForDrawer.cuttingLength.toFixed(1)} m
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">On-Time %</div>
                <div className="text-sm font-bold text-emerald-700 mt-0.5">
                  {selectedCustomerForDrawer.onTimeJobsPercent.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">QA Flags</div>
                <div className="text-sm font-bold text-rose-600 mt-0.5">
                  {selectedCustomerForDrawer.qaRejections}
                </div>
              </div>
            </div>

            {/* List of individual job records */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Customer Manufacturing Records ({selectedCustomerForDrawer.rawRows.length})
              </h3>

              <div className="flex flex-col gap-2.5 max-h-[65vh] overflow-y-auto pr-1">
                {selectedCustomerForDrawer.rawRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs flex flex-col gap-2 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">
                          {String(row.customer_name || row.customer_dc_no || "Job Order")}
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
                        <span className="text-slate-400 text-[10px]">Weight:</span>{" "}
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
                        <span className="text-slate-400 text-[10px]">Piercing:</span>{" "}
                        <span className="font-semibold text-slate-800">{Number(row.total_piercing || 0)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t text-[11px]">
                      <div>
                        <span className="text-slate-400">Prog Status:</span>{" "}
                        <Tag
                          color={
                            String(row.programer_status || row.status || "").toLowerCase() === "completed"
                              ? "green"
                              : "orange"
                          }
                          className="text-[10px]"
                        >
                          {String(row.programer_status || row.status || "Pending")}
                        </Tag>
                      </div>
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

export default CustomerReviewReport;
