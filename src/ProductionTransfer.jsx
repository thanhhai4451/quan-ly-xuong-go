import React, { useMemo } from 'react';
import { Table, Button, Space, Card, Tag, InputNumber, message, Typography, Empty, Badge } from 'antd';
import { 
  CheckCircleOutlined, SendOutlined, BoxPlotOutlined, 
  HistoryOutlined
} from '@ant-design/icons';
import { ref, update } from 'firebase/database';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const TEAM_CONFIG = {
  phoi: { label: 'Tổ Phôi', emails: ['sinhnguyen@gmail.com', 'chuthoi@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: 'dinhHinh', color: '#1890ff' },
  dinhHinh: { label: 'Tổ Định Hình', emails: ['chaunho@gmail.com','chaulon@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: 'lapRap', color: '#722ed1' },
  lapRap: { label: 'Tổ Lắp Ráp', emails: ['cubi@gmail.com', 'admin@gmail1.com', 'haittpc08155@gmail.com'], next: 'nham', color: '#fa8c16' },
  nham: { label: 'Tổ Trà Nhám', emails: ['phanvantang@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: 'son', color: '#eb2f96' },
  son: { label: 'Tổ Sơn', emails: ['canhnguyen@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: 'dongGoi', color: '#52c41a' },
  dongGoi: { label: 'Tổ Đóng Gói', emails: ['hongyen@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: null, color: '#f5222d' }
};

const ProductionTransfer = ({ orders, user, db }) => {
  const isAdmin = user?.email === 'admin@gmail.com' || user?.email === 'haittpc08155@gmail.com';

  const myTeamKey = useMemo(() => {
    return Object.keys(TEAM_CONFIG).find(key => TEAM_CONFIG[key].emails.includes(user?.email));
  }, [user?.email]);

  const myTeamInfo = TEAM_CONFIG[myTeamKey];
  const isGroupStep = ['lapRap', 'nham', 'son'].includes(myTeamKey);

  // --- HÀM XỬ LÝ GIAO HÀNG (TRANSFER) ---
  const handleTransfer = (orderFbKey, record, qty) => {
    if (!qty || qty <= 0) return message.error("Vui lòng nhập số lượng!");
    
    const order = orders.find(o => o.fbKey === orderFbKey);
    const nextTeamKey = myTeamInfo.next;
    
    // Tạo bản sao chi tiết để cập nhật
    const newChiTiet = order.chiTiet.map(it => {
      // Nếu là tổ gộp cụm: Cập nhật tất cả linh kiện có cùng groupName
      if (isGroupStep && record.isGroup && it.groupName === record.groupName) {
        return { 
          ...it, 
          waitingConfirm: { ...it.waitingConfirm, [nextTeamKey]: (it.waitingConfirm?.[nextTeamKey] || 0) + qty } 
        };
      }
      // Nếu là tổ lẻ hoặc linh kiện lẻ: Chỉ cập nhật đúng cái đó
      if (it.key === record.key) {
        return { 
          ...it, 
          waitingConfirm: { ...it.waitingConfirm, [nextTeamKey]: (it.waitingConfirm?.[nextTeamKey] || 0) + qty } 
        };
      }
      return it;
    });

    update(ref(db, `orders/${orderFbKey}`), { chiTiet: newChiTiet })
      .then(() => message.success(`🚀 Đã gửi ${qty} ${isGroupStep ? 'bộ' : 'cái'} thành công!`));
  };

  // --- HÀM XỬ LÝ NHẬN HÀNG (ACCEPT) ---
  const handleAccept = (orderFbKey, record) => {
    const order = orders.find(o => o.fbKey === orderFbKey);
    const senderTeamKey = Object.keys(TEAM_CONFIG).find(key => TEAM_CONFIG[key].next === myTeamKey);
    const qtyToAccept = record.qty;

    const newChiTiet = order.chiTiet.map(it => {
      const isTarget = (record.isGroup && it.groupName === record.groupName) || (it.key === record.key);
      
      if (isTarget) {
        return {
          ...it,
          tonKho: { ...it.tonKho, [myTeamKey]: (it.tonKho?.[myTeamKey] || 0) + qtyToAccept },
          waitingConfirm: { ...it.waitingConfirm, [myTeamKey]: 0 },
          daGiao: { ...it.daGiao, [senderTeamKey]: (it.daGiao?.[senderTeamKey] || 0) + qtyToAccept },
          lichSuBanGiao: [{ 
            id: Date.now(), 
            ngay: dayjs().format('DD/MM HH:mm'), 
            loai: 'NHAN_VAO', 
            tu: senderTeamKey?.toUpperCase(), 
            den: myTeamKey.toUpperCase(), 
            sl: qtyToAccept, 
            tenSP: order.tenSP, 
            tenLK: record.displayName 
          }, ...(it.lichSuBanGiao || [])]
        };
      }
      return it;
    });

    update(ref(db, `orders/${orderFbKey}`), { chiTiet: newChiTiet })
      .then(() => message.success("✅ Đã nhận vào kho!"));
  };

  // --- LOGIC PHÂN LOẠI & GỘP DỮ LIỆU ---
  const { receiveData, pendingData, transferData, historyData } = useMemo(() => {
    const receive = [];
    const pending = [];
    const transfer = [];
    const history = [];

    orders.forEach(order => {
      const groupedData = {};

      order.chiTiet?.forEach(item => {
        const nextTeamKey = myTeamInfo?.next;
        const senderTeamKey = Object.keys(TEAM_CONFIG).find(key => TEAM_CONFIG[key].next === myTeamKey);

        // Xác định định danh (Theo cụm hoặc theo lẻ)
        const isCurrentlyGrouped = ['lapRap', 'nham', 'son'].includes(myTeamKey);
        const identifier = (isCurrentlyGrouped && item.groupName) ? `GROUP_${item.groupName}` : item.key;
        const displayName = (isCurrentlyGrouped && item.groupName) ? `CỤM: ${item.groupName.toUpperCase()}` : item.name;

        if (!groupedData[identifier]) {
          groupedData[identifier] = {
            ...item,
            displayName,
            isGroup: (isCurrentlyGrouped && !!item.groupName),
            orderName: order.tenSP,
            orderFbKey: order.fbKey,
            totalNeed: (isCurrentlyGrouped && item.groupName) ? (item.soBoCum || 0) : (item.can || 0),
            available: 0,
            waitingMe: 0,
            waitingNext: 0
          };
        }

        // Cộng dồn logic (Nếu là cụm thì các chỉ số này sẽ giống nhau nên ko cần sum, chỉ lấy đại diện)
        groupedData[identifier].waitingMe = item.waitingConfirm?.[myTeamKey] || 0;
        groupedData[identifier].waitingNext = nextTeamKey ? (item.waitingConfirm?.[nextTeamKey] || 0) : 0;
        
        // Tính tồn kho có thể giao đi
        const done = item.tienDo?.[myTeamKey] || 0;
        const handed = item.daGiao?.[myTeamKey] || 0;
        groupedData[identifier].available = done - handed - groupedData[identifier].waitingNext;

        // Gom lịch sử
        item.lichSuBanGiao?.forEach(log => history.push(log));
      });

      // Đưa vào các mảng hiển thị
      Object.values(groupedData).forEach(obj => {
        if (obj.waitingMe > 0) receive.push({ ...obj, qty: obj.waitingMe });
        if (obj.waitingNext > 0) pending.push({ ...obj, qty: obj.waitingNext, nextTeam: TEAM_CONFIG[myTeamInfo.next]?.label });
        if (obj.available > 0 && myTeamInfo?.next) transfer.push(obj);
      });
    });

    return { receiveData: receive, pendingData: pending, transferData: transfer, historyData: history };
  }, [orders, myTeamKey, myTeamInfo]);

  // Styles (giữ nguyên của đại ca)
  const cardStyle = { borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: 'none' };
  const headerStyle = (color) => ({ background: `linear-gradient(45deg, ${color}, ${color}dd)`, color: 'white', padding: '12px 16px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: '8px' });

  if (!myTeamKey && !isAdmin) return <Card style={{ margin: '20px', borderRadius: '15px' }}><Empty description="Email không thuộc hệ thống" /></Card>;

  return (
    <div style={{ padding: '12px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '15px' }}>
        <div style={{ width: '45px', height: '45px', background: myTeamInfo?.color || '#64748b', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '12px' }}>
          <BoxPlotOutlined style={{ color: 'white', fontSize: '24px' }} />
        </div>
        <div>
          <Title level={5} style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>{isAdmin ? 'HỆ THỐNG QUẢN TRỊ' : 'ĐIỀU PHỐI SẢN XUẤT'}</Title>
          <Title level={4} style={{ margin: 0 }}>{isAdmin ? 'TỔNG KHO TOÀN XƯỞNG' : myTeamInfo?.label}</Title>
        </div>
      </div>

      {/* 📥 NHẬN HÀNG */}
      {receiveData.length > 0 && (
        <Card title={null} style={cardStyle} bodyStyle={{ padding: 0 }}>
          <div style={headerStyle('#f5222d')}><CheckCircleOutlined /> <Text style={{ color: 'white', fontWeight: 600 }}>CHỜ XÁC NHẬN NHẬN</Text></div>
          <Table dataSource={receiveData} pagination={false} size="small" columns={[
            { title: 'Hàng hóa', render: (r) => <div><Text strong>{r.orderName}</Text><br/><Text type="secondary" style={{fontSize: '11px'}}>{r.displayName}</Text></div> },
            { title: 'SL', align: 'center', render: r => <Badge count={r.qty} color="#f5222d" /> },
            { title: 'Lệnh', align: 'right', render: (r) => <Button type="primary" danger shape="round" size="small" onClick={() => handleAccept(r.orderFbKey, r)}>NHẬN</Button> }
          ]} />
        </Card>
      )}

      {/* 📤 KHO & BÀN GIAO */}
      {myTeamKey && (
        <Card title={null} style={cardStyle} bodyStyle={{ padding: 0 }}>
          <div style={headerStyle('#1890ff')}><SendOutlined /> <Text style={{ color: 'white', fontWeight: 600 }}>KHO TỔ & BÀN GIAO</Text></div>
          <Table dataSource={transferData} size="small" columns={[
            { title: 'Hàng hóa', render: (r) => <div><Text strong>{r.orderName}</Text><br/><Text style={{fontSize:'11px', color: r.isGroup ? '#722ed1' : '#1890ff'}}>{r.displayName}</Text></div> },
            { title: 'Tồn kho', align: 'center', render: (r) => <Tag color="blue">{r.available} {r.isGroup ? 'Bộ' : 'Cái'}</Tag> },
            { title: 'Giao đi', align: 'right', render: (r) => (
              <Space.Compact>
                <InputNumber min={1} max={r.available} defaultValue={r.available} id={`in-${r.isGroup ? r.groupName : r.key}`} style={{ width: '70px' }} />
                <Button type="primary" onClick={() => handleTransfer(r.orderFbKey, r, Number(document.getElementById(`in-${r.isGroup ? r.groupName : r.key}`).value))}>GỬI</Button>
              </Space.Compact>
            )}
          ]} />
        </Card>
      )}

      {/* 📜 NHẬT KÝ (Giữ nguyên giao diện của đại ca) */}
      <Card title={null} style={cardStyle} bodyStyle={{ padding: 0 }}>
        <div style={headerStyle('#64748b')}><HistoryOutlined /> <Text style={{ color: 'white', fontWeight: 600 }}>LỊCH SỬ GIAO NHẬN</Text></div>
        <Table 
          dataSource={historyData.sort((a, b) => b.id - a.id)} 
          size="small" 
          pagination={{ pageSize: 5, simple: true }}
          columns={[
            { title: 'Thời gian', dataIndex: 'ngay', width: 100 },
            { title: 'Nội dung', render: (r) => (
              <div>
                <Tag color="default">{r.tu} → {r.den}</Tag>
                <Text strong>{r.sl}</Text> <span>{r.tenLK}</span>
                <div style={{fontSize: '10px', color: '#94a3b8'}}>{r.tenSP}</div>
              </div>
            )}
          ]} 
        />
      </Card>
    </div>
  );
};

export default ProductionTransfer;