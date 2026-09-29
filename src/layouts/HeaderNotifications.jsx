import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { Dropdown, Modal, DatePicker, Input, message } from "antd";
import dayjs from "dayjs";
import { useAuth } from "@/context/useAuth";
import {
  useGetMachinesQuery,
  useApproveMaintenanceMutation,
  useGetInventoryPartsQuery,
} from "@/store/services/admin.api";
import { ROUTES } from "@/Routes/routes.constants";
import Button from "@/components/ReusableComponents/Button";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import StyledFormItem, {
  INPUT_CLASS,
  DATE_PICKER_CLASS,
  DISABLE_INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";

const HeaderNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: machines = [], refetch } = useGetMachinesQuery(undefined);
  const [approveMaintenance] = useApproveMaintenanceMutation();
  const { data: inventoryParts = [] } = useGetInventoryPartsQuery(undefined);

  // Notification complete modal state
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifMachineId, setNotifMachineId] = useState(null);
  const [notifType, setNotifType] = useState(null);
  const [notifMachineName, setNotifMachineName] = useState("");
  const [notifMaintenanceName, setNotifMaintenanceName] = useState("");
  const [notifPerformedDate, setNotifPerformedDate] = useState(null);
  const [notifNextDate, setNotifNextDate] = useState(null);
  const [notifIntervalDays, setNotifIntervalDays] = useState(30);
  const [notifSubmitting, setNotifSubmitting] = useState(false);

  // Pending maintenance items (within remind_before_days threshold or due/overdue)
  const pendingMaintenance = useMemo(() => {
    const items = [];
    machines.forEach((m) => {
      if (!m.maintenance_schedules) return;
      m.maintenance_schedules.forEach((schedule) => {
        if (!schedule.next_maintenance_date) return;
        const nextDate = dayjs(schedule.next_maintenance_date);
        const today = dayjs().startOf("day");
        const diffDays = nextDate.diff(today, "day");
        const remindThreshold = Number(schedule.remind_before_days ?? 3);

        if (diffDays <= remindThreshold) {
          let remainingDaysLabel = "";
          if (diffDays < 0) {
            remainingDaysLabel = `Overdue ${Math.abs(diffDays)}d`;
          } else if (diffDays === 0) {
            remainingDaysLabel = "Due Today";
          } else {
            remainingDaysLabel = `${diffDays}d left`;
          }

          items.push({
            machineId: m.id,
            machineName: m.machine_name,
            scheduleId: schedule.id,
            maintenanceName: schedule.maintenance_name,
            dateStr: schedule.next_maintenance_date,
            intervalDays: schedule.interval_days || 30,
            remindBeforeDays: remindThreshold,
            diffDays,
            remainingDaysLabel,
          });
        }
      });
    });
    return items.sort((a, b) => dayjs(a.dateStr).diff(dayjs(b.dateStr)));
  }, [machines]);

  const handleOpenNotifModal = (
    machineId,
    machineName,
    scheduleId,
    maintenanceName,
    scheduledDateStr,
    intervalDays,
  ) => {
    setNotifMachineId(machineId);
    setNotifMachineName(machineName);
    setNotifMaintenanceName(maintenanceName);
    setNotifType(scheduleId);
    const interval = intervalDays || 30;
    setNotifIntervalDays(interval);
    setNotifPerformedDate(scheduledDateStr);
    const baseDate = dayjs(scheduledDateStr);
    const nextDate = baseDate.add(interval, "day").format("YYYY-MM-DD");
    setNotifNextDate(nextDate);
    setNotifModalOpen(true);
  };

  const handleCloseNotifModal = () => {
    setNotifModalOpen(false);
    setNotifMachineId(null);
    setNotifType(null);
    setNotifMaintenanceName("");
    setNotifPerformedDate(null);
    setNotifNextDate(null);
    setNotifIntervalDays(30);
  };

  const handleRecalculateNotifNextDate = (pDateStr, intervalVal) => {
    if (pDateStr && intervalVal && !isNaN(intervalVal)) {
      const nextDate = dayjs(pDateStr).add(Number(intervalVal), "day").format("YYYY-MM-DD");
      setNotifNextDate(nextDate);
    }
  };

  const handleSubmitNotifComplete = async () => {
    if (!notifMachineId || !notifType || !notifPerformedDate || !notifNextDate)
      return;
    setNotifSubmitting(true);
    try {
      await approveMaintenance({
        schedule_id: notifType,
        approved_by: user?.username || "Admin",
        maintenance_date: notifPerformedDate,
        next_maintenance_date: notifNextDate,
        maintenance_name: notifMaintenanceName,
        interval_days: Number(notifIntervalDays),
      }).unwrap();
      message.success("Maintenance marked as completed!");
      handleCloseNotifModal();
      refetch();
    } catch (err) {
      console.error(err);
      message.error(
        err?.data?.message || "Failed to complete maintenance. Please try again.",
      );
    } finally {
      setNotifSubmitting(false);
    }
  };

  // Stock alerts
  const [dismissedParts, setDismissedParts] = useState(() => {
    try {
      const saved = localStorage.getItem("dismissed_low_stock_parts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Clean up dismissed parts list when stock levels recover
  useEffect(() => {
    if (!inventoryParts.length) return;
    const activeLowStockIds = new Set(
      inventoryParts
        .filter((p) => {
          const stock = Number(p.stock_quantity || 0);
          const available = Number(p.available_quantity || 0);
          return stock > 0 && available <= stock / 2;
        })
        .map((p) => p.id),
    );

    setDismissedParts((prev) => {
      const updated = prev.filter((id) => activeLowStockIds.has(id));
      if (updated.length !== prev.length) {
        localStorage.setItem(
          "dismissed_low_stock_parts",
          JSON.stringify(updated),
        );
        return updated;
      }
      return prev;
    });
  }, [inventoryParts]);

  const handleDismissLowStock = (id) => {
    setDismissedParts((prev) => {
      const updated = [...prev, id];
      localStorage.setItem(
        "dismissed_low_stock_parts",
        JSON.stringify(updated),
      );
      return updated;
    });
  };

  const lowStockAlerts = useMemo(() => {
    const groups = {};
    inventoryParts.forEach((p) => {
      const name = (p.item_name || p.part_name || "").trim();
      const key = name.toLowerCase();
      if (!key) return;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(p);
    });
    const alerts = [];
    Object.keys(groups).forEach((key) => {
      const group = groups[key];
      if (group.length === 0) return;
      const sortedGroup = [...group].sort((a, b) => {
        const dateA = a.purchase_date;
        const dateB = b.purchase_date;
        if (dateA && dateB) {
          const comp = dateB.localeCompare(dateA);
          if (comp !== 0) return comp;
        } else if (dateA) {
          return -1;
        } else if (dateB) {
          return 1;
        }
        return b.id - a.id;
      });
      const latestPart = sortedGroup[0];
      const stock = group.reduce(
        (sum, p) => sum + Number(p.stock_quantity || 0),
        0,
      );
      const available = group.reduce(
        (sum, p) => sum + Number(p.available_quantity || 0),
        0,
      );
      const minStock = Number(latestPart.min_stock_quantity || 0);
      const isLowStock = minStock > 0 ? available <= minStock : available <= 0;
      if (stock > 0 && isLowStock) {
        if (!dismissedParts.includes(latestPart.id)) {
          alerts.push({
            id: latestPart.id,
            partName: latestPart.item_name || latestPart.part_name || "",
            available,
            total: stock,
            unit: latestPart.unit || "pcs",
          });
        }
      }
    });
    return alerts;
  }, [inventoryParts, dismissedParts]);

  // KPI Achieved Notifications
  const [kpiAlerts, setKpiAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem("kpi_achieved_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const updateKpiAlerts = () => {
      try {
        const saved = localStorage.getItem("kpi_achieved_notifications");
        setKpiAlerts(saved ? JSON.parse(saved) : []);
      } catch {
        setKpiAlerts([]);
      }
    };
    window.addEventListener("kpi_notifications_updated", updateKpiAlerts);
    window.addEventListener("storage", updateKpiAlerts);
    return () => {
      window.removeEventListener("kpi_notifications_updated", updateKpiAlerts);
      window.removeEventListener("storage", updateKpiAlerts);
    };
  }, []);

  const handleDismissKpiAlert = (notifId) => {
    const updated = kpiAlerts.filter((a) => a.id !== notifId);
    setKpiAlerts(updated);
    localStorage.setItem(
      "kpi_achieved_notifications",
      JSON.stringify(updated),
    );
  };

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return Boolean(
      user.isAdmin ||
      user.is_admin ||
      user.role === "admin" ||
      (Array.isArray(user.roles) && user.roles.includes("admin"))
    );
  }, [user]);

  const canSeeMaintenance = useMemo(() => {
    if (!user) return false;
    if (isAdmin) return true;
    if (user.role === "maintenance") return true;
    if (Array.isArray(user.roles) && user.roles.includes("maintenance")) return true;
    return false;
  }, [user, isAdmin]);

  const canSeeInventory = useMemo(() => {
    if (!user) return false;
    if (isAdmin) return true;
    if (user.role === "inventory") return true;
    if (Array.isArray(user.roles) && user.roles.includes("inventory")) return true;
    return false;
  }, [user, isAdmin]);

  const totalAlerts = useMemo(() => {
    let count = 0;
    if (canSeeMaintenance) count += pendingMaintenance.length;
    if (canSeeInventory) count += lowStockAlerts.length;
    if (isAdmin) count += kpiAlerts.length;
    return count;
  }, [canSeeMaintenance, canSeeInventory, isAdmin, pendingMaintenance.length, lowStockAlerts.length, kpiAlerts.length]);

  // If user cannot see maintenance OR inventory notifications (and isn't admin), hide notification bell completely
  if (!canSeeMaintenance && !canSeeInventory) {
    return null;
  }

  return (
    <>
      {/* NOTIFICATION BELL & DROPDOWN */}
      <Dropdown
        popupRender={() => (
          <div className="w-[480px] bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 z-50 max-h-[420px] overflow-y-auto">
            <div className="px-3.5 py-1.5 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <span className="font-semibold text-gray-800 text-xs">
                Notifications & Alerts
              </span>
              {totalAlerts > 0 ? (
                <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">
                  {totalAlerts} total
                </span>
              ) : null}
            </div>

            {totalAlerts === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-xs">
                No alerts at this time.
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {/* KPI Achieved Updates (Admin Only) */}
                {isAdmin && kpiAlerts.length > 0 ? (
                  <div>
                    <div className="px-2 py-1 mb-1 rounded flex justify-between items-center bg-blue-50">
                      <span className="font-semibold text-blue-800 text-[10px]">
                        KPI Achieved Alerts
                      </span>
                      <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-medium">
                        {kpiAlerts.length} updated
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {kpiAlerts.map((item, idx) => (
                        <div
                          key={`kpi-${item.id || idx}`}
                          className="p-1.5 border border-blue-100 rounded-md bg-blue-50/30 hover:bg-blue-50/70 flex items-start justify-between gap-1 transition-colors cursor-pointer"
                          onClick={() => {
                            setDropdownOpen(false);
                            navigate(ROUTES.DASHBOARD.ADMIN);
                          }}
                        >
                          <div className="flex items-start gap-1.5 min-w-0">
                            <Icon icon="lucide:check-circle-2" className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-[10px] text-gray-800 truncate leading-tight">
                                {item.configName || "KPI Configuration"}
                              </p>
                              <p className="text-[9px] text-blue-700 font-medium leading-tight">
                                Achieved updated
                              </p>
                              <p className="text-[8px] text-gray-400 mt-0.5 leading-tight">
                                {dayjs(item.timestamp).format("DD MMM, hh:mm A")}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismissKpiAlert(item.id);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0 cursor-pointer"
                            title="Dismiss"
                          >
                            <Icon icon="lucide:x" className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Maintenance Alerts */}
                {canSeeMaintenance && pendingMaintenance.length > 0 ? (
                  <div>
                    <div className="px-2 py-1 mb-1 rounded flex justify-between items-center bg-gray-100">
                      <span className="font-semibold text-gray-800 text-[10px]">
                        Maintenance Alerts
                      </span>
                      <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded-full font-medium">
                        {pendingMaintenance.length} due
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {pendingMaintenance.map((item, idx) => (
                        <div
                          key={`maint-${idx}`}
                          className="p-1.5 border border-gray-200 rounded-md bg-gray-50/50 hover:bg-gray-100/70 flex justify-between items-start gap-1 cursor-pointer transition-colors"
                          onClick={() => {
                            setDropdownOpen(false);
                            navigate(
                              `${ROUTES.DASHBOARD.MAINTENANCE}?action=complete_schedule&id=${item.scheduleId}`
                            );
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[10px] text-gray-800 truncate leading-tight">
                              {item.machineName}
                            </p>
                            <p className="text-[9px] text-gray-500 capitalize truncate leading-tight">
                              {item.maintenanceName || "Maintenance"}
                            </p>
                            <div className="flex items-center justify-between mt-0.5 gap-1 flex-wrap">
                              <span className="text-[8px] text-gray-500 font-medium leading-tight">
                                Due: {item.dateStr}
                              </span>
                              <span
                                className={`text-[8px] px-1 py-0.2 rounded font-semibold leading-tight ${
                                  item.diffDays <= 0
                                    ? "bg-rose-100 text-rose-700 font-bold border border-rose-200"
                                    : "bg-amber-100 text-amber-800 font-semibold border border-amber-200"
                                }`}
                              >
                                {item.remainingDaysLabel}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropdownOpen(false);
                              navigate(
                                `${ROUTES.DASHBOARD.MAINTENANCE}?action=complete_schedule&id=${item.scheduleId}`
                              );
                            }}
                            className="bg-green-50 hover:bg-green-100 text-green-700 p-1 rounded border border-green-200 flex items-center justify-center transition cursor-pointer flex-shrink-0"
                            title="Complete Maintenance"
                          >
                            <Icon icon="lucide:check" className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Stock Alerts */}
                {canSeeInventory && lowStockAlerts.length > 0 ? (
                  <div>
                    <div className="px-2 py-1 mb-1 rounded flex justify-between items-center bg-orange-50">
                      <span className="font-semibold text-orange-800 text-[10px]">
                        Stock Alerts
                      </span>
                      <span className="text-[9px] bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded-full font-medium">
                        {lowStockAlerts.length} low
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {lowStockAlerts.map((item, idx) => (
                        <div
                          key={`stock-${item.id || idx}`}
                          className="p-1.5 border border-orange-100 rounded-md bg-orange-50/30 hover:bg-orange-50/70 flex items-center justify-between gap-1 cursor-pointer transition-colors"
                          onClick={() => {
                            setDropdownOpen(false);
                            navigate(ROUTES.DASHBOARD.INVENTORY);
                          }}
                        >
                          <div className="flex items-start gap-1.5 min-w-0 flex-1">
                            <Icon icon="lucide:alert-triangle" className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-[10px] text-gray-800 truncate leading-tight">
                                {item.partName}
                              </p>
                              <p className="text-[9px] text-orange-600 font-semibold leading-tight">
                                {item.available} / {item.total} {item.unit}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
        open={dropdownOpen}
        onOpenChange={(flag) => setDropdownOpen(flag)}
        trigger={["click"]}
        placement="bottomRight"
      >
        <button className="relative p-1 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition cursor-pointer">
          <Icon icon="lucide:bell" className="size-5 text-gray-600" />
          {totalAlerts > 0 ? (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[8px] size-3.5 flex items-center justify-center font-bold">
              {totalAlerts}
            </span>
          ) : null}
        </button>
      </Dropdown>
    </>
  );
};

export default HeaderNotifications;
