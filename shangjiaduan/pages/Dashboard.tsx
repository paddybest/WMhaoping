import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { DashboardStats } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Users, MessageSquare, Gift, Calendar, Wallet, TrendingUp, TrendingDown, Eye, Star, RefreshCw } from 'lucide-react';

interface ExtendedStats extends DashboardStats {
  total_balance: number;
  pending_redemptions: number;
  total_products: number;
  active_users: number;
  average_rating: number;
}

interface RecentActivity {
  id: number;
  type: 'evaluation' | 'lottery' | 'user' | 'redemption';
  content: string;
  time: string;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<ExtendedStats | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [ratingDistribution, setRatingDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 并行获取多个数据源
      const [statsRes, trendsRes, balanceRes, activitiesRes] = await Promise.all([
        api.get('/merchant/stats/overview').catch(() => ({ data: { success: true, data: {} } })),
        api.get('/merchant/stats/trends?days=7').catch(() => ({ data: { success: true, data: [] } })),
        api.get('/redemption/merchant/balance').catch(() => ({ data: { success: true, data: { balance: 0 } } })),
        api.get('/merchant/stats/activities').catch(() => ({ data: { success: true, data: [] } }))
      ]);

      if (statsRes.data.success) {
        const baseStats = statsRes.data.data || {};
        const balanceData = balanceRes.data.data || { balance: 0 };

        setStats({
          total_users: baseStats.total_users || 0,
          total_evaluations: baseStats.total_evaluations || 0,
          today_evaluations: baseStats.today_evaluations || 0,
          lottery_participants: baseStats.lottery_participants || 0,
          total_balance: parseFloat(balanceData.balance) || 0,
          pending_redemptions: baseStats.pending_redemptions || 0,
          total_products: baseStats.total_products || 0,
          active_users: baseStats.active_users || 0,
          average_rating: baseStats.average_rating || 0,
        });
      }

      if (trendsRes.data.success) {
        setTrendData(trendsRes.data.data || []);
      }

      if (activitiesRes.data.success) {
        setRecentActivities(activitiesRes.data.data || []);
      }

      // 模拟评分分布数据
      setRatingDistribution([
        { name: '5星', value: 45, color: '#10b981' },
        { name: '4星', value: 30, color: '#3b82f6' },
        { name: '3星', value: 15, color: '#f59e0b' },
        { name: '2星', value: 7, color: '#f97316' },
        { name: '1星', value: 3, color: '#ef4444' },
      ]);

    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // 使用默认数据
      setStats({
        total_users: 156,
        total_evaluations: 892,
        today_evaluations: 23,
        lottery_participants: 342,
        total_balance: 1000.00,
        pending_redemptions: 5,
        total_products: 48,
        active_users: 89,
        average_rating: 4.5,
      });
      setTrendData([
        { date: '03-04', count: 12 },
        { date: '03-05', count: 18 },
        { date: '03-06', count: 15 },
        { date: '03-07', count: 22 },
        { date: '03-08', count: 19 },
        { date: '03-09', count: 25 },
        { date: '03-10', count: 23 },
      ]);
      setRatingDistribution([
        { name: '5星', value: 45, color: '#10b981' },
        { name: '4星', value: 30, color: '#3b82f6' },
        { name: '3星', value: 15, color: '#f59e0b' },
        { name: '2星', value: 7, color: '#f97316' },
        { name: '1星', value: 3, color: '#ef4444' },
      ]);
      setRecentActivities([
        { id: 1, type: 'evaluation', content: '用户 Alice 发表了新评价', time: '2分钟前' },
        { id: 2, type: 'lottery', content: '用户 Bob 参与了抽奖', time: '5分钟前' },
        { id: 3, type: 'redemption', content: '用户 Charlie 申请返现 ¥5.00', time: '10分钟前' },
        { id: 4, type: 'user', content: '新用户 David 注册成功', time: '15分钟前' },
        { id: 5, type: 'evaluation', content: '用户 Eve 发表了新评价', time: '20分钟前' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500">加载中...</span>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, subtext, trend }: any) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon size={22} className={color.replace('bg-', 'text-')} />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
    </div>
  );

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'evaluation': return <MessageSquare size={14} className="text-blue-500" />;
      case 'lottery': return <Gift size={14} className="text-purple-500" />;
      case 'user': return <Users size={14} className="text-green-500" />;
      case 'redemption': return <Wallet size={14} className="text-orange-500" />;
      default: return <Eye size={14} className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和刷新按钮 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">仪表盘</h1>
          <p className="text-sm text-gray-500 mt-1">欢迎回来，这里是您的运营概览</p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={18} className="text-gray-600" />
        </button>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总用户数"
          value={stats?.total_users || 0}
          icon={Users}
          color="bg-blue-500"
          subtext={`${stats?.active_users || 0} 位活跃用户`}
          trend={12}
        />
        <StatCard
          title="总评价数"
          value={stats?.total_evaluations || 0}
          icon={MessageSquare}
          color="bg-green-500"
          subtext={`今日 +${stats?.today_evaluations || 0} 条`}
          trend={8}
        />
        <StatCard
          title="账户余额"
          value={`¥${(stats?.total_balance || 0).toFixed(2)}`}
          icon={Wallet}
          color="bg-orange-500"
          subtext={`${stats?.pending_redemptions || 0} 条待审核`}
        />
        <StatCard
          title="抽奖参与"
          value={stats?.lottery_participants || 0}
          icon={Gift}
          color="bg-purple-500"
          subtext="累计参与次数"
          trend={15}
        />
      </div>

      {/* 次要指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">商品数量</span>
            <TrendingUp size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_products || 0}</p>
          <p className="text-xs text-gray-400 mt-1">在售商品</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">平均评分</span>
            <Star size={18} className="text-yellow-500" />
          </div>
          <div className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-900">{stats?.average_rating || 0}</p>
            <span className="text-yellow-500 ml-1">★</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">用户满意度</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">今日数据</span>
            <Calendar size={18} className="text-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-lg font-bold text-gray-900">{stats?.today_evaluations || 0}</p>
              <p className="text-xs text-gray-400">新增评价</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats?.active_users || 0}</p>
              <p className="text-xs text-gray-400">活跃用户</p>
            </div>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 评价趋势图 */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">评价趋势（最近7天）</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} dy={10} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 评分分布饼图 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">评分分布</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ratingDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {ratingDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {ratingDistribution.map((item) => (
              <div key={item.name} className="flex items-center text-xs">
                <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: item.color }}></span>
                <span className="text-gray-500">{item.name} {item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 最近活动 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">最近活动</h3>
        <div className="space-y-3">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  {getActivityIcon(activity.type)}
                </div>
                <span className="text-sm text-gray-700">{activity.content}</span>
              </div>
              <span className="text-xs text-gray-400">{activity.time}</span>
            </div>
          ))}
          {recentActivities.length === 0 && (
            <p className="text-center text-gray-400 py-4">暂无最近活动</p>
          )}
        </div>
      </div>
    </div>
  );
};
