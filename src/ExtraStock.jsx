import React, { useState, useMemo } from 'react';
import { Table, Card, Tag, Typography, Input, Button, Space, InputNumber, Modal, Radio, message, Row, Col, Divider } from 'antd';
import { 
  InboxOutlined, SearchOutlined, PlusOutlined, 
  DeleteOutlined, EditOutlined, CloseOutlined,
  AppstoreOutlined, BuildOutlined
} from '@ant-design/icons';
import { ref, update, remove } from 'firebase/database';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const ExtraStock = ({ khoDu, db, user }) => {
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [detailsList, setDetailsList] = useState([]); 
  const [detailName, setDetailName] = useState('');
  const [detailQty, setDetailQty] = useState(1);
  const [tongSoLuong, setTongSoLuong] = useState(1);

  const isAdmin = user?.email === 'admin@gmail.com' || user?.email === 'haittpc08155@gmail.com';

  const handleSave = () => {
    const name = document.getElementById('modal_name')?.value;
    const note = document.getElementById('modal_note')?.value;
    const type = document.querySelector('input[name="modal_type"]:checked')?.value;

    if (!name) return message.error("Đại ca chưa nhập tên sản phẩm!");
    
    const itemKey = editingItem?.key || name.trim().toLowerCase().replace(/\s+/g, '_');
    const data = {
      tenItem: name,
      loai: type,
      ghiChu: note,
      soLuongTong: tongSoLuong,
      chiTietList: detailsList.length > 0 ? detailsList : null,
      ngayCapNhat: dayjs().format('DD/MM/YYYY HH:mm'),
      nguoiCapNhat: user?.email || 'Ẩn danh'
    };

    update(ref(db, `khoDu/${itemKey}`), data)
      .then(() => {
        message.success("Đã cập nhật kho thành công!");
        closeModal();
      });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setDetailsList([]);
    setDetailName('');
    setDetailQty(1);
    setTongSoLuong(1);
  };

  const addDetail = () => {
    if (!detailName.trim()) return message.warning("Nhập tên linh kiện đã đại ca!");
    setDetailsList([...detailsList, { name: detailName.trim(), qty: detailQty }]);
    setDetailName('');
    setDetailQty(1);
  };

  const dataSource = useMemo(() => {
    const list = khoDu ? Object.entries(khoDu).map(([key, val]) => ({ ...val, key })) : [];
    if (!searchText) return list;
    return list.filter(item => item.tenItem?.toLowerCase().includes(searchText.toLowerCase()));
  }, [khoDu, searchText]);

  return (
    <div style={{ padding: '24px', background: '#f4f7f9', minHeight: '100vh' }}>
      {/* HEADER ĐẸP */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div>
          <Title level={2} style={{ margin: 0, color: '#1a3353' }}>
            <InboxOutlined style={{ color: '#1890ff', marginRight: '12px' }} /> 
            QUẢN LÝ KHO DƯ
          </Title>
          <Text type="secondary">Phân loại linh kiện lẻ và sản phẩm nguyên chiếc</Text>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)} style={{ height: '50px', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(24,144,255,0.3)' }}>
          NHẬP HÀNG MỚI
        </Button>
      </div>

      <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Input 
          placeholder="Tìm tên hàng trong kho..." 
          prefix={<SearchOutlined />} 
          size="large"
          allowClear
          onChange={e => setSearchText(e.target.value)}
          style={{ width: '100%', maxWidth: '500px', marginBottom: '24px', borderRadius: '8px' }}
        />

        <Table 
          dataSource={dataSource}
          rowKey="key"
          pagination={{ pageSize: 8 }}
          columns={[
            { 
              title: 'SẢN PHẨM', 
              dataIndex: 'tenItem',
              width: '30%',
              render: (t, r) => (
                <Space align="start">
                  {r.loai === 'BO' ? <AppstoreOutlined style={{ fontSize: '20px', color: '#722ed1' }} /> : <BuildOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
                  <div>
                    <Text strong style={{ fontSize: '16px', color: '#1a3353' }}>{t}</Text><br/>
                    <Tag color={r.loai === 'BO' ? 'purple' : 'blue'} style={{ borderRadius: '4px', marginTop: '4px' }}>
                      {r.loai === 'BO' ? 'NGUYÊN BỘ' : 'LINH KIỆN'}
                    </Tag>
                  </div>
                </Space>
              )
            },
            { 
                title: 'CHI TIẾT TRONG KHO', 
                render: r => (
                  <div style={{ background: r.chiTietList ? '#f0faff' : 'transparent', padding: r.chiTietList ? '10px' : '0', borderRadius: '8px' }}>
                    {r.chiTietList ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {r.chiTietList.map((item, idx) => (
                          <div key={idx} style={{ fontSize: '13px' }}>
                            <Badge count={item.qty} color="#1890ff" style={{ marginRight: '8px' }} />
                            <Text>{item.name}</Text>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'inline-block', background: '#fff7e6', padding: '8px 16px', borderRadius: '8px', border: '1px solid #ffd591' }}>
                        <Text type="warning" strong style={{ fontSize: '16px' }}>Số lượng: {r.soLuongTong || 0}</Text>
                      </div>
                    )}
                  </div>
                )
            },
            { 
              title: 'GHI CHÚ', 
              dataIndex: 'ghiChu',
              render: g => <Text type="secondary" italic>{g || '---'}</Text> 
            },
            {
              title: 'THAO TÁC',
              align: 'right',
              render: r => (
                <Space>
                  <Button variant="filled" color="primary" icon={<EditOutlined />} onClick={() => { 
                    setEditingItem(r); 
                    setDetailsList(r.chiTietList || []); 
                    setTongSoLuong(r.soLuongTong || 1);
                    setIsModalOpen(true); 
                  }}>Sửa</Button>
                  {isAdmin && <Button danger type="text" icon={<DeleteOutlined />} onClick={() => {
                    Modal.confirm({ title: 'Xác nhận xóa món này?', content: 'Dữ liệu sẽ không thể khôi phục.', okText: 'Xóa luôn', cancelText: 'Để xem lại', okType: 'danger', onOk: () => remove(ref(db, `khoDu/${r.key}`)) });
                  }} />}
                </Space>
              )
            }
          ]}
        />
      </Card>

      {/* MODAL CẢI TIẾN */}
      <Modal
        title={<Title level={4} style={{ margin: 0 }}>{editingItem ? "📝 CẬP NHẬT THÔNG TIN" : "📦 NHẬP KHO MỚI"}</Title>}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={handleSave}
        width={650}
        okText="Lưu vào kho"
        cancelText="Đóng"
        destroyOnClose
        centered
      >
        <Divider style={{ margin: '12px 0' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Row gutter={20}>
            <Col span={16}>
              <Text strong>Tên sản phẩm/Mã hàng:</Text>
              <Input id="modal_name" size="large" defaultValue={editingItem?.tenItem} placeholder="Ví dụ: Ghế ăn dặm loại 1" style={{ marginTop: '8px', borderRadius: '8px' }} />
            </Col>
            <Col span={8}>
              <Text strong>Số lượng tổng:</Text>
              <InputNumber min={1} size="large" value={tongSoLuong} onChange={setTongSoLuong} style={{ width: '100%', marginTop: '8px', borderRadius: '8px' }} />
            </Col>
          </Row>

          <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '12px' }}>
            <Text strong>Phân loại hàng dư:</Text><br/>
            <Radio.Group name="modal_type" defaultValue={editingItem?.loai || 'CHI_TIET'} style={{ marginTop: '10px' }}>
              <Radio.Button value="CHI_TIET" style={{ borderRadius: '8px 0 0 8px' }}>🔍 LINH KIỆN LẺ</Radio.Button>
              <Radio.Button value="BO" style={{ borderRadius: '0 8px 8px 0' }}>📦 NGUYÊN BỘ</Radio.Button>
            </Radio.Group>
          </div>

          <Card size="small" title={<Text strong><BuildOutlined /> Danh sách chi tiết lẻ (nếu dư lẻ)</Text>} style={{ borderRadius: '12px', border: '1px solid #e8e8e8' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
              <Input value={detailName} onChange={e => setDetailName(e.target.value)} placeholder="Tên linh kiện (vd: Tay vịn)" style={{ flex: 3 }} />
              <InputNumber value={detailQty} onChange={setDetailQty} min={1} style={{ flex: 1 }} />
              <Button type="primary" ghost icon={<PlusOutlined />} onClick={addDetail}>Thêm</Button>
            </div>
            
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {detailsList.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#fff', marginBottom: '6px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                  <Text><Badge status="processing" /> {item.name}: <Text strong color="blue">{item.qty}</Text></Text>
                  <Button type="text" danger size="small" icon={<CloseOutlined />} onClick={() => setDetailsList(detailsList.filter((_, i) => i !== idx))} />
                </div>
              ))}
              {detailsList.length === 0 && <Text type="disabled" style={{ display: 'block', textAlign: 'center', padding: '10px' }}>Không có linh kiện lẻ</Text>}
            </div>
          </Card>

          <div>
            <Text strong>Ghi chú nguồn gốc:</Text>
            <Input.TextArea id="modal_note" defaultValue={editingItem?.ghiChu} rows={3} placeholder="Ví dụ: Dư từ đơn hàng anh Bình tháng 1" style={{ marginTop: '8px', borderRadius: '8px' }} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Component Badge nhỏ phụ trợ
const Badge = ({ count, color, style }) => (
  <span style={{ 
    backgroundColor: color, 
    color: '#fff', 
    padding: '2px 8px', 
    borderRadius: '10px', 
    fontSize: '12px',
    fontWeight: 'bold',
    ...style 
  }}>
    {count}
  </span>
);

export default ExtraStock;