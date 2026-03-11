import React, { useState, useEffect } from 'react';
import { QrCode, Download, Search, RefreshCw, AlertCircle, CheckCircle, X, Loader2, Eye, Image } from 'lucide-react';
import api from '../services/api';

interface CategoryQRCode {
  id: number;
  name: string;
  parentId: number | null;
  level: number;
  parentName: string;
  tags: string[];
  qrCodeUrl?: string;
}

export const CategoryQRCodeManager: React.FC = () => {
  const [categories, setCategories] = useState<CategoryQRCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/merchant/categories/level2');
      if (res.data.success) {
        setCategories(res.data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch categories:', e);
      setMessage({ type: 'error', text: '获取分类失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQRCode = async (categoryId: number) => {
    setGenerating(categoryId);
    setMessage(null);
    try {
      const res = await api.post(`/merchant/categories/${categoryId}/qrcode`);
      if (res.data.success) {
        // 更新本地数据
        setCategories(cats =>
          cats.map(cat =>
            cat.id === categoryId
              ? { ...cat, qrCodeUrl: res.data.data.qrCodeUrl }
              : cat
          )
        );
        setMessage({ type: 'success', text: '二维码生成成功！' });
      } else {
        setMessage({ type: 'error', text: res.data.error || '生成失败' });
      }
    } catch (e: any) {
      console.error('Failed to generate QR code:', e);
      setMessage({ type: 'error', text: e.response?.data?.error || '生成失败' });
    } finally {
      setGenerating(null);
    }
  };

  const handleBatchGenerate = async () => {
    if (selectedCategories.size === 0) {
      setMessage({ type: 'error', text: '请先选择要生成二维码的分类' });
      return;
    }

    setBatchGenerating(true);
    setMessage(null);

    const selectedIds = Array.from(selectedCategories);
    let successCount = 0;
    let failCount = 0;

    for (const categoryId of selectedIds) {
      try {
        const res = await api.post(`/merchant/categories/${categoryId}/qrcode`);
        if (res.data.success) {
          setCategories(cats =>
            cats.map(cat =>
              cat.id === categoryId
                ? { ...cat, qrCodeUrl: res.data.data.qrCodeUrl }
                : cat
            )
          );
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
      }
    }

    setBatchGenerating(false);
    setSelectedCategories(new Set());

    if (failCount === 0) {
      setMessage({ type: 'success', text: `成功生成 ${successCount} 个二维码！` });
    } else {
      setMessage({ type: 'error', text: `生成完成：成功 ${successCount} 个，失败 ${failCount} 个` });
    }
  };

  const handleDownload = async (qrCodeUrl: string, categoryName: string) => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${categoryName}_二维码.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to download:', e);
      setMessage({ type: 'error', text: '下载失败' });
    }
  };

  const handlePreview = (qrCodeUrl: string) => {
    setPreviewUrl(qrCodeUrl);
  };

  const handleSelectAll = () => {
    // 只选择还没有二维码的分类
    const unchecked = categories
      .filter(cat => !cat.qrCodeUrl)
      .map(cat => cat.id);
    setSelectedCategories(new Set(unchecked));
  };

  const handleSelect = (id: number) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCategories(newSelected);
  };

  // 过滤分类
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    cat.parentName.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const hasQRCodeCount = categories.filter(cat => cat.qrCodeUrl).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">分类二维码管理</h1>
          <p className="text-sm text-gray-500 mt-1">为二级分类生成专属二维码，用户扫码可直接选择该分类下的商品</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            全选未生成
          </button>
          <button
            onClick={handleBatchGenerate}
            disabled={selectedCategories.size === 0 || batchGenerating}
            className={`
              px-4 py-2 rounded-lg font-medium flex items-center transition-all
              ${selectedCategories.size === 0 || batchGenerating
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'}
            `}
          >
            {batchGenerating ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <QrCode size={16} className="mr-2" />
                批量生成 ({selectedCategories.size})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Message */}
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
          <div className="flex-1">{message.text}</div>
          <button onClick={() => setMessage(null)} className="ml-2 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">二级分类总数：</span>
            <span className="text-lg font-bold text-gray-900">{categories.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm text-gray-600">已生成二维码：</span>
            <span className="text-lg font-bold text-green-600">{hasQRCodeCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <span className="text-sm text-gray-600">待生成：</span>
            <span className="text-lg font-bold text-orange-600">{categories.length - hasQRCodeCount}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索分类名称或父分类..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedCategories.size > 0 && selectedCategories.size === categories.filter(c => !c.qrCodeUrl).length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">一级分类</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">二级分类</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">状态</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(cat.id)}
                        onChange={() => handleSelect(cat.id)}
                        disabled={!!cat.qrCodeUrl}
                        className="rounded border-gray-300 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{cat.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cat.parentName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {cat.qrCodeUrl ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle size={12} className="mr-1" />
                          已生成
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          待生成
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {cat.qrCodeUrl ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePreview(cat.qrCodeUrl!)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="预览"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDownload(cat.qrCodeUrl!, cat.name)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="下载"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleGenerateQRCode(cat.id)}
                            disabled={generating === cat.id}
                            className="text-orange-600 hover:text-orange-900 p-1"
                            title="重新生成"
                          >
                            <RefreshCw size={16} className={generating === cat.id ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateQRCode(cat.id)}
                          disabled={generating === cat.id}
                          className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full"
                        >
                          {generating === cat.id ? (
                            <Loader2 size={16} className="animate-spin mr-1" />
                          ) : (
                            <QrCode size={16} className="mr-1" />
                          )}
                          生成
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {categories.length === 0 ? '暂无二级分类，请先在分类管理中创建' : '没有匹配的分类'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewUrl(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">二维码预览</h3>
              <button onClick={() => setPreviewUrl(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <img src={previewUrl} alt="二维码预览" className="w-64 h-64 border-2 border-gray-200 rounded-lg" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = previewUrl;
                  link.download = '二维码预览.png';
                  link.click();
                }}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download size={16} className="mr-2" />
                下载
              </button>
              <button
                onClick={() => setPreviewUrl(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
