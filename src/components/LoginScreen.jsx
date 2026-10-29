import React from "react";
import { Card, Typography, Form, Input, Button } from "antd";
import { BuildOutlined, UserOutlined, LockOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const LoginScreen = ({ loginForm, onLogin }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <style>{`
          .login-card {
            background: rgba(255, 255, 255, 0.85) !important;
            backdrop-filter: blur(15px); /* Hiệu ứng làm mờ nền sau kính */
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            box-shadow: 0 25px 50px rgba(0,0,0,0.5) !important;
            border-radius: 24px !important;
          }
          .login-button {
            height: 50px !important;
            font-weight: 700 !important;
            font-size: 16px !important;
            background: #1890ff !important;
            border-radius: 12px !important;
            border: none !important;
            box-shadow: 0 4px 14px 0 rgba(24, 144, 255, 0.39);
            transition: all 0.3s ease;
          }
          .login-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(24, 144, 255, 0.45);
          }
          .input-custom {
            border-radius: 10px !important;
            height: 45px !important;
          }
        `}</style>

      <Card
        className="login-card"
        style={{ width: 420, padding: "30px 15px", textAlign: "center" }}
      >
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              width: 90,
              height: 90,
              background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
              borderRadius: "22px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "0 auto 20px",
              transform: "rotate(-10deg)",
              boxShadow: "0 10px 20px rgba(24, 144, 255, 0.3)",
            }}
          >
            <BuildOutlined
              style={{
                fontSize: 45,
                color: "#fff",
                transform: "rotate(10deg)",
              }}
            />
          </div>
          <Title
            level={2}
            style={{
              margin: 0,
              color: "#001529",
              fontWeight: 800,
              letterSpacing: "1.5px",
            }}
          >
            MAH FURNITURE
          </Title>
          <div
            style={{
              height: "2px",
              width: "50px",
              background: "#1890ff",
              margin: "10px auto",
            }}
          ></div>
          <Text type="secondary" style={{ fontSize: "15px", fontWeight: 500 }}>
            Hệ thống Quản lý Sản xuất
          </Text>
        </div>

        <Form form={loginForm} onFinish={onLogin} layout="vertical">
          <Form.Item
            name="email"
            rules={[{ required: true, message: "Nhập email đi đại ca!" }]}
          >
            <Input
              className="input-custom"
              prefix={<UserOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="Email tài khoản"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "Quên mật khẩu rồi hả đại ca?" },
            ]}
          >
            <Input.Password
              className="input-custom"
              prefix={<LockOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="Mật khẩu"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 25 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              className="login-button"
            >
              ĐĂNG NHẬP HỆ THỐNG
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 30 }}>
          <Text type="secondary" style={{ fontSize: "12px", opacity: 0.8 }}>
            © 2025 MAH Furniture | Quality First
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginScreen;
