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
  useGetOperatorsQuery,
  useAddOperatorMutation,
  useUpdateOperatorMutation,
  useDeleteOperatorMutation,
} from "@/store/services/admin.api";
const { Title } = Typography;
const AdminOperators = () => {
  const {
    data: operators = [],
    isLoading: loading,
    isError,
    refetch,
  } = useGetOperatorsQuery(undefined);
  const [addOperator, { isLoading: adding }] = useAddOperatorMutation();
  const [updateOperator, { isLoading: updating }] = useUpdateOperatorMutation();
  const [deleteOperator, { isLoading: deleting }] = useDeleteOperatorMutation();
  // Stable Sl.No mapping
  const memoizedOperators = useMemo(() => {
    return operators.map((op, idx) => ({
      ...op,
      sno: idx + 1,
    }));
  }, [operators]);
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
  // Regex patterns
  const nameRegex = /^[A-Za-z0-9 _-]+$/;
  // React to error in query
  useEffect(() => {
    if (isError) {
      message.error(
        "Failed to load operators. Please check your backend connection.",
      );
    }
  }, [isError]);
  // Add new operator
  const handleAddOperator = async () => {
    try {
      const values = await addForm.validateFields();
      await addOperator({
        operator_name: values.operator_name.trim(),
        created_by: username,
      }).unwrap();
      refetch();
      message.success("Operator Added");
      addForm.resetFields();
      setIsModalOpen(false);
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.data?.error || "Error adding operator.");
    }
  };
  // Open Edit Modal
  const openEditModal = React.useCallback(
    (item) => {
      setEditItem(item);
      editForm.setFieldsValue({
        operator_name: item.operator_name,
      });
      setEditModalOpen(true);
    },
    [editForm],
  );
  // Save updated operator
  const handleUpdateOperator = async () => {
    if (!editItem?.id) return;
    try {
      const values = await editForm.validateFields();
      await updateOperator({
        id: editItem.id,
        body: {
          operator_name: values.operator_name.trim(),
          created_by: username,
        },
      }).unwrap();
      refetch();
      message.success("Operator Updated");
      editForm.resetFields();
      setEditModalOpen(false);
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.data?.error || "Error updating operator");
    }
  };
  // Delete operator
  const handleDeleteOperator = React.useCallback(
    async (id) => {
      try {
        await deleteOperator(id).unwrap();
        refetch();
        message.success("Operator Deleted");
      } catch (err) {
        message.error(err.data?.error || "Delete failed.");
      }
    },
    [deleteOperator, refetch],
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
        headerName: "Operator Name",
        field: "operator_name",
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
              title="Delete operator?"
              description={`Are you sure you want to delete ${params.data.operator_name}?`}
              onConfirm={() => handleDeleteOperator(params.data.id)}
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
    [handleDeleteOperator, openEditModal],
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
        title="Machine Operator Management"
        actions={
          <GlobalButton
            color="blue"
            icon="lucide:plus"
            onClick={() => setIsModalOpen(true)}
          >
            Add Operator
          </GlobalButton>
        }
      />

      {/* Table Section */}
      <ReusableTable
        persistKey="admin_operators_grid"
        columnDefs={columnDefs}
        rowData={memoizedOperators}
        rowModelType="clientSide"
        loading={loading || deleting}
        loadingText="Loading operators..."
        defaultColDef={defaultColDef}
        containerClassName="w-full h-[65vh] relative rounded-lg overflow-hidden shadow-xs border border-gray-200 bg-white"
        headerHeight={28}
        rowHeight={22}
        pageSize={20}
        pageSizeSelector={[20, 40, 60, 100]}
        emptyTitle="No Operators Found"
        emptyDescription="There are no machine operators registered."
        getRowId={(params) => params.data?.id?.toString() || Math.random().toString()}
      />

      {/* ADD MODAL */}
      <GlobalModal
        open={isModalOpen}
        title="Add New Operator"
        onCancel={() => {
          setIsModalOpen(false);
          addForm.resetFields();
        }}
        onConfirm={handleAddOperator}
        confirmText="Save Operator"
        cancelText="Cancel"
        loading={adding}
        width={500}
      >
        <Form
          form={addForm}
          layout="vertical"
          className="pt-2"
          initialValues={{ operator_name: "" }}
        >
          <StyledFormItem
            name="operator_name"
            label="Operator Name"
            rules={[
              { required: true, message: "Operator name required" },
              {
                pattern: nameRegex,
                message:
                  "Only letters, numbers, spaces, hyphens, and underscores allowed.",
              },
            ]}
            normalize={(value) => value.toUpperCase()}
          >
            <Input placeholder="e.g. John Doe" className={INPUT_CLASS} />
          </StyledFormItem>
        </Form>
      </GlobalModal>

      {/* EDIT MODAL */}
      <GlobalModal
        open={editModalOpen}
        title="Edit Operator"
        onCancel={() => setEditModalOpen(false)}
        onConfirm={handleUpdateOperator}
        confirmText="Update"
        cancelText="Cancel"
        loading={updating}
        width={500}
      >
        <Form form={editForm} layout="vertical" className="pt-2">
          <StyledFormItem
            name="operator_name"
            label="Operator Name"
            rules={[
              { required: true, message: "Operator name required" },
              {
                pattern: nameRegex,
                message:
                  "Only letters, numbers, spaces, hyphens, and underscores allowed.",
              },
            ]}
            normalize={(value) => value.toUpperCase()}
          >
            <Input placeholder="Operator name" className={INPUT_CLASS} />
          </StyledFormItem>
        </Form>
      </GlobalModal>
    </div>
  );
};
export default AdminOperators;
