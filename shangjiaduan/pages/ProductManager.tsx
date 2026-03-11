import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { ProductEditModal } from '../components/ProductEditModal';
import api from '../services/api';

interface Product {
  id: number;
  name: string;
  categoryId: number;
  tags: string[];
  imageCount: number;
  isActive: boolean;
}

interface Category {
  id: number;
  name: string;
}

export const ProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/merchant/categories');
      const flattenCategories = (cats: any[]): any[] => {
        return cats.reduce((acc: any[], cat: any) => {
          acc.push(cat);
          if (cat.children) {
            acc.push(...flattenCategories(cat.children));
          }
          return acc;
        }, []);
      };
      setCategories(flattenCategories(response.data.data));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProducts = async () => {
    if (!selectedCategoryId) {
      setProducts([]);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/merchant/products', {
        params: { categoryId: selectedCategoryId }
      });
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      alert('加载产品失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategoryId]);

  const handleAdd = () => {
    setEditingProduct(undefined);
    setModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`确定要删除产品"${product.name}"吗？`)) return;

    try {
      await api.delete(`/merchant/products/${product.id}`);
      alert('删除成功');
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('删除失败');
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">产品管理</h1>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">选择分类</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(parseInt(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value={0}>请选择分类</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
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
            onClick={handleAdd}
            disabled={!selectedCategoryId}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed mt-6"
          >
            <Plus size={20} className="inline mr-2" />
            添加产品
          </button>
        </div>
      </div>

      {/* 产品列表 */}
      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {selectedCategoryId ? '暂无产品' : '请先选择分类'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    className="p-1 hover:bg-red-100 text-red-500 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                {product.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                    {tag}
                  </span>
                ))}
                {product.tags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    +{product.tags.length - 3}
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-500">
                {product.imageCount} 张图片
              </div>

              {!product.isActive && (
                <div className="mt-2 text-sm text-orange-500">
                  已停用
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ProductEditModal
          product={editingProduct}
          categories={categories}
          onSave={() => {
            setModalOpen(false);
            fetchProducts();
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};
