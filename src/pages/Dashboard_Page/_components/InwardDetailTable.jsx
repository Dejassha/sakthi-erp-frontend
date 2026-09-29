import React from "react";
import { Table } from "antd";
import { Icon } from "@iconify/react";

const InwardDetailTable = ({
  formData = {},
  columns = [],
  title = "Inward Detail",
  icon = "lucide:clipboard-list",
  className = "",
  tableProps = {},
}) => {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <Icon icon={icon} className="w-5 h-5 text-slate-600" />
        <h3 className="heading-secondary">{title}</h3>
      </div>

      <div className="overflow-x-auto rounded-sm border border-gray-200 scrollbar-hide">
        <Table
          dataSource={[formData]}
          columns={columns}
          pagination={false}
          bordered
          size="small"
          rowKey={() => "inward_summary_basic"}
          className="w-full [&_.ant-table-thead_th]:!bg-gray-200 [&_.ant-table-thead_th]:!text-gray-600 [&_.ant-table-thead_th]:!text-[10px] 2xl:[&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-semibold [&_.ant-table-thead_th]:!text-center [&_.ant-table-thead_th]:!py-1.5 [&_.ant-table-thead_th]:!px-1.5"
          {...tableProps}
        />
      </div>
    </div>
  );
};

export default InwardDetailTable;
