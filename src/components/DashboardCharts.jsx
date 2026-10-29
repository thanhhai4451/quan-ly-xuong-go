import React from 'react';
import { Row, Col, Card, Statistic, Empty } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const PIE_COLORS = ['#1677ff', '#faad14', '#52c41a', '#ff4d4f', '#722ed1', '#13c2c2'];

const cardStyle = {
  borderRadius: '14px',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.045)',
  border: 'none',
};

const cardTitleStyle = {
  fontWeight: 700,
  fontSize: '15px',
  color: '#1f1f1f',
};

const chartContainer = {
  width: '100%',
  height: 280,
  padding: '4px 0',
};

const DashboardCharts = ({ chartData }) => {
  // === Tính số liệu Thống kê Tổng quan ===
  const tongSanLuong = chartData.dailyOutput?.reduce((s, i) => s + (i.sanLuong || 0), 0) || 0;
  const donDungHan = chartData.onTimePie?.[0]?.value || 0;
  const donTreHan = chartData.onTimePie?.[1]?.value || 0;
  const tyLeHoanThanh = donDungHan + donTreHan > 0
    ? Math.round((donDungHan / (donDungHan + donTreHan)) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* === HÀNG 1: Sản lượng + Thống kê Tổng quan === */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card
            title={<span style={cardTitleStyle}>📈 Sản Lượng Sản Xuất Theo Ngày</span>}
            bordered={false}
            style={cardStyle}
          >
            <div style={chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.dailyOutput} margin={{ top: 12, right: 24, left: 12, bottom: 8 }}>
                  <defs>
                    <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1677ff" stopOpacity={0.85} />
                      <stop offset="95%" stopColor="#1677ff" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2f2f2" />
                  <XAxis
                    dataKey="ngay"
                    stroke="#8c8c8c"
                    tick={{ fontSize: 13 }}
                    tickLine={false}
                    axisLine={{ stroke: '#eee' }}
                  />
                  <YAxis
                    stroke="#8c8c8c"
                    tick={{ fontSize: 13 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [`${v.toLocaleString('vi-VN')} sp`, 'Sản lượng']}
                    contentStyle={{
                      borderRadius: '10px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      padding: '8px 12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sanLuong"
                    stroke="#1677ff"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorOutput)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* === Thẻ Số Liệu Tổng Quan === */}
        <Col xs={24} lg={10}>
          <Card
            title={<span style={cardTitleStyle}>📊 Thống Kê Tổng Quan</span>}
            bordered={false}
            style={cardStyle}
          >
            <Row gutter={[12, 12]} style={{ paddingTop: 8 }}>
              <Col span={12}>
                <Card size="small" style={{ borderRadius: '10px', borderLeft: '4px solid #1677ff' }}>
                  <Statistic
                    title="Tổng Sản Lượng"
                    value={tongSanLuong}
                    valueStyle={{ color: '#1677ff', fontSize: '18px', fontWeight: 700 }}
                    formatter={(val) => val.toLocaleString('vi-VN')}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ borderRadius: '10px', borderLeft: '4px solid #52c41a' }}>
                  <Statistic
                    title="Đơn Đúng Hạn"
                    value={donDungHan}
                    valueStyle={{ color: '#52c41a', fontSize: '18px', fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ borderRadius: '10px', borderLeft: '4px solid #ff4d4f' }}>
                  <Statistic
                    title="Đơn Trễ Hạn"
                    value={donTreHan}
                    valueStyle={{ color: '#ff4d4f', fontSize: '18px', fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ borderRadius: '10px', borderLeft: '4px solid #722ed1' }}>
                  <Statistic
                    title="Tỷ Lệ Hoàn Thành"
                    value={tyLeHoanThanh}
                    suffix="%"
                    valueStyle={{ color: '#722ed1', fontSize: '18px', fontWeight: 700 }}
                    prefix={<ArrowUpOutlined style={{ fontSize: 14 }} />}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* === HÀNG 2: Top Tổ SX + Top Khách Hàng === */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={cardTitleStyle}>🏭 Top Tổ Sản Xuất Sản Lượng Cao Nhất</span>}
            bordered={false}
            style={cardStyle}
          >
            <div style={chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.topTeams} margin={{ top: 12, right: 24, left: 12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2f2f2" />
                  <XAxis
                    dataKey="to"
                    stroke="#8c8c8c"
                    tick={{ fontSize: 13 }}
                    tickLine={false}
                    axisLine={{ stroke: '#eee' }}
                  />
                  <YAxis
                    stroke="#8c8c8c"
                    tick={{ fontSize: 13 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [`${v.toLocaleString('vi-VN')} sp`, 'Sản lượng']}
                    contentStyle={{
                      borderRadius: '10px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      padding: '8px 12px',
                    }}
                  />
                  <Bar
                    dataKey="sanLuong"
                    fill="#1677ff"
                    radius={[6, 6, 0, 0]}
                    barSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={<span style={cardTitleStyle}>👥 Tỷ Trọng Công Suất Theo Khối Lượng (m³)</span>}
            bordered={false}
            style={cardStyle}
          >
            {chartData.topCustomers?.length ? (
              <div style={chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.topCustomers}
                      dataKey="soKhoi"
                      nameKey="khachHang"
                      cx="50%"
                      cy="45%"
                      outerRadius={82}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={{ stroke: '#ccc' }}
                    >
                      {chartData.topCustomers.map((customer, index) => (
                        <Cell
                          key={`customer-${customer.khachHang}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, item) => [
                        `${Number(value).toLocaleString('vi-VN')} m³ (${(
                          item.payload.tyTrong * 100
                        ).toFixed(1)}%)`,
                        name,
                      ]}
                      contentStyle={{
                        borderRadius: '10px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                        padding: '8px 12px',
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có số bộ để tính tỷ trọng công suất"
              />
            )}
          </Card>
        </Col>
      </Row>

    </div>
  );
};

export default React.memo(DashboardCharts);