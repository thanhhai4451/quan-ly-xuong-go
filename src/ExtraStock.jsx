import React, { useState, useMemo } from 'react';
import { 
  Table, Card, Tag, Typography, Input, Button, Space, 
  InputNumber, Modal, Radio, message, Row, Col, Divider, Statistic 
} from 'antd';
import { 
  InboxOutlined, SearchOutlined, PlusOutlined, 
  DeleteOutlined, EditOutlined, CloseOutlined,
  AppstoreOutlined, BuildOutlined, BarChartOutlined,
  HistoryOutlined
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

  // --- LOGIC THỐNG KÊ ---
  const stats = useMemo(() => {
    const list = khoDu ? Object.values(khoDu) : [];
    const nguyenBo = list.filter(i => i.loai === 'BO').length;
    const linhKien = list.filter(i => i.loai !== 'BO').length;
    const tongTon = list.reduce((sum, i) => sum + (Number(i.soLuongTong) || 0), 0);
    return { total: list.length, nguyenBo, linhKien, tongTon };
  }, [khoDu]);

  const dataSource = useMemo(() => {
    const list = khoDu ? Object.entries(khoDu).map(([key, val]) => ({ ...val, key })) : [];
    if (!searchText) return list;
    return list.filter(item => item.tenItem?.toLowerCase().includes(searchText.toLowerCase()));
  }, [khoDu, searchText]);

  // --- CÁC HÀM XỬ LÝ ---
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

    update(ref(db, `khoDu/${itemKey}`), data).then(() => {
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

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* SECTION 1: THƯ THỐNG KÊ (DASHBOARD) */}
      <div style={{ marginBottom: '32px' }}>
        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} lg={16}>
            <div style={{ 
              background: 'linear-gradient(135deg, #1d39c4 0%, #0050b3 100%)', 
              padding: '32px', 
              borderRadius: '24px', 
              color: '#fff', 
              height: '100%',
              boxShadow: '0 10px 30px rgba(29,57,196,0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <Title level={2} style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <BarChartOutlined /> BÁO CÁO TỔNG QUAN
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
                  Chào mừng, hệ thống ghi nhận có <b>{stats.total}</b> mặt hàng trong kho dư.
                </Text>
                
                <Row gutter={16} style={{ marginTop: '30px' }}>
                  <Col span={8}>
                    <Statistic title={<Text style={{color: '#ddd'}}>Nguyên bộ</Text>} value={stats.nguyenBo} valueStyle={{ color: '#fff', fontWeight: 800 }} prefix={<AppstoreOutlined />} />
                  </Col>
                  <Col span={8}>
                    <Statistic title={<Text style={{color: '#ddd'}}>Linh kiện lẻ</Text>} value={stats.linhKien} valueStyle={{ color: '#fff', fontWeight: 800 }} prefix={<BuildOutlined />} />
                  </Col>
                  <Col span={8}>
                    <Statistic title={<Text style={{color: '#ddd'}}>Tổng tồn</Text>} value={stats.tongTon} valueStyle={{ color: '#ffec3d', fontWeight: 800 }} />
                  </Col>
                </Row>
              </div>
              {/* Trang trí background */}
              <InboxOutlined style={{ position: 'absolute', right: '-20px', bottom: '-20px', fontSize: '150px', color: 'rgba(255,255,255,0.1)' }} />
            </div>
          </Col>

          <Col xs={24} lg={8}>
            <Card style={{ height: '100%', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
               <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div style={{ background: '#e6f7ff', padding: '16px', borderRadius: '50%', width: '60px', height: '60px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PlusOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  </div>
                  <Title level={4} style={{ margin: 0 }}>Thêm hàng mới?</Title>
                  <Text type="secondary">Cập nhật nhanh các linh kiện vừa kiểm kê xong.</Text>
                  <Button type="primary" size="large" block onClick={() => setIsModalOpen(true)} style={{ borderRadius: '12px', height: '45px', fontWeight: 'bold' }}>
                    NHẬP KHO NGAY
                  </Button>
               </Space>
            </Card>
          </Col>
        </Row>
      </div>

      {/* SECTION 2: BẢNG DỮ LIỆU */}
      <Card style={{ borderRadius: '24px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <Input 
            placeholder="Tìm tên hàng trong kho..." 
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} 
            size="large"
            allowClear
            onChange={e => setSearchText(e.target.value)}
            style={{ width: '100%', maxWidth: '400px', borderRadius: '12px' }}
          />
          <Space>
            <HistoryOutlined style={{ color: '#8c8c8c' }} />
            <Text type="secondary">Lần cuối: {dayjs().format('HH:mm')}</Text>
          </Space>
        </div>

        <Table 
          dataSource={dataSource}
          rowKey="key"
          pagination={{ pageSize: 7 }}
          scroll={{ x: 800 }}
          columns={[
            { 
              title: 'SẢN PHẨM', 
              dataIndex: 'tenItem',
              render: (t, r) => (
                <Space align="start">
                  <div style={{ padding: '8px', background: r.loai === 'BO' ? '#f9f0ff' : '#e6f7ff', borderRadius: '8px' }}>
                    {r.loai === 'BO' ? <AppstoreOutlined style={{ color: '#722ed1' }} /> : <BuildOutlined style={{ color: '#1890ff' }} />}
                  </div>
                  <div>
                    <Text strong style={{ fontSize: '15px' }}>{t}</Text><br/>
                    <Tag bordered={false} color={r.loai === 'BO' ? 'purple' : 'blue'}>
                      {r.loai === 'BO' ? 'NGUYÊN BỘ' : 'LINH KIỆN'}
                    </Tag>
                  </div>
                </Space>
              )
            },
            { 
                title: 'CHI TIẾT TRONG KHO', 
                render: r => (
                  <div style={{ background: r.chiTietList ? '#fafafa' : 'transparent', padding: r.chiTietList ? '10px' : '0', borderRadius: '12px' }}>
                    {r.chiTietList ? (
                      <Row gutter={[8, 8]}>
                        {r.chiTietList.map((item, idx) => (
                          <Col span={12} key={idx}>
                            <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Badge count={item.qty} color="#52c41a" />
                              <Text ellipsis>{item.name}</Text>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    ) : (
                      <Tag color="warning" style={{ fontSize: '14px', padding: '4px 12px', borderRadius: '6px' }}>
                        Số lượng: <b>{r.soLuongTong || 0}</b>
                      </Tag>
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
                  <Button type="text" icon={<EditOutlined />} onClick={() => { 
                    setEditingItem(r); 
                    setDetailsList(r.chiTietList || []); 
                    setTongSoLuong(r.soLuongTong || 1);
                    setIsModalOpen(true); 
                  }} />
                  {isAdmin && <Button danger type="text" icon={<DeleteOutlined />} onClick={() => {
                    Modal.confirm({ title: 'Xác nhận xóa?', content: 'Dữ liệu này sẽ mất vĩnh viễn.', okText: 'Xóa', okType: 'danger', onOk: () => remove(ref(db, `khoDu/${r.key}`)) });
                  }} />}
                </Space>
              )
            }
          ]}
        />
      </Card>

      {/* MODAL GIỮ NGUYÊN NHƯ CŨ (ĐÃ ĐẸP) */}
      <Modal
        title={editingItem ? "📝 CẬP NHẬT THÔNG TIN" : "📦 NHẬP KHO MỚI"}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={handleSave}
        width={600}
        centered
      >
        <Divider />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Row gutter={16}>
                <Col span={16}>
                    <Text strong>Tên sản phẩm/Mã hàng:</Text>
                    <Input id="modal_name" size="large" defaultValue={editingItem?.tenItem} style={{ marginTop: '8px', borderRadius: '8px' }} />
                </Col>
                <Col span={8}>
                    <Text strong>Tổng tồn:</Text>
                    <InputNumber min={1} size="large" value={tongSoLuong} onChange={setTongSoLuong} style={{ width: '100%', marginTop: '8px', borderRadius: '8px' }} />
                </Col>
            </Row>

            <Radio.Group name="modal_type" defaultValue={editingItem?.loai || 'CHI_TIET'} buttonStyle="solid">
                <Radio.Button value="CHI_TIET">LINH KIỆN LẺ</Radio.Button>
                <Radio.Button value="BO">NGUYÊN BỘ</Radio.Button>
            </Radio.Group>

            <Card size="small" title="Linh kiện chi tiết" style={{ borderRadius: '12px' }}>
                <Space style={{ marginBottom: '10px' }}>
                    <Input value={detailName} onChange={e => setDetailName(e.target.value)} placeholder="Tên món" />
                    <InputNumber value={detailQty} onChange={setDetailQty} min={1} />
                    <Button type="primary" icon={<PlusOutlined />} onClick={addDetail} />
                </Space>
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    {detailsList.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                            <span>{item.name} (x{item.qty})</span>
                            <Button type="text" danger icon={<CloseOutlined />} onClick={() => setDetailsList(detailsList.filter((_, i) => i !== idx))} />
                        </div>
                    ))}
                </div>
            </Card>

            <Input.TextArea id="modal_note" defaultValue={editingItem?.ghiChu} rows={2} placeholder="Ghi chú thêm..." />
        </div>
      </Modal>
    </div>
  );
};

// Component Badge nhỏ phụ trợ
const Badge = ({ count, color }) => (
  <span style={{ 
    backgroundColor: color, color: '#fff', padding: '1px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' 
  }}>{count}</span>
);

export default ExtraStock;