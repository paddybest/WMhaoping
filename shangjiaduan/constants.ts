// API配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// WebSocket配置
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'ws://localhost:5000';

export const MENU_ITEMS = [
  { path: '/', label: '仪表盘', icon: 'LayoutDashboard' },
  { path: '/products/manager', label: '商品管理', icon: 'List' },
  { path: '/users-evaluations', label: '用户与评价', icon: 'Users' },
  { path: '/lottery', label: '抽奖管理', icon: 'Gift' },
  { path: '/balance', label: '资金管理', icon: 'Wallet' },
  { path: '/merchant', label: '商家中心', icon: 'Store' },
];