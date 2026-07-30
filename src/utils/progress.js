export const calculateOrderProgress = (order) => {
  if (!order || !order.tongSoBo) return 0;

  const tongBo = Number(order.tongSoBo);
  const daDongGoi = Number(order.soLuongDongGoi) || 0;

  return Math.min(100, Math.round((daDongGoi / tongBo) * 100));
};

export const calculateStepsProgress = (order) => {
  if (!order || !order.chiTiet || order.chiTiet.length === 0) return 0;

  let totalRequired = 0;
  let totalCompleted = 0;

  const steps = ["phoi", "dinhHinh", "lapRap", "nham", "son"];
  const groupSteps = ["lapRap", "nham", "son"];

  const processedGroups = new Set();

  order.chiTiet.forEach((item) => {
    steps.forEach((step) => {
      if (item.skipSteps?.includes(step)) return;

      let required = 0;
      let completed = Number(item.tienDo?.[step] || 0);

      if (groupSteps.includes(step) && item.groupName) {
        const groupKey = `${item.groupName}-${step}`;

        if (processedGroups.has(groupKey)) return;

        processedGroups.add(groupKey);
        required = Number(item.soBoCum || 0);
      } else {
        required = Number(item.can || 0);
      }

      totalRequired += required;
      totalCompleted += Math.min(completed, required);
    });
  });

  if (totalRequired === 0) return 0;

  return Math.min(
    100,
    Math.round((totalCompleted / totalRequired) * 100)
  );
};