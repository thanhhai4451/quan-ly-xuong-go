import React from 'react';
import { Avatar, Button, Popconfirm, Space, Tag, Tooltip, Typography } from 'antd';
import {
  ArrowRightOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SwapOutlined,
  WarningOutlined
} from '@ant-design/icons';

const { Text: TypographyText } = Typography;

export const createInventoryColumns = ({
  userRole,
  handleExport,
  openAddStockModal,
  openTransferModal,
  handleOpenEditModal,
  handleDeleteMaterial
}) => [
  {
    title: 'THÔNG TIN VẬT TƯ',
    key: 'info',
    render: (_, record) => (
      <Space size="middle">
        <Avatar
          shape="square"
          size={44}
          style={{
            backgroundColor: Number(record.stock) <= Number(record.minStock) ? '#fff1f0' : '#e6f7ff',
            color: Number(record.stock) <= Number(record.minStock) ? '#ff4d4f' : '#1677ff',
            fontWeight: 800,
            border: '1px solid currentColor'
          }}
        >
          {record.code.substring(0, 2).toUpperCase()}
        </Avatar>
        <div>
          <TypographyText strong style={{ fontSize: '15px' }}>{record.name}</TypographyText><br />
          <Space size={[0, 4]} wrap style={{ marginTop: 4 }}>
            <Tag color="blue" style={{ fontSize: '11px', borderRadius: '4px' }}>#{record.code}</Tag>
            {record.isWood && (
              <>
                <Tag color="orange" style={{ fontSize: '11px', borderRadius: '4px' }}>
                  Khối: {record.blockCount || 0}
                </Tag>
                <Tag color="cyan" style={{ fontSize: '11px', borderRadius: '4px' }}>
                  Thanh: {record.barCount || 0}
                </Tag>
              </>
            )}
          </Space>
        </div>
      </Space>
    )
  },
  {
    title: 'TỒN KHO HIỆN TẠI',
    align: 'center',
    render: (_, record) => (
      <div>
        <TypographyText
          strong
          style={{
            fontSize: '18px',
            color: Number(record.stock) <= Number(record.minStock) ? '#ff4d4f' : '#262626'
          }}
        >
          {record.stock}
        </TypographyText>
        <TypographyText type="secondary" style={{ marginLeft: 4 }}>{record.unit}</TypographyText>
        {Number(record.stock) <= Number(record.minStock) && (
          <div style={{ color: '#ff4d4f', fontSize: '11px', fontWeight: 600 }}>
            <WarningOutlined /> CẦN BỔ SUNG
          </div>
        )}
      </div>
    )
  },
  {
    title: 'THAO TÁC QUẢN LÝ',
    align: 'right',
    render: (_, record) => (
      <Space>
        <Button type="primary" shape="round" icon={<ArrowRightOutlined />} onClick={() => handleExport(record)}>
          Xuất Kho
        </Button>
        <Button type="default" shape="round" icon={<PlusOutlined />} onClick={() => openAddStockModal(record)}>
          Nhập Thêm
        </Button>
        {userRole !== 'STAFF' && (
          <>
            <Tooltip title="Chuyển sang nhóm khác">
              <Button type="text" icon={<SwapOutlined />} onClick={() => openTransferModal(record)} />
            </Tooltip>
            <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)} />
            <Popconfirm title="Xóa vật tư này khỏi hệ thống?" onConfirm={() => handleDeleteMaterial(record)}>
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </>
        )}
      </Space>
    )
  }
];
