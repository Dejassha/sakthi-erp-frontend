import { Pencil, Plus, Trash2 } from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
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
  Button,
  Modal,
  Input,
  Form,
  Space,
  Typography,
  Card,
  message,
  Tooltip,
  Popconfirm,
} from "antd";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
ModuleRegistry.registerModules([AllCommunityModule]);
import {
  useGetGasDetailsQuery,
  useAddGasDetailsMutation,
  useUpdateGasDetailsMutation,
  useDeleteGasDetailsMutation,
} from "@/store/services/admin.api";
const { Title } = Typography;
const AdminGasDetails = () => {
  const {
    data: gasList = [],
    isLoading: loading,
    isError,
    refetch,
  } = useGetGasDetailsQuery(undefined);
  const [addGas, { isLoading: adding }] = useAddGasDetailsMutation();
  const [updateGas, { isLoading: updating }] = useUpdateGasDetailsMutation();
  const [deleteGas, { isLoading: deleting }] = useDeleteGasDetailsMutation();
  // Stable Sl.No mapping
  const memoizedGas = useMemo(() => {
    return gasList.map((g, idx) => ({
      ...g,
      sno: idx + 1,
    }));
  }, [gasList]);
  // Forms
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  // Modals Visibility
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  // Reference for current item being edited
  const [editItem, setEditItem] = useState(null);
  const { user } = useAuth();
  const username = user?.username || "";
  // React to error in query
  useEffect(() => {
    if (isError) {
      message.error(
        "Failed to load gas details. Please check your backend connection.",
      );
    }
  }, [isError]);
  // Add new gas
  const handleAddGas = async () => {
    try {
      const values = await addForm.validateFields();
      await addGas({
        name: values.name.trim(),
        created_by: username,
      }).unwrap();
      refetch();
      message.success("Gas Type Added");
      addForm.resetFields();
      setIsModalOpen(false);
    } catch (err) {
      if (err.errorFields) return;
      message.error(
        err.data?.message || err.data?.error || "Error adding gas type.",
      );
    }
  };
  // Open Edit Modal
  const openEditModal = React.useCallback(
    (item) => {
      setEditItem(item);
      editForm.setFieldsValue({
        name: item.name,
      });
      setEditModalOpen(true);
    },
    [editForm],
  );
  // Save updated gas
  const handleUpdateGas = async () => {
    if (!editItem?.id) return;
    try {
      const values = await editForm.validateFields();
      await updateGas({
        pk: editItem.id,
        name: values.name.trim(),
        created_by: username,
      }).unwrap();
      refetch();
      message.success("Gas Type Updated");
      editForm.resetFields();
      setEditModalOpen(false);
    } catch (err) {
      if (err.errorFields) return;
      message.error(
        err.data?.message || err.data?.error || "Error updating gas type",
      );
    }
  };
  // Delete gas
  const handleDeleteGas = React.useCallback(
    async (id) => {
      try {
        await deleteGas(id).unwrap();
        refetch();
        message.success("Gas Type Deleted");
      } catch (err) {
        message.error(err.data?.message || err.data?.error || "Delete failed.");
      }
    },
    [deleteGas, refetch],
  );
  // Table Columns
  const columnDefs = useMemo(
    () => [
      {
        headerName: "Sl.No",
        field: "sno",
        width: 60,
        filter: false,
      },
      {
        headerName: "Gas Name",
        field: "name",
        flex: 1,
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
              title="Delete gas type?"
              description={`Are you sure you want to delete ${params.data.name}?`}
              onConfirm={() => handleDeleteGas(params.data.id)}
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
    [handleDeleteGas, openEditModal],
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
    <div className=" max-w-8xl mx-auto">
      {/* Header Section */}
      <PageHeader
        title="Machine Gas Management"
        actions={
          <GlobalButton
            color="blue"
            icon="lucide:plus"
            onClick={() => setIsModalOpen(true)}
          >
            Add Gas Type
          </GlobalButton>
        }
      />

      {/* Table Section */}
      <ReusableTable
        persistKey="admin_gas_grid"
        columnDefs={columnDefs}
        rowData={memoizedGas}
        rowModelType="clientSide"
        loading={loading || deleting}
        loadingText="Loading gas types..."
        defaultColDef={defaultColDef}
        containerClassName="w-full h-[65vh] relative rounded-lg overflow-hidden shadow-xs border border-gray-200 bg-white"
        headerHeight={28}
        rowHeight={22}
        pageSize={20}
        pageSizeSelector={[20, 40, 60, 100]}
        emptyTitle="No Gas Types Found"
        emptyDescription="There are no gas types registered."
        getRowId={(params) => params.data?.id?.toString() || Math.random().toString()}
      />

      {/* ADD MODAL */}
      <GlobalModal
        open={isModalOpen}
        title="Add New Gas Type"
        onCancel={() => {
          setIsModalOpen(false);
          addForm.resetFields();
        }}
        onConfirm={handleAddGas}
        confirmText="Save Gas"
        cancelText="Cancel"
        loading={adding}
        width={500}
      >
        <Form
          form={addForm}
          layout="vertical"
          initialValues={{ name: "" }}
        >
          <StyledFormItem
            name="name"
            label="Gas Name"
            rules={[{ required: true, message: "Gas name required" }]}
            normalize={(value) => value.toUpperCase()}
          >
            <Input placeholder="e.g. NITROGEN" className={INPUT_CLASS} />
          </StyledFormItem>
        </Form>
      </GlobalModal>

      {/* EDIT MODAL */}
      <GlobalModal
        open={editModalOpen}
        title="Edit Gas Type"
        onCancel={() => setEditModalOpen(false)}
        onConfirm={handleUpdateGas}
        confirmText="Update"
        cancelText="Cancel"
        loading={updating}
        width={500}
      >
        <Form form={editForm} layout="vertical">
          <StyledFormItem
            name="name"
            label="Gas Name"
            rules={[{ required: true, message: "Gas name required" }]}
            normalize={(value) => value.toUpperCase()}
          >
            <Input placeholder="Gas name" className={INPUT_CLASS} />
          </StyledFormItem>
        </Form>
      </GlobalModal>
    </div>
  );
};
export default AdminGasDetails;
