import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Category } from '../types';
import { Plus, Pencil, Trash2, X, Search, ChevronLeft, ChevronRight, Loader2, AlertCircle, ChevronDown } from 'lucide-react';

// Interface for flat display with hierarchy info
interface CategoryDisplay extends Category {
  parentName?: string;
  level: number;
}

export const Categories: React.FC = () => {
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [displayCategories, setDisplayCategories] = useState<CategoryDisplay[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination & Search state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Available parent categories for dropdown (only level 0 categories without children)
  const [availableParentCategories, setAvailableParentCategories] = useState<Category[]>([]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchKeyword);
      setCurrentPage(1); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    fetchCategories();
  }, [currentPage, debouncedSearch]);

  // Flatten tree to array for display and pagination
  const flattenCategories = (tree: Category[], parentName?: string): CategoryDisplay[] => {
    let result: CategoryDisplay[] = [];
    for (const cat of tree) {
      result.push({
        ...cat,
        parentName,
        level: cat.level || 0
      });
      if (cat.children && cat.children.length > 0) {
        result = result.concat(flattenCategories(cat.children, cat.name));
      }
    }
    return result;
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      // Get tree structure from API
      const res = await api.get('/merchant/categories');

      const tree = res.data?.data || [];

      // Store tree for parent category selection
      setCategoryTree(tree);

      // Flatten for display
      const flatCategories = flattenCategories(tree);

      // Filter by search keyword
      const filtered = debouncedSearch
        ? flatCategories.filter(cat => cat.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
        : flatCategories;

      // Pagination
      const itemsPerPage = 10;
      const total = filtered.length;
      const pages = Math.ceil(total / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const pagedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

      setDisplayCategories(pagedItems);
      setTotalItems(total);
      setTotalPages(pages || 1);

      // Calculate available parent categories (level 0 categories without children)
      const availableParents = tree.filter((cat: Category) => {
        const catLevel = cat.level || 0;
        // Only allow level 0 as parent, and only if it doesn't have children
        return catLevel === 0 && (!cat.children || cat.children.length === 0);
      });
      setAvailableParentCategories(availableParents);
    } catch (e) {
      console.error("Failed to fetch categories", e);
      // Mock data for demonstration if API fails
      if (!debouncedSearch) {
        const mockTree: Category[] = [
          { id: 1, name: '美食', level: 0, orderIndex: 1, children: [
            { id: 11, name: '中餐', level: 1, orderIndex: 1, parentId: 1 },
            { id: 12, name: '西餐', level: 1, orderIndex: 2, parentId: 1 },
          ]},
          { id: 2, name: '服务', level: 0, orderIndex: 2, children: [] },
          { id: 3, name: '环境', level: 0, orderIndex: 3, children: [] },
        ];
        setCategoryTree(mockTree);
        const flatMock = flattenCategories(mockTree);
        setDisplayCategories(flatMock);
        setTotalItems(flatMock.length);
        setTotalPages(1);
        setAvailableParentCategories(mockTree.filter(c => c.level === 0 && (!c.children || c.children.length === 0)));
      } else {
        setDisplayCategories([]);
        setTotalItems(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除该类目吗？此操作不可恢复。')) return;

    try {
      await api.delete(`/merchant/categories/${id}`);
      fetchCategories(); // Refresh list
    } catch (e: any) {
      const msg = e.response?.data?.message || '删除失败，请检查该类目下是否仍有标签关联。';
      alert(msg);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentCategory.name?.trim()) {
        setErrorMessage('类目名称不能为空');
        return;
    }

    // Validate parent category selection
    const parentId = currentCategory.parentId;
    if (parentId) {
      // Check if parent category still exists and is level 0
      const parentCat = categoryTree.find(c => c.id === parentId);
      if (!parentCat) {
        setErrorMessage('父分类不存在');
        return;
      }
      if ((parentCat.level || 0) !== 0) {
        setErrorMessage('只能选择一级分类作为父分类');
        return;
      }
      if (parentCat.children && parentCat.children.length > 0) {
        setErrorMessage('该一级分类已有子分类，不能再添加');
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        name: currentCategory.name,
        orderIndex: Number(currentCategory.orderIndex) || 0,
        parentId: parentId || null
      };

      if (currentCategory.id) {
        await api.put(`/merchant/categories/${currentCategory.id}`, payload);
      } else {
        await api.post('/merchant/categories', payload);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (e: any) {
      setErrorMessage(e.response?.data?.message || '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const openModal = (category?: Category) => {
      setErrorMessage('');

      if (category) {
        // Editing existing category
        setCurrentCategory({
          ...category,
          orderIndex: category.orderIndex,
          parentId: category.parentId
        });
      } else {
        // Creating new category - default to no parent (level 0)
        setCurrentCategory({ orderIndex: 0, name: '', parentId: undefined });
      }
      setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">类目管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理商品或服务的评价分类维度</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 flex items-center justify-center shadow-sm transition-all"
        >
          <Plus size={18} className="mr-2" />
          新建类目
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="搜索类目名称..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类目名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">父分类</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">层级</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">排序值</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayCategories.length > 0 ? (
                displayCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{cat.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cat.level === 1 && <span className="text-blue-600 mr-1">├─</span>}
                      {cat.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cat.parentName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cat.level === 0 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {cat.level === 0 ? '一级' : '二级'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {cat.orderIndex ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => openModal(cat)}
                        className="text-blue-600 hover:text-blue-900 mr-4 inline-flex items-center"
                        title="编辑"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(cat.id)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {loading ? '加载中...' : '暂无数据'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-500">
              共 <span className="font-medium">{totalItems}</span> 条数据
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-gray-700 px-2">
                第 {currentPage} / {totalPages} 页
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">
                {currentCategory.id ? '编辑类目' : '新建类目'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start">
                  <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                  {errorMessage}
                </div>
              )}

              {/* Parent Category Selector - Only show for new category or editing level 1 */}
              {!currentCategory.id || (currentCategory.level === 1) ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    父分类
                  </label>
                  <div className="relative">
                    <select
                      value={currentCategory.parentId ?? ''}
                      onChange={e => setCurrentCategory({
                        ...currentCategory,
                        parentId: e.target.value ? Number(e.target.value) : undefined
                      })}
                      className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow appearance-none bg-white"
                    >
                      <option value="">无（创建一级分类）</option>
                      {availableParentCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    选择一级分类作为父分类，将创建二级分类；不选择则为一级分类
                  </p>
                  {availableParentCategories.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      暂无可用的一级分类（所有一级分类已有子分类或尚无分类）
                    </p>
                  )}
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  类目名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={currentCategory.name || ''}
                  onChange={e => setCurrentCategory({ ...currentCategory, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                  placeholder="例如：口味、服务"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  排序值
                </label>
                <input
                  type="number"
                  value={currentCategory.orderIndex ?? 0}
                  onChange={e => setCurrentCategory({ ...currentCategory, orderIndex: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                  placeholder="数值越小越靠前"
                />
                <p className="text-xs text-gray-500 mt-1">控制在前端展示的顺序，数值越小越靠前</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`
                    px-4 py-2 text-white rounded-lg font-medium flex items-center shadow-sm transition-all
                    ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'}
                  `}
                >
                  {isSaving && <Loader2 size={16} className="animate-spin mr-2" />}
                  {isSaving ? '保存中...' : '确认保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};