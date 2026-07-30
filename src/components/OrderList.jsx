import React from "react";
import {
  Table,
  Tag,
  Progress,
  Typography,
  Collapse,
  InputNumber,
  Space,
  Button,
  Modal,
  message,
  Row,
  Col,
  Badge,
  Pagination,
  Image,
} from "antd";
import {
  DeleteOutlined,
  ClockCircleOutlined,
  CarryOutOutlined,
  EditOutlined,
  SendOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { ref, remove, update } from "firebase/database";
import { db } from "../firebase";
import { getDrivePreview } from "../utils/drive";
import {
  calculateOrderProgress,
  calculateStepsProgress,
} from "../utils/progress";

const { Text } = Typography;

const OrderList = ({
  data,
  isDeliveredTab = false,
  page,
  setPage,
  pageSize,
  tableColumns,
  isAdmin,
  onEditOrder,
  onDeliverOrder,
}) => {
  const processedData = data.map((order) => {
    const sortedChiTiet = [...(order.chiTiet || [])].sort((a, b) => {
      const groupA = a.groupName?.trim() || "ZZZZ";
      const groupB = b.groupName?.trim() || "ZZZZ";
      return groupA.localeCompare(groupB);
    });
    return { ...order, chiTiet: sortedChiTiet };
  });

  const collapseItems = processedData.map((order) => {
    const currentColumns = tableColumns(order.fbKey, order, order);
    const progress = calculateOrderProgress(order);
    const stepsProgress = calculateStepsProgress(order);
    const isDone = (order.soLuongDongGoi || 0) >= (order.tongSoBo || 1);
    const isPackingOverdue =
      order.deadlineDongGoi &&
      !isDone &&
      dayjs().isAfter(dayjs(order.deadlineDongGoi), "day");

    return {
      key: order.fbKey,
      label: (
        <Row align="middle" style={{ width: "95%" }}>
          <Col
            xs={24}
            sm={8}
            style={{ display: "flex", alignItems: "center" }}
          >
            <div
              style={{
                marginRight: 12,
                display: "flex",
                alignItems: "center",
              }}
            >
              {order.hinhAnh ? (
                <Image
                  width={70}
                  height={70}
                  src={getDrivePreview(order.hinhAnh)}
                  fallback="https://placehold.co/45x45?text=MAH"
                  style={{
                    borderRadius: 8,
                    objectFit: "cover",
                    border: "1px solid #f0f0f0",
                  }}
                  preview={{
                    cover: <EyeOutlined style={{ fontSize: 12 }} />,
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  style={{
                    width: 45,
                    height: 45,
                    borderRadius: 8,
                    background: "#f5f5f5",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    border: "1px solid #d9d9d9",
                  }}
                >
                  <PictureOutlined
                    style={{ color: "#bfbfbf", fontSize: 20 }}
                  />
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <Badge
                status={
                  order.daGiao
                    ? "default"
                    : progress >= 100
                      ? "success"
                      : dayjs(order.ngayGiao, "DD/MM/YYYY").isBefore(dayjs())
                        ? "error"
                        : "processing"
                }
              />
              <Text
                strong
                style={{
                  fontSize: "15px",
                  marginLeft: 8,
                  color: "#001529",
                  textTransform: "uppercase",
                }}
              >
                {order.tenSP}
              </Text>
              {order.daGiao && (
                <Tag color="default" style={{ marginLeft: 8 }}>
                  ĐÃ GIAO
                </Tag>
              )}
            </div>
          </Col>

          <Col xs={16} sm={10} style={{ padding: "0 20px" }}>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: "10px",
                    marginRight: "4px",
                    color: "#8c8c8c",
                  }}
                >
                  Đóng gói:
                </span>
                <Progress
                  percent={progress}
                  size="small"
                  status={order.daGiao ? "normal" : "active"}
                  strokeColor={
                    order.daGiao
                      ? "#d9d9d9"
                      : { "0%": "#108ee9", "100%": "#52c41a" }
                  }
                />
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: "10px",
                    marginRight: "4px",
                    color: "#8c8c8c",
                  }}
                >
                  Công đoạn:
                </span>
                <Progress
                  percent={stepsProgress}
                  size="small"
                  status={order.daGiao ? "normal" : "active"}
                  strokeColor={
                    order.daGiao
                      ? "#d9d9d9"
                      : { "0%": "#fa8c16", "100%": "#faad14" }
                  }
                />
              </div>
            </div>
          </Col>

          <Col xs={8} sm={6} style={{ textAlign: "right" }}>
            <Tag
              color={
                order.daGiao
                  ? "default"
                  : dayjs(order.ngayGiao, "DD/MM/YYYY").isBefore(dayjs())
                    ? "red"
                    : "blue"
              }
              icon={<ClockCircleOutlined />}
            >
              Giao: {order.ngayGiao}
            </Tag>
          </Col>
        </Row>
      ),
      extra: (
        <Space onClick={(e) => e.stopPropagation()}>
          {isAdmin && (
            <>
              {!order.daGiao && (
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => onEditOrder(order)}
                />
              )}
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() =>
                  Modal.confirm({
                    title: "Xoá đơn này?",
                    content: "Hành động này không thể hoàn tác!",
                    onOk: () => remove(ref(db, `orders/${order.fbKey}`)),
                  })
                }
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
          <div
            style={{
              marginTop: 15,
              padding: "15px",
              background: order.daGiao
                ? "#f5f5f5"
                : isPackingOverdue
                  ? "#fff1f0"
                  : "#f6ffed",
              borderRadius: "8px",
              border: `1px solid ${order.daGiao ? "#d9d9d9" : isPackingOverdue ? "#ffa39e" : "#b7eb8f"}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <Space size="large">
              <Text strong>
                <CarryOutOutlined /> ĐÓNG GÓI XONG (BỘ):
              </Text>
              <div style={{ textAlign: "center" }}>
                <InputNumber
                  min={0}
                  size="large"
                  style={{ width: 120 }}
                  value={order.soLuongDongGoi || 0}
                  onChange={(val) => {}}
                  onBlur={(e) => {
                    const newVal = Number(e.target.value) || 0;
                    if (newVal !== order.soLuongDongGoi) {
                      update(ref(db, `orders/${order.fbKey}`), {
                        soLuongDongGoi: newVal,
                      });
                      message.success("Đã cập nhật số lượng đóng gói!");
                    }
                  }}
                />
                {order.deadlineDongGoi && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: isPackingOverdue ? "red" : "#8c8c8c",
                      fontWeight: "bold",
                    }}
                  >
                    Hạn xong: {dayjs(order.deadlineDongGoi).format("DD/MM")}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <Text type="secondary">
                  / Tổng bộ cần:{" "}
                  <b style={{ color: "#f5222d", fontSize: "16px" }}>
                    {order.tongSoBo}
                  </b>
                </Text>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      marginBottom: 4,
                      fontSize: "12px",
                      color: "#595959",
                    }}
                  >
                    ĐÃ XUẤT
                  </div>
                  <InputNumber
                    min={0}
                    size="large"
                    style={{ width: 120 }}
                    value={order.soLuongDaXuat || 0}
                    onBlur={(e) => {
                      const newVal = Number(e.target.value) || 0;
                      if (newVal !== order.soLuongDaXuat) {
                        update(ref(db, `orders/${order.fbKey}`), {
                          soLuongDaXuat: newVal,
                        });
                        message.success("Đã cập nhật số lượng đã xuất!");
                      }
                    }}
                  />
                </div>
              </div>
            </Space>

            <Space>
              <div style={{ width: 150 }}>
                <Progress
                  percent={progress}
                  status={order.daGiao ? "normal" : "active"}
                  strokeColor={order.daGiao ? "#8c8c8c" : "#52c41a"}
                />
              </div>
              {progress >= 100 && !order.daGiao && (
                <Button
                  type="primary"
                  size="large"
                  icon={<SendOutlined />}
                  style={{ background: "#52c41a", borderColor: "#52c41a" }}
                  onClick={() => onDeliverOrder(order.fbKey)}
                >
                  HOÀN TẤT & GIAO HÀNG
                </Button>
              )}
              {order.daGiao && (
                <Text type="secondary">
                  <CheckCircleOutlined /> Đã giao lúc: {order.ngayThucTeGiao}
                </Text>
              )}
            </Space>
          </div>
        </>
      ),
      style: {
        background: "#fdfdfd",
        marginBottom: 12,
        borderRadius: 10,
        border: "1px solid #e8e8e8",
        overflow: "hidden",
      },
    };
  });

  const startIndex = (page - 1) * pageSize;
  const paginatedItems = collapseItems.slice(
    startIndex,
    startIndex + pageSize,
  );

  return (
    <>
      <Collapse
        accordion
        ghost
        expandIconPlacement="end"
        items={paginatedItems}
      />

      {collapseItems.length > pageSize && (
        <div
          style={{
            textAlign: "center",
            marginTop: "20px",
            paddingBottom: "30px",
          }}
        >
          <Pagination
            current={page}
            pageSize={pageSize}
            total={collapseItems.length}
            showSizeChanger={false}
            onChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      )}
    </>
  );
};

export default OrderList;
