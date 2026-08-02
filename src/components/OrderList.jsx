import React, { useMemo, useState, useEffect } from "react";
import {
  Collapse,
  Progress,
  Table,
  Card,
  Empty,
  Space,
  Image,
  InputNumber,
  Button,
  Tag,
  Typography,
  Tooltip,
} from "antd";
import {
  CaretRightOutlined,
  CalendarOutlined,
  EditOutlined,
  DeleteOutlined,
  RightOutlined,
  InboxOutlined,
  CheckSquareOutlined,
  ExportOutlined,
  UserOutlined,
} from "@ant-design/icons";

import {
  calculateOrderProgress,
  calculateStepsProgress,
} from "../utils/progress";

const { Text } = Typography;

// --- COMPONENT CON TÁCH BIỆT ĐỂ GIỮ FOCUS KHI GÕ SỐ ---
const QuantityInput = ({ initialValue, onSave, style, min = 0, disabled = false }) => {
  const [val, setVal] = useState(initialValue ?? 0);

  useEffect(() => {
    setVal(initialValue ?? 0);
  }, [initialValue]);

  const handleBlur = () => {
    const finalVal = val === null || val === undefined ? 0 : Number(val);
    if (finalVal !== initialValue) {
      onSave?.(finalVal);
    }
  };

  return (
    <InputNumber
      min={min}
      value={val}
      disabled={disabled}
      onChange={(newVal) => setVal(newVal)}
      onBlur={handleBlur}
      style={{
        borderRadius: "6px",
        textAlign: "center",
        fontWeight: 600,
        ...style,
      }}
    />
  );
};

// Bóc tách ID ảnh từ Google Drive
const getDirectImageUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  if (!url.includes("drive.google.com")) return url;

  const match =
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    url.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=s500`;
  }
  return url;
};

const OrderList = ({
  data = [],
  tableColumns,
  isAdmin,
  onEditOrder,
  onDeleteOrder,
  onUpdateDongGoi,
  isDeliveredTab,
  onDeliverOrder,
}) => {
  // Gom nhóm dữ liệu theo mã đơn / báo giá
  const groupedData = useMemo(() => {
    if (!data || data.length === 0) return {};

    return data.reduce((acc, order) => {
      const bgCode = order.maDon || order.bgCode || "MÃ KHÁC";
      if (!acc[bgCode]) {
        acc[bgCode] = {
          bgCode: bgCode,
          tenKhachHang: order.tenKhachHang || order.tenKH || "BLUEZON GLOBAL",
          ngayGiao: order.ngayGiao || "",
          orders: [],
        };
      }
      acc[bgCode].orders.push(order);
      return acc;
    }, {});
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Card style={{ borderRadius: 12, marginTop: 16, textAlign: "center", borderColor: "#f0f0f0" }}>
        <Empty description="Chưa có dữ liệu đơn hàng" style={{ padding: "32px 0" }} />
      </Card>
    );
  }

  // Tier 1: Danh sách các Card Mã Đơn / Báo Giá
  const masterCollapseItems = Object.values(groupedData).map((group) => {
    const totalSp = group.orders.length;

    const avgProgress = Math.round(
      group.orders.reduce((sum, o) => {
        const cd = calculateStepsProgress(o);
        const dg = calculateOrderProgress(o);
        return sum + Math.round((cd + dg) / 2);
      }, 0) / (totalSp || 1)
    );

    return {
      key: group.bgCode,
      label: (
        <div style={{ padding: "4px 0" }}>
          {/* Header nhóm đơn */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <Space size="middle" align="center">
              <Text style={{ color: "#0958d9", fontWeight: 700, fontSize: "16px" }}>
                {group.bgCode}
              </Text>
              <Tag color="blue" style={{ borderRadius: "10px", fontWeight: 500 }}>
                {totalSp} sản phẩm
              </Tag>
              <Space size={4} style={{ color: "#595959", fontSize: "13px" }}>
                <UserOutlined style={{ color: "#8c8c8c" }} />
                <Text type="secondary">Khách:</Text>
                <Text bold>{group.tenKhachHang}</Text>
              </Space>
            </Space>

            {group.ngayGiao && (
              <Tag icon={<CalendarOutlined />} color="error" style={{ borderRadius: "6px", padding: "2px 8px", fontSize: "12px" }}>
                Hạn giao: {group.ngayGiao}
              </Tag>
            )}
          </div>

          {/* Thanh progress tổng của Mã Đơn */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "10px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Progress
              percent={avgProgress}
              strokeColor={{ "0%": "#108ee9", "100%": "#52c41a" }}
              trailColor="#f5f5f5"
              strokeWidth={8}
              style={{ flex: 1, margin: 0 }}
            />
          </div>
        </div>
      ),
      children: (
        <div style={{ padding: "4px 0" }}>
          <Collapse
            bordered={false}
            expandIconPosition="end"
            expandIcon={({ isActive }) => (
              <RightOutlined rotate={isActive ? 90 : 0} style={{ color: "#bfbfbf", fontSize: "12px" }} />
            )}
            items={group.orders.map((order, index) => {
              const dongGoiProg = calculateOrderProgress(order);
              const congDoanProg = calculateStepsProgress(order);
              const finalImgUrl = getDirectImageUrl(order.hinhAnh);

              const itemKey = String(order.fbKey || order.id || order.key || `order-${index}`);

              return {
                key: itemKey,
                style: {
                  marginBottom: 12,
                  background: "#ffffff",
                  borderRadius: "10px",
                  border: "1px solid #e8e8e8",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                  overflow: "hidden",
                },
                label: (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      width: "100%",
                      paddingRight: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Hình ảnh + Tên sản phẩm */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "240px", flex: 1 }}>
                      {finalImgUrl ? (
                        <Image
                          src={finalImgUrl}
                          width={48}
                          height={48}
                          style={{
                            borderRadius: "8px",
                            objectFit: "cover",
                            border: "1px solid #f0f0f0",
                          }}
                          preview={false}
                          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                        />
                      ) : (
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            background: "#f5f5f5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid #f0f0f0",
                          }}
                        >
                          <InboxOutlined style={{ fontSize: 20, color: "#bfbfbf" }} />
                        </div>
                      )}

                      <div>
                        <Text bold style={{ fontSize: "14px", textTransform: "uppercase", color: "#1f1f1f", display: "block" }}>
                          {order.tenSP}
                        </Text>
                        {order.ngayGiao && (
                          <Text type="danger" style={{ fontSize: "11px" }}>
                            <CalendarOutlined /> {order.ngayGiao}
                          </Text>
                        )}
                      </div>
                    </div>

                    {/* Tiến độ Công Đoạn & Đóng Gói */}
                    <div style={{ width: "200px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Text type="secondary" style={{ fontSize: "11px", width: "55px", textAlign: "right" }}>
                          Công đoạn:
                        </Text>
                        <Progress
                          percent={congDoanProg}
                          showInfo={false}
                          strokeColor="#1890ff"
                          trailColor="#f5f5f5"
                          strokeWidth={6}
                          style={{ flex: 1, margin: 0 }}
                        />
                        <Text style={{ fontSize: "11px", width: "32px", fontWeight: 600 }}>{congDoanProg}%</Text>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Text type="secondary" style={{ fontSize: "11px", width: "55px", textAlign: "right" }}>
                          Đóng gói:
                        </Text>
                        <Progress
                          percent={dongGoiProg}
                          showInfo={false}
                          strokeColor="#fa8c16"
                          trailColor="#f5f5f5"
                          strokeWidth={6}
                          style={{ flex: 1, margin: 0 }}
                        />
                        <Text style={{ fontSize: "11px", width: "32px", fontWeight: 600 }}>{dongGoiProg}%</Text>
                      </div>
                    </div>

                    {/* Nút thao tác ADMIN */}
                    <Space size="small" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && (
                        <>
                          <Tooltip title="Chỉnh sửa đơn">
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined style={{ color: "#595959" }} />}
                              onClick={() => onEditOrder?.(order)}
                            />
                          </Tooltip>
                          <Tooltip title="Xóa đơn">
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => onDeleteOrder?.(order)}
                            />
                          </Tooltip>
                          {!isDeliveredTab && dongGoiProg >= 100 && (
                            <Button
                              type="primary"
                              size="small"
                              style={{ background: "#52c41a", borderColor: "#52c41a", fontWeight: 600 }}
                              icon={<CheckSquareOutlined />}
                              onClick={() => onDeliverOrder?.(order.fbKey)}
                            >
                              GIAO HÀNG
                            </Button>
                          )}
                        </>
                      )}
                    </Space>
                  </div>
                ),
                children: (
                  <div style={{ padding: "12px", background: "#fafafa" }}>
                    {/* Bảng chi tiết sản phẩm */}
                    <Table
                      columns={
                        typeof tableColumns === "function"
                          ? tableColumns(itemKey, order, order)
                          : tableColumns
                      }
                      dataSource={order.chiTiet || []}
                      pagination={false}
                      size="small"
                      bordered
                      scroll={{ x: "max-content" }}
                      style={{ background: "#fff", borderRadius: "8px", overflow: "hidden", marginBottom: "12px" }}
                    />

                    {/* Toolbar Nhập / Kiểm tra Tiến Độ Đóng Gói */}
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #e8e8e8",
                        borderRadius: "8px",
                        padding: "10px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      <Space size="large" wrap>
                        <Space align="center">
                          <CheckSquareOutlined style={{ color: "#fa8c16", fontSize: "16px" }} />
                          <Text bold style={{ fontSize: "13px" }}>
                            ĐÓNG GÓI XONG:
                          </Text>
                          <QuantityInput
                            initialValue={order.soLuongDongGoi}
                            onSave={(val) =>
                              onUpdateDongGoi?.(order, "soLuongDongGoi", val)
                            }
                            style={{ width: "80px" }}
                          />
                          <Text type="secondary" style={{ fontSize: "13px" }}>
                            / Tổng bộ cần: <Text type="danger" bold>{order.tongSoBo || order.tongBoCan || 0}</Text>
                          </Text>
                        </Space>

                        <Space align="center">
                          <ExportOutlined style={{ color: "#1890ff", fontSize: "15px" }} />
                          <Text bold style={{ fontSize: "13px", color: "#595959" }}>
                            ĐÃ XUẤT:
                          </Text>
                          <QuantityInput
                            initialValue={order.soLuongDaXuat || 0}
                            disabled
                            style={{ width: "80px", background: "#f5f5f5" }}
                          />
                        </Space>

                        {order.deadlineDongGoi && (
                          <Tag color="volcano" style={{ borderRadius: "4px" }}>
                            Hạn xong ĐG: {order.deadlineDongGoi}
                          </Tag>
                        )}
                      </Space>

                      {/* Tiến độ hoàn thành Đóng gói dạng số % */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "140px" }}>
                        <Progress
                          percent={dongGoiProg}
                          showInfo={false}
                          strokeColor={dongGoiProg === 100 ? "#52c41a" : "#fa8c16"}
                          strokeWidth={8}
                          style={{ flex: 1, margin: 0 }}
                        />
                        <Text bold style={{ fontSize: "12px", color: dongGoiProg === 100 ? "#52c41a" : "#fa8c16" }}>
                          {dongGoiProg}%
                        </Text>
                      </div>
                    </div>
                  </div>
                ),
              };
            })}
          />
        </div>
      ),
    };
  });

  return (
    <div style={{ marginTop: "16px" }}>
      <Collapse
        bordered={false}
        expandIcon={({ isActive }) => (
          <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: "#0958d9" }} />
        )}
        items={masterCollapseItems.map((item) => ({
          ...item,
          style: {
            background: "#ffffff",
            borderRadius: "12px",
            marginBottom: "12px",
            border: "1px solid #e8e8e8",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            overflow: "hidden",
          },
        }))}
      />
    </div>
  );
};

export default OrderList;