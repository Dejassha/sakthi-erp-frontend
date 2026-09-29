import dayjs from "dayjs";

export function parseTimeValue(value) {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value;
  const parsed = dayjs(value, ["HH:mm:ss", "HH:mm", "hh:mm A", "h:mm A", "hh:mm a", "h:mm a"], true);
  if (parsed.isValid()) return parsed;
  const fallback = dayjs(`1970-01-01 ${value}`);
  return fallback.isValid() ? fallback : null;
}

export function formatTimeValue(value) {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value.format("HH:mm:ss");
  if (typeof value === "string") {
    const parsed = parseTimeValue(value);
    return parsed && parsed.isValid() ? parsed.format("HH:mm:ss") : value;
  }
  return null;
}

export function calculateDowntimeHours(
  breakdownDate,
  breakdownTime,
  restartTime,
  breakdownCompleteDate,
) {
  if (!breakdownTime || !restartTime) return 0;
  const startDate = breakdownDate || dayjs();
  const endDate = breakdownCompleteDate || breakdownDate || startDate;
  const start = startDate
    .hour(breakdownTime.hour())
    .minute(breakdownTime.minute())
    .second(0)
    .millisecond(0);
  let end = endDate
    .hour(restartTime.hour())
    .minute(restartTime.minute())
    .second(0)
    .millisecond(0);
  if (!end.isAfter(start)) {
    end = end.add(1, "day");
  }
  return Math.round((end.diff(start, "minute") / 60) * 100) / 100;
}

export function calculateMaintenanceHours(startTime, completeTime) {
  if (!startTime || !completeTime) return 0;
  const baseDate = dayjs();
  const start = baseDate
    .hour(startTime.hour())
    .minute(startTime.minute())
    .second(0)
    .millisecond(0);
  let complete = baseDate
    .hour(completeTime.hour())
    .minute(completeTime.minute())
    .second(0)
    .millisecond(0);
  if (!complete.isAfter(start)) {
    complete = complete.add(1, "day");
  }
  return Math.round((complete.diff(start, "minute") / 60) * 100) / 100;
}

export function formatDowntime(value) {
  if (value === undefined || value === null) return "00:00";
  const numValue = Number(value);
  if (isNaN(numValue) || numValue <= 0) return "00:00";
  const totalMinutes = Math.round(numValue * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hStr = String(hours).padStart(2, "0");
  const mStr = String(minutes).padStart(2, "0");
  return `${hStr}:${mStr}`;
}

export function formatDisplayTime(value) {
  const parsed = parseTimeValue(value);
  return parsed ? parsed.format("hh:mm A") : "-";
}

export function formatDisplayDate(value) {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD-MM-YYYY") : value;
}

export function calculateMeanTime(currentRecord, allRecords) {
  if (!currentRecord || !currentRecord.affected_equipment) {
    return "0";
  }
  const currentMachine = currentRecord.machine;
  const currentMachineName = currentRecord.machine_name;
  const currentEquipment = currentRecord.affected_equipment
    .trim()
    .toLowerCase();
  if (!currentEquipment) {
    return "0";
  }
  const matchingRecords = allRecords.filter((rec) => {
    if (!rec.affected_equipment) return false;
    const machineMatch =
      (currentMachine && rec.machine && currentMachine === rec.machine) ||
      (currentMachineName &&
        rec.machine_name &&
        currentMachineName.trim().toLowerCase() ===
          rec.machine_name.trim().toLowerCase());
    if (!machineMatch) return false;
    const equipmentMatch =
      rec.affected_equipment.trim().toLowerCase() === currentEquipment;
    return equipmentMatch;
  });
  if (matchingRecords.length <= 1) {
    return "0";
  }
  const parsedEntries = matchingRecords
    .map((rec) => {
      const dateStr = rec.breakdown_date;
      const timeStr = rec.breakdown_time;
      if (!dateStr) return null;
      let dt = dayjs(dateStr);
      if (timeStr) {
        const parsedTime = parseTimeValue(timeStr);
        if (parsedTime) {
          dt = dt
            .hour(parsedTime.hour())
            .minute(parsedTime.minute())
            .second(0)
            .millisecond(0);
        }
      }
      return { id: rec.id, dt };
    })
    .filter((entry) => entry !== null && entry.dt.isValid());
  if (parsedEntries.length <= 1) {
    return "0";
  }
  parsedEntries.sort((a, b) => a.dt.valueOf() - b.dt.valueOf());
  const currentIndex = parsedEntries.findIndex(
    (entry) => entry.id === currentRecord.id,
  );
  if (currentIndex <= 0) {
    return "0";
  }
  const diffMinutes = parsedEntries[currentIndex].dt.diff(
    parsedEntries[currentIndex - 1].dt,
    "minute",
  );
  if (diffMinutes <= 0) {
    return "0";
  }
  const days = Math.floor(diffMinutes / 1440);
  const hours = Math.floor((diffMinutes % 1440) / 60);
  const minutes = Math.round(diffMinutes % 60);
  const parts = [];
  if (days > 0) {
    const daysLabel = days === 1 ? "day" : "days";
    parts.push(`${days} ${daysLabel}`);
  }
  if (hours > 0) {
    const hoursLabel = hours === 1 ? "hr" : "hrs";
    parts.push(`${hours} ${hoursLabel}`);
  }
  if (minutes > 0) {
    const minutesLabel = minutes === 1 ? "min" : "mins";
    parts.push(`${minutes} ${minutesLabel}`);
  }
  if (parts.length === 0) {
    return "0";
  }
  return parts.join(", ");
}

export function buildBreakdownPayload(values, username, actionType) {
  const supervisor =
    values.supervisor === "Other"
      ? values.custom_supervisor_name?.trim()
      : values.supervisor;
  const breakdownType =
    values.breakdown_type === "Other"
      ? values.custom_breakdown_type?.trim()
      : values.breakdown_type;
  const affectedEquipment =
    values.affected_equipment === "Other"
      ? values.custom_affected_equipment?.trim()
      : values.affected_equipment;

  const maintenanceStartTime = formatTimeValue(values.maintenance_start_time);
  const maintenanceCompleteTime = formatTimeValue(values.maintenance_complete_time);
  const restartTime = formatTimeValue(values.restart_time);
  const isClosed = Boolean(restartTime || maintenanceCompleteTime);

  const breakdownDate = values.breakdown_date
    ? (dayjs.isDayjs(values.breakdown_date)
        ? values.breakdown_date.format("YYYY-MM-DD")
        : values.breakdown_date)
    : undefined;

  let breakdownCompleteDate = values.breakdown_complete_date
    ? (dayjs.isDayjs(values.breakdown_complete_date)
        ? values.breakdown_complete_date.format("YYYY-MM-DD")
        : values.breakdown_complete_date)
    : undefined;

  if (isClosed && !breakdownCompleteDate) {
    breakdownCompleteDate = breakdownDate || dayjs().format("YYYY-MM-DD");
  }

  return {
    record_number: values.record_number || undefined,
    breakdown_date: breakdownDate,
    shift: values.shift,
    machine: values.machine || null,
    affected_equipment: affectedEquipment,
    operator_name: values.operator_name,
    supervisor,
    breakdown_time: formatTimeValue(values.breakdown_time),
    breakdown_type: breakdownType,
    remarks: values.remarks ? values.remarks.trim().toUpperCase() : "",
    maintenance_start_time: maintenanceStartTime,
    maintenance_complete_time: maintenanceCompleteTime,
    restart_time: restartTime,
    breakdown_complete_date: breakdownCompleteDate,
    total_downtime_hours: values.total_downtime_hours ?? 0,
    status: isClosed ? "CLOSED" : "OPEN",
    created_by: username,
    action_type: actionType,
  };
}

export function buildMaintenanceOnlyPayload(values, editItem, username, actionType = "UPDATED") {
  const breakdownType =
    values.breakdown_type === "Other"
      ? values.custom_breakdown_type?.trim()
      : values.breakdown_type;

  const maintenanceStartTime = formatTimeValue(values.maintenance_start_time);
  const maintenanceCompleteTime = formatTimeValue(values.maintenance_complete_time);
  const restartTime = formatTimeValue(values.restart_time);

  let breakdownCompleteDate = values.breakdown_complete_date
    ? (dayjs.isDayjs(values.breakdown_complete_date)
        ? values.breakdown_complete_date.format("YYYY-MM-DD")
        : values.breakdown_complete_date)
    : (editItem?.breakdown_complete_date || editItem?.breakdown_date || dayjs().format("YYYY-MM-DD"));

  const remarks =
    values.remarks !== undefined && values.remarks !== null
      ? values.remarks.trim().toUpperCase()
      : (editItem?.remarks || "").trim().toUpperCase();

  return {
    record_number: editItem.record_number,
    breakdown_date: editItem.breakdown_date,
    shift: editItem.shift,
    machine: editItem.machine,
    affected_equipment: editItem.affected_equipment,
    operator_name: editItem.operator_name,
    supervisor: editItem.supervisor,
    breakdown_time: editItem.breakdown_time,
    breakdown_type: breakdownType,
    remarks,
    maintenance_start_time: maintenanceStartTime,
    maintenance_complete_time: maintenanceCompleteTime,
    restart_time: restartTime,
    breakdown_complete_date: breakdownCompleteDate,
    total_downtime_hours: values.total_downtime_hours ?? 0,
    status: "CLOSED",
    created_by: username,
    action_type: actionType,
  };
}
