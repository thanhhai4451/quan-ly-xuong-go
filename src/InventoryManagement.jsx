import React, { useState, useEffect } from "react";
import { 
  Table, Card, Space, Modal, Form, Input, InputNumber,
  Select, message, Tag, Typography,
  Tabs, Row, Col, Avatar, Layout
} from "antd";
import { 
  HistoryOutlined, UserOutlined,
  ArrowRightOutlined, StockOutlined, LayoutOutlined,
  SafetyCertificateOutlined, HomeOutlined
} from "@ant-design/icons";

import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { WAREHOUSES, inventoryStyles } from "./utils/inventoryConfig";
import InventoryModals from "./components/InventoryModals";
import { createInventoryColumns } from "./components/InventoryTableColumns";
import InventoryDashboard from "./components/InventoryDashboard";
import InventoryToolbar from "./components/InventoryToolbar";
import InventoryHistoryTable from "./components/InventoryHistoryTable";
import InventoryMovementReport from "./components/InventoryMovementReport";
import "./InventoryManagement.css";

// --- FIREBASE SETUP ---
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, onValue, push, update, remove, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

const { Title, Text } = Typography;
const { Option } = Select;
const { Header, Content } = Layout;

const QuanLyVatTuPro = () => {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('MAIN');
  const [userRole, setUserRole] = useState('ADMIN'); // 'ADMIN' | 'MANAGER' | 'STAFF'
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyRange, setHistoryRange] = useState(null);
  const [reportMonth, setReportMonth] = useState(dayjs());
  const [filterLowStock, setFilterLowStock] = useState(false);

  const [form] = Form.useForm();
  const [exportForm] = Form.useForm();
  const [multiExportForm] = Form.useForm();
  const [addStockForm] = Form.useForm();

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isMultiExportOpen, setIsMultiExportOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [addStockItem, setAddStockItem] = useState(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferItem, setTransferItem] = useState(null);
  const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false);
  const [selectedHistoryKeys, setSelectedHistoryKeys] = useState([]);

  const [transferForm] = Form.useForm();
  const [bulkTransferForm] = Form.useForm();

  // 1. REALTIME FIREBASE SYNC
  useEffect(() => {
    const itemsRef = ref(db, "materials");
    const historyRef = ref(db, "history");

    const unsubItems = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      setItems(data ? Object.keys(data).map(key => ({ key, ...data[key] })) : []);
    });

    const unsubHistory = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      setHistory(data ? Object.keys(data).map(key => ({ key, ...data[key] })).reverse() : []);
    });

    return () => { unsubItems(); unsubHistory(); };
  }, []);

  // Lọc dữ liệu theo Kho & Tồn kho cảnh báo
  const filteredItems = items.filter(i => {
    const matchWH = i.warehouseId === selectedWarehouse || (!i.warehouseId && selectedWarehouse === 'MAIN');
    const matchSearch = i.name.toLowerCase().includes(searchText.toLowerCase()) || i.code.toLowerCase().includes(searchText.toLowerCase());
    const matchLowStock = filterLowStock ? Number(i.stock) <= Number(i.minStock) : true;
    return matchWH && matchSearch && matchLowStock;
  });

  const selectedItems = items.filter(item => selectedRowKeys.includes(item.key));

  const filteredHistory = history.filter((record) => {
    const lowerSearch = historySearch.trim().toLowerCase();
    const matchesSearch = !lowerSearch ||
      record.name.toLowerCase().includes(lowerSearch) ||
      record.code.toLowerCase().includes(lowerSearch) ||
      record.receiver.toLowerCase().includes(lowerSearch);

    if (!historyRange || historyRange.length !== 2) return matchesSearch;

    const [start, end] = historyRange;
    const recordTime = dayjs(record.time, "DD/MM/YYYY HH:mm");
    return matchesSearch && (recordTime.isSame(start, 'day') || recordTime.isSame(end, 'day') || (recordTime.isAfter(start) && recordTime.isBefore(end)));
  });

  // Analytics
  const totalInventory = filteredItems.reduce((sum, item) => sum + Number(item.stock || 0), 0);
  const lowStockCount = filteredItems.filter(i => Number(i.stock) <= Number(i.minStock)).length;
  const movementReportData = filteredItems.map(item => {
    const itemTransactions = history.filter(record => {
      const material = items.find(currentItem => currentItem.key === record.materialKey);
      const recordWarehouse = record.warehouseId || material?.warehouseId || 'MAIN';
      return record.materialKey === item.key && recordWarehouse === selectedWarehouse;
    });
    const monthStart = reportMonth.startOf('month');
    const getQuantity = (records, type) => records
      .filter(record => (record.type === type) && dayjs(record.time, "DD/MM/YYYY HH:mm").isValid())
      .reduce((sum, record) => sum + Number(record.qty || 0), 0);
    const inboundInMonth = getQuantity(
      itemTransactions.filter(record => {
        const time = dayjs(record.time, "DD/MM/YYYY HH:mm");
        return time.isSame(reportMonth, 'month');
      }),
      'NHAP'
    );
    const outboundInMonth = itemTransactions
      .filter(record => {
        const time = dayjs(record.time, "DD/MM/YYYY HH:mm");
        return time.isSame(reportMonth, 'month') && record.type !== 'NHAP';
      })
      .reduce((sum, record) => sum + Number(record.qty || 0), 0);
    const transactionsFromMonthStart = itemTransactions.filter(record => {
      const time = dayjs(record.time, "DD/MM/YYYY HH:mm");
      return time.isSame(monthStart, 'month') || time.isAfter(monthStart);
    });
    const inboundFromMonthStart = getQuantity(transactionsFromMonthStart, 'NHAP');
    const outboundFromMonthStart = transactionsFromMonthStart
      .filter(record => record.type !== 'NHAP')
      .reduce((sum, record) => sum + Number(record.qty || 0), 0);
    const openingStock = Number(item.stock || 0) - inboundFromMonthStart + outboundFromMonthStart;

    return {
      key: item.key,
      code: item.code,
      name: item.name,
      unit: item.unit,
      openingStock,
      inbound: inboundInMonth,
      outbound: outboundInMonth,
      closingStock: openingStock + inboundInMonth - outboundInMonth,
      currentStock: Number(item.stock || 0)
    };
  });

  // 2. EXCEL IMPORT / EXPORT ENGINE
  const handleExportExcel = () => {
    const exportData = filteredItems.map(item => ({
      "Mã Vật Tư": item.code,
      "Tên Vật Tư": item.name,
      "Đơn Vị Tính": item.unit,
      "Số Lượng Tồn": item.stock,
      "Mức Cảnh Báo": item.minStock,
      "Kho": WAREHOUSES.find(w => w.id === item.warehouseId)?.name || "Vật tư tiêu hao trong vòng một tháng"
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TonKho");
    XLSX.writeFile(workbook, `BaoCao_TonKho_${dayjs().format('DDMMYYYY')}.xlsx`);
    message.success("Đã xuất Excel danh mục tồn kho thành công!");
  };

  const handleExportMovementExcel = () => {
    const exportData = movementReportData.map(row => ({
      "Mã Vật Tư": row.code,
      "Tên Vật Tư": row.name,
      "Đơn Vị Tính": row.unit,
      "Tồn Đầu Kỳ": row.openingStock,
      "Nhập Trong Kỳ": row.inbound,
      "Xuất Trong Kỳ": row.outbound,
      "Tồn Cuối Kỳ": row.closingStock,
      "Tồn Hiện Tại": row.currentStock
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "XuatNhapTon");
    XLSX.writeFile(workbook, `BaoCao_XuatNhapTon_${reportMonth.format('MMYYYY')}.xlsx`);
    message.success("Đã xuất báo cáo xuất - nhập - tồn thành công!");
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let importedCount = 0;
        for (const row of data) {
          if (row["Mã Vật Tư"] && row["Tên Vật Tư"]) {
            const newRef = push(ref(db, "materials"));
            await set(newRef, {
              code: String(row["Mã Vật Tư"]).trim(),
              name: String(row["Tên Vật Tư"]).trim(),
              unit: row["Đơn Vị Tính"] || "Cái",
              stock: Number(row["Số Lượng Tồn"] || 0),
              minStock: Number(row["Mức Cảnh Báo"] || 5),
              warehouseId: selectedWarehouse
            });
              await push(ref(db, "history"), {
                materialKey: newRef.key,
                code: String(row["Mã Vật Tư"]).trim(),
                name: String(row["Tên Vật Tư"]).trim(),
                unit: row["Đơn Vị Tính"] || "Cái",
                qty: Number(row["Số Lượng Tồn"] || 0),
                type: 'NHAP',
                warehouseId: selectedWarehouse,
                receiver: 'Import Excel',
                reason: 'Nhập vật tư từ Excel',
                time: dayjs().format('DD/MM/YYYY HH:mm'),
                id: Date.now() + Math.random(),
                performerRole: userRole
              });
            importedCount++;
          }
        }
        message.success(`Đã nhập thành công ${importedCount} mã vật tư từ Excel!`);
      } catch (err) {
        message.error("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // 3. TẠO PHIẾU PDF (PDF EXPORT ENGINE)
  const generatePDF = (exportList, receiver, reason) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("PHIEU XUAT KHO VAT TU", 105, 20, { align: "center" });

    doc.setFontSize(11);
    doc.text(`Ngay xuat: ${dayjs().format("DD/MM/YYYY HH:mm")}`, 14, 32);
    doc.text(`Nguoi/Bo phan nhan: ${receiver}`, 14, 40);
    doc.text(`Ly do xuat: ${reason}`, 14, 48);

    const tableData = exportList.map((item, index) => [
      index + 1,
      item.code,
      item.name,
      item.qty,
      item.unit
    ]);

    autoTable(doc, {
      startY: 55,
      head: [["STT", "Ma Vat Tu", "Ten Vat Tu", "So Luong", "Don Vi"]],
      body: tableData,
    });

    const finalY = doc.lastAutoTable.finalY + 20;
    doc.text("Nguoi Lap Phieu", 40, finalY);
    doc.text("Nguoi Nhan Hang", 140, finalY);

    doc.save(`Phieu_Xuat_Kho_${dayjs().format("DDMMYYYY_HHmm")}.pdf`);
  };

  // 4. XỬ LÝ XUẤT KHO HÀNG LOẠT (MULTI EXPORT)
  const handleMultiExport = async (values) => {
    try {
      const exportItemsList = [];
      for (const item of selectedItems) {
        const qtyKey = `qty_${item.key}`;
        const exportQty = Number(values[qtyKey] || 0);

        if (exportQty > 0) {
          const newStock = Number(item.stock) - exportQty;
          await update(ref(db, `materials/${item.key}`), { stock: newStock });

          const record = {
            materialKey: item.key,
            code: item.code,
            name: item.name,
            unit: item.unit,
            qty: exportQty,
            type: 'XUAT',
            warehouseId: item.warehouseId || 'MAIN',
            receiver: values.receiver,
            reason: values.reason,
            time: dayjs().format("DD/MM/YYYY HH:mm"),
            id: Date.now() + Math.random(),
            performerRole: userRole
          };

          await push(ref(db, "history"), record);
          exportItemsList.push({ ...item, qty: exportQty });
        }
      }

      generatePDF(exportItemsList, values.receiver, values.reason);
      message.success("Đã hoàn tất xuất kho hàng loạt và xuất PDF!");
      setIsMultiExportOpen(false);
      setSelectedRowKeys([]);
      multiExportForm.resetFields();
    } catch (e) {
      message.error("Lỗi xuất kho hàng loạt: " + e.message);
    }
  };

  // 5. HOÀN TÁC GIAO DỊCH (ROLLBACK)
  const handleRollback = async (historyRecord) => {
    try {
      const material = items.find(i => i.key === historyRecord.materialKey);
      if (material) {
        const restoredStock = Number(material.stock) + Number(historyRecord.qty);
        await update(ref(db, `materials/${material.key}`), { stock: restoredStock });
      }
      await remove(ref(db, `history/${historyRecord.key}`));
      message.success("Đã hoàn tác giao dịch và cập nhật lại số lượng kho!");
    } catch (e) {
      message.error("Không thể hoàn tác: " + e.message);
    }
  };

  // 6. XÓA LỊCH SỬ HÀNG LOẠT
  const handleBatchDeleteHistory = async () => {
    try {
      for (const key of selectedHistoryKeys) {
        await remove(ref(db, `history/${key}`));
      }
      message.success(`Đã xóa thành công ${selectedHistoryKeys.length} bản ghi nhật ký!`);
      setSelectedHistoryKeys([]);
    } catch (e) {
      message.error("Lỗi khi xóa nhật ký: " + e.message);
    }
  };

  // 7. XỬ LÝ MỞ MODAL & LƯU VẬT TƯ (TÍCH HỢP CHỌN KHO)
  const handleOpenAddModal = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      warehouseId: selectedWarehouse // Mặc định chọn kho đang xem ở header
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record) => {
    setEditingItem(record);
    form.setFieldsValue({
      ...record,
      warehouseId: record.warehouseId || selectedWarehouse
    });
    setIsModalOpen(true);
  };

const handleSaveMaterial = async (values) => {
    try {
      const payload = { 
        code: values.code,
        name: values.name,
        unit: values.unit,
        minStock: values.minStock,
        warehouseId: values.warehouseId, // Lấy từ Select trong Form
        
        // Thêm các trường lưu thông tin gỗ
        isWood: values.isWood || false,
        ...(values.isWood && {
          woodType: values.woodType || '',
          blockCount: values.blockCount || 0,
          barCount: values.barCount || 0
        })
      };

      if (editingItem) {
        await update(ref(db, `materials/${editingItem.key}`), payload);
        message.success("Cập nhật thông tin vật tư thành công!");
      } else {
        // Kiểm tra trùng mã trong cùng một kho được chọn
        const existingItem = items.find(
          i => i.code.trim().toLowerCase() === values.code.trim().toLowerCase() && 
               i.warehouseId === values.warehouseId
        );

        if (existingItem) {
          const newStock = Number(existingItem.stock || 0) + Number(values.stock || 0);
          await update(ref(db, `materials/${existingItem.key}`), { ...payload, stock: newStock });
          await push(ref(db, "history"), {
            materialKey: existingItem.key,
            code: values.code,
            name: values.name,
            unit: values.unit,
            qty: Number(values.stock || 0),
            type: 'NHAP',
            warehouseId: values.warehouseId,
            receiver: 'Khởi tạo vật tư',
            reason: 'Cộng dồn tồn kho ban đầu',
            time: dayjs().format('DD/MM/YYYY HH:mm'),
            id: Date.now() + Math.random(),
            performerRole: userRole
          });
          message.success(`Mã ${values.code} đã tồn tại trong kho này, đã cộng dồn thành công ${values.stock} ${values.unit}!`);
        } else {
          const newRef = push(ref(db, "materials"));
          await set(newRef, { ...payload, stock: values.stock || 0 });
          await push(ref(db, "history"), {
            materialKey: newRef.key,
            code: values.code,
            name: values.name,
            unit: values.unit,
            qty: Number(values.stock || 0),
            type: 'NHAP',
            warehouseId: values.warehouseId,
            receiver: 'Khởi tạo vật tư',
            reason: 'Nhập tồn kho ban đầu',
            time: dayjs().format('DD/MM/YYYY HH:mm'),
            id: Date.now() + Math.random(),
            performerRole: userRole
          });
          message.success("Khởi tạo vật tư mới thành công!");
        }
      }
      setIsModalOpen(false);
      form.resetFields();
    } catch (e) {
      message.error("Có lỗi xảy ra: " + e.message);
    }
  };

  const columns = createInventoryColumns({
    userRole,
    handleExport: record => handleExport(record),
    openAddStockModal: item => openAddStockModal(item),
    openTransferModal: item => openTransferModal(item),
    handleOpenEditModal: item => handleOpenEditModal(item),
    handleDeleteMaterial: item => remove(ref(db, `materials/${item.key}`))
  });

  // Logic Mở Modal Xuất Đơn Lẻ
  const handleExport = (record) => {
    exportForm.resetFields();
    Modal.confirm({
      title: <Title level={4}>XÁC NHẬN XUẤT KHO VẬT TƯ</Title>,
      icon: <ArrowRightOutlined style={{ color: '#1677ff' }} />,
      width: 500,
      content: (
        <Form form={exportForm} layout="vertical" initialValues={{ qty: 1 }} style={{ marginTop: 20 }}>
          <div style={{ background: '#f0f5ff', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
            <Text strong>{record.name}</Text> ({record.code})<br/>
            <Text type="secondary">Khả dụng: </Text><Tag color="green">{record.stock} {record.unit}</Tag>
          </div>
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item name="qty" label="Số lượng xuất" rules={[{ required: true, type: 'number', max: Number(record.stock), min: 1 }]}>
                <InputNumber style={{ width: '100%' }} size="large" min={1} />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item name="receiver" label="Người/Bộ phận nhận" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined />} placeholder="Tên thợ / Công trình" size="large" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reason" label="Lý do xuất" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Nhập mục đích sử dụng..." />
          </Form.Item>
        </Form>
      ),
      okText: 'Xác Nhận & In PDF',
      onOk: async () => {
        const v = await exportForm.validateFields();
        await update(ref(db, `materials/${record.key}`), { stock: Number(record.stock) - Number(v.qty) });
        await push(ref(db, "history"), {
          ...v,
          materialKey: record.key,
          code: record.code,
          name: record.name,
          unit: record.unit,
          type: 'XUAT',
          warehouseId: record.warehouseId || 'MAIN',
          time: dayjs().format('DD/MM/YYYY HH:mm'),
          id: Date.now(),
          performerRole: userRole
        });

        generatePDF([{ ...record, qty: v.qty }], v.receiver, v.reason);
        message.success("Đã hoàn tất xuất kho và xuất phiếu PDF!");
      }
    });
  };

  const openAddStockModal = (item) => {
    setAddStockItem(item);
    setIsAddStockOpen(true);
    addStockForm.resetFields();
    addStockForm.setFieldsValue({ qty: 1 });
  };

  const handleAddStock = async (values) => {
    if (!addStockItem) return;
    try {
      const addedQty = Number(values.qty || 0);
      const newStock = Number(addStockItem.stock || 0) + addedQty;
      await update(ref(db, `materials/${addStockItem.key}`), { stock: newStock });
      await push(ref(db, "history"), {
        materialKey: addStockItem.key,
        code: addStockItem.code,
        name: addStockItem.name,
        unit: addStockItem.unit,
        qty: addedQty,
        type: 'NHAP',
        warehouseId: addStockItem.warehouseId || 'MAIN',
        receiver: 'Nhập bổ sung',
        reason: 'Bổ sung tồn kho',
        time: dayjs().format('DD/MM/YYYY HH:mm'),
        id: Date.now(),
        performerRole: userRole
      });
      setIsAddStockOpen(false);
      message.success(`Đã cập nhật tồn kho mới cho mã ${addStockItem.code}!`);
    } catch (e) {
      message.error('Lỗi cập nhật: ' + e.message);
    }
  };

  const openTransferModal = (item) => {
    setTransferItem(item);
    transferForm.resetFields();
    setIsTransferOpen(true);
  };

  const handleTransferMaterial = async (values) => {
    if (!transferItem || !values.targetWarehouseId) return;

    const currentWarehouseId = transferItem.warehouseId || 'MAIN';
    if (values.targetWarehouseId === currentWarehouseId) {
      message.warning('Vật tư đang ở nhóm này.');
      return;
    }

    const duplicateItem = items.find(item =>
      item.key !== transferItem.key &&
      (item.warehouseId || 'MAIN') === values.targetWarehouseId &&
      item.code.trim().toLowerCase() === transferItem.code.trim().toLowerCase()
    );

    if (duplicateItem) {
      message.error(`Mã ${transferItem.code} đã tồn tại trong nhóm đích.`);
      return;
    }

    try {
      await update(ref(db, `materials/${transferItem.key}`), {
        warehouseId: values.targetWarehouseId
      });
      setIsTransferOpen(false);
      setTransferItem(null);
      transferForm.resetFields();
      message.success(`Đã chuyển ${transferItem.name} sang nhóm mới!`);
    } catch (e) {
      message.error('Lỗi chuyển nhóm: ' + e.message);
    }
  };

  const handleBulkTransfer = async (values) => {
    if (!values.targetWarehouseId || selectedItems.length === 0) return;

    const sourceWarehouseIds = new Set(selectedItems.map(item => item.warehouseId || 'MAIN'));
    if (sourceWarehouseIds.size !== 1) {
      message.error('Các vật tư được chọn phải cùng một nhóm nguồn.');
      return;
    }

    const targetWarehouseId = values.targetWarehouseId;
    const selectedKeys = new Set(selectedItems.map(item => item.key));
    const selectedCodes = new Set();

    for (const item of selectedItems) {
      const normalizedCode = item.code.trim().toLowerCase();
      if (selectedCodes.has(normalizedCode)) {
        message.error(`Không thể chuyển vì danh sách đang chọn bị trùng mã ${item.code}.`);
        return;
      }
      selectedCodes.add(normalizedCode);

      const duplicateItem = items.find(existingItem =>
        !selectedKeys.has(existingItem.key) &&
        (existingItem.warehouseId || 'MAIN') === targetWarehouseId &&
        existingItem.code.trim().toLowerCase() === normalizedCode
      );

      if (duplicateItem) {
        message.error(`Mã ${item.code} đã tồn tại trong nhóm đích.`);
        return;
      }
    }

    try {
      await Promise.all(selectedItems.map(item =>
        update(ref(db, `materials/${item.key}`), { warehouseId: targetWarehouseId })
      ));
      setIsBulkTransferOpen(false);
      setSelectedRowKeys([]);
      bulkTransferForm.resetFields();
      message.success(`Đã chuyển ${selectedItems.length} vật tư sang nhóm mới!`);
    } catch (e) {
      message.error('Lỗi chuyển hàng loạt: ' + e.message);
    }
  };

  
  return (
    <Layout className="inventory-page" style={inventoryStyles.layout}>
      <Header className="inventory-page__header" style={inventoryStyles.header}>
        <Space size="large">
          <Avatar shape="square" icon={<LayoutOutlined />} style={{ backgroundColor: '#1677ff' }} size="large" />
          <div>
            <Title level={4} style={{ margin: 0 }}>HỆ THỐNG QUẢN LÝ KHO </Title>
          </div>
        </Space>

        <Space className="inventory-page__header-controls" size="middle">
          <Select value={selectedWarehouse} onChange={setSelectedWarehouse} style={{ width: 220 }} size="large">
            {WAREHOUSES.map(w => <Option key={w.id} value={w.id}><HomeOutlined /> {w.name}</Option>)}
          </Select>

          <Select value={userRole} onChange={setUserRole} style={{ width: 140 }} size="large">
            <Option value="ADMIN"><SafetyCertificateOutlined /> ADMIN</Option>
            <Option value="MANAGER">MANAGER</Option>
            <Option value="STAFF">STAFF</Option>
          </Select>
        </Space>
      </Header>

      <Content className="inventory-page__content" style={{ padding: '24px 40px' }}>
        <InventoryDashboard
          cardStyle={inventoryStyles.card}
          itemCount={filteredItems.length}
          lowStockCount={lowStockCount}
          totalInventory={totalInventory}
          onExportExcel={handleExportExcel}
          onImportExcel={handleImportExcel}
        />
        <Card className="inventory-page__main-card" style={inventoryStyles.card} bodyStyle={{ padding: 0 }}>
          <Tabs 
            defaultActiveKey="1"
            size="large"
            tabBarStyle={{ background: '#fafafa', padding: '0 20px', margin: 0 }}
            items={[
              {
                key: '1',
                label: <span><StockOutlined /> QUẢN LÝ TỒN KHO</span>,
                children: (
                  <div style={{ padding: '20px' }}>
                    <InventoryToolbar
                      searchText={searchText}
                      onSearchChange={event => setSearchText(event.target.value)}
                      filterLowStock={filterLowStock}
                      onToggleLowStock={() => setFilterLowStock(!filterLowStock)}
                      selectedCount={selectedRowKeys.length}
                      userRole={userRole}
                      onMultiExport={() => setIsMultiExportOpen(true)}
                      onBulkTransfer={() => setIsBulkTransferOpen(true)}
                      onAddMaterial={handleOpenAddModal}
                      onResetBulkTransfer={() => bulkTransferForm.resetFields()}
                    />

                    <Table 
                      rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys
                      }}
                      rowKey="key"
                      dataSource={filteredItems} 
                      columns={columns} 
                      pagination={{ pageSize: 8 }}
                    />
                  </div>
                )
              },
              {
                key: '2',
                label: <span><StockOutlined /> BÁO CÁO XUẤT - NHẬP - TỒN</span>,
                children: (
                  <InventoryMovementReport
                    data={movementReportData}
                    month={reportMonth}
                    onMonthChange={setReportMonth}
                    onExport={handleExportMovementExcel}
                  />
                )
              },
              {
                key: '3',
                label: <span><HistoryOutlined /> NHẬT KÝ & HOÀN TÁC GIAO DỊCH</span>,
                children: (
                  <InventoryHistoryTable
                    data={filteredHistory}
                    selectedKeys={selectedHistoryKeys}
                    onSelectedKeysChange={setSelectedHistoryKeys}
                    searchValue={historySearch}
                    onSearchChange={event => setHistorySearch(event.target.value)}
                    dateRange={historyRange}
                    onDateRangeChange={setHistoryRange}
                    userRole={userRole}
                    onBatchDelete={handleBatchDeleteHistory}
                    onPrint={record => generatePDF([{ code: record.code, name: record.name, qty: record.qty, unit: record.unit }], record.receiver, record.reason)}
                    onRollback={handleRollback}
                  />
                )
              }
            ]}
          />
        </Card>
      </Content>

      <InventoryModals
        warehouses={WAREHOUSES}
        form={form}
        exportForm={exportForm}
        multiExportForm={multiExportForm}
        addStockForm={addStockForm}
        transferForm={transferForm}
        bulkTransferForm={bulkTransferForm}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        editingItem={editingItem}
        handleSaveMaterial={handleSaveMaterial}
        isAddStockOpen={isAddStockOpen}
        setIsAddStockOpen={setIsAddStockOpen}
        addStockItem={addStockItem}
        handleAddStock={handleAddStock}
        isTransferOpen={isTransferOpen}
        setIsTransferOpen={setIsTransferOpen}
        transferItem={transferItem}
        handleTransferMaterial={handleTransferMaterial}
        isBulkTransferOpen={isBulkTransferOpen}
        setIsBulkTransferOpen={setIsBulkTransferOpen}
        selectedItems={selectedItems}
        handleBulkTransfer={handleBulkTransfer}
        isMultiExportOpen={isMultiExportOpen}
        setIsMultiExportOpen={setIsMultiExportOpen}
        handleMultiExport={handleMultiExport}
      />

    </Layout>
  );
};

export default QuanLyVatTuPro;