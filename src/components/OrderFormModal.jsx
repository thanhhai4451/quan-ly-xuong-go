import React from "react";
import { Modal } from "antd";
import OrderForm from "../OrderForm";

const OrderFormModal = ({
  editingOrder,
  copiedOrder,
  isModalOpen,
  onClose,
  form,
  onFinish,
  onCopy,
}) => {
  return (
    <div className="app-container">
      <Modal
        title={
          editingOrder
            ? `CHỈNH SỬA: ${editingOrder.tenSP}`
            : "TẠO ĐƠN HÀNG MỚI"
        }
        open={isModalOpen}
        onCancel={onClose}
        footer={null}
        width={1000}
        destroyOnHidden
      >
        <OrderForm
          form={form}
          initialData={editingOrder || copiedOrder}
          onFinish={onFinish}
          isEditing={!!editingOrder}
          onCopy={onCopy}
        />
      </Modal>
    </div>
  );
};

export default OrderFormModal;
