export const PRODUCTION_STEPS = [
  { key: "phoi", label: "Tổ Phôi" },
  { key: "dinhHinh", label: "Tổ Định Hình" },
  { key: "lapRap", label: "Tổ Lắp Ráp" },
  { key: "nham", label: "Tổ Trà Nhám" },
  { key: "son", label: "Tổ Sơn" },
  { key: "dongGoi", label: "Tổ Đóng Gói" },
];

export const getNextProductionStep = (step, skipSteps = []) => {
  const currentIndex = PRODUCTION_STEPS.findIndex(
    (productionStep) => productionStep.key === step,
  );
  if (currentIndex < 0) return null;

  return (
    PRODUCTION_STEPS.slice(currentIndex + 1).find(
      (productionStep) => !skipSteps.includes(productionStep.key),
    )?.key || null
  );
};

export const getPreviousProductionStep = (step, skipSteps = []) => {
  const currentIndex = PRODUCTION_STEPS.findIndex(
    (productionStep) => productionStep.key === step,
  );
  if (currentIndex < 0) return null;

  return (
    PRODUCTION_STEPS.slice(0, currentIndex)
      .reverse()
      .find((productionStep) => !skipSteps.includes(productionStep.key))
      ?.key || null
  );
};

export const getProductionTeamLabel = (step) =>
  PRODUCTION_STEPS.find((productionStep) => productionStep.key === step)?.label;
