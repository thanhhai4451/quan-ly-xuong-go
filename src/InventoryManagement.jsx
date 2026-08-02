import React, { useState, useEffect } from "react";
import { 
  Table, Card, Button, Input, Space, Modal, Form, 
  InputNumber, Select, message, Tag, Typography, 
  Tabs, Row, Col, Statistic, Avatar, Layout, Popconfirm, Tooltip, DatePicker
} from "antd";
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, FilePdfOutlined, 
  HistoryOutlined, InboxOutlined, UserOutlined, 
  ArrowRightOutlined, StockOutlined, LayoutOutlined,
  SearchOutlined, WarningOutlined, FileExcelOutlined,
  RollbackOutlined, SafetyCertificateOutlined, HomeOutlined,
  PrinterOutlined
} from "@ant-design/icons";

import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

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

// Danh sách Kho khả dụng
const WAREHOUSES = [
  { id: 'MAIN', name: 'Kho Chính (Nguyên Liệu)' },
  { id: 'SUB_1', name: 'Kho Bán Thành Phẩm' },
  { id: 'SUB_2', name: 'Kho Phụ Kiện & Vật Tư Phụ' }
];

const styles = {
  layout: { minHeight: '100vh', background: '#f5f7fa' },
  header: {
    background: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    padding: '0 30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    height: '70px'
  },
  card: { borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
};

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
  const [filterLowStock, setFilterLowStock] = useState(false);

  const [form] = Form.useForm();
  const [exportForm] = Form.useForm();
  const [multiExportForm] = Form.useForm();
  const [addStockForm] = Form.useForm();

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isMultiExportOpen, setIsMultiExportOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [addStockItem, setAddStockItem] = useState(null);
  const [selectedHistoryKeys, setSelectedHistoryKeys] = useState([]);

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

  // 2. EXCEL IMPORT / EXPORT ENGINE
  const handleExportExcel = () => {
    const exportData = filteredItems.map(item => ({
      "Mã Vật Tư": item.code,
      "Tên Vật Tư": item.name,
      "Đơn Vị Tính": item.unit,
      "Số Lượng Tồn": item.stock,
      "Mức Cảnh Báo": item.minStock,
      "Kho": WAREHOUSES.find(w => w.id === item.warehouseId)?.name || "Kho Chính"
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TonKho");
    XLSX.writeFile(workbook, `BaoCao_TonKho_${dayjs().format('DDMMYYYY')}.xlsx`);
    message.success("Đã xuất Excel danh mục tồn kho thành công!");
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
          message.success(`Mã ${values.code} đã tồn tại trong kho này, đã cộng dồn thành công ${values.stock} ${values.unit}!`);
        } else {
          const newRef = push(ref(db, "materials"));
          await set(newRef, { ...payload, stock: values.stock || 0 });
          message.success("Khởi tạo vật tư mới thành công!");
        }
      }
      setIsModalOpen(false);
      form.resetFields();
    } catch (e) {
      message.error("Có lỗi xảy ra: " + e.message);
    }
  };

  // CẤU HÌNH BẢNG DỮ LIỆU KHO
  const columns = [
   {
      title: 'THÔNG TIN VẬT TƯ',
      key: 'info',
      render: (_, r) => (
        <Space size="middle">
          <Avatar shape="square" size={44} style={{ 
            backgroundColor: Number(r.stock) <= Number(r.minStock) ? '#fff1f0' : '#e6f7ff', 
            color: Number(r.stock) <= Number(r.minStock) ? '#ff4d4f' : '#1677ff', 
            fontWeight: 800,
            border: '1px solid currentColor'
          }}>
            {r.code.substring(0,2).toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: '15px' }}>{r.name}</Text><br/>
            <Space size={[0, 4]} wrap style={{ marginTop: 4 }}>
              <Tag color="blue" style={{ fontSize: '11px', borderRadius: '4px' }}>#{r.code}</Tag>
              
              {/* KIỂM TRA NẾU LÀ GỖ THÌ HIỂN THỊ SỐ KHỐI, SỐ THANH */}
              {r.isWood && (
                <>
                  <Tag color="orange" style={{ fontSize: '11px', borderRadius: '4px' }}>
                    Khối: {r.blockCount || 0}
                  </Tag>
                  <Tag color="cyan" style={{ fontSize: '11px', borderRadius: '4px' }}>
                    Thanh: {r.barCount || 0}
                  </Tag>
                </>
              )}
            </Space>
          </div>
        </Space>
      )
    },
    {
      title: 'TỒN KHO HIỆN TẠI',
      align: 'center',
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: '18px', color: Number(r.stock) <= Number(r.minStock) ? '#ff4d4f' : '#262626' }}>
            {r.stock}
          </Text>
          <Text type="secondary" style={{ marginLeft: 4 }}>{r.unit}</Text>
          {Number(r.stock) <= Number(r.minStock) && (
            <div style={{ color: '#ff4d4f', fontSize: '11px', fontWeight: 600 }}>
              <WarningOutlined /> CẦN BỔ SUNG
            </div>
          )}
        </div>
      )
    },
    {
      title: 'THAO TÁC QUẢN LÝ',
      align: 'right',
      render: (_, r) => (
        <Space>
          <Button type="primary" shape="round" icon={<ArrowRightOutlined />} onClick={() => handleExport(r)}>Xuất Kho</Button>
          <Button type="default" shape="round" icon={<PlusOutlined />} onClick={() => openAddStockModal(r)}>Nhập Thêm</Button>
          {userRole !== 'STAFF' && (
            <>
              <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenEditModal(r)} />
              <Popconfirm title="Xóa vật tư này khỏi hệ thống?" onConfirm={() => remove(ref(db, `materials/${r.key}`))}>
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      )
    }
  ];

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
      setIsAddStockOpen(false);
      message.success(`Đã cập nhật tồn kho mới cho mã ${addStockItem.code}!`);
    } catch (e) {
      message.error('Lỗi cập nhật: ' + e.message);
    }
  };

  return (
    <Layout style={styles.layout}>
      <Header style={styles.header}>
        <Space size="large">
          <Avatar shape="square" icon={<LayoutOutlined />} style={{ backgroundColor: '#1677ff' }} size="large" />
          <div>
            <Title level={4} style={{ margin: 0 }}>HỆ THỐNG QUẢN LÝ KHO ERP </Title>
          </div>
        </Space>

        <Space size="middle">
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

      <Content style={{ padding: '24px 40px' }}>
        {/* STATS DASHBOARD */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card style={styles.card}>
              <Statistic title="MẶT HÀNG TRONG KHO" value={filteredItems.length} prefix={<InboxOutlined style={{ color: '#1677ff' }} />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={styles.card}>
              <Statistic 
                title="CẢNH BÁO TỒN THẤP" 
                value={lowStockCount} 
                valueStyle={{ color: lowStockCount > 0 ? '#ff4d4f' : '#52c41a' }} 
                prefix={<WarningOutlined />} 
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={styles.card}>
              <Statistic title="TỔNG SỐ LƯỢNG TỒN" value={totalInventory} prefix={<StockOutlined style={{ color: '#52c41a' }} />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={styles.card}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Text type="secondary">CÔNG CỤ EXCEL PRO</Text>
                <Space wrap>
                  <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} type="dashed">Xuất Excel</Button>
                  <label htmlFor="excel-import" style={{ cursor: 'pointer' }}>
                    <Button icon={<PlusOutlined />} type="dashed" component="span">Import Excel</Button>
                  </label>
                  <input id="excel-import" type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={{ display: 'none' }} />
                </Space>
              </div>
            </Card>
          </Col>
        </Row>

        {/* MAIN PANEL */}
        <Card style={styles.card} bodyStyle={{ padding: 0 }}>
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
                    {/* Toolbar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                      <Space size="middle">
                        <Input 
                          placeholder="Tìm mã hoặc tên vật tư..." 
                          prefix={<SearchOutlined />} 
                          style={{ width: 280, borderRadius: '6px' }} 
                          onChange={e => setSearchText(e.target.value)}
                          allowClear
                        />
                        <Button 
                          type={filterLowStock ? "primary" : "default"} 
                          danger={filterLowStock} 
                          onClick={() => setFilterLowStock(!filterLowStock)}
                        >
                          {filterLowStock ? "Hiển Thị Tất Cả" : "Chỉ Xem Cảnh Báo Hết"}
                        </Button>

                        {selectedRowKeys.length > 0 && (
                          <Button 
                            type="primary" 
                            style={{ backgroundColor: '#722ed1' }}
                            icon={<FilePdfOutlined />}
                            onClick={() => setIsMultiExportOpen(true)}
                          >
                            Xuất Kho Hàng Loạt ({selectedRowKeys.length})
                          </Button>
                        )}
                      </Space>

                      {userRole !== 'STAFF' && (
                        <Button 
                          type="primary" 
                          icon={<PlusOutlined />} 
                          size="large"
                          onClick={handleOpenAddModal}
                        >
                          Thêm Vật Tư Mới
                        </Button>
                      )}
                    </div>

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
                label: <span><HistoryOutlined /> NHẬT KÝ & HOÀN TÁC GIAO DỊCH</span>,
                children: (
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                      <Space size="middle">
                        <Input
                          placeholder="Tìm theo mã, tên, người nhận..."
                          prefix={<SearchOutlined />}
                          style={{ width: 300 }}
                          onChange={e => setHistorySearch(e.target.value)}
                        />
                        <DatePicker.RangePicker onChange={setHistoryRange} />
                      </Space>

                      {selectedHistoryKeys.length > 0 && userRole === 'ADMIN' && (
                        <Popconfirm 
                          title={`Xóa vĩnh viễn ${selectedHistoryKeys.length} dòng lịch sử đã chọn?`} 
                          onConfirm={handleBatchDeleteHistory}
                        >
                          <Button type="primary" danger icon={<DeleteOutlined />}>
                            Xóa Lịch Sử Đã Chọn ({selectedHistoryKeys.length})
                          </Button>
                        </Popconfirm>
                      )}
                    </div>

                    <Table 
                      rowSelection={{
                        selectedRowKeys: selectedHistoryKeys,
                        onChange: setSelectedHistoryKeys
                      }}
                      rowKey="key"
                      dataSource={filteredHistory} 
                      columns={[
                        { title: 'THỜI GIAN', dataIndex: 'time', width: 160 },
                        { title: 'MÃ & TÊN VẬT TƯ', render: (_, r) => <Text strong>{r.code} - {r.name}</Text> },
                        { title: 'SL XUẤT', render: (_, r) => <Tag color="volcano">-{r.qty} {r.unit}</Tag> },
                        { title: 'NGƯỜI NHẬN', dataIndex: 'receiver' },
                        { title: 'LÝ DO', dataIndex: 'reason' },
                        { 
                          title: 'THAO TÁC BẢO MẬT', 
                          align: 'center',
                          render: (_, r) => (
                            <Space wrap>
                              <Tooltip title="In lại phiếu PDF">
                                <Button 
                                  type="text" 
                                  icon={<PrinterOutlined />} 
                                  onClick={() => generatePDF([{ code: r.code, name: r.name, qty: r.qty, unit: r.unit }], r.receiver, r.reason)} 
                                />
                              </Tooltip>
                              {userRole === 'ADMIN' ? (
                                <Popconfirm title="Hoàn tác xuất kho và hoàn lại số lượng tồn?" onConfirm={() => handleRollback(r)}>
                                  <Button type="link" danger icon={<RollbackOutlined />}>Hoàn Tác</Button>
                                </Popconfirm>
                              ) : <Tag>Không đủ quyền</Tag>}
                            </Space>
                          )
                        }
                      ]} 
                      pagination={{ pageSize: 8 }}
                    />
                  </div>
                )
              }
            ]}
          />
        </Card>
      </Content>

      {/* MODAL THÊM / CHỈNH SỬA VẬT TƯ (CÓ TRƯỜNG CHỌN KHO) */}
      <Modal 
        title={editingItem ? "CẬP NHẬT VẬT TƯ" : "KHỞI TẠO VẬT TƯ MỚI"} 
        open={isModalOpen} 
        onOk={() => form.submit()} 
        onCancel={() => setIsModalOpen(false)}
        okText={editingItem ? "Lưu Cập Nhật" : "Tạo Mới"}
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveMaterial} style={{ marginTop: 16 }}>
          {/* TRƯỜNG CHỌN KHO CHÍNH XÁC CẦN LƯU */}
          <Row gutter={12}>
            <Col span={24}>
              <Form.Item 
                name="warehouseId" 
                label="Lưu vào Kho" 
                rules={[{ required: true, message: 'Vui lòng chọn kho lưu trữ!' }]}
              >
                <Select placeholder="Chọn kho cần lưu vật tư" size="large">
                  {WAREHOUSES.map(w => (
                    <Option key={w.id} value={w.id}>
                      <HomeOutlined style={{ marginRight: 8 }} />
                      {w.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="code" label="Mã hiệu" rules={[{ required: true, message: 'Nhập mã vật tư!' }]}>
                <Input placeholder="VD: VT-01" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Tên vật tư" rules={[{ required: true, message: 'Nhập tên vật tư!' }]}>
                <Input placeholder="Tên chi tiết..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="unit" label="Đơn vị tính" rules={[{ required: true, message: 'Chọn ĐVT!' }]}>
                <Select placeholder="Chọn">
                  {['Tấm', 'Cái', 'Bịch', 'Kg', 'Lít', 'Viên', 'Bộ', 'Cuộn', 'Thùng', 'Hộp', 'Thanh', 'Mét', 'M3'].map(u => (
                    <Option key={u} value={u}>{u}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="stock" label="Số lượng ban đầu" rules={[{ required: true, message: 'Nhập số lượng!' }]}>
                <InputNumber style={{ width: '100%' }} min={0} disabled={!!editingItem} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="minStock" label="Mức cảnh báo tồn" rules={[{ required: true, message: 'Nhập mức báo hết!' }]}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="5" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal Nhập Thêm Kho */}
      <Modal
        title="BỔ SUNG TỒN KHO"
        open={isAddStockOpen}
        onCancel={() => setIsAddStockOpen(false)}
        onOk={() => addStockForm.submit()}
      >
        <Form form={addStockForm} layout="vertical" onFinish={handleAddStock} style={{ marginTop: 16 }}>
          <Text strong>{addStockItem?.name} ({addStockItem?.code})</Text>
          <Form.Item name="qty" label="Số lượng nhập thêm" rules={[{ required: true, type: 'number', min: 1 }]} style={{ marginTop: 16 }}>
            <InputNumber style={{ width: '100%' }} size="large" min={1} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Xuất Kho Hàng Loạt */}
      <Modal
        title={<Title level={4}>XUẤT KHO HÀNG LOẠT ({selectedItems.length} MẶT HÀNG)</Title>}
        open={isMultiExportOpen}
        onCancel={() => setIsMultiExportOpen(false)}
        onOk={() => multiExportForm.submit()}
        width={700}
        okText="Xác Nhận Xuất & In PDF"
      >
        <Form form={multiExportForm} layout="vertical" onFinish={handleMultiExport} style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="receiver" label="Người/Bộ phận nhận" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined />} placeholder="Nhập tên người nhận / công trình..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reason" label="Lý do xuất kho" rules={[{ required: true }]}>
                <Input placeholder="Mục đích xuất..." />
              </Form.Item>
            </Col>
          </Row>

          <Title level={5} style={{ marginTop: 12 }}>Danh Sách Vật Tư Đã Chọn:</Title>
          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
            {selectedItems.map(item => (
              <Row key={item.key} gutter={12} align="middle" style={{ marginBottom: 12, borderBottom: '1px dashed #f0f0f0', paddingBottom: 8 }}>
                <Col span={10}>
                  <Text strong>{item.name}</Text><br/>
                  <Text type="secondary">{item.code} (Tồn: {item.stock} {item.unit})</Text>
                </Col>
                <Col span={14}>
                  <Form.Item 
                    name={`qty_${item.key}`} 
                    label="SL Xuất" 
                    initialValue={1}
                    rules={[{ required: true, type: 'number', min: 1, max: Number(item.stock) }]}
                    style={{ margin: 0 }}
                  >
                    <InputNumber style={{ width: '100%' }} min={1} max={Number(item.stock)} addonAfter={item.unit} />
                  </Form.Item>
                </Col>
              </Row>
            ))}
          </div>
        </Form>
      </Modal>
    </Layout>
  );
};

export default QuanLyVatTuPro;