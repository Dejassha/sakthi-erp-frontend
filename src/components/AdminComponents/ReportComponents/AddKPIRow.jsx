import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Button, Input, Table, Select, message, ConfigProvider, Modal, Popconfirm } from "antd";
import { ArrowLeft, Plus, Save, Trash2, Download, Pencil, RotateCw } from "lucide-react";
import { useSaveKPIRecordsMutation, useGetKPIDefaultsQuery, useGetKPIRecordsQuery } from "@/store/services/admin.api";
import { downloadKPIPDF } from "./utils/kpiPdfUtils";
import { useAuth } from "@/context/useAuth";
import { evaluateKPITargetStatus } from "./utils/kpiCalculationUtils";
import dayjs from "dayjs";

/* ---------------- Constants ---------------- */

const STANDARD_KEYS = new Set([
  "id",
  "key",
  "s_no",
  "sno",
  "kpi_category",
  "kpi_parameter",
  "formula",
  "target",
  "achieved",
  "frequency",
  "responsible",
  "remarks",
  "period",
  "name",
  "group_id",
  "created_by",
  "created_at",
  "updated_at",
]);

const FREQUENCY_OPTIONS = [
  { label: "Weekly", value: "Weekly" },
  { label: "Monthly", value: "Monthly" },
  { label: "Yearly", value: "Yearly" },
];

const TABLE_THEME = {
  token: {
    fontSize: 10,
    borderRadius: 0,
  },
  components: {
    Table: {
      headerBg: "#4F81BD",
      headerColor: "#ffffff",
      headerSplitColor: "#ffffff",
      borderColor: "#ffffff",
      cellPaddingBlock: 6,
      cellPaddingInline: 6,
      rowHoverBg: "transparent",
    },
  },
};

const extractCustomColumns = (rows) => {
  if (!rows || rows.length === 0) return [];
  const foundKeys = new Set();
  const cols = [];
  rows.forEach((r) => {
    Object.keys(r).forEach((k) => {
      if (!STANDARD_KEYS.has(k) && !foundKeys.has(k)) {
        foundKeys.add(k);
        const formattedTitle = k
          .replace(/^(col_|custom_)/, "")
          .replace(/_[0-9]+$/, "")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        cols.push({ key: k, title: formattedTitle });
      }
    });
  });
  return cols;
};

const createEmptyRow = (s_no, customCols = []) => {
  const row = {
    key: Date.now().toString() + Math.random().toString(),
    s_no,
    kpi_category: "",
    kpi_parameter: "",
    formula: "",
    target: "",
    achieved: "",
    frequency: "Monthly",
    responsible: "",
    remarks: "",
  };
  customCols.forEach((col) => {
    row[col.key] = "";
  });
  return row;
};

/* ---------------- Component ---------------- */

const AddKPIRow = ({
  onBack,
  editingConfig,
  isViewOnly = false,
  onEdit,
}) => {
  const { user } = useAuth();
  const loggedInUser =
    user?.username || JSON.parse(localStorage.getItem("user") || "{}")?.username || "";

  // Fetch default KPI template rows from backend (only used for new configs)
  const isNewConfig = !editingConfig?.rows || editingConfig.rows.length === 0;
  const { data: backendDefaults } = useGetKPIDefaultsQuery(undefined, { skip: !isNewConfig });

  /* ---------------- State ---------------- */

  const [colWidths, setColWidths] = useState({
    s_no: 55,
    kpi_category: 160,
    kpi_parameter: 180,
    formula: 260,
    target: 120,
    achieved: 100,
    frequency: 120,
    responsible: 160,
    remarks: 280,
    action: 65,
  });

  const [customColumns, setCustomColumns] = useState(() => {
    if (editingConfig?.rows && editingConfig.rows.length > 0) {
      return extractCustomColumns(editingConfig.rows);
    }
    return [];
  });

  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  const [draftRows, setDraftRows] = useState(() => {
    if (editingConfig?.rows && editingConfig.rows.length > 0) {
      return editingConfig.rows.map((r, idx) => {
        const row = {
          key: r.id ? r.id.toString() : (idx + 1).toString(),
          s_no: r.s_no ?? (idx + 1),
          kpi_category: r.kpi_category || "",
          kpi_parameter: r.kpi_parameter || "",
          formula: r.formula || "",
          target: r.target || "",
          achieved: r.achieved ?? "",
          frequency: r.frequency || "Monthly",
          responsible: r.responsible || "",
          remarks: r.remarks || "",
        };
        Object.keys(r).forEach((k) => {
          if (!STANDARD_KEYS.has(k)) {
            row[k] = r[k] ?? "";
          }
        });
        return row;
      });
    }
    // Start with empty rows; will be replaced by backend defaults via useEffect
    return Array.from({ length: 15 }, (_, i) => ({
      ...createEmptyRow(i + 1),
      key: (i + 1).toString(),
    }));
  });

  // Once backend defaults load, populate the draft rows (only for new configs)
  useEffect(() => {
    if (isNewConfig && backendDefaults && backendDefaults.length > 0) {
      const extractedCols = extractCustomColumns(backendDefaults);
      if (extractedCols.length > 0) {
        setCustomColumns(extractedCols);
      }
      setDraftRows(
        backendDefaults.map((row) => {
          const rowObj = {
            key: row.s_no.toString(),
            s_no: row.s_no,
            kpi_category: row.kpi_category || "",
            kpi_parameter: row.kpi_parameter || "",
            formula: row.formula || "",
            target: row.target || "",
            achieved: row.achieved ?? "",
            frequency: row.frequency || "Monthly",
            responsible: row.responsible || "",
            remarks: row.remarks || "",
          };
          Object.keys(row).forEach((k) => {
            if (!STANDARD_KEYS.has(k)) {
              rowObj[k] = row[k] ?? "";
            }
          });
          return rowObj;
        })
      );
    }
  }, [isNewConfig, backendDefaults]);

  const [configName, setConfigName] = useState(() => {
    return editingConfig?.rows?.[0]?.name || "";
  });

  const [createdBy] = useState(() => {
    return editingConfig?.rows?.[0]?.created_by || loggedInUser;
  });

  const activeCreatedBy = createdBy || loggedInUser;

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* ---------------- API ---------------- */

  const [saveKPIRecords, { isLoading: isSaving }] = useSaveKPIRecordsMutation();

  // Query to fetch live KPI dynamic calculations
  const { refetch: refetchLiveKPI, isFetching: isFetchingLive } = useGetKPIRecordsQuery(
    { queries: editingConfig?.group_id || "" },
    { skip: !editingConfig?.group_id }
  );

  // Auto-refresh every 60 seconds (1 minute) in view mode. Pauses in edit mode to protect user input.
  useEffect(() => {
    if (!isViewOnly || !editingConfig?.group_id) return;

    const interval = setInterval(async () => {
      try {
        const res = await refetchLiveKPI().unwrap();
        setLastUpdated(new Date());
        if (res && res.length > 0) {
          setDraftRows((prev) =>
            prev.map((r) => {
              const matching = res.find(
                (live) =>
                  (live.id && String(live.id) === String(r.key)) ||
                  live.s_no === r.s_no ||
                  live.kpi_parameter === r.kpi_parameter
              );
              if (matching && matching.achieved !== undefined) {
                return { ...r, achieved: matching.achieved };
              }
              return r;
            })
          );
        }
      } catch {
        // silent polling catch
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isViewOnly, editingConfig?.group_id, refetchLiveKPI]);

  // Manual Recalculate / Refresh handler
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (editingConfig?.group_id) {
        const res = await refetchLiveKPI().unwrap();
        setLastUpdated(new Date());
        if (res && res.length > 0) {
          setDraftRows((prev) =>
            prev.map((r) => {
              const matching = res.find(
                (live) =>
                  (live.id && String(live.id) === String(r.key)) ||
                  live.s_no === r.s_no ||
                  live.kpi_parameter === r.kpi_parameter
              );
              if (matching && matching.achieved !== undefined) {
                return { ...r, achieved: matching.achieved };
              }
              return r;
            })
          );
        }
      } else {
        setLastUpdated(new Date());
      }
      message.success("KPI calculations recalculated and updated!");
    } catch {
      message.error("Failed to refresh KPI calculations.");
    } finally {
      setIsRefreshing(false);
    }
  }, [editingConfig?.group_id, refetchLiveKPI]);

  /* ---------------- Handlers ---------------- */

  const handleResizeMouseDown = useCallback(
    (e, colKey) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = colWidths[colKey] || 150;

      const handleMouseMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(50, startWidth + delta);
        setColWidths((prev) => ({
          ...prev,
          [colKey]: newWidth,
        }));
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [colWidths]
  );

  const handleAddDraftRow = useCallback(() => {
    setDraftRows((prev) => {
      const nextSNo = prev.length > 0 ? Math.max(...prev.map((r) => r.s_no)) + 1 : 1;
      return [...prev, createEmptyRow(nextSNo, customColumns)];
    });
  }, [customColumns]);

  const handleRemoveDraftRow = useCallback((key) => {
    setDraftRows((prev) => {
      const filtered = prev.filter((r) => r.key !== key);
      return filtered.map((r, idx) => ({ ...r, s_no: idx + 1 }));
    });
  }, []);

  const handleFieldChange = useCallback(
    (key, field, value) => {
      setDraftRows((prev) =>
        prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
      );
    },
    []
  );

  const handleAddColumn = () => {
    const trimmedTitle = newColumnTitle.trim();
    if (!trimmedTitle) {
      message.warning("Please enter a column title.");
      return;
    }

    const standardTitles = [
      "s.no",
      "sno",
      "s. no",
      "kpi category",
      "kpi parameter",
      "formula",
      "measurement",
      "formula / measurement",
      "target",
      "achieved",
      "frequency",
      "responsible",
      "remarks",
      "action",
    ];

    if (standardTitles.includes(trimmedTitle.toLowerCase())) {
      message.warning("This column already exists in the table.");
      return;
    }

    const alreadyExists = customColumns.some(
      (c) => c.title.toLowerCase() === trimmedTitle.toLowerCase()
    );
    if (alreadyExists) {
      message.warning(`A column with title "${trimmedTitle}" already exists.`);
      return;
    }

    const keyName = `custom_${trimmedTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;
    const newCol = {
      key: keyName,
      title: trimmedTitle,
    };

    setColWidths((prev) => ({
      ...prev,
      [keyName]: 160,
    }));

    setCustomColumns((prev) => [...prev, newCol]);
    setDraftRows((prev) =>
      prev.map((r) => ({
        ...r,
        [keyName]: "",
      }))
    );

    setNewColumnTitle("");
    setIsAddColumnModalOpen(false);
    message.success(`Column "${trimmedTitle}" added successfully!`);
  };

  const handleDeleteColumn = useCallback((colKey, colTitle) => {
    setCustomColumns((prev) => prev.filter((c) => c.key !== colKey));
    setDraftRows((prev) =>
      prev.map((r) => {
        const copy = { ...r };
        delete copy[colKey];
        return copy;
      })
    );
    message.success(`Column "${colTitle}" deleted successfully.`);
  }, []);

  const handleSave = async () => {
    const invalid = draftRows.some((r) => !r.kpi_category.trim() || !r.kpi_parameter.trim());
    if (invalid) {
      message.error("Please fill in the KPI Category and KPI Parameter for all rows.");
      return;
    }

    try {
      const finalGroupId = editingConfig ? editingConfig.group_id : "group_" + Date.now();
      const rows = draftRows.map((r) => {
        const rowData = {
          s_no: r.s_no,
          kpi_category: r.kpi_category,
          kpi_parameter: r.kpi_parameter,
          formula: r.formula,
          target: r.target,
          frequency: r.frequency,
          responsible: r.responsible,
          achieved: r.achieved ?? "",
          remarks: r.remarks || "",
          period: "",
        };
        customColumns.forEach((col) => {
          rowData[col.key] = r[col.key] || "";
        });
        return rowData;
      });

      await saveKPIRecords({
        rows,
        group_id: finalGroupId,
        name: configName,
        created_by: activeCreatedBy,
      }).unwrap();

      const hasAchieved = draftRows.some((r) => r.achieved && r.achieved.trim() !== "");
      if (hasAchieved) {
        message.success("Your achieved values have been updated successfully!");

        // Add to Header notification bell
        try {
          const newAlert = {
            id: "kpi_" + Date.now(),
            configName: configName || "KPI Configuration",
            updatedBy: activeCreatedBy || loggedInUser || "Admin",
            timestamp: new Date().toISOString(),
          };
          const raw = localStorage.getItem("kpi_achieved_notifications");
          const list = raw ? JSON.parse(raw) : [];
          const updatedList = [newAlert, ...list.filter((n) => n.configName !== newAlert.configName)].slice(0, 10);
          localStorage.setItem("kpi_achieved_notifications", JSON.stringify(updatedList));
          window.dispatchEvent(new Event("kpi_notifications_updated"));
        } catch (e) {
          console.error("Error saving KPI notification alert:", e);
        }
      } else {
        message.success("KPI configurations saved successfully!");
      }

      onBack();
    } catch (err) {
      console.error("Failed to save KPI configurations:", err);
      message.error("Failed to save KPI configurations. Please try again.");
    }
  };

  /* ---------------- Columns Definition ---------------- */

  const renderHeader = useCallback(
    (
      titleNode,
      colKey,
      align = "left",
      extraNode
    ) => (
      <div className="relative group/col-hdr flex items-center justify-between w-full h-full select-none pr-1">
        <div className={`flex-1 truncate ${align === "center" ? "text-center" : "text-left"}`}>
          {titleNode}
        </div>
        {extraNode}
        <div
          className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-20 flex items-center justify-center opacity-0 group-hover/col-hdr:opacity-100 hover:!opacity-100 transition-opacity"
          onMouseDown={(e) => handleResizeMouseDown(e, colKey)}
          onClick={(e) => e.stopPropagation()}
          title="Drag to resize column"
        >
          <div className="w-[2px] h-3.5 bg-white/80 rounded" />
        </div>
      </div>
    ),
    [handleResizeMouseDown]
  );

  const columns = useMemo(() => {
    const baseCols = [
      {
        title: renderHeader(
          <span className="text-[12px] font-bold text-white">S.No</span>,
          "s_no",
          "center"
        ),
        dataIndex: "s_no",
        key: "s_no",
        width: colWidths.s_no || 55,
        align: "center",
        render: (text) => (
          <span className="text-[10px] font-semibold text-gray-600">{text}</span>
        ),
      },
      {
        title: renderHeader(
          <span className="text-[12px] font-bold text-white">
            KPI Category {isViewOnly ? "" : "*"}
          </span>,
          "kpi_category",
          "left"
        ),
        dataIndex: "kpi_category",
        key: "kpi_category",
        width: colWidths.kpi_category || 160,
        onCell: () => ({ style: { padding: 0 } }),
        render: (text, record) =>
          isViewOnly ? (
            <span className="text-xs font-semibold text-gray-700 px-3 py-2 block whitespace-pre-wrap break-words">
              {text || "—"}
            </span>
          ) : (
            <Input
              placeholder="e.g. Production"
              value={record.kpi_category}
              onChange={(e) => handleFieldChange(record.key, "kpi_category", e.target.value)}
              size="small"
              variant="borderless"
              className="w-full text-[10px] font-semibold text-gray-700 px-3 py-2 rounded-none"
            />
          ),
      },
      {
        title: renderHeader(
          <span className="text-[12px] font-bold text-white">
            KPI Parameter {isViewOnly ? "" : "*"}
          </span>,
          "kpi_parameter",
          "left"
        ),
        dataIndex: "kpi_parameter",
        key: "kpi_parameter",
        width: colWidths.kpi_parameter || 180,
        onCell: () => ({ style: { padding: 0 } }),
        render: (text, record) =>
          isViewOnly ? (
            <span className="text-xs font-semibold text-blue-900 px-3 py-2 block whitespace-pre-wrap break-words">
              {text || "—"}
            </span>
          ) : (
            <Input
              placeholder="e.g. Machine Utilization"
              value={record.kpi_parameter}
              onChange={(e) => handleFieldChange(record.key, "kpi_parameter", e.target.value)}
              size="small"
              variant="borderless"
              className="w-full text-[10px] font-semibold text-blue-900 px-3 py-2 rounded-none"
            />
          ),
      },
      {
        title: renderHeader(
          <span className="text-[12px] font-bold text-white">Formula / Measurement</span>,
          "formula",
          "left"
        ),
        dataIndex: "formula",
        key: "formula",
        width: colWidths.formula || 260,
        onCell: () => ({ style: { padding: 0 } }),
        render: (text, record) =>
          isViewOnly ? (
            <span className="text-xs italic text-gray-500 font-medium px-3 py-2 block whitespace-pre-wrap break-words">
              {text || "—"}
            </span>
          ) : (
            <Input.TextArea
              placeholder="e.g. Planned Hours / Runtime * 100"
              value={record.formula}
              onChange={(e) => handleFieldChange(record.key, "formula", e.target.value)}
              autoSize={{ minRows: 1, maxRows: 6 }}
              size="small"
              variant="borderless"
              className="w-full text-[10px] italic text-gray-500 font-medium px-3 py-2 rounded-none"
            />
          ),
      },
      {
        title: renderHeader(
          <span className="text-[12px] font-bold text-white">Target</span>,
          "target",
          "center"
        ),
        dataIndex: "target",
        key: "target",
        width: colWidths.target || 120,
        align: "center",
        onCell: () => ({ style: { padding: 0 } }),
        render: (text, record) =>
          isViewOnly ? (
            <span className="text-xs font-semibold text-gray-700 block text-center py-2">
              {text || "—"}
            </span>
          ) : (
            <Input
              placeholder="e.g. 85-90%"
              value={record.target}
              inputMode="decimal"
              onChange={(e) => {
                // allow numbers, decimals, ranges (-), percentages (%), operators
                const numericVal = e.target.value.replace(/[^0-9.%\-\s>=<]/g, "");
                handleFieldChange(record.key, "target", numericVal);
              }}
              size="small"
              variant="borderless"
              className="w-full text-[10px] font-semibold text-center px-3 py-2 rounded-none"
            />
          ),
      },
      {
        title: renderHeader(
          <span className="text-[12px] font-bold text-white">Achieved</span>,
          "achieved",
          "center"
        ),
        dataIndex: "achieved",
        key: "achieved",
        width: colWidths.achieved || 120,
        align: "center",
        onCell: () => ({ style: { padding: 0 } }),
        render: (text, record) => {
          const statusRes = evaluateKPITargetStatus(record.target, record.achieved);

          if (isViewOnly) {
            return (
              <div className="flex flex-col items-center justify-center gap-1 py-2 px-2">
                <span className="text-xs font-extrabold text-[#365F91] block text-center">
                  {text || "—"}
                </span>
                {record.achieved && record.target ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${statusRes.badgeClass}`}
                    title={`${statusRes.label} (Target: ${record.target})`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusRes.dotColor}`} />
                    {statusRes.label}
                  </span>
                ) : null}
              </div>
            );
          }

          return (
            <div className="flex flex-col items-center justify-center gap-1 w-full py-1">
              <Input
                placeholder="e.g. 90.00%"
                value={record.achieved}
                inputMode="decimal"
                onChange={(e) => {
                  // allow numbers, decimals, percentages (%)
                  const numericVal = e.target.value.replace(/[^0-9.%\-\s]/g, "");
                  handleFieldChange(record.key, "achieved", numericVal);
                }}
                size="small"
                variant="borderless"
                className="w-full text-[10px] font-semibold text-center px-3 py-1 rounded-none"
              />
              {record.achieved && record.target ? (
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8px] font-semibold border ${statusRes.badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusRes.dotColor}`} />
                  {statusRes.label}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        title: renderHeader(
          <span className="text-[12px] font-bold text-white">Frequency</span>,
          "frequency",
          "center"
        ),
        dataIndex: "frequency",
        key: "frequency",
        width: colWidths.frequency || 120,
        align: "center",
        onCell: () => ({ style: { padding: 0 } }),
        render: (text, record) =>
          isViewOnly ? (
            <span className="text-xs text-gray-600 block text-center py-2">{text || "Monthly"}</span>
          ) : (
            <Select
              value={record.frequency}
              onChange={(val) => handleFieldChange(record.key, "frequency", val)}
              options={FREQUENCY_OPTIONS}
              size="small"
              variant="borderless"
              className="w-full text-[10px]"
              popupClassName="text-[10px]"
            />
          ),
      },
      {
        title: renderHeader(
          <span className="text-[12px] font-bold text-white">Responsible</span>,
          "responsible",
          "left"
        ),
        dataIndex: "responsible",
        key: "responsible",
        width: colWidths.responsible || 160,
        onCell: () => ({ style: { padding: 0 } }),
        render: (text, record) =>
          isViewOnly ? (
            <span className="text-xs text-gray-700 px-3 py-2 block whitespace-pre-wrap break-words">
              {text || "—"}
            </span>
          ) : (
            <Input
              placeholder="e.g. Production"
              value={record.responsible}
              onChange={(e) => handleFieldChange(record.key, "responsible", e.target.value)}
              size="small"
              variant="borderless"
              className="w-full text-[10px] px-3 py-2 rounded-none"
            />
          ),
      },
    ];

    // Dynamic Custom Columns
    const dynamicCols = customColumns.map((col) => ({
      title: renderHeader(
        <span className="text-[12px] font-bold text-white block truncate" title={col.title}>
          {col.title}
        </span>,
        col.key,
        "left",
        !isViewOnly && (
          <Popconfirm
            title={`Delete column "${col.title}"?`}
            description="Data in this column will be removed."
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDeleteColumn(col.key, col.title);
            }}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true, size: "small" }}
            cancelButtonProps={{ size: "small" }}
          >
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="text-white/75 hover:text-red-200 p-0.5 rounded transition-colors mr-1"
              title={`Delete ${col.title} column`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Popconfirm>
        )
      ),
      dataIndex: col.key,
      key: col.key,
      width: colWidths[col.key] || 160,
      onCell: () => ({ style: { padding: 0 } }),
      render: (_, record) =>
        isViewOnly ? (
          <span className="text-xs text-gray-700 px-3 py-2 block whitespace-pre-wrap break-words">
            {record[col.key] || "—"}
          </span>
        ) : (
          <Input.TextArea
            placeholder={`Enter ${col.title}`}
            value={record[col.key] || ""}
            onChange={(e) => handleFieldChange(record.key, col.key, e.target.value)}
            autoSize={{ minRows: 1, maxRows: 6 }}
            size="small"
            variant="borderless"
            className="w-full text-[10px] px-3 py-2 rounded-none"
          />
        ),
    }));

    const remarksCol = {
      title: renderHeader(
        <span className="text-[12px] font-bold text-white">Remarks</span>,
        "remarks",
        "left"
      ),
      dataIndex: "remarks",
      key: "remarks",
      width: colWidths.remarks || 280,
      onCell: () => ({ style: { padding: 0 } }),
      render: (text, record) =>
        isViewOnly ? (
          <span className="text-xs text-gray-500 px-3 py-2 block whitespace-pre-wrap break-words">
            {text || "-"}
          </span>
        ) : (
          <Input.TextArea
            placeholder="Remarks"
            value={record.remarks}
            onChange={(e) => handleFieldChange(record.key, "remarks", e.target.value)}
            autoSize={{ minRows: 1, maxRows: 6 }}
            size="small"
            variant="borderless"
            className="w-full text-[10px] px-3 py-2 rounded-none"
          />
        ),
    };

    const actionCol = {
      title: <span className="text-[12px] font-bold text-white block text-center">Action</span>,
      key: "action",
      width: colWidths.action || 65,
      align: "center",
      render: (_, record) => (
        <Button
          type="text"
          danger
          disabled={draftRows.length === 1}
          icon={<Trash2 className="w-4 h-4" />}
          onClick={() => handleRemoveDraftRow(record.key)}
          size="small"
        />
      ),
    };

    if (isViewOnly) {
      return [...baseCols, ...dynamicCols, remarksCol];
    }
    return [...baseCols, ...dynamicCols, remarksCol, actionCol];
  }, [
    isViewOnly,
    customColumns,
    colWidths,
    renderHeader,
    handleFieldChange,
    handleRemoveDraftRow,
    handleDeleteColumn,
    draftRows.length,
  ]);

  /* ---------------- Render ---------------- */

  return (
    <div className="flex flex-col h-[75vh] gap-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100 font-sans overflow-y-auto">
      {/* Header Panel */}
      <div className="flex justify-between items-center border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            type="text"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={onBack}
            className="flex items-center justify-center border border-gray-200 rounded-lg"
          />
          <div>
            <h2 className="text-base font-bold text-gray-800">
              {isViewOnly
                ? configName || "KPI Configuration"
                : editingConfig
                ? "Edit KPI Configurations"
                : "Add New KPI Configurations"}
            </h2>
            <p className="text-xs text-gray-500">
              {isViewOnly
                ? "Viewing KPI configuration details (read-only)."
                : "Configure new parameters to add to your KPI Performance Report template."}
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Name & Created By Inputs */}
      <div className="flex flex-wrap items-center gap-6 justify-between">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
              Configuration Name {!isViewOnly && <span className="text-red-500">*</span>}
            </label>
            {isViewOnly ? (
              <span className="text-xs font-medium text-gray-800 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 min-w-[200px] inline-block">
                {configName || "KPI Configuration"}
              </span>
            ) : (
              <Input
                placeholder="e.g. Production KPIs Q3 2026"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                size="small"
                className="w-72 text-xs h-9"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
              Created By
            </label>
            <span className="text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded px-3 py-2 flex items-center h-9 min-w-[140px]">
              {activeCreatedBy || "—"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Live Last Updated Status */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] text-gray-600">
              Last updated: <strong className="text-slate-800 font-semibold">{dayjs(lastUpdated).format("HH:mm:ss")}</strong> <span className="text-gray-400 font-normal">({isViewOnly ? "Auto-updates every 1 min" : "Auto-update paused in edit mode"})</span>
            </span>
          </div>

          <Button
            onClick={handleManualRefresh}
            loading={isRefreshing || isFetchingLive}
            icon={<RotateCw className={`w-3.5 h-3.5 ${isRefreshing || isFetchingLive ? "animate-spin" : ""}`} />}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100"
          >
            Refresh KPI Data
          </Button>

          {isViewOnly && (
            <>
              <Button
                onClick={() =>
                  downloadKPIPDF(
                    configName,
                    activeCreatedBy,
                    editingConfig?.rows?.[0]?.created_at || null,
                    draftRows
                  )
                }
                icon={<Download className="w-4 h-4" />}
                className="!btn-blue"
              >
                Download PDF
              </Button>
              {onEdit && (
                <Button onClick={onEdit} icon={<Pencil className="w-4 h-4" />} className="!btn-blue">
                  Edit
                </Button>
              )}
            </>
          )}

          {!isViewOnly && (
            <>
              <Button
                onClick={() => setIsAddColumnModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
                className="!btn-blue"
              >
                Add Column
              </Button>
              <Button
                onClick={handleAddDraftRow}
                icon={<Plus className="w-4 h-4" />}
                className="!btn-blue"
              >
                Add Row
              </Button>
              <Button
                type="primary"
                onClick={handleSave}
                loading={isSaving}
                icon={<Save className="w-4 h-4" />}
                className="!btn-blue"
              >
                Save All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div>
        <ConfigProvider theme={TABLE_THEME}>
          <div className="border border-[#d3d5d7ff] rounded-lg overflow-hidden overflow-x-auto">
            <Table
              dataSource={draftRows}
              columns={columns}
              pagination={false}
              bordered
              scroll={{ x: "max-content" }}
              rowClassName={(_record, index) =>
                index % 2 === 0
                  ? "bg-[#BBDDE4] hover:!bg-[#a9d2dc]"
                  : "bg-[#e7f0f9ff] hover:!bg-[#d5e4f3]"
              }
            />
          </div>
        </ConfigProvider>
      </div>

      {/* Add Column Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Add New Column</span>
          </div>
        }
        open={isAddColumnModalOpen}
        onOk={handleAddColumn}
        onCancel={() => {
          setIsAddColumnModalOpen(false);
          setNewColumnTitle("");
        }}
        okText="Add Column"
        cancelText="Cancel"
        okButtonProps={{ className: "!btn-blue" }}
        centered
        destroyOnClose
      >
        <div className="py-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Column Name / Header Title <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. Department, Benchmark, Status, etc."
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            onPressEnter={handleAddColumn}
            autoFocus
            className="text-xs"
          />
          <p className="text-[11px] text-gray-500 mt-2">
            This will add a new column to the KPI table for all rows.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default AddKPIRow;
