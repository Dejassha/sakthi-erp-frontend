import { useEffect, useMemo } from "react";
import { Form } from "antd";
import dayjs from "dayjs";
import {
  calculateDowntimeHours,
  calculateMaintenanceHours,
  calculateMeanTime,
  parseTimeValue,
} from "./breakdownUtils";

export function useBreakdownCalculations({
  form,
  item = null,
  allRecords = [],
  mode = "add",
}) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isMaintenanceOnly = mode === "maintenance_update";

  const breakdownDate = Form.useWatch("breakdown_date", form);
  const breakdownTime = Form.useWatch("breakdown_time", form);
  const restartTime = Form.useWatch("restart_time", form);
  const breakdownCompleteDate = Form.useWatch("breakdown_complete_date", form);
  const maintenanceStartTime = Form.useWatch("maintenance_start_time", form);
  const maintenanceCompleteTime = Form.useWatch("maintenance_complete_time", form);

  const totalDowntimeHours = useMemo(() => {
    const dateForCalc =
      breakdownDate ||
      (item?.breakdown_date ? dayjs(item.breakdown_date) : null);
    const timeForCalc =
      breakdownTime ||
      (item?.breakdown_time ? parseTimeValue(item.breakdown_time) : null);
    return calculateDowntimeHours(
      dateForCalc,
      timeForCalc,
      restartTime || null,
      breakdownCompleteDate || null,
    );
  }, [breakdownDate, breakdownTime, restartTime, breakdownCompleteDate, item]);

  const maintenanceHours = useMemo(() => {
    const startForCalc =
      maintenanceStartTime ||
      (item?.maintenance_start_time
        ? parseTimeValue(item.maintenance_start_time)
        : null);
    const completeForCalc =
      maintenanceCompleteTime ||
      (item?.maintenance_complete_time
        ? parseTimeValue(item.maintenance_complete_time)
        : null);
    return calculateMaintenanceHours(startForCalc, completeForCalc);
  }, [maintenanceStartTime, maintenanceCompleteTime, item]);

  const meanTimeDisplay = useMemo(() => {
    if (!item) return "0";
    return calculateMeanTime(item, allRecords);
  }, [item, allRecords]);

  useEffect(() => {
    if (form) {
      form.setFieldValue("total_downtime_hours", totalDowntimeHours);
    }
  }, [form, totalDowntimeHours]);

  const isClosed = Boolean(
    item?.status === "CLOSED" ||
    item?.status === "COMPLETED" ||
    item?.restart_time ||
    item?.maintenance_complete_time,
  );

  const hasMaintenanceData = Boolean(
    isClosed ||
    item?.maintenance_start_time ||
    item?.breakdown_complete_date ||
    (item?.total_downtime_hours !== undefined && item?.total_downtime_hours !== null && item?.total_downtime_hours > 0),
  );

  const showMaintenanceFields =
    isMaintenanceOnly || isEdit || (isView && hasMaintenanceData);

  return {
    totalDowntimeHours,
    maintenanceHours,
    meanTimeDisplay,
    isClosed,
    hasMaintenanceData,
    showMaintenanceFields,
  };
}
