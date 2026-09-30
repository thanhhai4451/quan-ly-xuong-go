import React, { useMemo } from 'react';
import { Table, Button, Space, Card, Tag, InputNumber, message, Typography, Empty, Badge } from 'antd';
import {
  CheckCircleOutlined, SendOutlined, BoxPlotOutlined,
  HistoryOutlined, ClockCircleOutlined, RightCircleOutlined
} from '@ant-design/icons';
import { ref, runTransaction } from 'firebase/database';
import dayjs from 'dayjs';
import {
  getNextProductionStep,
  getPreviousProductionStep,
  getProductionTeamLabel,
} from './utils/productionSteps';

const { Text, Title } = Typography;

const TEAM_CONFIG = {
  phoi: { label: 'Tổ Phôi', emails: ['sinhnguyen@gmail.com', 'chuthoi@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: 'dinhHinh', color: '#1890ff' },
  dinhHinh: { label: 'Tổ Định Hình', emails: ['chaunho@gmail.com','chaulon@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: 'lapRap', color: '#722ed1' },
  lapRap: { label: 'Tổ Lắp Ráp', emails: ['cubi@gmail.com', 'admin@gmail1.com', 'haittpc08155@gmail.com'], next: 'nham', color: '#fa8c16' },
  nham: { label: 'Tổ Trà Nhám', emails: ['phanvantang@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: 'son', color: '#eb2f96' },
  son: { label: 'Tổ Sơn', emails: ['canhnguyen@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: 'dongGoi', color: '#52c41a' },
  dongGoi: { label: 'Tổ Đóng Gói', emails: ['hongyen@gmail.com', 'admin@gmail.com', 'haittpc08155@gmail.com'], next: null, color: '#f5222d' }
};

const ProductionTransfer = ({ orders = [], user, db }) => {
  const isAdmin = user?.email === 'admin@gmail.com' || user?.email === 'haittpc08155@gmail.com';

  const myTeamKey = useMemo(() => {
    return Object.keys(TEAM_CONFIG).find(key => TEAM_CONFIG[key].emails.includes(user?.email));
  }, [user?.email]);

  const myTeamInfo = TEAM_CONFIG[myTeamKey];
  // 1. Chuyển giao hàng sang tổ tiếp theo
  const handleTransfer = (orderFbKey, record, qty) => {
    if (!qty || qty <= 0) return message.error("Vui lòng nhập số lượng hợp lệ!");
    if (qty > record.available) return message.error(`Số lượng chuyển (${qty}) vượt quá tồn kho khả dụng (${record.available})!`);

    const nextTeamKey = record.nextTeamKey;
    if (!nextTeamKey) return message.error("Tổ hiện tại không có tổ kế tiếp!");

    let failureMessage = "Không thể gửi: dữ liệu đơn hàng đã thay đổi, vui lòng tải lại.";
    runTransaction(ref(db, `orders/${orderFbKey}`), (order) => {
      if (!order || !Array.isArray(order.chiTiet)) return;

      const targetItems = order.chiTiet.filter((item) =>
        (record.isGroup
          ? item.groupName === record.groupName
          : item.key === record.key) &&
        getNextProductionStep(myTeamKey, item.skipSteps || []) === nextTeamKey,
      );
      if (targetItems.length === 0) return;

      const stagedValues = targetItems.map(
        (item) => Number(item.choKiemDinh?.[myTeamKey]) || 0,
      );
      if (stagedValues.some((staged) => staged < qty)) {
        failureMessage = "Số lượng treo kiểm định không đủ để gửi.";
        return;
      }

      return {
        ...order,
        chiTiet: order.chiTiet.map((item) => {
          const isTarget =
            (record.isGroup
              ? item.groupName === record.groupName
              : item.key === record.key) &&
            getNextProductionStep(myTeamKey, item.skipSteps || []) === nextTeamKey;
          if (!isTarget) return item;

          const remainingStaged =
            (Number(item.choKiemDinh?.[myTeamKey]) || 0) - qty;
          const nextStaged = { ...item.choKiemDinh };
          if (remainingStaged > 0) {
            nextStaged[myTeamKey] = remainingStaged;
          } else {
            delete nextStaged[myTeamKey];
          }

          return {
            ...item,
            choKiemDinh: nextStaged,
            waitingConfirm: {
              ...item.waitingConfirm,
              [nextTeamKey]:
                (Number(item.waitingConfirm?.[nextTeamKey]) || 0) + qty,
            },
          };
        }),
      };
    })
      .then(({ committed }) => {
        if (committed) {
          message.success(`🚀 Đã gửi ${qty} ${record.isGroup ? 'bộ' : 'cái'}!`);
        } else {
          message.error(failureMessage);
        }
      })
      .catch(() => message.error("Lỗi cập nhật dữ liệu bàn giao!"));
  };

  // 2. Xác nhận nhận hàng vào kho tổ
  const handleAccept = (orderFbKey, record) => {
    const order = orders.find(o => o.fbKey === orderFbKey);
    if (!order) return;

    if (!myTeamKey) return message.error("Không xác định được tổ nhận hàng!");

    let failureMessage = "Không thể nhận: lô hàng đã được xử lý hoặc dữ liệu đã thay đổi.";
    const logId = Date.now() + Math.random();
    const logDate = dayjs().format('DD/MM HH:mm');
    runTransaction(ref(db, `orders/${orderFbKey}`), (currentOrder) => {
      if (!currentOrder || !Array.isArray(currentOrder.chiTiet)) return;

      const targetItems = currentOrder.chiTiet.filter((item) =>
        (record.isGroup
          ? item.groupName === record.groupName
          : item.key === record.key) &&
        getPreviousProductionStep(myTeamKey, item.skipSteps || []) ===
          record.fromTeamKey,
      );
      if (targetItems.length === 0) return;

      const qtyToAccept =
        Number(targetItems[0].waitingConfirm?.[myTeamKey]) || 0;
      if (qtyToAccept <= 0) return;
      if (
        record.isGroup &&
        targetItems.some(
          (item) =>
            (Number(item.waitingConfirm?.[myTeamKey]) || 0) !==
            (Number(targetItems[0].waitingConfirm?.[myTeamKey]) || 0),
        )
      ) {
        failureMessage = "Số lượng chờ nhận trong cụm không đồng nhất.";
        return;
      }

      return {
        ...currentOrder,
        chiTiet: currentOrder.chiTiet.map((item, index) => {
          const senderTeamKey = getPreviousProductionStep(
            myTeamKey,
            item.skipSteps || [],
          );
          const isTarget =
            (record.isGroup
              ? item.groupName === record.groupName
              : item.key === record.key) &&
            senderTeamKey === record.fromTeamKey;
          if (!isTarget) return item;
          const itemQty = Number(item.waitingConfirm?.[myTeamKey]) || 0;
          if (itemQty <= 0) return item;

          return {
            ...item,
            tienDo: {
              ...item.tienDo,
              [senderTeamKey]:
                (Number(item.tienDo?.[senderTeamKey]) || 0) + itemQty,
            },
            tonKho: {
              ...item.tonKho,
              [myTeamKey]:
                (Number(item.tonKho?.[myTeamKey]) || 0) + itemQty,
            },
            waitingConfirm: { ...item.waitingConfirm, [myTeamKey]: 0 },
            daGiao: {
              ...item.daGiao,
              [senderTeamKey]:
                (Number(item.daGiao?.[senderTeamKey]) || 0) + itemQty,
            },
            lichSuBanGiao: [{
              id: logId + index,
              ngay: logDate,
              loai: 'NHAN_VAO',
              tu: senderTeamKey.toUpperCase(),
              den: myTeamKey.toUpperCase(),
              sl: itemQty,
              tenSP: currentOrder.tenSP,
              tenLK: record.isGroup ? item.name : record.displayName,
            }, ...(item.lichSuBanGiao || [])],
          };
        }),
      };
    })
      .then(({ committed }) => {
        if (committed) message.success("✅ Đã xác nhận tiến độ và nhận vào kho!");
        else message.error(failureMessage);
      })
      .catch(() => message.error("Lỗi tiếp nhận và xác nhận tiến độ!"));
  };

  // 3. Gom nhóm và tính toán dữ liệu kho
  const { receiveData, pendingData, transferData, historyData } = useMemo(() => {
    let rec = [], pen = [], tra = [], his = [];

    orders.forEach(order => {
      const groupedData = {};

      order.chiTiet?.forEach(item => {
        const isCurrentlyGrouped = ['lapRap', 'nham', 'son', 'dongGoi'].includes(myTeamKey);
        const isGroup = isCurrentlyGrouped && !!item.groupName;
        const nextTeamKey = getNextProductionStep(myTeamKey, item.skipSteps || []);
        const fromTeamKey = getPreviousProductionStep(myTeamKey, item.skipSteps || []);
        const waitingMe = Number(item.waitingConfirm?.[myTeamKey]) || 0;
        const baseIdentifier = isGroup ? `GROUP_${item.groupName}` : item.key;
        const identifier = `${baseIdentifier}_${fromTeamKey || "START"}_${nextTeamKey || "END"}`;

        if (myTeamKey === 'lapRap' && waitingMe > 0) {
          rec.push({
            ...item,
            displayName: item.name,
            isGroup: false,
            orderName: order.tenSP,
            orderFbKey: order.fbKey,
            fromTeamKey,
            qty: waitingMe,
          });
        }
        
        if (!groupedData[identifier]) {
          const staged = Number(item.choKiemDinh?.[myTeamKey]) || 0;
          groupedData[identifier] = {
            ...item,
            displayName: (isCurrentlyGrouped && item.groupName) ? `CỤM: ${item.groupName.toUpperCase()}` : item.name,
            isGroup,
            orderName: order.tenSP,
            orderFbKey: order.fbKey,
            available: staged,
            waitingMe: myTeamKey === 'lapRap' ? 0 : waitingMe,
            waitingNext: Number(item.waitingConfirm?.[nextTeamKey]) || 0,
            nextTeamKey,
            fromTeamKey,
          };
        } else if (isGroup) {
          groupedData[identifier].available = Math.min(
            groupedData[identifier].available,
            Number(item.choKiemDinh?.[myTeamKey]) || 0,
          );
          if (myTeamKey !== 'lapRap') {
            groupedData[identifier].waitingMe = Math.max(
              groupedData[identifier].waitingMe,
              Number(item.waitingConfirm?.[myTeamKey]) || 0,
            );
          }
          groupedData[identifier].waitingNext = Math.max(
            groupedData[identifier].waitingNext,
            Number(item.waitingConfirm?.[nextTeamKey]) || 0,
          );
        }

        // Lịch sử giao nhận
        item.lichSuBanGiao?.forEach(log => {
          if (isAdmin || log.tu === myTeamKey?.toUpperCase() || log.den === myTeamKey?.toUpperCase()) {
            his.push(log);
          }
        });
      });

      Object.values(groupedData).forEach(obj => {
        if (obj.waitingMe > 0) rec.push({ ...obj, qty: obj.waitingMe });
        if (obj.waitingNext > 0) {
          pen.push({
            ...obj,
            qty: obj.waitingNext,
            nextTeam: getProductionTeamLabel(obj.nextTeamKey),
          });
        }
        if (obj.available > 0 && obj.nextTeamKey) tra.push(obj);
      });
    });

    return { receiveData: rec, pendingData: pen, transferData: tra, historyData: his };
  }, [orders, myTeamKey, isAdmin]);

  const cardStyle = { borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: 'none' };
  const headerStyle = (color) => ({ background: color, color: 'white', padding: '12px 16px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: '8px' });

  if (!myTeamKey && !isAdmin) return <Card style={{ margin: '20px' }}><Empty description="Email không thuộc hệ thống hoặc chưa được phân tổ" /></Card>;

  return (
    <div style={{ padding: '12px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header chính */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '15px' }}>
        <div style={{ width: '40px', height: '40px', background: myTeamInfo?.color || '#64748b', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '12px' }}>
          <BoxPlotOutlined style={{ color: 'white', fontSize: '20px' }} />
        </div>
        <div>
          <Title level={4} style={{ margin: 0 }}>{isAdmin ? 'QUẢN TRỊ TỔNG' : `BÀN GIAO: ${myTeamInfo?.label}`}</Title>
        </div>
      </div>

      {/* 1. ĐỢI NHẬN */}
      {receiveData.length > 0 && (
        <Card title={null} style={cardStyle} bodyStyle={{ padding: 0 }}>
          <div style={headerStyle('#f5222d')}><CheckCircleOutlined /> <Text style={{ color: 'white', fontWeight: 600 }}>CẦN NHẬN HÀNG</Text></div>
          <Table dataSource={receiveData} rowKey={(r) => `${r.orderFbKey}-${r.key}-${r.fromTeamKey || ''}`} pagination={false} size="small" columns={[
            { title: 'Sản phẩm', render: r => <div><Text strong>{r.orderName}</Text><br/><small>{r.displayName}</small></div> },
            { title: 'SL', align: 'center', render: r => <Badge count={r.qty} overflowCount={999999} color="#f5222d" /> },
            { title: 'Lệnh', align: 'right', render: r => <Button type="primary" danger size="small" onClick={() => handleAccept(r.orderFbKey, r)}>NHẬN</Button> }
          ]} />
        </Card>
      )}

      {/* 2. ĐANG GỬI ĐI */}
      {pendingData.length > 0 && (
        <Card title={null} style={cardStyle} bodyStyle={{ padding: 0 }}>
          <div style={headerStyle('#fa8c16')}><ClockCircleOutlined /> <Text style={{ color: 'white', fontWeight: 600 }}>ĐANG CHỜ TỔ NHẬN HÀNG XÁC NHẬN</Text></div>
          <Table dataSource={pendingData} rowKey={(r) => `${r.orderFbKey}-${r.key}-${r.nextTeamKey || ''}`} pagination={false} size="small" columns={[
            { title: 'Sản phẩm', render: r => <div><Text strong>{r.orderName}</Text><br/><small>{r.displayName}</small></div> },
            { title: 'SL', align: 'center', render: r => <Tag color="orange">{r.qty}</Tag> },
            { title: 'Đến', render: r => <Tag icon={<RightCircleOutlined />} color="volcano">{r.nextTeam}</Tag> }
          ]} />
        </Card>
      )}

      {/* 3. KHO TỔ & BÀN GIAO */}
      {myTeamKey && (
        <Card title={null} style={cardStyle} bodyStyle={{ padding: 0 }}>
          <div style={headerStyle('#1890ff')}><SendOutlined /> <Text style={{ color: 'white', fontWeight: 600 }}>KHO TỔ & BÀN GIAO</Text></div>
          <Table dataSource={transferData} rowKey={(r) => `${r.orderFbKey}-${r.key}-${r.nextTeamKey || ''}`} size="small" columns={[
            { title: 'Hàng hóa', render: r => <div><Text strong>{r.orderName}</Text><br/><Text style={{fontSize:'11px', color: r.isGroup ? '#722ed1' : '#1890ff'}}>{r.displayName}</Text></div> },
            { title: 'Tồn', align: 'center', render: r => <Tag color="blue">{r.available} {r.isGroup ? 'Bộ' : 'Cái'}</Tag> },
            { title: 'Giao', align: 'right', render: r => {
                const inputId = `in-${r.orderFbKey}-${r.isGroup ? r.groupName : r.key}-${r.nextTeamKey}`;
                return (
                  <Space.Compact>
                    <InputNumber min={1} max={r.available} defaultValue={r.available} id={inputId} style={{ width: '65px' }} />
                    <Button type="primary" onClick={() => {
                      const inputEl = document.getElementById(inputId);
                      const val = inputEl ? Number(inputEl.value) : r.available;
                      handleTransfer(r.orderFbKey, r, val);
                    }}>GỬI</Button>
                  </Space.Compact>
                );
              }
            }
          ]} />
        </Card>
      )}

      {/* 4. LỊCH SỬ GIAO NHẬN */}
      <Card title={null} style={cardStyle} bodyStyle={{ padding: 0 }}>
        <div style={headerStyle('#64748b')}><HistoryOutlined /> <Text style={{ color: 'white', fontWeight: 600 }}>NHẬT KÝ GIAO NHẬN</Text></div>
        <Table dataSource={historyData.sort((a,b) => b.id - a.id)} rowKey="id" size="small" pagination={{ pageSize: 5 }} columns={[
          { title: 'Thời gian', dataIndex: 'ngay', width: 90 },
          { title: 'Truy vết', render: r => <div><Tag>{r.tu} → {r.den}</Tag> <b>{r.sl}</b> {r.tenLK}<br/><small>{r.tenSP}</small></div> }
        ]} />
      </Card>
    </div>
  );
};

export default ProductionTransfer;