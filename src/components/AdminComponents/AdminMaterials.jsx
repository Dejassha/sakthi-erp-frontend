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
  useGetMaterialTypesQuery,
  useAddMaterialTypeMutation,
  useUpdateMaterialTypeMutation,
  useDeleteMaterialTypeMutation,
} from "@/store/services/admin.api";
const { Title } = Typography;
const AdminMaterials = () => {
  const {
    data: materials = [],
    isLoading: loading,
    isError,
    refetch,
  } = useGetMaterialTypesQuery(undefined);
  const [addMaterial, { isLoading: adding }] = useAddMaterialTypeMutation();
  const [updateMaterial, { isLoading: updating }] =
    useUpdateMaterialTypeMutation();
  const [deleteMaterial, { isLoading: deleting }] =
    useDeleteMaterialTypeMutation();
  // Stable Sl.No mapping
  const memoizedMaterials = useMemo(() => {
    return materials.map((m, idx) => ({
      ...m,
      sno: idx + 1,
    }));
  }, [materials]);
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
  // Regex patterns (used inside form rules)
  const materialNameRegex = /^[A-Za-z0-9 _-]+$/;
  const densityRegex = /^(\d+(\.\d*)?|\.\d+)?$/;
  // React to error in query
  useEffect(() => {
    if (isError) {
      message.error(
        "Failed to load materials. Please check your backend connection.",
      );
    }
  }, [isError]);
  // Add new material
  const handleAddMaterial = async () => {
    try {
      const values = await addForm.validateFields();
      await addMaterial({
        material_name: values.material_name.trim(),
        density_value: parseFloat(values.density_value),
        created_by: username,
      }).unwrap();
      refetch();
      message.success("Material Added");
      addForm.resetFields();
      setIsModalOpen(false);
    } catch (err) {
      if (err.errorFields) return; // Form validation failed
      message.error(
        err.data?.error || "Error adding material. Check for duplicates.",
      );
    }
  };
  // Open Edit Modal
  const openEditModal = React.useCallback(
    (item) => {
      setEditItem(item);
      editForm.setFieldsValue({
        material_name: item.material_name,
        density_value: item.density_value.toString(),
      });
      setEditModalOpen(true);
    },
    [editForm],
  );
  // Save updated material
  const handleUpdateMaterial = async () => {
    if (!editItem?.id) return;
    try {
      const values = await editForm.validateFields();
      await updateMaterial({
        id: editItem.id,
        body: {
          material_name: values.material_name.trim(),
          density_value: parseFloat(values.density_value),
          created_by: username,
        },
      }).unwrap();
      refetch();
      message.success("Material Updated");
      editForm.resetFields();
      setEditModalOpen(false);
    } catch (err) {
      if (err.errorFields) return; // Validation failed
      message.error(err.data?.error || "Error updating material");
    }
  };
  // Delete material
  const handleDeleteMaterial = React.useCallback(
    async (id) => {
      try {
        await deleteMaterial(id).unwrap();
        refetch();
        message.success("Material Deleted");
      } catch (err) {
        message.error(err.data?.error || "Delete failed.");
      }
    },
    [deleteMaterial, refetch],
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
        headerName: "Material Name",
        field: "material_name",
        flex: 1,
      },
      {
        headerName: "Density (Value)",
        field: "density_value",
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
              title="Delete material?"
              description={`Are you sure you want to delete ${params.data.material_name}?`}
              onConfirm={() => handleDeleteMaterial(params.data.id)}
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
    [handleDeleteMaterial, openEditModal],
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
        title="Material Type Management"
        actions={
          <GlobalButton
            color="blue"
            icon="lucide:plus"
            onClick={() => setIsModalOpen(true)}
          >
            Add Material
          </GlobalButton>
        }
      />

      {/* Table Section */}
      <ReusableTable
        persistKey="admin_materials_grid"
        columnDefs={columnDefs}
        rowData={memoizedMaterials}
        rowModelType="clientSide"
        loading={loading || deleting}
        loadingText="Loading materials..."
        defaultColDef={defaultColDef}
        containerClassName="w-full h-[65vh] relative rounded-lg overflow-hidden shadow-xs border border-gray-200 bg-white"
        headerHeight={28}
        rowHeight={22}
        pageSize={20}
        pageSizeSelector={[20, 40, 60, 100]}
        emptyTitle="No Materials Found"
        emptyDescription="There are no material types registered."
        getRowId={(params) => params.data?.id?.toString() || Math.random().toString()}
      />

      {/* ADD MODAL */}
      <GlobalModal
        open={isModalOpen}
        title="Add New Material"
        onCancel={() => {
          setIsModalOpen(false);
          addForm.resetFields();
        }}
        onConfirm={handleAddMaterial}
        confirmText="Save Material"
        cancelText="Cancel"
        loading={adding}
        width={500}
      >
        <Form
          form={addForm}
          layout="vertical"
          className="pt-2"
          initialValues={{ material_name: "", density_value: "" }}
        >
          <StyledFormItem
            name="material_name"
            label="Material Name"
            rules={[
              { required: true, message: "Material name required" },
              {
                pattern: materialNameRegex,
                message:
                  "Only letters, numbers, spaces, hyphens, and underscores allowed.",
              },
            ]}
            normalize={(value) => value.toUpperCase()}
          >
            <Input placeholder="e.g. Mild Steel" className={INPUT_CLASS} />
          </StyledFormItem>

          <StyledFormItem
            name="density_value"
            label="Density Value"
            getValueFromEvent={(e) => e.target.value.replace(/[^0-9.]/g, "")}
            rules={[
              { required: true, message: "Density value required" },
              { pattern: densityRegex, message: "Enter a valid float value." },
            ]}
          >
            <Input placeholder="8.0" className={INPUT_CLASS} />
          </StyledFormItem>
        </Form>
      </GlobalModal>

      {/* EDIT MODAL */}
      <GlobalModal
        open={editModalOpen}
        title="Edit Material Type"
        onCancel={() => setEditModalOpen(false)}
        onConfirm={handleUpdateMaterial}
        confirmText="Update"
        cancelText="Cancel"
        loading={updating}
        width={500}
      >
        <Form form={editForm} layout="vertical" className="pt-2">
          <StyledFormItem
            name="material_name"
            label="Material Name"
            rules={[
              { required: true, message: "Material name required" },
              {
                pattern: materialNameRegex,
                message:
                  "Only letters, numbers, spaces, hyphens, and underscores allowed.",
              },
            ]}
            normalize={(value) => value.toUpperCase()}
          >
            <Input placeholder="Material name" className={INPUT_CLASS} />
          </StyledFormItem>

          <StyledFormItem
            name="density_value"
            label="Density Value"
            getValueFromEvent={(e) => e.target.value.replace(/[^0-9.]/g, "")}
            rules={[
              { required: true, message: "Density value required" },
              { pattern: densityRegex, message: "Enter a valid float value." },
            ]}
          >
            <Input placeholder="Density" className={INPUT_CLASS} />
          </StyledFormItem>
        </Form>
      </GlobalModal>
    </div>
  );
};
export default AdminMaterials;
