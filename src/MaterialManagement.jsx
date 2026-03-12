import React, { useState, useEffect } from 'react';
import { Table, Tag, Space, Button, Input, Select, Card, Modal, InputNumber, Form, message, Typography, Statistic, Row, Col, Divider, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, WarningOutlined, EditOutlined, DeleteOutlined, HistoryOutlined, DollarOutlined } from '@ant-design/icons';
import { ref, onValue, update, push, remove } from 'firebase/database';

const { Text, Title } = Typography;

const MaterialManagement = ({ db, isAdmin, user }) => {
  const [materials, setMaterials] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Null là thêm mới, có data là sửa
  const [form] = Form.useForm();

  useEffect(() => {
    const materialRef = ref(db, 'material_stock');
    onValue(materialRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ key, ...data[key] }));
        setMaterials(list.sort((a, b) => (a.stock <= a.minStock ? -1 : 1)));
      } else setMaterials([]);
    });
  }, [db]);

  // --- HÀM XỬ LÝ CHÍNH ---
  const handleSave = async (values) => {
    try {
      const payload = {
        ...values,
        updatedAt: new Date().toLocaleString('vi-VN'),
        updatedBy: user?.email?.split('@')[0] || 'Admin'
      };

      if (editingItem) {
        await update(ref(db, `material_stock/${editingItem.key}`), payload);
        message.success("Cập nhật vật tư thành công!");
      } else {
        await push(ref(db, 'material_stock'), { ...payload, stock: values.stock || 0 });
        message.success("Thêm vật tư mới thành công!");
      }
      setIsModalOpen(false);
      form.resetFields();
    } catch (e) { message.error("Lỗi: " + e.message); }
  };

  const handleDelete = (key) => {
    remove(ref(db, `material_stock/${key}`))
      .then(() => message.success("Đã xóa vật tư!"));
  };

  // --- ĐẲNG CẤP: DASHBOARD NHANH ---
  const totalValue = materials.reduce((acc, cur) => acc + (cur.stock * (cur.lastPrice || 0)), 0);
  const lowStockCount = materials.filter(m => m.stock <= m.minStock).length;

  const columns = [
    {
      title: 'THÔNG TIN VẬT TƯ',
      key: 'info',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '15px' }}>{r.name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>QC: {r.spec} | Loại: {r.type}</Text>
        </Space>
      )
    },
    {
      title: 'TỒN KHO',
      dataIndex: 'stock',
      align: 'center',
      render: (s, r) => (
        <div style={{ textAlign: 'center' }}>
          <Tag color={s <= r.minStock ? 'red' : 'green'} style={{ fontSize: '15px', fontWeight: 'bold', padding: '4px 12px' }}>
            {s} {r.unit}
          </Tag>
          {s <= r.minStock && <div style={{ color: '#ff4d4f', fontSize: '11px', marginTop: 4 }}><WarningOutlined /> CẦN NHẬP!</div>}
        </div>
      )
    },
    {
      title: 'ĐỊNH MỨC & GIÁ',
      key: 'price',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '13px' }}>Ngưỡng báo động: <b style={{ color: '#faad14' }}>{r.minStock}</b></Text>
          <Text style={{ fontSize: '13px' }}>Giá nhập: <b>{r.lastPrice?.toLocaleString()}đ</b></Text>
        </Space>
      )
    },
    {
      title: 'THAO TÁC',
      align: 'right',
      render: (_, r) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => { setEditingItem(r); form.setFieldsValue(r); setIsModalOpen(true); }}>Sửa</Button>
          {isAdmin && (
            <Popconfirm title="Xóa vật tư này?" onConfirm={() => handleDelete(r.key)}>
              <Button danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '10px' }}>
      {/* Dashboard mini cho đẳng cấp */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card bordered={false} style={{ background: '#e6f7ff' }}>
            <Statistic title="TỔNG GIÁ TRỊ TỒN KHO" value={totalValue} precision={0} prefix={<DollarOutlined />} suffix="VNĐ" />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ background: '#fff7e6' }}>
            <Statistic title="HÀNG DƯỚI ĐỊNH MỨC" value={lowStockCount} valueStyle={{ color: '#cf1322' }} prefix={<WarningOutlined />} suffix={`/ ${materials.length} mã`} />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic title="CẬP NHẬT LẦN CUỐI" value={materials[0]?.updatedAt?.split(' ')[0] || '--'} valueStyle={{ fontSize: '18px' }} prefix={<HistoryOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card 
        title={<Title level={4} style={{ margin: 0 }}><PlusOutlined /> QUẢN LÝ NHẬP XUẤT TỒN</Title>}
        extra={<Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => { setEditingItem(null); form.resetFields(); setIsModalOpen(true); }}>THÊM MÃ VẬT TƯ</Button>}
      >
        <Space style={{ marginBottom: 20 }}>
          <Input placeholder="Tìm tên vật tư..." prefix={<SearchOutlined />} style={{ width: 300 }} onChange={e => setSearchText(e.target.value)} allowClear />
          <Select placeholder="Lọc theo loại" style={{ width: 180 }} allowClear onChange={setTypeFilter}>
            <Select.Option value="Gỗ">Gỗ (Ván/Cây)</Select.Option>
            <Select.Option value="Phụ kiện">Phụ kiện (Bản lề/Ray)</Select.Option>
            <Select.Option value="Hóa chất">Sơn / Hóa chất</Select.Option>
            <Select.Option value="Vật tư khác">Vật tư khác</Select.Option>
          </Select>
        </Space>

        <Table 
          columns={columns} 
          dataSource={materials.filter(m => (!searchText || m.name.toLowerCase().includes(searchText.toLowerCase())) && (!typeFilter || m.type === typeFilter))}
          bordered
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal Thêm/Sửa */}
      <Modal
        title={<b>{editingItem ? 'CHỈNH SỬA VẬT TƯ' : 'THÊM VẬT TƯ MỚI'}</b>}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="name" label="Tên vật tư" rules={[{ required: true }]}>
                <Input placeholder="VD: Ván MDF 17mm chống ẩm" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="type" label="Loại vật tư" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="Gỗ">Gỗ</Select.Option>
                  <Select.Option value="Phụ kiện">Phụ kiện</Select.Option>
                  <Select.Option value="Hóa chất">Hóa chất</Select.Option>
                  <Select.Option value="Vật tư khác">Khác</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="spec" label="Quy cách / Model">
                <Input placeholder="VD: 1220x2440 hoặc Inox 304" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="unit" label="Đơn vị" rules={[{ required: true }]}>
                <Input placeholder="Tấm, Cái, Kg..." />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="minStock" label="Ngưỡng báo động" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left">Số liệu kho & Giá</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="stock" label="Tồn kho khởi tạo" rules={[{ required: !editingItem }]}>
                <InputNumber style={{ width: '100%' }} min={0} disabled={!!editingItem} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastPrice" label="Giá nhập (VNĐ)">
                <InputNumber style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default MaterialManagement;