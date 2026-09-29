import React, { useEffect } from "react";
import { Form, Input, Typography, Checkbox } from "antd";
import GlobalModal from "@/components/ReusableComponents/GlobalModal";
import {
  StyledFormItem,
  INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";
import { validatePassword } from "./userUtils";

const { Text } = Typography;

const EditUserModal = ({
  open,
  onCancel,
  onSubmit,
  loading = false,
  allRoles = [],
  user = null,
}) => {
  const [form] = Form.useForm();
  const isAdmin = Form.useWatch("isAdmin", form);

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        username: user.username,
        email: user.email,
        password: "", // Password optional on edit
        roles: user.roles || [],
        isAdmin: !!user.isAdmin,
        has_user_management: !!user.has_user_management,
      });
    }
  }, [open, user, form]);

  const handleConfirm = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit({
        id: user?.id,
        values: {
          username: values.username.trim(),
          email: values.email?.trim(),
          password: values.password || undefined,
          roles: values.roles || [],
          isAdmin: !!values.isAdmin,
          has_user_management: values.isAdmin ? !!values.has_user_management : false,
        },
      });
      form.resetFields();
    } catch (err) {
      // Handled by caller
    }
  };

  const handleClose = () => {
    form.resetFields();
    onCancel?.();
  };

  return (
    <GlobalModal
      open={open}
      title="Edit User"
      onCancel={handleClose}
      onConfirm={handleConfirm}
      confirmText="Save Changes"
      cancelText="Cancel"
      loading={loading}
      width={550}
    >
      <Form form={form} layout="vertical" className="pt-1 space-y-1">
        <div className="grid grid-cols-2 gap-3">
          <StyledFormItem
            name="username"
            label="Username"
            rules={[{ required: true, message: "Username required" }]}
          >
            <Input placeholder="Username" className={INPUT_CLASS} />
          </StyledFormItem>

          <StyledFormItem
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Email required" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input placeholder="Email" className={INPUT_CLASS} />
          </StyledFormItem>
        </div>

        <StyledFormItem
          name="password"
          label="New Password (Optional)"
          extra={
            <Text
              type="secondary"
              className="!text-[10px] text-gray-500 block leading-tight mt-0.5"
            >
              Must be at least 8 characters with 1 uppercase, 1 lowercase, 1
              number & 1 special character.
            </Text>
          }
          rules={[
            {
              validator: (_, val) => validatePassword(_, val, false),
            },
          ]}
        >
          <Input.Password
            placeholder="Leave blank to keep current"
            className={INPUT_CLASS}
          />
        </StyledFormItem>

        <StyledFormItem
          name="roles"
          label="Roles"
          rules={[
            {
              validator: (_, val) =>
                val && val.length > 0
                  ? Promise.resolve()
                  : Promise.reject(new Error("Please select at least one role")),
            },
          ]}
        >
          <Checkbox.Group className="w-full">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {allRoles.map((role) => (
                <Checkbox
                  key={role.id}
                  value={role.name}
                  className="!text-[11px] font-medium"
                >
                  {role.name.toUpperCase()}
                </Checkbox>
              ))}
            </div>
          </Checkbox.Group>
        </StyledFormItem>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <StyledFormItem
            name="isAdmin"
            label="Admin Access"
            valuePropName="checked"
          >
            <Checkbox
              className="!text-[11px] font-semibold"
              onChange={(e) => {
                if (e.target.checked) {
                  form.setFieldValue(
                    "roles",
                    allRoles.map((r) => r.name)
                  );
                  form.validateFields(["roles"]).catch(() => {});
                } else {
                  form.setFieldValue("has_user_management", false);
                }
              }}
            >
              ADMIN
            </Checkbox>
          </StyledFormItem>

          <StyledFormItem
            name="has_user_management"
            label="User Management Access"
            valuePropName="checked"
          >
            <Checkbox
              className="!text-[11px] font-semibold"
              disabled={!isAdmin}
            >
              Can Manage Users
            </Checkbox>
          </StyledFormItem>
        </div>
      </Form>
    </GlobalModal>
  );
};

export default React.memo(EditUserModal);
