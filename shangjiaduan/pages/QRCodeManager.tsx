import React, { useState, useEffect } from 'react';
import { QrCode, Download, Share2, Copy, RefreshCw, AlertCircle, CheckCircle, X } from 'lucide-react';
import api from '../services/api';

interface QRCodeInfo {
  qrCodeUrl: string;
  shopName: string;
  name: string;
}

export const QRCodeManager: React.FC = () => {
  const [qrCodeInfo, setQRCodeInfo] = useState<QRCodeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchQRCode();
  }, []);

  const fetchQRCode = async () => {
    setLoading(true);
    try {
      const res = await api.get('/merchant/qrcode');
      if (res.data.success) {
        setQRCodeInfo({
          qrCodeUrl: res.data.data.qrCodeUrl,
          shopName: res.data.data.shopName || '',
          name: res.data.data.name || ''
        });
      } else {
        setMessage({ type: 'error', text: res.data.message || '获取二维码失败' });
      }
    } catch (e) {
      console.error('Failed to fetch QR code:', e);
      setMessage({ type: 'error', text: '获取二维码失败，请重试' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!qrCodeInfo) return;

    try {
      const response = await fetch(qrCodeInfo.qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${qrCodeInfo.shopName || '商家'}_二维码.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMessage({ type: 'success', text: '二维码下载成功！' });
    } catch (e) {
      console.error('Failed to download QR code:', e);
      setMessage({ type: 'error', text: '下载失败，请重试' });
    }
  };

  const handleCopyLink = async () => {
    if (!qrCodeInfo) return;

    try {
      await navigator.clipboard.writeText(qrCodeInfo.qrCodeUrl);
      setCopied(true);
      setMessage({ type: 'success', text: '二维码链接已复制到剪贴板！' });
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy link:', e);
      setMessage({ type: 'error', text: '复制失败，请重试' });
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('确定要重新生成二维码吗？旧二维码将失效。')) {
      return;
    }

    setRegenerating(true);
    setMessage(null);

    try {
      const res = await api.post('/merchant/qrcode/generate');
      if (res.data.success) {
        setQRCodeInfo({
          qrCodeUrl: res.data.data.qrCodeUrl,
          shopName: res.data.data.shopName || '',
          name: res.data.data.name || ''
        });
        setMessage({ type: 'success', text: '二维码重新生成成功！' });
      } else {
        setMessage({ type: 'error', text: res.data.message || '重新生成失败' });
      }
    } catch (e) {
      console.error('Failed to regenerate QR code:', e);
      setMessage({ type: 'error', text: '重新生成失败，请重试' });
    } finally {
      setRegenerating(false);
    }
  };

  const handleShare = async () => {
    if (!qrCodeInfo) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${qrCodeInfo.name || qrCodeInfo.shopName}`,
          text: `扫描二维码访问${qrCodeInfo.name || qrCodeInfo.shopName}`,
          url: qrCodeInfo.qrCodeUrl,
        });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('Failed to share:', e);
          setMessage({ type: 'error', text: '分享失败，请重试' });
        }
      }
    } else {
      // Fallback: copy to clipboard
      handleCopyLink();
    }
  };

  const dismissMessage = () => {
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <QrCode className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">商家二维码管理</h1>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className={`
            flex items-center px-4 py-2 rounded-lg text-white font-medium transition-all
            ${regenerating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700 hover:shadow-md'}
          `}
        >
          {regenerating ? (
            <>
              <RefreshCw size={16} className="mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <RefreshCw size={16} className="mr-2" />
              重新生成
            </>
          )}
        </button>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`
          flex items-start p-4 rounded-lg text-sm
          ${message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'}
        `}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            {message.text}
          </div>
          <button
            onClick={dismissMessage}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {qrCodeInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 二维码展示 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">当前二维码</h2>
            </div>
            <div className="p-6 flex flex-col items-center space-y-4">
              <div className="relative">
                <img
                  src={qrCodeInfo.qrCodeUrl}
                  alt="商家二维码"
                  className="w-80 h-80 border-2 border-gray-200 rounded-lg object-contain bg-white shadow-lg"
                />
                <div className="absolute -top-3 -right-3">
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-full shadow-md">
                    有效
                  </span>
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold text-gray-900">{qrCodeInfo.name || qrCodeInfo.shopName}</p>
                <p className="text-sm text-gray-600">用户扫码后即可进入商家专属页面</p>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">二维码操作</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                  <QrCode size={16} className="mr-2" />
                  如何使用
                </h3>
                <p className="text-sm text-blue-800">
                  将此二维码打印出来，张贴在店铺显眼位置，或通过社交媒体分享给顾客。顾客扫码后即可进入您的小程序专属页面。
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                >
                  <Download size={18} className="mr-2" />
                  下载二维码
                </button>

                <button
                  onClick={handleCopyLink}
                  disabled={copied}
                  className={`
                    w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all border-2
                    ${copied
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'}
                  `}
                >
                  <Copy size={18} className="mr-2" />
                  {copied ? '已复制链接' : '复制链接'}
                </button>

                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-sm hover:shadow-md"
                >
                  <Share2 size={18} className="mr-2" />
                  分享二维码
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
        <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          重要提示
        </h3>
        <ul className="space-y-2 text-orange-800">
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span>二维码是您的店铺标识，请妥善保管，避免泄露给不法分子</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span>建议定期检查二维码的有效性，确保用户正常扫码访问</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span>如二维码损坏或失效，可点击"重新生成"按钮创建新的二维码</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span>重新生成二维码后，旧的二维码将立即失效，请及时更新店铺张贴的二维码</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span>用户扫码后会看到您的店铺名称、商品、奖品等专属内容</span>
          </li>
        </ul>
      </div>

      {/* 扫码统计 */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <QrCode className="h-5 w-5 mr-2 text-blue-600" />
          二维码效果追踪
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">总扫码次数</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">独立用户数</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">今日扫码</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-4 text-center">
          完整的扫码统计数据可在【数据统计】页面查看
        </p>
      </div>
    </div>
  );
};
