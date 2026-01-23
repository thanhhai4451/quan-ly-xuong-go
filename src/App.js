import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Table, Tag, Progress, Card, Typography, Collapse,
  InputNumber, Space, Button, Modal, Form, Input,
  DatePicker, message, List, Popover, Row, Col,
  Statistic, Tabs, Badge, Avatar, Pagination, Flex, Image
} from 'antd';

import ExtraStock from './ExtraStock';

import {
  PlusOutlined, DeleteOutlined, BuildOutlined, ClockCircleOutlined,
  CarryOutOutlined, SearchOutlined, HistoryOutlined, AlertOutlined, AppstoreOutlined,
  UserOutlined, LogoutOutlined, LockOutlined, EditOutlined, BellOutlined, CheckCircleOutlined,
  SendOutlined, SwapOutlined, InboxOutlined, EyeOutlined, PictureOutlined

} from '@ant-design/icons';
import dayjs from 'dayjs';

import { db, auth } from "./firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import ProductionTransfer from './ProductionTransfer'; // Lưu ý: để chung thư mục với App.js
import OrderForm from './OrderForm'; // Import cái file vừa tạo
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


const getDrivePreview = (url) => {
  if (!url) return "";

  let fileId = null;

  if (url.includes("/file/d/")) {
    fileId = url.split("/file/d/")[1]?.split("/")[0];
  } else if (url.includes("open?id=")) {
    fileId = url.split("open?id=")[1]?.split("&")[0];
  } else if (url.includes("uc?id=")) {
    fileId = url.split("uc?id=")[1]?.split("&")[0];
  }

  if (!fileId) return "";

  // ✅ ĐÚNG CHUẨN IMG
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
};


const App = () => {
  // Thay dòng cũ bằng 2 dòng này

  // 1. Khai báo 3 biến trang cho 3 Tab (Page 1, 2, 3)
  const [page1, setPage1] = useState(1);
  const [page2, setPage2] = useState(1);
  const [page3, setPage3] = useState(1);


  const pageSize = 10;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [copiedOrder, setCopiedOrder] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchLog, setSearchLog] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [form] = Form.useForm();
  const [loginForm] = Form.useForm();

  const [realtimeNotis, setRealtimeNotis] = useState([]);
  const isAdmin = user?.email === 'admin@gmail.com';
  const [khoDu, setKhoDu] = useState({}); // Dán dòng này chung với các useState khác


  useEffect(() => {
    // Tìm chỗ có onValue(ref(db, 'orders'), ...), dán thêm đoạn này xuống dưới nó
    onValue(ref(db, 'khoDu'), (snapshot) => {
      setKhoDu(snapshot.val() || {});
    });
  }, []);
  useEffect(() => {
    if (!user) return;
    const notiRef = ref(db, 'notifications/');
    onValue(notiRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(k => ({ ...data[k], fbKey: k }));
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

  const calculateStepsProgress = (order) => {
    if (!order || !order.chiTiet || order.chiTiet.length === 0) return 0;

    let totalRequired = 0;
    let totalCompleted = 0;
    const steps = ['phoi', 'dinhHinh', 'lapRap', 'nham', 'son']; // Loại bỏ dongGoi
    const groupSteps = ['lapRap', 'nham', 'son'];

    const processedGroups = new Set();

    order.chiTiet.forEach(item => {
      steps.forEach(step => {
        if (item.skipSteps?.includes(step)) return;

        let required = 0;
        let completed = item.tienDo?.[step] || 0;

        if (groupSteps.includes(step) && item.groupName) {
          const groupKey = `${item.groupName}-${step}`;
          if (processedGroups.has(groupKey)) return;
          processedGroups.add(groupKey);
          required = item.soBoCum || 0;
        } else {
          required = item.can || 0;
        }

        totalRequired += required;
        totalCompleted += Math.min(completed, required);
      });
    });

    if (totalRequired === 0) return 0;
    return Math.min(100, Math.round((totalCompleted / totalRequired) * 100));
  };



  const openEditModal = (order) => {
    setEditingOrder(order);

    const initialItems = (order.chiTiet || []).map(item => ({
      ...item,
      key: item.key,
      qty: item.can,
      deadlines: Object.keys(item.deadlines || {}).reduce((acc, step) => {
        if (item.deadlines[step]) acc[step] = dayjs(item.deadlines[step]);
        return acc;
      }, {})
    }));

    form.setFieldsValue({
      ...order,
       hinhAnh: order.hinhAnh || "",
      ngayGiao: dayjs(order.ngayGiao, 'DD/MM/YYYY'),
      deadlineDongGoi: order.deadlineDongGoi ? dayjs(order.deadlineDongGoi) : null,
      items: initialItems
    });

    setIsModalOpen(true);
  };

  // --- DÙNG USECALLBACK ĐỂ HÀM KHÔNG BỊ TẠO LẠI KHI RENDER ---
  const handleUpdateGroupRecord = useCallback((fbKey, groupName, to, value) => {
    const val = parseInt(value) || 0;
    const order = orders.find(o => o.fbKey === fbKey);
    if (!order || !groupName) return; // Bảo vệ dữ liệu khỏi undefined

    const newChiTiet = order.chiTiet.map(it => {
      if (it.groupName === groupName) {
        const hienTai = it.tienDo?.[to] || 0;
        if (val === hienTai) return it;

        const newLog = {
          id: Date.now() + Math.random(),
          ngay: dayjs().format('DD/MM HH:mm'),
          to: to.toUpperCase(),
          sl: val,
          chenhLech: val - hienTai,
          userEmail: user?.email || 'Thợ'
        };

        return {
          ...it,
          tienDo: { ...it.tienDo, [to]: val },
          lichSu: [newLog, ...(it.lichSu || [])]
        };
      }
      return it;
    });

    update(ref(db, `orders/${fbKey}`), { chiTiet: newChiTiet })
      .then(() => message.success(`Đã cập nhật cụm ${groupName.toUpperCase()}`));
  }, [orders, user]); // Các biến phụ thuộc của hàm này

  const handleUpdateRecord = useCallback((fbKey, detailKey, to, value) => {
    const val = parseInt(value) || 0;
    const order = orders.find(o => o.fbKey === fbKey);
    if (!order) return;

    const item = order.chiTiet.find(i => i.key === detailKey);
    if (!item) return;

    const hienTai = item.tienDo?.[to] || 0;
    if (val === hienTai) return;

    // ... Logic kiểm tra tổ trước/sau giữ nguyên ...
    const steps = ['phoi', 'dinhHinh', 'lapRap', 'nham', 'son', 'dongGoi'];
    const currentIndex = steps.indexOf(to);
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1];
      const prevVal = item.tienDo?.[prevStep] || 0;
      if (val > prevVal && !item.skipSteps?.includes(prevStep)) {
        message.error(`Tổ ${to.toUpperCase()} (${val}) không được lớn hơn tổ ${prevStep.toUpperCase()} (${prevVal})!`);
        return;
      }
    }

    const newChiTiet = order.chiTiet.map(it => {
      if (it.key === detailKey) {
        const deadlineStep = it.deadlines?.[to];
        let soNgayTreLuuLai = 0;
        if (deadlineStep && val < it.can) {
          const homNay = dayjs().startOf('day');
          const ngayDeadline = dayjs(deadlineStep);
          if (homNay.isAfter(ngayDeadline)) soNgayTreLuuLai = homNay.diff(ngayDeadline, 'day');
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

    update(ref(db, `orders/${fbKey}`), { chiTiet: newChiTiet })
      .then(() => {
        message.success(`Đã cập nhật tổ ${to.toUpperCase()}`);
        push(ref(db, 'notifications/'), {
          id: Date.now(),
          title: 'CẬP NHẬT SẢN XUẤT',
          content: `${(user?.email || 'ẨN DANH').split('@')[0].toUpperCase()} cập nhật [${item.name}] của đơn [${order.tenSP}]`,
          time: dayjs().format('HH:mm DD/MM'),
          type: 'info',
          isRead: false
        });
      })
      .catch(() => message.error("Lỗi kết nối Database!"));
  }, [orders, user]); // Các biến phụ thuộc của hàm này

  const handleLogout = () => signOut(auth).then(() => message.info("Đã đăng xuất!"));

  const handleDeliverOrder = (fbKey) => {
    const order = orders.find(o => o.fbKey === fbKey);
    
    Modal.confirm({
      title: 'Xác nhận giao hàng?',
      content: 'Đơn hàng này sẽ được chuyển sang mục Đã Giao. Hàng dư (nếu có) sẽ tự động chuyển vào Kho hàng dư.',
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: () => {
        // Phát hiện hàng dư từ TẤT CẢ các công đoạn
        const duDetails = []; // Danh sách chi tiết dư
        const STEPS = ['phoi', 'dinhHinh', 'lapRap', 'nham', 'son', 'dongGoi'];

        if (order.chiTiet && order.chiTiet.length > 0) {
          order.chiTiet.forEach(item => {
            const can = item.can || 0;
            
            // Kiểm tra hàng dư ở mỗi công đoạn
            // DƯ = số hoàn thành lớn hơn số cần
            STEPS.forEach(step => {
              const hoanthanh = item.tienDo?.[step] || 0;
              const du = hoanthanh - can;
              
              if (du > 0) {
                duDetails.push({
                  name: `${item.name} (Từ ${step.toUpperCase()}: ${hoanthanh} - ${can})`,
                  qty: du,
                  loai: 'CHI_TIET'
                });
              }
            });
          });
        }

        // Tính dư bộ (nếu soLuongDongGoi < tongSoBo)
        const tongBo = Number(order.tongSoBo) || 0;
        const dongGoi = Number(order.soLuongDongGoi) || 0;
        let duBo = 0;
        
        if (dongGoi < tongBo) {
          duBo = tongBo - dongGoi;
        }

        // Lưu hàng dư vào khoDu nếu có
        let updates = {
          daGiao: true,
          ngayThucTeGiao: dayjs().format('DD/MM/YYYY HH:mm')
        };

        if (duDetails.length > 0 || duBo > 0) {
          const khoDuKey = `du_${order.tenSP.toLowerCase().replace(/\s+/g, '_')}_${fbKey.substring(0, 6)}`;
          const khoDuData = {
            tenItem: `[DƯ] ${order.tenSP}`,
            loai: duBo > 0 ? 'BO' : 'CHI_TIET',
            ghiChu: `Dư từ đơn hàng ngày ${dayjs().format('DD/MM/YYYY')}. Dư từ các công đoạn: ${duDetails.length} loại chi tiết`,
            soLuongTong: duBo > 0 ? duBo : duDetails.reduce((sum, d) => sum + d.qty, 0),
            chiTietList: duDetails.length > 0 ? duDetails : null,
            ngayCapNhat: dayjs().format('DD/MM/YYYY HH:mm'),
            nguoiCapNhat: user?.email || 'Ẩn danh',
            donHangGoc: fbKey // Lưu lại tham chiếu đơn hàng gốc
          };

          update(ref(db, `khoDu/${khoDuKey}`), khoDuData);
        }

        update(ref(db, `orders/${fbKey}`), updates)
          .then(() => {
            if (duDetails.length > 0 || duBo > 0) {
              message.success(`✅ Giao hàng thành công! ${duDetails.length > 0 ? duDetails.length + ' loại chi tiết dư' : duBo + ' bộ dư'} đã lưu vào Kho hàng dư.`);
            } else {
              message.success("✅ Đã giao hàng thành công!");
            }
          })
          .catch(() => message.error("Lỗi kết nối!"));
      }
    });
  };

  const deleteNoti = (item) => {
    if (item.fbKey) {
      // Nếu là thông báo từ Firebase (do cán bộ cập nhật)
      remove(ref(db, `notifications/${item.fbKey}`))
        .then(() => message.success("Đã xóa thông báo"));
    } else {
      // Nếu là thông báo hệ thống (tự tính toán trễ hạn)
      message.info("Đây là thông báo hệ thống, sẽ tự mất khi làm xong hàng!");
    }
  };


  const handleUpdateOrder = async (values) => {
    try {
      const cleanedItems = values.items.map((it, index) => {
        // 1. Tìm linh kiện cũ trong 'editingOrder'
        // Ưu tiên tìm theo key, nếu không thấy thì tìm theo tên cũ
        const oldItem = editingOrder.chiTiet?.find(old =>
          (old.key && old.key === it.key) || (old.name === it.name)
        );

        // 2. Nếu tìm thấy, lấy lại tiến độ. Nếu không thấy, báo lỗi hoặc cho về 0
        const preservedTienDo = oldItem ? oldItem.tienDo : { phoi: 0, dinhHinh: 0, lapRap: 0, nham: 0, son: 0, dongGoi: 0 };
        const preservedLichSu = oldItem ? (oldItem.lichSu || []) : [];

        return {
          key: it.key || oldItem?.key || `item_${Date.now()}_${index}`, // Giữ key cũ
          name: it.name,
          can: Number(it.qty) || 0,
          groupName: (it.groupName || "").trim(),
          soBoCum: it.soBoCum || 0,
          skipSteps: Array.isArray(it.skipSteps) ? it.skipSteps : [],
          deadlines: Object.keys(it.deadlines || {}).reduce((acc, step) => {
            const d = it.deadlines?.[step];
            acc[step] = (d && typeof d.format === 'function') ? d.format('YYYY-MM-DD') : (d || "");
            return acc;
          }, {}),
          tienDo: preservedTienDo, // Dán lại tiến độ cũ vào đây
          lichSu: preservedLichSu   // Dán lại lịch sử cũ vào đây
        };
      });

      const finalData = {
        tenSP: values.tenSP.toUpperCase(),
        tongSoBo: Number(values.tongSoBo),
        deadlineDongGoi: values.deadlineDongGoi?.format?.('YYYY-MM-DD') || "",
        ngayGiao: values.ngayGiao?.format?.('DD/MM/YYYY') || "",
        hinhAnh: values.hinhAnh || editingOrder.hinhAnh || "",
        chiTiet: cleanedItems,
        daGiao: editingOrder.daGiao || false
      };

      await update(ref(db, `orders/${editingOrder.fbKey}`), finalData); // Ghi đè

      message.success("Đã cập nhật thành công, tiến độ vẫn giữ nguyên!");
      setIsModalOpen(false);
      setEditingOrder(null);
      form.resetFields();
    } catch (error) {
      message.error("Lỗi: " + error.message);
    }
  };

  const handleCreateOrder = (values) => {
    try {
      if (!values.items || values.items.length === 0) {
        message.error("Đại ca ơi, phải thêm ít nhất 1 linh kiện!");
        return;
      }

      const list = values.items.map((it, i) => {
        const formattedDeadlines = {};
        const steps = ['phoi', 'dinhHinh', 'lapRap', 'nham', 'son', 'dongGoi'];

        steps.forEach(step => {
          const dateVal = it.deadlines?.[step];
          formattedDeadlines[step] = (dateVal && typeof dateVal.format === 'function')
            ? dateVal.format('YYYY-MM-DD')
            : "";
        });

        return {
          key: Date.now() + i,
          name: it.name || "Linh kiện không tên",
          can: Number(it.qty) || 0,
          groupName: (it.groupName || "").trim(),
          soBoCum: it.soBoCum || 0,
          skipSteps: Array.isArray(it.skipSteps) ? it.skipSteps : [],
          deadlines: formattedDeadlines,
          tienDo: { phoi: 0, dinhHinh: 0, lapRap: 0, nham: 0, son: 0, dongGoi: 0 },
          lichSu: []
        };
      });

      push(ref(db, 'orders/'), {
        tenSP: (values.tenSP || "").toUpperCase(),
        tongSoBo: Number(values.tongSoBo) || 0,
        soLuongDongGoi: 0,
        ngayGiao: values.ngayGiao ? values.ngayGiao.format('DD/MM/YYYY') : "",
        deadlineDongGoi: values.deadlineDongGoi ? values.deadlineDongGoi.format('YYYY-MM-DD') : "",
        hinhAnh: values.hinhAnh || "",
        chiTiet: list,
        daGiao: false,
        createdAt: new Date().toISOString()
      })
        .then(() => {
          setIsModalOpen(false);
          form.resetFields();
          message.success('Đã tạo đơn thành công!');
        })
        .catch((err) => message.error("Lỗi Firebase: " + err.message));

    } catch (error) {
      console.error("Crash:", error);
    }
  };

  const handleFinalSubmit = (values) => {

    if (editingOrder && editingOrder.fbKey) {
      // Nếu có fbKey tức là đơn hàng đã tồn tại trên Firebase -> Cập nhật
      handleUpdateOrder(values);
    } else {
      // Nếu không có fbKey -> Tạo mới hoàn toàn
      handleCreateOrder(values);
    }
  };

  const handleCopy = (data) => {
    setCopiedOrder(data);
    setEditingOrder(null);
  };

  const openCreateModal = () => {
    setEditingOrder(null);
    setCopiedOrder(null);
    form.resetFields();
    setIsModalOpen(true);
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
      dangLam: filtered.filter(o => !o.daGiao && calculateOrderProgress(o) < 100).sort((a, b) => {
        const hasA = a.chiTiet?.some(item => Object.values(item.tienDo || {}).some(val => val > 0));
        const hasB = b.chiTiet?.some(item => Object.values(item.tienDo || {}).some(val => val > 0));
        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;
        return 0; // Giữ thứ tự ban đầu nếu cả hai đều có hoặc không
      }),
      choGiao: filtered.filter(o => !o.daGiao && calculateOrderProgress(o) >= 100),
      daGiao: filtered.filter(o => o.daGiao)
    };
  }, [orders, searchText, dateRange]);

  const tableColumns = useMemo(() => (fbKey, orderData, order) => {
    const STEPS_CONFIG = [
      { id: 'phoi', label: 'PHÔI' },
      { id: 'dinhHinh', label: 'ĐỊNH HÌNH' },
      { id: 'lapRap', label: 'LẮP RÁP' },
      { id: 'nham', label: 'NHÁM' },
      { id: 'son', label: 'SƠN' },
      { id: 'dongGoi', label: 'ĐÓNG GÓI' },
    ];

    // BỎ PHÂN QUYỀN: Lấy tất cả các bước để hiển thị cột
    const visibleSteps = STEPS_CONFIG.map(s => s.id);

    // 4. Các cột cố định (Chi tiết, Cần cái, Cụm, Cần bộ)
    const baseCols = [
      {
        title: 'CHI TIẾT',
        dataIndex: 'name',
        width: 80,
        fixed: 'left',
        render: (text, record) => (
          <Flex vertical gap={0} align="start">
            <Text strong style={{ color: '#1890ff', lineHeight: '1.2' }}>{text}</Text>
            <Popover
              content={
                <List
                  size="small"
                  dataSource={record.lichSu || []}
                  renderItem={i => (
                    <List.Item>
                      <Text type="secondary">{i.ngay}</Text>:
                      <Tag color={i.sl > 0 ? "green" : "red"}>{i.sl > 0 ? `+${i.sl}` : i.sl}</Tag>
                      <b>{i.to}</b>
                    </List.Item>
                  )}
                />
              }
              title="Nhật ký sản xuất"
              trigger="click"
            >
              <Button type="link" size="small" icon={<HistoryOutlined />} style={{ padding: 0, fontSize: '11px', height: '20px' }}>
                Lịch sử
              </Button>
            </Popover>
          </Flex>
        )
      },
      {
        title: 'CẦN (CÁI)',
        dataIndex: 'can',
        align: 'center',
        width: 80,
        render: (can) => <Tag color="blue" style={{ fontWeight: 'bold' }}>{can} cái</Tag>
      },
      {
        title: 'CỤM (BỘ PHẬN)',
        dataIndex: 'groupName',
        width: 150,
        align: 'center',
        onCell: (record, index) => {
          if (!record.groupName || record.groupName.trim() === "") return { rowSpan: 1 };
          const chiTiet = orderData?.chiTiet || [];
          const currentGroupName = record.groupName.trim();
          const sameGroup = chiTiet.filter(i => i.groupName && i.groupName.trim() === currentGroupName);
          const firstIndex = chiTiet.findIndex(i => i.groupName && i.groupName.trim() === currentGroupName);
          if (index === firstIndex) return { rowSpan: sameGroup.length };
          return { rowSpan: 0 };
        },
        render: (val) => val ? <Tag color="orange" style={{ fontWeight: 'bold' }}>{val.toUpperCase()}</Tag> : <Text type="secondary">-</Text>
      },
      {
        title: 'CẦN (BỘ)',
        align: 'center',
        width: 80,
        onCell: (record, index) => {
          const ds = orderData?.chiTiet || orderData?.items || [];
          if (!record.groupName || ds.length === 0) return { rowSpan: 1 };
          const sameGroup = ds.filter(i => i.groupName === record.groupName);
          const firstIndex = ds.findIndex(i => i.groupName === record.groupName);
          if (index === firstIndex) return { rowSpan: sameGroup.length };
          return { rowSpan: 0 };
        },
        render: (_, record) => (record.groupName && record.groupName.trim() !== "")
          ? <Tag color="purple" style={{ fontWeight: 'bold', margin: 0 }}>{record.soBoCum || 0} bộ</Tag>
          : <Text type="secondary">-</Text>
      },
    ];

    // 5. Kết hợp với các cột tổ
    return [
      ...baseCols,
      ...visibleSteps.map(step => ({
        title: step.toUpperCase(),
        align: 'center',
        width: 110,
        onCell: (record, index) => {
          if (['lapRap', 'nham', 'son'].includes(step) && record.groupName) {
            const sameGroup = orderData.chiTiet.filter(i => i.groupName === record.groupName);
            const firstIndex = orderData.chiTiet.findIndex(i => i.groupName === record.groupName);
            if (index === firstIndex) return { rowSpan: sameGroup.length };
            return { rowSpan: 0 };
          }
          return { rowSpan: 1 };
        },
        render: (_, record) => {
          const isSkipped = record.skipSteps?.includes(step);
          if (isSkipped) return <Tag color="default" style={{ opacity: 0.5, fontSize: '10px' }}>BỎ QUA</Tag>;

          const isGroupStep = ['lapRap', 'nham', 'son'].includes(step);
          const targetNeed = (isGroupStep && record.groupName) ? (Number(record.soBoCum) || 0) : (Number(record.can) || 0);
          const val = Number(record.tienDo?.[step]) || 0;
          const remaining = targetNeed - val;

          // Render Input và thông báo thiếu/đủ
          return (
            <div style={{ padding: '2px' }}>
              {isGroupStep && record.groupName && (
                <div style={{ fontSize: '10px', color: '#d46b08', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px', padding: '0 4px', marginBottom: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                  {record.groupName.toUpperCase()}
                </div>
              )}
              <InputNumber
                min={0}
                value={val}
                onBlur={(e) => {
                  const rawValue = e.target.value.replace(/\./g, '');
                  const newVal = rawValue === "" ? 0 : Number(rawValue);
                  if (newVal !== val) {
                    if (record.groupName && isGroupStep) handleUpdateGroupRecord(fbKey, record.groupName, step, newVal);
                    else handleUpdateRecord(fbKey, record.key, step, newVal);
                  }
                }}
                style={{ width: '100%', fontWeight: (record.groupName && isGroupStep) ? 'bold' : 'normal', color: isGroupStep ? '#722ed1' : '#1890ff' }}
              />
              <div style={{ marginTop: '4px', textAlign: 'center' }}>
                {remaining > 0 ? (
                  <Text type="danger" style={{ fontSize: '11px', fontWeight: 'bold' }}>Thiếu: {remaining} {isGroupStep && record.groupName ? 'bộ' : 'cái'}</Text>
                ) : remaining < 0 ? (
                  <Text type="warning" style={{ fontSize: '11px', fontWeight: 'bold' }}>Thừa: {Math.abs(remaining)}</Text>
                ) : val > 0 ? (
                  <Tag color="success" style={{ fontSize: '10px' }}>ĐỦ</Tag>
                ) : null}
              </div>
            </div>
          );
        }
      }))
    ];
  }, [handleUpdateGroupRecord, handleUpdateRecord]);
  const renderOrderList = (data, isDeliveredTab = false, page, setPage) => {
    const processedData = data.map(order => {
      const sortedChiTiet = [...(order.chiTiet || [])].sort((a, b) => {
        const groupA = a.groupName?.trim() || "ZZZZ";
        const groupB = b.groupName?.trim() || "ZZZZ";
        return groupA.localeCompare(groupB);
      });
      return { ...order, chiTiet: sortedChiTiet };
    });

    const collapseItems = processedData.map(order => {
      const currentColumns = tableColumns(order.fbKey, order, order);
      const progress = calculateOrderProgress(order);
      const stepsProgress = calculateStepsProgress(order);
      const isDone = (order.soLuongDongGoi || 0) >= (order.tongSoBo || 1);
      const isPackingOverdue = order.deadlineDongGoi && !isDone && dayjs().isAfter(dayjs(order.deadlineDongGoi), 'day');



      return {
        key: order.fbKey,
        label: (
          <Row align="middle" style={{ width: '95%' }}>
            <Col xs={24} sm={8} style={{ display: 'flex', alignItems: 'center' }}>
              {/* 1. THÊM HÌNH ẢNH Ở ĐÂY */}
              <div style={{ marginRight: 12, display: 'flex', alignItems: 'center' }}>
                {order.hinhAnh ? (
                  <Image
                    width={70}
                    height={70}
                    src={getDrivePreview(order.hinhAnh)}
                    fallback="https://placehold.co/45x45?text=MAH"
                    style={{ borderRadius: 8, objectFit: 'cover', border: '1px solid #f0f0f0' }}
                    preview={{ cover: <EyeOutlined style={{ fontSize: 12 }} /> }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div style={{
                    width: 45, height: 45, borderRadius: 8, background: '#f5f5f5',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #d9d9d9'
                  }}>
                    <PictureOutlined style={{ color: '#bfbfbf', fontSize: 20 }} />
                  </div>
                )}
              </div>

              {/* 2. PHẦN TÊN SẢN PHẨM CŨ CỦA ĐẠI CA */}
              <div style={{ flex: 1 }}>
                <Badge status={order.daGiao ? "default" : (progress >= 100 ? "success" : (dayjs(order.ngayGiao, 'DD/MM/YYYY').isBefore(dayjs()) ? "error" : "processing"))} />
                <Text strong style={{ fontSize: '15px', marginLeft: 8, color: '#001529', textTransform: 'uppercase' }}>
                  {order.tenSP}
                </Text>
                {order.daGiao && <Tag color="default" style={{ marginLeft: 8 }}>ĐÃ GIAO</Tag>}
              </div>
            </Col>

            <Col xs={16} sm={10} style={{ padding: '0 20px' }}>
              {/* Giữ nguyên phần Progress Đóng gói và Công đoạn của đại ca... */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', marginRight: '4px', color: '#8c8c8c' }}>Đóng gói:</span>
                  <Progress percent={progress} size="small" status={order.daGiao ? "normal" : "active"} strokeColor={order.daGiao ? "#d9d9d9" : { '0%': '#108ee9', '100%': '#52c41a' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', marginRight: '4px', color: '#8c8c8c' }}>Công đoạn:</span>
                  <Progress percent={stepsProgress} size="small" status={order.daGiao ? "normal" : "active"} strokeColor={order.daGiao ? "#d9d9d9" : { '0%': '#fa8c16', '100%': '#faad14' }} />
                </div>
              </div>
            </Col>

            <Col xs={8} sm={6} style={{ textAlign: 'right' }}>
              <Tag color={order.daGiao ? "default" : (dayjs(order.ngayGiao, 'DD/MM/YYYY').isBefore(dayjs()) ? "red" : "blue")} icon={<ClockCircleOutlined />}>Giao: {order.ngayGiao}</Tag>
            </Col>
          </Row>
        ),
        extra: (
          <Space onClick={(e) => e.stopPropagation()}>
            {/* Chỉ hiện nút Sửa và Xóa nếu là Admin */}
            {isAdmin && (
              <>
                {!order.daGiao && (
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => openEditModal(order)}
                  />
                )}
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => Modal.confirm({
                    title: 'Xoá đơn này?',
                    content: 'Hành động này không thể hoàn tác!',
                    onOk: () => remove(ref(db, `orders/${order.fbKey}`))
                  })}
                />
              </>
            )}
          </Space>
        ),
        children: (
          <>
            <Table
              columns={currentColumns}
              dataSource={order.chiTiet}
              pagination={false}
              bordered
              scroll={{ x: 500 }}
              size="middle"
              rowKey={(record) => record.key || record.name}
            />
            <div style={{
              marginTop: 15,
              padding: '15px',
              background: order.daGiao ? '#f5f5f5' : (isPackingOverdue ? '#fff1f0' : '#f6ffed'),
              borderRadius: '8px',
              border: `1px solid ${order.daGiao ? '#d9d9d9' : (isPackingOverdue ? '#ffa39e' : '#b7eb8f')}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <Space size="large">
                <Text strong><CarryOutOutlined /> ĐÓNG GÓI XONG (BỘ):</Text>
                <div style={{ textAlign: 'center' }}>
                  <InputNumber
                    min={0}
                    size="large"
                    style={{ width: 120 }}
                    value={order.soLuongDongGoi || 0}
                    onChange={(val) => {
                      // Cập nhật tạm thời để UI mượt, hoặc dùng onBlur như cũ
                    }}
                    onBlur={(e) => {
                      const newVal = Number(e.target.value) || 0;
                      if (newVal !== order.soLuongDongGoi) {
                        update(ref(db, `orders/${order.fbKey}`), { soLuongDongGoi: newVal });
                        message.success("Đã cập nhật số lượng đóng gói!");
                      }
                    }}
                  />
                  {order.deadlineDongGoi && (
                    <div style={{ fontSize: '11px', color: isPackingOverdue ? 'red' : '#8c8c8c', fontWeight: 'bold' }}>Hạn xong: {dayjs(order.deadlineDongGoi).format('DD/MM')}</div>
                  )}
                </div>
                <Text type="secondary">/ Tổng bộ cần: <b style={{ color: '#f5222d', fontSize: '16px' }}>{order.tongSoBo}</b></Text>
              </Space>

              <Space>
                <div style={{ width: 150 }}>
                  <Progress percent={progress} status={order.daGiao ? "normal" : "active"} strokeColor={order.daGiao ? "#8c8c8c" : "#52c41a"} />
                </div>
                {progress >= 100 && !order.daGiao && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<SendOutlined />}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    onClick={() => handleDeliverOrder(order.fbKey)}
                  >
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

    const startIndex = (page - 1) * pageSize;
    const paginatedItems = collapseItems.slice(startIndex, startIndex + pageSize);

    return (
      <>
        <Collapse
          accordion
          ghost
          expandIconPlacement="end"
          items={paginatedItems}
        />

        {collapseItems.length > pageSize && (
          <div style={{ textAlign: 'center', marginTop: '20px', paddingBottom: '30px' }}>
            <Pagination
              current={page}
              pageSize={pageSize}
              total={collapseItems.length}
              showSizeChanger={false}
              onChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </>
    );
  };

  if (!user && !loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
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
                    <div style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #f0f0f0',
                      fontWeight: 'bold',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#fafafa'
                    }}>
                      <span>THÔNG BÁO ({notifications.length})</span>
                      {notifications.some(n => n.fbKey) && (
                        <Button type="link" size="small" danger onClick={() => remove(ref(db, 'notifications/'))}>Xóa hết</Button>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#8c8c8c' }}>Không có thông báo mới</div>
                    ) : (
                      notifications.map((item) => {
                        const isOverdue = item.type === 'danger';
                        const isSystemNoti = !item.fbKey;

                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              padding: '12px',
                              borderBottom: '1px solid #f0f0f0',
                              background: isOverdue ? '#fff1f0' : '#fffbe6',
                              transition: 'background 0.3s',
                              position: 'relative',
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
                            <div style={{ flex: 1, paddingRight: '20px' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '14px', color: isOverdue ? '#cf1322' : '#d48806' }}>
                                {isOverdue && '⚠️ '}{item.title}
                              </div>
                              <div style={{ fontSize: '13px', color: '#434343', marginTop: 4 }}>
                                {item.content}
                              </div>
                              <Tag color={isOverdue ? "error" : "warning"} style={{ marginTop: 8, fontWeight: 'bold' }}>
                                {item.time}
                              </Tag>
                            </div>

                            {!isSystemNoti && (
                              <Button
                                type="text"
                                size="small"
                                icon={<PlusOutlined style={{ transform: 'rotate(45deg)', color: '#bfbfbf' }} />}
                                onClick={() => deleteNoti(item)}
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  right: '8px',
                                  height: '22px',
                                  width: '22px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              />
                            )}
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

      <Tabs
        type="card"
        items={[
          // --- TAB 1: QUẢN LÝ SẢN XUẤT (Giữ nguyên của đại ca) ---
          {
            key: '1',
            label: <b><CarryOutOutlined /> QUẢN LÝ SẢN XUẤT</b>,
            children: (
              <div style={{ background: '#fff', padding: '20px', borderRadius: '0 0 12px 12px' }}>
                <Space wrap style={{ marginBottom: 20 }}>
                  <Input placeholder="Tìm tên sản phẩm..." prefix={<SearchOutlined />} style={{ width: 250 }} onChange={e => setSearchText(e.target.value)} allowClear />
                  <RangePicker format="DD/MM/YYYY" onChange={setDateRange} />
                  {isAdmin && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                      TẠO ĐƠN MỚI
                    </Button>
                  )}
                </Space>

                <Tabs
                  defaultActiveKey="1"
                  items={[
                    {
                      key: '1',
                      label: <Badge count={orderCategorized.dangLam.length} offset={[10, 0]}><b>ĐANG SẢN XUẤT</b></Badge>,
                      children: renderOrderList(orderCategorized.dangLam, false, page1, setPage1)
                    },
                    {
                      key: '2',
                      label: <Badge count={orderCategorized.choGiao.length} offset={[10, 0]} color="#52c41a"><b>XONG (CHỜ GIAO)</b></Badge>,
                      children: renderOrderList(orderCategorized.choGiao, false, page2, setPage2)
                    },
                    {
                      key: '3',
                      label: <Badge count={orderCategorized.daGiao.length} offset={[10, 0]} color="#8c8c8c"><b>ĐÃ GIAO</b></Badge>,
                      children: renderOrderList(orderCategorized.daGiao, true, page3, setPage3)
                    }
                  ]}
                />
              </div>
            )
          },
          {
            key: 'transfer',
            label: <b><SwapOutlined /> BÀN GIAO & XÁC NHẬN</b>,
            children: (
              <ProductionTransfer
                orders={orders}
                user={user}
                db={db}
              />
            )
          },
          {
            key: '2',
            label: <b><HistoryOutlined /> NHẬT KÝ</b>,
            children: (
              <Card>
                <Input placeholder="Tìm đơn hoặc người làm..." style={{ marginBottom: 20, width: 300 }} prefix={<SearchOutlined />} onChange={e => setSearchLog(e.target.value)} allowClear />
                <Collapse accordion>
                  {/* ... Giữ nguyên phần nội dung orders.map của đại ca ở đây ... */}
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
          },
          // Tìm đến cuối Tab '2' (Nhật Ký), phẩy một cái rồi dán đoạn này vào:
          {
            key: 'extraStock',
            label: <b><InboxOutlined /> KHO HÀNG DƯ</b>,
            children: (
              <ExtraStock
                khoDu={khoDu}
                db={db}
                user={user}
                isAdmin={isAdmin}
              />
            )
          },
        ]}
      />

      <div className="app-container">
        <Modal
          title={editingOrder ? `CHỈNH SỬA: ${editingOrder.tenSP}` : "TẠO ĐƠN HÀNG MỚI"}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={1000}
          destroyOnHidden
        >
          <OrderForm
            form={form}
            initialData={editingOrder || copiedOrder}
            onFinish={handleFinalSubmit}
            isEditing={!!editingOrder}
            onCopy={handleCopy}
          />
        </Modal>

      </div>
    </div>
  );
};

export default App;