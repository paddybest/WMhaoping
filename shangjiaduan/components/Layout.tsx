import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, List, Tags, Users, MessageSquare, Gift,
  LogOut, Bell, Menu, X, ChevronRight, Store, Headphones, QrCode, Wallet
} from 'lucide-react';
import { MENU_ITEMS } from '../constants';
import { getSocket, disconnectSocket } from '../services/socket';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on('new_evaluation', (data: { message: string }) => {
        setNotifications(prev => [`新评价: ${data.message}`, ...prev]);
      });
      socket.on('lottery_notification', (data: { message: string }) => {
        setNotifications(prev => [`中奖通知: ${data.message}`, ...prev]);
      });
    }
    return () => {
      if (socket) {
        socket.off('new_evaluation');
        socket.off('lottery_notification');
      }
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    disconnectSocket();
    navigate('/login');
  };

  const IconMap: Record<string, React.ElementType> = {
    LayoutDashboard, List, Tags, Users, MessageSquare, Gift, Store, QrCode, Headphones, Wallet
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0
        `}
      >
        <div className="h-16 flex items-center justify-between px-6 bg-slate-950">
          <span className="text-xl font-bold tracking-wider">商家后台</span>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="mt-6 px-3 space-y-1">
          {MENU_ITEMS.map((item) => {
            const Icon = IconMap[item.icon];
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <Icon size={20} className="mr-3" />
                {item.label}
                {isActive && <ChevronRight size={16} className="ml-auto opacity-50" />}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            退出登录
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <Menu size={24} />
          </button>

          <div className="flex-1 px-4 text-xl font-semibold text-gray-800 lg:px-0">
             {MENU_ITEMS.find(i => i.path === location.pathname)?.label || '仪表盘'}
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-400 hover:text-gray-600 relative"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-1 border border-gray-100 z-50">
                <div className="px-4 py-2 border-b border-gray-50 text-sm font-medium text-gray-700">通知中心</div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">暂无新通知</div>
                ) : (
                  <ul className="max-h-64 overflow-y-auto">
                    {notifications.map((note, idx) => (
                      <li key={idx} className="px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                        {note}
                      </li>
                    ))}
                  </ul>
                )}
                {notifications.length > 0 && (
                  <button 
                    onClick={() => setNotifications([])}
                    className="w-full text-center py-2 text-xs text-blue-600 hover:bg-gray-50 font-medium"
                  >
                    清除所有
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};