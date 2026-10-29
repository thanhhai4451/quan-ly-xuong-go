import React from 'react';
import { Button, Input } from 'antd';
import { FilePdfOutlined, PlusOutlined, SearchOutlined, SwapOutlined } from '@ant-design/icons';

const InventoryToolbar = ({
  searchText,
  onSearchChange,
  filterLowStock,
  onToggleLowStock,
  selectedCount,
  userRole,
  onMultiExport,
  onBulkTransfer,
  onAddMaterial,
  onResetBulkTransfer
}) => (
  <div className="inventory-toolbar">
    <div className="inventory-toolbar__filters">
      <Input
        value={searchText}
        placeholder="Tìm mã hoặc tên vật tư..."
        prefix={<SearchOutlined />}
        className="inventory-toolbar__search"
        style={{ borderRadius: '6px' }}
        onChange={onSearchChange}
        allowClear
      />
      <Button type={filterLowStock ? 'primary' : 'default'} danger={filterLowStock} onClick={onToggleLowStock}>
        {filterLowStock ? 'Hiển Thị Tất Cả' : 'Chỉ Xem Cảnh Báo Hết'}
      </Button>
      {selectedCount > 0 && (
        <div className="inventory-toolbar__bulk-actions">
          <Button type="primary" style={{ backgroundColor: '#722ed1' }} icon={<FilePdfOutlined />} onClick={onMultiExport}>
            Xuất Kho Hàng Loạt ({selectedCount})
          </Button>
          {userRole !== 'STAFF' && (
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => {
                onResetBulkTransfer();
                onBulkTransfer();
              }}
            >
              Chuyển Nhóm ({selectedCount})
            </Button>
          )}
        </div>
      )}
    </div>
    {userRole !== 'STAFF' && (
      <Button className="inventory-toolbar__add" type="primary" icon={<PlusOutlined />} size="large" onClick={onAddMaterial}>
        Thêm Vật Tư Mới
      </Button>
    )}
  </div>
);

export default InventoryToolbar;
