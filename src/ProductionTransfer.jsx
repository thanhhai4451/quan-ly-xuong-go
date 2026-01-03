import React, { useMemo } from 'react';
import { Table, Button, Space, Card, Tag, InputNumber, message, Typography, Empty, Badge } from 'antd';
import { 
  CheckCircleOutlined, SendOutlined, BoxPlotOutlined, 
  HistoryOutlined, ClockCircleOutlined, RightCircleOutlined 
} from '@ant-design/icons';
import { ref, update } from 'firebase/database';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const TEAM_CONFIG = {
  phoi: { label: 'Tổ Phôi', emails: ['sinhnguyen@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: 'dinhHinh', color: '#1890ff' },
  dinhHinh: { label: 'Tổ Định Hình', emails: ['chaunho@gmail.com','chuthoi@gmail.com','chaulon@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: 'lapRap', color: '#722ed1' },
  lapRap: { label: 'Tổ Lắp Ráp', emails: ['cubi@gmail.com', 'admin@gmail1.com', 'haittpc08155@gmail.com'], next: 'nham', color: '#fa8c16' },
  nham: { label: 'Tổ Trà Nhám', emails: ['phanvantang@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: 'son', color: '#eb2f96' },
  son: { label: 'Tổ Sơn', emails: ['canhnguyen@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: 'dongGoi', color: '#52c41a' },
  dongGoi: { label: 'Tổ Đóng Gói', emails: ['hongyen@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: null, color: '#f5222d' }
};

const ProductionTransfer = ({ orders, user, db }) => {
  // Xác định quyền Admin
  const isAdmin = user?.email === 'admin@gmail.com' || user?.email === 'haittpc08155@gmail.com';

  const myTeamKey = useMemo(() => {
    return Object.keys(TEAM_CONFIG).find(key => TEAM_CONFIG[key].emails.includes(user?.email));
  }, [user?.email]);

  const myTeamInfo = TEAM_CONFIG[myTeamKey];

  const cardStyle = {
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: 'none'
  };

  const headerStyle = (color) => ({
    background: `linear-gradient(45deg, ${color}, ${color}dd)`,
    color: 'white',
    padding: '12px 16px',
    borderRadius: '12px 12px 0 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  });

  // --- LOGIC HÀM ---
  const handleTransfer = (orderFbKey, itemKey, qty) => {
    if (!qty || qty <= 0) return message.error("Vui lòng nhập số lượng!");
    const order = orders.find(o => o.fbKey === orderFbKey);
    const item = order.chiTiet.find(i => i.key === itemKey);
    const nextTeamKey = myTeamInfo.next;
    const currentDaGiao = item.daGiao?.[myTeamKey] || 0;
    const currentWaitingOther = item.waitingConfirm?.[nextTeamKey] || 0;
    const stockAvailable = (item.tienDo?.[myTeamKey] || 0) - currentDaGiao - currentWaitingOther;

    if (qty > stockAvailable) return message.error(`Không đủ hàng (Còn: ${stockAvailable})`);

    const newChiTiet = order.chiTiet.map(it => {
      if (it.key === itemKey) {
        return { ...it, waitingConfirm: { ...it.waitingConfirm, [nextTeamKey]: currentWaitingOther + qty } };
      }
      return it;
    });

    update(ref(db, `orders/${orderFbKey}`), { chiTiet: newChiTiet })
      .then(() => message.success(`🚀 Đã gửi ${qty} cái thành công!`));
  };

  const handleAccept = (orderFbKey, itemKey) => {
    const order = orders.find(o => o.fbKey === orderFbKey);
    const item = order.chiTiet.find(i => i.key === itemKey);
    const qtyToAccept = item.waitingConfirm?.[myTeamKey] || 0;
    const senderTeamKey = Object.keys(TEAM_CONFIG).find(key => TEAM_CONFIG[key].next === myTeamKey);

    const newChiTiet = order.chiTiet.map(it => {
      if (it.key === itemKey) {
        return {
          ...it,
          tonKho: { ...it.tonKho, [myTeamKey]: (it.tonKho?.[myTeamKey] || 0) + qtyToAccept },
          waitingConfirm: { ...it.waitingConfirm, [myTeamKey]: 0 },
          daGiao: { ...it.daGiao, [senderTeamKey]: (it.daGiao?.[senderTeamKey] || 0) + qtyToAccept },
          lichSuBanGiao: [{ id: Date.now(), ngay: dayjs().format('DD/MM HH:mm'), loai: 'NHAN_VAO', tu: senderTeamKey?.toUpperCase(), den: myTeamKey.toUpperCase(), sl: qtyToAccept, tenSP: order.tenSP, tenLK: item.name }, ...(it.lichSuBanGiao || [])]
        };
      }
      return it;
    });

    update(ref(db, `orders/${orderFbKey}`), { chiTiet: newChiTiet })
      .then(() => message.success("✅ Đã nhận hàng vào kho!"));
  };

  // --- PHÂN LOẠI DỮ LIỆU ---
  const receiveData = [];
  const pendingData = [];
  const transferData = [];
  const historyData = [];

  orders.forEach(order => {
    order.chiTiet?.forEach(item => {
      if (item.waitingConfirm?.[myTeamKey] > 0) receiveData.push({ ...item, orderName: order.tenSP, qty: item.waitingConfirm[myTeamKey], orderFbKey: order.fbKey, itemKey: item.key });
      const nextTeamKey = myTeamInfo?.next;
      if (nextTeamKey && item.waitingConfirm?.[nextTeamKey] > 0) pendingData.push({ ...item, orderName: order.tenSP, qty: item.waitingConfirm[nextTeamKey], nextTeam: TEAM_CONFIG[nextTeamKey].label });
      const available = (item.tienDo?.[myTeamKey] || 0) - (item.daGiao?.[myTeamKey] || 0) - (item.waitingConfirm?.[nextTeamKey] || 0);
      if (available > 0 && nextTeamKey) transferData.push({ ...item, orderName: order.tenSP, available, total: item.tienDo?.[myTeamKey] || 0, orderFbKey: order.fbKey, itemKey: item.key });
      
      // LOGIC ADMIN: Nếu là admin@gmail.com hoặc haittpc08155@gmail.com thì hốt hết lịch sử
      item.lichSuBanGiao?.forEach(log => {
        if (isAdmin || log.tu === myTeamKey?.toUpperCase() || log.den === myTeamKey?.toUpperCase()) {
          historyData.push(log);
        }
      });
    });
  });

  if (!myTeamKey && !isAdmin) return <Card style={{ margin: '20px', borderRadius: '15px' }}><Empty description="Email không thuộc hệ thống" /></Card>;

  return (
    <div style={{ padding: '12px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Segoe UI, Roboto' }}>
      {/* TIÊU ĐỀ CHÍNH */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ width: '45px', height: '45px', background: myTeamInfo?.color || '#64748b', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '12px' }}>
          <BoxPlotOutlined style={{ color: 'white', fontSize: '24px' }} />
        </div>
        <div>
          <Title level={5} style={{ margin: 0, color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>{isAdmin ? 'Quản trị hệ thống' : 'Hệ thống điều phối'}</Title>
          <Title level={4} style={{ margin: 0, color: '#1e293b' }}>{isAdmin ? 'TỔNG KHO XƯỞNG' : myTeamInfo?.label}</Title>
        </div>
      </div>

      {/* 📥 NHẬN HÀNG (Ẩn nếu là Admin để đỡ rối, hoặc hiện nếu admin muốn nhận hộ) */}
      {receiveData.length > 0 && (
        <Card title={null} style={cardStyle} bodyStyle={{ padding: 0 }}>
          <div style={headerStyle('#f5222d')}>
            <CheckCircleOutlined /> <Text style={{ color: 'white', fontWeight: 600 }}>CẦN XÁC NHẬN NHẬN</Text>
          </div>
          <Table dataSource={receiveData} pagination={false} size="small" scroll={{ x: 400 }} columns={[
            { title: 'Sản phẩm', render: (r) => <div><Text strong>{r.orderName}</Text><br/><Text type="secondary" style={{fontSize: '11px'}}>{r.name}</Text></div> },
            { title: 'SL', dataIndex: 'qty', align: 'center', render: q => <Badge count={q} color="#f5222d" style={{fontWeight: 'bold'}} /> },
            { title: 'Lệnh', align: 'right', render: (r) => <Button type="primary" danger shape="round" size="small" onClick={() => handleAccept(r.orderFbKey, r.itemKey)}>NHẬN</Button> }
          ]} />
        </Card>
      )}

      {/* 🕒 ĐANG GỬI */}
      {pendingData.length > 0 && (
        <Card title={null} style={cardStyle} bodyStyle={{ padding: 0 }}>
          <div style={headerStyle('#fa8c16')}>
            <ClockCircleOutlined className="anticon-spin" /> <Text style={{ color: 'white', fontWeight: 600 }}>HÀNG ĐANG ĐI (CHỜ NHẬN)</Text>
          </div>
          <Table dataSource={pendingData} pagination={false} size="small" scroll={{ x: 400 }} columns={[
            { title: 'Tên hàng', render: (r) => <div><Text strong>{r.orderName}</Text><br/><small>{r.name}</small></div> },
            { title: 'SL', dataIndex: 'qty', align: 'center', render: q => <Tag color="warning" style={{borderRadius: '10px'}}>{q}</Tag> },
            { title: 'Đến', render: (r) => <Tag icon={<RightCircleOutlined />} color="orange">{r.nextTeam}</Tag> }
          ]} />
        </Card>
      )}

      {/* 📤 KHO & GIAO ĐI - Chỉ hiện cho thợ hoặc Admin được gán tổ */}
      {myTeamKey && (
        <Card title={null} style={cardStyle} bodyStyle={{ padding: 0 }}>
          <div style={headerStyle('#1890ff')}>
            <SendOutlined /> <Text style={{ color: 'white', fontWeight: 600 }}>KHO HÀNG & BÀN GIAO</Text>
          </div>
          <Table dataSource={transferData} size="small" scroll={{ x: 500 }} columns={[
            { title: 'Sản phẩm', render: (r) => <div><Text strong>{r.orderName}</Text><br/><small>{r.name}</small></div> },
            { title: 'Tồn', align: 'center', render: (r) => <Tag color="blue" style={{borderRadius: '10px'}}>{r.available}/{r.total}</Tag> },
            { title: 'Giao đi', align: 'right', render: (r) => (
              <Space.Compact>
                <InputNumber min={1} max={r.available} defaultValue={r.available} id={`in-${r.key}`} style={{ width: '65px', borderRadius: '8px 0 0 8px' }} />
                <Button type="primary" style={{ borderRadius: '0 8px 8px 0' }} onClick={() => handleTransfer(r.orderFbKey, r.itemKey, Number(document.getElementById(`in-${r.key}`).value))}>GỬI</Button>
              </Space.Compact>
            )}
          ]} />
        </Card>
      )}

      {/* 📜 LỊCH SỬ TỔNG - NƠI ADMIN SOI LỖI */}
      <Card title={null} style={cardStyle} bodyStyle={{ padding: 0 }}>
        <div style={headerStyle('#64748b')}>
          <HistoryOutlined /> <Text style={{ color: 'white', fontWeight: 600 }}>{isAdmin ? 'NHẬT KÝ TOÀN XƯỞNG' : 'NHẬT KÝ GIAO NHẬN'}</Text>
        </div>
        <Table 
          dataSource={historyData.sort((a, b) => b.id - a.id)} 
          size="small" 
          pagination={{ pageSize: 8, simple: true }}
          scroll={{ x: 450 }}
          columns={[
            { title: 'Thời gian', dataIndex: 'ngay', width: 90 },
            { 
              title: 'Nội dung truy vết', 
              render: (r) => (
                <div>
                  <div style={{fontSize: '11px', marginBottom: '4px'}}>
                    <Tag color="default">{r.tu || '??'} → {r.den}</Tag>
                  </div>
                  <Text strong>{r.sl}</Text> <Text size="small">{r.tenLK}</Text>
                  <div style={{fontSize: '10px', color: '#94a3b8'}}>{r.tenSP}</div>
                </div>
              ) 
            },
          ]} 
        />
      </Card>

      <style jsx>{`
        .ant-table-thead > tr > th { background: #f1f5f9 !important; font-weight: 600 !important; }
        .ant-card { transition: all 0.3s ease; }
        .ant-card:hover { transform: translateY(-2px); boxShadow: 0 6px 16px rgba(0,0,0,0.1); }
        .ant-btn-primary { box-shadow: 0 2px 4px rgba(24,144,255,0.3); }
      `}</style>
    </div>
  );
};

export default ProductionTransfer;