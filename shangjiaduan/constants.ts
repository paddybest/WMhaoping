// API配置 - 使用相对路径，通过 nginx 代理访问
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Socket.IO配置 - 使用相对路径
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/socket.io';

export const MENU_ITEMS = [
  { path: '/', label: '仪表盘', icon: 'LayoutDashboard' },
  { path: '/products/manager', label: '商品管理', icon: 'List' },
  { path: '/users-evaluations', label: '用户与评价', icon: 'Users' },
  { path: '/lottery', label: '抽奖管理', icon: 'Gift' },
  { path: '/balance', label: '资金管理', icon: 'Wallet' },
  { path: '/merchant', label: '商家中心', icon: 'Store' },
];