import React, { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useGetQuotationNoteQuery } from "@/store/services/quotation.api";
import { Dropdown, AutoComplete, Divider, Space, Button, Input } from "antd";
import AppButton from "@/components/ReusableComponents/Button";

const ITEMS_PER_PAGE = 10;

const QuotationLayout = ({
  data,
  mode,
  onChange,
  onItemChange,
  onAddRow,
  onDeleteRow,
  onItemsPaste,
  showValidation = false,
  companyList = [],
  loadingCompanies = false,
  isAddingCompany = false,
  isCompanyModalVisible = false,
  setIsCompanyModalVisible,
  handleSelectCompany,
  handleCompanySearch,
}) => {
  const readOnly = mode === "view";
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const docParts = data.doc_no?.split("/") || [];
  const docPrefix =
    docParts.length >= 2 ? `${docParts[0]}/${docParts[1]}/` : "";
  const docNumber = docParts.length >= 3 ? docParts[2] : "";
  const { data: quotationNote = [] } = useGetQuotationNoteQuery(undefined);

  const handleExcelPaste = (e) => {
    if (readOnly) return;
    const pastedData = e.clipboardData.getData("text");
    if (!pastedData || !pastedData.includes("\t")) return;
    e.preventDefault();
    const rows = pastedData
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean);
    const parsedItems = rows.map((row) => {
      const cols = row.split("\t");
      const quantity = Number(cols[3]) || 0;
      const rate = Number(cols[4]) || 0;
      return {
        description: cols[0] || "",
        material: cols[1] || "",
        uom: cols[2] || "",
        quantity,
        rate,
        total: quantity * rate,
        remarks: cols[6] || "",
      };
    });
    if (parsedItems.length > 0) onItemsPaste?.(parsedItems);
  };

  const renderPage = (items, pageIndexCount, totalPages, startIndex) => {
    const isPrintView = totalPages > 1;
    const isLastPage = pageIndexCount === totalPages - 1;
    return (
      <div
        key={startIndex}
        className={`print-page ${isLastPage ? "last-page" : ""} ${isPrintView ? "multi-page-print" : "single-page-print"} ${isPrintView ? "" : "print:block"}`}
      >
        <div className="w-full max-w-4xl print:mx-0 mx-auto border-2 border-red-600 bg-white relative mb-10 print:mb-0 quotation-box">
          {/* HEADER */}
          <div className="flex justify-start items-center gap-2 border-b-2 border-red-600 p-2">
            <img
              src="/logoWithoutName.svg"
              alt="Sakthi Laser"
              className="size-14 object-contain"
            />
            <div>
              <h2 className="text-xl font-bold text-red-600">
                SAKTHI LASER TECHNOLOGY
              </h2>
              <p className="italic text-[12px]">
                Complete Customized Sheet Metal Job Shop
              </p>
            </div>
          </div>

          <div className="border-b-2 border-red-600 text-center font-bold py-1 text-red-600 flex justify-between px-4">
            <div className="w-20"></div>
            <div className="flex-1 text-center font-bold text-red-600 text-sm">
              QUOTATION
            </div>
            <div className="text-[10px] w-20 text-right font-normal">
              {isPrintView ? `Page ${pageIndexCount + 1} of ${totalPages}` : ""}
            </div>
          </div>

          {/* DOC INFO */}
          <div className="border-b-2 border-red-600 px-2 py-1 flex justify-between text-sm">
            <div className="flex items-center gap-1">
              <b>DOC NO:</b>{" "}
              {readOnly ? (
                <span>{data.doc_no || "-"}</span>
              ) : (
                <>
                  <span className="text-red-600 font-bold">{docPrefix}</span>
                  <input
                    value={docNumber}
                    onChange={(e) =>
                      onChange?.("doc_no_number", e.target.value)
                    }
                    className="border-b outline-none w-20"
                    placeholder="001"
                  />
                </>
              )}
            </div>
            <div>
              <b>DOC DATE:</b>{" "}
              {readOnly ? (
                <span>{data.doc_date || "-"}</span>
              ) : (
                <input
                  type="date"
                  value={data.doc_date}
                  onChange={(e) => onChange?.("doc_date", e.target.value)}
                  className={`border-b outline-none ml-1 text-red-600 font-bold ${showValidation && !data.doc_date ? "border-red-500" : ""}`}
                />
              )}
            </div>
          </div>

          {/* ADDRESS */}
          <div className="px-2 py-2 flex justify-between text-sm">
            <div className="flex-1 max-w-[50%]">
              <b>TO</b>
              <div className="mt-1">
                {readOnly ? (
                  <span>{data.company_name || "-"}</span>
                ) : (
                  <AutoComplete
                    options={companyList.map((c) => ({
                      label: c.company_name,
                      value: c.company_name,
                    }))}
                    onSelect={handleSelectCompany}
                    onChange={handleCompanySearch}
                    value={data.company_name}
                    getPopupContainer={(trigger) => trigger.parentElement}
                    filterOption={(inputValue, option) =>
                      option
                        ? option.value
                          .toUpperCase()
                          .indexOf(inputValue.toUpperCase()) !== -1
                        : false
                    }
                    popupRender={(menu) => (
                      <div className="no-print">
                        {menu}
                        <Divider style={{ margin: "8px 0" }} />
                        <Space style={{ padding: "0 8px 4px" }}>
                          <Button
                            type="text"
                            icon={<Plus size={14} />}
                            onClick={() => {
                              setIsCompanyModalVisible?.(true);
                              setIsDropdownOpen(false);
                            }}
                          >
                            Add new company
                          </Button>
                        </Space>
                      </div>
                    )}
                    notFoundContent={
                      <div className="p-4 text-center text-gray-500 no-print">
                        Company not found. You can add a new one below.
                      </div>
                    }
                    style={{ width: "100%" }}
                  >
                    <Input
                      placeholder={
                        loadingCompanies
                          ? "Loading..."
                          : "Search or enter company name"
                      }
                      className={`border-b outline-none w-full ${showValidation && !data.company_name ? "border-red-500 border-b-2" : ""}`}
                      variant="borderless"
                    />
                  </AutoComplete>
                )}
              </div>
              <div className="mt-2">
                <b>Kind Attn :</b>{" "}
                {readOnly ? (
                  <span>{data.customer_name || "-"}</span>
                ) : (
                  <input
                    value={data.customer_name}
                    onChange={(e) =>
                      onChange?.("customer_name", e.target.value)
                    }
                    className={`border-b outline-none ${showValidation && !data.customer_name ? "border-red-500 border-b-2" : ""}`}
                    placeholder="Enter Customer Name"
                  />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex gap-2 items-center">
                <span className="w-14">
                  <b>GST :</b>
                </span>{" "}
                {readOnly ? (
                  <span>{data.customer_gst_no || "-"}</span>
                ) : (
                  <input
                    value={data.customer_gst_no}
                    onChange={(e) =>
                      onChange?.("customer_gst_no", e.target.value)
                    }
                    className="border-b outline-none"
                    placeholder="Enter Customer GST No."
                  />
                )}
              </div>
              <div className="flex gap-2 items-center">
                <span className="w-14">
                  <b>Email :</b>
                </span>{" "}
                {readOnly ? (
                  <span>{data.email || "-"}</span>
                ) : (
                  <input
                    value={data.email}
                    onChange={(e) => onChange?.("email", e.target.value)}
                    className={`border-b outline-none lowercase ${showValidation && !data.email ? "border-red-500 border-b-2" : ""}`}
                    placeholder="Enter Email Address"
                  />
                )}
              </div>
              <div className="flex gap-2 items-center">
                <span className="">
                  <b>Contact :</b>
                </span>{" "}
                {readOnly ? (
                  <span>{data.contact || "-"}</span>
                ) : (
                  <input
                    value={data.contact}
                    onChange={(e) => onChange?.("contact", e.target.value)}
                    className={`border-b outline-none ${showValidation && !data.contact ? "border-red-500 border-b-2" : ""}`}
                    placeholder="Enter Contact No."
                  />
                )}
              </div>
            </div>
          </div>

          <div className="px-2 pb-2 text-sm">
            <b>SUB :</b> Quotation as per your requirement
          </div>

          <div className="px-10 py-2 text-center font-bold text-xs">
            With reference to above, we here with giving our best offer as per
            your requirement as given below
          </div>

          {/* ITEMS TABLE */}
          <table
            onPaste={handleExcelPaste}
            className="w-full border-collapse text-xs"
          >
            <thead>
              <tr className="border border-red-600">
                <th className="border p-1 min-w-8">Sl</th>
                <th className="border p-1">Description</th>
                <th className="border p-1">Material</th>
                <th className="border p-1">UOM</th>
                <th className="border p-1">Qty</th>
                <th className="border p-1">Rate</th>
                <th className="border p-1">Total</th>
                <th className="border p-1">Remarks</th>
                {!readOnly ? (
                  <th className="border p-1 min-w-15">Action</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item, localIdx) => {
                const globalIdx = startIndex + localIdx;
                return (
                  <tr key={item.id || globalIdx}>
                    <td className="border text-center">{globalIdx + 1}</td>
                    {["description", "material"].map((field) => (
                      <td key={field} className="border text-center py-1">
                        {readOnly ? (
                          item[field]
                        ) : (
                          <input
                            value={item[field]}
                            onChange={(e) =>
                              onItemChange?.(globalIdx, field, e.target.value)
                            }
                            className="outline-none w-full text-center"
                          />
                        )}
                      </td>
                    ))}

                    <td className="border text-center">
                      {readOnly ? (
                        <span>{item.uom || "-"}</span>
                      ) : (
                        <Dropdown
                          menu={{
                            items: [
                              { label: "NOS", key: "NOS" },
                              { label: "SET", key: "SET" },
                              { label: "HOURS", key: "HOURS" },
                              { label: "SHEET", key: "SHEET" },
                            ],
                            onClick: (e) =>
                              onItemChange?.(globalIdx, "uom", e.key),
                          }}
                          trigger={["hover"]}
                        >
                          <input
                            value={item.uom ?? ""}
                            onChange={(e) =>
                              onItemChange?.(globalIdx, "uom", e.target.value)
                            }
                            className="outline-none w-full text-center"
                          />
                        </Dropdown>
                      )}
                    </td>

                    <td className="border text-center">
                      {readOnly ? (
                        <span>{item.quantity || "-"}</span>
                      ) : (
                        <input
                          value={item.quantity ?? ""}
                          onChange={(e) =>
                            onItemChange?.(
                              globalIdx,
                              "quantity",
                              e.target.value,
                            )
                          }
                          className="outline-none w-full text-center"
                        />
                      )}
                    </td>
                    <td className="border text-center">
                      {readOnly ? (
                        <span>{item.rate || "-"}</span>
                      ) : (
                        <input
                          value={item.rate ?? ""}
                          onChange={(e) =>
                            onItemChange?.(globalIdx, "rate", e.target.value)
                          }
                          className="outline-none w-full text-center"
                        />
                      )}
                    </td>
                    <td className="border text-center p-0">
                      {readOnly ? (
                        <span>{item.total || "-"}</span>
                      ) : (
                        <input
                          value={
                            item.total ? Number(item.total).toFixed(2) : ""
                          }
                          className="outline-none p-0 w-full text-center"
                          readOnly
                        />
                      )}
                    </td>
                    <td className="border text-center">
                      {readOnly ? (
                        item.remarks || "-"
                      ) : (
                        <input
                          value={item.remarks || ""}
                          onChange={(e) =>
                            onItemChange?.(globalIdx, "remarks", e.target.value)
                          }
                          className="outline-none w-full text-center"
                        />
                      )}
                    </td>
                    {!readOnly ? (
                      <td className="border text-center py-0.5">
                        <AppButton
                          size="xs"
                          // color="red"
                          icon="lucide:trash-2"
                          onClick={() => onDeleteRow?.(globalIdx)}
                          className="!p-1 !bg-transparent !text-red-500 !hover:text-red-600 !border-none !shadow-none "
                        />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {isLastPage && !readOnly ? (
            <div className="flex items-center justify-end p-2 border-b-2 border-red-600">
              <AppButton
                size="xs"
                color="green"
                icon="lucide:plus"
                onClick={onAddRow}
              >
                Add Row
              </AppButton>
            </div>
          ) : null}

          {isLastPage ? (
            <>
              <div
                className={`px-2 py-1 text-sm text-right ${readOnly ? "" : "border-t-0"}`}
              >
                <p>
                  <b>NET : ₹ </b>
                  {Number(data.net_amount).toFixed(2)}
                </p>
                <p>
                  <b>GST @ {data.gst_percentage}% : ₹ </b>
                  {Number(data.gst_amount).toFixed(2)}
                </p>
                <p>
                  <b>TOTAL : ₹ </b>
                  {Number(data.total_amount).toFixed(2)}
                </p>
              </div>
              <div className="border-t-2 border-red-600 p-2 font-bold text-sm">
                Note:{" "}
                <span className="ml-1 text-xs text-red-600">
                  {data.quotation_note ||
                    (quotationNote.length > 0
                      ? quotationNote.map((note) => (
                          <span key={note.id}>{note.note}</span>
                        ))
                      : "")}
                </span>
              </div>
              <div className="border-t-2 border-red-600 p-2 font-bold space-y-1 text-sm">
                <span>Note&apos;s For The Clients :</span>
                {readOnly ? (
                  <span className="ml-1 mt-2 text-red-600 block text-xs">
                    {data.extra_note}
                  </span>
                ) : (
                  <textarea
                    value={data.extra_note}
                    onChange={(e) => onChange?.("extra_note", e.target.value)}
                    className="w-full border border-red-300 rounded p-1 outline-none text-red-600 font-normal"
                    rows={3}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="p-4 text-center text-xs italic text-red-600 font-bold border-t-2 print:border-t-0 border-red-600">
              Continued on next page...
            </div>
          )}

          {/* Flex grow pushes the following content to the bottom of the A4 box */}
          <div className="flex-grow"></div>
          <div className="px-10 py-2 text-center text-sm font-bold">
            Thanking you and soliciting for your valuable order
          </div>

          {/* TERMS & SIGNATURE */}
          <div className="w-full flex justify-between p-2 gap-4 text-xs">
            <div className="space-y-1">
              <p className="font-bold mb-2 text-sm">Terms and Conditions</p>
              {[
                { label: "Payment", field: "payment_terms" },
                { label: "Material", field: "material_terms" },
                { label: "Transport", field: "transport_terms" },
                { label: "Validity", field: "validity_terms" },
              ].map((term) => (
                <div key={term.field} className="flex gap-2 items-center">
                  <span className="w-36">
                    <b>{term.label} :</b>
                  </span>
                  {readOnly ? (
                    <span>{data[term.field] || "-"}</span>
                  ) : (
                    <input
                      value={data[term.field]}
                      onChange={(e) => onChange?.(term.field, e.target.value)}
                      className={`border-b outline-none flex-1 ${showValidation && !data[term.field] ? "border-red-500" : ""}`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Bank Details */}
            <div className="space-y-1">
              <p className="font-bold mb-2 text-sm">Bank Details</p>
              {[
                { label: "Account Number", field: "bank_account_number" },
                { label: "IFSC Code", field: "bank_ifsc_code" },
                { label: "Bank Name", field: "bank_name" },
              ].map((term) => (
                <div key={term.field} className="flex gap-2 items-center">
                  <span className="w-36">
                    <b>{term.label} :</b>
                  </span>
                  {readOnly ? (
                    <span>{data[term.field] || "-"}</span>
                  ) : (
                    <input
                      value={data[term.field]}
                      onChange={(e) => onChange?.(term.field, e.target.value)}
                      className={`border-b outline-none flex-1 ${showValidation && !data[term.field] ? "border-red-500" : ""}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="w-full flex justify-between gap-4 text-xs">
            <div className="space-y-1 min-w-[200px]" />

            {/* SIGNATURE SECTION */}
            <div className="text-left flex flex-col space-y-1 items-end">
              <div className="flex flex-col items-start min-w-[250px]">
                <p className="font-bold text-sm">With Regards</p>
                <p className="font-bold text-sm">For Sakthi Laser Technology</p>
                <div className="mt-2 space-y-1 w-full">
                  {readOnly ? (
                    <>
                      <p>{data.approver_name || "-"}</p>
                      <p>{data.approver_designation || ""}</p>
                      <p>{data.approver_contact || ""}</p>
                    </>
                  ) : (
                    <>
                      <input
                        value={data.approver_name}
                        onChange={(e) =>
                          onChange?.("approver_name", e.target.value)
                        }
                        className={`border-b outline-none block w-full ${showValidation && !data.approver_name ? "border-red-500" : ""}`}
                      />
                      <input
                        value={data.approver_designation}
                        onChange={(e) =>
                          onChange?.("approver_designation", e.target.value)
                        }
                        className={`border-b outline-none block w-full ${showValidation && !data.approver_designation ? "border-red-500" : ""}`}
                      />
                      <input
                        value={data.approver_contact}
                        onChange={(e) =>
                          onChange?.("approver_contact", e.target.value)
                        }
                        className={`border-b outline-none block w-full ${showValidation && !data.approver_contact ? "border-red-500" : ""}`}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="border-t-2 border-red-600 text-center leading-relaxed text-xs p-1 mt-4">
            B1/D, Post Office Road, Ambattur Industrial Estate, Chennai – 600058
            | Ph: 04230 6777 | <b> GST NO : </b> 33ABHFS4876N2ZG |{" "}
            <b> Email : </b> prod@sakthilaser.com / kaviraj@sakthilaser.com /
            admin@sakthilaser.com
          </div>
        </div>
      </div>
    );
  };

  const chunkItems = (items, size) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += size)
      chunks.push(items.slice(i, i + size));
    return chunks.length > 0 ? chunks : [[]];
  };

  return (
    <div className="flex flex-col gap-10 print:gap-0">
      {/* SCREEN VIEW - Continuous List */}
      <div className="print:hidden">{renderPage(data.items, 0, 1, 0)}</div>

      {/* PRINT VIEW - Paginated List */}
      <div className="hidden print:block">
        {chunkItems(data.items, ITEMS_PER_PAGE).map((chunk, idx, allChunks) =>
          renderPage(chunk, idx, allChunks.length, idx * ITEMS_PER_PAGE),
        )}
      </div>
    </div>
  );
};

export default QuotationLayout;
