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
  SearchOutlined, WarningOutlined 
} from "@ant-design/icons";


import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

// --- STYLES ---
const styles = {
  layout: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0f2f5 0%, #e6f7ff 100%)',
  },
  header: {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(10px)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    padding: '0 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 15px rgba(0,0,0,0.05)',
    height: '70px'
  },
  card: {
    borderRadius: '16px',
    border: 'none',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
    overflow: 'hidden'
  },
  statCard: (color) => ({
    borderRadius: '16px',
    borderLeft: `6px solid ${color}`,
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    transition: 'all 0.3s ease'
  })
};

const QuanLyVatTuFull = () => {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyRange, setHistoryRange] = useState(null);
  
  const [form] = Form.useForm();
  const [exportForm] = Form.useForm();
  const [multiExportForm] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isMultiExportOpen, setIsMultiExportOpen] = useState(false);
  const [selectedHistoryKeys, setSelectedHistoryKeys] = useState([]);

  // 1. REALTIME ENGINE
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

  const selectedItems = items.filter(item => selectedRowKeys.includes(item.key));
  const filteredHistory = history.filter((record) => {
    const lowerSearch = historySearch.trim().toLowerCase();
    const matchesSearch = !lowerSearch ||
      record.name.toLowerCase().includes(lowerSearch) ||
      record.code.toLowerCase().includes(lowerSearch) ||
      record.receiver.toLowerCase().includes(lowerSearch);

    if (!historyRange || historyRange.length !== 2) {
      return matchesSearch;
    }

    const [start, end] = historyRange;
    const recordTime = dayjs(record.time, "DD/MM/YYYY HH:mm");
    return matchesSearch && (
      recordTime.isSame(start, 'day') ||
      recordTime.isSame(end, 'day') ||
      (recordTime.isAfter(start) && recordTime.isBefore(end))
    );
  });

  // 2. ANALYTICS
  const totalInventory = items.reduce((sum, item) => sum + Number(item.stock || 0), 0);
  const lowStockCount = items.filter(i => i.stock <= i.minStock).length;

  // 3. PDF EXPORT (Clean Version)
// --- NÂNG CẤP PDF ENGINE ---

const exportToPDF = (record) => {
  const doc = new jsPDF();

  // 1. Cấu hình Font (Sư Phụ nên dùng thư viện hỗ trợ Font tiếng Việt hoặc dùng hàm clean như cũ nhưng trình bày đẹp hơn)
  // Ở đây con vẫn dùng hàm clean(str) để đảm bảo không lỗi, nhưng thiết kế lại cực đẹp
  const clean = (str) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D') : "";

  // 2. Background Header (Xanh chuyên nghiệp)
  doc.setFillColor(0, 51, 153); 
  doc.rect(0, 0, 210, 50, 'F');

  // 3. Tiêu đề công ty & Phiếu
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(clean("MAH FURNITURE - WOOD MANUFACTURING"), 20, 15); // Tên xưởng của Sư Phụ
  
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text(clean("PHIEU XUAT KHO"), 105, 35, { align: "center" });

  // 4. Thông tin chung (Dưới header)
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  
  // Vẽ khung bo góc cho thông tin
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(15, 55, 180, 25, 3, 3, 'S');

  doc.text(clean(`Ma chung tu: PXK-${record.id.toString().substring(0,8).toUpperCase()}`), 20, 62);
  doc.text(clean(`Ngay xuat: ${record.time}`), 20, 70);
  
  doc.setFont(undefined, 'bold');
  doc.text(clean(`NGUOI NHAN: ${clean(record.receiver).toUpperCase()}`), 120, 62);
  doc.setFont(undefined, 'normal');
  doc.text(clean(`Ly do: ${clean(record.reason)}`), 120, 70);

  // 5. Bảng vật tư (Dùng autoTable với style hiện đại)
  autoTable(doc, {
    startY: 85,
    head: [[clean('MA VAT TU'), clean('TEN CHI TIET VAT TU'), clean('SO LUONG'), clean('DON VI')]],
    body: [[record.code, clean(record.name).toUpperCase(), record.qty, clean(record.unit).toUpperCase()]],
    theme: 'grid',
    headStyles: { 
        fillColor: [0, 51, 153], 
        textColor: [255, 255, 255],
        fontSize: 11,
        halign: 'center'
    },
    bodyStyles: { 
        fontSize: 10,
        cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
    }
  });

  // 6. Khu vực ký tên (Chuyên nghiệp hơn)
  const finalY = doc.lastAutoTable.finalY + 20;
  
  doc.setFont(undefined, 'bold');
  doc.text(clean("NGUOI LAP PHIEU"), 45, finalY, { align: "center" });
  doc.text(clean("NGUOI NHAN HANG"), 155, finalY, { align: "center" });
  
  doc.setFont(undefined, 'italic');
  doc.setFontSize(9);
  doc.text(clean("(Ky va ghi ro ho ten)"), 45, finalY + 5, { align: "center" });
  doc.text(clean("(Ky va ghi ro ho ten)"), 155, finalY + 5, { align: "center" });

  // 7. Chân trang
  doc.setTextColor(150, 150, 150);
  doc.text(clean("He thong quan ly kho MAH v3.1 Pro"), 105, 285, { align: "center" });

  doc.save(`PXK_${record.code}_${dayjs().format('DDMMYY')}.pdf`);
};

  // 3.1 PDF EXPORT MULTIPLE RECORDS (Daily Report)
  const exportMultipleHistoryToPDF = () => {
    if (!selectedHistoryKeys.length) {
      message.warning('Chọn ít nhất một phiếu xuất để xuất báo cáo.');
      return;
    }

    const selectedRecords = filteredHistory.filter(r => selectedHistoryKeys.includes(r.key));
    const doc = new jsPDF();
    const clean = (str) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D') : "";
    
    // Header
    doc.setFillColor(0, 51, 153); 
    doc.rect(0, 0, 210, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(clean("MAH FURNITURE - WOOD MANUFACTURING"), 20, 15);
    
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text(clean("BAO CAO XUAT KHO"), 105, 35, { align: "center" });

    // Thông tin chung
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(15, 55, 180, 25, 3, 3, 'S');

    doc.text(clean(`Ngay bao cao: ${dayjs().format('DD/MM/YYYY')}`), 20, 62);
    doc.text(clean(`Tong phieu xuat: ${selectedRecords.length}`), 20, 70);
    
    doc.setFont(undefined, 'bold');
    doc.text(clean(`In luc: ${dayjs().format('DD/MM/YYYY HH:mm')}`), 120, 62);
    doc.setFont(undefined, 'normal');
    doc.text(clean(`Nguoi lap bao cao: [Ten nguoi lap]`), 120, 70);

    // Prepare table data
    const tableData = selectedRecords.map(r => [
      r.time,
      clean(r.code),
      clean(r.name),
      r.qty,
      clean(r.unit),
      clean(r.receiver),
      clean(r.reason || '')
    ]);

    autoTable(doc, {
      startY: 90,
      head: [[clean('THỜI GIAN'), clean('MÃ VẬT TƯ'), clean('TÊN VẬT TƯ'), clean('SL'), clean('ĐV'), clean('NGƯỜI NHẬN'), clean('LÝ DO')]],
      body: tableData,
      headStyles: { 
        fillColor: [0, 51, 153], 
        textColor: [255, 255, 255],
        fontSize: 11,
        halign: 'center'
      },
      bodyStyles: { 
        fontSize: 10,
        cellPadding: 5
      },
      columnStyles: {
        0: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' }
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        // Footer
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.getHeight();
        doc.setFontSize(9);
        doc.text(clean(`Trang ${doc.internal.pages.length - 1}`), pageSize.getWidth() / 2, pageHeight - 10, { align: 'center' });
      }
    });

    // Summary
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(clean(`Tổng số phiếu: ${selectedRecords.length}`), 20, finalY);
    
    const totalQty = selectedRecords.reduce((sum, r) => sum + Number(r.qty || 0), 0);
    doc.text(clean(`Tổng số lượng xuất: ${totalQty}`), 20, finalY + 7);

    const receivers = [...new Set(selectedRecords.map(r => clean(r.receiver)))];
    doc.text(clean(`Người liên quan: ${receivers.join(', ')}`), 20, finalY + 14);

    // Khu vực ký tên
    const signY = finalY + 30;
    doc.setFont(undefined, 'bold');
    doc.text(clean("NGUOI LAP BAO CAO"), 45, signY, { align: "center" });
    doc.text(clean("NGUOI DUYET"), 155, signY, { align: "center" });
    
    doc.setFont(undefined, 'italic');
    doc.setFontSize(9);
    doc.text(clean("(Ky va ghi ro ho ten)"), 45, signY + 5, { align: "center" });
    doc.text(clean("(Ky va ghi ro ho ten)"), 155, signY + 5, { align: "center" });

    // Chân trang
    doc.setTextColor(150, 150, 150);
    doc.text(clean("He thong quan ly kho MAH v3.1 Pro"), 105, 285, { align: "center" });

    doc.save(`Bao_Cao_Xuat_Kho_${dayjs().format('DD-MM-YYYY')}.pdf`);
  };

  // 4. HANDLERS
const handleSaveMaterial = async (values) => {
    try {
      if (editingItem) {
        // Trường hợp 1: Đang sửa một vật tư cụ thể (giữ nguyên logic cũ)
        await update(ref(db, `materials/${editingItem.key}`), values);
        message.success("Cập nhật thông tin thành công!");
      } else {
        // Trường hợp 2: Thêm mới - Kiểm tra trùng mã
        const existingItem = items.find(
          (i) => i.code.trim().toLowerCase() === values.code.trim().toLowerCase()
        );

        if (existingItem) {
          // NẾU TRÙNG MÃ: Thực hiện cộng dồn số lượng
          const newStock = Number(existingItem.stock || 0) + Number(values.stock || 0);
          
          await update(ref(db, `materials/${existingItem.key}`), {
            ...values,
            stock: newStock // Cập nhật số lượng mới đã cộng dồn
          });
          
          message.success(`Mã ${values.code} đã tồn tại. Đã cộng dồn thêm ${values.stock} vào kho!`);
        } else {
          // NẾU CHƯA CÓ: Tạo mới như bình thường
          const newRef = push(ref(db, "materials"));
          await set(newRef, { ...values, stock: values.stock || 0 });
          message.success("Thêm vật tư mới thành công!");
        }
      }
      setIsModalOpen(false);
      form.resetFields();
    } catch (e) { 
      message.error("Có lỗi xảy ra: " + e.message); 
    }
  };
  const openMultiExport = () => {
    if (!selectedItems.length) {
      message.warning('Chọn ít nhất một vật tư để xuất cùng lúc.');
      return;
    }
    multiExportForm.resetFields();
    setIsMultiExportOpen(true);
  };

  const handleMultiExport = async (values) => {
    const exportRecords = selectedItems.map(item => {
      const qty = Number(values[`qty_${item.key}`] || 0);
      return { ...item, qty };
    });

    if (exportRecords.some(r => r.qty <= 0 || r.qty > r.stock)) {
      message.error('Số lượng xuất phải lớn hơn 0 và không vượt quá tồn kho cho mỗi vật tư.');
      return;
    }

    const updates = {};
    await Promise.all(exportRecords.map(async (record) => {
      updates[`materials/${record.key}/stock`] = record.stock - record.qty;
    }));

    await update(ref(db), updates);
    await Promise.all(exportRecords.map((record) => push(ref(db, 'history'), {
      materialKey: record.key,
      code: record.code,
      name: record.name,
      unit: record.unit,
      qty: record.qty,
      receiver: values.receiver,
      reason: values.reason,
      time: dayjs().format('DD/MM/YYYY HH:mm'),
      id: Date.now() + Math.random()
    })));

    setSelectedRowKeys([]);
    setIsMultiExportOpen(false);
    message.success('Đã xuất nhiều vật tư thành công!');
  };

  const handleExport = (record) => {
    exportForm.resetFields();
    Modal.confirm({
      title: <Title level={4}>XÁC NHẬN XUẤT KHO</Title>,
      icon: <ArrowRightOutlined style={{ color: '#1677ff' }} />,
      width: 550,
      content: (
        <Form form={exportForm} layout="vertical" initialValues={{ qty: 1 }} style={{ marginTop: 20 }}>
          <div style={{ background: '#f0f5ff', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #adc6ff' }}>
            <Text strong style={{ fontSize: '16px' }}>{record.name}</Text> <br/>
            <Text type="secondary">Tồn kho hiện khả dụng: </Text> <Tag color="blue" style={{ fontWeight: 'bold' }}>{record.stock} {record.unit}</Tag>
          </div>
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="qty" label="Số lượng xuất" rules={[{ required: true, type: 'number', max: record.stock, min: 1 }]}>
                <InputNumber style={{ width: '100%' }} size="large" min={1} />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item name="receiver" label="Người nhận hàng" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined />} placeholder="Tên thợ / bộ phận" size="large" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reason" label="Mục đích sử dụng / Công trình" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Nhập lý do xuất kho..." style={{ borderRadius: '8px' }} />
          </Form.Item>
        </Form>
      ),
      okText: 'Xác nhận xuất',
      okButtonProps: { size: 'large', shape: 'round' },
      cancelButtonProps: { size: 'large', shape: 'round' },
      onOk: async () => {
        const v = await exportForm.validateFields();
        const updates = {};
        updates[`materials/${record.key}/stock`] = record.stock - v.qty;
        await update(ref(db), updates);
        await push(ref(db, "history"), {
          ...v,
          materialKey: record.key,
          code: record.code,
          name: record.name,
          unit: record.unit,
          time: dayjs().format('DD/MM/YYYY HH:mm'),
          id: Date.now()
        });
        message.success("Đã hoàn tất xuất kho!");
      }
    });
  };

  const columns = [
    {
      title: 'THÔNG TIN VẬT TƯ',
      key: 'info',
      render: (_, r) => (
        <Space size="middle">
          <Avatar shape="square" size={48} style={{ 
            backgroundColor: r.stock <= r.minStock ? '#fff1f0' : '#e6f7ff', 
            color: r.stock <= r.minStock ? '#ff4d4f' : '#1677ff', 
            fontWeight: 800,
            border: '1px solid currentColor'
          }}>
            {r.code.substring(0,2).toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: '15px' }}>{r.name}</Text><br/>
            <Tag color="default" style={{ fontSize: '11px', border: 'none', padding: 0 }}>#{r.code}</Tag>
          </div>
        </Space>
      )
    },
    {
      title: 'TỒN KHO',
      align: 'center',
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: '18px', color: r.stock <= r.minStock ? '#ff4d4f' : '#262626' }}>
            {r.stock}
          </Text>
          <Text type="secondary" style={{ marginLeft: 4 }}>{r.unit}</Text>
          {r.stock <= r.minStock && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d4f', fontSize: '11px' }}>
              <WarningOutlined style={{ marginRight: 4 }} /> CẦN NHẬP THÊM
            </div>
          )}
        </div>
      )
    },
    {
      title: 'THAO TÁC',
      align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="Xuất kho">
            <Button type="primary" shape="round" icon={<ArrowRightOutlined />} onClick={() => handleExport(r)}>Xuất</Button>
          </Tooltip>
          <Button variant="text" icon={<EditOutlined />} onClick={() => { setEditingItem(r); form.setFieldsValue(r); setIsModalOpen(true); }} />
          <Popconfirm title="Xóa vĩnh viễn vật tư này?" onConfirm={() => remove(ref(db, `materials/${r.key}`))}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Layout style={styles.layout}>
      <Header style={styles.header}>
        <Space size="large">
          <div style={{ background: '#1677ff', padding: '10px', borderRadius: '14px', display: 'flex' }}>
            <LayoutOutlined style={{ fontSize: '24px', color: '#fff' }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, letterSpacing: '-1px' }}>KHO SƯ PHỤ <small style={{ fontWeight: 300, color: '#999', fontSize: '14px' }}>v3.1 Pro</small></Title>
            <Text type="secondary">Hệ thống quản lý vật tư thông minh</Text>
          </div>
        </Space>

        <Space size="middle">
          <Input 
            placeholder="Tìm theo tên hoặc mã..." 
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} 
            style={{ width: 280, borderRadius: '10px', height: '40px' }} 
            onChange={e => setSearchText(e.target.value)}
            allowClear
          />
          <Button 
            type="primary" 
            size="large" 
            shape="round" 
            icon={<PlusOutlined />} 
            style={{ height: '40px', fontWeight: 600, boxShadow: '0 4px 14px rgba(22, 119, 255, 0.4)' }}
            onClick={() => { setEditingItem(null); form.resetFields(); setIsModalOpen(true); }}
          >
            THÊM VẬT TƯ
          </Button>
          <Button
            type="default"
            size="large"
            shape="round"
            style={{ height: '40px', fontWeight: 600 }}
            onClick={openMultiExport}
            disabled={!selectedRowKeys.length}
          >
            XUẤT NHIỀU
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: '30px 50px' }}>
        <Row gutter={[24, 24]} style={{ marginBottom: 30 }}>
          <Col span={8}>
            <Card style={styles.statCard('#1677ff')} hoverable bodyStyle={{ padding: '20px' }}>
              <Statistic title={<Text strong type="secondary">DANH MỤC</Text>} value={items.length} prefix={<InboxOutlined style={{ color: '#1677ff' }} />} />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={styles.statCard('#ff4d4f')} hoverable bodyStyle={{ padding: '20px' }}>
              <Statistic title={<Text strong type="secondary">CẢNH BÁO HẾT</Text>} value={lowStockCount} valueStyle={{ color: '#ff4d4f' }} prefix={<WarningOutlined />} />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={styles.statCard('#52c41a')} hoverable bodyStyle={{ padding: '20px' }}>
              <Statistic title={<Text strong type="secondary">TỔNG TỒN KHO</Text>} value={totalInventory} valueStyle={{ color: '#52c41a' }} prefix={<StockOutlined />} />
            </Card>
          </Col>
        </Row>

        <Card style={styles.card} bodyStyle={{ padding: 0 }}>
          <Tabs 
            defaultActiveKey="1"
            centered
            size="large"
            tabBarStyle={{ background: '#fafafa', marginBottom: 0, padding: '0 20px' }}
            items={[
              {
                key: '1',
                label: <span style={{ fontWeight: 600, padding: '0 15px' }}><StockOutlined /> QUẢN LÝ KHO</span>,
                children: (
                  <div style={{ padding: '24px' }}>
                    <Table 
                      rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                      rowKey="key"
                      dataSource={items.filter(i => i.name.toLowerCase().includes(searchText.toLowerCase()) || i.code.toLowerCase().includes(searchText.toLowerCase()))} 
                      columns={columns} 
                      pagination={{ pageSize: 7 }}
                    />
                  </div>
                )
              },
              {
                key: '2',
                label: <span style={{ fontWeight: 600, padding: '0 15px' }}><HistoryOutlined /> NHẬT KÝ XUẤT</span>,
                children: (
                  <div style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                        <Input
                          placeholder="Tìm theo tên, mã, hoặc người nhận..."
                          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                          style={{ width: 320, borderRadius: '10px' }}
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          allowClear
                        />
                        <DatePicker.RangePicker
                          value={historyRange}
                          onChange={(dates) => setHistoryRange(dates)}
                          style={{ minWidth: 280, maxWidth: 360, width: '100%' }}
                          allowClear
                        />
                      </div>
                      <Button 
                        type="primary" 
                        icon={<FilePdfOutlined />}
                        onClick={exportMultipleHistoryToPDF}
                        disabled={!selectedHistoryKeys.length}
                        style={{ fontWeight: 600 }}
                      >
                        XUẤT PDF ({selectedHistoryKeys.length})
                      </Button>
                    </div>
                    <Table 
                      rowSelection={{ 
                        selectedRowKeys: selectedHistoryKeys, 
                        onChange: setSelectedHistoryKeys,
                        type: 'checkbox'
                      }}
                      rowKey="key"
                      dataSource={filteredHistory} 
                      columns={[
                        { title: 'THỜI GIAN', dataIndex: 'time', width: 180 },
                        { title: 'VẬT TƯ', render: (_, r) => <Text strong>{r.name}</Text> },
                        { title: 'SL XUẤT', render: (_, r) => <Tag color="orange" style={{ fontWeight: 'bold' }}>-{r.qty} {r.unit}</Tag> },
                        { title: 'NGƯỜI NHẬN', render: (_, r) => <Tag icon={<UserOutlined />} color="blue">{r.receiver}</Tag> },
                        { title: 'PHIẾU', align: 'center', render: (_, r) => <Button type="link" danger icon={<FilePdfOutlined />} onClick={() => exportToPDF(r)}>Tải PDF</Button> }
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

      <Modal 
        title={<Title level={4}>{editingItem ? "CẬP NHẬT VẬT TƯ" : "KHỞI TẠO VẬT TƯ MỚI"}</Title>} 
        open={isModalOpen} 
        onOk={() => form.submit()} 
        onCancel={() => setIsModalOpen(false)}
        centered
        width={600}
        okText="Lưu thông tin"
        cancelText="Hủy bỏ"
      >
        <Form form={form} layout="vertical" onFinish={handleSaveMaterial} style={{ marginTop: 20 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label="Mã hiệu" rules={[{ required: true, message: 'Thiếu mã!' }]}>
                <Input placeholder="VD: VT01" size="large" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Tên vật tư" rules={[{ required: true, message: 'Thiếu tên!' }]}>
                <Input placeholder="Tên gọi chi tiết của vật tư..." size="large" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="unit" label="Đơn vị tính" rules={[{ required: true }]}>
                <Select size="large" placeholder="Chọn">
                  {['Tấm', 'Cái', 'Bịch', 'Kg', 'Lít', 'Viên', 'Con', 'Bộ', 'Cuộn', 'Thùng', 'Hộp'].map(u => <Option key={u} value={u}>{u}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="stock" label="Tồn đầu kỳ" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} size="large" min={0} disabled={!!editingItem} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="minStock" label="Mức cảnh báo" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} size="large" min={0} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={<Title level={4}>XUẤT NHIỀU VẬT TƯ</Title>}
        open={isMultiExportOpen}
        onCancel={() => setIsMultiExportOpen(false)}
        onOk={() => multiExportForm.submit()}
        width={650}
        okText="Xác nhận xuất"
        cancelText="Hủy bỏ"
      >
        <Form form={multiExportForm} layout="vertical" onFinish={handleMultiExport}>
          {selectedItems.map(item => (
            <Card key={item.key} size="small" style={{ marginBottom: 12, borderRadius: 12 }}>
              <Row align="middle" gutter={12}>
                <Col span={10}>
                  <Text strong>{item.name}</Text><br />
                  <Text type="secondary">{item.code} · {item.unit}</Text>
                </Col>
                <Col span={14}>
                  <Form.Item
                    name={`qty_${item.key}`}
                    label={`Số lượng xuất (${item.stock} hiện có)`}
                    rules={[{ required: true, type: 'number', min: 1, max: item.stock, message: 'Nhập số lượng hợp lệ' }]}
                  >
                    <InputNumber min={1} max={item.stock} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          ))}
          <Form.Item name="receiver" label="Người nhận" rules={[{ required: true }]}> 
            <Input placeholder="Tên người nhận..." />
          </Form.Item>
          <Form.Item name="reason" label="Lý do / bộ phận" rules={[{ required: true }]}> 
            <Input.TextArea rows={2} placeholder="Lý do xuất kho..." />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default QuanLyVatTuFull;