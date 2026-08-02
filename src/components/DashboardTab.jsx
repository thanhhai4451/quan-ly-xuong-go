import React, { useState, useMemo, useEffect } from 'react';
import { 
  Row, Col, Card, Progress, Tag, Typography, Input, Select, Button, Space, 
  Drawer, DatePicker // ⚡ Đã thêm DatePicker
} from 'antd';
import { 
  SyncOutlined, WarningOutlined, InboxOutlined, RiseOutlined, 
  FallOutlined, CalendarOutlined,
  FullscreenOutlined, FullscreenExitOutlined, FileExcelOutlined, PrinterOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import * as XLSX from 'xlsx';

import { calculateOrderProgress, calculateStepsProgress } from '../utils/progress';
import { calculateAdvancedMetrics } from '../utils/dashboard';
import DashboardCharts from './DashboardCharts';

dayjs.extend(customParseFormat);
const { Text, Title } = Typography;

// 1. Hàm tính tiến độ giữ nguyên
const getItemProgress = (item) => {
  if (!item) return 0;

  const packingProgress = calculateOrderProgress(item);
  const stepsProgress = calculateStepsProgress(item);

  if (stepsProgress > 0 || packingProgress > 0) {
    return Math.round((stepsProgress + packingProgress) / 2);
  }

  const directPercent = 
    item.tienDoCongDoan ?? 
    item.tienDo ?? 
    item.percent ?? 
    item.tiendo ?? 
    item.progress ?? 
    item.tienDoDongGoi ?? 
    item.phantram;

  if (directPercent !== undefined && directPercent !== null && directPercent !== '') {
    const parsed = Number(directPercent);
    if (!isNaN(parsed)) return Math.min(100, Math.max(0, Math.round(parsed)));
  }

  let totalTarget = 0;
  let totalDone = 0;

  const listItems = [
    ...(Array.isArray(item.chiTiet) ? item.chiTiet : []),
    ...(Array.isArray(item.congDoan) ? item.congDoan : []),
    ...(Array.isArray(item.chiTietCongDoan) ? item.chiTietCongDoan : []),
    ...(Array.isArray(item.dongGoi) ? item.dongGoi : (item.dongGoi && typeof item.dongGoi === 'object' ? [item.dongGoi] : []))
  ];

  listItems.forEach(ct => {
    const target = Number(ct.soLuong || ct.canLam || ct.soLuongCan || ct.tongSoLuong || ct.canDongGoi || ct.can || ct.soBoCum || 0);
    const done = Number(ct.daLam || ct.hoanThanh || ct.soLuongHoanThanh || ct.daDongGoi || 0);
    if (target > 0) {
      totalTarget += target;
      totalDone += Math.min(done, target);
    }
  });

  if (totalTarget > 0) {
    return Math.round((totalDone / totalTarget) * 100);
  }

  return 0;
};

const DashboardTab = ({ orders = [], khoDu = {} }) => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState(null); // ⚡ State lưu khoảng ngày lọc
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedOrderGroup, setSelectedOrderGroup] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto Refresh Timer
  useEffect(() => {
    if (refreshInterval > 0) {
      const timer = setInterval(() => {
        // Trigger re-render / reload nhẹ
      }, refreshInterval * 1000);
      return () => clearInterval(timer);
    }
  }, [refreshInterval]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Xuất Excel nhanh
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(orders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DonHang");
    XLSX.writeFile(wb, `Bao_Cao_Xuong_Go_${dayjs().format('DDMMYYYY')}.xlsx`);
  };

  // Logic gom nhóm đơn trùng Mã Đơn Hàng
  const groupedOrders = useMemo(() => {
    const map = {};

    orders.forEach(order => {
      const code = order.maDon || order.maDonHang || order.tenSP || 'KHAC';
      
      if (!map[code]) {
        map[code] = {
          code,
          khachHang: order.khachHang || order.tenKhachHang || order.khach || 'Khách lẻ',
          ngayGiao: order.ngayGiao,
          items: [],
          daGiao: true
        };
      }

      map[code].items.push(order);
      if (!order.daGiao) {
        map[code].daGiao = false;
      }

      if (order.ngayGiao && !map[code].ngayGiao) {
        map[code].ngayGiao = order.ngayGiao;
      }
    });

    return Object.values(map).map(group => {
      const itemProgresses = group.items.map(getItemProgress);
      const avgProgress = itemProgresses.length 
        ? Math.round(itemProgresses.reduce((a, b) => a + b, 0) / itemProgresses.length)
        : 0;

      return {
        ...group,
        percent: avgProgress
      };
    });
  }, [orders]);

  // 1. Lọc các nhóm đơn hàng theo Search Text & Status Filter
  const filteredGroupedOrders = useMemo(() => {
    return groupedOrders.filter(group => {
      const matchSearch = 
        group.code.toLowerCase().includes(searchText.toLowerCase()) ||
        group.khachHang.toLowerCase().includes(searchText.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'PRODUCING') return !group.daGiao && group.percent < 100;
      if (statusFilter === 'PENDING') return !group.daGiao && group.percent >= 100;
      if (statusFilter === 'COMPLETED') return group.daGiao;
      if (statusFilter === 'OVERDUE') {
        if (group.daGiao || group.percent >= 100 || !group.ngayGiao) return false;
        const dueDate = dayjs(group.ngayGiao, ["DD/MM/YYYY", "YYYY-MM-DD", "DD/MM"]);
        return dueDate.isValid() && dueDate.isBefore(dayjs(), "day");
      }

      return true;
    });
  }, [groupedOrders, searchText, statusFilter]);

  // 2. LỌC MẢNG GỐC: Tìm tất cả đơn tương ứng với các nhóm vừa lọc ở trên
  const filteredRawOrders = useMemo(() => {
    const validCodes = new Set(filteredGroupedOrders.map(g => g.code));
    return orders.filter(order => {
      const code = order.maDon || order.maDonHang || order.tenSP || 'KHAC';
      return validCodes.has(code);
    });
  }, [orders, filteredGroupedOrders]);

  // 3. ĐẨY ĐƠN ĐÃ LỌC VÀO METRICS
  const metrics = useMemo(() => {
    const raw = calculateAdvancedMetrics(filteredRawOrders, khoDu);
    const totalOrders = filteredGroupedOrders.length;
    const completed = filteredGroupedOrders.filter(o => o.daGiao).length;
    const inProduction = filteredGroupedOrders.filter(o => !o.daGiao && o.percent < 100).length;
    const pendingDelivery = filteredGroupedOrders.filter(o => !o.daGiao && o.percent >= 100).length;
    const overdue = filteredGroupedOrders.filter(o => {
      if (o.daGiao || o.percent >= 100 || !o.ngayGiao) return false;
      const dueDate = dayjs(o.ngayGiao, ["DD/MM/YYYY", "YYYY-MM-DD", "DD/MM"]);
      return dueDate.isValid() && dueDate.isBefore(dayjs(), "day");
    }).length;

    const onTimeRate = totalOrders > 0 ? Math.round(((totalOrders - overdue) / totalOrders) * 100) : 100;

    return {
      ...raw,
      totalOrders,
      completed,
      inProduction,
      pendingDelivery,
      overdue,
      onTimeRate
    };
  }, [filteredGroupedOrders, filteredRawOrders, khoDu]);

  // Dữ liệu cho các Biểu đồ (Đã tích hợp Lọc từ ngày -> đến ngày)
  const chartData = useMemo(() => {
    let dailyOutput = Object.keys(metrics.dailyMap || {})
      .map(dateStr => ({
        ngay: dateStr,
        sanLuong: metrics.dailyMap[dateStr] || 0
      }))
      .sort((a, b) => {
        const dateA = dayjs(a.ngay, 'DD/MM/YYYY');
        const dateB = dayjs(b.ngay, 'DD/MM/YYYY');
        return dateA.valueOf() - dateB.valueOf();
      });

    // ⚡ LỌC MẢNG NGÀY THEO RANGE PICKER NẾU CÓ CHỌN
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');

      dailyOutput = dailyOutput.filter(item => {
        const itemDate = dayjs(item.ngay, 'DD/MM/YYYY');
        return itemDate.isValid() && 
               (itemDate.isAfter(startDate) || itemDate.isSame(startDate, 'day')) && 
               (itemDate.isBefore(endDate) || itemDate.isSame(endDate, 'day'));
      });
    }

    const topTeams = Object.keys(metrics.teamPerformance || {}).map(t => ({
      to: t,
      sanLuong: metrics.teamPerformance[t].sanLuong
    })).slice(0, 5);

    const topCustomers = Object.keys(metrics.customerMap || {}).map(c => ({
      khachHang: c,
      soDon: metrics.customerMap[c]
    })).slice(0, 5);

    return {
      dailyOutput,
      dailyProgress: dailyOutput.map(d => {
        const calculatedProgress = Math.round(d.sanLuong / 10); 
        const safeProgress = Math.max(0, Math.min(100, calculatedProgress));

        return {
          ngay: d.ngay,
          tienDo: isNaN(safeProgress) ? 0 : safeProgress
        };
      }),
      topTeams,
      topCustomers,
      statusPie: [
        { name: 'Đang SX', value: metrics.inProduction },
        { name: 'Chờ Giao', value: metrics.pendingDelivery },
        { name: 'Hoàn Thành', value: metrics.completed },
        { name: 'Trễ Hạn', value: metrics.overdue },
      ],
      onTimePie: [
        { name: 'Đúng Hạn', value: metrics.totalOrders - metrics.overdue },
        { name: 'Trễ Hạn', value: metrics.overdue },
      ],
      teamRadar: [
        { subject: 'Mộc', A: 88 },
        { subject: 'Sơn', A: 92 },
        { subject: 'Lắp Ráp', A: 85 },
        { subject: 'Đóng Gói', A: 95 },
        { subject: 'Kho', A: 90 },
      ]
    };
  }, [metrics, dateRange]); // ⚡ Thêm dateRange vào Dependency Array

  const dangLamList = filteredGroupedOrders.filter(o => !o.daGiao && o.percent < 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px' }}>
      
      {/* Control Bar */}
      <Card bordered={false} bodyStyle={{ padding: '12px 16px' }} style={{ borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space wrap>
            <Input.Search
              placeholder="Tìm mã đơn, tên khách..."
              style={{ width: 200 }}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={val => setStatusFilter(val)}
              style={{ width: 160 }}
              options={[
                { value: 'ALL', label: 'Tất cả đơn hàng' },
                { value: 'PRODUCING', label: 'Đang sản xuất' },
                { value: 'PENDING', label: 'Chờ giao hàng' },
                { value: 'COMPLETED', label: 'Đã hoàn thành' },
                { value: 'OVERDUE', label: 'Cảnh báo trễ hạn' },
              ]}
            />

            {/* ⚡ BỘ CHỌN KHOẢNG NGÀY CHO BIỂU ĐỒ */}
            <DatePicker.RangePicker 
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              onChange={(dates) => setDateRange(dates)}
              style={{ width: 250 }}
              allowClear
            />

            <Select
              value={refreshInterval}
              onChange={val => setRefreshInterval(val)}
              style={{ width: 130 }}
              options={[
                { value: 0, label: 'Tắt làm mới' },
                { value: 30, label: 'Làm mới 30s' },
                { value: 60, label: 'Làm mới 1m' },
              ]}
            />
          </Space>

          <Space wrap>
            <Button icon={<FileExcelOutlined />} onClick={exportExcel}>Xuất Excel</Button>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>In Báo Cáo</Button>
            <Button 
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} 
              onClick={toggleFullscreen} 
            />
          </Space>
        </div>
      </Card>

      {/* KPI Cards Grid */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false} bodyStyle={{ padding: '14px' }} style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>Sản lượng hôm nay</Text>
            <Title level={3} style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#1677ff' }}>
              {metrics.outputToday.toLocaleString()}
            </Title>
            <div style={{ marginTop: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Tag color={metrics.percentChange >= 0 ? "success" : "error"} style={{ margin: 0 }}>
                {metrics.percentChange >= 0 ? <RiseOutlined /> : <FallOutlined />} {metrics.percentChange}%
              </Tag>
              <Text type="secondary" style={{ fontSize: '11px' }}>vs hôm qua</Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false} bodyStyle={{ padding: '14px' }} style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>Sản lượng hôm qua</Text>
            <Title level={3} style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#595959' }}>
              {metrics.outputYesterday.toLocaleString()}
            </Title>
            <Text type="secondary" style={{ fontSize: '11px', marginTop: '8px', display: 'block' }}>Ghi nhận từ các tổ</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false} bodyStyle={{ padding: '14px' }} style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>Đang sản xuất</Text>
                <Title level={3} style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#faad14' }}>
                  {metrics.inProduction}
                </Title>
              </div>
              <SyncOutlined spin style={{ fontSize: '18px', color: '#faad14', background: '#fffbe6', padding: '8px', borderRadius: '50%', height: 'fit-content' }} />
            </div>
            <Text type="secondary" style={{ fontSize: '11px', marginTop: '8px', display: 'block' }}>TỔNG ĐƠN: {metrics.totalOrders}</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false} bodyStyle={{ padding: '14px' }} style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>Cảnh báo trễ hạn</Text>
                <Title level={3} style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#ff4d4f' }}>
                  {metrics.overdue}
                </Title>
              </div>
              <WarningOutlined style={{ fontSize: '18px', color: '#ff4d4f', background: '#fff1f0', padding: '8px', borderRadius: '50%', height: 'fit-content' }} />
            </div>
            <Text type="danger" style={{ fontSize: '11px', marginTop: '8px', display: 'block' }}>Tỷ lệ SLA đúng hạn: {metrics.onTimeRate}%</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false} bodyStyle={{ padding: '14px' }} style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>Mặt hàng dư kho</Text>
                <Title level={3} style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#52c41a' }}>
                  {metrics.totalStockCount}
                </Title>
              </div>
              <InboxOutlined style={{ fontSize: '18px', color: '#52c41a', background: '#f6ffed', padding: '8px', borderRadius: '50%', height: 'fit-content' }} />
            </div>
            <Text type="secondary" style={{ fontSize: '11px', marginTop: '8px', display: 'block' }}>Mặt hàng sẵn có</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false} bodyStyle={{ padding: '14px' }} style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>Dự báo ngày mai</Text>
                <Title level={3} style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#722ed1' }}>
                  {metrics.forecastedTomorrow.toLocaleString()}
                </Title>
              </div>
              <RiseOutlined style={{ fontSize: '18px', color: '#722ed1', background: '#f9f0ff', padding: '8px', borderRadius: '50%', height: 'fit-content' }} />
            </div>
            <Text type="secondary" style={{ fontSize: '11px', marginTop: '8px', display: 'block' }}>Ước tính thuật toán AI</Text>
          </Card>
        </Col>
      </Row>

      {/* Hệ thống Biểu đồ */}
      <DashboardCharts chartData={chartData} />

      {/* Grid Đơn Hàng Đang Sản Xuất */}
      <Card 
        title={<span style={{ fontWeight: 600 }}>⚡ Tiến Độ Đơn Hàng Đang Sản Xuất</span>} 
        bordered={false} 
        style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}
      >
        <Row gutter={[16, 16]}>
          {dangLamList.map((orderGroup) => {
            const percent = orderGroup.percent;
            const code = orderGroup.code;
            const customerName = orderGroup.khachHang;
            
            let isOverdue = false;
            if (orderGroup.ngayGiao) {
              const dueDate = dayjs(orderGroup.ngayGiao, ["DD/MM/YYYY", "YYYY-MM-DD", "DD/MM"]);
              isOverdue = dueDate.isValid() && dueDate.isBefore(dayjs(), "day");
            }

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={code}>
                <div 
                  onClick={() => {
                    setSelectedOrderGroup(orderGroup);
                    setDrawerOpen(true);
                  }}
                  style={{ 
                    border: '1px solid #f0f0f0', 
                    padding: '14px 16px', 
                    borderRadius: '10px', 
                    background: '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <Text bold style={{ fontSize: '15px', color: '#1677ff', fontWeight: 700 }}>
                      {code} <Text type="secondary" style={{ fontSize: '12px', fontWeight: 400 }}>({orderGroup.items.length} sp)</Text>
                    </Text>
                    {orderGroup.ngayGiao && (
                      <Tag icon={<CalendarOutlined />} color={isOverdue ? 'error' : 'blue'} style={{ margin: 0 }}>
                        {orderGroup.ngayGiao}
                      </Tag>
                    )}
                  </div>
                  
                  <div style={{ marginBottom: '10px', fontSize: '12px', color: '#595959' }}>
                    Khách: <Text style={{ fontWeight: 500 }}>{customerName}</Text>
                  </div>

                  <Progress 
                    percent={percent} 
                    status={percent >= 100 ? "success" : "active"}
                    strokeColor={percent >= 100 ? "#52c41a" : "#1677ff"}
                  />
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* Drawer Chi tiết khi Click Card */}
      <Drawer
        title={`Chi tiết đơn hàng: ${selectedOrderGroup?.code}`}
        width={500}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedOrderGroup && (
          <div>
            <p><strong>Khách hàng:</strong> {selectedOrderGroup.khachHang}</p>
            <p><strong>Ngày giao:</strong> {selectedOrderGroup.ngayGiao || 'Chưa xếp'}</p>
            <p><strong>Tiến độ trung bình:</strong> {selectedOrderGroup.percent}%</p>
            <Title level={5} style={{ marginTop: 20 }}>Danh sách sản phẩm trong đơn ({selectedOrderGroup.items.length})</Title>
            {selectedOrderGroup.items.map((it, idx) => (
              <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                <p><strong>Sản phẩm:</strong> {it.tenSP || it.ten || selectedOrderGroup.code}</p>
                <p><strong>Số lượng:</strong> {it.soLuong || 1}</p>
                <Progress percent={getItemProgress(it)} size="small" />
              </Card>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default DashboardTab;