import React, { useEffect } from 'react';
import { Form, Row, Col, Input, InputNumber, DatePicker, Button, Card, Divider, Checkbox, Space, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const convertDriveLinkToImage = (url) => {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;

  const fileId = match[1];
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
};



const OrderForm = ({ form, initialData, onFinish, isEditing, onCopy }) => {
  const STEPS = [
    { id: 'phoi', label: 'Phôi' },
    { id: 'dinhHinh', label: 'Định hình' },
    { id: 'lapRap', label: 'Lắp ráp' },
    { id: 'nham', label: 'Nhám' },
    { id: 'son', label: 'Sơn' },
  ];

  useEffect(() => {
    if (initialData) {
      let formData = { ...initialData };
      if (initialData.chiTiet) {
        // Logic dành cho CHỈNH SỬA từ DB: Chuyển string từ DB về object dayjs cho DatePicker
        formData.deadlineDongGoi = initialData.deadlineDongGoi ? dayjs(initialData.deadlineDongGoi) : null;
        formData.ngayGiao = initialData.ngayGiao ? dayjs(initialData.ngayGiao, 'DD/MM/YYYY') : null;
        formData.items = initialData.chiTiet?.map(it => ({
          ...it,
          qty: it.can, // Map 'can' từ DB sang 'qty' của form
          deadlines: Object.keys(it.deadlines || {}).reduce((acc, step) => {
            acc[step] = it.deadlines[step] ? dayjs(it.deadlines[step]) : null;
            return acc;
          }, {})
        }));
      } else if (initialData.items) {
        // Logic dành cho sao chép: dữ liệu đã ở dạng form, nhưng cần chuyển dates về dayjs
        formData.items = initialData.items.map(it => ({
          ...it,
          deadlines: Object.keys(it.deadlines || {}).reduce((acc, step) => {
            acc[step] = it.deadlines[step] ? dayjs(it.deadlines[step]) : null;
            return acc;
          }, {})
        }));
        if (formData.deadlineDongGoi) formData.deadlineDongGoi = dayjs(formData.deadlineDongGoi);
        if (formData.ngayGiao) formData.ngayGiao = dayjs(formData.ngayGiao);
      }
      form.setFieldsValue(formData);
    } else {
      form.resetFields();
      form.setFieldsValue({ items: [{}] }); // Tạo sẵn 1 dòng khi mở form mới
    }
  }, [initialData, form]);

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item
        label={<b>LINK ẢNH SẢN PHẨM (GOOGLE DRIVE)</b>}
        name="hinhAnh"
        help="Dán link chia sẻ 'Bất kỳ ai có liên kết' từ Drive vào đây"
      >
        <Input
          prefix={<LinkOutlined />}
          placeholder="https://drive.google.com/file/d/xxx/view..."
          allowClear
        />
      </Form.Item>

      <Form.Item shouldUpdate>
  {({ getFieldValue }) => {
    const link = getFieldValue('hinhAnh');
    const imgSrc = convertDriveLinkToImage(link);

    return imgSrc ? (
      <div style={{ marginTop: 12 }}>
        <img
          src={imgSrc}
          alt="Ảnh sản phẩm"
          style={{
            maxWidth: '100%',
            maxHeight: 300,
            border: '1px solid #ddd',
            borderRadius: 8,
            objectFit: 'contain'
          }}
        />
      </div>
    ) : null;
  }}
</Form.Item>

      <Row gutter={16}>
        <Col span={10}>
          <Form.Item name="tenSP" label="Tên sản phẩm" rules={[{ required: true }]}>
            <Input placeholder="VÍ DỤ: TỦ GỖ SỒI" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="tongSoBo" label="Số bộ" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={5}>
          <Form.Item name="deadlineDongGoi" label="Hạn đóng gói" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
        <Col span={5}>
          <Form.Item name="ngayGiao" label="Ngày giao khách" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
      </Row>

      <Divider titlePlacement="left">CHI TIẾT LINH KIỆN</Divider>

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restField }) => (
              <Card size="small" key={key} style={{ marginBottom: 15, borderLeft: '4px solid #1890ff' }}>
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item {...restField} name={[name, 'name']} label="Tên linh kiện" rules={[{ required: true }]}>
                      <Input placeholder="Tên chi tiết" />
                    </Form.Item>
                  </Col>
                  <Col span={3}>
                    <Form.Item {...restField} name={[name, 'qty']} label="SL/Bộ" rules={[{ required: true }]}>
                      <InputNumber min={1} placeholder="Số cái" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={7}>
                    <Form.Item {...restField} name={[name, 'groupName']} label="Thuộc Cụm (Nếu có)">
                      <Input placeholder="Ví dụ: Khung, Hộc kéo..." />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item {...restField} name={[name, 'soBoCum']} label="SL Cụm">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={2} style={{ textAlign: 'right', paddingTop: 30 }}>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item {...restField} name={[name, 'skipSteps']} label="Bỏ qua tổ">
                      <Checkbox.Group options={STEPS.map(s => ({ label: s.label, value: s.id }))} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Hạn hoàn thành từng tổ:</Text>
                    <Space wrap style={{ marginTop: 8 }}>
                      {STEPS.map(step => (
                        <Form.Item key={step.id} {...restField} name={[name, 'deadlines', step.id]} noStyle>
                          <DatePicker size="small" placeholder={step.label} style={{ width: 100 }} format="DD/MM" />
                        </Form.Item>
                      ))}
                    </Space>
                  </Col>
                </Row>
              </Card>
            ))}
            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Thêm linh kiện</Button>
          </>
        )}
      </Form.List>

      <div style={{ textAlign: 'right', marginTop: 24 }}>
        <Space>
          <Button onClick={() => form.resetFields()}>Làm mới</Button>
          {isEditing && <Button onClick={() => onCopy(form.getFieldsValue())}>Sao chép đơn hàng</Button>}
          <Button type="primary" htmlType="submit" size="large">LƯU ĐƠN HÀNG</Button>
        </Space>
      </div>



    </Form>
    



  );
};

export default OrderForm;