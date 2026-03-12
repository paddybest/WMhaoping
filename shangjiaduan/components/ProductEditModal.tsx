import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Loader2, Plus } from 'lucide-react';
import api from '../services/api';

interface Product {
  id?: number;
  name: string;
  categoryId: number;
  tags?: string[];
}

interface Category {
  id: number;
  name: string;
  path: string;
}

interface ProductEditModalProps {
  product?: Product;
  categories: Category[];
  defaultCategoryId?: number;
  onSave: (categoryId?: number) => void;
  onClose: () => void;
}

interface UploadedImage {
  id?: number;
  imageUrl: string;
  isNew?: boolean;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  product,
  categories,
  defaultCategoryId,
  onSave,
  onClose
}) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    categoryId: product?.categoryId || defaultCategoryId || 0
  });
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tags, setTags] = useState<string[]>(product?.tags || []);
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; category?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!product?.id;

  useEffect(() => {
    if (product?.id) {
      loadProductImages(product.id);
      setTags(product.tags || []);
    }
  }, [product]);

  const loadProductImages = async (productId: number) => {
    try {
      const response = await api.get(`/merchant/products/${productId}/images`);
      const existingImages = (response.data.data || []).map((img: any) => ({
        ...img,
        isNew: false
      }));
      setImages(existingImages);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 50 - images.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      alert(`最多还能上传 ${remainingSlots} 张图片，已选择前 ${filesToUpload.length} 张`);
    }

    for (const file of filesToUpload) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`图片 ${file.name} 大小超过5MB，已跳过`);
        continue;
      }

      // 检查是否是图片文件
      if (!file.type.startsWith('image/')) {
        alert(`文件 ${file.name} 不是图片，已跳过`);
        continue;
      }

      // 如果是编辑模式，直接上传到服务器
      if (isEditMode && product?.id) {
        await uploadImageToServer(file);
      } else {
        // 如果是创建模式，先用本地预览
        const localUrl = URL.createObjectURL(file);
        setImages(prev => [...prev, {
          imageUrl: localUrl,
          isNew: true,
          file: file
        } as any]);
      }
    }

    // 清空input以便再次选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImageToServer = async (file: File, tempId?: string) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      let response;
      if (isEditMode && product?.id) {
        response = await api.post(
          `/merchant/products/${product.id}/images`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        setImages(prev => [...prev, { ...response.data.data, isNew: false }]);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.error || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (image: UploadedImage, index: number) => {
    if (!confirm('确定要删除这张图片吗？')) return;

    try {
      if (isEditMode && product?.id && image.id) {
        await api.delete(`/merchant/products/${product.id}/images/${image.id}`);
      }
      // 删除本地预览的图片
      const newImages = [...images];
      if (newImages[index].imageUrl && newImages[index].isNew) {
        URL.revokeObjectURL(newImages[index].imageUrl);
      }
      newImages.splice(index, 1);
      setImages(newImages);
    } catch (error) {
      console.error('Delete image failed:', error);
      alert('删除失败');
    }
  };

  const handleRegenerateTags = async () => {
    if (!product?.id) return;
    setRegenerating(true);
    try {
      const response = await api.post(`/merchant/products/${product.id}/regenerate-tags`);
      if (response.data.success) {
        setTags(response.data.data.tags || []);
        alert('标签已重新生成');
      }
    } catch (error: any) {
      console.error('Regenerate tags failed:', error);
      alert(error.response?.data?.error || '重新生成标签失败');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveTags = async () => {
    if (!product?.id) return;
    try {
      const response = await api.put(`/merchant/products/${product.id}/tags`, { tags });
      if (response.data.success) {
        alert('标签已保存');
        setEditingTagIndex(null);
      }
    } catch (error: any) {
      console.error('Save tags failed:', error);
      alert(error.response?.data?.error || '保存标签失败');
    }
  };

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...tags];
    newTags[index] = value;
    setTags(newTags);
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string; category?: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入产品名称';
    } else if (formData.name.length > 50) {
      newErrors.name = '产品名称不能超过50个字符';
    }

    if (!formData.categoryId) {
      newErrors.category = '请选择所属分类';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      let createdProductId: number | undefined;

      if (product?.id) {
        // 编辑模式
        await api.put(`/merchant/products/${product.id}`, formData);
        alert('更新成功');
        onSave(formData.categoryId);
      } else {
        // 创建模式 - 先创建产品
        const response = await api.post('/merchant/products', formData);
        if (response.data.success && response.data.data?.id) {
          createdProductId = response.data.data.id;

          // 上传新建产品时选择的图片
          const newImages = images.filter(img => img.isNew && (img as any).file);
          for (const img of newImages) {
            await uploadImageToServer((img as any).file, img.id?.toString());
          }

          alert('创建成功');
          onSave(formData.categoryId);
        }
      }
    } catch (error: any) {
      console.error('Save failed:', error);
      alert(error.response?.data?.error || '保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取叶子节点分类（没有子分类的分类）
  const isLeafCategory = (cat: any): boolean => {
    return !cat.children || cat.children.length === 0;
  };

  const leafCategories = categories.filter(isLeafCategory);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center overflow-y-auto z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {product?.id ? '编辑产品' : '添加产品'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 产品名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              产品名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
              }`}
              placeholder="请输入产品名称"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* 分类选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              所属分类 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => {
                setFormData({ ...formData, categoryId: parseInt(e.target.value) });
                if (errors.category) setErrors({ ...errors, category: undefined });
              }}
              className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                errors.category ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
              }`}
            >
              <option value={0}>请选择分类</option>
              {leafCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.path ? `${cat.path} > ` : ''}{cat.name}</option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
          </div>

          {/* 图片上传 - 创建和编辑模式都支持 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              产品图片 <span className="text-gray-400 font-normal">(最多50张)</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {images.map((image, index) => (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={image.imageUrl}
                    alt="产品图片"
                    className="w-full h-full object-cover rounded-lg border border-gray-200"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(image, index)}
                      className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-all transform hover:scale-110"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {image.isNew && (
                    <span className="absolute top-1 left-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded">新</span>
                  )}
                </div>
              ))}

              {images.length < 50 && (
                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    multiple
                    className="hidden"
                  />
                  {uploading ? (
                    <Loader2 size={24} className="text-blue-500 animate-spin" />
                  ) : (
                    <>
                      <Plus size={24} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                      <span className="text-xs text-gray-400 mt-1 group-hover:text-blue-500">
                        添加图片
                      </span>
                    </>
                  )}
                </label>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              支持 JPG、PNG、WebP 格式，最大 5MB/张
            </p>
          </div>

          {/* 标签编辑 - 仅编辑模式 */}
          {product?.id && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">产品标签（6个）</label>
                <button
                  type="button"
                  onClick={handleRegenerateTags}
                  disabled={regenerating}
                  className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 transition-all shadow-sm"
                >
                  {regenerating ? (
                    <><Loader2 size={12} className="inline mr-1 animate-spin" />生成中</>
                  ) : (
                    'AI 重新生成'
                  )}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex items-center">
                    {editingTagIndex === index ? (
                      <div className="flex gap-1 w-full">
                        <input
                          type="text"
                          value={tags[index] || ''}
                          onChange={(e) => handleTagChange(index, e.target.value)}
                          className="w-full border border-blue-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          maxLength={4}
                          autoFocus
                          onBlur={() => setEditingTagIndex(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setEditingTagIndex(null);
                              handleSaveTags();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleSaveTags}
                          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          保存
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingTagIndex(index)}
                        className={`w-full px-3 py-2 rounded-lg text-sm text-left flex justify-between items-center transition-all ${
                          tags[index]
                            ? 'bg-white text-blue-600 border border-blue-200 shadow-sm hover:shadow'
                            : 'bg-white border border-dashed border-gray-300 text-gray-400 hover:border-gray-400'
                        }`}
                      >
                        <span>{tags[index] || `标签${index + 1}`}</span>
                        <span className="text-xs opacity-60">✎</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">点击标签可编辑内容，点击"AI重新生成"自动生成新标签</p>
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <><Loader2 size={18} className="mr-2 animate-spin" />保存中...</>
              ) : (
                product?.id ? '更新产品' : '创建产品'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
