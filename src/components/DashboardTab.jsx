import React, { useState, useMemo, useEffect } from 'react';
import { 
  Row, Col, Card, Progress, Tag, Typography, Input, Select, Button, Space, 
  Drawer, DatePicker 
} from 'antd';
import { 
  SyncOutlined, WarningOutlined, InboxOutlined, RiseOutlined, 
  FallOutlined, CalendarOutlined,
  FullscreenOutlined, FullscreenExitOutlined, FileExcelOutlined, PrinterOutlined,
  UserOutlined
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
  const [dateRange, setDateRange] = useState(null);
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

  // Dữ liệu cho các Biểu đồ
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

    const PRODUCTION_ORDER = ['PHOI', 'DINHHINH', 'LAPRAP', 'NHAM', 'SON', 'DONGGOI'];
    const normalizeKey = (str = '') => {
      return str
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '');
    };

    const topTeams = Object.keys(metrics.teamPerformance || {})
      .map(t => ({
        to: t,
        sanLuong: metrics.teamPerformance[t].sanLuong
      }))
      .sort((a, b) => {
        const keyA = normalizeKey(a.to);
        const keyB = normalizeKey(b.to);

        const indexA = PRODUCTION_ORDER.findIndex(order => keyA.includes(order));
        const indexB = PRODUCTION_ORDER.findIndex(order => keyB.includes(order));

        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
      });

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
        { subject: 'Phôi', A: 88 },
        { subject: 'Định hình', A: 90 },
        { subject: 'Lắp ráp', A: 85 },
        { subject: 'Nhám', A: 80 },
        { subject: 'Sơn', A: 92 },
        { subject: 'Đóng gói', A: 95 },
      ]
    };
  }, [metrics, dateRange]);

  const dangLamList = filteredGroupedOrders.filter(o => !o.daGiao && o.percent < 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px' }}>
      
      {/* Control Bar */}
      <Card bordered={false} bodyStyle={{ padding: '16px 20px' }} style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <Space wrap size="middle">
            <Input.Search
              placeholder="Tìm mã đơn, tên khách..."
              style={{ width: 220 }}
              size="large"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={val => setStatusFilter(val)}
              style={{ width: 180 }}
              size="large"
              options={[
                { value: 'ALL', label: 'Tất cả đơn hàng' },
                { value: 'PRODUCING', label: 'Đang sản xuất' },
                { value: 'PENDING', label: 'Chờ giao hàng' },
                { value: 'COMPLETED', label: 'Đã hoàn thành' },
                { value: 'OVERDUE', label: 'Cảnh báo trễ hạn' },
              ]}
            />

            <DatePicker.RangePicker 
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              onChange={(dates) => setDateRange(dates)}
              style={{ width: 260 }}
              size="large"
              allowClear
            />

            <Select
              value={refreshInterval}
              onChange={val => setRefreshInterval(val)}
              style={{ width: 150 }}
              size="large"
              options={[
                { value: 0, label: 'Tắt làm mới' },
                { value: 30, label: 'Làm mới 30s' },
                { value: 60, label: 'Làm mới 1m' },
              ]}
            />
          </Space>

          <Space wrap size="middle">
            <Button size="large" icon={<FileExcelOutlined style={{ fontSize: '16px' }} />} onClick={exportExcel} style={{ fontWeight: 500 }}>
              Xuất Excel
            </Button>
            <Button size="large" icon={<PrinterOutlined style={{ fontSize: '16px' }} />} onClick={() => window.print()} style={{ fontWeight: 500 }}>
              In Báo Cáo
            </Button>
            <Button 
              size="large"
              icon={isFullscreen ? <FullscreenExitOutlined style={{ fontSize: '18px' }} /> : <FullscreenOutlined style={{ fontSize: '18px' }} />} 
              onClick={toggleFullscreen} 
            />
          </Space>
        </div>
      </Card>

      {/* KPI Cards Grid */}
      <Row gutter={[16, 16]}>
        {/* Sản lượng hôm nay */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false} bodyStyle={{ padding: '18px 16px' }} style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>Sản lượng hôm nay</Text>
            <div style={{ fontSize: '30px', fontWeight: 800, color: '#1677ff', margin: '6px 0 2px 0', lineHeight: 1.2 }}>
              {metrics.outputToday.toLocaleString()}
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag color={metrics.percentChange >= 0 ? "success" : "error"} style={{ margin: 0, padding: '2px 8px', fontSize: '12px', fontWeight: 600 }}>
                {metrics.percentChange >= 0 ? <RiseOutlined /> : <FallOutlined />} {metrics.percentChange}%
              </Tag>
              <Text type="secondary" style={{ fontSize: '12px' }}>vs hôm qua</Text>
            </div>
          </Card>
        </Col>

        {/* Sản lượng hôm qua */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false} bodyStyle={{ padding: '18px 16px' }} style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>Sản lượng hôm qua</Text>
            <div style={{ fontSize: '30px', fontWeight: 800, color: '#434343', margin: '6px 0 2px 0', lineHeight: 1.2 }}>
              {metrics.outputYesterday.toLocaleString()}
            </div>
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>Ghi nhận từ các tổ</Text>
          </Card>
        </Col>

        {/* Đang sản xuất */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false} bodyStyle={{ padding: '18px 16px' }} style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>Đang sản xuất</Text>
                <div style={{ fontSize: '30px', fontWeight: 800, color: '#faad14', margin: '6px 0 2px 0', lineHeight: 1.2 }}>
                  {metrics.inProduction}
                </div>
              </div>
              <div style={{ background: '#fffbe6', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SyncOutlined spin style={{ fontSize: '22px', color: '#faad14' }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block', fontWeight: 500 }}>TỔNG ĐƠN: {metrics.totalOrders}</Text>
          </Card>
        </Col>

        {/* Cảnh báo trễ hạn */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false} bodyStyle={{ padding: '18px 16px' }} style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>Cảnh báo trễ hạn</Text>
                <div style={{ fontSize: '30px', fontWeight: 800, color: '#ff4d4f', margin: '6px 0 2px 0', lineHeight: 1.2 }}>
                  {metrics.overdue}
                </div>
              </div>
              <div style={{ background: '#fff1f0', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WarningOutlined style={{ fontSize: '22px', color: '#ff4d4f' }} />
              </div>
            </div>
            <Text type="danger" style={{ fontSize: '12px', marginTop: '8px', display: 'block', fontWeight: 600 }}>Tỷ lệ đúng hạn: {metrics.onTimeRate}%</Text>
          </Card>
        </Col>

        {/* Mặt hàng dư kho */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false} bodyStyle={{ padding: '18px 16px' }} style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>Mặt hàng dư kho</Text>
                <div style={{ fontSize: '30px', fontWeight: 800, color: '#52c41a', margin: '6px 0 2px 0', lineHeight: 1.2 }}>
                  {metrics.totalStockCount}
                </div>
              </div>
              <div style={{ background: '#f6ffed', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <InboxOutlined style={{ fontSize: '22px', color: '#52c41a' }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>Mặt hàng sẵn có</Text>
          </Card>
        </Col>

        {/* Dự báo ngày mai */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false} bodyStyle={{ padding: '18px 16px' }} style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>Dự báo ngày mai</Text>
                <div style={{ fontSize: '30px', fontWeight: 800, color: '#722ed1', margin: '6px 0 2px 0', lineHeight: 1.2 }}>
                  {metrics.forecastedTomorrow.toLocaleString()}
                </div>
              </div>
              <div style={{ background: '#f9f0ff', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RiseOutlined style={{ fontSize: '22px', color: '#722ed1' }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>Thuật toán AI ước tính</Text>
          </Card>
        </Col>
      </Row>

      {/* Hệ thống Biểu đồ */}
      <DashboardCharts chartData={chartData} />

      {/* Grid Đơn Hàng Đang Sản Xuất */}
      <Card 
        title={<span style={{ fontSize: '17px', fontWeight: 700 }}>⚡ Tiến Độ Đơn Hàng Đang Sản Xuất</span>} 
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
                    border: '1px solid #e8e8e8', 
                    padding: '16px', 
                    borderRadius: '12px', 
                    background: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <Text bold style={{ fontSize: '17px', color: '#1677ff', fontWeight: 700 }}>
                      {code} <Text type="secondary" style={{ fontSize: '13px', fontWeight: 400 }}>({orderGroup.items.length} sp)</Text>
                    </Text>
                    {orderGroup.ngayGiao && (
                      <Tag icon={<CalendarOutlined />} color={isOverdue ? 'error' : 'blue'} style={{ margin: 0, padding: '2px 8px', fontSize: '12px', borderRadius: '4px' }}>
                        {orderGroup.ngayGiao}
                      </Tag>
                    )}
                  </div>
                  
                  <div style={{ marginBottom: '12px', fontSize: '14px', color: '#595959', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserOutlined style={{ color: '#bfbfbf' }} />
                    <Text type="secondary">Khách:</Text>
                    <Text style={{ fontWeight: 600, color: '#262626' }}>{customerName}</Text>
                  </div>

                  <Progress 
                    percent={percent} 
                    status={percent >= 100 ? "success" : "active"}
                    strokeColor={percent >= 100 ? "#52c41a" : "#1677ff"}
                    strokeWidth={10}
                  />
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* Drawer Chi tiết khi Click Card */}
      <Drawer
        title={<span style={{ fontSize: '18px', fontWeight: 700 }}>Chi tiết đơn hàng: {selectedOrderGroup?.code}</span>}
        width={550}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedOrderGroup && (
          <div style={{ fontSize: '15px' }}>
            <div style={{ background: '#fafafa', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #f0f0f0' }}>
              <p style={{ margin: '0 0 8px 0' }}><strong>Khách hàng:</strong> {selectedOrderGroup.khachHang}</p>
              <p style={{ margin: '0 0 8px 0' }}><strong>Ngày giao:</strong> {selectedOrderGroup.ngayGiao || 'Chưa xếp'}</p>
              <p style={{ margin: 0 }}><strong>Tiến độ trung bình:</strong> <Text bold style={{ color: '#1677ff', fontSize: '16px' }}>{selectedOrderGroup.percent}%</Text></p>
            </div>

            <Title level={5} style={{ marginTop: 20, fontSize: '16px', fontWeight: 700 }}>
              Danh sách sản phẩm trong đơn ({selectedOrderGroup.items.length})
            </Title>
            
            {selectedOrderGroup.items.map((it, idx) => (
              <Card key={idx} size="small" style={{ marginBottom: 12, borderRadius: '8px', borderColor: '#e8e8e8' }} bodyStyle={{ padding: '14px' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '15px' }}><strong>Sản phẩm:</strong> <Text bold style={{ color: '#262626' }}>{it.tenSP || it.ten || selectedOrderGroup.code}</Text></p>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#595959' }}><strong>Số lượng:</strong> {it.soLuong || 1}</p>
                <Progress percent={getItemProgress(it)} strokeWidth={8} />
              </Card>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default DashboardTab;