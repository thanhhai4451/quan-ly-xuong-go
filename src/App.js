import React, { useState, useMemo, useEffect } from 'react';
import {
  Table, Tag, Progress, Card, Typography, Collapse,
  InputNumber, Space, Button, Modal, Form, Input,
  DatePicker, message, List, Popover, Row, Col,
  Statistic, Tabs, Badge, Avatar, Checkbox
} from 'antd';
import { PlusOutlined, DeleteOutlined, BuildOutlined, ClockCircleOutlined, CarryOutOutlined, SearchOutlined, HistoryOutlined, AlertOutlined, AppstoreOutlined, UserOutlined, LogoutOutlined, LockOutlined, EditOutlined, BellOutlined, CheckCircleOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { db, auth } from "./firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

const { Panel } = Collapse;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Đây là "linh kiện" Chuông thông báo đã được cách ly
const NotificationIcon = React.memo(({ count, hasDanger }) => {
  return (
    <Badge count={count} offset={[-2, 8]}>
      <Button
        type="text"
        icon={
          hasDanger ?
            <AlertOutlined spin style={{ fontSize: '22px', color: '#ff4d4f' }} /> :
            <BellOutlined style={{ fontSize: '22px' }} />
        }
      />
    </Badge>
  );
});

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchLog, setSearchLog] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [loginForm] = Form.useForm();

  const [realtimeNotis, setRealtimeNotis] = useState([]);

  useEffect(() => {
  if (!user) return;
  const notiRef = ref(db, 'notifications/');
  onValue(notiRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const list = Object.keys(data).map(k => ({...data[k], fbKey: k}));
      setRealtimeNotis(list.reverse().slice(0, 20)); // Lấy 20 cái mới nhất
    }
  });
}, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const ordersRef = ref(db, 'orders/');
    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ ...data[key], fbKey: key }));
        setOrders(list.reverse());
      } else {
        setOrders([]);
      }
    });
  }, [user]);
  // Thay thế toàn bộ useState và useEffect của notifications bằng cục này:
const notifications = useMemo(() => {
    if (orders.length === 0) return realtimeNotis; // Nếu chưa có đơn thì hiện thông báo từ cán bộ

    const homNay = dayjs().startOf('day');

    // 1. Thông báo sắp đến hạn (Giữ nguyên logic cũ của đại ca)
    const sapDenHan = orders.filter(order => {
      if (order.daGiao) return false;
      const ngayGiao = dayjs(order.ngayGiao, 'DD/MM/YYYY');
      const soNgayConLai = ngayGiao.diff(homNay, 'day');
      const daXongDongGoi = (order.soLuongDongGoi || 0) >= (order.tongSoBo || 1);
      return soNgayConLai <= 10 && soNgayConLai >= 0 && !daXongDongGoi;
    }).map(order => ({
      id: `deadline-${order.fbKey}`,
      type: 'warning',
      title: 'SẮP ĐẾN HẠN GIAO',
      content: `Đơn ${order.tenSP} sắp đến ngày giao khách!`,
      time: order.ngayGiao
    }));

    // 2. Thông báo TRỄ CÔNG ĐOẠN (Giữ nguyên logic cũ của đại ca)
    const thongBaoTre = [];
    orders.forEach(order => {
      if (order.daGiao) return;
      order.chiTiet?.forEach(item => {
        ['phoi', 'dinhHinh', 'lapRap', 'nham', 'son'].forEach(step => {
          const deadlineValue = item.deadlines?.[step];
          const hoanThanh = Number(item.tienDo?.[step] || 0);
          const can = Number(item.can || 0);
          if (deadlineValue && hoanThanh < can) {
            const ngayDeadline = dayjs(deadlineValue).startOf('day');
            const soNgayTre = homNay.diff(ngayDeadline, 'day');
            if (soNgayTre > 0) {
              thongBaoTre.push({
                id: `overdue-${order.fbKey}-${item.key}-${step}`,
                type: 'danger',
                title: 'CẢNH BÁO TRỄ TIẾN ĐỘ',
                content: `Đơn [${order.tenSP}] - Tổ [${step.toUpperCase()}] trễ ${soNgayTre} ngày!`,
                time: `Hạn: ${ngayDeadline.format('DD/MM')}`
              });
            }
          }
        });
      });
    });

    // --- BƯỚC QUAN TRỌNG: GỘP CẢ 3 LOẠI VÀO ĐÂY ---
    // Ưu tiên: Tin báo trễ (danger) -> Tin cán bộ cập nhật (realtimeNotis) -> Tin sắp đến hạn
    return [...thongBaoTre, ...realtimeNotis, ...sapDenHan];

  }, [orders, realtimeNotis]); 

  const handleLogin = async (values) => {
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      message.success("Chào đại ca!");
    } catch (error) {
      message.error("Sai tài khoản hoặc mật khẩu!");
    }
  };

  const calculateOrderProgress = (order) => {
    if (!order || !order.tongSoBo) return 0;
    const tongBo = Number(order.tongSoBo);
    const daDongGoi = Number(order.soLuongDongGoi) || 0;
    return Math.min(100, Math.round((daDongGoi / tongBo) * 100));
  };




  const handleLogout = () => signOut(auth).then(() => message.info("Đã đăng xuất!"));

  const handleDeliverOrder = (fbKey) => {
    Modal.confirm({
      title: 'Xác nhận giao hàng?',
      content: 'Đơn hàng này sẽ được chuyển sang mục Đã Giao.',
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: () => {
        update(ref(db, `orders/${fbKey}`), {
          daGiao: true,
          ngayThucTeGiao: dayjs().format('DD/MM/YYYY HH:mm')
        }).then(() => message.success("Đã giao hàng thành công!"));
      }
    });
  };

const handleUpdateRecord = (fbKey, detailKey, to, value) => {
    const val = parseInt(value) || 0;
    const order = orders.find(o => o.fbKey === fbKey);
    if (!order) return;

    const steps = ['phoi', 'dinhHinh', 'lapRap', 'nham', 'son', 'dongGoi'];
    const currentIndex = steps.indexOf(to);
    const item = order.chiTiet.find(i => i.key === detailKey);
    if (!item) return;

    // Giữ nguyên logic kiểm tra tiến độ cũ của đại ca
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1];
      const prevVal = item.tienDo?.[prevStep] || 0;
      if (val > prevVal) {
        const isPrevSkipped = item.skipSteps?.includes(prevStep);
        if (!isPrevSkipped) {
          message.error(`Tổ ${to.toUpperCase()} (${val}) không được lớn hơn tổ ${prevStep.toUpperCase()} (${prevVal})!`);
          return;
        }
      }
    }

    if (val > item.can) {
      message.warning(`Lưu ý: Số lượng ${to.toUpperCase()} đang vượt quá số lượng cần (${item.can})`);
    }

    const newChiTiet = order.chiTiet.map(it => {
      if (it.key === detailKey) {
        const hienTai = it.tienDo?.[to] || 0;
        if (val === hienTai) return it;

        const deadlineStep = it.deadlines?.[to];
        let soNgayTreLuuLai = 0;
        if (deadlineStep && val < it.can) {
          const homNay = dayjs().startOf('day');
          const ngayDeadline = dayjs(deadlineStep);
          if (homNay.isAfter(ngayDeadline)) {
            soNgayTreLuuLai = homNay.diff(ngayDeadline, 'day');
          }
        }

        const newLog = {
          id: Date.now(),
          ngay: dayjs().format('DD/MM HH:mm'),
          to: to.toUpperCase(),
          sl: val,
          chenhLech: val - hienTai,
          userEmail: user?.email || 'Ẩn danh',
          tre: soNgayTreLuuLai
        };

        return {
          ...it,
          tienDo: { ...it.tienDo, [to]: val },
          lichSu: [newLog, ...(it.lichSu || [])]
        };
      }
      return it;
    });

    // Cập nhật Database và đẩy thông báo cho Chuông
    update(ref(db, `orders/${fbKey}`), { chiTiet: newChiTiet })
      .then(() => {
        message.success(`Đã cập nhật tổ ${to.toUpperCase()}`);

        // --- ĐOẠN CODE MỚI ĐỂ ĐẨY THÔNG BÁO LÊN CHUÔNG ---
        const notiRef = ref(db, 'notifications/');
        const canBo = user?.email ? user.email.split('@')[0].toUpperCase() : 'ẨN DANH';
        
        push(notiRef, {
          id: Date.now(),
          title: 'CẬP NHẬT SẢN XUẤT',
          content: `${canBo} vừa cập nhật [${item.name}] của đơn [${order.tenSP}] - Tổ: ${to.toUpperCase()} chốt ${val} SP`,
          time: dayjs().format('HH:mm DD/MM'),
          type: 'info',
          isRead: false
        });
        // ----------------------------------------------
      })
      .catch(() => message.error("Lỗi kết nối Database!"));
  };

  const openEditModal = (order) => {
    setEditingOrder(order);
    const initialItems = order.chiTiet.map(item => {
      const deadlines = {};
      if (item.deadlines) {
        Object.keys(item.deadlines).forEach(step => {
          if (item.deadlines[step]) deadlines[step] = dayjs(item.deadlines[step]);
        });
      }
      return {
        ...item,
        qty: item.can,
        skipSteps: item.skipSteps || [],
        deadlines: deadlines
      };
    });

    editForm.setFieldsValue({
      tenSP: order.tenSP,
      tongSoBo: order.tongSoBo,
      ngayGiao: dayjs(order.ngayGiao, 'DD/MM/YYYY'),
      deadlineDongGoi: order.deadlineDongGoi ? dayjs(order.deadlineDongGoi) : null,
      items: initialItems
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateOrder = (values) => {
    const updatedChiTiet = values.items.map((item) => {
      const formattedDeadlines = {};
      if (item.deadlines) {
        Object.keys(item.deadlines).forEach(step => {
          if (item.deadlines[step]) formattedDeadlines[step] = item.deadlines[step].format('YYYY-MM-DD');
        });
      }
      return {
        ...item,
        skipSteps: item.skipSteps || [],
        key: item.key || Date.now() + Math.random(),
        can: item.qty,
        deadlines: formattedDeadlines,
        tienDo: item.tienDo || { phoi: 0, dinhHinh: 0, lapRap: 0, nham: 0, son: 0, dongGoi: 0 },
        lichSu: item.lichSu || []
      };
    });

    update(ref(db, `orders/${editingOrder.fbKey}`), {
      tenSP: values.tenSP.toUpperCase(),
      tongSoBo: Number(values.tongSoBo),
      ngayGiao: values.ngayGiao.format('DD/MM/YYYY'),
      deadlineDongGoi: values.deadlineDongGoi ? values.deadlineDongGoi.format('YYYY-MM-DD') : null,
      chiTiet: updatedChiTiet
    }).then(() => {
      message.success("Đã cập nhật xong!");
      setIsEditModalOpen(false);
    });
  };

  const handleCreateOrder = (v) => {
    const list = v.items.map((it, i) => {
      const formattedDeadlines = {};
      if (it.deadlines) {
        Object.keys(it.deadlines).forEach(step => {
          if (it.deadlines[step]) formattedDeadlines[step] = it.deadlines[step].format('YYYY-MM-DD');
        });
      }
      return {
        key: Date.now() + i,
        name: it.name,
        can: it.qty,
        skipSteps: it.skipSteps || [],
        deadlines: formattedDeadlines,
        tienDo: { phoi: 0, dinhHinh: 0, lapRap: 0, nham: 0, son: 0, dongGoi: 0 },
        lichSu: []
      };
    });

    push(ref(db, 'orders/'), {
      tenSP: v.tenSP.toUpperCase(),
      tongSoBo: Number(v.tongSoBo),
      soLuongDongGoi: 0,
      ngayGiao: v.ngayGiao.format('DD/MM/YYYY'),
      deadlineDongGoi: v.deadlineDongGoi ? v.deadlineDongGoi.format('YYYY-MM-DD') : null,
      chiTiet: list,
      daGiao: false
    }).then(() => {
      setIsModalOpen(false);
      form.resetFields();
      message.success('Đã tạo đơn thành công!');
    });
  };

  const stats = useMemo(() => {
    const total = orders.filter(o => !o.daGiao).length;
    const completed = orders.filter(o => !o.daGiao && (o.soLuongDongGoi || 0) >= (o.tongSoBo || 1)).length;
    const pending = total - completed;
    const overdue = orders.filter(o => {
      const isDone = (o.soLuongDongGoi || 0) >= (o.tongSoBo || 1);
      return !o.daGiao && !isDone && dayjs(o.ngayGiao, 'DD/MM/YYYY').isBefore(dayjs(), 'day');
    }).length;
    return { total, completed, pending, overdue };
  }, [orders]);

  const orderCategorized = useMemo(() => {
    const filtered = orders.filter(order => {
      const matchSearch = order.tenSP.toLowerCase().includes(searchText.toLowerCase());
      const orderDate = dayjs(order.ngayGiao, 'DD/MM/YYYY');
      const matchDate = !dateRange || (orderDate.isAfter(dateRange[0].startOf('day')) && orderDate.isBefore(dateRange[1].endOf('day')));
      return matchSearch && matchDate;
    });

    return {
      dangLam: filtered.filter(o => !o.daGiao && calculateOrderProgress(o) < 100),
      choGiao: filtered.filter(o => !o.daGiao && calculateOrderProgress(o) >= 100),
      daGiao: filtered.filter(o => o.daGiao)
    };
  }, [orders, searchText, dateRange]);

  const columns = (fbKey) => [
    {
      title: 'CHI TIẾT', dataIndex: 'name', width: 100, fixed: 'left',
      render: (text, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong style={{ color: '#1890ff' }}>{text}</Text>
          <Popover content={
            <List size="small" dataSource={record.lichSu} renderItem={i => (
              <List.Item><Text type="secondary">{i.ngay}</Text>: <Tag color={i.sl > 0 ? "green" : "red"}>{i.sl > 0 ? `+${i.sl}` : i.sl}</Tag> <b>{i.to}</b></List.Item>
            )} />
          } title="Nhật ký sản xuất" trigger="click">
            <Button type="link" size="small" icon={<HistoryOutlined />} style={{ padding: 0 }}>Nhật ký</Button>
          </Popover>
        </Space>
      )
    },
    { title: 'CẦN', dataIndex: 'can', width: 80, align: 'center', render: v => <Tag color="blue" style={{ fontWeight: 'bold' }}>{v}</Tag> },
    ...['phoi', 'dinhHinh', 'lapRap', 'nham', 'son', 'dongGoi'].map(step => ({
      title: step.toUpperCase(), align: 'center', width: 110,
      render: (_, record) => {
        const isSkipped = record.skipSteps?.includes(step);
        if (isSkipped) return <Tag color="default" style={{ opacity: 0.5, fontSize: '10px' }}>BỎ QUA</Tag>;

        const can = Number(record.can) || 0;
        const val = Number(record.tienDo?.[step]) || 0;
        const diff = val - can;

        const deadlineDate = record.deadlines?.[step];
        const homNay = dayjs().startOf('day');
        const ngayDeadline = deadlineDate ? dayjs(deadlineDate) : null;

        const isOverdue = ngayDeadline && val < can && homNay.isAfter(ngayDeadline);
        const soNgayTre = isOverdue ? homNay.diff(ngayDeadline, 'day') : 0;

        return (
          <div style={{ padding: '2px', borderRadius: '4px', background: isOverdue ? '#fff1f0' : 'transparent', border: isOverdue ? '1px solid #ffa39e' : 'none' }}>
            <InputNumber
              min={0}
              value={val}
              status={isOverdue ? "error" : (diff > 0 ? "warning" : "")}
              onBlur={(e) => {
                const value = e.target.value.replace(/\./g, '');
                handleUpdateRecord(fbKey, record.key, step, value);
              }}
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '2px' }}>
              {ngayDeadline ? (
                <div style={{ color: isOverdue ? '#cf1322' : '#8c8c8c' }}>
                  Hạn: {ngayDeadline.format('DD/MM')}
                  {isOverdue && <div style={{ color: '#f5222d', background: '#fff', padding: '1px' }}>⚠️ TRỄ {soNgayTre} NGÀY</div>}
                </div>
              ) : <span style={{ color: '#d9d9d9' }}>--</span>}

              {diff > 0 && <span style={{ color: '#faad14' }}>DƯ: {diff}</span>}
              {diff < 0 && !isOverdue && <span style={{ color: '#ff4d4f' }}>THIẾU: {Math.abs(diff)}</span>}
            </div>
          </div>
        )
      }
    })),
  ];
  const renderOrderList = (data, isDeliveredTab = false) => {

    const collapseItems = data.map(order => {
      const progress = calculateOrderProgress(order);
      const isDone = (order.soLuongDongGoi || 0) >= (order.tongSoBo || 1);
      const isPackingOverdue = order.deadlineDongGoi && !isDone && dayjs().isAfter(dayjs(order.deadlineDongGoi), 'day');
      // Kiểm tra xem tất cả linh kiện đã làm đủ số lượng 'can' chưa (trừ những bước đã Skip)
      const isDuLinhKien = order.chiTiet?.every(item => {
        const steps = ['phoi', 'dinhHinh', 'lapRap', 'nham', 'son'];
        return steps.every(step => {
          if (item.skipSteps?.includes(step)) return true; // Bước nào skip thì bỏ qua
          return (item.tienDo?.[step] || 0) >= item.can; // Bước nào làm rồi thì phải đủ số lượng
        });
      });

      return {
        key: order.fbKey,
        label: (
          <Row align="middle" style={{ width: '95%' }}>
            <Col xs={24} sm={8}>
              <Badge status={order.daGiao ? "default" : (progress >= 100 ? "success" : (dayjs(order.ngayGiao, 'DD/MM/YYYY').isBefore(dayjs()) ? "error" : "processing"))} />
              <Text strong style={{ fontSize: '16px', marginLeft: 10 }}>{order.tenSP}</Text>
              {order.daGiao && <Tag color="default" style={{ marginLeft: 8 }}>ĐÃ GIAO</Tag>}
            </Col>
            <Col xs={16} sm={10} style={{ padding: '0 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', marginRight: '8px', color: '#8c8c8c' }}>Tiến độ:</span>
                <Progress percent={progress} size="small" status={order.daGiao ? "normal" : "active"} strokeColor={order.daGiao ? "#d9d9d9" : { '0%': '#108ee9', '100%': '#52c41a' }} />
              </div>
            </Col>
            <Col xs={8} sm={6} style={{ textAlign: 'right' }}>
              <Tag color={order.daGiao ? "default" : (dayjs(order.ngayGiao, 'DD/MM/YYYY').isBefore(dayjs()) ? "red" : "blue")} icon={<ClockCircleOutlined />}>Giao: {order.ngayGiao}</Tag>
            </Col>
          </Row>
        ),
        extra: (
          <Space onClick={(e) => e.stopPropagation()}>
            {!order.daGiao && <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(order)} />}
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: 'Xoá đơn này?', onOk: () => remove(ref(db, `orders/${order.fbKey}`)) })} />
          </Space>
        ),
        // Toàn bộ nội dung bên trong Panel cũ giờ nằm ở đây:
        children: (
          <>
            <Table columns={columns(order.fbKey)} dataSource={order.chiTiet} pagination={false} bordered scroll={{ x: 1000 }} size="middle" />
            <div style={{ marginTop: 15, padding: '15px', background: order.daGiao ? '#f5f5f5' : (isPackingOverdue ? '#fff1f0' : '#f6ffed'), borderRadius: '8px', border: `1px solid ${order.daGiao ? '#d9d9d9' : (isPackingOverdue ? '#ffa39e' : '#b7eb8f')}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <Space size="large">
                <Text strong><CarryOutOutlined /> ĐÓNG GÓI XONG (BỘ):</Text>
                <div style={{ textAlign: 'center' }}>
                  <InputNumber
                    min={0}
                    size="large"
                    // LOGIC MỚI: Khóa ô nếu chưa đủ linh kiện hoặc đã giao hàng
                    disabled={order.daGiao || !isDuLinhKien}
                    // LOGIC MỚI: Hiện màu cảnh báo vàng nếu chưa đủ linh kiện
                    status={!isDuLinhKien ? "warning" : (isPackingOverdue ? "error" : "")}
                    value={order.soLuongDongGoi || 0}
                    onChange={(val) => {
                      // Cập nhật tạm thời để người dùng thấy số thay đổi (nếu cần)
                    }}
                    onBlur={(e) => {
                      const newVal = Number(e.target.value) || 0;
                      if (newVal !== order.soLuongDongGoi) {
                        update(ref(db, `orders/${order.fbKey}`), { soLuongDongGoi: newVal });
                        message.success("Đã cập nhật số lượng đóng gói bộ!");
                      }
                    }}
                    style={{ width: 120 }}
                  />

                  {/* HIỆN THÔNG BÁO NHẮC NHỞ */}
                  {!isDuLinhKien && !order.daGiao && (
                    <div style={{ fontSize: '10px', color: '#faad14', fontWeight: 'bold', marginTop: '4px' }}>
                      ⚠️ CHƯA ĐỦ LINH KIỆN
                    </div>
                  )}

                  {order.deadlineDongGoi && (
                    <div style={{ fontSize: '11px', color: isPackingOverdue ? 'red' : '#8c8c8c', fontWeight: 'bold' }}>
                      Hạn xong: {dayjs(order.deadlineDongGoi).format('DD/MM')}
                    </div>
                  )}
                </div>
                <Text type="secondary">/ Tổng bộ cần: <b style={{ color: '#f5222d', fontSize: '16px' }}>{order.tongSoBo}</b></Text>
              </Space>

              <Space>
                <div style={{ width: 150 }}>
                  <Progress percent={progress} status={order.daGiao ? "normal" : "active"} strokeColor={order.daGiao ? "#8c8c8c" : "#52c41a"} />
                </div>
                {progress >= 100 && !order.daGiao && (
                  <Button type="primary" size="large" icon={<SendOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={() => handleDeliverOrder(order.fbKey)}>
                    HOÀN TẤT & GIAO HÀNG
                  </Button>
                )}
                {order.daGiao && <Text type="secondary"><CheckCircleOutlined /> Đã giao lúc: {order.ngayThucTeGiao}</Text>}
              </Space>
            </div>
          </>
        ),
        style: { background: '#fdfdfd', marginBottom: 12, borderRadius: 10, border: '1px solid #e8e8e8', overflow: 'hidden' }
      };
    });

    return (
      <Collapse
        accordion
        ghost
        expandIconPlacement="end"
        items={collapseItems} // <--- TRUYỀN ITEMS VÀO ĐÂY
      />
    );
  };

  if (!user && !loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        // Link ảnh gỗ sản xuất mới, cực kỳ ổn định
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      }}>
        <style>{`
          .login-card {
            background: rgba(255, 255, 255, 0.85) !important;
            backdrop-filter: blur(15px); /* Hiệu ứng làm mờ nền sau kính */
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            box-shadow: 0 25px 50px rgba(0,0,0,0.5) !important;
            border-radius: 24px !important;
          }
          .login-button {
            height: 50px !important;
            font-weight: 700 !important;
            font-size: 16px !important;
            background: #1890ff !important;
            border-radius: 12px !important;
            border: none !important;
            box-shadow: 0 4px 14px 0 rgba(24, 144, 255, 0.39);
            transition: all 0.3s ease;
          }
          .login-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(24, 144, 255, 0.45);
          }
          .input-custom {
            border-radius: 10px !important;
            height: 45px !important;
          }
        `}</style>

        <Card className="login-card" style={{ width: 420, padding: '30px 15px', textAlign: 'center' }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{
              width: 90, height: 90,
              background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
              borderRadius: '22px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '0 auto 20px',
              transform: 'rotate(-10deg)', /* Làm cái logo hơi nghiêng nhìn cho chất */
              boxShadow: '0 10px 20px rgba(24, 144, 255, 0.3)'
            }}>
              <BuildOutlined style={{ fontSize: 45, color: '#fff', transform: 'rotate(10deg)' }} />
            </div>
            <Title level={2} style={{ margin: 0, color: '#001529', fontWeight: 800, letterSpacing: '1.5px' }}>
              MAH FURNITURE
            </Title>
            <div style={{ height: '2px', width: '50px', background: '#1890ff', margin: '10px auto' }}></div>
            <Text type="secondary" style={{ fontSize: '15px', fontWeight: 500 }}>
              Hệ thống Quản lý Sản xuất
            </Text>
          </div>

          <Form form={loginForm} onFinish={handleLogin} layout="vertical">
            <Form.Item
              name="email"
              rules={[{ required: true, message: 'Nhập email đi đại ca!' }]}
            >
              <Input
                className="input-custom"
                prefix={<UserOutlined style={{ color: '#8c8c8c' }} />}
                placeholder="Email tài khoản"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Quên mật khẩu rồi hả đại ca?' }]}
            >
              <Input.Password
                className="input-custom"
                prefix={<LockOutlined style={{ color: '#8c8c8c' }} />}
                placeholder="Mật khẩu"
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 25 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                className="login-button"
              >
                ĐĂNG NHẬP HỆ THỐNG
              </Button>
            </Form.Item>
          </Form>

          <div style={{ marginTop: 30 }}>
            <Text type="secondary" style={{ fontSize: '12px', opacity: 0.8 }}>
              © 2025 MAH Furniture | Quality First
            </Text>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Card styles={{ body: { padding: '15px 25px' } }} style={{ borderRadius: 12, marginBottom: 20, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Row justify="space-between" align="middle">
          <Col><Title level={3} style={{ margin: 0, color: '#001529' }}><BuildOutlined /> CÔNG TY TNHH MAI ANH HÙNG FURNITURE</Title></Col>
          <Col>
            <Space size="large">
              <Popover
                placement="bottomRight"
                trigger="click"
                content={
                  <div style={{ width: 320, maxHeight: 400, overflowY: 'auto' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', fontWeight: 'bold' }}>
                      THÔNG BÁO ({notifications.length})
                    </div>

                    {notifications.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#8c8c8c' }}>
                        Không có thông báo mới
                      </div>
                    ) : (
                      notifications.map((item) => {
                        const isOverdue = item.type === 'danger';
                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              padding: '12px',
                              borderBottom: '1px solid #f0f0f0',
                              background: isOverdue ? '#fff1f0' : '#fffbe6',
                              transition: 'background 0.3s',
                              cursor: 'default'
                            }}
                          >
                            <div style={{ marginRight: 12 }}>
                              <Avatar
                                size="large"
                                icon={isOverdue ? <AlertOutlined /> : <ClockCircleOutlined />}
                                style={{ backgroundColor: isOverdue ? '#cf1322' : '#faad14' }}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontWeight: 'bold',
                                fontSize: '14px',
                                color: isOverdue ? '#cf1322' : '#d48806'
                              }}>
                                {isOverdue && '⚠️ '}{item.title}
                              </div>
                              <div style={{ fontSize: '13px', color: '#434343', marginTop: 4 }}>
                                {item.content}
                              </div>
                              <Tag color={isOverdue ? "error" : "warning"} style={{ marginTop: 8, fontWeight: 'bold' }}>
                                {item.time}
                              </Tag>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                }
              >
                <span style={{ cursor: 'pointer', display: 'inline-block' }}>
                  <NotificationIcon
                    count={notifications.length}
                    hasDanger={notifications.some(n => n.type === 'danger')}
                  />
                </span>
              </Popover>
              <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>Chào đại ca,</Text><br />
                <Text strong style={{ color: '#1890ff' }}>{user?.email.split('@')[0]}</Text>
              </div>
              <Button danger ghost onClick={handleLogout} icon={<LogoutOutlined />}>Thoát</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><Card size="small" style={{ borderTop: '4px solid #1890ff' }}><Statistic title="TỔNG ĐƠN" value={stats.total} prefix={<AppstoreOutlined />} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small" style={{ borderTop: '4px solid #faad14' }}><Statistic title="ĐANG LÀM" value={stats.pending} styles={{ content: { color: '#faad14' } }} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small" style={{ borderTop: '4px solid #52c41a' }}><Statistic title="CHỜ GIAO" value={stats.completed} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small" style={{ borderTop: '4px solid #ff4d4f' }}><Statistic title="TRỄ HẠN" value={stats.overdue} styles={{ content: { color: '#ff4d4f' } }} /></Card></Col>
      </Row>

      <Tabs type="card" items={[
        {
          key: '1', label: <b><CarryOutOutlined /> QUẢN LÝ SẢN XUẤT</b>,
          children: (
            <div style={{ background: '#fff', padding: '20px', borderRadius: '0 0 12px 12px' }}>
              <Space wrap style={{ marginBottom: 20 }}>
                <Input placeholder="Tìm tên sản phẩm..." prefix={<SearchOutlined />} style={{ width: 250 }} onChange={e => setSearchText(e.target.value)} allowClear />
                <RangePicker format="DD/MM/YYYY" onChange={setDateRange} />
                <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setIsModalOpen(true); }} style={{ borderRadius: 8, paddingLeft: 30, paddingRight: 30 }}>TẠO ĐƠN MỚI</Button>
              </Space>

              <Tabs
                defaultActiveKey="1"
                items={[
                  { key: '1', label: <Badge count={orderCategorized.dangLam.length} offset={[10, 0]}><b>ĐANG SẢN XUẤT</b></Badge>, children: renderOrderList(orderCategorized.dangLam) },
                  { key: '2', label: <Badge count={orderCategorized.choGiao.length} offset={[10, 0]} color="#52c41a"><b>XONG (CHỜ GIAO)</b></Badge>, children: renderOrderList(orderCategorized.choGiao) },
                  { key: '3', label: <Badge count={orderCategorized.daGiao.length} offset={[10, 0]} color="#8c8c8c"><b>ĐÃ GIAO</b></Badge>, children: renderOrderList(orderCategorized.daGiao, true) }
                ]}
              />
            </div>
          )
        },
        {
          key: '2', label: <b><HistoryOutlined /> NHẬT KÝ</b>,
          children: (
            <Card>
              <Input placeholder="Tìm đơn hoặc người làm..." style={{ marginBottom: 20, width: 300 }} prefix={<SearchOutlined />} onChange={e => setSearchLog(e.target.value)} allowClear />
              <Collapse accordion>
                {orders.map(order => {
                  let logs = [];
                  order.chiTiet?.forEach(item => { item.lichSu?.forEach(log => { if (!searchLog || order.tenSP.toLowerCase().includes(searchLog.toLowerCase()) || log.userEmail.toLowerCase().includes(searchLog.toLowerCase())) logs.push({ ...log, detailName: item.name }); }); });
                  if (logs.length === 0) return null;
                  return (
                    <Panel header={<Text strong>{order.tenSP} <Badge count={logs.length} style={{ backgroundColor: '#52c41a', marginLeft: 10 }} /></Text>} key={order.fbKey}>
                      <Table
                        dataSource={logs.sort((a, b) => b.id - a.id)}
                        size="small"
                        pagination={{ pageSize: 8 }}
                        // Trong phần Table của Nhật ký (Tabs key 2)
                        columns={[
                          { title: 'Thời gian', dataIndex: 'ngay', width: 130 },
                          { title: 'Chi tiết', dataIndex: 'detailName' },
                          { title: 'Tổ', dataIndex: 'to', render: t => <Tag color="blue">{t}</Tag> },
                          {
                            title: 'SỐ LƯỢNG CHỐT',
                            dataIndex: 'sl',
                            render: (s, record) => (
                              <Space>
                                <Text strong style={{ color: '#1890ff' }}>{s}</Text>
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                  ({record.chenhLech > 0 ? `+${record.chenhLech}` : record.chenhLech})
                                </Text>
                              </Space>
                            )
                          },
                          { title: 'Người làm', dataIndex: 'userEmail', render: e => <Text type="secondary">{e.split('@')[0]}</Text> },
                          {
                            title: 'Tình trạng',
                            dataIndex: 'tre',
                            render: (t) => t > 0 ? <Tag color="error">Trễ {t} ngày</Tag> : <Tag color="success">Đúng hạn</Tag>
                          }
                        ]}
                      />
                    </Panel>
                  );
                })}
              </Collapse>
            </Card>
          )
        }
      ]} />

      <Modal
        title={isModalOpen ? "TẠO ĐƠN MỚI" : "CHỈNH SỬA ĐƠN HÀNG"}
        open={isModalOpen || isEditModalOpen}
        onOk={() => isModalOpen ? form.submit() : editForm.submit()}
        onCancel={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}
        width="90%"
        okText="LƯU DỮ LIỆU"
        cancelText="HỦY"
      >
        <Form form={isModalOpen ? form : editForm} layout="vertical" onFinish={isModalOpen ? handleCreateOrder : handleUpdateOrder}>
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="tenSP" label="Tên sản phẩm" rules={[{ required: true, message: 'Nhập tên SP' }]}><Input placeholder="Ví dụ: TỦ GỖ SỒI" /></Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="tongSoBo" label="Tổng số bộ cần" rules={[{ required: true, message: 'Nhập số bộ' }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="VD: 568" />
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item name="deadlineDongGoi" label={<Text strong style={{ color: '#fa8c16' }}>Hạn Đóng Gói Xong</Text>} rules={[{ required: true, message: 'Chọn hạn đóng gói' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Ngày xong toàn bộ đơn" />
              </Form.Item>
            </Col>
          </Row>

          <Text strong style={{ display: 'block', marginBottom: 10 }}>DANH SÁCH LINH KIỆN & HẠN CHÓT TỔ:</Text>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card size="small" key={key} style={{ marginBottom: 15, background: '#fafafa', border: '1px solid #d9d9d9' }}>
                    <Row gutter={12} align="middle">
                      <Col span={14}><Form.Item {...restField} name={[name, 'name']} rules={[{ required: true }]}><Input placeholder="Tên linh kiện" /></Form.Item></Col>
                      <Col span={8}><Form.Item {...restField} name={[name, 'qty']} rules={[{ required: true }]} label="SL/Bộ"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                      <Col span={2}><Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} /></Col>

                      <Col span={24}>
                        <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px dashed #d9d9d9' }}>
                          <Text type="secondary" style={{ fontSize: '11px', fontWeight: 'bold' }}>DEADLINE TỪNG TỔ:</Text>
                          <Row gutter={[8, 4]} style={{ marginTop: 5 }}>
                            {['phoi', 'dinhHinh', 'lapRap', 'nham', 'son', 'dongGoi'].map(step => (
                              <Col span={4} key={step}> {/* Chỉnh lại span cho vừa 6 cột */}
                                <Form.Item name={[name, 'deadlines', step]} label={step.toUpperCase()}>
                                  <DatePicker size="small" format="DD/MM" style={{ width: '100%' }} />
                                </Form.Item>
                              </Col>
                            ))}
                          </Row>
                        </div>
                      </Col>

                      <Col span={24} style={{ marginTop: 10 }}>
                        <Form.Item name={[name, 'skipSteps']} label={<Text type="secondary" style={{ fontSize: '11px' }}>Bỏ qua công đoạn:</Text>} style={{ marginBottom: 0 }}>
                          <Checkbox.Group options={['phoi', 'dinhHinh', 'lapRap', 'nham', 'son', 'dongGoi'].map(s => ({ label: s.toUpperCase(), value: s }))} />
                        </Form.Item>
                      </Col>

                      <Form.Item name={[name, 'key']} hidden><Input /></Form.Item>
                      <Form.Item name={[name, 'tienDo']} hidden><Input /></Form.Item>
                      <Form.Item name={[name, 'lichSu']} hidden><Input /></Form.Item>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginBottom: 20 }}>Thêm linh kiện</Button>
              </>
            )}
          </Form.List>

          <Form.Item name="ngayGiao" label="Hạn giao hàng cho khách (Final Delivery Date)" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default App;