import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { Form, Input, message } from "antd";
import { Icon } from "@iconify/react";
import { ROUTES } from "@/Routes/routes.constants";
import StyledFormItem, {
  INPUT_CLASS,
} from "@/components/ReusableComponents/FormItem";
import Button from "@/components/ReusableComponents/Button";
import { useLoginUserMutation } from "@/store/services/auth.api";

const Login = () => {
  const [form] = Form.useForm();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginUser, { isLoading }] = useLoginUserMutation();

  const onFinish = async (values) => {
    try {
      const loginData = {
        username: values.username,
        password: values.password,
      };

      const data = await loginUser(loginData).unwrap();
      message.success("Login Successful!");

      const authData = {
        user: data.user || {
          username: data.username,
          email: data.email,
          isAdmin: data.isAdmin,
          has_user_management: data.has_user_management,
          roles: data.roles,
        },
        token: data.accesstoken || data.token,
      };

      login(authData);
      navigate(ROUTES.DASHBOARD.MAIN, { replace: true });
    } catch (err) {
      const msg =
        err?.data?.error ||
        err?.data?.message ||
        "Server error while logging in. Please try again.";
      message.error(msg);
    }
  };

  return (
    <section className="bg-primary">
      <div className="w-full xl:min-h-screen flex items-center justify-center py-10">
        <div className="w-full max-w-sm space-y-4">
          {/* Branding Area */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src="/logoWithName.svg"
                alt="Sakthi Laser"
                className="h-10 w-auto"
              />
            </div>
            <h1 className="heading-primary">Sakthi ERP Portal</h1>
            <p className="description-primary">
              Enterprise Resource Management
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-xl shadow-md p-4">
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              autoComplete="off"
            >
              <StyledFormItem
                name="username"
                label="Username"
                rules={[
                  { required: true, message: "Please enter your username." },
                ]}
              >
                <Input
                  prefix={
                    <Icon
                      icon="mdi:account-outline"
                      className="text-slate-400 text-lg"
                    />
                  }
                  placeholder="Enter your assigned username"
                  disabled={isLoading}
                  size="large"
                  className={INPUT_CLASS}
                />
              </StyledFormItem>

              <StyledFormItem
                name="password"
                label="Password"
                rules={[
                  { required: true, message: "Please enter your password." },
                ]}
              >
                <Input.Password
                  prefix={
                    <Icon
                      icon="mdi:lock-outline"
                      className="text-slate-400 text-lg"
                    />
                  }
                  placeholder="••••••••"
                  disabled={isLoading}
                  size="large"
                  className={INPUT_CLASS}
                />
              </StyledFormItem>

              <div className="mt-4">
                <Button
                  type="submit"
                  loading={isLoading}
                  color="blue"
                  size="md"
                  icon="mdi:login"
                  className="w-full"
                >
                  {isLoading ? "Authenticating..." : "Sign in to Portal"}
                </Button>
              </div>
            </Form>
          </div>

          {/* Footer */}
          <div className="flex flex-col items-center">
            <h1 className="text-center text-xs text-slate-500 font-semibold uppercase tracking-wide leading-loose">
              Authorized Personnel Only
            </h1>
            <p className="opacity-40 text-xs font-medium lowercase">
              © Sakthi Laser Technology. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
