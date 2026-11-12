import React from "react";
import {
  Card,
  Typography,
  Row,
  Col,
  Space,
  Popover,
  Button,
  Avatar,
  Tag,
} from "antd";
import {
  BuildOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { ref, remove } from "firebase/database";
import { db } from "../firebase";
import NotificationIcon from "./NotificationIcon";

const { Title, Text } = Typography;

const AppHeader = ({
  notifications,
  onDeleteNoti,
  user,
  onLogout,
}) => {
  return (
    <Card
      styles={{ body: { padding: "15px 25px" } }}
      style={{
        borderRadius: 12,
        marginBottom: 20,
        border: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={3} style={{ margin: 0, color: "#001529" }}>
            <BuildOutlined /> CÔNG TY TNHH MAI ANH HÙNG FURNITURE
          </Title>
        </Col>
        <Col>
          <Space size="large">
            <Popover
              placement="bottomRight"
              trigger="click"
              content={
                <div style={{ width: 320, maxHeight: 400, overflowY: "auto" }}>
                  <div
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid #f0f0f0",
                      fontWeight: "bold",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#fafafa",
                    }}
                  >
                    <span>THÔNG BÁO ({notifications.length})</span>
                    {notifications.some((n) => n.fbKey) && (
                      <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() => remove(ref(db, "notifications/"))}
                      >
                        Xóa hết
                      </Button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "#8c8c8c",
                      }}
                    >
                      Không có thông báo mới
                    </div>
                  ) : (
                    notifications.map((item) => {
                      const isOverdue = item.type === "danger";
                      const isSystemNoti = !item.fbKey;

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            padding: "12px",
                            borderBottom: "1px solid #f0f0f0",
                            background: isOverdue ? "#fff1f0" : "#fffbe6",
                            transition: "background 0.3s",
                            position: "relative",
                            cursor: "default",
                          }}
                        >
                          <div style={{ marginRight: 12 }}>
                            <Avatar
                              size="large"
                              icon={
                                isOverdue ? (
                                  <AlertOutlined />
                                ) : (
                                  <ClockCircleOutlined />
                                )
                              }
                              style={{
                                backgroundColor: isOverdue
                                  ? "#cf1322"
                                  : "#faad14",
                              }}
                            />
                          </div>
                          <div style={{ flex: 1, paddingRight: "20px" }}>
                            <div
                              style={{
                                fontWeight: "bold",
                                fontSize: "14px",
                                color: isOverdue ? "#cf1322" : "#d48806",
                              }}
                            >
                              {isOverdue && "⚠️ "}
                              {item.title}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#434343",
                                marginTop: 4,
                              }}
                            >
                              {item.content}
                            </div>
                            <Tag
                              color={isOverdue ? "error" : "warning"}
                              style={{ marginTop: 8, fontWeight: "bold" }}
                            >
                              {item.time}
                            </Tag>
                          </div>

                          {!isSystemNoti && (
                            <Button
                              type="text"
                              size="small"
                              icon={
                                <PlusOutlined
                                  style={{
                                    transform: "rotate(45deg)",
                                    color: "#bfbfbf",
                                  }}
                                />
                              }
                              onClick={() => onDeleteNoti(item)}
                              style={{
                                position: "absolute",
                                top: "8px",
                                right: "8px",
                                height: "22px",
                                width: "22px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              }
            >
              <span style={{ cursor: "pointer", display: "inline-block" }}>
                <NotificationIcon
                  count={notifications.length}
                  hasDanger={notifications.some((n) => n.type === "danger")}
                />
              </span>
            </Popover>

            <div style={{ textAlign: "right", lineHeight: "1.2" }}>
              <Text type="secondary" style={{ fontSize: "11px" }}>
                Chào đại ca,
              </Text>
              <br />
              <Text strong style={{ color: "#1890ff" }}>
                {user?.email.split("@")[0]}
              </Text>
            </div>
            <Button danger ghost onClick={onLogout} icon={<LogoutOutlined />}>
              Thoát
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

export default AppHeader;
