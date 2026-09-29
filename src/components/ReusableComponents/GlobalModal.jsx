import { Modal } from "antd";
import Button from "@/components/ReusableComponents/Button";

const GlobalModal = ({
  open,
  title = "Confirm Action",
  description,
  children,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmIcon = "lucide:check",
  cancelIcon = "lucide:x",
  loading = false,
  confirmColor = "blue",
  cancelColor = "cancel",
  width = 500,
  closeIcon = true,
  styles,
}) => {
  return (
    <Modal
      title={
        typeof title === "string" ? (
          <div className="text-sm font-semibold text-gray-900 border-b pb-1.5">
            {title}
          </div>
        ) : (
          title
        )
      }
      open={open}
      onCancel={() => !loading && onCancel && onCancel()}
      footer={null}
      centered
      closeIcon={closeIcon}
      width={width}
      className="max-w-[95vw] [&_.ant-modal-content]:!p-3.5 [&_.ant-modal-header]:!mb-1 [&_.ant-modal-header]:!bg-transparent [&_.ant-modal-body]:!overflow-visible"
    >
      <div className="text-xs text-gray-700">
        {children || (description && <p className="text-gray-600 text-xs mb-2">{description}</p>)}
      </div>

      <div className="flex justify-end gap-2 w-full pt-2">
        <Button
          size="xs"
          color={cancelColor}
          icon={cancelIcon}
          onClick={onCancel}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          size="xs"
          color={confirmColor}
          icon={confirmIcon}
          onClick={onConfirm}
          loading={loading}
        >
          {loading ? "Submitting..." : confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default GlobalModal;
