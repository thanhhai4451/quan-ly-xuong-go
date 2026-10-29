const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isOrderReadyForDelivery,
  isPhoiHandoff,
} = require('./notificationConditions');

test('detects a handoff from Phôi to Định Hình', () => {
  assert.equal(
    isPhoiHandoff(
      {
        chiTiet: [
          {
            key: 'item-1',
            choKiemDinh: { phoi: 5 },
            waitingConfirm: { dinhHinh: 0 },
          },
        ],
      },
      {
        chiTiet: [
          {
            key: 'item-1',
            choKiemDinh: { phoi: 2 },
            waitingConfirm: { dinhHinh: 3 },
          },
        ],
      },
    ),
    true,
  );
});

test('does not treat unrelated updates as a Phôi handoff', () => {
  assert.equal(
    isPhoiHandoff(
      {
        chiTiet: [
          {
            key: 'item-1',
            choKiemDinh: { phoi: 5 },
            waitingConfirm: { dinhHinh: 0 },
          },
        ],
      },
      {
        chiTiet: [
          {
            key: 'item-1',
            choKiemDinh: { phoi: 5 },
            waitingConfirm: { dinhHinh: 3 },
          },
        ],
      },
    ),
    false,
  );
});

test('detects only the transition to fully packed and waiting for delivery', () => {
  assert.equal(
    isOrderReadyForDelivery(
      { soLuongDongGoi: 9, daGiao: false },
      { soLuongDongGoi: 10, tongSoBo: 10, daGiao: false },
    ),
    true,
  );
  assert.equal(
    isOrderReadyForDelivery(
      { soLuongDongGoi: 10, daGiao: false },
      { soLuongDongGoi: 11, tongSoBo: 10, daGiao: false },
    ),
    false,
  );
  assert.equal(
    isOrderReadyForDelivery(
      { soLuongDongGoi: 9, daGiao: false },
      { soLuongDongGoi: 10, tongSoBo: 10, daGiao: true },
    ),
    false,
  );
});
