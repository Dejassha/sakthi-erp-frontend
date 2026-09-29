import React, { useState, useEffect, useCallback } from "react";
import { Button, Table, Popconfirm, message } from "antd";
import { FileText, Eye, Pencil, Trash2, Download, RotateCw } from "lucide-react";
import dayjs from "dayjs";
import { useGetKPIRecordsQuery, useDeleteKPIGroupMutation } from "@/store/services/admin.api";
import AddKPIRow from "./AddKPIRow";
import { downloadKPIPDF } from "./utils/kpiPdfUtils";
import { evaluateKPITargetStatus } from "./utils/kpiCalculationUtils";

const KPIReport = () => {
  const [screen, setScreen] = useState("report");
  const [editingConfig, setEditingConfig] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all templates for the Configurations List
  const { data: allTemplates = [], isLoading, isFetching, refetch } = useGetKPIRecordsQuery({ queries: "" });
  const [deleteKPIGroup] = useDeleteKPIGroupMutation();

  // Auto-refresh every 60 seconds (1 minute) when on main report screen
  useEffect(() => {
    if (screen !== "report") return;

    const interval = setInterval(() => {
      refetch().then(() => {
        setLastUpdated(new Date());
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [screen, refetch]);

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch().unwrap();
      setLastUpdated(new Date());
      message.success("KPI records refreshed with latest calculations!");
    } catch {
      message.error("Failed to refresh KPI data.");
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  // Group templates by group_id
  const groupedMap = {};
  allTemplates.forEach((kpi) => {
    const g_id = kpi.group_id || "1";
    if (!groupedMap[g_id]) {
      groupedMap[g_id] = [];
    }
    groupedMap[g_id].push(kpi);
  });

  const groupedConfigs = Object.keys(groupedMap).map((g_id) => {
    const rows = groupedMap[g_id];
    const created_at = rows[0]?.created_at || null;
    const name = rows[0]?.name || "";
    const created_by = rows[0]?.created_by || "";
    return {
      group_id: g_id,
      name,
      created_by,
      created_at,
      rows: [...rows].sort((a, b) => a.s_no - b.s_no),
    };
  });

  groupedConfigs.sort((a, b) => {
    if (a.created_at && b.created_at) {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (timeA !== timeB) {
        return timeB - timeA;
      }
    }
    return b.group_id.localeCompare(a.group_id);
  });

  const totalConfigs = groupedConfigs.length;
  groupedConfigs.forEach((config, idx) => {
    config.sno = totalConfigs - idx;
  });

  // --- Screen: Add / Edit / View ---
  if (screen === "add_row") {
    return (
      <AddKPIRow
        onBack={() => {
          setScreen("report");
          setEditingConfig(null);
          setIsViewOnly(false);
        }}
        editingConfig={editingConfig}
        isViewOnly={isViewOnly}
        onEdit={() => setIsViewOnly(false)}
      />
    );
  }

  const configsTableColumns = [
    {
      title: "S.No",
      key: "s_no",
      width: 60,
      align: "center",
      sorter: (a, b) => (a.sno || 0) - (b.sno || 0),
      render: (_, record) => (
        <span className="text-xs font-medium text-slate-600">{record.sno}</span>
      ),
    },
    {
      title: "Configuration Name",
      dataIndex: "name",
      key: "name",
      filters: Array.from(
        new Set(groupedConfigs.map((c) => c.name || (c.sno ? `KPI Configurations - ${c.sno}` : "KPI Configurations")))
      ).map((name) => ({ text: name, value: name })),
      onFilter: (value, record) =>
        (record.name || "").toLowerCase().includes(String(value).toLowerCase()),
      filterSearch: true,
      sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
      render: (text, record) => (
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-800">
            {record.name || (record.sno ? `KPI Configurations - ${record.sno}` : "KPI Configurations")}
          </span>
        </div>
      ),
    },
    {
      title: "Created Date",
      dataIndex: "created_at",
      key: "created_at",
      width: 220,
      sorter: (a, b) =>
        (a.created_at ? new Date(a.created_at).getTime() : 0) -
        (b.created_at ? new Date(b.created_at).getTime() : 0),
      render: (text) => (
        <span className="text-xs text-slate-600 font-medium">
          {text ? dayjs(text).format("DD MMMM YYYY, hh:mm A") : "—"}
        </span>
      ),
    },
    {
      title: "Total Rows",
      key: "rows_count",
      width: 120,
      align: "center",
      sorter: (a, b) => a.rows.length - b.rows.length,
      render: (_, record) => (
        <span className="text-xs font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded">
          {record.rows.length} {record.rows.length === 1 ? "Row" : "Rows"}
        </span>
      ),
    },
    {
      title: "Created By",
      dataIndex: "created_by",
      key: "created_by",
      width: 140,
      filters: Array.from(
        new Set(groupedConfigs.map((c) => c.created_by).filter(Boolean))
      ).map((val) => ({ text: val, value: val })),
      onFilter: (value, record) => record.created_by === value,
      render: (text, record) => (
        <span className="text-xs text-slate-700 font-medium">{record.created_by || text || "—"}</span>
      ),
    },
    {
      title: "Performance Overview",
      key: "performance",
      width: 180,
      render: (_, record) => {
        let metCount = 0;
        let warningCount = 0;
        let unmetCount = 0;

        record.rows.forEach((r) => {
          const evalRes = evaluateKPITargetStatus(r.target, r.achieved);
          if (evalRes.status === "met") metCount++;
          else if (evalRes.status === "warning") warningCount++;
          else if (evalRes.status === "unmet") unmetCount++;
        });

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {metCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {metCount} Met
              </span>
            )}
            {warningCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {warningCount} Near
              </span>
            )}
            {unmetCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {unmetCount} Below
              </span>
            )}
            {metCount === 0 && warningCount === 0 && unmetCount === 0 && (
              <span className="text-[11px] text-gray-400 font-medium">—</span>
            )}
          </div>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      width: 150,
      align: "center",
      render: (_, config) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => {
              setEditingConfig(config);
              setIsViewOnly(true);
              setScreen("add_row");
            }}
            className="p-1.5 rounded-md text-gray-500 hover:text-[#4F81BD] hover:bg-blue-50 transition-colors"
            title="View"
          >
            <Eye className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => {
              setEditingConfig(config);
              setIsViewOnly(false);
              setScreen("add_row");
            }}
            className="p-1.5 rounded-md text-gray-500 hover:text-[#4F81BD] hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            <Pencil className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() =>
              downloadKPIPDF(
                config.name,
                config.created_by,
                config.created_at,
                config.rows
              )
            }
            className="p-1.5 rounded-md text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
            title="Download PDF"
          >
            <Download className="w-[18px] h-[18px]" />
          </button>
          <Popconfirm
            title="Are you sure you want to delete this configuration group?"
            onConfirm={async () => {
              try {
                await deleteKPIGroup(config.group_id).unwrap();
                message.success("KPI configuration group deleted successfully");
              } catch (err) {
                console.error(err);
                message.error("Failed to delete KPI configurations");
              }
            }}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true, className: "bg-red-500 hover:bg-red-600" }}
          >
            <button
              className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-[18px] h-[18px]" />
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  // --- Screen: Report (main list) ---
  return (
    <div className="flex flex-col h-[75vh] gap-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-y-auto">
      {/* KPI Header Panel */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b pb-4 gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">KPI Performance Report</h2>
          <p className="text-xs text-gray-500">Calculate, track, and record key performance indicators for chosen frequencies and dates.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Last Updated Status */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] text-gray-600">
              Last updated: <strong className="text-slate-800 font-semibold">{dayjs(lastUpdated).format("HH:mm:ss")}</strong> <span className="text-gray-400 font-normal">(Auto-updates every 1 min)</span>
            </span>
          </div>

          <Button
            onClick={handleManualRefresh}
            loading={isRefreshing || isFetching}
            icon={<RotateCw className={`w-3.5 h-3.5 ${isRefreshing || isFetching ? "animate-spin" : ""}`} />}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100"
          >
            Refresh KPI Data
          </Button>

          <Button
            onClick={() => {
              setEditingConfig(null);
              setIsViewOnly(false);
              setScreen("add_row");
            }}
            type="default"
            className="!btn-blue"
          >
            + Add New Row
          </Button>
        </div>
      </div>

      {/* KPI Configurations Table Section */}
      <div className="mt-2">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400 text-xs">
            Loading KPI configurations...
          </div>
        ) : groupedConfigs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs border border-dashed rounded-lg bg-gray-50">
            No saved configurations found.
          </div>
        ) : (
          <Table
            dataSource={groupedConfigs}
            columns={configsTableColumns}
            rowKey="group_id"
            pagination={false}
            bordered
            size="small"
          />
        )}
      </div>
    </div>
  );
};

export default KPIReport;
