function isPhoiHandoff(beforeOrder, afterOrder) {
  const previousItems = new Map(
    (beforeOrder.chiTiet || []).map((item, index) => [
      String(item.key ?? index),
      item,
    ]),
  );

  return (afterOrder.chiTiet || []).some((item, index) => {
    const previous = previousItems.get(String(item.key ?? index));
    if (!previous) return false;

    const quantitySent =
      (Number(item.waitingConfirm?.dinhHinh) || 0) -
      (Number(previous.waitingConfirm?.dinhHinh) || 0);
    const quantityRemovedFromPhoi =
      (Number(previous.choKiemDinh?.phoi) || 0) -
      (Number(item.choKiemDinh?.phoi) || 0);

    return quantitySent > 0 && quantityRemovedFromPhoi >= quantitySent;
  });
}

function isOrderReadyForDelivery(beforeOrder, afterOrder) {
  const previousPackaged = Number(beforeOrder.soLuongDongGoi) || 0;
  const currentPackaged = Number(afterOrder.soLuongDongGoi) || 0;
  const totalQuantity = Number(afterOrder.tongSoBo) || 0;

  return (
    totalQuantity > 0 &&
    previousPackaged < totalQuantity &&
    currentPackaged >= totalQuantity &&
    beforeOrder.daGiao !== true &&
    afterOrder.daGiao !== true
  );
}

module.exports = { isPhoiHandoff, isOrderReadyForDelivery };
