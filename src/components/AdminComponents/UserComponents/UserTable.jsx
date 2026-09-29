import React, { useMemo } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button, Space, Tooltip, Popconfirm } from "antd";
import ReusableTable from "@/components/ReusableComponents/ReusableTable";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { getRoleStyle } from "./userUtils";

ModuleRegistry.registerModules([AllCommunityModule]);

const UserTable = ({
  users = [],
  loading = false,
  onEdit,
  onDelete,
  currentUser,
}) => {
  const columnDefs = useMemo(
    () => [
      {
        headerName: "S.No",
        field: "sno",
        width: 80,
        filter: false,
      },
      {
        headerName: "Username",
        field: "username",
        flex: 1,
      },
      {
        headerName: "Email",
        field: "email",
        flex: 1.2,
      },
      {
        headerName: "Roles",
        field: "roles",
        flex: 1.8,
        autoHeight: true,
        wrapText: true,
        valueFormatter: (params) => params.value?.join(", ") || "",
        cellRenderer: (params) => (
          <div className="flex flex-wrap gap-1.5 items-center justify-center py-1.5 w-full">
            {params.value?.map((role) => {
              const { bg, text } = getRoleStyle(role);
              return (
                <span
                  style={{ backgroundColor: bg, color: text }}
                  key={role}
                  className="rounded-full px-2 py-0.5 text-[9px] font-semibold shadow-xs border border-black/5 whitespace-nowrap"
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </span>
              );
            })}
          </div>
        ),
      },
      {
        headerName: "Admin",
        field: "isAdmin",
        width: 100,
        cellRenderer: (params) => (
          <div className="flex items-center h-full justify-center">
            {params.value ? (
              <span className="text-green-600">
                <Check className="h-4 w-4" />
              </span>
            ) : (
              <span className="text-red-600">
                <X className="h-4 w-4" />
              </span>
            )}
          </div>
        ),
      },
      {
        headerName: "Manage Users",
        field: "has_user_management",
        width: 140,
        cellRenderer: (params) => (
          <div className="flex items-center h-full justify-center">
            {params.value ? (
              <span className="text-green-600">
                <Check className="h-4 w-4" />
              </span>
            ) : (
              <span className="text-red-600">
                <X className="h-4 w-4" />
              </span>
            )}
          </div>
        ),
      },
      {
        headerName: "Actions",
        width: 120,
        sortable: false,
        filter: false,
        cellRenderer: (params) => {
          const isCurrentUser = params.data?.username === currentUser?.username;
          return (
            <Space size="" className="flex items-center h-full">
              <Tooltip title="Edit">
                <Button
                  type="text"
                  icon={<Pencil className="h-3 w-3" />}
                  onClick={() => onEdit?.(params.data)}
                  className="text-blue-600 hover:text-blue-800"
                />
              </Tooltip>
              {isCurrentUser ? (
                <Tooltip title="You cannot delete your own account">
                  <Button
                    type="text"
                    disabled
                    icon={<Trash2 className="h-3 w-3 text-gray-400" />}
                  />
                </Tooltip>
              ) : (
                <Tooltip title="Delete">
                  <Popconfirm
                    title="Delete user?"
                    description={`Are you sure you want to delete ${params.data?.username}?`}
                    onConfirm={() => params.data?.id && onDelete?.(params.data.id)}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<Trash2 className="h-3 w-3" />}
                    />
                  </Popconfirm>
                </Tooltip>
              )}
            </Space>
          );
        },
      },
    ],
    [onDelete, onEdit, currentUser],
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
    <ReusableTable
      persistKey="admin_users_grid"
      columnDefs={columnDefs}
      rowData={users}
      rowModelType="clientSide"
      loading={loading}
      loadingText="Loading users..."
      defaultColDef={defaultColDef}
      containerClassName="w-full h-[70vh] relative rounded-lg overflow-hidden shadow-xs border border-gray-200 bg-white"
      headerHeight={28}
      rowHeight={22}
      pageSize={20}
      pageSizeSelector={[20, 40, 60, 100]}
      emptyTitle="No Users Found"
      emptyDescription="There are no users registered."
      getRowId={(params) => params.data?.id?.toString() || Math.random().toString()}
    />
  );
};

export default React.memo(UserTable);
