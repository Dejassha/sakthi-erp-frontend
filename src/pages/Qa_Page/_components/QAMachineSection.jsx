import React from "react";
import dayjs from "dayjs";
import { Table, DatePicker, TimePicker, Select, Checkbox } from "antd";
import { SELECT_CLASS, DATE_PICKER_CLASS } from "@/components/ReusableComponents/FormItem";

/**
 * QAMachineSection Component
 * Renders machine selection checkboxes and the detailed machine log entry table.
 */
const QAMachineSection = ({
  machines = [],
  machineTimes = [],
  operators = [],
  gasOptions = [],
  formErrors = {},
  toggleMachine,
  updateMachineField,
}) => {
  const columns = [
    {
      title: "MACHINE",
      dataIndex: "machine_name",
      key: "machine_name",
      align: "center",
      width: 120,
      render: (text) => (
        <span className="text-[10px] font-medium text-gray-800 uppercase tracking-wide whitespace-nowrap">
          {text}
        </span>
      ),
    },
    {
      title: "DATE",
      dataIndex: "date",
      key: "date",
      align: "center",
      width: 140,
      render: (_, record) => (
        <DatePicker
          className={DATE_PICKER_CLASS}
          placeholder="DD-MM-YYYY"
          allowClear={false}
          format="DD-MM-YYYY"
          value={record.date ? dayjs(record.date) : null}
          onChange={(date) =>
            updateMachineField(
              record.machine_name,
              "date",
              date?.format("YYYY-MM-DD") || "",
            )
          }
        />
      ),
    },
    {
      title: "START TIME",
      dataIndex: "start",
      key: "start",
      align: "center",
      width: 130,
      render: (_, record) => (
        <TimePicker
          use12Hours
          format="h:mm a"
          className={DATE_PICKER_CLASS}
          placeholder="hh:mm aa"
          allowClear={true}
          value={record.start ? dayjs(record.start, "HH:mm") : null}
          onChange={(v) =>
            updateMachineField(
              record.machine_name,
              "start",
              v?.format("HH:mm") || "",
            )
          }
        />
      ),
    },
    {
      title: "END TIME",
      dataIndex: "end",
      key: "end",
      align: "center",
      width: 130,
      render: (_, record) => (
        <TimePicker
          use12Hours
          format="h:mm a"
          className={DATE_PICKER_CLASS}
          placeholder="hh:mm aa"
          allowClear={true}
          value={record.end ? dayjs(record.end, "HH:mm") : null}
          onChange={(v) =>
            updateMachineField(
              record.machine_name,
              "end",
              v?.format("HH:mm") || "",
            )
          }
        />
      ),
    },
    {
      title: "RUNTIME (HH:MM)",
      dataIndex: "runtime",
      key: "runtime",
      align: "center",
      width: 130,
      render: (_, record) => (
        <TimePicker
          format="HH:mm"
          className={DATE_PICKER_CLASS}
          allowClear={false}
          value={record.runtime ? dayjs(record.runtime, "HH:mm") : null}
          onChange={(v) =>
            updateMachineField(
              record.machine_name,
              "runtime",
              v?.format("HH:mm") || "",
            )
          }
        />
      ),
    },
    {
      title: "OPERATOR",
      dataIndex: "operator_name",
      key: "operator_name",
      align: "center",
      width: 160,
      render: (_, record) => (
        <Select
          placeholder="Select Operator"
          className={SELECT_CLASS}
          value={record.operator_name || undefined}
          onChange={(val) =>
            updateMachineField(record.machine_name, "operator_name", val)
          }
          options={operators.map((op) => ({
            label: op,
            value: op,
          }))}
        />
      ),
    },
    {
      title: "AIR / GAS",
      dataIndex: "gas_type",
      key: "gas_type",
      align: "center",
      width: 120,
      render: (_, record) => {
        const machineInfo = machines.find(
          (m) => m.machine_name === record.machine_name,
        );
        const requiresAir = machineInfo?.does_need_gas ?? false;
        return requiresAir ? (
          <Select
            className={SELECT_CLASS}
            placeholder="Air"
            value={record.gas_type || "Air"}
            onChange={(val) =>
              updateMachineField(record.machine_name, "gas_type", val)
            }
            options={gasOptions}
          />
        ) : (
          <span className="text-gray-400 italic text-[11px]">N/A</span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col">
      {/* MACHINE SELECTION HEADER & CHECKBOXES */}
      <div>
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2 mb-2">
          Machines Used{" "}
          {formErrors.machines && (
            <span className="text-red-500 text-[10px] font-medium lowercase">
              ({formErrors.machines})
            </span>
          )}
        </label>
        <div className="flex flex-wrap gap-2">
          {machines.map((m) => {
            const isChecked = machineTimes.some(
              (mt) => mt.machine_name === m.machine_name,
            );
            return (
              <div
                key={m.id}
                className={`inline-flex items-center justify-center px-1.5 py-1 rounded-sm border transition-all cursor-pointer select-none ${
                  isChecked
                    ? "bg-blue-50/70 border-blue-500 shadow-xs"
                    : "bg-white border-gray-200 hover:border-blue-400"
                }`}
              >
                <Checkbox
                  checked={isChecked}
                  onChange={(e) =>
                    toggleMachine(m.machine_name, e.target.checked)
                  }
                  className="!inline-flex !items-center"
                >
                  <span className="text-[10px] font-medium text-gray-600 uppercase leading-none inline-block">
                    {m.machine_name}
                  </span>
                </Checkbox>
              </div>
            );
          })}
        </div>
      </div>

      {/* MACHINE TIMINGS ANTD TABLE */}
      {machineTimes.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <Table
            columns={columns}
            dataSource={machineTimes}
            rowKey="machine_name"
            pagination={false}
            size="small"
            bordered
            className="w-full ant-compact-table"
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(QAMachineSection);
