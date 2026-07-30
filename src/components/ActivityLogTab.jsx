import React from "react";
import {
  Card,
  Input,
  Collapse,
  Table,
  Tag,
  Typography,
  Badge,
  Space,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Panel } = Collapse;
const { Text } = Typography;

const ActivityLogTab = ({ orders, searchLog, onSearchLogChange }) => {
  return (
    <Card>
      <Input
        placeholder="Tìm đơn hoặc người làm..."
        style={{ marginBottom: 20, width: 300 }}
        prefix={<SearchOutlined />}
        onChange={(e) => onSearchLogChange(e.target.value)}
        allowClear
      />
      <Collapse accordion>
        {orders.map((order) => {
          let logs = [];
          order.chiTiet?.forEach((item) => {
            item.lichSu?.forEach((log) => {
              if (
                !searchLog ||
                order.tenSP
                  .toLowerCase()
                  .includes(searchLog.toLowerCase()) ||
                log.userEmail
                  .toLowerCase()
                  .includes(searchLog.toLowerCase())
              )
                logs.push({ ...log, detailName: item.name });
            });
          });
          if (logs.length === 0) return null;
          return (
            <Panel
              header={
                <Text strong>
                  {order.tenSP}{" "}
                  <Badge
                    count={logs.length}
                    style={{
                      backgroundColor: "#52c41a",
                      marginLeft: 10,
                    }}
                  />
                </Text>
              }
              key={order.fbKey}
            >
              <Table
                dataSource={logs.sort((a, b) => b.id - a.id)}
                size="small"
                pagination={{ pageSize: 8 }}
                columns={[
                  {
                    title: "Thời gian",
                    dataIndex: "ngay",
                    width: 130,
                  },
                  { title: "Chi tiết", dataIndex: "detailName" },
                  {
                    title: "Tổ",
                    dataIndex: "to",
                    render: (t) => <Tag color="blue">{t}</Tag>,
                  },
                  {
                    title: "SỐ LƯỢNG CHỐT",
                    dataIndex: "sl",
                    render: (s, record) => (
                      <Space>
                        <Text strong style={{ color: "#1890ff" }}>
                          {s}
                        </Text>
                        <Text type="secondary" style={{ fontSize: "11px" }}>
                          (
                          {record.chenhLech > 0
                            ? `+${record.chenhLech}`
                            : record.chenhLech}
                          )
                        </Text>
                      </Space>
                    ),
                  },
                  {
                    title: "Người làm",
                    dataIndex: "userEmail",
                    render: (e) => (
                      <Text type="secondary">{e.split("@")[0]}</Text>
                    ),
                  },
                  {
                    title: "Tình trạng",
                    dataIndex: "tre",
                    render: (t) =>
                      t > 0 ? (
                        <Tag color="error">Trễ {t} ngày</Tag>
                      ) : (
                        <Tag color="success">Đúng hạn</Tag>
                      ),
                  },
                ]}
              />
            </Panel>
          );
        })}
      </Collapse>
    </Card>
  );
};

export default ActivityLogTab;
