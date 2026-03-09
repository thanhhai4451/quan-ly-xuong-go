import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Select,
  message,
  Row,
  Col,
  Typography,
  Tabs,
  Tag,
  Space,
  Input,
  Popconfirm,
  Statistic,
  Divider,
  Tooltip,
  DatePicker,
} from "antd";
import {
  PlusOutlined,
  ExportOutlined,
  SearchOutlined,
  DatabaseOutlined,
  EditOutlined,
  DeleteOutlined,
  InboxOutlined,
  UserOutlined,
  AppstoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import {
  ref,
  push,
  onValue,
  update,
  get,
  serverTimestamp,
  set,
  remove,
} from "firebase/database";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;

const WoodInventoryUltimate = ({ db }) => {
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("IMPORT");
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [historyFilterCustomer, setHistoryFilterCustomer] = useState(null);
  const [historyFilterOrderCode, setHistoryFilterOrderCode] = useState("");
  const [historyFilterDateRange, setHistoryFilterDateRange] = useState(null);
  const [form] = Form.useForm();
  const [selectedExportCustomer, setSelectedExportCustomer] = useState(null);

  // 1. TẢI DỮ LIỆU THỜI GIAN THỰC
  useEffect(() => {
    if (!db) return;
    onValue(ref(db, "customers"), (snap) => {
      const data = snap.val();
      setCustomers(
        data ? Object.keys(data).map((k) => ({ id: k, ...data[k] })) : [],
      );
    });
    onValue(ref(db, "inventory"), (snap) => {
      const data = snap.val();
      setInventory(
        data ? Object.keys(data).map((k) => ({ id: k, ...data[k] })) : [],
      );
    });
    onValue(ref(db, "transactions"), (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.keys(data).map((k) => ({ id: k, ...data[k] }));
        setTransactions(list.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setTransactions([]);
      }
    });
  }, [db]);

  // 2. LOGIC TÍNH TOÁN NHANH
  const totalStock = inventory.reduce(
    (sum, item) => sum + (item.available || 0),
    0,
  );
  const totalItems = inventory.length;

  // 3. XỬ LÝ XÓA
  const handleDelete = async (id) => {
    try {
      await remove(ref(db, `inventory/${id}`));
      message.success("Đã xóa kiện hàng khỏi hệ thống!");
    } catch (err) {
      message.error("Lỗi: " + err.message);
    }
  };

  const openEditModal = (record) => {
    setModalType("EDIT");
    setEditingId(record.id);
    setIsModalOpen(true);
    form.setFieldsValue({ ...record });
  };

  const onFinish = async (values) => {
    try {
      if (modalType === "EDIT") {
        await update(ref(db, `inventory/${editingId}`), {
          ...values,
          lastUpdated: serverTimestamp(),
        });
        message.success("Cập nhật thông tin thành công!");
      } else if (modalType === "IMPORT") {
        const { customerName, orderCode, items } = values;
        const nameToProcess = Array.isArray(customerName)
          ? customerName[0]
          : customerName;
        const existingCust = customers.find((c) => c.name === nameToProcess);
        let finalCustomerId = existingCust?.id;
        if (!existingCust) {
          const newCustRef = push(ref(db, "customers"));
          await set(newCustRef, { name: nameToProcess });
          finalCustomerId = newCustRef.key;
        }

        const importPromises = items.map(async (item) => {
          const newItemRef = push(ref(db, "inventory"));
          const inventoryData = {
            productName: item.productName || "",
            productCode: item.productCode || "",
            customerId: finalCustomerId,
            customerName: nameToProcess,
            unit: item.unit || "Cái",
            available: item.quantity || 0,
            note: item.note || "",
            orderCode: orderCode || "",
            lastUpdated: serverTimestamp(),
          };
          await set(newItemRef, inventoryData);
          return push(ref(db, "transactions"), {
            ...inventoryData,
            type: "IMPORT",
            quantity: item.quantity || 0,
            timestamp: serverTimestamp(),
            createdAt: dayjs().format("DD/MM/YYYY HH:mm"),
          });
        });
        await Promise.all(importPromises);
        message.success(`Đã nhập thành công ${items.length} kiện hàng!`);
    } else if (modalType === "EXPORT") {
        const { exportItems, exportOrderCode } = values;

        // Tạo danh sách các Promise để chạy đồng thời cho nhanh
        const exportPromises = exportItems.map(async (item) => {
          const itemRef = ref(db, `inventory/${item.inventoryId}`);
          const snap = await get(itemRef);
          const current = snap.val();

          if (!current || current.available < item.quantity) {
            throw new Error(`Sản phẩm ${current?.productName || ''} không đủ tồn kho!`);
          }

          // 1. Cập nhật trừ tồn kho
          await update(itemRef, {
            available: current.available - item.quantity,
            lastUpdated: serverTimestamp(),
          });

          // 2. Lưu vào lịch sử giao dịch
          return push(ref(db, "transactions"), {
            type: "EXPORT",
            customerName: current.customerName,
            productName: current.productName,
            productCode: current.productCode,
            orderCode: exportOrderCode, // Lấy mã phiếu xuất chung
            quantity: item.quantity,
            unit: current.unit,
            note: item.note || "",
            timestamp: serverTimestamp(),
            createdAt: dayjs().format("DD/MM/YYYY HH:mm"),
          });
        });

        await Promise.all(exportPromises);
        message.success("Xuất kho thành công!");
      }
      setIsModalOpen(false);
      form.resetFields();
    } catch (err) {
      message.error("Lỗi: " + err.message);
    }
  };

  const inventoryColumns = [
    {
      title: "Thông tin lô hàng",
      width: "40%",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: "#002766", fontSize: "15px" }}>
            {r.productName}
          </Text>
          <Space split={<Divider type="vertical" />}>
            <Text type="secondary">
              <AppstoreOutlined /> {r.productCode}
            </Text>
            <Tag color="blue">PO: {r.orderCode}</Tag>
          </Space>
        </Space>
      ),
    },
    {
      title: "Số lượng tồn",
      dataIndex: "available",
      align: "center",
      sorter: (a, b) => a.available - b.available,
      render: (v, r) => (
        <div style={{ textAlign: "center" }}>
          <Text
            style={{ fontSize: "18px", color: v <= 5 ? "#cf1322" : "#389e0d" }}
            strong
          >
            {v.toLocaleString()}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: "11px" }}>
            {r.unit.toUpperCase()}
          </Text>
        </div>
      ),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      render: (t) =>
        t ? (
          <Tooltip title={t}>
            <Text ellipsis style={{ maxWidth: 150 }}>
              {t}
            </Text>
          </Tooltip>
        ) : (
          "-"
        ),
    },
    {
      title: "Quản lý",
      align: "right",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            ghost
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="Xác nhận xóa kiện hàng này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const customerListInStock = [
    ...new Set(inventory.map((i) => i.customerName)),
  ].sort();

  const renderInventoryTable = (custName = null) => {
    const filteredData = inventory.filter((i) => {
      const matchSearch =
        i.productCode?.toLowerCase().includes(searchText.toLowerCase()) ||
        i.productName?.toLowerCase().includes(searchText.toLowerCase()) ||
        i.orderCode?.toLowerCase().includes(searchText.toLowerCase());
      const matchCustomer = custName ? i.customerName === custName : true;
      return matchSearch && matchCustomer;
    });

    return (
      <Table
        dataSource={filteredData}
        columns={inventoryColumns}
        rowKey="id"
        pagination={{ pageSize: 8 }}
        style={{ borderRadius: "0 0 8px 8px" }}
      />
    );
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchCustomer = historyFilterCustomer
      ? t.customerName === historyFilterCustomer
      : true;
    const matchOrderCode = historyFilterOrderCode
      ? t.orderCode
          ?.toString()
          .toLowerCase()
          .includes(historyFilterOrderCode.trim().toLowerCase())
      : true;

    const matchDateRange = historyFilterDateRange
      ? (() => {
          const [start, end] = historyFilterDateRange;
          const timestamp =
            typeof t.timestamp === "number"
              ? t.timestamp
              : dayjs(t.createdAt, "DD/MM/YYYY HH:mm").valueOf();
          return (
            timestamp >= start.valueOf() && timestamp <= end.valueOf()
          );
        })()
      : true;

    return matchCustomer && matchOrderCode && matchDateRange;
  });

  const inventoryTabs = [
    {
      key: "ALL",
      label: (
        <span style={{ padding: "0 12px" }}>
          <DatabaseOutlined /> TẤT CẢ KHO
        </span>
      ),
      children: renderInventoryTable(),
    },
    ...customerListInStock.map((name) => ({
      key: name,
      label: (
        <span>
          <UserOutlined /> {name.toUpperCase()}
        </span>
      ),
      children: renderInventoryTable(name),
    })),
  ];

  return (
    <div
      style={{
        padding: "24px",
        background: "#f0f2f5",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* TOP HEADER */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <div
            style={{
              background: "#001529",
              padding: "24px",
              borderRadius: "12px",
              color: "white",
            }}
          >
            <Title
              level={4}
              style={{ color: "white", margin: 0, opacity: 0.8 }}
            >
              <InboxOutlined /> Tổng quan hệ thống
            </Title>
            <Divider
              style={{ background: "rgba(255,255,255,0.1)", margin: "16px 0" }}
            />
            <Row>
              <Col span={12}>
                <Statistic
                  title={
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>
                      Mã hàng
                    </span>
                  }
                  value={totalItems}
                  valueStyle={{ color: "#fff" }}
                  prefix={<AppstoreOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>
                      Tổng tồn
                    </span>
                  }
                  value={totalStock}
                  valueStyle={{ color: "#52c41a" }}
                  prefix={<ArrowUpOutlined />}
                />
              </Col>
            </Row>
          </div>
        </Col>
        <Col xs={24} lg={16}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              height: "100%",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Row gutter={16} style={{ width: "100%" }} align="middle">
              <Col span={12}>
                <Title level={2} style={{ margin: 0, color: "#002766" }}>
                  WOOD ERP
                </Title>
                <Text type="secondary">
                  Quản lý nhập xuất kho chi tiết lô hàng
                </Text>
              </Col>
              <Col span={12} style={{ textAlign: "right" }}>
                <Space size="middle">
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setModalType("IMPORT");
                      setIsModalOpen(true);
                      form.resetFields();
                    }}
                    style={{
                      background: "#389e0d",
                      borderColor: "#389e0d",
                      height: "50px",
                      borderRadius: "8px",
                      fontWeight: 600,
                    }}
                  >
                    NHẬP LÔ MỚI
                  </Button>
                  <Button
                    danger
                    size="large"
                    icon={<ExportOutlined />}
                    onClick={() => {
                      setModalType("EXPORT");
                      setIsModalOpen(true);
                      form.resetFields();
                    }}
                    style={{
                      height: "50px",
                      borderRadius: "8px",
                      fontWeight: 600,
                    }}
                  >
                    XUẤT GIAO HÀNG
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* SEARCH BAR */}
      <Card
        bordered={false}
        style={{
          marginBottom: 24,
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        }}
      >
        <Input
          placeholder="Tìm kiếm nhanh sản phẩm hoặc mã lệnh sản xuất..."
          prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
          size="large"
          variant="filled"
          style={{ borderRadius: 8 }}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </Card>

      {/* TABS CHÍNH */}
      <Card
        bordered={false}
        bodyStyle={{ padding: 0 }}
        style={{
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        }}
      >
        <Tabs
          type="line"
          size="large"
          tabBarStyle={{ background: "#fff", padding: "0 24px", margin: 0 }}
          items={[
            {
              key: "stock",
              label: <strong>KHO HÀNG CHI TIẾT</strong>,
              children: (
                <div style={{ padding: "16px 24px 24px" }}>
                  <Tabs defaultActiveKey="ALL" items={inventoryTabs} />
                </div>
              ),
            },
            {
              key: "history",
              label: <strong>LỊCH SỬ BIẾN ĐỘNG</strong>,
              children: (
                <div style={{ padding: "24px" }}>
                  <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Khách hàng" style={{ marginBottom: 0 }}>
                        <Select
                          allowClear
                          value={historyFilterCustomer}
                          placeholder="Chọn công ty"
                          onChange={(val) => setHistoryFilterCustomer(val)}
                        >
                          {customerListInStock.map((name) => (
                            <Option key={name} value={name}>
                              {name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Mã chứng từ" style={{ marginBottom: 0 }}>
                        <Input
                          placeholder="Tìm theo mã chứng từ..."
                          value={historyFilterOrderCode}
                          onChange={(e) =>
                            setHistoryFilterOrderCode(e.target.value)
                          }
                          prefix={<SearchOutlined />}
                          allowClear
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item label="Thời gian" style={{ marginBottom: 0 }}>
                        <DatePicker.RangePicker
                          style={{ width: "100%" }}
                          value={historyFilterDateRange}
                          onChange={(val) => setHistoryFilterDateRange(val)}
                          allowClear
                        />
                      </Form.Item>
                    </Col>
                    <Col
                      xs={24}
                      md={2}
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button
                        onClick={() => {
                          setHistoryFilterCustomer(null);
                          setHistoryFilterOrderCode("");
                          setHistoryFilterDateRange(null);
                        }}
                      >
                        Xóa lọc
                      </Button>
                    </Col>
                  </Row>
                  <Table
                    dataSource={filteredTransactions}
                    rowKey="id"
                    columns={[
                      {
                        title: "Thời gian",
                        dataIndex: "createdAt",
                        width: 180,
                      },
                      {
                        title: "Loại hình",
                        dataIndex: "type",
                        render: (t) => (
                          <Tag
                            icon={
                              t === "IMPORT" ? (
                                <ArrowUpOutlined />
                              ) : (
                                <ArrowDownOutlined />
                              )
                            }
                            color={t === "IMPORT" ? "green" : "red"}
                            style={{ padding: "2px 10px", borderRadius: "4px" }}
                          >
                            {t === "IMPORT" ? "NHẬP KHO" : "XUẤT KHO"}
                          </Tag>
                        ),
                      },
                      { title: "Khách hàng", dataIndex: "customerName" },
                      {
                        title: "Sản phẩm",
                        render: (_, r) => <Text strong>{r.productName}</Text>,
                      },
                      {
                        title: "Số lượng",
                        align: "right",
                        render: (_, r) => (
                          <Text
                            strong
                            style={{
                              color:
                                r.type === "IMPORT" ? "#389e0d" : "#cf1322",
                            }}
                          >
                            {r.type === "IMPORT" ? "+" : "-"}
                            {r.quantity} {r.unit}
                          </Text>
                        ),
                      },
                      {
                        title: "Chứng từ",
                        dataIndex: "orderCode",
                        render: (t) => <Tag>{t}</Tag>,
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* MODAL CẤU TRÚC LẠI CHO ĐẸP */}
      <Modal
        title={
          <div style={{ fontSize: "20px", paddingBottom: "10px" }}>
            {modalType === "IMPORT" ? (
              <>
                <PlusOutlined style={{ color: "#52c41a" }} /> Nhập lô hàng mới
              </>
            ) : modalType === "EDIT" ? (
              <>
                <EditOutlined style={{ color: "#faad14" }} /> Cập nhật kiện hàng
              </>
            ) : (
              <>
                <ExportOutlined style={{ color: "#ff4d4f" }} /> Lệnh xuất kho
                giao hàng
              </>
            )}
          </div>
        }
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        width={modalType === "IMPORT" ? 1100 : 650}
        okText="Xác nhận lưu"
        cancelText="Đóng"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ items: [{}] }}
          style={{ marginTop: 20 }}
        >
          {modalType === "IMPORT" && (
            <>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="customerName"
                    label={<strong>Tên khách hàng</strong>}
                    rules={[{ required: true }]}
                  >
                    <Select
                      mode="tags"
                      placeholder="Chọn khách hàng hoặc gõ tên mới"
                      size="large"
                    >
                      {customers.map((c) => (
                        <Option key={c.id} value={c.name}>
                          {c.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="orderCode"
                    label={<strong>Mã lệnh sản xuất / PO</strong>}
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="Nhập mã chứng từ..." size="large" />
                  </Form.Item>
                </Col>
              </Row>
              <Divider
                orientation="left"
                style={{ fontSize: "14px", color: "#8c8c8c" }}
              >
                Danh sách sản phẩm trong lô
              </Divider>
              <Form.List name="items">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row
                        key={key}
                        gutter={12}
                        align="bottom"
                        style={{
                          background: "#f9f9f9",
                          padding: "20px",
                          marginBottom: 16,
                          borderRadius: 8,
                          border: "1px solid #f0f0f0",
                        }}
                      >
                        <Col span={5}>
                          <Form.Item
                            {...restField}
                            name={[name, "productCode"]}
                            label="Mã SP"
                            rules={[{ required: true }]}
                          >
                            <Input placeholder="Mã..." />
                          </Form.Item>
                        </Col>
                        <Col span={7}>
                          <Form.Item
                            {...restField}
                            name={[name, "productName"]}
                            label="Tên sản phẩm"
                            rules={[{ required: true }]}
                          >
                            <Input placeholder="Tên gỗ, quy cách..." />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item
                            {...restField}
                            name={[name, "quantity"]}
                            label="SL"
                            rules={[{ required: true }]}
                          >
                            <InputNumber min={1} style={{ width: "100%" }} />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item
                            {...restField}
                            name={[name, "unit"]}
                            label="ĐVT"
                          >
                            <Input placeholder="Tấm/Cái" />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            {...restField}
                            name={[name, "note"]}
                            label="Ghi chú"
                          >
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col span={1}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                            style={{ marginBottom: 24 }}
                          />
                        </Col>
                      </Row>
                    ))}
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                      style={{ height: 45, background: "#fff" }}
                    >
                      Thêm dòng sản phẩm mới
                    </Button>
                  </>
                )}
              </Form.List>
            </>
          )}

          {modalType === "EXPORT" && (
            <div style={{ padding: "10px" }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="exportCustomerName"
                    label={<strong>1. Chọn Khách hàng xuất hàng</strong>}
                    rules={[
                      { required: true, message: "Vui lòng chọn khách hàng" },
                    ]}
                  >
                    <Select
                      placeholder="Chọn khách hàng..."
                      size="large"
                      onChange={(val) => setSelectedExportCustomer(val)} // Cập nhật state để lọc hàng
                    >
                      {/* Lấy danh sách tên khách hàng duy nhất đang có hàng trong kho */}
                      {[...new Set(inventory.map((i) => i.customerName))].map(
                        (name) => (
                          <Option key={name} value={name}>
                            {name}
                          </Option>
                        ),
                      )}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="exportOrderCode"
                    label={<strong>2. Số Phiếu Xuất / Lệnh Giao</strong>}
                    rules={[{ required: true }]}
                  >
                    <Input
                      placeholder="Ví dụ: PX001, GIAOHANG..."
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider
                orientation="left"
                style={{ color: "#8c8c8c", fontSize: "13px" }}
              >
                3. Danh sách sản phẩm xuất kho
              </Divider>

              <Form.List name="exportItems" initialValue={[{}]}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row
                        key={key}
                        gutter={12}
                        align="bottom"
                        style={{
                          background: "#fff7e6",
                          padding: "15px",
                          marginBottom: "12px",
                          borderRadius: "8px",
                          border: "1px solid #ffe7ba",
                        }}
                      >
                        <Col span={12}>
                          <Form.Item
                            {...restField}
                            name={[name, "inventoryId"]}
                            label="Chọn kiện hàng trong kho"
                            rules={[{ required: true, message: "Chọn hàng" }]}
                          >
                            <Select
                              placeholder="Chọn sản phẩm - PO..."
                              disabled={!selectedExportCustomer}
                              showSearch
                              optionFilterProp="children"
                            >
                              {inventory
                                .filter(
                                  (i) =>
                                    i.customerName === selectedExportCustomer &&
                                    i.available > 0,
                                )
                                .map((i) => (
                                  <Option key={i.id} value={i.id}>
                                    {i.productName} | PO: {i.orderCode} (Tồn:{" "}
                                    {i.available} {i.unit})
                                  </Option>
                                ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item
                            {...restField}
                            name={[name, "quantity"]}
                            label="SL Xuất"
                            rules={[{ required: true, message: "Nhập SL" }]}
                          >
                            <InputNumber
                              min={1}
                              style={{ width: "100%" }}
                              placeholder="Số lượng"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            name={[name, "note"]}
                            label="Ghi chú dòng"
                          >
                            <Input placeholder="Ghi chú..." />
                          </Form.Item>
                        </Col>
                        <Col span={2}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                            style={{ marginBottom: "5px" }}
                            disabled={fields.length === 1}
                          />
                        </Col>
                      </Row>
                    ))}
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                      disabled={!selectedExportCustomer}
                      style={{ height: "40px", marginTop: "10px" }}
                    >
                      Thêm sản phẩm khác của khách hàng này
                    </Button>
                  </>
                )}
              </Form.List>
            </div>
          )}

          {modalType === "EDIT" && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="productCode" label="Mã sản phẩm">
                  <Input size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="productName" label="Tên sản phẩm">
                  <Input size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="orderCode" label="Mã PO">
                  <Input size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="available" label="Điều chỉnh tồn">
                  <InputNumber style={{ width: "100%" }} size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="unit" label="ĐVT">
                  <Input size="large" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="note" label="Ghi chú">
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default WoodInventoryUltimate;
