import { useMemo } from "react";
import { calculateDashboard } from "../utils/dashboard";

const useDashboard = (orders = [], khoDu = {}) => {
  const dashboard = useMemo(() => {
    return calculateDashboard(orders, khoDu);
  }, [orders, khoDu]);

  return dashboard;
};

export default useDashboard;