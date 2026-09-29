import React, { useEffect } from "react";
import { useAuth } from "@/context/useAuth";
import { Input, Form, Typography, message } from "antd";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import Button from "@/components/ReusableComponents/Button";
import LoadingState from "@/pages/errorPage/LoadingState";
import ErrorState from "@/pages/errorPage/ErrorState";
import {
  StyledFormItem,
  TEXTAREA_CLASS,
} from "@/components/ReusableComponents/FormItem";
import {
  useGetQuotationNoteQuery,
  useAddQuotationNoteMutation,
  useUpdateQuotationNoteMutation,
} from "@/store/services/quotation.api";

const { Text } = Typography;
const { TextArea } = Input;

const AdminQuotationNote = () => {
  const {
    data: noteList = [],
    isLoading: loading,
    isError,
    refetch,
  } = useGetQuotationNoteQuery(undefined);
  const [addNote, { isLoading: adding }] = useAddQuotationNoteMutation();
  const [updateNote, { isLoading: updating }] =
    useUpdateQuotationNoteMutation();
  const [form] = Form.useForm();
  const { user } = useAuth();
  const username = user?.username || "";

  // The single note to manage
  const currentNote = noteList.length > 0 ? noteList[0] : null;

  // Pre-fill form when data arrives
  useEffect(() => {
    if (currentNote) {
      form.setFieldsValue({ note: currentNote.note });
    }
  }, [currentNote, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (currentNote) {
        // Update existing note
        await updateNote({
          pk: currentNote.id,
          note: values.note,
          created_by: username,
        }).unwrap();
        message.success("Quotation Note Updated Successfully");
      } else {
        // Create initial note
        await addNote({
          note: values.note.trim(),
          created_by: username,
        }).unwrap();
        message.success("Initial Quotation Note Created");
      }
      refetch();
    } catch (err) {
      if (err.errorFields) return;
      message.error(
        err.data?.message ||
        err.data?.error ||
        "Failed to save quotation note.",
      );
    }
  };

  if (loading) {
    return <LoadingState message="Loading quotation terms..." />;
  }

  if (isError) {
    return (
      <ErrorState
        error={isError}
        description="Failed to load quotation notes. Please check your backend connection."
        onRetry={refetch}
        showHomeButton={false}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Quotation Terms / Notes"
        actions={
          <Button
            onClick={handleSave}
            loading={adding || updating}
            icon="lucide:save"
          >
            Save Changes
          </Button>
        }
      />

      <div className="bg-white rounded-lg">
        <Form form={form} layout="vertical">
          <StyledFormItem
            name="note"
            extra={
              <Text type="secondary" className="!text-[10px] text-slate-500 block mt-1">
                * This note will appear at the bottom of all generated quotations.
              </Text>
            }
            rules={[
              { required: true, message: "Note content cannot be empty" },
            ]}
          >
            <TextArea
              placeholder="Enter quotation terms, delivery info, or other default notes here..."
              rows={6}
              className={`${TEXTAREA_CLASS} !p-3 !leading-relaxed`}
            />
          </StyledFormItem>
        </Form>
      </div>
    </div>
  );
};

export default AdminQuotationNote;
