import React, { useState, useEffect } from 'react';
import { CategoryTree } from '../components/CategoryTree';
import api from '../services/api';

interface Category {
  id: number;
  name: string;
  parentId: number | null;
  level: number;
  children?: Category[];
}

export const ProductCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', parentId: null as number | null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get('/merchant/categories');
      setCategories(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      showNotification('error', error.response?.data?.error || '加载分类失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = (parentId?: number) => {
    setEditingCategory(null);
    setFormData({ name: '', parentId: parentId || null });
    setModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, parentId: category.parentId });
    setModalOpen(true);
  };

  const handleDelete = async (category: Category) => {
    // 使用自定义确认而不是原生 confirm
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showNotification('error', '请输入分类名称');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await api.put(`/merchant/categories/${editingCategory.id}`, formData);
        showNotification('success', '更新成功');
      } else {
        await api.post('/merchant/categories', formData);
        showNotification('success', '创建成功');
      }

      setModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      showNotification('error', error.response?.data?.error || '保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">加载中...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">产品分类管理</h1>

      {/* 通知提示 */}
      {notification && (
        <div className={`mb-4 p-4 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {notification.message}
        </div>
      )}

      <CategoryTree
        categories={categories}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategory ? '编辑分类' : '添加分类'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">分类名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                  maxLength={50}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '提交中...' : (editingCategory ? '更新' : '创建')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
