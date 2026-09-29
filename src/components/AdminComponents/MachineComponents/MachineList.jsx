import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Typography,
  Card,
  Modal,
  Form,
  Input,
  Checkbox,
  Button,
  Space,
  Tooltip,
  Popconfirm,
  message,
} from "antd";
import { Plus, Wrench, X, Pencil, Trash2 } from "lucide-react";
import ReusableTable from "@/components/ReusableComponents/ReusableTable";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import GlobalButton from "@/components/ReusableComponents/Button";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import {
  StyledFormItem,
  INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";
import { useAuth } from "@/context/useAuth";
import {
  useGetMachinesQuery,
  useAddMachineMutation,
  useUpdateMachineMutation,
  useDeleteMachineMutation,
} from "@/store/services/admin.api";
const { Title } = Typography;
const MachineList = () => {
  const { user } = useAuth();
  const username = user?.username || "";
  const {
    data: machines = [],
    isLoading: loading,
    isError,
    refetch,
  } = useGetMachinesQuery(undefined);
  // React to error in query
  useEffect(() => {
    if (isError) {
      message.error(
        "Failed to load machines. Please check your backend connection.",
      );
    }
  }, [isError]);
  // Stable Sl.No mapping with unique machine names
  // const memoizedMachines = useMemo(() => {
  //   return machines.map((m, idx) => ({
  //     ...m,
  //     sno: idx + 1,
  //   }));
  // }, [machines]);
  const memoizedMachines = useMemo(() => {
    return machines.map((m, idx) => ({
      ...m,
      sno: idx + 1,
    }));
  }, [machines]);
  const [addMachine, { isLoading: adding }] = useAddMachineMutation();
  const [updateMachine, { isLoading: updating }] = useUpdateMachineMutation();
  const [deleteMachine, { isLoading: deleting }] = useDeleteMachineMutation();
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  // Add new machine
  const handleAddMachine = async () => {
    try {
      const values = await addForm.validateFields();
      await addMachine({
        machine_name: values.machine_name.trim(),
        does_need_gas: !!values.does_need_gas,
        created_by: username,
      }).unwrap();
      refetch();
      message.success("Machine Added");
      addForm.resetFields();
      setIsModalOpen(false);
    } catch (err) {
      if (err.errorFields) return; // Form validation failed
      message.error(
        err.data?.message ||
          err.data?.error ||
          "Error adding machine. Check for duplicates.",
      );
    }
  };
  // Open Edit Modal
  const openEditModal = useCallback(
    (item) => {
      setEditItem(item);
      editForm.setFieldsValue({
        machine_name: item.machine_name,
        does_need_gas: !!item.does_need_gas,
      });
      setEditModalOpen(true);
    },
    [editForm],
  );
  // Save updated machine
  const handleUpdateMachine = async () => {
    if (!editItem?.id) return;
    try {
      const values = await editForm.validateFields();
      await updateMachine({
        id: editItem.id,
        body: {
          machine_name: values.machine_name.trim(),
          does_need_gas: !!values.does_need_gas,
          created_by: username,
        },
      }).unwrap();
      refetch();
      message.success("Machine Updated");
      editForm.resetFields();
      setEditModalOpen(false);
    } catch (err) {
      if (err.errorFields) return; // Validation failed
      message.error(
        err.data?.message || err.data?.error || "Error updating machine",
      );
    }
  };
  // Delete machine
  const handleDeleteMachine = useCallback(
    async (id) => {
      try {
        await deleteMachine(id).unwrap();
        refetch();
        message.success("Machine Deleted");
      } catch (err) {
        message.error(err.data?.message || err.data?.error || "Delete failed.");
      }
    },
    [deleteMachine, refetch],
  );
  // Table Columns
  const columnDefs = useMemo(
    () => [
      {
        headerName: "Sl.No",
        field: "sno",
        width: 100,
        filter: false,
      },
      {
        headerName: "Machine Name",
        field: "machine_name",
        flex: 1,
      },
      {
        headerName: "Does Need Gas?",
        field: "does_need_gas",
        flex: 1,
        cellRenderer: (params) => (
          <span
            className={
              params.value ? "text-green-600 font-medium" : "text-gray-400"
            }
          >
            {params.value ? "Yes" : "No"}
          </span>
        ),
      },
      {
        headerName: "Action",
        width: 70,
        minWidth: 70,
        pinned: "right",
        sortable: false,
        filter: false,
        cellClass: "!flex !justify-center !items-center",
        cellStyle: { display: "flex", justifyContent: "center", alignItems: "center" },
        cellRenderer: (params) => (
          <div className="flex items-center justify-center gap-1.5 h-full w-full">
            <Tooltip title="Edit">
              <Pencil
                onClick={() => openEditModal(params.data)}
                className="w-3 h-3 text-amber-600 hover:scale-110 cursor-pointer transition-all duration-150"
              />
            </Tooltip>
            <Popconfirm
              title="Delete machine?"
              description={`Are you sure you want to delete ${params.data.machine_name}?`}
              onConfirm={() => handleDeleteMachine(params.data.id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Delete">
                <Trash2
                  className="w-3 h-3 text-rose-600 hover:scale-110 cursor-pointer transition-all duration-150"
                />
              </Tooltip>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [handleDeleteMachine, openEditModal],
  );
  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      headerClass: "ag-center-header",
      cellClass: "ag-center-cell",
      suppressMovable: true,
    }),
    [],
  );
  return (
    <>
      {/* Header Section */}
      <PageHeader
        title="Machine Management"
        actions={
          <GlobalButton
            color="blue"
            icon="lucide:plus"
            onClick={() => setIsModalOpen(true)}
          >
            Add Machine
          </GlobalButton>
        }
      />

      {/* Table Section */}
      <ReusableTable
        persistKey="admin_machines_grid"
        columnDefs={columnDefs}
        rowData={memoizedMachines}
        rowModelType="clientSide"
        loading={loading || deleting}
        loadingText="Loading machines..."
        defaultColDef={defaultColDef}
        containerClassName="w-full h-[65vh] relative rounded-lg overflow-hidden shadow-xs border border-gray-200 bg-white"
        headerHeight={28}
        rowHeight={20}
        pageSize={20}
        pageSizeSelector={[20, 40, 60, 100]}
        emptyTitle="No Machines Found"
        emptyDescription="There are no machines registered."
        getRowId={(params) => params.data?.id?.toString() || Math.random().toString()}
      />

      {/* ADD MODAL */}
      <GlobalModal
        open={isModalOpen}
        title="Add New Machine"
        onCancel={() => {
          setIsModalOpen(false);
          addForm.resetFields();
        }}
        onConfirm={handleAddMachine}
        confirmText="Save Machine"
        cancelText="Cancel"
        loading={adding}
        width={500}
      >
        <Form
          form={addForm}
          layout="vertical"
          className="pt-2"
          initialValues={{ machine_name: "", does_need_gas: false }}
        >
          <StyledFormItem
            name="machine_name"
            label="Machine Name"
            rules={[{ required: true, message: "Machine name required" }]}
            normalize={(value) => value.toUpperCase()}
          >
            <Input placeholder="e.g. Laser Cutter 1" className={INPUT_CLASS} />
          </StyledFormItem>

          <StyledFormItem name="does_need_gas" valuePropName="checked">
            <Checkbox>
              <Typography.Text strong>
                Does this machine require GAS?
              </Typography.Text>
            </Checkbox>
          </StyledFormItem>
        </Form>
      </GlobalModal>

      {/* EDIT MODAL */}
      <GlobalModal
        open={editModalOpen}
        title="Edit Machine"
        onCancel={() => setEditModalOpen(false)}
        onConfirm={handleUpdateMachine}
        confirmText="Update"
        cancelText="Cancel"
        loading={updating}
        width={500}
      >
        <Form form={editForm} layout="vertical" className="pt-2">
          <StyledFormItem
            name="machine_name"
            label="Machine Name"
            rules={[{ required: true, message: "Machine name required" }]}
            normalize={(value) => value.toUpperCase()}
          >
            <Input placeholder="Machine name" className={INPUT_CLASS} />
          </StyledFormItem>

          <StyledFormItem name="does_need_gas" valuePropName="checked">
            <Checkbox>
              <Typography.Text strong>
                Does this machine require GAS?
              </Typography.Text>
            </Checkbox>
          </StyledFormItem>
        </Form>
      </GlobalModal>
    </>
  );
};
export default MachineList;
