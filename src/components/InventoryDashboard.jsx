import React from 'react';
import { Button, Card, Col, Row, Space, Statistic, Typography } from 'antd';
import { FileExcelOutlined, InboxOutlined, PlusOutlined, StockOutlined, WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

const InventoryDashboard = ({
  cardStyle,
  itemCount,
  lowStockCount,
  totalInventory,
  onExportExcel,
  onImportExcel
}) => (
  <Row className="inventory-dashboard" gutter={[16, 16]} style={{ marginBottom: 24 }}>
    <Col span={6}>
      <Card className="inventory-dashboard__card" style={cardStyle}>
        <Statistic title="MẶT HÀNG TRONG KHO" value={itemCount} prefix={<InboxOutlined style={{ color: '#1677ff' }} />} />
      </Card>
    </Col>
    <Col span={6}>
      <Card className="inventory-dashboard__card" style={cardStyle}>
        <Statistic
          title="CẢNH BÁO TỒN THẤP"
          value={lowStockCount}
          valueStyle={{ color: lowStockCount > 0 ? '#ff4d4f' : '#52c41a' }}
          prefix={<WarningOutlined />}
        />
      </Card>
    </Col>
    <Col span={6}>
      <Card className="inventory-dashboard__card" style={cardStyle}>
        <Statistic title="TỔNG SỐ LƯỢNG TỒN" value={totalInventory} prefix={<StockOutlined style={{ color: '#52c41a' }} />} />
      </Card>
    </Col>
    <Col span={6}>
      <Card className="inventory-dashboard__card" style={cardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Text type="secondary">CÔNG CỤ EXCEL PRO</Text>
          <Space className="inventory-dashboard__excel-tools" wrap>
            <Button icon={<FileExcelOutlined />} onClick={onExportExcel} type="dashed">Xuất Excel</Button>
            <label htmlFor="excel-import" style={{ cursor: 'pointer' }}>
              <Button icon={<PlusOutlined />} type="dashed" component="span">Import Excel</Button>
            </label>
            <input id="excel-import" type="file" accept=".xlsx, .xls" onChange={onImportExcel} style={{ display: 'none' }} />
          </Space>
        </div>
      </Card>
    </Col>
  </Row>
);

export default InventoryDashboard;
