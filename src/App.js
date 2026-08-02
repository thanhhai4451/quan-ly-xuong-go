import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Modal, Form, message, Tabs } from "antd";
import {
  CarryOutOutlined,
  HistoryOutlined,
  SwapOutlined,
  InboxOutlined,
  DatabaseOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { db, auth } from "./firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import ProductionTransfer from "./ProductionTransfer";
import InventoryManagement from "./InventoryManagement";
import DashboardTab from "./components/DashboardTab";
import ExtraStock from "./ExtraStock";
import LoginScreen from "./components/LoginScreen";
import AppHeader from "./components/AppHeader";
import ProductionManagementTab from "./components/ProductionManagementTab";
import ActivityLogTab from "./components/ActivityLogTab";
import OrderFormModal from "./components/OrderFormModal";
import { useOrderTableColumns } from "./components/useOrderTableColumns";
import { calculateOrderProgress } from "./utils/progress";

const App = () => {
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
  const [searchText, setSearchText] = useState("");
  const [searchLog, setSearchLog] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [bgFilter, setBgFilter] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [form] = Form.useForm();
  const [loginForm] = Form.useForm();

  const [realtimeNotis, setRealtimeNotis] = useState([]);
  const isAdmin = user?.email === "admin@gmail.com";
  const [khoDu, setKhoDu] = useState({}); // Dán dòng này chung với các useState khác

  useEffect(() => {
    // Tìm chỗ có onValue(ref(db, 'orders'), ...), dán thêm đoạn này xuống dưới nó
    onValue(ref(db, "khoDu"), (snapshot) => {
      setKhoDu(snapshot.val() || {});
    });
  }, []);
  useEffect(() => {
    if (!user) return;
    const notiRef = ref(db, "notifications/");
    onValue(notiRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map((k) => ({ ...data[k], fbKey: k }));
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
    const ordersRef = ref(db, "orders/");
    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map((key) => ({
          ...data[key],
          fbKey: key,
        }));
        setOrders(list.reverse());
      } else {
        setOrders([]);
      }
    });
  }, [user]);
  // Reset page về 1 khi filter thay đổi để tránh trang trống
  useEffect(() => {
    setPage1(1);
    setPage2(1);
    setPage3(1);
  }, [searchText, dateRange, customerFilter, bgFilter]);
  // Thay thế toàn bộ useState và useEffect của notifications bằng cục này:
  const notifications = useMemo(() => {
    if (orders.length === 0) return realtimeNotis; // Nếu chưa có đơn thì hiện thông báo từ cán bộ

    const homNay = dayjs().startOf("day");

    // 1. Thông báo sắp đến hạn (Giữ nguyên logic cũ của đại ca)
    const sapDenHan = orders
      .filter((order) => {
        if (order.daGiao) return false;
        const ngayGiao = dayjs(order.ngayGiao, "DD/MM/YYYY");
        const soNgayConLai = ngayGiao.diff(homNay, "day");
        const daXongDongGoi =
          (order.soLuongDongGoi || 0) >= (order.tongSoBo || 1);
        return soNgayConLai <= 10 && soNgayConLai >= 0 && !daXongDongGoi;
      })
      .map((order) => ({
        id: `deadline-${order.fbKey}`,
        type: "warning",
        title: "SẮP ĐẾN HẠN GIAO",
        content: `Đơn ${order.tenSP} sắp đến ngày giao khách!`,
        time: order.ngayGiao,
      }));

    // 2. Thông báo TRỄ CÔNG ĐOẠN (Giữ nguyên logic cũ của đại ca)
    const thongBaoTre = [];
    orders.forEach((order) => {
      if (order.daGiao) return;
      order.chiTiet?.forEach((item) => {
        ["phoi", "dinhHinh", "lapRap", "nham", "son"].forEach((step) => {
          const deadlineValue = item.deadlines?.[step];
          const hoanThanh = Number(item.tienDo?.[step] || 0);
          const can = Number(item.can || 0);
          if (deadlineValue && hoanThanh < can) {
            const ngayDeadline = dayjs(deadlineValue).startOf("day");
            const soNgayTre = homNay.diff(ngayDeadline, "day");
            if (soNgayTre > 0) {
              thongBaoTre.push({
                id: `overdue-${order.fbKey}-${item.key}-${step}`,
                type: "danger",
                title: "CẢNH BÁO TRỄ TIẾN ĐỘ",
                content: `Đơn [${order.tenSP}] - Tổ [${step.toUpperCase()}] trễ ${soNgayTre} ngày!`,
                time: `Hạn: ${ngayDeadline.format("DD/MM")}`,
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

  const openEditModal = (order) => {
    setEditingOrder(order);

    const initialItems = (order.chiTiet || []).map((item) => ({
      ...item,
      key: item.key,
      qty: item.can,
      deadlines: Object.keys(item.deadlines || {}).reduce((acc, step) => {
        if (item.deadlines[step]) acc[step] = dayjs(item.deadlines[step]);
        return acc;
      }, {}),
    }));

    form.setFieldsValue({
      ...order,
      hinhAnh: order.hinhAnh || "",
      ngayGiao: dayjs(order.ngayGiao, "DD/MM/YYYY"),
      deadlineDongGoi: order.deadlineDongGoi
        ? dayjs(order.deadlineDongGoi)
        : null,
      items: initialItems,
    });

    setIsModalOpen(true);
  };

  // --- DÙNG USECALLBACK ĐỂ HÀM KHÔNG BỊ TẠO LẠI KHI RENDER ---
  const handleUpdateGroupRecord = useCallback(
    (fbKey, groupName, to, value) => {
      const val = parseInt(value) || 0;
      const order = orders.find((o) => o.fbKey === fbKey);
      if (!order || !groupName) return; // Bảo vệ dữ liệu khỏi undefined

      const steps = ["phoi", "dinhHinh", "lapRap", "nham", "son", "dongGoi"];
      const stepLabels = {
        phoi: "PHÔI",
        dinhHinh: "ĐỊNH HÌNH",
        lapRap: "LẮP RÁP",
        nham: "NHÁM",
        son: "SƠN",
        dongGoi: "ĐÓNG GÓI",
      };

      const stepIndex = steps.indexOf(to);
      if (stepIndex > 0) {
        const prevStep = steps[stepIndex - 1];
        const groupItems = order.chiTiet.filter(
          (it) => it.groupName === groupName,
        );
        const hasSkipped = groupItems.some((it) =>
          (it.skipSteps || []).includes(prevStep),
        );
        if (!hasSkipped) {
          const prevValSum = groupItems.reduce(
            (acc, it) => acc + Number(it.tienDo?.[prevStep] || 0),
            0,
          );
          if (val > prevValSum) {
            message.error(
              `Không thể nhập số lượng lớn hơn tổng tổ trước (${stepLabels[prevStep]}: ${prevValSum})`,
            );
            return;
          }
        }
      }

      const newChiTiet = order.chiTiet.map((it) => {
        if (it.groupName === groupName) {
          const hienTai = it.tienDo?.[to] || 0;
          if (val === hienTai) return it;

          const newLog = {
            id: Date.now() + Math.random(),
            ngay: dayjs().format("DD/MM HH:mm"),
            to: to.toUpperCase(),
            sl: val,
            chenhLech: val - hienTai,
            userEmail: user?.email || "Thợ",
          };

          return {
            ...it,
            tienDo: { ...it.tienDo, [to]: val },
            lichSu: [newLog, ...(it.lichSu || [])],
          };
        }
        return it;
      });

      update(ref(db, `orders/${fbKey}`), { chiTiet: newChiTiet }).then(() =>
        message.success(`Đã cập nhật cụm ${groupName.toUpperCase()}`),
      );
    },
    [orders, user],
  ); // Các biến phụ thuộc của hàm này

  const handleUpdateRecord = useCallback(
    (fbKey, detailKey, to, value) => {
      const val = parseInt(value) || 0;
      const order = orders.find((o) => o.fbKey === fbKey);
      if (!order) return;

      const item = order.chiTiet.find((i) => i.key === detailKey);
      if (!item) return;

      const steps = ["phoi", "dinhHinh", "lapRap", "nham", "son", "dongGoi"];
      const stepLabels = {
        phoi: "PHÔI",
        dinhHinh: "ĐỊNH HÌNH",
        lapRap: "LẮP RÁP",
        nham: "NHÁM",
        son: "SƠN",
        dongGoi: "ĐÓNG GÓI",
      };
      const stepIndex = steps.indexOf(to);
      if (stepIndex > 0) {
        const prevStep = steps[stepIndex - 1];
        if (!(item.skipSteps || []).includes(prevStep)) {
          const prevVal = Number(item.tienDo?.[prevStep] || 0);
          if (val > prevVal) {
            message.error(
              `Không thể nhập số lượng lớn hơn tổ trước (${stepLabels[prevStep]}: ${prevVal})`,
            );
            return;
          }
        }
      }

      const hienTai = item.tienDo?.[to] || 0;
      if (val === hienTai) return;

      const newChiTiet = order.chiTiet.map((it) => {
        if (it.key === detailKey) {
          const deadlineStep = it.deadlines?.[to];
          let soNgayTreLuuLai = 0;
          if (deadlineStep && val < it.can) {
            const homNay = dayjs().startOf("day");
            const ngayDeadline = dayjs(deadlineStep);
            if (homNay.isAfter(ngayDeadline))
              soNgayTreLuuLai = homNay.diff(ngayDeadline, "day");
          }

          const newLog = {
            id: Date.now(),
            ngay: dayjs().format("DD/MM HH:mm"),
            to: to.toUpperCase(),
            sl: val,
            chenhLech: val - hienTai,
            userEmail: user?.email || "Ẩn danh",
            tre: soNgayTreLuuLai,
          };

          return {
            ...it,
            tienDo: { ...it.tienDo, [to]: val },
            lichSu: [newLog, ...(it.lichSu || [])],
          };
        }
        return it;
      });

      update(ref(db, `orders/${fbKey}`), { chiTiet: newChiTiet })
        .then(() => {
          message.success(`Đã cập nhật tổ ${to.toUpperCase()}`);
          push(ref(db, "notifications/"), {
            id: Date.now(),
            title: "CẬP NHẬT SẢN XUẤT",
            content: `${(user?.email || "ẨN DANH").split("@")[0].toUpperCase()} cập nhật [${item.name}] của đơn [${order.tenSP}]`,
            time: dayjs().format("HH:mm DD/MM"),
            type: "info",
            isRead: false,
          });
        })
        .catch(() => message.error("Lỗi kết nối Database!"));
    },
    [orders, user],
  ); // Các biến phụ thuộc của hàm này
const handleUpdateDongGoi = (order, field, value) => {
  const val = Number(value) || 0;
  const tongBo = Number(order.tongSoBo || 0);

  const updates = {
    soLuongDongGoi: val,
  };

  // Nếu đơn đã giao nhưng chỉnh số lượng xuống thấp hơn tổng bộ
  // => trả đơn về trạng thái Đang sản xuất
  if (order.daGiao && val < tongBo) {
    updates.daGiao = false;
    updates.ngayThucTeGiao = null;
  }

  update(ref(db, `orders/${order.fbKey}`), updates)
    .then(() => {
      if (order.daGiao && val < tongBo) {
        message.success("Đơn đã được chuyển lại ĐANG SẢN XUẤT");
      } else if (!order.daGiao && val >= tongBo) {
        message.success("Đơn hàng đã hoàn thành và chuyển sang CHỜ GIAO");
      } else {
        message.success("Đã cập nhật đóng gói");
      }
    })
    .catch(() => {
      message.error("Lỗi cập nhật đóng gói");
    });
};

    const handleDeleteOrder = (order) => {
  Modal.confirm({
    title: "Xóa đơn hàng?",
    content: `Bạn có chắc muốn xóa đơn "${order.tenSP}" không?`,
    okText: "Xóa",
    okType: "danger",
    cancelText: "Hủy",
    onOk: () => {
      remove(ref(db, `orders/${order.fbKey}`))
        .then(() => {
          message.success("Đã xóa đơn hàng");
        })
        .catch((err) => {
          message.error("Lỗi khi xóa: " + err.message);
        });
    },
  });
};

  const handleUpdateDaXuat = (order, field, value) => {
  update(ref(db, `orders/${order.fbKey}`), {
    soLuongDaXuat: Number(value) || 0,
  });
};
  const handleLogout = () =>
    signOut(auth).then(() => message.info("Đã đăng xuất!"));

  const handleDeliverOrder = (fbKey) => {
    const order = orders.find((o) => o.fbKey === fbKey);

    Modal.confirm({
      title: "Xác nhận giao hàng?",
      content:
        "Đơn hàng này sẽ được chuyển sang mục Đã Giao. Hàng dư (nếu có) sẽ tự động chuyển vào Kho hàng dư.",
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: () => {
        // Phát hiện hàng dư từ TẤT CẢ các công đoạn
        const duDetails = []; // Danh sách chi tiết dư
        const STEPS = ["phoi", "dinhHinh", "lapRap", "nham", "son", "dongGoi"];

        if (order.chiTiet && order.chiTiet.length > 0) {
          order.chiTiet.forEach((item) => {
            const can = item.can || 0;

            // Kiểm tra hàng dư ở mỗi công đoạn
            // DƯ = số hoàn thành lớn hơn số cần
            STEPS.forEach((step) => {
              const hoanthanh = item.tienDo?.[step] || 0;
              const du = hoanthanh - can;

              if (du > 0) {
                duDetails.push({
                  name: `${item.name} (Từ ${step.toUpperCase()}: ${hoanthanh} - ${can})`,
                  qty: du,
                  loai: "CHI_TIET",
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
          ngayThucTeGiao: dayjs().format("DD/MM/YYYY HH:mm"),
        };

        if (duDetails.length > 0 || duBo > 0) {
          const khoDuKey = `du_${order.tenSP.toLowerCase().replace(/\s+/g, "_")}_${fbKey.substring(0, 6)}`;
          const khoDuData = {
            tenItem: `[DƯ] ${order.tenSP}`,
            loai: duBo > 0 ? "BO" : "CHI_TIET",
            ghiChu: `Dư từ đơn hàng ngày ${dayjs().format("DD/MM/YYYY")}. Dư từ các công đoạn: ${duDetails.length} loại chi tiết`,
            soLuongTong:
              duBo > 0 ? duBo : duDetails.reduce((sum, d) => sum + d.qty, 0),
            chiTietList: duDetails.length > 0 ? duDetails : null,
            ngayCapNhat: dayjs().format("DD/MM/YYYY HH:mm"),
            nguoiCapNhat: user?.email || "Ẩn danh",
            donHangGoc: fbKey, // Lưu lại tham chiếu đơn hàng gốc
          };

          update(ref(db, `khoDu/${khoDuKey}`), khoDuData);
        }

        update(ref(db, `orders/${fbKey}`), updates)
          .then(() => {
            if (duDetails.length > 0 || duBo > 0) {
              message.success(
                `✅ Giao hàng thành công! ${duDetails.length > 0 ? duDetails.length + " loại chi tiết dư" : duBo + " bộ dư"} đã lưu vào Kho hàng dư.`,
              );
            } else {
              message.success("✅ Đã giao hàng thành công!");
            }
          })
          .catch(() => message.error("Lỗi kết nối!"));
      },
    });
  };

  const deleteNoti = (item) => {
    if (item.fbKey) {
      // Nếu là thông báo từ Firebase (do cán bộ cập nhật)
      remove(ref(db, `notifications/${item.fbKey}`)).then(() =>
        message.success("Đã xóa thông báo"),
      );
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
        const oldItem = editingOrder.chiTiet?.find(
          (old) => (old.key && old.key === it.key) || old.name === it.name,
        );

        // 2. Nếu tìm thấy, lấy lại tiến độ. Nếu không thấy, báo lỗi hoặc cho về 0
        const preservedTienDo = oldItem
          ? oldItem.tienDo
          : { phoi: 0, dinhHinh: 0, lapRap: 0, nham: 0, son: 0, dongGoi: 0 };
        const preservedLichSu = oldItem ? oldItem.lichSu || [] : [];

        return {
          key: it.key || oldItem?.key || `item_${Date.now()}_${index}`, // Giữ key cũ
          name: it.name,
          can: Number(it.qty) || 0,
          groupName: (it.groupName || "").trim(),
          soBoCum: it.soBoCum || 0,
          skipSteps: Array.isArray(it.skipSteps) ? it.skipSteps : [],
          deadlines: Object.keys(it.deadlines || {}).reduce((acc, step) => {
            const d = it.deadlines?.[step];
            acc[step] =
              d && typeof d.format === "function"
                ? d.format("YYYY-MM-DD")
                : d || "";
            return acc;
          }, {}),
          tienDo: preservedTienDo, // Dán lại tiến độ cũ vào đây
          lichSu: preservedLichSu, // Dán lại lịch sử cũ vào đây
        };
      });

      const finalData = {
        tenSP: values.tenSP.toUpperCase(),
        tenKhachHang: values.tenKhachHang || editingOrder.tenKhachHang || "",
        maDon: values.maDon || editingOrder.maDon || "",
        tongSoBo: Number(values.tongSoBo),
        deadlineDongGoi: values.deadlineDongGoi?.format?.("YYYY-MM-DD") || "",
        ngayGiao: values.ngayGiao?.format?.("DD/MM/YYYY") || "",
        hinhAnh: values.hinhAnh || editingOrder.hinhAnh || "",
        chiTiet: cleanedItems,
        daGiao: editingOrder.daGiao || false,
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
        const steps = ["phoi", "dinhHinh", "lapRap", "nham", "son", "dongGoi"];

        steps.forEach((step) => {
          const dateVal = it.deadlines?.[step];
          formattedDeadlines[step] =
            dateVal && typeof dateVal.format === "function"
              ? dateVal.format("YYYY-MM-DD")
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
          tienDo: {
            phoi: 0,
            dinhHinh: 0,
            lapRap: 0,
            nham: 0,
            son: 0,
            dongGoi: 0,
          },
          lichSu: [],
        };
      });

      push(ref(db, "orders/"), {
        tenSP: (values.tenSP || "").toUpperCase(),
        tenKhachHang: values.tenKhachHang || "",
        maDon: values.maDon || "",
        tongSoBo: Number(values.tongSoBo) || 0,
        soLuongDongGoi: 0,
        ngayGiao: values.ngayGiao ? values.ngayGiao.format("DD/MM/YYYY") : "",
        deadlineDongGoi: values.deadlineDongGoi
          ? values.deadlineDongGoi.format("YYYY-MM-DD")
          : "",
        hinhAnh: values.hinhAnh || "",
        chiTiet: list,
        daGiao: false,
        createdAt: new Date().toISOString(),
      })
        .then(() => {
          setIsModalOpen(false);
          form.resetFields();
          message.success("Đã tạo đơn thành công!");
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
    const total = orders.filter((o) => !o.daGiao).length;
    const completed = orders.filter(
      (o) => !o.daGiao && (o.soLuongDongGoi || 0) >= (o.tongSoBo || 1),
    ).length;
    const pending = total - completed;
    const overdue = orders.filter((o) => {
      const isDone = (o.soLuongDongGoi || 0) >= (o.tongSoBo || 1);
      return (
        !o.daGiao &&
        !isDone &&
        dayjs(o.ngayGiao, "DD/MM/YYYY").isBefore(dayjs(), "day")
      );
    }).length;
    return { total, completed, pending, overdue };
  }, [orders]);

  const customerOptions = useMemo(() => {
    const s = new Set();
    orders.forEach((o) => {
      if (o.tenKhachHang) s.add(o.tenKhachHang);
    });
    return Array.from(s).map((v) => ({ label: v, value: v }));
  }, [orders]);

  const bgOptions = useMemo(() => {
    const s = new Set();
    orders.forEach((o) => {
      if (o.maDon) s.add(o.maDon);
    });
    return Array.from(s).map((v) => ({ label: v, value: v }));
  }, [orders]);

  const orderCategorized = useMemo(() => {
    const filtered = orders.filter((order) => {
      const matchSearch = (order.tenSP || "")
        .toLowerCase()
        .includes(searchText.toLowerCase());
      const orderDate = dayjs(order.ngayGiao, "DD/MM/YYYY");
      const matchDate =
        !dateRange ||
        (orderDate.isAfter(dateRange[0].startOf("day")) &&
          orderDate.isBefore(dateRange[1].endOf("day")));

      const custField = (
        order.tenKhachHang ||
        order.tenKH ||
        order.customer ||
        ""
      )
        .toString()
        .toLowerCase();
      const matchCustomer =
        !customerFilter || custField.includes(customerFilter.toLowerCase());

      const codeField = (order.maDon || order.madon || order.code || "")
        .toString()
        .toLowerCase();
      const matchBG = !bgFilter || codeField.includes(bgFilter.toLowerCase());

      return matchSearch && matchDate && matchCustomer && matchBG;
    });


    return {
      dangLam: filtered
        .filter((o) => !o.daGiao && calculateOrderProgress(o) < 100)
        .sort((a, b) => {
          const hasA = a.chiTiet?.some((item) =>
            Object.values(item.tienDo || {}).some((val) => val > 0),
          );
          const hasB = b.chiTiet?.some((item) =>
            Object.values(item.tienDo || {}).some((val) => val > 0),
          );
          if (hasA && !hasB) return -1;
          if (!hasA && hasB) return 1;
          return 0;
        }),
      choGiao: filtered.filter(
        (o) => !o.daGiao && calculateOrderProgress(o) >= 100,
      ),
      daGiao: filtered.filter((o) => o.daGiao),
    };
  }, [orders, searchText, dateRange, customerFilter, bgFilter]);

  const tableColumns = useOrderTableColumns(
    handleUpdateGroupRecord,
    handleUpdateRecord,
  );

  if (!user && !loading) {
    return <LoginScreen loginForm={loginForm} onLogin={handleLogin} />;
  }

  return (
    <div style={{ padding: "20px", background: "#f0f2f5", minHeight: "100vh" }}>
      <AppHeader
        notifications={notifications}
        onDeleteNoti={deleteNoti}
        user={user}
        onLogout={handleLogout}
      />

      <Tabs
        type="card"
        items={[
          {
            key: "dashboard",
            label: (
              <b>
                <DashboardOutlined /> BÁO CÁO TỔNG QUAN
              </b>
            ),
            children: <DashboardTab orders={orders} khoDu={khoDu} />,
          },
          {
            key: "1",
            label: (
              <b>
                <CarryOutOutlined /> QUẢN LÝ SẢN XUẤT
              </b>
            ),
            children: (
              <ProductionManagementTab
                pageSize={pageSize}
                onSearchTextChange={setSearchText}
                onDateRangeChange={setDateRange}
                customerOptions={customerOptions}
                customerFilter={customerFilter}
                onCustomerFilterChange={setCustomerFilter}
                bgOptions={bgOptions}
                bgFilter={bgFilter}
                onBgFilterChange={setBgFilter}
                isAdmin={isAdmin}
                onOpenCreateModal={openCreateModal}
                orderCategorized={orderCategorized}
                page1={page1}
                setPage1={setPage1}
                page2={page2}
                setPage2={setPage2}
                page3={page3}
                setPage3={setPage3}
                tableColumns={tableColumns}
                onEditOrder={openEditModal}
                onDeliverOrder={handleDeliverOrder}
                onUpdateDongGoi={handleUpdateDongGoi}
                onUpdateDaXuat={handleUpdateDaXuat}
                onDeleteOrder={handleDeleteOrder}
              />
            ),
          },
          {
            key: "transfer",
            label: (
              <b>
                <SwapOutlined /> BÀN GIAO & XÁC NHẬN
              </b>
            ),
            children: (
              <ProductionTransfer orders={orders} user={user} db={db} />
            ),
          },
          {
            key: "2",
            label: (
              <b>
                <HistoryOutlined /> NHẬT KÝ
              </b>
            ),
            children: (
              <ActivityLogTab
                orders={orders}
                searchLog={searchLog}
                onSearchLogChange={setSearchLog}
              />
            ),
          },
          {
            key: "extraStock",
            label: (
              <b>
                <InboxOutlined /> KHO HÀNG DƯ
              </b>
            ),
            children: (
              <ExtraStock khoDu={khoDu} db={db} user={user} isAdmin={isAdmin} />
            ),
          },
          {
            key: "inventory",
            label: (
              <b>
                <DatabaseOutlined /> QUẢN LÝ NHẬP KHO
              </b>
            ),
            children: (
              <InventoryManagement db={db} user={user} isAdmin={isAdmin} />
            ),
          },
        ]}
      />

      <OrderFormModal
        editingOrder={editingOrder}
        copiedOrder={copiedOrder}
        isModalOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        form={form}
        onFinish={handleFinalSubmit}
        onCopy={handleCopy}
      />
    </div>
  );
};

export default App;
