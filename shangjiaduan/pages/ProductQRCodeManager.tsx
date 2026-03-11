import React, { useState, useEffect } from 'react';
import { QrCode, Download, Search, RefreshCw, AlertCircle, CheckCircle, X, Loader2, Eye, Image, Package } from 'lucide-react';
import api from '../services/api';

interface ProductQRCode {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  tags: string[];
  imageCount: number;
  qrCodeUrl?: string;
}

export const ProductQRCodeManager: React.FC = () => {
  const [products, setProducts] = useState<ProductQRCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/merchant/products');
      if (res.data.success) {
        const productsWithQR = res.data.data.map((p: any) => ({
          ...p,
          qrCodeUrl: p.qrCodeUrl || null
        }));
        setProducts(productsWithQR || []);
      }
    } catch (e) {
      console.error('Failed to fetch products:', e);
      setMessage({ type: 'error', text: '获取商品失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQRCode = async (productId: number) => {
    setGenerating(productId);
    setMessage(null);
    try {
      const res = await api.post(`/merchant/qrcode/product`, { productId });
      if (res.data.success) {
        setProducts(prods =>
          prods.map(p =>
            p.id === productId
              ? { ...p, qrCodeUrl: res.data.data.qrCodeUrl }
              : p
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
    if (selectedProducts.size === 0) {
      setMessage({ type: 'error', text: '请先选择要生成二维码的商品' });
      return;
    }

    setBatchGenerating(true);
    setMessage(null);

    const selectedIds = Array.from(selectedProducts);
    let successCount = 0;
    let failCount = 0;

    for (const productId of selectedIds) {
      try {
        const res = await api.post(`/merchant/qrcode/product`, { productId });
        if (res.data.success) {
          setProducts(prods =>
            prods.map(p =>
              p.id === productId
                ? { ...p, qrCodeUrl: res.data.data.qrCodeUrl }
                : p
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
    setSelectedProducts(new Set());

    if (failCount === 0) {
      setMessage({ type: 'success', text: `成功生成 ${successCount} 个二维码！` });
    } else {
      setMessage({ type: 'error', text: `生成完成：成功 ${successCount} 个，失败 ${failCount} 个` });
    }
  };

  const handleDownload = async (qrCodeUrl: string, productName: string) => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productName}_二维码.png`;
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
    const unchecked = products
      .filter(p => !p.qrCodeUrl)
      .map(p => p.id);
    setSelectedProducts(new Set(unchecked));
  };

  const handleSelect = (id: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    p.tags.some(tag => tag.toLowerCase().includes(searchKeyword.toLowerCase()))
  );

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
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Package className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">商品二维码管理</h1>
        </div>
        <button
          onClick={handleBatchGenerate}
          disabled={batchGenerating || selectedProducts.size === 0}
          className={`
            flex items-center px-4 py-2 rounded-lg text-white font-medium transition-all
            ${batchGenerating || selectedProducts.size === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700 hover:shadow-md'}
          `}
        >
          {batchGenerating ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <RefreshCw size={16} className="mr-2" />
              批量生成 ({selectedProducts.size})
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

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索商品名称或标签..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSelectAll}
            className="px-4 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            全选未生成
          </button>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedProducts.size > 0 && selectedProducts.size === products.filter(p => !p.qrCodeUrl).length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleSelectAll();
                      } else {
                        setSelectedProducts(new Set());
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">商品名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">分类</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">标签</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">图片数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">二维码状态</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    暂无商品数据
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => handleSelect(product.id)}
                        disabled={!!product.qrCodeUrl}
                        className="rounded border-gray-300 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                    <td className="px-4 py-3 text-gray-600">{product.categoryName || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {product.tags?.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                        {(product.tags?.length || 0) > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{product.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.imageCount || 0}</td>
                    <td className="px-4 py-3">
                      {product.qrCodeUrl ? (
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          <CheckCircle size={12} className="mr-1" />
                          已生成
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          未生成
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {product.qrCodeUrl ? (
                          <>
                            <button
                              onClick={() => handlePreview(product.qrCodeUrl!)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="预览"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleDownload(product.qrCodeUrl!, product.name)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                              title="下载"
                            >
                              <Download size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleGenerateQRCode(product.id)}
                            disabled={generating === product.id}
                            className="flex items-center px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50"
                          >
                            {generating === product.id ? (
                              <Loader2 size={14} className="animate-spin mr-1" />
                            ) : (
                              <QrCode size={14} className="mr-1" />
                            )}
                            生成
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 预览弹窗 */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setPreviewUrl(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">二维码预览</h3>
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt="二维码预览"
                className="w-64 h-64 object-contain border-2 border-gray-200 rounded-lg"
              />
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => {
                  const product = products.find(p => p.qrCodeUrl === previewUrl);
                  if (product) {
                    handleDownload(previewUrl, product.name);
                  }
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download size={16} className="mr-2" />
                下载二维码
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
        <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          商品二维码说明
        </h3>
        <ul className="space-y-2 text-orange-800">
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span>商品二维码绑定商家ID+商品ID，顾客扫码后直接跳转到该商品的评价页面</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span>可以将商品二维码打印出来，张贴在对应商品区域或包装上</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span>支持批量选择未生成二维码的商品进行批量生成</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
