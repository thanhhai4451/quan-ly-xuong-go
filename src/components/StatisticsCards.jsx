import React from "react";
import { Row, Col, Card, Statistic } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";

const StatisticsCards = ({ stats }) => {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
      <Col xs={12} sm={6}>
        <Card size="small" style={{ borderTop: "4px solid #1890ff" }}>
          <Statistic
            title="TỔNG ĐƠN"
            value={stats.total}
            prefix={<AppstoreOutlined />}
          />
        </Card>
      </Col>

      <Col xs={12} sm={6}>
        <Card size="small" style={{ borderTop: "4px solid #faad14" }}>
          <Statistic
            title="ĐANG LÀM"
            value={stats.pending}
            styles={{ content: { color: "#faad14" } }}
          />
        </Card>
      </Col>

      <Col xs={12} sm={6}>
        <Card size="small" style={{ borderTop: "4px solid #52c41a" }}>
          <Statistic
            title="CHỜ GIAO"
            value={stats.completed}
            styles={{ content: { color: "#52c41a" } }}
          />
        </Card>
      </Col>

      <Col xs={12} sm={6}>
        <Card size="small" style={{ borderTop: "4px solid #ff4d4f" }}>
          <Statistic
            title="TRỄ HẠN"
            value={stats.overdue}
            styles={{ content: { color: "#ff4d4f" } }}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default StatisticsCards;