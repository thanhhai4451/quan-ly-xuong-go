import { useMemo } from "react";
import {
  Tag,
  Typography,
  InputNumber,
  Button,
  Popover,
  List,
  Flex,
} from "antd";
import { HistoryOutlined } from "@ant-design/icons";

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

      // 1. TỰ ĐỘNG GOM CÁC CHI TIẾT CÙNG CỤM LẠI VỚI NHAU
      // Dù dữ liệu gốc nằm rải rác (1: Sàn trên, 2: Chân, 3: Sàn trên),
      // mảng sortedList này sẽ tự gom thành (Sàn trên, Sàn trên, Chân)
      const rawList = orderData?.chiTiet || orderData?.items || [];
      const listData = [...rawList].sort((a, b) => {
        const groupA = a.groupName?.trim() || "";
        const groupB = b.groupName?.trim() || "";
        if (!groupA && !groupB) return 0;
        if (!groupA) return 1;  // Không có cụm thì đẩy xuống dưới
        if (!groupB) return -1;
        return groupA.localeCompare(groupB);
      });

      // 2. HÀM TÍNH ROWSPAN CHUẨN XÁC SAU KHÍ ĐÃ GOM NHÓM TỰ ĐỘNG
      const getGroupRowSpan = (record) => {
        const groupName = record.groupName?.trim();
        if (!groupName) return { rowSpan: 1 };

        // Tìm index của record trong danh sách ĐÃ SẮP XẾP
        const currentIndex = listData.findIndex((i) => i.key === record.key);
        const firstIndex = listData.findIndex(
          (i) => i.groupName && i.groupName.trim() === groupName
        );

        // Chỉ dòng đầu tiên của Cụm mới hiển thị ô gộp (rowSpan = tổng số item trong Cụm)
        if (currentIndex === firstIndex) {
          const count = listData.filter(
            (i) => i.groupName && i.groupName.trim() === groupName
          ).length;
          return { rowSpan: count };
        }

        // Các dòng sau cùng Cụm thì ẩn ô đi
        return { rowSpan: 0 };
      };

      const baseCols = [
        {
          title: "CHI TIẾT",
          dataIndex: "name",
          width: 80,
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
          width: 150,
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
          width: 110,
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
            const stepsOrder = [
              "phoi",
              "dinhHinh",
              "lapRap",
              "nham",
              "son",
              "dongGoi",
            ];
            const stepLabels = {
              phoi: "PHÔI",
              dinhHinh: "ĐỊNH HÌNH",
              lapRap: "LẮP RÁP",
              nham: "NHÁM",
              son: "SƠN",
              dongGoi: "ĐÓNG GÓI",
            };

            const targetNeed =
              isGroupStep && record.groupName
                ? Number(record.soBoCum) || 0
                : Number(record.can) || 0;
            const val = Number(record.tienDo?.[step]) || 0;
            const remaining = targetNeed - val;

            const prevStep = stepsOrder
              .slice(0, stepsOrder.indexOf(step))
              .reverse()
              .find((s) => !(record.skipSteps || []).includes(s));

            const prevStepVal = prevStep
              ? isGroupStep && record.groupName
                ? listData
                    .filter((i) => i.groupName === record.groupName)
                    .reduce(
                      (acc, i) => acc + Number(i.tienDo?.[prevStep] || 0),
                      0,
                    )
                : Number(record.tienDo?.[prevStep] || 0)
              : 0;

            const canEdit = !prevStep || prevStepVal > 0;

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
                <InputNumber
                  min={0}
                  value={val}
                  disabled={!canEdit}
                  onBlur={(e) => {
                    if (!canEdit) return;
                    const rawValue = e.target.value.replace(/\./g, "");
                    const newVal = rawValue === "" ? 0 : Number(rawValue);
                    if (newVal !== val) {
                      if (record.groupName && isGroupStep)
                        handleUpdateGroupRecord(
                          fbKey,
                          record.groupName,
                          step,
                          newVal,
                        );
                      else handleUpdateRecord(fbKey, record.key, step, newVal);
                    }
                  }}
                  style={{
                    width: "100%",
                    fontWeight:
                      record.groupName && isGroupStep ? "bold" : "normal",
                    color: isGroupStep ? "#722ed1" : "#1890ff",
                  }}
                />
                {!canEdit && prevStep && (
                  <Text
                    type="secondary"
                    style={{ fontSize: "10px", marginTop: 4, display: "block" }}
                  >
                    Hoàn thành {stepLabels[prevStep]} trước khi nhập
                  </Text>
                )}
                <div style={{ marginTop: "4px", textAlign: "center" }}>
                  {remaining > 0 ? (
                    <Text
                      type="danger"
                      style={{ fontSize: "11px", fontWeight: "bold" }}
                    >
                      Thiếu: {remaining}{" "}
                      {isGroupStep && record.groupName ? "bộ" : "cái"}
                    </Text>
                  ) : remaining < 0 ? (
                    <Text
                      type="warning"
                      style={{ fontSize: "11px", fontWeight: "bold" }}
                    >
                      Thừa: {Math.abs(remaining)}
                    </Text>
                  ) : val > 0 ? (
                    <Tag color="success" style={{ fontSize: "10px" }}>
                      ĐỦ
                    </Tag>
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