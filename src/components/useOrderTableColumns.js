import { useMemo } from "react";
import {
  Tag,
  Typography,
  InputNumber,
  Button,
  Popover,
  List,
  Flex,
  Tooltip,
} from "antd";
import { HistoryOutlined, ClockCircleOutlined, SyncOutlined } from "@ant-design/icons";
import {
  getNextProductionStep,
  getProductionTeamLabel,
} from "../utils/productionSteps";

const { Text } = Typography;

export function useOrderTableColumns(
  handleUpdateGroupRecord,
  handleUpdateRecord,
) {
  return useMemo(
    () => (fbKey, orderData, order) => {
      const STEPS_CONFIG = [
        { id: "phoi", label: "PHÔI" },
        { id: "dinhHinh", label: "ĐỊNH HÌNH" },
        { id: "lapRap", label: "LẮP RÁP" },
        { id: "nham", label: "NHÁM" },
        { id: "son", label: "SƠN" },
        { id: "dongGoi", label: "ĐÓNG GÓI" },
      ];

      const visibleSteps = STEPS_CONFIG.map((s) => s.id);

      const rawList = orderData?.chiTiet || orderData?.items || [];
      const listData = [...rawList].sort((a, b) => {
        const groupA = a.groupName?.trim() || "";
        const groupB = b.groupName?.trim() || "";
        if (!groupA && !groupB) return 0;
        if (!groupA) return 1;
        if (!groupB) return -1;
        return groupA.localeCompare(groupB);
      });

      const getGroupRowSpan = (record) => {
        const groupName = record.groupName?.trim();
        if (!groupName) return { rowSpan: 1 };

        const currentIndex = listData.findIndex((i) => i.key === record.key);
        const firstIndex = listData.findIndex(
          (i) => i.groupName && i.groupName.trim() === groupName
        );

        if (currentIndex === firstIndex) {
          const count = listData.filter(
            (i) => i.groupName && i.groupName.trim() === groupName
          ).length;
          return { rowSpan: count };
        }
        return { rowSpan: 0 };
      };

      const baseCols = [
        {
          title: "CHI TIẾT",
          dataIndex: "name",
          width: 120,
          fixed: "left",
          render: (text, record) => (
            <Flex vertical gap={0} align="start">
              <Text strong style={{ color: "#1890ff", lineHeight: "1.2" }}>
                {text}
              </Text>
              <Popover
                content={
                  <List
                    size="small"
                    dataSource={record.lichSu || []}
                    renderItem={(i) => (
                      <List.Item>
                        <Text type="secondary">{i.ngay}</Text>:
                        <Tag color={i.sl > 0 ? "green" : "red"}>
                          {i.sl > 0 ? `+${i.sl}` : i.sl}
                        </Tag>
                        <b>{i.to}</b>
                      </List.Item>
                    )}
                  />
                }
                title="Nhật ký sản xuất"
                trigger="click"
              >
                <Button
                  type="link"
                  size="small"
                  icon={<HistoryOutlined />}
                  style={{ padding: 0, fontSize: "11px", height: "20px" }}
                >
                  Lịch sử
                </Button>
              </Popover>
            </Flex>
          ),
        },
        {
          title: "CẦN (CÁI)",
          dataIndex: "can",
          align: "center",
          width: 80,
          render: (can) => (
            <Tag color="blue" style={{ fontWeight: "bold" }}>
              {can} cái
            </Tag>
          ),
        },
        {
          title: "CỤM (BỘ PHẬN)",
          dataIndex: "groupName",
          width: 130,
          align: "center",
          onCell: (record) => getGroupRowSpan(record),
          render: (val) =>
            val ? (
              <Tag color="orange" style={{ fontWeight: "bold" }}>
                {val.toUpperCase()}
              </Tag>
            ) : (
              <Text type="secondary">-</Text>
            ),
        },
        {
          title: "CẦN (BỘ)",
          align: "center",
          width: 80,
          onCell: (record) => getGroupRowSpan(record),
          render: (_, record) =>
            record.groupName && record.groupName.trim() !== "" ? (
              <Tag color="purple" style={{ fontWeight: "bold", margin: 0 }}>
                {record.soBoCum || 0} bộ
              </Tag>
            ) : (
              <Text type="secondary">-</Text>
            ),
        },
      ];

      return [
        ...baseCols,
        ...visibleSteps.map((step) => ({
          title: step.toUpperCase(),
          align: "center",
          width: 120,
          onCell: (record) => {
            if (["lapRap", "nham", "son"].includes(step) && record.groupName) {
              return getGroupRowSpan(record);
            }
            return { rowSpan: 1 };
          },
          render: (_, record) => {
            const isSkipped = record.skipSteps?.includes(step);
            if (isSkipped)
              return (
                <Tag color="default" style={{ opacity: 0.5, fontSize: "10px" }}>
                  BỎ QUA
                </Tag>
              );

            const isGroupStep = ["lapRap", "nham", "son"].includes(step);

            const targetNeed =
              isGroupStep && record.groupName
                ? Number(record.soBoCum) || 0
                : Number(record.can) || 0;

            // 1. Số lượng ĐÃ ĐƯỢC TỔ SAU XÁC NHẬN (Tiến độ thực tế chính thức)
            const confirmedVal = Number(record.tienDo?.[step]) || 0;

            // 2. Số lượng ĐANG TREO KIỂM ĐỊNH (Tổ A vừa nhập)
            const pendingVal = record.choKiemDinh?.[step] !== undefined
              ? Number(record.choKiemDinh[step])
              : null;

            // 3. Số lượng đã gửi, đang chờ tổ kế tiếp xác nhận
            const nextTeam = getNextProductionStep(step, record.skipSteps || []);
            const waitingConfirmVal = Number(record.waitingConfirm?.[nextTeam]) || 0;
            const displayedVal = pendingVal > 0 ? pendingVal : null;

            // Số lượng còn thiếu dựa trên TIẾN ĐỘ CHÍNH THỨC (Chưa tính số đang treo)
            const remaining = targetNeed - confirmedVal;

            return (
              <div style={{ padding: "2px" }}>
                {isGroupStep && record.groupName && (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#d46b08",
                      background: "#fff7e6",
                      border: "1px solid #ffd591",
                      borderRadius: "4px",
                      padding: "0 4px",
                      marginBottom: "4px",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {record.groupName.toUpperCase()}
                  </div>
                )}

                {/* Ô Nhập số lượng khai báo */}
                <InputNumber
                  min={0}
                  value={displayedVal}
                  placeholder="Nhập thêm SL"
                  onBlur={(e) => {
                    const rawValue = String(e.target.value ?? "").replace(/\./g, "");
                    const newVal = rawValue === "" ? 0 : Number(rawValue);

                    if (newVal !== (pendingVal || 0)) {
                      if (record.groupName && isGroupStep) {
                        handleUpdateGroupRecord(fbKey, record.groupName, step, newVal);
                      } else {
                        handleUpdateRecord(fbKey, record.key, step, newVal);
                      }
                    }
                  }}
                  style={{
                    width: "100%",
                    fontWeight: "bold",
                    borderColor: pendingVal > 0 ? "#fa8c16" : undefined,
                    background: pendingVal > 0 ? "#fffbe6" : "#ffffff",
                  }}
                />

                {/* Hiển thị các Trạng Thái Treo & Tiến Độ */}
                <div style={{ marginTop: "4px", textAlign: "center", display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div
                    style={{
                      alignSelf: "center",
                      padding: "3px 8px",
                      borderRadius: "5px",
                      background: "#e6f4ff",
                      border: "1px solid #1677ff",
                      color: "#0958d9",
                      fontSize: "13px",
                      fontWeight: 800,
                      lineHeight: 1.4,
                    }}
                  >
                    ĐÃ XÁC NHẬN:{" "}
                    <span style={{ fontSize: "15px", fontWeight: 900 }}>
                      {confirmedVal}/{targetNeed}
                    </span>
                  </div>

                  {/* Trạng thái 1: Vừa nhập số lượng, đang treo chờ Bàn giao */}
                  {pendingVal > 0 && (
                    <Tooltip title={`${getProductionTeamLabel(step)} đã khai báo số lượng này, chưa qua kiểm định / bàn giao`}>
                      <Tag color="warning" icon={<SyncOutlined spin />} style={{ fontSize: "10px", margin: 0 }}>
                        Treo KĐ: {pendingVal}
                      </Tag>
                    </Tooltip>
                  )}

                  {/* Trạng thái 2: Đã bàn giao, chờ tổ kế tiếp xác nhận */}
                  {waitingConfirmVal > 0 && (
                    <Tooltip title={`Đã bàn giao sang ${getProductionTeamLabel(nextTeam)}, chờ xác nhận`}>
                      <Tag color="volcano" icon={<ClockCircleOutlined />} style={{ fontSize: "10px", margin: 0 }}>
                        Đang chờ {getProductionTeamLabel(nextTeam)} nhận: {waitingConfirmVal}
                      </Tag>
                    </Tooltip>
                  )}

                  {/* Trạng thái 3: Hiển thị ĐÃ XÁC NHẬN ĐỦ hoặc Số lượng CHƯA ĐỦ */}
                  {remaining <= 0 && confirmedVal > 0 ? (
                    <Tag color="success" style={{ fontSize: "10px", margin: 0 }}>
                      ĐÃ XÁC NHẬN ĐỦ
                    </Tag>
                  ) : remaining > 0 ? (
                    <Text type="danger" style={{ fontSize: "10px", fontWeight: "bold" }}>
                      Thiếu: {remaining} {isGroupStep && record.groupName ? "bộ" : "cái"}
                    </Text>
                  ) : null}

                </div>
              </div>
            );
          },
        })),
      ];
    },
    [handleUpdateGroupRecord, handleUpdateRecord],
  );
}