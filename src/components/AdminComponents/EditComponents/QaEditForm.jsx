import React, { useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  Select,
  Button,
  Table,
  Row,
  Col,
  DatePicker,
  TimePicker,
  message,
  Typography,
  Divider,
  Modal,
  Popconfirm,
  Space,
} from "antd";
import { Plus, Edit, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(customParseFormat);
import { useUpdateQaDetailsMutation } from "@/store/services/qa.api";
import {
  useGetMachinesQuery,
  useGetOperatorsQuery,
} from "@/store/services/admin.api";

import PageHeader from "@/components/ReusableComponents/PageHeader";
import GlobalButton from "@/components/ReusableComponents/Button";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import StyledFormItem, {
  INPUT_CLASS,
  DATE_PICKER_CLASS,
} from "@/components/ReusableComponents/FormItem";

const { Title, Text } = Typography;
const QaEditForm = ({ onBack, initialMaterials }) => {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [confirmValues, setConfirmValues] = useState(null);
  const [modalForm] = Form.useForm();
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const materials = useMemo(() => {
    if (initialMaterials) return initialMaterials;
    return [];
  }, [initialMaterials]);
  const filteredMaterials = useMemo(() => {
    return materials.filter(
      (mat) =>
        mat.programer_status === "completed" && mat.qa_status === "completed",
    );
  }, [materials]);
  // Auto-select if there's only one material available
  useEffect(() => {
    if (filteredMaterials.length === 1 && !selectedMaterialId) {
      setSelectedMaterialId(filteredMaterials[0].id ?? null);
    }
  }, [filteredMaterials, selectedMaterialId]);
  const { data: rawMachines = [] } = useGetMachinesQuery(undefined);
  const machines = useMemo(() => {
    const seen = new Set();
    return rawMachines.filter((m) => {
      const name = String(m.machine_name || "")
        .trim()
        .toLowerCase();
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [rawMachines]);
  const { data: operators = [] } = useGetOperatorsQuery(undefined);
  const [updateQaDetails, { isLoading: isUpdating }] =
    useUpdateQaDetailsMutation();
  // 2. Extract nested QA data for the selected material
  const currentQaData = useMemo(() => {
    if (!selectedMaterialId || !initialMaterials) return null;
    const mat = initialMaterials.find((item) => item.id === selectedMaterialId);
    return mat?.qa_details?.[0] || null;
  }, [initialMaterials, selectedMaterialId]);
  // Set form values when data is loaded
  useEffect(() => {
    if (currentQaData) {
      form.setFieldsValue({
        ...currentQaData,
        processed_date: currentQaData.processed_date
          ? dayjs(currentQaData.processed_date)
          : null,
        machines_used: currentQaData.machine_logs || [],
      });
    } else if (selectedMaterialId) {
      // Wait for React to finish rendering the conditional <Form> component
      requestAnimationFrame(() => {
        form.resetFields();
      });
    }
  }, [currentQaData, form, selectedMaterialId]);
  const handleUpdate = async (values) => {
    if (!selectedMaterialId) return;
    try {
      const payload = {
        material_id: selectedMaterialId,
        ...values,
        processed_date: values.processed_date
          ? dayjs(values.processed_date).format("YYYY-MM-DD")
          : null,
        machines_used: values.machines_used?.map((log) => ({
          ...log,
          start_time: log.start_time,
          end_time: log.end_time,
          runtime: log.runtime,
        })),
      };
      await updateQaDetails({ body: payload }).unwrap();
      message.success("QA details updated successfully");
    } catch (err) {
      console.error("Update failed:", err);
      message.error("Failed to update QA details");
    }
  };
  const showModal = (index = null) => {
    setEditingIndex(index);
    if (index !== null) {
      const machines_used = form.getFieldValue("machines_used");
      const record = machines_used[index];
      modalForm.setFieldsValue({
        ...record,
        date: record.date ? dayjs(record.date) : null,
        start: record.start_time
          ? dayjs(record.start_time, ["HH:mm:ss", "HH:mm"])
          : null,
        end: record.end_time
          ? dayjs(record.end_time, ["HH:mm:ss", "HH:mm"])
          : null,
        runtime: record.runtime
          ? dayjs(record.runtime, ["HH:mm:ss", "HH:mm"])
          : null,
        machine: record.machine_name,
        operator: record.operator_name,
      });
    } else {
      modalForm.resetFields();
    }
    setIsModalVisible(true);
  };
  const handleModalOk = () => {
    modalForm.validateFields().then((values) => {
      const formattedValues = {
        ...values,
        date: values.date ? dayjs(values.date).format("YYYY-MM-DD") : null,
        start_time: values.start
          ? dayjs(values.start).format("HH:mm:ss")
          : null,
        end_time: values.end ? dayjs(values.end).format("HH:mm:ss") : null,
        runtime: values.runtime
          ? dayjs(values.runtime).format("HH:mm:ss")
          : null,
        machine_name: values.machine,
        operator_name: values.operator,
      };
      const machines_used = form.getFieldValue("machines_used") || [];
      const newMachinesUsed = [...machines_used];
      if (editingIndex !== null) {
        newMachinesUsed[editingIndex] = formattedValues;
      } else {
        newMachinesUsed.push(formattedValues);
      }
      form.setFieldsValue({ machines_used: newMachinesUsed });
      setIsModalVisible(false);
    });
  };
  const deleteMachineLog = (index) => {
    const machines_used = form.getFieldValue("machines_used") || [];
    if (machines_used.length <= 1) {
      message.error("At least one machine log is required.");
      return;
    }
    form.setFieldsValue({
      machines_used: machines_used.filter((_, i) => i !== index),
    });
  };
  const machineColumns = [
    { title: "Machine", dataIndex: "machine_name", key: "machine_name" },
    { title: "Date", dataIndex: "date", key: "date" },
    {
      title: "Start",
      dataIndex: "start_time",
      key: "start_time",
      render: (val) =>
        val ? dayjs(val, ["HH:mm:ss", "HH:mm"]).format("hh:mm A") : "-",
    },
    {
      title: "End",
      dataIndex: "end_time",
      key: "end_time",
      render: (val) =>
        val ? dayjs(val, ["HH:mm:ss", "HH:mm"]).format("hh:mm A") : "-",
    },
    {
      title: "Runtime",
      dataIndex: "runtime",
      key: "runtime",
      render: (val) =>
        val ? dayjs(val, ["HH:mm:ss", "HH:mm"]).format("HH:mm") : "-",
    },
    { title: "Operator", dataIndex: "operator_name", key: "operator_name" },
    {
      title: "Air",
      dataIndex: "gas_type",
      key: "gas_type",
      render: (val) => val || "N/A",
    },
    {
      title: "Action",
      key: "action",
      render: (_, __, index) => (
        <Space>
          <Button
            icon={<Edit size={16} />}
            onClick={() => showModal(index)}
            size="small"
          />
          <Popconfirm
            title="Delete log?"
            onConfirm={() => deleteMachineLog(index)}
          >
            <Button icon={<Trash2 size={16} />} danger size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];
  return (
    <div className="bg-white">
      <div>
        <div className="pb-2">
          <PageHeader
            title="QA Update"
            actions={
              <div className="flex gap-2">
                <GlobalButton
                  type="button"
                  color="cancel"
                  onClick={onBack}
                  icon="lucide:arrow-left"
                >
                  Back
                </GlobalButton>
                {selectedMaterialId !== null ? (
                  <GlobalButton
                    type="button"
                    color="blue"
                    disabled={isUpdating}
                    onClick={() => {
                      const machines_used =
                        form.getFieldValue("machines_used") || [];
                      if (machines_used.length === 0) {
                        message.error(
                          "At least one machine log is required before updating.",
                        );
                        return;
                      }
                      form.submit();
                    }}
                    icon="lucide:save"
                  >
                    Update QA
                  </GlobalButton>
                ) : null}
              </div>
            }
          />
        </div>

        <div className=" bg-gray-50 rounded-lg border border-gray-200 shadow-sm p-3 mb-2">
          <Text strong className="block mb-2 text-gray-700">
            Select Material to Review QA
          </Text>
          <Select
            placeholder="Choose a material"
            style={{ width: "100%" }}
            value={selectedMaterialId}
            onChange={(val) => setSelectedMaterialId(val)}
          >
            {filteredMaterials.map((mat) => (
              <Select.Option key={mat.id} value={mat.id} className="!text-xs">
                {`MT-${mat.mat_type} / G-${mat.mat_grade} / T-${mat.thick} / W-${mat.width} / L-${mat.length} / Qty-${mat.quantity}`}
              </Select.Option>
            ))}
          </Select>
        </div>


        {!selectedMaterialId ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <Text type="secondary">
              Select a material to view and edit QA details
            </Text>
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              const machines_used = form.getFieldValue("machines_used") || [];
              if (machines_used.length === 0) {
                message.error(
                  "At least one machine log is required before updating.",
                );
                return;
              }
              setConfirmValues(values);
            }}
            className="bg-white space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <StyledFormItem label="Processed Date" name="processed_date" className="mb-0">
                <DatePicker className={DATE_PICKER_CLASS} size="small" />
              </StyledFormItem>
              <StyledFormItem label="Shift" name="shift" className="mb-0">
                <Input className={INPUT_CLASS} placeholder="e.g. Day / Night" size="small" />
              </StyledFormItem>
            </div>

            <div className="flex justify-between items-center ">
              <Text strong className="text-xs text-gray-700">
                Machines Used Logs
              </Text>
              <GlobalButton
                type="button"
                color="blue"
                size="xs"
                onClick={() => showModal()}
                icon="lucide:plus"
              >
                Add Machine Log
              </GlobalButton>
            </div>

            <StyledFormItem
              name="machines_used"
              valuePropName="dataSource"
              className="mb-0"
            >
              <Table
                columns={machineColumns.map((col) => ({
                  ...col,
                  className: "!py-1 !px-2 text-xs",
                }))}
                pagination={false}
                bordered
                size="small"
                rowKey={(_, index) => index?.toString() || "0"}
              />
            </StyledFormItem>
          </Form>
        )}

        <GlobalModal
          open={isModalVisible}
          title={
            editingIndex !== null
              ? "Edit Machine Log Entry"
              : "Add New Machine Log Entry"
          }
          onCancel={() => setIsModalVisible(false)}
          onConfirm={handleModalOk}
          confirmText={editingIndex !== null ? "Save Log" : "Add Log"}
          cancelText="Cancel"
          width={900}
        >
          <Form
            form={modalForm}
            layout="vertical"
            className="mt-2"
            onValuesChange={(changedValues, allValues) => {
              // Auto-calculate runtime
              if (changedValues.start || changedValues.end) {
                const startTime = allValues.start;
                const endTime = allValues.end;
                if (startTime && endTime) {
                  const diffMs = endTime.diff(startTime);
                  if (diffMs >= 0) {
                    const totalMinutes = Math.floor(diffMs / 60000);
                    const hours = Math.floor(totalMinutes / 60);
                    const mins = totalMinutes % 60;
                    // Create a dayjs object representing the duration (starting from midnight)
                    const durationTime = dayjs()
                      .startOf("day")
                      .add(hours, "hour")
                      .add(mins, "minute");
                    modalForm.setFieldValue("runtime", durationTime);
                  }
                }
              }
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="col-span-1">
                <StyledFormItem
                  label="Machine"
                  name="machine"
                  rules={[
                    { required: true, message: "Please select a machine" },
                  ]}
                >
                  <Select
                    placeholder="Select machine"
                    onChange={(val) => {
                      const selectedMachine = machines.find(
                        (m) => m.machine_name === val,
                      );
                      if (selectedMachine && !selectedMachine.does_need_gas) {
                        modalForm.setFieldValue("gas_type", "None");
                      } else {
                        modalForm.setFieldValue("gas_type", "");
                      }
                    }}
                  >
                    {machines.map((m) => (
                      <Select.Option key={m.id} value={m.machine_name}>
                        {m.machine_name}
                      </Select.Option>
                    ))}
                  </Select>
                </StyledFormItem>
              </div>
              <div className="col-span-1">
                <StyledFormItem
                  label="Operator"
                  name="operator"
                  rules={[
                    { required: true, message: "Please select an operator" },
                  ]}
                >
                  <Select placeholder="Select operator">
                    {operators.map((op) => (
                      <Select.Option key={op.id} value={op.operator_name}>
                        {op.operator_name}
                      </Select.Option>
                    ))}
                  </Select>
                </StyledFormItem>
              </div>
              <div className="col-span-1">
                <StyledFormItem
                  label="Work Date"
                  name="date"
                  rules={[{ required: true, message: "Date is required" }]}
                >
                  <DatePicker className={DATE_PICKER_CLASS} />
                </StyledFormItem>
              </div>
              <div className="col-span-1">
                <StyledFormItem label="Start Time" name="start">
                  <TimePicker
                    className={DATE_PICKER_CLASS}
                    format="hh:mm A"
                    use12Hours
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val)
                        modalForm.setFieldValue("start", dayjs(val, "hh:mm A"));
                    }}
                  />
                </StyledFormItem>
              </div>
              <div className="col-span-1">
                <StyledFormItem label="End Time" name="end">
                  <TimePicker
                    className={DATE_PICKER_CLASS}
                    format="hh:mm A"
                    use12Hours
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val)
                        modalForm.setFieldValue("end", dayjs(val, "hh:mm A"));
                    }}
                  />
                </StyledFormItem>
              </div>
              <div className="col-span-1">
                <StyledFormItem
                  label="Total Runtime"
                  name="runtime"
                  rules={[{ required: true, message: "Runtime is required" }]}
                >
                  <TimePicker
                    className={DATE_PICKER_CLASS}
                    format="HH:mm"
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val)
                        modalForm.setFieldValue("runtime", dayjs(val, "HH:mm"));
                    }}
                  />
                </StyledFormItem>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <Form.Item
                  noStyle
                  shouldUpdate={(prev, curr) => prev.machine !== curr.machine}
                >
                  {() => {
                    const machineName = modalForm.getFieldValue("machine");
                    const machine = machines.find(
                      (m) => m.machine_name === machineName,
                    );
                    const needsGas = machine ? machine.does_need_gas : true;
                    if (!needsGas) return null;
                    return (
                      <StyledFormItem
                        label="Air Pressure"
                        name="gas_type"
                        rules={[
                          { required: true, message: "Gas type is required" },
                        ]}
                      >
                        <Select placeholder="Select gas type">
                          <Select.Option value="Air">Air</Select.Option>
                          <Select.Option value="Nitrogen">
                            Nitrogen
                          </Select.Option>
                          <Select.Option value="Oxygen">Oxygen</Select.Option>
                        </Select>
                      </StyledFormItem>
                    );
                  }}
                </Form.Item>
              </div>
            </div>
          </Form>
        </GlobalModal>

        <GlobalModal
          open={!!confirmValues}
          title="Confirm QA Update"
          description="Are you sure you want to permanently update the QA details for this material?"
          onCancel={() => setConfirmValues(null)}
          onConfirm={() => {
            handleUpdate(confirmValues);
            setConfirmValues(null);
          }}
          confirmText="Update QA"
          cancelText="Cancel"
        />
      </div>
    </div>
  );
};
export default QaEditForm;
