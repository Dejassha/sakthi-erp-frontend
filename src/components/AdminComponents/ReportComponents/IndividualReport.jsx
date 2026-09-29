import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  useGetCompaniesQuery,
  useGetMachinesQuery,
  useGetOperatorsQuery,
  useGetUsersQuery,
  useLazyGetOverallDetailsQuery,
} from "@/store/services/admin.api";
import { Select, DatePicker, Button, message } from "antd";
import { Download, RotateCcw, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const IndividualReport = () => {
  const [entityType, setEntityType] = useState(null);
  const [selectedValue, setSelectedValue] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [selectedMaterialSpec, setSelectedMaterialSpec] = useState(null);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [selectedGasType, setSelectedGasType] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedUserRole, setSelectedUserRole] = useState("inward");

  // Loaded report data states
  const [reportData, setReportData] = useState([]);
  const [unfilteredReportData, setUnfilteredReportData] = useState([]);
  const [backendTotals, setBackendTotals] = useState({ quantity: 0, total_weight: 0 });
  const [loading, setLoading] = useState(false);

  const printRef = useRef(null);
  const lastFetchedMainFiltersRef = useRef("");

  // Queries for selectors
  const { data: companies = [], isLoading: loadingCompanies } = useGetCompaniesQuery(undefined);
  const { data: machines = [], isLoading: loadingMachines } = useGetMachinesQuery(undefined);
  const { data: operators = [], isLoading: loadingOperators } = useGetOperatorsQuery(undefined);
  const { data: users = [], isLoading: loadingUsers } = useGetUsersQuery(undefined);

  const [triggerGetAll] = useLazyGetOverallDetailsQuery();

  // Construct main filters object (before sub-filters)
  const mainFilters = useMemo(() => {
    const filtersObj = {};

    if (entityType && selectedValue) {
      if (entityType === "company") {
        filtersObj["company_name"] = {
          filterType: "text",
          type: "equals",
          filter: selectedValue,
        };
      } else if (entityType === "machine") {
        filtersObj["machine_name"] = {
          filterType: "text",
          type: "equals",
          filter: selectedValue,
        };
      } else if (entityType === "operator") {
        filtersObj["machine_operator"] = {
          filterType: "text",
          type: "equals",
          filter: selectedValue,
        };
      } else if (entityType === "user") {
        const filterKey = selectedUserRole === "programmer" ? "programer_created_by" : "inward_created_by";
        filtersObj[filterKey] = {
          filterType: "text",
          type: "equals",
          filter: selectedValue,
        };
      }
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      filtersObj["date"] = {
        filterType: "date",
        type: "inRange",
        dateFrom: dateRange[0].format("YYYY-MM-DD"),
        dateTo: dateRange[1].format("YYYY-MM-DD"),
      };
    }

    return filtersObj;
  }, [entityType, selectedValue, dateRange, selectedUserRole]);

  // Construct active filters object (with sub-filters for backend query)
  const activeFilters = useMemo(() => {
    const filtersObj = { ...mainFilters };

    if (entityType === "company" && selectedMaterialSpec) {
      filtersObj["mat_type"] = {
        filterType: "text",
        type: "equals",
        filter: selectedMaterialSpec,
      };
    }

    if (entityType === "machine") {
      if (selectedOperator) {
        filtersObj["machine_operator"] = {
          filterType: "text",
          type: "equals",
          filter: selectedOperator,
        };
      }
      if (selectedGasType) {
        filtersObj["machine_gas_type"] = {
          filterType: "text",
          type: "equals",
          filter: selectedGasType,
        };
      }
    }

    if (entityType === "operator" && selectedMachine) {
      filtersObj["machine_name"] = {
        filterType: "text",
        type: "equals",
        filter: selectedMachine,
      };
    }

    return filtersObj;
  }, [mainFilters, entityType, selectedMaterialSpec, selectedOperator, selectedGasType, selectedMachine]);

  // Options for specific selector
  const valueOptions = useMemo(() => {
    if (!entityType) return [];
    if (entityType === "company") {
      return companies.map((c) => ({
        label: c.company_name,
        value: c.company_name,
      }));
    }
    if (entityType === "machine") {
      return machines.map((m) => ({
        label: m.machine_name,
        value: m.machine_name,
      }));
    }
    if (entityType === "operator") {
      return operators.map((o) => ({
        label: o.operator_name,
        value: o.operator_name,
      }));
    }
    if (entityType === "user") {
      return users.map((u) => ({
        label: u.username,
        value: u.username,
      }));
    }
    return [];
  }, [entityType, companies, machines, operators, users]);

  const mainFiltersStr = JSON.stringify(mainFilters);
  const activeFiltersStr = JSON.stringify(activeFilters);

  // Fetch report logs when filters change
  useEffect(() => {
    if (!entityType || !selectedValue) {
      setReportData([]);
      setUnfilteredReportData([]);
      setBackendTotals({ quantity: 0, total_weight: 0 });
      lastFetchedMainFiltersRef.current = "";
      return;
    }

    const fetchReport = async () => {
      setLoading(true);
      try {
        const response = await triggerGetAll({
          page: 1,
          pageSize: 5000, // Fetch up to 5000 records
          filters: activeFiltersStr,
        }).unwrap();

        const rows = response.rows || [];
        setReportData(rows);
        setBackendTotals({
          quantity: response.totals?.quantity || 0,
          total_weight: response.totals?.total_weight || 0,
        });

        // If sub-filters are not active, this matches the unfiltered dataset
        if (activeFiltersStr === mainFiltersStr) {
          setUnfilteredReportData(rows);
          lastFetchedMainFiltersRef.current = mainFiltersStr;
        }
      } catch (err) {
        console.error("Failed to load individual reports:", err);
        message.error("Failed to load report data");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [entityType, selectedValue, activeFiltersStr, mainFiltersStr, triggerGetAll]);

  // Fetch unfiltered report logs for dropdown options when main filters change and sub-filters are active
  useEffect(() => {
    if (!entityType || !selectedValue) return;

    if (activeFiltersStr !== mainFiltersStr && lastFetchedMainFiltersRef.current !== mainFiltersStr) {
      const fetchUnfiltered = async () => {
        try {
          const response = await triggerGetAll({
            page: 1,
            pageSize: 5000,
            filters: mainFiltersStr,
          }).unwrap();
          setUnfilteredReportData(response.rows || []);
          lastFetchedMainFiltersRef.current = mainFiltersStr;
        } catch (err) {
          console.error("Failed to load unfiltered report data:", err);
        }
      };
      fetchUnfiltered();
    }
  }, [entityType, selectedValue, activeFiltersStr, mainFiltersStr, triggerGetAll]);

  // Unique Material Specs for the fetched report data (only relevant when entityType is "company")
  const materialSpecOptions = useMemo(() => {
    if (entityType !== "company" || !unfilteredReportData.length) return [];

    const typesSet = new Set();

    unfilteredReportData.forEach((row) => {
      if (row.mat_type) {
        typesSet.add(row.mat_type.trim());
      }
    });

    return Array.from(typesSet)
      .sort((a, b) => a.localeCompare(b))
      .map((type) => ({
        label: type,
        value: type,
      }));
  }, [entityType, unfilteredReportData]);

  // Unique Operators for the fetched report data (only relevant when entityType is "machine")
  const operatorOptions = useMemo(() => {
    if (entityType !== "machine" || !unfilteredReportData.length) return [];

    const set = new Set();
    unfilteredReportData.forEach((row) => {
      if (row.machine_operator) {
        set.add(String(row.machine_operator).trim());
      }
    });

    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((op) => ({
        label: op,
        value: op,
      }));
  }, [entityType, unfilteredReportData]);

  // Unique Gas Types for the fetched report data (only relevant when entityType is "machine")
  const gasTypeOptions = useMemo(() => {
    if (entityType !== "machine" || !unfilteredReportData.length) return [];

    const set = new Set();
    unfilteredReportData.forEach((row) => {
      if (row.machine_gas_type) {
        set.add(String(row.machine_gas_type).trim());
      }
    });

    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((gt) => ({
        label: gt,
        value: gt,
      }));
  }, [entityType, unfilteredReportData]);

  // Unique Machines for the fetched report data (only relevant when entityType is "operator")
  const machineOptions = useMemo(() => {
    if (entityType !== "operator" || !unfilteredReportData.length) return [];

    const set = new Set();
    unfilteredReportData.forEach((row) => {
      if (row.machine_name) {
        set.add(String(row.machine_name).trim());
      }
    });

    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((m) => ({
        label: m,
        value: m,
      }));
  }, [entityType, unfilteredReportData]);

  // Filtered report data based on selected sub-filters (handled by backend now)
  const filteredReportData = useMemo(() => {
    return reportData;
  }, [reportData]);

  const selectedMaterialSpecLabel = selectedMaterialSpec;

  // Totals from backend
  const computedTotals = backendTotals;

  const cardChunks = useMemo(() => {
    const chunks = [];
    if (filteredReportData.length === 0) return chunks;

    // Page 1 gets up to 10 cards
    chunks.push(filteredReportData.slice(0, 10));

    // Subsequent pages get up to 12 cards each
    for (let i = 10; i < filteredReportData.length; i += 12) {
      chunks.push(filteredReportData.slice(i, i + 12));
    }
    return chunks;
  }, [filteredReportData]);

  const handleReset = () => {
    setEntityType(null);
    setSelectedValue(null);
    setDateRange(null);
    setSelectedMaterialSpec(null);
    setSelectedOperator(null);
    setSelectedGasType(null);
    setSelectedMachine(null);
    setSelectedUserRole("inward");
    setBackendTotals({ quantity: 0, total_weight: 0 });
  };

  /* ---------------- Print Trigger ---------------- */

  /* ---------------- PDF Download Trigger (Using html-to-image & jsPDF) ---------------- */

  const handlePrint = async () => {
    if (!printRef.current) return;
    const pageElements = printRef.current.querySelectorAll(".report-page-container");
    if (!pageElements.length) return;

    try {
      message.loading({ content: "Generating PDF...", key: "pdf_gen", duration: 0 });

      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Render all pages in parallel to maximize speed and prevent browser download blocking
      const dataUrls = await Promise.all(
        Array.from(pageElements).map((pageEl) =>
          toPng(pageEl, {
            backgroundColor: "#ffffff",
            pixelRatio: 2, // 2 is fast and high-resolution
            cacheBust: true,
          })
        )
      );

      for (let i = 0; i < dataUrls.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(dataUrls[i], "PNG", 0, 0, pdfWidth, pdfHeight);
      }

      const cleanSpec = selectedMaterialSpecLabel ? selectedMaterialSpecLabel.replace(/[^a-zA-Z0-9]/g, "_") : "";
      pdf.save(`Production_Report_${selectedValue || "Individual"}_${cleanSpec ? `${cleanSpec}_` : ""}${dayjs().format("YYYY-MM-DD")}.pdf`);
      message.success({ content: "PDF downloaded successfully!", key: "pdf_gen", duration: 2 });
    } catch (err) {
      console.error("PDF generation failed:", err);
      message.error({ content: "Failed to generate PDF. Please try again.", key: "pdf_gen", duration: 3 });
    }
  };

  return (
    <div className="flex flex-col h-[75vh] gap-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
        {/* Left Column: Sidebar Filters Panel (stacked vertically) */}
        <div className="lg:col-span-3 flex flex-col gap-4 p-4 bg-gray-50/70 rounded-lg border border-gray-200 justify-start h-fit">
          <div className="flex flex-col gap-1.5 w-full">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date Range</span>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
              className="w-full h-9 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Entity Type</span>
            <Select
              placeholder="Select Type"
              value={entityType}
              onChange={(val) => {
                setEntityType(val);
                setSelectedValue(null);
                setSelectedMaterialSpec(null);
                setSelectedOperator(null);
                setSelectedGasType(null);
                setSelectedMachine(null);
                setSelectedUserRole("inward");
              }}
              className="w-full h-9 flex items-center text-xs"
              options={[
                { label: "Company", value: "company" },
                { label: "Machine", value: "machine" },
                { label: "Operator", value: "operator" },
                { label: "User", value: "user" },
              ]}
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Select Entity</span>
            <Select
              placeholder={entityType ? `Select ${entityType}` : "Choose Type First"}
              value={selectedValue}
              onChange={(val) => {
                setSelectedValue(val);
                setSelectedMaterialSpec(null);
                setSelectedOperator(null);
                setSelectedGasType(null);
                setSelectedMachine(null);
                setSelectedUserRole("inward");
              }}
              disabled={!entityType}
              showSearch
              className="w-full h-9 flex items-center text-xs"
              loading={loadingCompanies || loadingMachines || loadingOperators || loadingUsers}
              options={valueOptions}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>

          {entityType === "company" && (
            <div className="flex flex-col gap-1.5 w-full">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Material Specs</span>
              <Select
                placeholder="All Material Specs"
                value={selectedMaterialSpec}
                onChange={setSelectedMaterialSpec}
                allowClear
                disabled={!selectedValue}
                className="w-full h-9 flex items-center text-xs"
                options={materialSpecOptions}
              />
            </div>
          )}

          {entityType === "machine" && (
            <>
              <div className="flex flex-col gap-1.5 w-full">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Operator</span>
                <Select
                  placeholder="All Operators"
                  value={selectedOperator}
                  onChange={setSelectedOperator}
                  allowClear
                  disabled={!selectedValue}
                  className="w-full h-9 flex items-center text-xs"
                  options={operatorOptions}
                />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Gas Type</span>
                <Select
                  placeholder="All Gas Types"
                  value={selectedGasType}
                  onChange={setSelectedGasType}
                  allowClear
                  disabled={!selectedValue}
                  className="w-full h-9 flex items-center text-xs"
                  options={gasTypeOptions}
                />
              </div>
            </>
          )}

          {entityType === "operator" && (
            <div className="flex flex-col gap-1.5 w-full">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Machine</span>
              <Select
                placeholder="All Machines"
                value={selectedMachine}
                onChange={setSelectedMachine}
                allowClear
                disabled={!selectedValue}
                className="w-full h-9 flex items-center text-xs"
                options={machineOptions}
              />
            </div>
          )}

          {entityType === "user" && (
            <div className="flex flex-col gap-1.5 w-full">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">User Role</span>
              <Select
                placeholder="Select User Role"
                value={selectedUserRole}
                onChange={setSelectedUserRole}
                disabled={!selectedValue}
                className="w-full h-9 flex items-center text-xs"
                options={[
                  { label: "Inward", value: "inward" },
                  { label: "Programmer", value: "programmer" },
                ]}
              />
            </div>
          )}

          <Button
            onClick={handleReset}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            className="flex items-center justify-center gap-1.5 h-9 w-full mt-2"
          >
            Clear Filters
          </Button>
        </div>

        {/* Right Column: PDF Preview / Document (col span: 9/12) */}
        <div className="lg:col-span-9 flex flex-col gap-4 overflow-hidden h-full border-l pl-6">
          {entityType && selectedValue ? (
            <div className="flex flex-col gap-4 flex-1 overflow-hidden">
              {/* Print Header */}
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-800">PDF Print Preview</h2>
                  <p className="text-[10px] text-gray-500">Preview and download the formatted production report</p>
                </div>
                <Button
                  onClick={handlePrint}
                  type="primary"
                  className="bg-green-500 hover:bg-green-600 text-white border-none font-medium h-9 px-4 flex items-center gap-2 text-xs"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>

              {/* PDF Preview Container */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-100/50 rounded-lg border flex flex-col items-center gap-6">
                {loading ? (
                  <div className="h-60 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
                  </div>
                ) : filteredReportData.length === 0 ? (
                  <div className="h-60 flex items-center justify-center text-gray-400 text-xs">
                    No production entries found for the selected entity and filters.
                  </div>
                ) : (
                  <div ref={printRef} className="flex flex-col gap-6 w-full max-w-[800px] items-center">
                    {cardChunks.map((chunk, pageIndex) => (
                      <div
                        key={pageIndex}
                        className="report-page-container w-[800px] h-[1130px] border-2 border-red-600 bg-white relative p-6 box-border flex flex-col gap-4 shadow-lg shrink-0"
                      >
                        {/* HEADER */}
                        {pageIndex === 0 ? (
                          <>
                            <div className="flex justify-start items-center gap-3 border-b-2 border-red-600 pb-3">
                              <img src="/sakthi-logo.png" alt="Sakthi Logo" className="h-12 w-12 object-contain" />
                              <div>
                                <h2 className="text-base font-bold text-red-600">SAKTHI LASER TECHNOLOGY</h2>
                                <p className="italic text-[10px] text-gray-600">Complete Customized Sheet Metal Job Shop</p>
                              </div>
                            </div>

                            {/* TITLE */}
                            <div className="border-b-2 border-red-600 text-center font-bold py-1.5 text-red-600 text-xs bg-red-50/10 uppercase tracking-widest">
                              PRODUCTION REPORT
                            </div>

                            {/* INFO SECTION */}
                            <div className="border-b-2 border-red-600 pb-3 pt-1 flex flex-wrap justify-between text-xs text-gray-700 bg-white gap-2">
                              <div>
                                <b>REPORT FOR:</b> <span className="uppercase text-red-600 font-bold">{entityType}</span>
                              </div>
                              <div>
                                <b>NAME:</b> <span className="uppercase text-red-600 font-bold">{selectedValue}</span>
                              </div>
                              {entityType === "company" && selectedMaterialSpecLabel && (
                                <div>
                                  <b>MATERIAL SPEC:</b> <span className="uppercase text-red-600 font-bold">{selectedMaterialSpecLabel}</span>
                                </div>
                              )}
                              {entityType === "machine" && selectedOperator && (
                                <div>
                                  <b>OPERATOR:</b> <span className="uppercase text-red-600 font-bold">{selectedOperator}</span>
                                </div>
                              )}
                              {entityType === "machine" && selectedGasType && (
                                <div>
                                  <b>GAS TYPE:</b> <span className="uppercase text-red-600 font-bold">{selectedGasType}</span>
                                </div>
                              )}
                              {entityType === "operator" && selectedMachine && (
                                <div>
                                  <b>MACHINE:</b> <span className="uppercase text-red-600 font-bold">{selectedMachine}</span>
                                </div>
                              )}
                              {entityType === "user" && (
                                <div>
                                  <b>ROLE:</b> <span className="uppercase text-red-600 font-bold">{selectedUserRole}</span>
                                </div>
                              )}
                              <div>
                                <b>DATE RANGE:</b>{" "}
                                <span className="text-red-600 font-bold">
                                  {dateRange && dateRange[0] && dateRange[1]
                                    ? `${dateRange[0].format("DD/MM/YYYY")} to ${dateRange[1].format("DD/MM/YYYY")}`
                                    : "ALL DATES"}
                                </span>
                              </div>
                            </div>

                            {/* SUMMARY SECTION */}
                            <div className="border-b-2 border-red-600 pb-3 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-gray-50/50 p-2 rounded">
                              <div>
                                <div className="text-gray-500 font-semibold uppercase text-[9px]">Total Entries</div>
                                <div className="text-xs font-bold text-gray-900 mt-0.5">{filteredReportData.length}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 font-semibold uppercase text-[9px]">Total Quantity</div>
                                <div className="text-xs font-bold text-gray-900 mt-0.5">{computedTotals.quantity}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 font-semibold uppercase text-[9px]">Total Weight (kg)</div>
                                <div className="text-xs font-bold text-gray-900 mt-0.5">{computedTotals.total_weight.toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 font-semibold uppercase text-[9px]">Avg Weight / Slip</div>
                                <div className="text-xs font-bold text-gray-900 mt-0.5">
                                  {filteredReportData.length > 0 ? (computedTotals.total_weight / filteredReportData.length).toFixed(2) : "0.00"} kg
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between items-center border-b-2 border-red-600 pb-2">
                            <div className="flex items-center gap-2">
                              <img src="/sakthi-logo.png" alt="Sakthi Logo" className="h-8 w-8 object-contain" />
                              <span className="text-xs font-bold text-red-600">SAKTHI LASER TECHNOLOGY</span>
                            </div>
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                              Production Report (Contd.)
                            </span>
                          </div>
                        )}

                        {/* CARDS LIST */}
                        <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
                          {chunk.map((row, cardIdx) => {
                            let globalIndex = cardIdx;
                            for (let prevPage = 0; prevPage < pageIndex; prevPage++) {
                              globalIndex += cardChunks[prevPage].length;
                            }
                            return (
                              <div
                                key={cardIdx}
                                className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex flex-row justify-between items-center gap-4 hover:border-red-200 transition-colors"
                                style={{ height: "70px" }}
                              >
                                {/* Left: SI, Date, Slip */}
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">
                                    {globalIndex + 1}
                                  </div>
                                  <div>
                                    <div className="text-[8px] text-gray-400 font-semibold uppercase tracking-wider">Date & Slip</div>
                                    <div className="text-xs font-semibold text-gray-800">
                                      {row.date ? dayjs(row.date).format("DD/MM/YYYY") : "—"}
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-medium">
                                      Slip: {String(row.inward_slip_number || "—")}
                                    </div>
                                  </div>
                                </div>

                                {/* Center Left: Job Details */}
                                <div className="w-[180px]">
                                  <div className="text-[8px] text-gray-400 font-semibold uppercase tracking-wider">Job Details</div>
                                  <div className="text-xs font-bold text-gray-800 mt-0.5 truncate">
                                    {String(row.sheet_type || "—")}
                                  </div>
                                  {row.job_type ? (
                                    <span className="inline-block bg-gray-100 text-gray-600 text-[8px] font-medium px-1.5 py-0.5 rounded mt-0.5">
                                      {String(row.job_type)}
                                    </span>
                                  ) : null}
                                </div>

                                {/* Center Right: Material Specs */}
                                <div className="w-[180px]">
                                  <div className="text-[8px] text-gray-400 font-semibold uppercase tracking-wider">Material Specs</div>
                                  {row.mat_type ? (
                                    <div className="text-xs text-gray-800 mt-0.5 truncate">
                                      <span className="font-bold">{String(row.mat_type)}</span>
                                      {row.thick ? (
                                        <span className="text-gray-500 font-medium"> ({Number(row.thick).toFixed(2)} mm)</span>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-400 mt-0.5">—</div>
                                  )}
                                </div>

                                {/* Right: Qty & Weight */}
                                <div className="flex items-center gap-6 text-right">
                                  <div>
                                    <div className="text-[8px] text-gray-400 font-semibold uppercase tracking-wider">Qty</div>
                                    <div className="text-xs font-extrabold text-red-600 mt-0.5">
                                      {Number(row.quantity || 0)}
                                    </div>
                                  </div>
                                  <div className="text-right w-[80px]">
                                    <div className="text-[8px] text-gray-400 font-semibold uppercase tracking-wider">Weight</div>
                                    <div className="text-xs font-extrabold text-gray-900 mt-0.5">
                                      {Number(row.total_weight || 0).toFixed(2)} <span className="text-[9px] font-semibold text-gray-500">kg</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* TOTALS SUMMARY CARD */}
                        {pageIndex === cardChunks.length - 1 && (
                          <div className="bg-red-50/20 border border-red-600 rounded-lg p-3 flex flex-row justify-between items-center text-red-700 font-bold mt-2">
                            <div className="text-xs uppercase tracking-wider">
                              Summary Total
                            </div>
                            <div className="flex items-center gap-8">
                              <div>
                                <span className="text-[8px] text-red-600/70 font-semibold uppercase block tracking-wider">Total Qty</span>
                                <span className="text-sm font-extrabold">{computedTotals.quantity}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-red-600/70 font-semibold uppercase block tracking-wider">Total Weight</span>
                                <span className="text-sm font-extrabold">{computedTotals.total_weight.toFixed(2)} kg</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* PAGE FOOTER */}
                        <div className="text-center text-[9px] text-gray-400 font-medium pt-2 mt-auto border-t border-gray-100 flex justify-between items-center">
                          <span>Sakthi Laser Technology Report</span>
                          <span>Page {pageIndex + 1} of {cardChunks.length}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg p-6 bg-gray-50/30">
              <h3 className="text-md font-bold text-gray-700 mb-1">No Entity Selected</h3>
              <p className="text-xs text-gray-400 text-center max-w-sm">
                Please select an Entity Type and choose a specific entity from the sidebar on the left to load the production report.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IndividualReport;
