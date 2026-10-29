import dayjs from 'dayjs';
import { calculateAdvancedMetrics, calculateCustomerVolumeShares } from './dashboard';

const orders = [{
  chiTiet: [{
    tenSP: 'Bàn gỗ',
    soLuong: 2,
    lichSu: [
      { ngay: '01/06/2026 08:00', chenhLech: 12, to: 'Tổ A' },
      { ngay: '02/06/2026 08:00', chenhLech: 5, to: 'Tổ B' },
    ],
  }],
}];

test('filters production metrics by the selected production-log dates', () => {
  const metrics = calculateAdvancedMetrics(orders, {}, [
    dayjs('2026-06-01'),
    dayjs('2026-06-01'),
  ]);

  expect(metrics.dailyMap).toEqual({ '01/06/2026': 12 });
  expect(metrics.teamPerformance).toEqual({
    'Tổ A': { sanLuong: 12, dem: 1 },
  });
  expect(metrics.productionInRange).toBe(12);
  expect(metrics.productionDays).toBe(1);
  expect(metrics.averageProductionPerDay).toBe(12);
});

test('keeps all production-log dates when no range is selected', () => {
  const metrics = calculateAdvancedMetrics(orders);

  expect(metrics.dailyMap).toEqual({
    '01/06/2026': 12,
    '02/06/2026': 5,
  });
  expect(metrics.productionInRange).toBe(17);
  expect(metrics.productionDays).toBe(2);
});

test('filters customer volume shares by the selected order delivery dates', () => {
  const volumeOrders = [
    { maDon: 'DH-06', khachHang: 'Khách A', ngayGiao: '15/06/2026', soKhoi: 10 },
    { maDon: 'DH-07', khachHang: 'Khách B', ngayGiao: '20/06/2026', soKhoi: 5 },
    { maDon: 'DH-05', khachHang: 'Khách A', ngayGiao: '30/05/2026', soKhoi: 20 },
  ];

  expect(calculateCustomerVolumeShares(volumeOrders, [
    dayjs('2026-06-01'),
    dayjs('2026-06-30'),
  ])).toEqual([
    { khachHang: 'Khách A', soKhoi: 10, tyTrong: 2 / 3 },
    { khachHang: 'Khách B', soKhoi: 5, tyTrong: 1 / 3 },
  ]);
});

test('counts a repeated order volume only once within the selected range', () => {
  const volumeOrders = [
    { maDon: 'DH-06', khachHang: 'Khách A', ngayGiao: '15/06/2026', soKhoi: 10 },
    { maDon: 'DH-06', khachHang: 'Khách A', ngayGiao: '15/06/2026', soKhoi: 10 },
  ];

  expect(calculateCustomerVolumeShares(volumeOrders, [
    dayjs('2026-06-01'),
    dayjs('2026-06-30'),
  ])).toEqual([
    { khachHang: 'Khách A', soKhoi: 10, tyTrong: 1 },
  ]);
});
