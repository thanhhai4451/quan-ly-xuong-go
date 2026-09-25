import React from 'react';
import { Button, Card, DatePicker, Table, Tag, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

const InventoryMovementReport = ({
  data,
  month,
  onMonthChange,
  onExport
}) => {
  const columns = [
    {
      title: 'MÃ VẬT TƯ',
      dataIndex: 'code',
      fixed: 'left',
      width: 130,
      render: value => <Text strong>{value}</Text>
    },
    { title: 'TÊN VẬT TƯ', dataIndex: 'name', width: 220 },
    { title: 'ĐVT', dataIndex: 'unit', width: 80, align: 'center' },
    { title: 'TỒN ĐẦU KỲ', dataIndex: 'openingStock', width: 120, align: 'right' },
    {
      title: 'NHẬP TRONG KỲ',
      dataIndex: 'inbound',
      width: 130,
      align: 'right',
      render: value => <Tag color="green">+{value}</Tag>
    },
    {
      title: 'XUẤT TRONG KỲ',
      dataIndex: 'outbound',
      width: 130,
      align: 'right',
      render: value => <Tag color="volcano">-{value}</Tag>
    },
    {
      title: 'TỒN CUỐI KỲ',
      dataIndex: 'closingStock',
      width: 120,
      align: 'right',
      render: value => <Text strong>{value}</Text>
    },
    { title: 'TỒN HIỆN TẠI', dataIndex: 'currentStock', width: 120, align: 'right' }
  ];

  return (
    <Card
      className="inventory-report"
      title="BÁO CÁO XUẤT - NHẬP - TỒN KHO"
      extra={(
        <div className="inventory-report__controls">
          <DatePicker picker="month" value={month} onChange={value => value && onMonthChange(value)} format="MM/YYYY" />
          <Button icon={<DownloadOutlined />} onClick={onExport}>Xuất Excel</Button>
        </div>
      )}
    >
      <Table
        rowKey="key"
        dataSource={data}
        columns={columns}
        scroll={{ x: 1050 }}
        pagination={{ pageSize: 10 }}
        summary={() => {
          const totals = data.reduce((result, row) => ({
            openingStock: result.openingStock + row.openingStock,
            inbound: result.inbound + row.inbound,
            outbound: result.outbound + row.outbound,
            closingStock: result.closingStock + row.closingStock,
            currentStock: result.currentStock + row.currentStock
          }), { openingStock: 0, inbound: 0, outbound: 0, closingStock: 0, currentStock: 0 });

          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}><Text strong>TỔNG CỘNG</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><Text strong>{totals.openingStock}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><Tag color="green">+{totals.inbound}</Tag></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><Tag color="volcano">-{totals.outbound}</Tag></Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right"><Text strong>{totals.closingStock}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right"><Text strong>{totals.currentStock}</Text></Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />
    </Card>
  );
};

export default InventoryMovementReport;
