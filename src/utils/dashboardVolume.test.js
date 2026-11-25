import dayjs from 'dayjs';
import { calculateMonthlyCustomerVolumes } from './dashboard';

const orders = [
  { tenKhachHang: 'Bluezon', ngayDat: '2026-11-02', soKhoi: 2.5, percent: 45 },
  { tenKhachHang: 'Bluezon', ngayDat: '2026-11-18', soKhoi: 1.25, percent: 0 },
  { tenKhachHang: 'Khách B', ngayDat: '2026-11-05', soKhoi: 4, percent: 70 },
  { tenKhachHang: 'Đã giao', ngayDat: '2026-11-10', soKhoi: 10, percent: 100 },
  { tenKhachHang: 'Chờ giao', ngayDat: '2026-11-11', soKhoi: 8, percent: 100 },
  { tenKhachHang: 'Tháng khác', ngayDat: '2026-10-31', soKhoi: 6, percent: 20 },
];

test('totals customer volume for the selected month using only orders in production', () => {
  expect(calculateMonthlyCustomerVolumes(orders, dayjs('2026-11-01'))).toEqual([
    { khachHang: 'Khách B', soKhoi: 4 },
    { khachHang: 'Bluezon', soKhoi: 3.75 },
  ]);
});

test('uses the creation date for legacy orders without an entered date', () => {
  const legacyOrders = [
    { tenKhachHang: 'Bluezon', createdAt: '2026-11-12T08:30:00.000Z', soKhoi: 2, percent: 50 },
  ];

  expect(calculateMonthlyCustomerVolumes(legacyOrders, dayjs('2026-11-01'))).toEqual([
    { khachHang: 'Bluezon', soKhoi: 2 },
  ]);
});
