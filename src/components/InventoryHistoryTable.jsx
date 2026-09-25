import React from 'react';
import { Button, DatePicker, Input, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, PrinterOutlined, RollbackOutlined, SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;

const InventoryHistoryTable = ({
  data,
  selectedKeys,
  onSelectedKeysChange,
  searchValue,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  userRole,
  onBatchDelete,
  onPrint,
  onRollback
}) => {
  const columns = [
    { title: 'THỜI GIAN', dataIndex: 'time', width: 160 },
    { title: 'MÃ & TÊN VẬT TƯ', render: (_, record) => <Text strong>{record.code} - {record.name}</Text> },
    {
      title: 'SỐ LƯỢNG',
      render: (_, record) => record.type === 'NHAP'
        ? <Tag color="green">+{record.qty} {record.unit}</Tag>
        : <Tag color="volcano">-{record.qty} {record.unit}</Tag>
    },
    { title: 'NGƯỜI NHẬN', dataIndex: 'receiver' },
    { title: 'LÝ DO', dataIndex: 'reason' },
    {
      title: 'THAO TÁC BẢO MẬT',
      align: 'center',
      render: (_, record) => (
        <Space wrap>
          <Tooltip title="In lại phiếu PDF">
            <Button type="text" icon={<PrinterOutlined />} onClick={() => onPrint(record)} />
          </Tooltip>
          {record.type === 'NHAP' ? (
            <Tag color="green">Nhập kho</Tag>
          ) : userRole === 'ADMIN' ? (
            <Popconfirm title="Hoàn tác xuất kho và hoàn lại số lượng tồn?" onConfirm={() => onRollback(record)}>
              <Button type="link" danger icon={<RollbackOutlined />}>Hoàn Tác</Button>
            </Popconfirm>
          ) : <Tag>Không đủ quyền</Tag>}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <Space size="middle">
          <Input
            value={searchValue}
            placeholder="Tìm theo mã, tên, người nhận..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            onChange={onSearchChange}
          />
          <DatePicker.RangePicker value={dateRange} onChange={onDateRangeChange} />
        </Space>
        {selectedKeys.length > 0 && userRole === 'ADMIN' && (
          <Popconfirm
            title={`Xóa vĩnh viễn ${selectedKeys.length} dòng lịch sử đã chọn?`}
            onConfirm={onBatchDelete}
          >
            <Button type="primary" danger icon={<DeleteOutlined />}>
              Xóa Lịch Sử Đã Chọn ({selectedKeys.length})
            </Button>
          </Popconfirm>
        )}
      </div>
      <Table
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: onSelectedKeysChange }}
        rowKey="key"
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 8 }}
      />
    </div>
  );
};

export default InventoryHistoryTable;
