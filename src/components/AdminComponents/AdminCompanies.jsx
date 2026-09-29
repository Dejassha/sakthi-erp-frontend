import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Icon } from "@iconify/react";
import React, { useMemo, useState, useCallback } from "react";
import LoadingState from "@/pages/errorPage/LoadingState";
import ErrorState from "@/pages/errorPage/ErrorState";
import GlobalButton from "@/components/ReusableComponents/Button";
import ReusableTable from "@/components/ReusableComponents/ReusableTable";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import {
  StyledFormItem,
  INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";
import {
  message as antMessage,
  Form,
  Input as AntInput,
  Tooltip,
  Button as AntdButton,
  Modal,
  Popconfirm,
} from "antd";
import { useAuth } from "@/context/useAuth";
import {
  useGetCompaniesQuery,
  useAddCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
} from "@/store/services/admin.api";
import "@/styles/aggrid.css";
ModuleRegistry.registerModules([AllCommunityModule]);
/* -------------------- TYPES (MATCH BACKEND) -------------------- */
/* -------------------- COMPONENT -------------------- */
const AdminCompanies = () => {
  const { user } = useAuth();
  const username = user?.username || "";
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const {
    data: companies = [],
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useGetCompaniesQuery(undefined);
  const loading = isLoading || isFetching;
  // Stable S.No mapping
  const memoizedCompanies = useMemo(() => {
    const total = companies.length;
    return Array.from(companies)
      .reverse()
      .map((comp, idx) => ({
        ...comp,
        sno: total - idx,
      }));
  }, [companies]);
  const listError = useMemo(() => {
    if (!queryError) return null;
    if (
      "data" in queryError &&
      queryError.data &&
      typeof queryError.data === "object"
    ) {
      const errorData = queryError.data;
      return errorData?.msg || "An error occurred while fetching companies";
    }
    if ("message" in queryError) {
      return queryError.message || "Failed to load companies";
    }
    return "Failed to load companies";
  }, [queryError]);
  const [addCompany, { isLoading: addLoading }] = useAddCompanyMutation();
  const [updateCompany, { isLoading: updateLoading }] =
    useUpdateCompanyMutation();
  const [deleteCompany, { isLoading: deleteLoading }] =
    useDeleteCompanyMutation();
  // ADD modal
  const [openModal, setOpenModal] = useState(false);
  // EDIT MODAL
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const openEdit = useCallback(
    (comp) => {
      setSelectedCompany(comp);
      editForm.setFieldsValue(comp);
      setEditModalOpen(true);
    },
    [editForm],
  );
  const confirmDelete = useCallback(
    async (comp) => {
      if (!comp?.id || deleteLoading) return;
      try {
        await deleteCompany(comp.id).unwrap();
        refetch();
        antMessage.success("Company deleted");
      } catch (err) {
        antMessage.error(err.data?.error || "Delete failed");
      }
    },
    [deleteCompany, deleteLoading, refetch],
  );
  const columnDefs = useMemo(
    () => [
      {
        headerName: "S.No",
        field: "sno",
        flex: 0.2,
        minWidth: 50,
        filter: false,
      },
      {
        field: "company_name",
        headerName: "Company Name",
        flex: 1,
      },
      {
        field: "customer_name",
        headerName: "Customer Name",
        flex: 1,
      },
      {
        field: "contact_no",
        headerName: "Contact No",
        flex: 0.6,
        minWidth: 100,
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
              <Icon
                icon="lucide:pencil"
                onClick={() => openEdit(params.data)}
                className="w-3 h-3 text-amber-600 hover:scale-110 cursor-pointer transition-all duration-150"
              />
            </Tooltip>
            <Popconfirm
              title="Delete the company"
              description={`Are you sure you want to delete ${params.data.company_name}?`}
              onConfirm={() => confirmDelete(params.data)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true, loading: deleteLoading }}
            >
              <Tooltip title="Delete">
                <Icon
                  icon="lucide:trash-2"
                  className="w-3 h-3 text-rose-600 hover:scale-110 cursor-pointer transition-all duration-150"
                />
              </Tooltip>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [confirmDelete, deleteLoading, openEdit],
  );
  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      headerClass: "ag-center-header",
      cellClass: "ag-center-cell text-sm",
      suppressMovable: true,
      wrapText: false,
      valueFormatter: (params) => params.value || "-",
    }),
    [],
  );
  const onGridReady = useCallback((params) => {
    params.api.sizeColumnsToFit();
  }, []);
  const handleAddCompany = useCallback(async () => {
    try {
      const values = await addForm.validateFields();
      await addCompany({
        ...values,
        created_by: username,
      }).unwrap();
      refetch();
      antMessage.success("Company added");
      setOpenModal(false);
      addForm.resetFields();
    } catch (err) {
      if (err.errorFields) return;
      const errorData = err.data;
      if (errorData) {
        const fieldErrors = Object.keys(errorData)
          .filter((key) => key !== "error" && key !== "msg")
          .map((key) => ({
            name: key,
            errors: Array.isArray(errorData[key])
              ? errorData[key]
              : [errorData[key]],
          }));
        if (fieldErrors.length > 0) {
          addForm.setFields(fieldErrors);
          return;
        }
        const errorMsg = errorData.error || errorData.msg || "Add failed";
        if (
          errorMsg.toLowerCase().includes("company") ||
          errorMsg.toLowerCase().includes("exists")
        ) {
          addForm.setFields([{ name: "company_name", errors: [errorMsg] }]);
        } else {
          antMessage.error(errorMsg);
        }
      } else {
        antMessage.error("Add failed");
      }
    }
  }, [addCompany, addForm, refetch, username]);
  const handleSaveEdit = useCallback(async () => {
    if (!selectedCompany?.id) return;
    try {
      const values = await editForm.validateFields();
      await updateCompany({
        id: selectedCompany.id,
        body: {
          ...values,
          created_by: username,
        },
      }).unwrap();
      refetch();
      antMessage.success("Company updated");
      setEditModalOpen(false);
    } catch (err) {
      if (err.errorFields) return;
      const errorData = err.data;
      if (errorData) {
        const fieldErrors = Object.keys(errorData)
          .filter((key) => key !== "error" && key !== "msg")
          .map((key) => ({
            name: key,
            errors: Array.isArray(errorData[key])
              ? errorData[key]
              : [errorData[key]],
          }));
        if (fieldErrors.length > 0) {
          editForm.setFields(fieldErrors);
          return;
        }
        const errorMsg = errorData.error || errorData.msg || "Update failed";
        if (
          errorMsg.toLowerCase().includes("company") ||
          errorMsg.toLowerCase().includes("exists")
        ) {
          editForm.setFields([{ name: "company_name", errors: [errorMsg] }]);
        } else {
          antMessage.error(errorMsg);
        }
      } else {
        antMessage.error("Update failed");
      }
    }
  }, [editForm, refetch, selectedCompany, updateCompany, username]);
  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Manage Companies"
        actions={
          <GlobalButton
            color="blue"
            icon="lucide:plus"
            onClick={() => setOpenModal(true)}
          >
            Add Company
          </GlobalButton>
        }
      />

      <GlobalModal
        open={openModal}
        title="Add Company"
        onCancel={() => setOpenModal(false)}
        onConfirm={() => addForm.submit()}
        confirmText="Save Company"
        cancelText="Cancel"
        loading={addLoading}
        width={550}
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={handleAddCompany}
          className="space-y-4 pt-2"
          initialValues={{
            company_name: "",
            customer_name: "",
            contact_no: "",
          }}
        >
          <StyledFormItem
            label="Company Name"
            name="company_name"
            rules={[
              { required: true, message: "Company name is required" },
              {
                pattern: /^[A-Za-z0-9 _-]{2,40}$/,
                message: "Invalid format",
              },
            ]}
            normalize={(value) => value.toUpperCase()}
          >
            <AntInput placeholder="Enter company name" className={INPUT_CLASS} />
          </StyledFormItem>

          <StyledFormItem
            label="Customer Name"
            name="customer_name"
            rules={[
              {
                pattern: /^[A-Za-z0-9 _-]{2,40}$/,
                message: "Invalid format",
              },
            ]}
            normalize={(value) => value.toUpperCase()}
          >
            <AntInput placeholder="Enter customer name" className={INPUT_CLASS} />
          </StyledFormItem>

          <StyledFormItem
            label="Contact No."
            name="contact_no"
            rules={[
              { required: true, message: "Contact number is required" },
              { pattern: /^[0-9]{10}$/, message: "Invalid format" },
            ]}
          >
            <AntInput
              maxLength={10}
              placeholder="Enter 10 digit number"
              className={INPUT_CLASS}
              onChange={(e) => {
                const val = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);
                addForm.setFieldsValue({ contact_no: val });
              }}
            />
          </StyledFormItem>
        </Form>
      </GlobalModal>

      {/* Grid */}
      {listError ? (
        <div className="w-full h-[70vh] flex flex-col items-center justify-center bg-red-50 rounded-xl border border-red-100">
          <p className="text-red-600 font-medium italic">
            Error loading companies
          </p>
          <p className="text-red-500 text-sm mt-1">{listError}</p>
        </div>
      ) : (
        <ReusableTable
          persistKey="admin_companies_grid"
          columnDefs={columnDefs}
          rowData={memoizedCompanies}
          rowModelType="clientSide"
          loading={loading}
          loadingText="Loading companies..."
          defaultColDef={defaultColDef}
          containerClassName="w-full h-[70vh] relative rounded-lg overflow-hidden shadow-xs border border-gray-200 bg-white"
          headerHeight={28}
          rowHeight={22}
          pageSize={20}
          pageSizeSelector={[20, 40, 60, 100]}
          emptyTitle="No Companies Found"
          emptyDescription="There are no companies to display."
          onGridReady={onGridReady}
          getRowId={(params) => params.data?.id?.toString() || Math.random().toString()}
        />
      )}

      {/* EDIT MODAL */}
      <GlobalModal
        open={editModalOpen}
        title="Edit Company"
        onCancel={() => setEditModalOpen(false)}
        onConfirm={() => editForm.submit()}
        confirmText="Save Changes"
        cancelText="Cancel"
        loading={updateLoading}
        width={550}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleSaveEdit}
          className="space-y-4 pt-2"
        >
          <StyledFormItem
            label="Company Name"
            name="company_name"
            rules={[
              { required: true, message: "Company name is required" },
              { pattern: /^[A-Za-z0-9 _-]{2,40}$/, message: "Invalid format" },
            ]}
            normalize={(value) => value.toUpperCase()}
          >
            <AntInput placeholder="Enter company name" className={INPUT_CLASS} />
          </StyledFormItem>

          <StyledFormItem
            label="Customer Name"
            name="customer_name"
            rules={[
              { pattern: /^[A-Za-z0-9 _-]{2,40}$/, message: "Invalid format" },
            ]}
            normalize={(value) => value.toUpperCase()}
          >
            <AntInput placeholder="Enter customer name" className={INPUT_CLASS} />
          </StyledFormItem>

          <StyledFormItem
            label="Contact No."
            name="contact_no"
            rules={[
              { required: true, message: "Contact number is required" },
              { pattern: /^[0-9]{10}$/, message: "Invalid format" },
            ]}
          >
            <AntInput
              maxLength={10}
              placeholder="Enter 10 digit number"
              className={INPUT_CLASS}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                editForm.setFieldsValue({ contact_no: val });
              }}
            />
          </StyledFormItem>
        </Form>
      </GlobalModal>

      {/* Loading & Error overlays */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80">
          <LoadingState message="Loading companies..." fullPage={false} />
        </div>
      )}

      {listError != null && (
        <div className="absolute inset-0 z-50 bg-white p-4 flex items-center justify-center">
          <ErrorState
            error={listError}
            onRetry={refetch}
            showHomeButton={false}
          />
        </div>
      )}
    </div>
  );
};
export default AdminCompanies;
