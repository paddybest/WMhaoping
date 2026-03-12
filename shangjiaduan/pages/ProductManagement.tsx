import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Folder, FolderOpen, ChevronRight, ChevronDown, Upload, X, RefreshCw, Image, QrCode, Download, Eye, CheckCircle, Loader2 } from 'lucide-react';
import { ProductEditModal } from '../components/ProductEditModal';
import { ImportProductsModal } from '../components/ImportProductsModal';
import api from '../services/api';

interface Category {
  id: number;
  name: string;
  parentId: number | null;
  level: number;
  children?: Category[];
}

interface Product {
  id: number;
  name: string;
  categoryId: number;
  imageCount: number;
  imageUrls?: string[];
  qrCodeUrl?: string;
  isActive: boolean;
  tags?: string[];
}

// 顶级分类（带标签）
interface TopLevelCategory {
  id: number;
  name: string;
  tags: string[];
}

export const ProductManagement: React.FC = () => {
  // 标签页状态
  const [activeTab, setActiveTab] = useState<'products' | 'qrcode'>('products');

  // 分类相关状态
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryExpanded, setCategoryExpanded] = useState<Set<number>>(new Set());

  // 产品相关状态
  const [products, setProducts] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);

  // Modal状态
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', parentId: null as number | null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 标签相关状态
  const [topLevelCategories, setTopLevelCategories] = useState<TopLevelCategory[]>([]);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState<number | null>(null);
  const [currentCategoryName, setCurrentCategoryName] = useState<string>('');
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [regeneratingCategoryId, setRegeneratingCategoryId] = useState<number | null>(null);

  // 二维码相关状态
  const [qrProductSearch, setQrProductSearch] = useState('');
  const [qrGenerating, setQrGenerating] = useState<number | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [batchQrGenerating, setBatchQrGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // 获取分类列表
  const fetchCategories = async () => {
    setCategoryLoading(true);
    try {
      const response = await api.get('/merchant/categories');
      setCategories(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      showNotification('error', error.response?.data?.error || '加载分类失败');
    } finally {
      setCategoryLoading(false);
    }
  };

  // 获取产品列表
  const fetchProducts = async () => {
    if (!selectedCategoryId) {
      setProducts([]);
      return;
    }
    setProductLoading(true);
    try {
      const response = await api.get('/merchant/products', {
        params: { categoryId: selectedCategoryId }
      });
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      showNotification('error', '加载产品失败');
    } finally {
      setProductLoading(false);
    }
  };

  // 获取顶级分类标签
  const fetchTags = async () => {
    try {
      const response = await api.get('/merchant/categories/top-level');
      const categories: TopLevelCategory[] = response.data?.data || [];
      setTopLevelCategories(categories);
    } catch (e) {
      console.error(e);
      setTopLevelCategories([]);
    }
  };

  // 重新生成标签
  const handleRegenerateTags = async (categoryId: number) => {
    setRegeneratingCategoryId(categoryId);
    try {
      const response = await api.post(`/merchant/categories/${categoryId}/regenerate-tags`);
      if (response.data.success) {
        await fetchTags();
        showNotification('success', '标签重新生成成功');
      }
    } catch (error: any) {
      console.error('Regenerate tags failed:', error);
      showNotification('error', error.response?.data?.error || '重新生成标签失败');
    } finally {
      setRegeneratingCategoryId(null);
    }
  };

  // 更新标签
  const handleUpdateTags = async (categoryId: number, tags: string[]) => {
    try {
      const response = await api.put(`/merchant/categories/${categoryId}/tags`, { tags });
      if (response.data.success) {
        await fetchTags();
        showNotification('success', '标签更新成功');
      }
    } catch (error: any) {
      console.error('Update tags failed:', error);
      showNotification('error', error.response?.data?.error || '更新标签失败');
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategoryId]);

  // 分类操作
  const toggleExpand = (id: number) => {
    const newExpanded = new Set(categoryExpanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setCategoryExpanded(newExpanded);
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategoryId(category.id);
  };

  const handleAddCategory = (parentId?: number) => {
    setEditingCategory(null);
    setCategoryFormData({ name: '', parentId: parentId || null });
    setCategoryModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({ name: category.name, parentId: category.parentId });
    setCategoryModalOpen(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!window.confirm(`确定要删除分类"${category.name}"吗？`)) return;
    try {
      await api.delete(`/merchant/categories/${category.id}`);
      showNotification('success', '删除成功');
      fetchCategories();
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      showNotification('error', error.response?.data?.error || '删除失败');
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name.trim()) {
      showNotification('error', '请输入分类名称');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await api.put(`/merchant/categories/${editingCategory.id}`, categoryFormData);
        showNotification('success', '更新成功');
      } else {
        await api.post('/merchant/categories', categoryFormData);
        showNotification('success', '创建成功');
      }
      setCategoryModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      showNotification('error', error.response?.data?.error || '保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 产品操作
  const handleAddProduct = () => {
    setEditingProduct(undefined);
    setProductModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductModalOpen(true);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`确定要删除产品"${product.name}"吗？`)) return;
    try {
      await api.delete(`/merchant/products/${product.id}`);
      showNotification('success', '删除成功');
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      showNotification('error', '删除失败');
    }
  };

  // 二维码操作
  const handleGenerateProductQR = async (productId: number) => {
    setQrGenerating(productId);
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
        showNotification('success', '二维码生成成功！');
      }
    } catch (error: any) {
      console.error('Failed to generate QR code:', error);
      showNotification('error', error.response?.data?.error || '生成失败');
    } finally {
      setQrGenerating(null);
    }
  };

  const handleBatchGenerateProductQR = async () => {
    if (selectedProducts.size === 0) {
      showNotification('error', '请先选择要生成二维码的商品');
      return;
    }

    setBatchQrGenerating(true);
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
      } catch (error) {
        console.error('Failed to generate:', error);
      }
    }

    setBatchQrGenerating(false);
    setSelectedProducts(new Set());
    showNotification('success', '批量生成完成');
  };

  const handleDownloadQR = async (qrCodeUrl: string, productName: string) => {
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
      showNotification('error', '下载失败');
    }
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

  // 渲染分类树
  const flattenCategories = (cats: Category[]): Category[] => {
    return cats.reduce((acc: Category[], cat: Category) => {
      acc.push(cat);
      if (cat.children) {
        acc.push(...flattenCategories(cat.children));
      }
      return acc;
    }, []);
  };

  const flatCategories = flattenCategories(categories);

  const renderCategoryTree = (category: Category, level: number = 0) => {
    const isExpanded = categoryExpanded.has(category.id);
    const hasChildren = category.children && category.children.length > 0;
    const isSelected = selectedCategoryId === category.id;

    return (
      <div key={category.id} style={{ marginLeft: `${level * 20}px` }}>
        <div
          className={`flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
          onClick={() => handleCategorySelect(category)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(category.id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <div style={{ width: '24px' }} />
          )}
          {isExpanded ? <FolderOpen size={18} className="text-yellow-500" /> : <Folder size={18} className="text-yellow-500" />}
          <span className="flex-1">{category.name}</span>
          <button onClick={(e) => { e.stopPropagation(); handleAddCategory(category.id); }} className="p-1 hover:bg-gray-200 rounded" title="添加子分类">
            <Plus size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleEditCategory(category); }} className="p-1 hover:bg-gray-200 rounded" title="编辑">
            <Edit size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category); }} className="p-1 hover:bg-red-100 text-red-500 rounded" title="删除">
            <Trash2 size={16} />
          </button>
        </div>
        {isExpanded && hasChildren && (
          <div>{category.children!.map(child => renderCategoryTree(child, level + 1))}</div>
        )}
      </div>
    );
  };

  // 显示所有产品（不再按搜索过滤）
  const filteredProducts = products;

  return (
    <div className="p-8">
      {/* 页面标题和标签页 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">商品管理</h1>
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'products'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload size={18} />
            商品管理
          </button>
          <button
            onClick={() => setActiveTab('qrcode')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'qrcode'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <QrCode size={18} />
            商品二维码
          </button>
        </div>
      </div>

      {notification && (
        <div className={`mb-4 p-4 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {notification.message}
        </div>
      )}

      {/* 标签页内容 */}
      {activeTab === 'products' ? (
        <div className="flex flex-col gap-6">
        {/* 分类Modal */}
        {categoryModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-96">
              <h2 className="text-xl font-semibold mb-4">
                {editingCategory ? '编辑分类' : '添加分类'}
              </h2>
              <form onSubmit={handleCategorySubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">分类名称</label>
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                    maxLength={50}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setCategoryModalOpen(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    disabled={isSubmitting}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '提交中...' : (editingCategory ? '更新' : '创建')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 产品Modal */}
        {productModalOpen && (
          <ProductEditModal
            product={editingProduct}
            categories={flatCategories}
            defaultCategoryId={editingProduct?.categoryId || selectedCategoryId}
            onSave={(createdCategoryId?: number) => {
              setProductModalOpen(false);
              const fetchCategoryId = createdCategoryId || selectedCategoryId;
              setSelectedCategoryId(fetchCategoryId);
            }}
            onClose={() => setProductModalOpen(false)}
          />
        )}

        {/* 标签Modal - 编辑分类标签 */}
        {tagModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">编辑分类标签 - {currentCategoryName}</h2>
                <button onClick={() => setTagModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (currentCategoryId) {
                  handleUpdateTags(currentCategoryId, editingTags);
                  setTagModalOpen(false);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">标签（6个，每个1-4个字符）</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <input
                        key={index}
                        type="text"
                        value={editingTags[index] || ''}
                        onChange={(e) => {
                          const newTags = [...editingTags];
                          newTags[index] = e.target.value.slice(0, 4);
                          setEditingTags(newTags);
                        }}
                        className="border border-gray-300 rounded-lg p-2 text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder={`标签${index + 1}`}
                        maxLength={4}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={() => setTagModalOpen(false)} className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all">取消</button>
                  <button type="submit" className="px-4 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all">保存</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 上方分类管理 */}
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">分类管理</h2>
            <button
              onClick={() => handleAddCategory()}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              添加根分类
            </button>
          </div>
          {categoryLoading ? (
            <p className="text-center py-8">加载中...</p>
          ) : categories.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无分类，请添加根分类</p>
          ) : (
            <div className="max-h-48 overflow-y-auto">{categories.map(category => renderCategoryTree(category))}</div>
          )}
        </div>

        {/* 标签管理 */}
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">分类标签管理</h2>
            <p className="text-sm text-gray-500">每个顶级分类包含6个标签，子分类继承顶级分类的标签，点击编辑可修改</p>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">顶级分类</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">标签（6个）</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topLevelCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <Folder size={14} className="text-yellow-500 mr-2" />
                        {cat.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {cat.tags && cat.tags.length > 0 ? (
                          cat.tags.filter(t => t).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-md"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">暂无标签</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          // 设置当前编辑的分类标签
                          setCurrentCategoryId(cat.id);
                          setCurrentCategoryName(cat.name);
                          setEditingTags(cat.tags || []);
                          setTagModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleRegenerateTags(cat.id)}
                        disabled={regeneratingCategoryId === cat.id}
                        className="text-purple-600 hover:text-purple-800 text-xs disabled:opacity-50"
                      >
                        {regeneratingCategoryId === cat.id ? (
                          <><RefreshCw size={12} className="inline mr-1 animate-spin" />生成中</>
                        ) : (
                          'AI重新生成'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
                {topLevelCategories.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      暂无顶级分类，请在分类管理中添加分类
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 下方产品列表 */}
        <div className="flex-1 border rounded-lg p-4 bg-white">
          <h2 className="text-lg font-semibold mb-4">产品管理</h2>
          {/* 操作按钮栏 */}
          <div className="flex gap-4 mb-4">
            <button
              onClick={handleAddProduct}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Plus size={20} className="inline mr-2" />
              添加产品
            </button>
            <button
              onClick={() => setImportModalOpen(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              <Upload size={20} className="inline mr-2" />
              导入
            </button>
          </div>

          {/* 产品列表 */}
          {productLoading ? (
            <div className="text-center py-8">加载中...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {selectedCategoryId ? '暂无产品' : '请先在上方选择分类'}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                  {/* 产品图片 */}
                  <div className="aspect-square bg-gray-100 relative">
                    {product.imageUrls && product.imageUrls.length > 0 ? (
                      <img
                        src={product.imageUrls[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Upload size={32} />
                      </div>
                    )}
                    {/* 图片数量标签 */}
                    {product.imageCount > 0 && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full flex items-center">
                        <Image size={12} className="mr-1" />
                        {product.imageCount}
                      </div>
                    )}
                    {/* 悬停操作按钮 */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 transform hover:scale-110 transition-all"
                        title="编辑"
                      >
                        <Edit size={18} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product)}
                        className="p-2 bg-white rounded-lg shadow hover:bg-red-50 transform hover:scale-110 transition-all"
                        title="删除"
                      >
                        <Trash2 size={18} className="text-red-500" />
                      </button>
                    </div>
                    {/* 二维码标识 */}
                    {product.qrCodeUrl && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                        <QrCode size={10} className="mr-1" />
                        已生成
                      </div>
                    )}
                  </div>
                  {/* 产品信息 */}
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 truncate" title={product.name}>{product.name}</h3>
                    {!product.isActive && (
                      <div className="mt-1 text-xs text-orange-500 font-medium">已停用</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      ) : (
      <div className="space-y-4">
        {/* 二维码统计 */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-orange-600" />
              <span className="text-sm text-gray-600">商品总数：</span>
              <span className="text-lg font-bold text-gray-900">{products.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-600">已生成：</span>
              <span className="text-lg font-bold text-green-600">{products.filter(p => p.qrCodeUrl).length}</span>
            </div>
          </div>
        </div>

        {/* 操作栏 */}
        <div className="flex justify-end gap-2">
          <button
            onClick={handleProductSelectAll}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            全选未生成
          </button>
          <button
            onClick={handleBatchGenerateProductQR}
            disabled={selectedProducts.size === 0 || batchQrGenerating}
            className={`px-4 py-2 rounded-lg font-medium flex items-center ${
              selectedProducts.size === 0 || batchQrGenerating
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
          >
              {batchQrGenerating ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <QrCode size={16} className="mr-2" />
              )}
              批量生成 ({selectedProducts.size})
            </button>
          </div>
        </div>

        {/* 商品列表 */}
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
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    暂无商品数据，请在商品管理中添加商品
                  </td>
                </tr>
              ) : (
                products.map((product) => (
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
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {categories.find(c => c.id === product.categoryId)?.name || '-'}
                    </td>
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
                            onClick={() => handleDownloadQR(product.qrCodeUrl!, product.name)}
                            className="text-green-600 hover:text-green-900 p-1"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleGenerateProductQR(product.id)}
                            disabled={qrGenerating === product.id}
                            className="text-orange-600 hover:text-orange-900 p-1"
                          >
                            <RefreshCw size={16} className={qrGenerating === product.id ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateProductQR(product.id)}
                          disabled={qrGenerating === product.id}
                          className="text-orange-600 hover:text-orange-900 flex items-center justify-end w-full"
                        >
                          {qrGenerating === product.id ? (
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

      {/* 导入Modal */}
      {importModalOpen && (
        <ImportProductsModal
          categories={flatCategories}
          onClose={() => setImportModalOpen(false)}
          onImportSuccess={() => {
            setImportModalOpen(false);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
};
