import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Wallet, TrendingUp, TrendingDown, History, RefreshCw, DollarSign } from 'lucide-react';

interface BalanceData {
  merchant_id: number;
  balance: number;
  total_recharged: number;
  total_redeemed: number;
}

interface RedemptionRecord {
  id: number;
  user_id: number;
  prize_id: number;
  reward_code: string;
  cash_amount: number;
  status: string;
  screenshot_url?: string;
  created_at: string;
  verified_at?: string;
}

export const Balance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'balance' | 'records'>('balance');
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [records, setRecords] = useState<RedemptionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [recharging, setRecharging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  // 支付二维码弹窗状态
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [paymentCodeUrl, setPaymentCodeUrl] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');

  // 获取余额
  const fetchBalance = async () => {
    try {
      const res = await api.get('/redemption/merchant/balance');
      if (res.data.success) {
        const data = res.data.data;
        // 确保数值字段是数字类型
        setBalance({
          ...data,
          balance: parseFloat(data.balance) || 0,
          total_recharged: parseFloat(data.total_recharged) || 0,
          total_redeemed: parseFloat(data.total_redeemed) || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  // 获取返现记录
  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = filterStatus ? `?status=${filterStatus}` : '?status=pending';
      const res = await api.get(`/redemption/merchant/list${params}`);
      if (res.data.success) {
        // 确保 cash_amount 是数字类型
        const data = (res.data.data || []).map((item: any) => ({
          ...item,
          cash_amount: parseFloat(item.cash_amount) || 0,
        }));
        setRecords(data);
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    if (activeTab === 'records') {
      fetchRecords();
    }
  }, [activeTab, filterStatus]);

  // 轮询检查支付状态
  const checkPaymentStatus = async (orderId: string) => {
    try {
      const res = await api.get(`/api/payment/status/${orderId}`);
      if (res.data.data?.tradeState === 'SUCCESS') {
        setQrModalOpen(false);
        setMessage({ type: 'success', text: '充值成功！' });
        fetchBalance();
      }
    } catch (error) {
      console.error('检查支付状态失败:', error);
    }
  };

  // 充值
  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(rechargeAmount);

    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: '请输入有效的充值金额' });
      return;
    }

    setRecharging(true);
    setMessage(null);

    try {
      const res = await api.post('/api/payment/create-recharge-order', {
        amount: amount
      });

      if (res.data.success) {
        // 如果是模拟模式，直接成功
        if (res.data.data.simulate) {
          setMessage({ type: 'success', text: `充值成功！当前余额：¥${parseFloat(res.data.data.amount).toFixed(2)}` });
          setRechargeAmount('');
          fetchBalance();
        } else {
          // 真实支付，显示二维码
          setPaymentCodeUrl(res.data.data.codeUrl);
          setCurrentOrderId(res.data.data.orderId);
          setQrModalOpen(true);

          // 轮询检查支付状态
          const timer = setInterval(() => {
            checkPaymentStatus(currentOrderId);
          }, 2000);

          // 5分钟后停止轮询
          setTimeout(() => {
            clearInterval(timer);
            if (qrModalOpen) {
              setQrModalOpen(false);
              setMessage({ type: 'error', text: '支付超时，请重试' });
            }
          }, 300000);
        }
      } else {
        setMessage({ type: 'error', text: res.data.error || '充值失败' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || '充值失败，请重试' });
    } finally {
      setRecharging(false);
    }
  };

  // 审核返现
  const handleVerify = async (recordId: number, approved: boolean) => {
    try {
      const res = await api.post('/redemption/merchant/verify', {
        recordId,
        approved
      });

      if (res.data.success) {
        setMessage({
          type: 'success',
          text: approved ? '审核通过，已返现' : '已拒绝'
        });
        fetchBalance();
        fetchRecords();
      } else {
        setMessage({ type: 'error', text: res.data.error || '操作失败' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || '操作失败' });
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'verified': return '已通过';
      case 'failed': return '已拒绝';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'verified': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      {/* 支付二维码弹窗 */}
      {qrModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-semibold mb-4">请使用微信扫码支付</h3>
            {paymentCodeUrl && (
              <div className="flex justify-center mb-4">
                <img src={paymentCodeUrl} alt="支付二维码" className="w-48 h-48" />
              </div>
            )}
            <p className="text-sm text-gray-500 mb-4">支付完成后自动更新余额</p>
            <button
              onClick={() => {
                setQrModalOpen(false);
                setMessage({ type: 'error', text: '已取消支付' });
              }}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">资金管理</h1>
        <p className="text-sm text-gray-500 mt-1">管理账户余额和返现记录</p>
      </div>

      {/* 标签切换 */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'balance'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('balance')}
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            账户余额
          </div>
        </button>
        <button
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'records'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('records')}
        >
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            返现记录
          </div>
        </button>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* 余额页面 */}
      {activeTab === 'balance' && balance && (
        <div className="space-y-6">
          {/* 余额卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">当前余额</p>
                  <p className="text-3xl font-bold mt-1">¥{balance.balance.toFixed(2)}</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <Wallet className="w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">累计充值</p>
                  <p className="text-2xl font-bold text-green-600 mt-1 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-1" />
                    ¥{balance.total_recharged.toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-full p-3">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">累计返现</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1 flex items-center">
                    <TrendingDown className="w-5 h-5 mr-1" />
                    ¥{balance.total_redeemed.toFixed(2)}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-full p-3">
                  <History className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* 充值表单 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">充值余额</h2>
            <form onSubmit={handleRecharge} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  充值金额（元）
                </label>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="请输入充值金额"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
              <button
                type="submit"
                disabled={recharging}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {recharging ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    充值中...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    确认充值
                  </>
                )}
              </button>
            </form>

            {/* 快捷金额 */}
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">快捷金额</p>
              <div className="flex gap-3">
                {[100, 500, 1000, 2000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setRechargeAmount(amount.toString())}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                  >
                    ¥{amount}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 返现记录页面 */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          {/* 筛选 */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">筛选状态：</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部</option>
                <option value="pending">待审核</option>
                <option value="verified">已通过</option>
                <option value="failed">已拒绝</option>
              </select>
            </div>
          </div>

          {/* 记录列表 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                加载中...
              </div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                暂无返现记录
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">兑换码</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">申请时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">审核时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-medium">{record.reward_code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-green-600 font-semibold">¥{record.cash_amount.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(record.status)}`}>
                          {getStatusText(record.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(record.created_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {record.verified_at ? new Date(record.verified_at).toLocaleString('zh-CN') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {record.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVerify(record.id, true)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              通过
                            </button>
                            <button
                              onClick={() => handleVerify(record.id, false)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              拒绝
                            </button>
                          </div>
                        )}
                        {record.status === 'verified' && record.screenshot_url && (
                          <a
                            href={record.screenshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            查看截图
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
