import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export const calculateCustomerVolumeShares = (orders = [], dateRange = null) => {
  const customerOrders = new Map();
  const startDate = dateRange?.[0]?.startOf('day');
  const endDate = dateRange?.[1]?.endOf('day');

  orders.forEach((order, index) => {
    if (startDate && endDate) {
      const orderDate = dayjs(order.ngayGiao, ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD/MM']);
      if (
        !orderDate.isValid() ||
        orderDate.isBefore(startDate) ||
        orderDate.isAfter(endDate)
      ) {
        return;
      }
    }

    const orderCode = order.maDon || order.maDonHang || order.tenSP;
    const orderKey = orderCode || order.fbKey || order.id || `order-${index}`;
    const customer =
      order.khachHang || order.tenKhachHang || order.khach || 'Khách lẻ';
    const volume = Number(order.soKhoi);
    const existingOrder = customerOrders.get(orderKey);

    if (!existingOrder) {
      customerOrders.set(orderKey, {
        customer,
        soKhoi: Number.isFinite(volume) && volume >= 0 ? volume : null,
      });
    } else if (existingOrder.soKhoi === null && Number.isFinite(volume) && volume >= 0) {
      existingOrder.soKhoi = volume;
    }
  });

  const customerCapacity = {};
  customerOrders.forEach(({ customer, soKhoi }) => {
    if (soKhoi > 0) {
      customerCapacity[customer] = (customerCapacity[customer] || 0) + soKhoi;
    }
  });

  const totalCustomerCapacity = Object.values(customerCapacity).reduce(
    (total, volume) => total + volume,
    0
  );

  return Object.entries(customerCapacity)
    .map(([khachHang, soKhoi]) => ({
      khachHang,
      soKhoi,
      tyTrong: totalCustomerCapacity > 0 ? soKhoi / totalCustomerCapacity : 0,
    }))
    .sort((a, b) => b.soKhoi - a.soKhoi);
};

/**
 * Thuật toán tính toán KPI ERP & Dự báo sản lượng MES
 */
export const calculateAdvancedMetrics = (orders = [], khoDu = {}) => {
  const todayStr = dayjs().format('DD/MM/YYYY');
  const yesterdayStr = dayjs().subtract(1, 'day').format('DD/MM/YYYY');

  let outputToday = 0;
  let outputYesterday = 0;
  let totalProgressAcc = 0;
  let totalItemsInProd = 0;

  const dailyMap = {};
  const teamPerformance = {};
  const customerMap = {};
  const productMap = {};

  orders.forEach((order) => {
    const isCompleted = order.percent >= 100 || order.daGiao;
    totalProgressAcc += Number(order.percent || 0);

    if (!isCompleted) {
      totalItemsInProd += Array.isArray(order.items) ? order.items.length : 1;
    }

    const customer = order.khachHang || order.tenKhachHang || order.khach || 'Khách lẻ';
    customerMap[customer] = (customerMap[customer] || 0) + 1;

    const listChiTiet = Array.isArray(order.chiTiet) 
      ? order.chiTiet 
      : (Array.isArray(order.congDoan) ? order.congDoan : []);

    listChiTiet.forEach((item) => {
      const prodName = item.tenSP || item.ten || 'Sản phẩm mộc';
      productMap[prodName] = (productMap[prodName] || 0) + (Number(item.soLuong) || 1);

      if (Array.isArray(item.lichSu)) {
        item.lichSu.forEach((log) => {
          const qty = Number(log.chenhLech) || 0;
          const team = log.to || 'Tổ Khác';
          
          let rawDate = log.ngay || '';
          if (rawDate.includes(' ')) rawDate = rawDate.split(' ')[0];
          const logDate = rawDate ? dayjs(rawDate, ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD/MM']).format('DD/MM/YYYY') : '';

          if (logDate === todayStr) outputToday += qty;
          if (logDate === yesterdayStr) outputYesterday += qty;

          if (logDate) {
            dailyMap[logDate] = (dailyMap[logDate] || 0) + qty;
          }

          if (!teamPerformance[team]) {
            teamPerformance[team] = { sanLuong: 0, dem: 0 };
          }
          teamPerformance[team].sanLuong += qty;
          teamPerformance[team].dem += 1;
        });
      }
    });
  });

  // Tỷ lệ tăng trưởng sản lượng
  let percentChange = 0;
  if (outputYesterday > 0) {
    percentChange = Math.round(((outputToday - outputYesterday) / outputYesterday) * 100);
  } else if (outputToday > 0) {
    percentChange = 100;
  }

  // Dự báo Moving Average 3 ngày
  const sortedDates = Object.keys(dailyMap).sort((a, b) => dayjs(a, 'DD/MM/YYYY').diff(dayjs(b, 'DD/MM/YYYY')));
  const last3Days = sortedDates.slice(-3);
  const sumLast3 = last3Days.reduce((acc, d) => acc + dailyMap[d], 0);
  const forecastedTomorrow = last3Days.length > 0 ? Math.round(sumLast3 / last3Days.length) : outputToday;

  const totalOrdersCount = orders.length;
  const avgFactoryProgress = totalOrdersCount > 0 ? Math.round(totalProgressAcc / totalOrdersCount) : 0;

  return {
    outputToday,
    outputYesterday,
    percentChange,
    avgFactoryProgress,
    forecastedTomorrow,
    totalItemsInProd,
    totalStockCount: Object.keys(khoDu || {}).length,
    dailyMap,
    teamPerformance,
    customerMap,
    productMap
  };
};