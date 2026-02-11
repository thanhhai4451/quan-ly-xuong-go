import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Modal, Form, Input, InputNumber, Select, 
  Tag, message, DatePicker, Card, Row, Col, Statistic, Typography, Popconfirm 
} from 'antd';
import { 
  PlusOutlined, MinusOutlined, LinkOutlined, DatabaseOutlined, 
  ArrowUpOutlined, HistoryOutlined, DeleteOutlined, SearchOutlined
} from '@ant-design/icons';
import { ref, push, onValue, serverTimestamp, remove } from 'firebase/database';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);
const { Text } = Typography;
const { RangePicker } = DatePicker;

const InventoryManagement = ({ db, user, isAdmin }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('NHAP'); 
  const [ setEditingKey] = useState(null);
  const [logs, setLogs] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [form] = Form.useForm();

  // 1. Lấy dữ liệu từ Firebase
  useEffect(() => {
    const inventoryRef = ref(db, 'inventory_v2');
    onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ ...data[key], fbKey: key }));
        setLogs(list.reverse());
      } else {
        setLogs([]);
      }
    });
  }, [db]);

  // 2. Logic Lọc dữ liệu (Dùng chung cho cả Thống kê và Bảng)
  const filteredLogs = logs.filter(item => {
    // Lọc theo từ khóa
    const searchVal = searchText.toUpperCase();
    const matchSearch = !searchText || 
      item.maHang?.toUpperCase().includes(searchVal) || 
      item.tenHang?.toUpperCase().includes(searchVal) ||
      item.maPhieu?.toUpperCase().includes(searchVal);

    // Lọc theo ngày
    let matchDate = true;
    if (dateRange && dateRange[0] && dateRange[1]) {
      const itemDate = dayjs(item.ngay, 'DD/MM/YYYY HH:mm');
      matchDate = itemDate.isBetween(dateRange[0].startOf('day'), dateRange[1].endOf('day'));
    }

    return matchSearch && matchDate;
  });

  // 3. Tính toán Tổng hợp dựa trên dữ liệu đã lọc
  const summary = filteredLogs.reduce((acc, item) => {
    const code = String(item.maHang || 'SP').toUpperCase().trim();
    const name = String(item.tenHang || "HÀNG CHƯA TÊN").toUpperCase().trim();
    
    if (!acc[code]) {
      acc[code] = { 
        maHang: code,
        tenHang: name, 
        tongNhap: 0, 
        tongXuat: 0, 
        ton: 0, 
        donVi: item.donVi || 'Cái' 
      };
    }
    
    const qty = Number(item.soLuong) || 0;
    if (item.loai === 'NHAP') acc[code].tongNhap += qty;
    else acc[code].tongXuat += qty;
    
    acc[code].ton = acc[code].tongNhap - acc[code].tongXuat;
    return acc;
  }, {});

  const summaryData = Object.values(summary);
  const totalTon = summaryData.reduce((sum, item) => sum + item.ton, 0);

  // 4. Hàm Lưu & Xóa
  const handleSave = async (values) => {
    const finalName = Array.isArray(values.tenHang) ? values.tenHang[0] : values.tenHang;
    const cleanData = {
      ...values,
      tenHang: finalName.toUpperCase().trim(),
      loai: modalType,
      ngay: values.ngay.format('DD/MM/YYYY HH:mm'),
      nguoiThucHien: user?.email?.split('@')[0] || 'Admin',
      timestamp: serverTimestamp(),
      linkDrive: values.linkDrive || null,
      ghiChu: values.ghiChu || null,
      maPhieu: values.maPhieu || null,
      nguonHang: values.nguonHang || null,
    };

    try {
      await push(ref(db, 'inventory_v2'), cleanData);
      message.success('✅ Lưu phiếu thành công');
      setIsModalOpen(false);
      form.resetFields();
    } catch (e) { message.error("Lỗi lưu dữ liệu"); }
  };

  const handleDelete = async (key) => {
    try {
      await remove(ref(db, `inventory_v2/${key}`));
      message.success("Đã xóa!");
    } catch (e) { message.error("Lỗi xóa"); }
  };

  return (
    <div style={{ background: '#f0f2f5', padding: '15px', minHeight: '100vh' }}>
      
      {/* KHỐI THỐNG KÊ & NÚT BẤM */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={6}>
          <Card bordered={false} style={{ borderLeft: '5px solid #52c41a' }}>
            <Statistic title="MẶT HÀNG ĐANG LỌC" value={summaryData.length} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card bordered={false} style={{ borderLeft: '5px solid #1890ff' }}>
            <Statistic title="TỔNG TỒN TRONG KỲ" value={totalTon} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <div style={{ display: 'flex', gap: '10px', height: '100%' }}>
            <Button type="primary" block size="large" icon={<PlusOutlined />} onClick={() => { setModalType('NHAP'); setEditingKey(null); setIsModalOpen(true); form.resetFields(); }} style={{ height: '100%' }}>NHẬP KHO</Button>
            <Button danger block size="large" icon={<MinusOutlined />} onClick={() => { setModalType('XUAT'); setEditingKey(null); setIsModalOpen(true); form.resetFields(); }} style={{ height: '100%' }}>XUẤT KHO</Button>
          </div>
        </Col>
      </Row>

      {/* BỘ LỌC TỔNG (Dùng cho cả 2 bảng) */}
      <Card style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Text strong>Tìm kiếm nhanh:</Text>
            <Input 
              prefix={<SearchOutlined />} 
              placeholder="Mã hàng, tên hàng, mã phiếu..." 
              allowClear
              onChange={e => setSearchText(e.target.value)}
              style={{ width: '100%', marginTop: 8 }}
            />
          </Col>
          <Col xs={24} md={10}>
            <Text strong>Lọc theo thời gian:</Text><br/>
            <RangePicker 
              style={{ width: '100%', marginTop: 8 }} 
              format="DD/MM/YYYY"
              onChange={val => setDateRange(val)}
            />
          </Col>
          <Col xs={24} md={4}>
            <Button block style={{ marginTop: 28 }} onClick={() => { setSearchText(''); setDateRange(null); }}>Reset Bộ Lọc</Button>
          </Col>
        </Row>
      </Card>

      {/* BẢNG TỔNG HỢP */}
      <Card title={<span><ArrowUpOutlined /> TỔNG HỢP NHẬP - XUẤT - TỒN</span>} style={{ marginBottom: 20 }}>
        <Table 
          dataSource={summaryData} 
          rowKey="maHang"
          pagination={{ pageSize: 5 }}
          columns={[
            { title: 'MÃ HÀNG', dataIndex: 'maHang', sorter: (a,b) => a.maHang.localeCompare(b.maHang), render: m => <Tag color="blue">{m}</Tag> },
            { title: 'TÊN VẬT TƯ', dataIndex: 'tenHang', render: t => <Text strong>{t}</Text> },
            { title: 'NHẬP', dataIndex: 'tongNhap', align: 'right', sorter: (a,b) => a.tongNhap - b.tongNhap, render: n => <Text type="success">{n}</Text> },
            { title: 'XUẤT', dataIndex: 'tongXuat', align: 'right', sorter: (a,b) => a.tongXuat - b.tongXuat, render: x => <Text type="danger">{x}</Text> },
            { 
              title: 'TỒN', 
              dataIndex: 'ton', 
              align: 'right',
              sorter: (a,b) => a.ton - b.ton,
              render: ton => <Tag color={ton > 5 ? "blue" : "red"} style={{ fontWeight: 'bold' }}>{ton}</Tag> 
            },
            { title: 'ĐƠN VỊ', dataIndex: 'donVi' },
          ]}
        />
      </Card>

      {/* NHẬT KÝ CHI TIẾT */}
      <Card title={<span><HistoryOutlined /> NHẬT KÝ CHI TIẾT</span>}>
        <Table 
          dataSource={filteredLogs} 
          size="small"
          rowKey="fbKey"
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Mã Phiếu', dataIndex: 'maPhieu', render: m => <Text code>{m || '-'}</Text> },
            { title: 'Thời gian', dataIndex: 'ngay', width: 150 },
            { 
              title: 'Loại', 
              dataIndex: 'loai', 
              filters: [{ text: 'NHẬP', value: 'NHAP' }, { text: 'XUẤT', value: 'XUAT' }],
              onFilter: (value, record) => record.loai === value,
              render: l => l === 'NHAP' ? <Tag color="green">NHẬP</Tag> : <Tag color="red">XUẤT</Tag> 
            },
            { title: 'Mã SP', dataIndex: 'maHang' },
            { title: 'Tên hàng', dataIndex: 'tenHang', render: t => <b>{String(t).toUpperCase()}</b> },
            { title: 'SL', dataIndex: 'soLuong', align: 'right', render: (s, r) => <Text strong style={{ color: r.loai === 'NHAP' ? '#52c41a' : '#ff4d4f' }}>{r.loai === 'NHAP' ? `+${s}` : `-${s}`}</Text> },
            { title: 'Người làm', dataIndex: 'nguoiThucHien' },
            { 
              title: 'Thao tác', 
              fixed: 'right', 
              render: (_, record) => (
                <Popconfirm title="Xóa phiếu này?" onConfirm={() => handleDelete(record.fbKey)}>
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )
            }
          ]}
        />
      </Card>

      {/* MODAL GIỮ NGUYÊN NHƯ CŨ CỦA BẠN */}
      <Modal
        title={<b>{modalType === 'NHAP' ? '📦 NHẬP KHO' : '📤 XUẤT KHO'}</b>}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        okText="Lưu phiếu"
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ ngay: dayjs(), nguonHang: 'tu_lam', donVi: 'Cái' }}>
          <Form.Item shouldUpdate>
            {({ getFieldValue }) => (modalType === 'XUAT' || getFieldValue('nguonHang') === 'gia_cong') && (
              <Form.Item name="maPhieu" label="Mã Phiếu" rules={[{ required: true }]}>
                <Input placeholder="VD: PX-001 hoặc GC-001" />
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item name="maHang" label="Mã Sản Phẩm" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="tenHang" label="Tên hàng" rules={[{ required: true }]}>
            <Select showSearch mode={modalType === 'NHAP' ? 'tags' : undefined} options={summaryData.map(i => ({ value: i.tenHang, label: i.tenHang }))} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="soLuong" label="Số lượng" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="donVi" label="Đơn vị"><Input /></Form.Item></Col>
          </Row>
          {modalType === 'NHAP' && (
            <Form.Item name="nguonHang" label="Nguồn nhập">
              <Select options={[{ value: 'tu_lam', label: 'Xưởng tự làm' }, { value: 'gia_cong', label: 'Gia công ngoài' }]} />
            </Form.Item>
          )}
          <Form.Item name="ngay" label="Ngày thực hiện"><DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" /></Form.Item>
          <Form.Item name="linkDrive" label="Link Drive"><Input prefix={<LinkOutlined />} /></Form.Item>
          <Form.Item name="ghiChu" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryManagement;