import React from 'react';
import { Card, Col, DatePicker, Row, Statistic, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, StockOutlined } from '@ant-design/icons';

const { Text } = Typography;

const MonthlyInventorySummary = ({ cardStyle, month, onMonthChange, inbound, outbound, currentStock }) => (
  <Card style={{ ...cardStyle, marginBottom: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div>
        <Text strong style={{ fontSize: 16 }}>BÁO CÁO NHẬP - XUẤT - TỒN</Text><br />
        <Text type="secondary">Số liệu theo nhóm vật tư đang chọn</Text>
      </div>
      <DatePicker picker="month" value={month} onChange={onMonthChange} format="MM/YYYY" />
    </div>
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={8}>
        <Statistic title="TỔNG NHẬP TRONG THÁNG" value={inbound} valueStyle={{ color: '#1677ff' }} prefix={<ArrowDownOutlined />} />
      </Col>
      <Col xs={24} sm={8}>
        <Statistic title="TỔNG XUẤT TRONG THÁNG" value={outbound} valueStyle={{ color: '#ff4d4f' }} prefix={<ArrowUpOutlined />} />
      </Col>
      <Col xs={24} sm={8}>
        <Statistic title="TỒN HIỆN TẠI" value={currentStock} valueStyle={{ color: '#52c41a' }} prefix={<StockOutlined />} />
      </Col>
    </Row>
  </Card>
);

export default MonthlyInventorySummary;
