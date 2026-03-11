import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { MerchantProfile } from '../types';
import {
  Save, Store, Phone, MapPin, FileText, User, Upload, X, Image as ImageIcon,
  QrCode, Package, Download, Search, RefreshCw, AlertCircle, CheckCircle, Loader2, Eye
} from 'lucide-react';

// Category QR Code types
interface CategoryQRCode {
  id: number;
  name: string;
  parentId: number | null;
  level: number;
  parentName: string;
  tags: string[];
  qrCodeUrl?: string;
}

// Product QR Code types
interface ProductQRCode {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  tags: string[];
  imageCount: number;
  qrCodeUrl?: string;
}

type TabType = 'info' | 'customer-service' | 'category-qr' | 'product-qr';

export const MerchantInfo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // Basic info state
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Category QR state
  const [categories, setCategories] = useState<CategoryQRCode[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryGenerating, setCategoryGenerating] = useState<number | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());
  const [batchCategoryGenerating, setBatchCategoryGenerating] = useState(false);

  // Product QR state
  const [products, setProducts] = useState<ProductQRCode[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productGenerating, setProductGenerating] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [batchProductGenerating, setBatchProductGenerating] = useState(false);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'category-qr') {
      fetchCategories();
    } else if (activeTab === 'product-qr') {
      fetchProducts();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/merchant/auth/profile');
      if (res.data.success) {
        setProfile(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch merchant profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCategoryLoading(true);
    try {
      const res = await api.get('/merchant/categories/level2');
      if (res.data.success) {
        setCategories(res.data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch categories:', e);
    } finally {
      setCategoryLoading(false);
    }
  };

  const fetchProducts = async () => {
    setProductLoading(true);
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
    } finally {
      setProductLoading(false);
    }
  };

  // Basic info handlers
  const handleUploadQRCode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image/')) {
      alert('请上传图片文件');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'customer_service_qr');

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setProfile({ ...profile!, customerServiceQrUrl: res.data.url });
        setMessage({ type: 'success', text: '客服二维码上传成功！' });
      }
    } catch (e) {
      console.error('Upload error:', e);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveQRCode = async () => {
    if (!confirm('确定要删除客服二维码吗？')) return;

    setUploading(true);
    try {
      const res = await api.put('/merchant/auth/profile', {
        customerServiceQrUrl: null
      });

      if (res.data.success) {
        setProfile({ ...profile!, customerServiceQrUrl: undefined });
        setMessage({ type: 'success', text: '客服二维码已删除！' });
      }
    } catch (e) {
      console.error('Remove error:', e);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put('/merchant/auth/profile', {
        name: profile.shopName,
        contact_phone: profile.contact_phone,
        address: profile.address,
        description: profile.description,
        customerServiceQrUrl: profile.customerServiceQrUrl
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: '商家信息更新成功！' });
        await fetchProfile();
      } else {
        setMessage({ type: 'error', text: res.data.message || '更新失败' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: '更新失败，请重试。' });
    } finally {
      setSaving(false);
    }
  };

  // Category QR handlers
  const handleGenerateCategoryQR = async (categoryId: number) => {
    setCategoryGenerating(categoryId);
    setMessage(null);
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
        setMessage({ type: 'success', text: '二维码生成成功！' });
      }
    } catch (e) {
      console.error('Failed to generate QR code:', e);
    } finally {
      setCategoryGenerating(null);
    }
  };

  const handleBatchGenerateCategoryQR = async () => {
    if (selectedCategories.size === 0) return;

    setBatchCategoryGenerating(true);
    const selectedIds = Array.from(selectedCategories);

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
        }
      } catch (e) {
        console.error('Failed to generate:', e);
      }
    }

    setBatchCategoryGenerating(false);
    setSelectedCategories(new Set());
  };

  const handleCategorySelect = (id: number) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCategories(newSelected);
  };

  const handleCategorySelectAll = () => {
    const unchecked = categories
      .filter(cat => !cat.qrCodeUrl)
      .map(cat => cat.id);
    setSelectedCategories(new Set(unchecked));
  };

  // Product QR handlers
  const handleGenerateProductQR = async (productId: number) => {
    setProductGenerating(productId);
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
      }
    } catch (e) {
      console.error('Failed to generate QR code:', e);
    } finally {
      setProductGenerating(null);
    }
  };

  const handleBatchGenerateProductQR = async () => {
    if (selectedProducts.size === 0) return;

    setBatchProductGenerating(true);
    const selectedIds = Array.from(selectedProducts);

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
        }
      } catch (e) {
        console.error('Failed to generate:', e);
      }
    }

    setBatchProductGenerating(false);
    setSelectedProducts(new Set());
  };

  const handleProductSelect = (id: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const handleProductSelectAll = () => {
    const unchecked = products
      .filter(p => !p.qrCodeUrl)
      .map(p => p.id);
    setSelectedProducts(new Set(unchecked));
  };

  // Download handler
  const handleDownload = async (qrCodeUrl: string, name: string) => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}_二维码.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to download:', e);
    }
  };

  // Filtered data
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
    cat.parentName.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const hasCategoryQRCount = categories.filter(cat => cat.qrCodeUrl).length;
  const hasProductQRCount = products.filter(p => p.qrCodeUrl).length;

  if (loading) {
    return <div className="text-center py-10 text-gray-500">加载中...</div>;
  }

  const renderTabButton = (tab: TabType, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
        activeTab === tab
          ? 'border-b-2 border-blue-500 text-blue-600'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">商家中心</h1>
        <p className="text-sm text-gray-500 mt-1">管理您的店铺信息、二维码和推广素材</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {renderTabButton('info', '基本信息', <Store size={18} />)}
        {renderTabButton('customer-service', '客服二维码', <QrCode size={18} />)}
        {renderTabButton('category-qr', '分类二维码', <Package size={18} />)}
        {renderTabButton('product-qr', '商品二维码', <Package size={18} />)}
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'info' && profile && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
                {profile.shopName?.[0] || '店'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{profile.shopName}</h2>
                <p className="text-sm text-gray-500">账号: {profile.username}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Store size={16} className="mr-2 text-gray-400"/> 店铺名称
                </label>
                <input
                  type="text"
                  value={profile.shopName}
                  onChange={e => setProfile({ ...profile, shopName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <User size={16} className="mr-2 text-gray-400"/> 用户名 (只读)
                </label>
                <input
                  type="text"
                  value={profile.username}
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg p-2.5 text-gray-500"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Phone size={16} className="mr-2 text-gray-400"/> 联系电话
                </label>
                <input
                  type="text"
                  value={profile.contact_phone || ''}
                  onChange={e => setProfile({ ...profile, contact_phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <MapPin size={16} className="mr-2 text-gray-400"/> 店铺地址
                </label>
                <input
                  type="text"
                  value={profile.address || ''}
                  onChange={e => setProfile({ ...profile, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FileText size={16} className="mr-2 text-gray-400"/> 店铺简介
                </label>
                <textarea
                  rows={4}
                  value={profile.description || ''}
                  onChange={e => setProfile({ ...profile, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className={`flex items-center px-6 py-2.5 rounded-lg text-white font-medium ${
                  saving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Save size={18} className="mr-2" />
                {saving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customer Service QR Tab */}
      {activeTab === 'customer-service' && profile && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="max-w-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">客服二维码</h2>
            <p className="text-sm text-gray-500 mb-6">上传您的微信客服二维码，顾客扫码可直接添加好友</p>

            <div className="flex items-center space-x-4">
              {profile.customerServiceQrUrl ? (
                <div className="flex items-center space-x-3">
                  <img
                    src={profile.customerServiceQrUrl}
                    alt="客服二维码"
                    className="w-40 h-40 object-contain border border-gray-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveQRCode}
                    disabled={uploading}
                    className="flex items-center px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                  >
                    <X size={16} className="mr-1" />
                    删除
                  </button>
                </div>
              ) : (
                <label className="flex items-center px-8 py-12 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadQRCode}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Upload size={24} className="mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {uploading ? '上传中...' : '点击上传客服二维码'}
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category QR Tab */}
      {activeTab === 'category-qr' && (
        <div className="space-y-4">
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
                <span className="text-sm text-gray-600">已生成：</span>
                <span className="text-lg font-bold text-green-600">{hasCategoryQRCount}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索分类名称..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCategorySelectAll}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                全选未生成
              </button>
              <button
                onClick={handleBatchGenerateCategoryQR}
                disabled={selectedCategories.size === 0 || batchCategoryGenerating}
                className={`px-4 py-2 rounded-lg font-medium flex items-center ${
                  selectedCategories.size === 0 || batchCategoryGenerating
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {batchCategoryGenerating ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <QrCode size={16} className="mr-2" />
                )}
                批量生成 ({selectedCategories.size})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">选择</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">一级分类</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">二级分类</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">状态</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase w-40">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categoryLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      <Loader2 className="animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      暂无分类数据
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(cat.id)}
                          onChange={() => handleCategorySelect(cat.id)}
                          disabled={!!cat.qrCodeUrl}
                          className="rounded border-gray-300 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{cat.parentName}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{cat.name}</td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4 text-right">
                        {cat.qrCodeUrl ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setPreviewUrl(cat.qrCodeUrl!)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleDownload(cat.qrCodeUrl!, cat.name)}
                              className="text-green-600 hover:text-green-900 p-1"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => handleGenerateCategoryQR(cat.id)}
                              disabled={categoryGenerating === cat.id}
                              className="text-orange-600 hover:text-orange-900 p-1"
                            >
                              <RefreshCw size={16} className={categoryGenerating === cat.id ? 'animate-spin' : ''} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGenerateCategoryQR(cat.id)}
                            disabled={categoryGenerating === cat.id}
                            className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full"
                          >
                            {categoryGenerating === cat.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <>
                                <QrCode size={16} className="mr-1" />
                                生成
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product QR Tab */}
      {activeTab === 'product-qr' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                <span className="text-sm text-gray-600">商品总数：</span>
                <span className="text-lg font-bold text-gray-900">{products.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-600">已生成：</span>
                <span className="text-lg font-bold text-green-600">{hasProductQRCount}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索商品名称..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleProductSelectAll}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                全选未生成
              </button>
              <button
                onClick={handleBatchGenerateProductQR}
                disabled={selectedProducts.size === 0 || batchProductGenerating}
                className={`px-4 py-2 rounded-lg font-medium flex items-center ${
                  selectedProducts.size === 0 || batchProductGenerating
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                {batchProductGenerating ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <QrCode size={16} className="mr-2" />
                )}
                批量生成 ({selectedProducts.size})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">选择</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">分类</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">状态</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase w-40">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      <Loader2 className="animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      暂无商品数据
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => handleProductSelect(product.id)}
                          disabled={!!product.qrCodeUrl}
                          className="rounded border-gray-300 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{product.categoryName || '-'}</td>
                      <td className="px-6 py-4">
                        {product.qrCodeUrl ? (
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
                      <td className="px-6 py-4 text-right">
                        {product.qrCodeUrl ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setPreviewUrl(product.qrCodeUrl!)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleDownload(product.qrCodeUrl!, product.name)}
                              className="text-green-600 hover:text-green-900 p-1"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => handleGenerateProductQR(product.id)}
                              disabled={productGenerating === product.id}
                              className="text-orange-600 hover:text-orange-900 p-1"
                            >
                              <RefreshCw size={16} className={productGenerating === product.id ? 'animate-spin' : ''} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGenerateProductQR(product.id)}
                            disabled={productGenerating === product.id}
                            className="text-orange-600 hover:text-orange-900 flex items-center justify-end w-full"
                          >
                            {productGenerating === product.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <>
                                <QrCode size={16} className="mr-1" />
                                生成
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
