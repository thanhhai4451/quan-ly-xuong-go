import React from 'react';
import { Row, Col, Card } from 'antd';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Legend, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const PIE_COLORS = ['#1677ff', '#faad14', '#52c41a', '#ff4d4f', '#722ed1', '#13c2c2'];

const DashboardCharts = ({ chartData }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Hàng 1: Area Chart & Line Chart */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title={<span style={{ fontWeight: 600 }}>📈 Biểu Đồ Sản Lượng Theo Ngày (Area Chart)</span>} bordered={false} style={{ borderRadius: '12px' }}>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer minWidth={0}>
                <AreaChart data={chartData.dailyOutput}>
                  <defs>
                    <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1677ff" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1677ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="ngay" stroke="#8c8c8c" />
                  <YAxis stroke="#8c8c8c" />
                  <Tooltip formatter={(v) => [`${v.toLocaleString()} sp`, 'Sản lượng']} />
                  <Area type="monotone" dataKey="sanLuong" stroke="#1677ff" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOutput)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={<span style={{ fontWeight: 600 }}>📉 Tiến Độ Hoàn Thành Theo Ngày (Line Chart)</span>} bordered={false} style={{ borderRadius: '12px' }}>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer minWidth={0}>
                <LineChart data={chartData.dailyProgress}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="ngay" stroke="#8c8c8c" />
                  <YAxis domain={[0, 100]} stroke="#8c8c8c" />
                  <Tooltip formatter={(v) => [`${v}%`, 'Tiến độ trung bình']} />
                  <Line type="monotone" dataKey="tienDo" stroke="#52c41a" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Hàng 2: Top Tổ & Top Khách Hàng */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ fontWeight: 600 }}>🏭 Top Tổ Sản Xuất Lớn Nhất (Bar Chart)</span>} bordered={false} style={{ borderRadius: '12px' }}>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer minWidth={0}>
                <BarChart data={chartData.topTeams}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="to" stroke="#8c8c8c" />
                  <YAxis stroke="#8c8c8c" />
                  <Tooltip formatter={(v) => [`${v.toLocaleString()} sp`, 'Sản lượng']} />
                  <Bar dataKey="sanLuong" fill="#1677ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<span style={{ fontWeight: 600 }}>👥 Top Khách Hàng Đặt Hàng (Horizontal Bar)</span>} bordered={false} style={{ borderRadius: '12px' }}>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer minWidth={0}>
                <BarChart data={chartData.topCustomers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#8c8c8c" />
                  <YAxis dataKey="khachHang" type="category" stroke="#8c8c8c" width={100} />
                  <Tooltip formatter={(v) => [`${v} đơn`, 'Số đơn hàng']} />
                  <Bar dataKey="soDon" fill="#722ed1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Hàng 3: Pie Chart, Donut Chart & Radar Chart */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title={<span style={{ fontWeight: 600 }}>🍰 Trạng Thái Đơn Hàng</span>} bordered={false} style={{ borderRadius: '12px' }}>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer minWidth={0}>
                <PieChart>
                  <Pie data={chartData.statusPie} dataKey="value" cx="50%" cy="50%" outerRadius={65}>
                    {chartData.statusPie.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title={<span style={{ fontWeight: 600 }}>🍩 Tỷ Lệ Đơn Đúng Hạn (Donut)</span>} bordered={false} style={{ borderRadius: '12px' }}>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer minWidth={0}>
                <PieChart>
                  <Pie data={chartData.onTimePie} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={65}>
                    <Cell fill="#52c41a" />
                    <Cell fill="#ff4d4f" />
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title={<span style={{ fontWeight: 600 }}>🎯 Hiệu Suất Tổ Sản Xuất (Radar)</span>} bordered={false} style={{ borderRadius: '12px' }}>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer minWidth={0}>
                <RadarChart data={chartData.teamRadar}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" stroke="#8c8c8c" style={{ fontSize: '11px' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Hiệu suất" dataKey="A" stroke="#1677ff" fill="#1677ff" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default React.memo(DashboardCharts);