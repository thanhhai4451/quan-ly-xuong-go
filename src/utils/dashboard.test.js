import dayjs from 'dayjs';
import { calculateAdvancedMetrics } from './dashboard';

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
