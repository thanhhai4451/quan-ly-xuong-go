import React from "react";
import {
  Input,
  Select,
  DatePicker,
  Space,
  Button,
  Tabs,
  Badge,
} from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import OrderList from "./OrderList";

const { RangePicker } = DatePicker;

const ProductionManagementTab = ({
  pageSize,
  onSearchTextChange,
  onDateRangeChange,
  customerOptions,
  customerFilter,
  onCustomerFilterChange,
  bgOptions,
  bgFilter,
  onBgFilterChange,
  isAdmin,
  onOpenCreateModal,
  orderCategorized,
  page1,
  setPage1,
  page2,
  setPage2,
  page3,
  setPage3,
  tableColumns,
  onEditOrder,
  onDeliverOrder,
  onUpdateDongGoi,
  onDeleteOrder
}) => {
  return (
    <div
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "0 0 12px 12px",
      }}
    >
      <Space wrap style={{ marginBottom: 20 }}>
        <Input
          placeholder="Tìm tên sản phẩm..."
          prefix={<SearchOutlined />}
          style={{ width: 250 }}
          onChange={(e) => onSearchTextChange(e.target.value)}
          allowClear
        />
        <RangePicker format="DD/MM/YYYY" onChange={onDateRangeChange} />
        <Select
          showSearch
          allowClear
          placeholder="Tên khách hàng..."
          style={{ width: 220 }}
          options={customerOptions}
          value={customerFilter || undefined}
          onChange={(val) => onCustomerFilterChange(val || "")}
        />
        <Select
          showSearch
          allowClear
          placeholder="Danh mục BG (VD: BG_031)"
          style={{ width: 220 }}
          options={bgOptions}
          value={bgFilter || undefined}
          onChange={(val) => onBgFilterChange(val || "")}
        />
        {isAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onOpenCreateModal}
          >
            TẠO ĐƠN MỚI
          </Button>
        )}
      </Space>

      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: "1",
            label: (
              <Badge count={orderCategorized.dangLam.length} offset={[10, 0]}>
                <b>ĐANG SẢN XUẤT</b>
              </Badge>
            ),
            children: (
              <OrderList
                data={orderCategorized.dangLam}
                isDeliveredTab={false}
                page={page1}
                setPage={setPage1}
                pageSize={pageSize}
                tableColumns={tableColumns}
                isAdmin={isAdmin}
                onEditOrder={onEditOrder}
                onDeliverOrder={onDeliverOrder}
                  onUpdateDongGoi={onUpdateDongGoi}
                  onDeleteOrder={onDeleteOrder}
              />
            ),
          },
          {
            key: "2",
            label: (
              <Badge
                count={orderCategorized.choGiao.length}
                offset={[10, 0]}
                color="#52c41a"
              >
                <b>XONG (CHỜ GIAO)</b>
              </Badge>
            ),
            children: (
              <OrderList
                data={orderCategorized.choGiao}
                isDeliveredTab={false}
                page={page2}
                setPage={setPage2}
                pageSize={pageSize}
                tableColumns={tableColumns}
                isAdmin={isAdmin}
                onEditOrder={onEditOrder}
                onDeliverOrder={onDeliverOrder}
                  onUpdateDongGoi={onUpdateDongGoi}
                  onDeleteOrder={onDeleteOrder}
              />
            ),
          },
          {
            key: "3",
            label: (
              <Badge
                count={orderCategorized.daGiao.length}
                offset={[10, 0]}
                color="#8c8c8c"
              >
                <b>ĐÃ GIAO</b>
              </Badge>
            ),
            children: (
              <OrderList
                data={orderCategorized.daGiao}
                isDeliveredTab={true}
                page={page3}
                setPage={setPage3}
                pageSize={pageSize}
                tableColumns={tableColumns}
                isAdmin={isAdmin}
                onEditOrder={onEditOrder}
                onDeliverOrder={onDeliverOrder} 
                 onUpdateDongGoi={onUpdateDongGoi}
                 onDeleteOrder={onDeleteOrder}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

export default ProductionManagementTab;
