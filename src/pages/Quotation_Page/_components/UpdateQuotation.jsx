import React, { useCallback, useEffect, useState } from "react";
import { Select, Input, message } from "antd";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import { useUpdateQuotationStatusMutation } from "@/store/services/quotation.api";
const { TextArea } = Input;

const formatIndianNumber = (val) => {
  if (val === null || val === undefined || val === "") return "";
  let clean = String(val).replace(/[^0-9.]/g, "");
  const parts = clean.split(".");
  if (parts.length > 2) {
    clean = parts[0] + "." + parts.slice(1).join("");
  }
  const [integerPart, decimalPart] = clean.split(".");
  let formattedInteger = "";
  if (integerPart) {
    let lastThree = integerPart.slice(-3);
    let otherDigits = integerPart.slice(0, -3);
    if (otherDigits !== "") {
      lastThree = "," + lastThree;
    }
    formattedInteger =
      otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  }
  if (decimalPart !== undefined) {
    return `${formattedInteger}.${decimalPart}`;
  }
  return formattedInteger;
};

const UpdateQuotationPopup = ({ isOpen, onClose, quotation, onUpdate }) => {
  const [status, setStatus] = useState("");
  const [billedValue, setBilledValue] = useState("");
  const [remark, setRemark] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [updateQuotationHook, { isLoading: loading }] =
    useUpdateQuotationStatusMutation();
  useEffect(() => {
    if (quotation && isOpen) {
      setStatus("");
      setBilledValue(
        quotation.billed_value !== null && quotation.billed_value !== undefined
          ? formatIndianNumber(quotation.billed_value)
          : "",
      );
      setRemark(quotation.remarks || "");
    }
  }, [quotation, isOpen]);
  const resetAndClose = useCallback(() => {
    setStatus("");
    setBilledValue("");
    setRemark("");
    onClose();
  }, [onClose]);
  const updateQuotation = useCallback(async () => {
    if (!quotation) return;
    try {
      const numericBilled = parseFloat(String(billedValue).replace(/,/g, "")) || 0;
      const payload = {
        id: quotation.id,
        status,
      };
      if (status === "won") {
        payload.billed_value = numericBilled;
        if (remark) payload.remarks = remark;
      }
      if (status === "lost") {
        payload.remarks = remark;
      }
      await updateQuotationHook(payload).unwrap();
      message.success("Quotation updated successfully");
      onUpdate({ ...payload, id: quotation.id });
      resetAndClose();
    } catch (err) {
      const error = err;
      message.error(
        error?.data?.message || error?.message || "Something went wrong",
      );
    } finally {
      setShowConfirmDialog(false);
    }
  }, [
    quotation,
    status,
    billedValue,
    remark,
    onUpdate,
    resetAndClose,
    updateQuotationHook,
  ]);
  const handleSubmit = async () => {
    if (!quotation) return;
    if (!status) {
      message.error("Please select a status");
      return;
    }
    if (status === "won") {
      const numericBilled = parseFloat(String(billedValue).replace(/,/g, ""));
      const total = Number(quotation.total_amount || 0);
      if (!billedValue || isNaN(numericBilled)) {
        message.error("Valid billed value is required");
        return;
      }
      if (numericBilled > total) {
        setShowConfirmDialog(true);
        return;
      }
    }
    if (status === "lost" && !remark.trim()) {
      message.error("Remark is required when status is 'Lost'");
      return;
    }
    await updateQuotation();
  };
  const handleStatusChange = (value) => {
    setStatus(value);
    setBilledValue("");
    setRemark("");
  };
  return (
    <>
      <GlobalModal
        open={isOpen}
        title="Update Quotation Status"
        onConfirm={handleSubmit}
        onCancel={loading ? undefined : onClose}
        confirmText="Update"
        confirmIcon="lucide:check"
        loading={loading}
        confirmColor="blue"
        cancelColor="cancel"
        width={500}
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium block">Status *</label>
            <Select
              className="w-full"
              placeholder="Select status"
              value={status || undefined}
              onChange={handleStatusChange}
              options={[
                { value: "won", label: "Won" },
                { value: "lost", label: "Lost" },
              ]}
            />
          </div>

          {status === "won" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium block">
                  Estimated Quote Value
                </label>
                <div className="px-3 py-2 bg-slate-100 rounded-md text-sm font-semibold text-slate-700">
                  ₹{" "}
                  {Number(quotation?.total_amount || 0).toLocaleString(
                    "en-IN",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">
                  Finalized Quote Value
                </label>
                <Input
                  type="text"
                  placeholder="Enter Finalized Quote Value"
                  value={billedValue}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    setBilledValue(formatIndianNumber(raw));
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">
                  Remarks (Optional)
                </label>
                <TextArea
                  placeholder="Enter any remarks or notes"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          ) : null}

          {status === "lost" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium block">Remark *</label>
              <TextArea
                placeholder="Enter reason for losing"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
              />
            </div>
          ) : null}
        </div>
      </GlobalModal>

      <GlobalModal
        open={showConfirmDialog}
        title="Billed Value Exceeds Total Amount"
        onConfirm={updateQuotation}
        onCancel={() => setShowConfirmDialog(false)}
        confirmText="Update"
        confirmIcon="lucide:check"
        loading={loading}
        confirmColor="amber"
        cancelColor="cancel"
        width={450}
      >
        <p className="py-2 text-slate-600">
          The billed value is greater than the quotation total amount. Are you
          sure you want to continue?
        </p>
      </GlobalModal>
    </>
  );
};
export default UpdateQuotationPopup;
