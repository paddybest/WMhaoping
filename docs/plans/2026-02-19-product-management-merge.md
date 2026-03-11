# 商品管理和分类管理整合实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将商品管理(ProductManager)和分类管理(ProductCategories)两个页面整合成一个页面，保持所有现有功能

**Architecture:** 采用左右分栏布局 - 左侧显示分类树，右侧显示产品列表。选择分类时右侧自动显示该分类下的产品

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react

---

### Task 1: 创建新的整合页面文件

**Files:**
- Create: `shangjiaduan/pages/ProductManagement.tsx`

**Step 1: 创建 ProductManagement.tsx 文件**

创建新文件，合并两个页面的功能:

```tsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { ProductEditModal } from '../components/ProductEditModal';
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
  tags: string[];
  imageCount: number;
  isActive: boolean;
}

export const ProductManagement: React.FC = () => {
  // 分类相关状态
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryExpanded, setCategoryExpanded] = useState<Set<number>>(new Set());

  // 产品相关状态
  const [products, setProducts] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal状态
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', parentId: null as number | null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  useEffect(() => {
    fetchCategories();
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

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">商品管理</h1>

      {notification && (
        <div className={`mb-4 p-4 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {notification.message}
        </div>
      )}

      <div className="flex gap-6">
        {/* 左侧分类树 */}
        <div className="w-1/3 border rounded-lg p-4 bg-white">
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
            <div>{categories.map(category => renderCategoryTree(category))}</div>
          )}
        </div>

        {/* 右侧产品列表 */}
        <div className="w-2/3">
          {/* 筛选栏 */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">当前分类</label>
                <div className="p-2 bg-gray-100 rounded">
                  {flatCategories.find(c => c.id === selectedCategoryId)?.name || '请在左侧选择分类'}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">搜索</label>
                <div className="relative">
                  <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border rounded-lg pl-10 pr-3 py-2"
                    placeholder="搜索产品名称或标签"
                  />
                </div>
              </div>
              <button
                onClick={handleAddProduct}
                disabled={!selectedCategoryId}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed mt-6"
              >
                <Plus size={20} className="inline mr-2" />
                添加产品
              </button>
            </div>
          </div>

          {/* 产品列表 */}
          {productLoading ? (
            <div className="text-center py-8">加载中...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {selectedCategoryId ? '暂无产品' : '请先在左侧选择分类'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditProduct(product)} className="p-1 hover:bg-gray-100 rounded">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteProduct(product)} className="p-1 hover:bg-red-100 text-red-500 rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {product.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">{tag}</span>
                    ))}
                    {product.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">+{product.tags.length - 3}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{product.imageCount} 张图片</div>
                  {!product.isActive && <div className="mt-2 text-sm text-orange-500">已停用</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
          onSave={() => {
            setProductModalOpen(false);
            fetchProducts();
          }}
          onClose={() => setProductModalOpen(false)}
        />
      )}
    </div>
  );
};
```

**Step 2: 提交文件**

```bash
git add shangjiaduan/pages/ProductManagement.tsx
git commit -m "feat: create unified ProductManagement page"
```

---

### Task 2: 更新路由配置

**Files:**
- Modify: `shangjiaduan/App.tsx`

**Step 1: 更新导入和路由**

在 App.tsx 中:
1. 添加 ProductManagement 导入
2. 更新 /products/manager 路由指向 ProductManagement
3. 可选：删除或注释 ProductCategories 和 ProductManager 导入

```tsx
// 修改导入
import { ProductManagement } from './pages/ProductManagement';
// 移除 ProductManager 和 ProductCategories

// 修改路由
<Route path="/products/manager" element={<ProductManagement />} />
```

**Step 2: 提交更改**

```bash
git add shangjiaduan/App.tsx
git commit -m "feat: update route to use unified ProductManagement page"
```

---

### Task 3: 更新菜单配置

**Files:**
- Modify: `shangjiaduan/constants.ts`

**Step 1: 简化菜单**

将商品管理和分类管理合并为一个入口:

```typescript
export const MENU_ITEMS = [
  { path: '/', label: '仪表盘', icon: 'LayoutDashboard' },
  { path: '/products/manager', label: '商品管理', icon: 'List' },
  // 删除分类管理菜单项
  { path: '/tags', label: '标签管理', icon: 'Tags' },
  // ... 其他保持不变
];
```

**Step 2: 提交更改**

```bash
git add shangjiaduan/constants.ts
git commit -m "feat: merge menu items to single product management"
```

---

### Task 4: 测试整合后的页面

**Step 1: 启动开发服务器**

```bash
cd shangjiaduan && npm run dev
```

**Step 2: 验证功能**

1. 打开 http://localhost:3000/products/manager
2. 验证分类树显示在左侧
3. 验证产品列表显示在右侧
4. 测试添加/编辑/删除分类
5. 测试选择分类后产品列表更新
6. 测试添加/编辑/删除产品
7. 测试搜索功能

**Step 3: 提交测试结果**

```bash
git commit --allow-empty -m "test: verify ProductManagement page works correctly"
```

---

### Task 5: 清理旧文件（可选）

**Files:**
- Delete: `shangjiaduan/pages/ProductManager.tsx`
- Delete: `shangjiaduan/pages/ProductCategories.tsx`

如果确认新页面完全正常工作，可以删除旧文件:

```bash
git rm shangjiaduan/pages/ProductManager.tsx shangjiaduan/pages/ProductCategories.tsx
git commit -m "refactor: remove old ProductManager and ProductCategories pages"
```

---

## 执行选项

**Plan complete and saved to `docs/plans/2026-02-19-product-management-merge.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
