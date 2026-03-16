import React, { useState, useEffect } from 'react';
import { 
  Table, Tag, Space, Button, Input, Select, Card, Modal, 
  InputNumber, Form, message, Typography, Row, Col, 
  Popconfirm, Tabs, Badge, Statistic 
} from 'antd';
import { 
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, 
  ArrowUpOutlined, ArrowDownOutlined, HistoryOutlined, 
  StockOutlined, WarningOutlined,
  ContainerOutlined, TransactionOutlined
} from '@ant-design/icons';
import { ref, onValue, update, push, remove, serverTimestamp, query, limitToLast } from 'firebase/database';

const { Text, Title } = Typography;

const MaterialManagement = ({ db, isAdmin, user }) => {
  const [materials, setMaterials] = useState([]);
  const [logs, setLogs] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [logFilter, setLogFilter] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInOutModalOpen, setIsInOutModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [transactionType, setTransactionType] = useState('IN');
  const [form] = Form.useForm();
  const [inOutForm] = Form.useForm();

  useEffect(() => {
    const materialRef = ref(db, 'material_stock');
    onValue(materialRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ key, ...data[key] }));
        setMaterials(list.sort((a, b) => (a.stock <= a.minStock ? -1 : 1)));
      } else setMaterials([]);
    });

    const logsRef = query(ref(db, 'material_logs'), limitToLast(100));
    onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ key, ...data[key] }));
        setLogs(list.reverse());
      } else setLogs([]);
    });
  }, [db]);

  const handleSaveMaterial = async (values) => {
    try {
      const payload = { 
        ...values, 
        updatedAt: new Date().toLocaleString('vi-VN'),
        updatedBy: user?.email?.split('@')[0] || 'Admin'
      };
      if (editingItem) {
        await update(ref(db, `material_stock/${editingItem.key}`), payload);
        message.success("Đã cập nhật thông tin!");
      } else {
        await push(ref(db, 'material_stock'), { ...payload, stock: values.stock || 0 });
        message.success("Đã tạo mã vật tư mới!");
      }
      setIsModalOpen(false);
      form.resetFields();
    } catch (e) { message.error("Lỗi: " + e.message); }
  };

  const handleInOut = async (values) => {
    const { amount, note } = values;
    const currentStock = editingItem.stock || 0;
    const newStock = transactionType === 'IN' ? currentStock + amount : currentStock - amount;

    if (transactionType === 'OUT' && newStock < 0) {
      return message.error("Lỗi: Kho không đủ hàng!");
    }

    try {
      const updates = {};
      updates[`material_stock/${editingItem.key}/stock`] = newStock;
      updates[`material_stock/${editingItem.key}/updatedAt`] = new Date().toLocaleString('vi-VN');
      
      await push(ref(db, 'material_logs'), {
        materialId: editingItem.key,
        name: editingItem.name,
        type: transactionType,
        amount,
        oldStock: currentStock,
        newStock,
        unit: editingItem.unit,
        note: note || (transactionType === 'IN' ? 'Nhập hàng' : 'Xuất hàng'),
        user: user?.email?.split('@')[0] || 'Admin',
        time: new Date().toLocaleString('vi-VN'),
        timestamp: serverTimestamp()
      });

      await update(ref(db), updates);
      message.success("Đã ghi sổ thành công!");
      setIsInOutModalOpen(false);
      inOutForm.resetFields();
    } catch (e) { message.error("Lỗi: " + e.message); }
  };

  const materialColumns = [
    {
      title: 'VẬT TƯ / THÔNG SỐ',
      key: 'name',
      render: (_, r) => (
        <div style={{ padding: '4px 0' }}>
          <Text strong style={{ fontSize: '15px', display: 'block' }}>{r.name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{r.spec || 'Mặc định'} • {r.type}</Text>
        </div>
      )
    },
    {
      title: 'TỒN KHO',
      align: 'center',
      render: (_, r) => {
        const isLow = r.stock <= r.minStock;
        return (
          <div style={{ textAlign: 'center' }}>
            <Badge count={isLow ? <WarningOutlined style={{ color: '#f5222d' }} /> : 0} offset={[5, 0]}>
              <Tag color={isLow ? 'volcano' : 'processing'} style={{ fontSize: '15px', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold' }}>
                {r.stock} {r.unit}
              </Tag>
            </Badge>
            {isLow && <div style={{ fontSize: '11px', color: '#f5222d', marginTop: '4px' }}>SẮP HẾT!</div>}
          </div>
        );
      }
    },
    {
      title: 'XỬ LÝ KHO',
      align: 'center',
      render: (_, r) => (
        <Space size="middle">
          <Button type="primary" icon={<ArrowUpOutlined />} size="small" onClick={() => { setEditingItem(r); setTransactionType('IN'); setIsInOutModalOpen(true); }}>Nhập</Button>
          <Button danger icon={<ArrowDownOutlined />} size="small" onClick={() => { setEditingItem(r); setTransactionType('OUT'); setIsInOutModalOpen(true); }}>Xuất</Button>
        </Space>
      )
    },
    {
      title: 'QUẢN LÝ',
      align: 'right',
      render: (_, r) => (
        <Space>
          <Button variant="text" icon={<EditOutlined style={{color: '#1890ff'}}/>} onClick={() => { setEditingItem(r); form.setFieldsValue(r); setIsModalOpen(true); }} />
          {isAdmin && (
            <Popconfirm title="Xóa mã hàng này?" onConfirm={() => remove(ref(db, `material_stock/${r.key}`))}>
              <Button variant="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  const logColumns = [
    { title: 'THỜI GIAN', dataIndex: 'time', width: 160 },
    { 
      title: 'LOẠI', 
      width: 100,
      render: (_, r) => r.type === 'IN' ? <Tag color="green">NHẬP (+)</Tag> : <Tag color="red">XUẤT (-)</Tag> 
    },
    { title: 'VẬT TƯ', render: (_, r) => <Text strong>{r.name}</Text> },
    { title: 'SL', render: (_, r) => <Text strong color={r.type === 'IN' ? 'green' : 'red'}>{r.type === 'IN' ? '+' : '-'}{r.amount} {r.unit}</Text> },
    { 
      title: 'CHI TIẾT & NGƯỜI LÀM', 
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>"{r.note}"</div>
          <div style={{ fontSize: '11px', color: '#8c8c8c' }}>Thợ/Kho: {r.user}</div>
        </div>
      ) 
    },
    { title: 'TỒN CUỐI', render: (_, r) => <Tag bordered={false} color="blue">{r.newStock} {r.unit}</Tag> }
  ];

  return (
    <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* PHẦN THỐNG KÊ NHANH TRÊN ĐẦU */}
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col span={6}>
          <Card bordered={false} className="stat-card">
            <Statistic title="Tổng mã vật tư" value={materials.length} prefix={<ContainerOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="stat-card">
            <Statistic title="Cần nhập thêm" value={materials.filter(m => m.stock <= m.minStock).length} prefix={<WarningOutlined />} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="stat-card">
            <Statistic title="Giao dịch gần đây" value={logs.length} prefix={<TransactionOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
            <Button type="primary" block size="large" icon={<PlusOutlined />} 
                style={{ height: '100%', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' }}
                onClick={() => { setEditingItem(null); form.resetFields(); setIsModalOpen(true); }}
            >
                TẠO MÃ MỚI
            </Button>
        </Col>
      </Row>

      <Tabs 
        type="editable-card" 
        hideAdd
        items={[
          {
            key: '1',
            label: <span style={{ padding: '0 10px' }}><StockOutlined /> BẢNG KHO</span>,
            children: (
              <Card bordered={false} style={{ borderRadius: '8px' }}>
                <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
                    <Input 
                        placeholder="Tìm vật tư theo tên, quy cách..." 
                        prefix={<SearchOutlined />} 
                        style={{ width: 400, borderRadius: '6px' }} 
                        onChange={e => setSearchText(e.target.value)} 
                        allowClear 
                    />
                    <Text type="secondary">Cập nhật lúc: {new Date().toLocaleTimeString()}</Text>
                </div>
                <Table 
                    columns={materialColumns} 
                    dataSource={materials.filter(m => !searchText || m.name.toLowerCase().includes(searchText.toLowerCase()))} 
                    bordered={false}
                    className="custom-table"
                />
              </Card>
            )
          },
          {
            key: '2',
            label: <span style={{ padding: '0 10px' }}><HistoryOutlined /> NHẬT KÝ</span>,
            children: (
              <Card bordered={false} style={{ borderRadius: '8px' }}>
                <Select placeholder="Lọc loại giao dịch" style={{ width: 200, marginBottom: 20 }} allowClear onChange={setLogFilter}>
                  <Select.Option value="IN">Nhập kho</Select.Option>
                  <Select.Option value="OUT">Xuất kho</Select.Option>
                </Select>
                <Table columns={logColumns} dataSource={logs.filter(l => !logFilter || l.type === logFilter)} bordered={false} size="small" />
              </Card>
            )
          }
        ]} 
      />

      {/* MODAL PHIẾU NHẬP/XUẤT */}
      <Modal
        title={<Title level={4} style={{ margin: 0, color: transactionType === 'IN' ? '#52c41a' : '#f5222d' }}>
          {transactionType === 'IN' ? '▲ PHIẾU NHẬP KHO' : '▼ PHIẾU XUẤT KHO'}
        </Title>}
        open={isInOutModalOpen}
        onCancel={() => setIsInOutModalOpen(false)}
        onOk={() => inOutForm.submit()}
        okButtonProps={{ style: { background: transactionType === 'IN' ? '#52c41a' : '#f5222d', borderColor: 'transparent' } }}
        destroyOnClose
      >
        <div style={{ padding: '20px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: 20, background: '#fafafa', padding: '15px', borderRadius: '8px' }}>
                <Text type="secondary">Vật tư đang xử lý</Text>
                <Title level={3} style={{ margin: '5px 0' }}>{editingItem?.name}</Title>
                <Tag color="blue" style={{ fontSize: '14px' }}>Tồn hiện tại: {editingItem?.stock} {editingItem?.unit}</Tag>
            </div>
            <Form form={inOutForm} layout="vertical" onFinish={handleInOut}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="amount" label="Số lượng" rules={[{ required: true, message: 'Nhập số lượng!' }]}>
                            <InputNumber style={{ width: '100%' }} min={1} size="large" />
                        </Form.Item>
                    </Col>
                    {transactionType === 'IN' && (
                        <Col span={12}>
                            <Form.Item name="price" label="Giá nhập (VNĐ)">
                                <InputNumber style={{ width: '100%' }} min={0} size="large" formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                            </Form.Item>
                        </Col>
                    )}
                </Row>
                <Form.Item 
                    name="note" 
                    label={transactionType === 'OUT' ? "Lý do xuất (Thợ/Công trình/Đơn hàng)" : "Ghi chú"}
                    rules={[{ required: transactionType === 'OUT', message: 'Bắt buộc nhập lý do xuất!' }]}
                >
                    <Input.TextArea rows={3} placeholder="Mô tả chi tiết để tiện đối soát..." />
                </Form.Item>
            </Form>
        </div>
      </Modal>

      {/* MODAL THÊM/SỬA MÃ VẬT TƯ */}
      <Modal 
        title={<Title level={4} style={{margin:0}}><ContainerOutlined /> THÔNG TIN VẬT TƯ</Title>} 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)} 
        onOk={() => form.submit()}
        width={650}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveMaterial} style={{ paddingTop: '20px' }}>
          <Form.Item name="name" label="Tên vật tư (VD: Ván MDF, Bản lề...)" rules={[{ required: true }]}><Input size="large" /></Form.Item>
          <Form.Item name="spec" label="Quy cách / Thông số kỹ thuật"><Input placeholder="VD: 1220x2440x17mm / Hafele 110 độ" /></Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
                <Select options={[{value:'Gỗ', label:'Gỗ'}, {value:'Phụ kiện', label:'Phụ kiện'}, {value:'Hóa chất', label:'Hóa chất'}, {value:'Khác', label:'Khác'}]}/>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="Đơn vị" rules={[{ required: true }]}>
                <Select showSearch options={[{value:'Tấm', label:'Tấm'}, {value:'Cái', label:'Cái'}, {value:'Bộ', label:'Bộ'}, {value:'Kg', label:'Kg'}, {value:'Cuộn', label:'Cuộn'}, {value:'Bao', label:'Bao'}]}/>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="minStock" label="Báo động khi tồn dưới" rules={[{ required: true }]}><InputNumber style={{width:'100%'}}/></Form.Item>
            </Col>
          </Row>
          {!editingItem && <Form.Item name="stock" label="Tồn kho thực tế khi khởi tạo"><InputNumber style={{width:'100%'}} min={0}/></Form.Item>}
        </Form>
      </Modal>

      <style>{`
        .stat-card { border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .custom-table .ant-table-thead > tr > th { background: #fafafa; font-weight: bold; }
        .ant-tabs-nav { margin-bottom: 0 !important; }
      `}</style>
    </div>
  );
};

export default MaterialManagement;