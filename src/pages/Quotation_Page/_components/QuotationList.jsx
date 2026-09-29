import ReusableTable from "@/components/ReusableComponents/ReusableTable";
import {
  useLazyGetQuotationListQuery,
  useDuplicateQuotationMutation,
  useDeleteQuotationMutation,
  useLazyGetNextDocNumberQuery,
} from "@/store/services/quotation.api";
import Loader from "@/components/ReusableComponents/Loader";
import Button from "@/components/ReusableComponents/Button";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import { Form, Input, message, Tooltip, Popconfirm } from "antd";
import { Icon } from "@iconify/react";
import {
  StyledFormItem,
  INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";
import "@/styles/aggrid.css";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/useAuth";

const getStatusColor = (status) => {
  const s = status?.toLowerCase();
  if (s === "won") return "bg-green-100 text-green-700";
  if (s === "pending") return "bg-yellow-100 text-yellow-700";
  if (s === "lost") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

const StatusCellRenderer = (params) => {
  const rawStatus = params.value;
  const displayStatus = rawStatus ? String(rawStatus).toUpperCase() : "PENDING";
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[8px] font-semibold leading-none border select-none whitespace-nowrap ${getStatusColor(rawStatus)}`}
    >
      {displayStatus}
    </span>
  );
};

const getFinancialYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
};

const QuotationList = forwardRef(
  ({ onViewDetail, onEdit, onColumnsReady }, ref) => {
    const [gridApi, setGridApi] = useState(null);
    const gridApiRef = useRef(null);
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const isAdminUser =
      user?.isAdmin ||
      user?.roles?.some((r) => r.toLowerCase() === "admin") ||
      user?.role?.toLowerCase() === "admin" ||
      location.pathname.includes("/admin_dashboard");

    const [trigger, { isFetching }] = useLazyGetQuotationListQuery();
    const [duplicateQuotation, { isLoading: isDuplicating }] =
      useDuplicateQuotationMutation();
    const [deleteQuotation] = useDeleteQuotationMutation();
    const [triggerNextDocNo] = useLazyGetNextDocNumberQuery();
    const [isDuplicateModalVisible, setIsDuplicateModalVisible] =
      useState(false);
    const [targetQuotation, setTargetQuotation] = useState(null);
    const [form] = Form.useForm();

    const handleDeleteQuotation = useCallback(
      async (quotationId, apiInstance) => {
        try {
          const res = await deleteQuotation(quotationId).unwrap();
          if (res?.status !== false) {
            message.success("Quotation deleted successfully!");
            const api = apiInstance || gridApiRef.current || gridApi;
            if (api) {
              api.purgeInfiniteCache();
              api.refreshInfiniteCache();
            }
          } else {
            message.error(res?.message || res?.error || "Failed to delete quotation");
          }
        } catch (err) {
          message.error(
            err?.data?.message ||
              err?.data?.error ||
              "Delete failed. Please try again.",
          );
        }
      },
      [deleteQuotation, gridApi],
    );

    const handleDuplicateClick = useCallback(
      async (quotation) => {
        setTargetQuotation(quotation);
        setIsDuplicateModalVisible(true);
        try {
          const res = await triggerNextDocNo(undefined).unwrap();
          if (res?.doc_number) {
            const fy = getFinancialYear();
            const running = String(res.doc_number).padStart(3, "0");
            form.setFieldsValue({ doc_no: `SLT/${fy}/${running}` });
          }
        } catch (err) {
          console.error("Failed to fetch next doc number", err);
        }
      },
      [triggerNextDocNo, form],
    );

    const onDuplicateConfirm = async () => {
      try {
        const values = await form.validateFields();
        if (!targetQuotation?.id) {
          message.error("Invalid quotation selected for duplication");
          return;
        }
        const res = await duplicateQuotation({
          quotation_id: targetQuotation.id,
          doc_no: values.doc_no,
        }).unwrap();
        if (res.status !== false) {
          message.success("Quotation duplicated successfully!");
          setIsDuplicateModalVisible(false);
          form.resetFields();
          if (res.data) {
            onEdit(res.data);
          }
          const api = gridApiRef.current || gridApi;
          if (api) {
            api.purgeInfiniteCache();
            api.refreshInfiniteCache();
          }
        } else {
          message.error(res.message || "Failed to duplicate quotation");
        }
      } catch (err) {
        const error = err;
        message.error(
          error.data?.error || "Duplication failed. Please try again.",
        );
      }
    };

    useImperativeHandle(ref, () => ({
      refresh: () => {
        const api = gridApiRef.current || gridApi;
        if (api) {
          api.purgeInfiniteCache();
          api.refreshInfiniteCache();
        }
      },
    }));

    const formatCurrency = (value) => {
      if (value === null || value === undefined || value === "") return "—";
      const num = typeof value === "string" ? parseFloat(value) : Number(value);
      if (Number.isNaN(num)) return "—";
      return `₹ ${num.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    };

    const formatDate = (value) => {
      if (value === null || value === undefined || value === "") return "—";
      try {
        return new Date(value).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } catch {
        return "—";
      }
    };

    const safeString = (value) => {
      if (value === null || value === undefined || value === "") return "—";
      return String(value);
    };

    const ActionCellRenderer = (props) => {
      const quotation = props.data;
      if (!quotation) return null;
      return (
        <div className="flex items-center justify-center gap-1.5 h-full">
          <Tooltip title="Duplicate">
            <button
              type="button"
              className="rounded-full text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-150 flex items-center justify-center cursor-pointer"
              onClick={() => handleDuplicateClick(quotation)}
            >
              <Icon icon="lucide:copy-plus" className="w-3 h-3" />
            </button>
          </Tooltip>
          <Tooltip title="View">
            <button
              type="button"
              className="rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-150 flex items-center justify-center cursor-pointer"
              onClick={() => onViewDetail(quotation)}
            >
              <Icon icon="lucide:eye" className="w-3 h-3" />
            </button>
          </Tooltip>
          {isAdminUser && (
            <>
              <Tooltip title="Edit">
                <button
                  type="button"
                  className="rounded-full text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all duration-150 flex items-center justify-center cursor-pointer"
                  onClick={() => onEdit(quotation)}
                >
                  <Icon icon="lucide:pencil" className="w-3 h-3" />
                </button>
              </Tooltip>
              <Tooltip title="Delete">
                <Popconfirm
                  title="Delete Quotation"
                  description="Are you sure you want to delete this quotation?"
                  onConfirm={() => handleDeleteQuotation(quotation.id, props.api)}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true, size: "small" }}
                  cancelButtonProps={{ size: "small" }}
                >
                  <button
                    type="button"
                    className="rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150 flex items-center justify-center cursor-pointer"
                  >
                    <Icon icon="lucide:trash-2" className="w-3 h-3" />
                  </button>
                </Popconfirm>
              </Tooltip>
            </>
          )}
        </div>
      );
    };

    const defaultColDef = useMemo(
      () => ({
        sortable: true,
        resizable: true,
        wrapText: false,
        filter: true,
        headerClass: "ag-center-header text-gray-800 font-semibold",
        cellClass: "ag-center-cell text-[10px] text-gray-800 font-normal",
        suppressMovable: true,
      }),
      [],
    );

    const columnDefs = useMemo(
      () => [
        {
          headerName: "S.No",
          field: "id",
          flex: 0.3,
          minWidth: 35,
          sortable: true,
          filter: false,
        },
        {
          field: "doc_no",
          headerName: "DOC NO",
          flex: 0.5,
          minWidth: 85,
          valueFormatter: (p) => safeString(p.value),
        },
        {
          field: "doc_date",
          headerName: "DATE",
          flex: 0.3,
          minWidth: 70,
          valueFormatter: (p) => formatDate(p.value),
        },
        {
          field: "company_name",
          headerName: "COMPANY NAME",
          flex: 2,
          minWidth: 200,
          tooltipField: "company_name",
          cellClass: "text-left !font-medium !p-0 !px-1.5",
          valueFormatter: (p) => safeString(p.value),
        },
        {
          field: "mode_of_submission",
          headerName: "MOS",
          flex: 0.4,
          minWidth: 60,
          valueFormatter: (p) => safeString(p.value).toUpperCase(),
        },
        {
          field: "quote_type",
          headerName: "TYPE",
          flex: 0.4,
          minWidth: 60,
          valueFormatter: (p) => safeString(p.value).toUpperCase(),
        },
        {
          field: "total_amount",
          headerName: "TOTAL",
          flex: 0.5,
          minWidth: 75,
          valueFormatter: (p) => formatCurrency(p.value),
        },
        {
          field: "status",
          headerName: "STATUS",
          flex: 0.4,
          minWidth: 70,
          cellRenderer: StatusCellRenderer,
        },
        {
          headerName: "ACTION",
          flex: 1,
          width: 90,
          sortable: false,
          filter: false,
          pinned: "right",
          cellClass: "!p-0 !px-1.5 flex items-center justify-center",
          cellRenderer: ActionCellRenderer,
        },
      ],
      [],
    );

    const handleFetchData = useCallback(
      async ({ page, pageSize: pgSize, filters, sort }) => {
        const searchVal = searchParams.get("search") || undefined;
        const res = await trigger({
          page,
          page_size: pgSize,
          search: searchVal,
          filters,
          sort,
        }).unwrap();
        return {
          results: res.results,
          count: res.count,
        };
      },
      [trigger, searchParams],
    );

    return (
      <div className="w-full h-full">
        <ReusableTable
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          fetchData={handleFetchData}
          loading={isFetching}
          loadingText="Refreshing data..."
          rowModelType="infinite"
          defaultPageSize={20}
          pageSizeSelector={[20, 40, 60, 100]}
          enableMultiSort={true}
          multiSortKey="ctrl"
          headerHeight={22}
          rowHeight={20}
          containerClassName="w-full h-[75vh] relative rounded-xl overflow-hidden shadow-sm border border-gray-200"
          persistState={true}
          persistKey="quotation_list"
          emptyTitle="No quotations found"
          emptyDescription="There are no quotation records to display."
          onGridReady={(params) => {
            gridApiRef.current = params.api;
            setGridApi(params.api);
            if (isAdminUser && onColumnsReady) {
              onColumnsReady(
                columnDefs
                  .filter((col) => col.field && col.field !== "id")
                  .map((col) => ({
                    label: col.headerName,
                    value: col.field,
                  })),
              );
            }
          }}
        />

        <GlobalModal
          open={isDuplicateModalVisible}
          title="Duplicate Quotation"
          onConfirm={onDuplicateConfirm}
          onCancel={() => {
            setIsDuplicateModalVisible(false);
            form.resetFields();
          }}
          confirmText="Duplicate"
          confirmIcon="lucide:copy"
          loading={isDuplicating}
          confirmColor="blue"
          cancelColor="cancel"
          width={450}
        >
          <div>
            <p className="text-gray-600 text-xs mb-2">
              Duplicating quotation for{" "}
              <span className="font-semibold text-gray-800">
                {targetQuotation?.company_name}
              </span>
              . Please enter a new unique document number.
            </p>
            <Form form={form} layout="vertical" requiredMark={false}>
              <StyledFormItem
                name="doc_no"
                label="New Quotation Number"
                rules={[
                  {
                    required: true,
                    message: "Please enter the new quotation number",
                  },
                  { whitespace: true, message: "Field cannot be empty" },
                ]}
              >
                <Input
                  placeholder="Enter new doc number (e.g. 251)"
                  className={INPUT_CLASS}
                />
              </StyledFormItem>
            </Form>
          </div>
        </GlobalModal>
      </div>
    );
  },
);

QuotationList.displayName = "QuotationList";
export default QuotationList;
