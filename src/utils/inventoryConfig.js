export const WAREHOUSES = [
  { id: 'MAIN', name: 'Vật tư tiêu hao một tháng' },
  { id: 'SUB_1', name: 'Vật tư theo quý' },
  { id: 'SUB_2', name: 'Dự phòng chiến lược' }
];

export const inventoryStyles = {
  layout: { minHeight: '100vh', background: '#f5f7fa' },
  header: {
    background: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  card: { borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
};
