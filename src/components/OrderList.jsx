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
import "./OrderList.css";

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
        fontSize: "15px",
        height: "36px",
        display: "flex",
        alignItems: "center",
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
        <Empty description="Chưa có dữ liệu đơn hàng" style={{ padding: "48px 0" }} />
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
        <div className="order-list__group-label">
          {/* Header nhóm đơn */}
          <div className="order-list__group-header">
            <div className="order-list__group-meta">
              <Text style={{ color: "#0958d9", fontWeight: 700, fontSize: "18px" }}>
                {group.bgCode}
              </Text>
              <Tag color="blue" style={{ borderRadius: "10px", fontWeight: 600, fontSize: "13px", padding: "2px 10px" }}>
                {totalSp} sản phẩm
              </Tag>
              <span className="order-list__customer" style={{ color: "#595959", fontSize: "14px" }}>
                <UserOutlined style={{ color: "#8c8c8c" }} />
                <Text type="secondary">Khách:</Text>
                <Text bold style={{ fontSize: "14px" }}>{group.tenKhachHang}</Text>
              </span>
            </div>

            {group.ngayGiao && (
              <Tag icon={<CalendarOutlined />} color="error" style={{ borderRadius: "6px", padding: "4px 10px", fontSize: "13px", fontWeight: 500 }}>
                Hạn giao: {group.ngayGiao}
              </Tag>
            )}
          </div>

          {/* Thanh progress tổng của Mã Đơn */}
          <div
            className="order-list__group-progress"
            onClick={(e) => e.stopPropagation()}
          >
            <Progress
              percent={avgProgress}
              strokeColor={{ "0%": "#108ee9", "100%": "#52c41a" }}
              trailColor="#f0f0f0"
              strokeWidth={12}
              style={{ flex: 1, margin: 0 }}
            />
          </div>
        </div>
      ),
      children: (
        <div className="order-list__group-children">
          <Collapse
            bordered={false}
            expandIconPosition="end"
            expandIcon={({ isActive }) => (
              <RightOutlined rotate={isActive ? 90 : 0} style={{ color: "#bfbfbf", fontSize: "14px" }} />
            )}
            items={group.orders.map((order, index) => {
              const dongGoiProg = calculateOrderProgress(order);
              const congDoanProg = calculateStepsProgress(order);
              const finalImgUrl = getDirectImageUrl(order.hinhAnh);

              const itemKey = String(order.fbKey || order.id || order.key || `order-${index}`);

              return {
                key: itemKey,
                style: {
                  marginBottom: 14,
                  background: "#ffffff",
                  borderRadius: "10px",
                  border: "1px solid #e8e8e8",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                  overflow: "hidden",
                },
                label: (
                  <div className="order-list__product-label">
                    {/* Hình ảnh + Tên sản phẩm */}
                    <div className="order-list__product-info">
                      {finalImgUrl ? (
                        <Image
                          src={finalImgUrl}
                          width={60}
                          height={60}
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
                            width: 60,
                            height: 60,
                            borderRadius: 8,
                            background: "#f5f5f5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid #f0f0f0",
                          }}
                        >
                          <InboxOutlined style={{ fontSize: 24, color: "#bfbfbf" }} />
                        </div>
                      )}

                      <div className="order-list__product-copy">
                        <Text bold className="order-list__product-name" style={{ fontSize: "16px", textTransform: "uppercase", color: "#1f1f1f" }}>
                          {order.tenSP}
                        </Text>
                        {order.ngayGiao && (
                          <Text type="danger" style={{ fontSize: "13px", fontWeight: 500 }}>
                            <CalendarOutlined /> {order.ngayGiao}
                          </Text>
                        )}
                      </div>
                    </div>

                    {/* Tiến độ Công Đoạn & Đóng Gói */}
                    <div className="order-list__product-progress">
                      <div className="order-list__progress-line">
                        <Text type="secondary" className="order-list__progress-label" style={{ fontSize: "13px", fontWeight: 500 }}>
                          Công đoạn:
                        </Text>
                        <Progress
                          percent={congDoanProg}
                          showInfo={false}
                          strokeColor="#1890ff"
                          trailColor="#f5f5f5"
                          strokeWidth={8}
                          style={{ flex: 1, margin: 0 }}
                        />
                        <Text className="order-list__progress-value" style={{ fontSize: "13px", fontWeight: 700 }}>{congDoanProg}%</Text>
                      </div>

                      <div className="order-list__progress-line">
                        <Text type="secondary" className="order-list__progress-label" style={{ fontSize: "13px", fontWeight: 500 }}>
                          Đóng gói:
                        </Text>
                        <Progress
                          percent={dongGoiProg}
                          showInfo={false}
                          strokeColor="#fa8c16"
                          trailColor="#f5f5f5"
                          strokeWidth={8}
                          style={{ flex: 1, margin: 0 }}
                        />
                        <Text className="order-list__progress-value" style={{ fontSize: "13px", fontWeight: 700 }}>{dongGoiProg}%</Text>
                      </div>
                    </div>

                    {/* Nút thao tác ADMIN */}
                    <Space className="order-list__product-actions" size="middle" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && (
                        <>
                          <Tooltip title="Chỉnh sửa đơn">
                            <Button
                              type="default"
                              size="middle"
                              icon={<EditOutlined style={{ color: "#595959" }} />}
                              onClick={() => onEditOrder?.(order)}
                            />
                          </Tooltip>
                          <Tooltip title="Xóa đơn">
                            <Button
                              type="default"
                              size="middle"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => onDeleteOrder?.(order)}
                            />
                          </Tooltip>
                          {!isDeliveredTab && dongGoiProg >= 100 && (
                            <Button
                              type="primary"
                              size="middle"
                              style={{ background: "#52c41a", borderColor: "#52c41a", fontWeight: 600, padding: "0 16px" }}
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
                  <div className="order-list__details">
                    {/* Bảng chi tiết sản phẩm */}
                    <Table
                      columns={
                        typeof tableColumns === "function"
                          ? tableColumns(itemKey, order, order)
                          : tableColumns
                      }
                      dataSource={order.chiTiet || []}
                      pagination={false}
                      size="middle"
                      bordered
                      scroll={{ x: "max-content" }}
                      className="order-list__details-table"
                    />

                    {/* Toolbar Nhập / Kiểm tra Tiến Độ Đóng Gói */}
                    <div className="order-list__packing">
                      <div className="order-list__packing-fields">
                        <div className="order-list__packing-field">
                          <CheckSquareOutlined style={{ color: "#fa8c16", fontSize: "18px" }} />
                          <Text bold style={{ fontSize: "14px" }}>
                            ĐÓNG GÓI XONG:
                          </Text>
                          <QuantityInput
                            initialValue={order.soLuongDongGoi}
                            onSave={(val) =>
                              onUpdateDongGoi?.(order, "soLuongDongGoi", val)
                            }
                            style={{ width: "90px" }}
                          />
                          <Text type="secondary" style={{ fontSize: "14px" }}>
                            / Tổng bộ cần: <Text type="danger" bold style={{ fontSize: "15px" }}>{order.tongSoBo || order.tongBoCan || 0}</Text>
                          </Text>
                        </div>

                        <div className="order-list__packing-field">
                          <ExportOutlined style={{ color: "#1890ff", fontSize: "18px" }} />
                          <Text bold style={{ fontSize: "14px", color: "#595959" }}>
                            ĐÃ XUẤT:
                          </Text>
                          <QuantityInput
                            initialValue={order.soLuongDaXuat || 0}
                            disabled
                            style={{ width: "90px", background: "#f5f5f5" }}
                          />
                        </div>

                        {order.deadlineDongGoi && (
                          <Tag color="volcano" style={{ borderRadius: "6px", padding: "4px 10px", fontSize: "13px" }}>
                            Hạn xong ĐG: {order.deadlineDongGoi}
                          </Tag>
                        )}
                      </div>

                      {/* Tiến độ hoàn thành Đóng gói dạng số % */}
                      <div className="order-list__packing-progress">
                        <Progress
                          percent={dongGoiProg}
                          showInfo={false}
                          strokeColor={dongGoiProg === 100 ? "#52c41a" : "#fa8c16"}
                          strokeWidth={10}
                          style={{ flex: 1, margin: 0 }}
                        />
                        <Text bold style={{ fontSize: "14px", color: dongGoiProg === 100 ? "#52c41a" : "#fa8c16" }}>
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
    <div className="order-list">
      <Collapse
        bordered={false}
        expandIcon={({ isActive }) => (
          <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: "#0958d9", fontSize: "16px" }} />
        )}
        items={masterCollapseItems.map((item) => ({
          ...item,
          style: {
            background: "#ffffff",
            borderRadius: "12px",
            marginBottom: "16px",
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