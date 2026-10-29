import React from 'react';
import { Form, Input, InputNumber, Modal, Row, Col, Select, Typography } from 'antd';
import { HomeOutlined, UserOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text, Title } = Typography;

const InventoryModals = ({
  warehouses,
  form,
  exportForm,
  multiExportForm,
  addStockForm,
  transferForm,
  bulkTransferForm,
  isModalOpen,
  setIsModalOpen,
  editingItem,
  handleSaveMaterial,
  isAddStockOpen,
  setIsAddStockOpen,
  addStockItem,
  handleAddStock,
  isTransferOpen,
  setIsTransferOpen,
  transferItem,
  handleTransferMaterial,
  isBulkTransferOpen,
  setIsBulkTransferOpen,
  selectedItems,
  handleBulkTransfer,
  isMultiExportOpen,
  setIsMultiExportOpen,
  handleMultiExport
}) => (
  <>
    <Modal
      className="inventory-modal"
      title={editingItem ? 'CẬP NHẬT VẬT TƯ' : 'KHỞI TẠO VẬT TƯ MỚI'}
      open={isModalOpen}
      onOk={() => form.submit()}
      onCancel={() => setIsModalOpen(false)}
      okText={editingItem ? 'Lưu Cập Nhật' : 'Tạo Mới'}
      cancelText="Hủy"
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={handleSaveMaterial} style={{ marginTop: 16 }}>
        <Form.Item
          name="warehouseId"
          label="Lưu vào Kho"
          rules={[{ required: true, message: 'Vui lòng chọn kho lưu trữ!' }]}
        >
          <Select placeholder="Chọn kho cần lưu vật tư" size="large">
            {warehouses.map(warehouse => (
              <Option key={warehouse.id} value={warehouse.id}>
                <HomeOutlined style={{ marginRight: 8 }} />
                {warehouse.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

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
                {['Tấm', 'Cái', 'Bịch', 'Kg', 'Lít', 'Viên', 'Bộ', 'Cuộn', 'Thùng', 'Hộp', 'Thanh', 'Mét', 'M3'].map(unit => (
                  <Option key={unit} value={unit}>{unit}</Option>
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

    <Modal
      className="inventory-modal"
      title="BỔ SUNG TỒN KHO"
      open={isAddStockOpen}
      onCancel={() => setIsAddStockOpen(false)}
      onOk={() => addStockForm.submit()}
    >
      <Form form={addStockForm} layout="vertical" onFinish={handleAddStock} style={{ marginTop: 16 }}>
        <Text strong>{addStockItem?.name} ({addStockItem?.code})</Text>
        <Form.Item
          name="qty"
          label="Số lượng nhập thêm"
          rules={[{ required: true, type: 'number', min: 1 }]}
          style={{ marginTop: 16 }}
        >
          <InputNumber style={{ width: '100%' }} size="large" min={1} />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      className="inventory-modal"
      title="CHUYỂN VẬT TƯ SANG NHÓM KHÁC"
      open={isTransferOpen}
      onCancel={() => setIsTransferOpen(false)}
      onOk={() => transferForm.submit()}
      okText="Xác nhận chuyển"
      cancelText="Hủy"
    >
      <Form form={transferForm} layout="vertical" onFinish={handleTransferMaterial} style={{ marginTop: 16 }}>
        <Text strong>{transferItem?.name} ({transferItem?.code})</Text>
        <Form.Item
          name="targetWarehouseId"
          label="Nhóm đích"
          rules={[{ required: true, message: 'Vui lòng chọn nhóm đích!' }]}
          style={{ marginTop: 16 }}
        >
          <Select placeholder="Chọn nhóm muốn chuyển sang" size="large">
            {warehouses
              .filter(warehouse => warehouse.id !== (transferItem?.warehouseId || 'MAIN'))
              .map(warehouse => (
                <Option key={warehouse.id} value={warehouse.id}>
                  <HomeOutlined style={{ marginRight: 8 }} />
                  {warehouse.name}
                </Option>
              ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      className="inventory-modal"
      title={`CHUYỂN HÀNG LOẠT (${selectedItems.length} VẬT TƯ)`}
      open={isBulkTransferOpen}
      onCancel={() => setIsBulkTransferOpen(false)}
      onOk={() => bulkTransferForm.submit()}
      okText="Xác nhận chuyển"
      cancelText="Hủy"
    >
      <Form form={bulkTransferForm} layout="vertical" onFinish={handleBulkTransfer} style={{ marginTop: 16 }}>
        <Text type="secondary">
          Tất cả vật tư đã chọn sẽ được chuyển sang cùng một nhóm và giữ nguyên số lượng tồn.
        </Text>
        <Form.Item
          name="targetWarehouseId"
          label="Nhóm đích"
          rules={[{ required: true, message: 'Vui lòng chọn nhóm đích!' }]}
          style={{ marginTop: 16 }}
        >
          <Select placeholder="Chọn nhóm muốn chuyển sang" size="large">
            {warehouses
              .filter(warehouse => !selectedItems.some(item => (item.warehouseId || 'MAIN') === warehouse.id))
              .map(warehouse => (
                <Option key={warehouse.id} value={warehouse.id}>
                  <HomeOutlined style={{ marginRight: 8 }} />
                  {warehouse.name}
                </Option>
              ))}
          </Select>
        </Form.Item>
        <div className="inventory-modal__list" style={{ maxHeight: 180, background: '#fafafa' }}>
          {selectedItems.map(item => (
            <div key={item.key} className="inventory-modal__list-row">
              <Text>{item.name} ({item.code})</Text>
              <Text type="secondary">{item.stock} {item.unit}</Text>
            </div>
          ))}
        </div>
      </Form>
    </Modal>

    <Modal
      className="inventory-modal"
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
                <Text strong>{item.name}</Text><br />
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
  </>
);

export default InventoryModals;
